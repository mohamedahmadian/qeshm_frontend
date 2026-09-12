import { Building2, CalendarClock, Filter, FolderKanban, Handshake, IdCard, Layers, Plus, ScrollText, UserRound, Users, Wallet } from 'lucide-react'
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
  FormField,
  LoadingState,
  PageHeader,
  formShellClassName,
  listShellClassName,
} from '../../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../../components/ui/FormLayout'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { useListParams } from '../../../hooks/useListParams'
import { useListSort } from '../../../hooks/useListSort'
import { api } from '../../../lib/api'
import { formatNumber, localizeDigits } from '../../../lib/datetime'
import type { Paginated, Project, ProjectContractor } from '../../../types/app'
import { ContractorForm } from './ContractorForm'
import {
  contractorPaymentsPath,
  contractorPhasesPath,
  contractorProjectsPath,
  contractorTeamPath,
  globalContractorPath,
  globalContractorsPath,
} from './contractor-paths'

function useGlobalContractor(contractorId?: string) {
  return useQuery({
    queryKey: ['contractor', contractorId],
    enabled: Boolean(contractorId),
    queryFn: async () => {
      const { data } = await api.get<ProjectContractor>(`/contractors/${contractorId}`)
      return data
    },
  })
}

export function GlobalContractorsListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } =
    useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const projectId = searchParams.get('projectId') ?? ''

  const projects = useQuery({
    queryKey: ['projects', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<Project[]>('/projects')
      return data
    },
  })

  const query = useQuery({
    queryKey: ['contractors', 'global', q, page, projectId, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<ProjectContractor>>('/contractors', {
        params: {
          page,
          ...(q ? { q } : {}),
          ...(projectId ? { projectId } : {}),
          ...sortParams,
        },
      })
      return data
    },
  })

  const rows = query.data?.items ?? []
  const filtersActive = Boolean(projectId)
  const emptyMessage = q || filtersActive ? t('contractors.noResults') : t('contractors.globalEmpty')

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={Handshake}
        title={t('menus.contractorManagement')}
        subtitle={t('contractors.globalSubtitle')}
        action={
          <Link to={`${globalContractorsPath()}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('contractors.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('contractors.search')}
        placeholder={t('contractors.globalSearchPlaceholder')}
        filtersActive={filtersActive}
        extra={
          <FormField icon={Filter} label={t('contractors.project')} htmlFor="contractor-project-filter">
            <SearchSelect
              id="contractor-project-filter"
              value={projectId}
              onChange={(value) => setParams({ projectId: value || undefined }, { resetPage: true })}
              placeholder={t('common.all')}
              options={[
                { value: '', label: t('common.all') },
                ...(projects.data ?? []).map((project) => ({
                  value: project.id,
                  label: project.systemName,
                })),
              ]}
            />
          </FormField>
        }
      />
      <TableCard
        loading={query.isLoading}
        empty={emptyMessage}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="name" label={t('contractors.name')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="project" label={t('contractors.project')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="nationalId" label={t('contractors.nationalId')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="ceoName" label={t('contractors.ceoName')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh
                column="projectCount"
                label={t('contractors.projectCount')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
                align="center"
              />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3 font-medium">{item.name}</td>
                <td className="px-4 py-3">{item.project?.systemName || '—'}</td>
                <td className="px-4 py-3">
                  {item.nationalId ? localizeDigits(item.nationalId, locale) : '—'}
                </td>
                <td className="px-4 py-3">{item.ceoName || '—'}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex min-w-8 justify-center rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700">
                    {formatNumber(item._count?.projectLinks ?? 0, locale)}
                  </span>
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={globalContractorPath(item.id)}
                    editTo={`${globalContractorPath(item.id)}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('contractors.confirmDelete'),
                        successMessage: t('contractors.deleted'),
                        path: `/contractors/${item.id}`,
                        queryKey: ['contractors'],
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

export function GlobalContractorCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Building2}
        title={t('contractors.create')}
        subtitle={t('contractors.createSubtitle')}
      />
      <ContractorForm
        requireProject
        onSubmit={async (payload) => {
          await api.post('/contractors', payload)
          toast.success(t('contractors.created'))
          navigate(globalContractorsPath())
        }}
      />
    </div>
  )
}

