import { Briefcase, Phone, Plus, ScrollText, UserRound, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../../components/ui/ListControls'
import {
  Button,
  DetailActions,
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  formShellClassName,
  listShellClassName,
} from '../../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../../components/ui/FormLayout'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { useListParams } from '../../../hooks/useListParams'
import { useListSort } from '../../../hooks/useListSort'
import { api } from '../../../lib/api'
import { localizeDigits } from '../../../lib/datetime'
import type { ContractorMember, Paginated, ProjectContractor } from '../../../types/app'
import { ContractorMemberForm } from './ContractorMemberForm'
import { contractorTeamPath } from './contractor-paths'

function useContractor() {
  const { id: projectId, contractorId } = useParams()
  const query = useQuery({
    queryKey: ['contractor', projectId, contractorId],
    enabled: Boolean(projectId && contractorId),
    queryFn: async () => {
      const { data } = await api.get<ProjectContractor>(
        `/projects/${projectId}/contractors/${contractorId}`,
      )
      return data
    },
  })
  return { projectId, contractorId, contractor: query.data }
}

export function ContractorTeamListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { projectId, contractorId, contractor } = useContractor()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } =
    useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['contractor-team', projectId, contractorId, q, page, sortBy, sortDir],
    enabled: Boolean(projectId && contractorId),
    queryFn: async () => {
      const { data } = await api.get<Paginated<ContractorMember>>(
        `/projects/${projectId}/contractors/${contractorId}/team`,
        { params: { page, ...(q ? { q } : {}), ...sortParams } },
      )
      return data
    },
  })

  if (!contractor || !projectId || !contractorId) {
    return <LoadingState />
  }

  const rows = query.data?.items ?? []
  const base = contractorTeamPath(projectId, contractorId)

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={Users}
        title={t('contractorTeam.title')}
        subtitle={<EntityNameSubtitle name={contractor.name} icon={Users} />}
        action={
          <Link to={`${base}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('contractorTeam.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('contractorTeam.search')}
        placeholder={t('contractorTeam.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('contractorTeam.noResults') : t('contractorTeam.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="firstName" label={t('contractorTeam.firstName')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="lastName" label={t('contractorTeam.lastName')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="phone" label={t('contractorTeam.phone')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="role" label={t('contractorTeam.role')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">{item.firstName}</td>
                <td className="px-4 py-3">{item.lastName}</td>
                <td className="px-4 py-3">
                  {item.phone ? localizeDigits(item.phone, locale) : '—'}
                </td>
                <td className="px-4 py-3">{item.role || '—'}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={`${base}/${item.id}`}
                    editTo={`${base}/${item.id}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('contractorTeam.confirmDelete'),
                        successMessage: t('contractorTeam.deleted'),
                        path: `/projects/${projectId}/contractors/${contractorId}/team/${item.id}`,
                        queryKey: ['contractor-team'],
                      })
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
      {query.data ? (
        <PaginationBar
          page={query.data.page}
          pageSize={query.data.pageSize}
          total={query.data.total}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  )
}

export function ContractorTeamCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { projectId, contractorId, contractor } = useContractor()
  if (!contractor || !projectId || !contractorId) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Users}
        title={t('contractorTeam.create')}
        subtitle={<EntityNameSubtitle name={contractor.name} icon={Users} />}
      />
      <ContractorMemberForm
        onSubmit={async (payload) => {
          await api.post(
            `/projects/${projectId}/contractors/${contractorId}/team`,
            payload,
          )
          toast.success(t('contractorTeam.created'))
          navigate(contractorTeamPath(projectId, contractorId))
        }}
      />
    </div>
  )
}

export function ContractorTeamEditPage() {
  const { t } = useTranslation()
  const { memberId } = useParams()
  const navigate = useNavigate()
  const { projectId, contractorId } = useContractor()
  const query = useQuery({
    queryKey: ['contractor-member', projectId, contractorId, memberId],
    enabled: Boolean(projectId && contractorId && memberId),
    queryFn: async () => {
      const { data } = await api.get<ContractorMember>(
        `/projects/${projectId}/contractors/${contractorId}/team/${memberId}`,
      )
      return data
    },
  })
  if (!query.data || !projectId || !contractorId || !memberId) {
    return <LoadingState />
  }
  const fullName = `${query.data.firstName} ${query.data.lastName}`.trim()
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Users}
        title={t('contractorTeam.edit')}
        subtitle={<EntityNameSubtitle name={fullName} icon={UserRound} />}
      />
      <ContractorMemberForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(
            `/projects/${projectId}/contractors/${contractorId}/team/${memberId}`,
            payload,
          )
          toast.success(t('contractorTeam.updated'))
          navigate(contractorTeamPath(projectId, contractorId))
        }}
      />
    </div>
  )
}

export function ContractorTeamDetailPage() {
  const { t } = useTranslation()
  const { memberId } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const { projectId, contractorId } = useContractor()
  const query = useQuery({
    queryKey: ['contractor-member', projectId, contractorId, memberId],
    enabled: Boolean(projectId && contractorId && memberId),
    queryFn: async () => {
      const { data } = await api.get<ContractorMember>(
        `/projects/${projectId}/contractors/${contractorId}/team/${memberId}`,
      )
      return data
    },
  })
  const member = query.data
  if (!member || !projectId || !contractorId || !memberId) {
    return <LoadingState />
  }
  const fullName = `${member.firstName} ${member.lastName}`.trim()
  const base = contractorTeamPath(projectId, contractorId)
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Users}
        title={t('contractorTeam.details')}
        subtitle={<EntityNameSubtitle name={fullName} icon={UserRound} />}
      />
      <FormCard icon={UserRound} title={fullName}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Users}>{t('contractorTeam.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={UserRound} label={t('contractorTeam.firstName')} value={member.firstName} tone="teal" />
            <FormFactTile icon={UserRound} label={t('contractorTeam.lastName')} value={member.lastName} tone="mint" />
            <FormFactTile icon={Phone} label={t('contractorTeam.phone')} copyValue={member.phone} />
            <FormFactTile icon={Briefcase} label={t('contractorTeam.role')} value={member.role || '—'} />
            <FormFactTile icon={ScrollText} label={t('contractorTeam.description')} value={member.description || '—'} />
          </div>
          <DetailActions
            editTo={`${base}/${memberId}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('contractorTeam.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('contractorTeam.confirmDelete'),
                successMessage: t('contractorTeam.deleted'),
                path: `/projects/${projectId}/contractors/${contractorId}/team/${memberId}`,
                queryKey: ['contractor-team'],
                onDeleted: () => navigate(base),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