export function GlobalContractorEditPage() {
  const { t } = useTranslation()
  const { contractorId } = useParams()
  const navigate = useNavigate()
  const query = useGlobalContractor(contractorId)

  if (!query.data || !contractorId) {
    return <LoadingState />
  }

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Building2}
        title={t('contractors.edit')}
        subtitle={<EntityNameSubtitle name={query.data.name} icon={Building2} />}
      />
      <ContractorForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/contractors/${contractorId}`, payload)
          toast.success(t('contractors.updated'))
          navigate(globalContractorsPath())
        }}
      />
    </div>
  )
}

export function GlobalContractorDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { contractorId } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useGlobalContractor(contractorId)

  const contractor = query.data
  if (!contractor || !contractorId) {
    return <LoadingState />
  }

  const projectId = contractor.projectId

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Building2}
        title={t('contractors.details')}
        subtitle={<EntityNameSubtitle name={contractor.name} icon={Building2} />}
      />
      <FormCard icon={Building2} title={contractor.name}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Handshake}>{t('contractors.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Building2} label={t('contractors.name')} value={contractor.name} tone="teal" />
            <FormFactTile
              icon={FolderKanban}
              label={t('contractors.projectCount')}
              value={formatNumber(contractor._count?.projectLinks ?? 0, locale)}
              tone="mint"
            />
            <FormFactTile
              icon={IdCard}
              label={t('contractors.nationalId')}
              copyValue={contractor.nationalId}
            />
            <FormFactTile icon={UserRound} label={t('contractors.ceoName')} value={contractor.ceoName || '—'} />
            <FormFactTile
              icon={CalendarClock}
              label={t('contractors.timeEstimate')}
              value={contractor.timeEstimate || '—'}
            />
            <FormFactTile
              icon={Wallet}
              label={t('contractors.costEstimate')}
              value={
                contractor.costEstimate != null
                  ? formatNumber(contractor.costEstimate, locale)
                  : '—'
              }
            />
            <FormFactTile
              icon={Users}
              label={t('contractors.memberCount')}
              value={formatNumber(contractor._count?.members ?? 0, locale)}
            />
            <FormFactTile
              icon={Layers}
              label={t('contractors.phaseCount')}
              value={formatNumber(contractor._count?.phases ?? 0, locale)}
            />
            <FormFactTile
              icon={Wallet}
              label={t('contractors.paymentCount')}
              value={formatNumber(contractor._count?.payments ?? 0, locale)}
            />
            <FormFactTile
              icon={ScrollText}
              label={t('contractors.description')}
              value={contractor.description || '—'}
            />
          </div>
        </div>
      </FormCard>
      <DetailActions
        editTo={`${globalContractorPath(contractorId)}/edit`}
        editLabel={t('common.edit')}
        deleteLabel={t('contractors.delete')}
        onDelete={() =>
          confirmDelete({
            message: t('contractors.confirmDelete'),
            successMessage: t('contractors.deleted'),
            path: `/contractors/${contractorId}`,
            queryKey: ['contractors'],
            onDeleted: () => navigate(globalContractorsPath()),
          })
        }
        extraItems={[
          {
            to: contractorProjectsPath(contractorId),
            icon: FolderKanban,
            label: t('contractors.viewProjects'),
          },
          {
            to: contractorTeamPath(projectId, contractorId),
            icon: Users,
            label: t('contractorTeam.manage'),
          },
          {
            to: contractorPhasesPath(projectId, contractorId),
            icon: Layers,
            label: t('contractorPhases.manage'),
          },
          {
            to: contractorPaymentsPath(projectId, contractorId),
            icon: Wallet,
            label: t('contractorPayments.manage'),
          },
        ]}
      />
    </div>
  )
}
