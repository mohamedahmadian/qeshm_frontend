import { Building2, CalendarClock, CalendarRange, Filter, FolderKanban, Globe, Handshake, Hash, IdCard, Mail, Phone, Plus, ScrollText, Tags, UserRound, Users, Wallet } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
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
import { DateText } from '../../../components/ui/DateText'
import { FormCard, FormFactTile, FormSectionTitle } from '../../../components/ui/FormLayout'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { useListParams } from '../../../hooks/useListParams'
import { useListSort } from '../../../hooks/useListSort'
import { api } from '../../../lib/api'
import { formatNumber, localizeDigits } from '../../../lib/datetime'
import type { Paginated, Project, ProjectContractor } from '../../../types/app'
import { ContractorForm } from './ContractorForm'
import { ContractorPaymentListPage } from './ContractorPaymentPages'
import { ContractorTabNav, type ContractorManageTab } from './ContractorTabs'
import { ContractorTeamListPage } from './ContractorTeamPages'
import {
  contractorProjectsPath,
  contractorTypesPath,
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
          <div className="flex flex-wrap items-center gap-2">
            <Link to={contractorTypesPath()}>
              <Button variant="soft">
                <Tags className="size-4" />
                {t('contractorTypes.title')}
              </Button>
            </Link>
            <Link to={`${globalContractorsPath()}/new`}>
              <Button>
                <Plus className="size-4" />
                {t('contractors.create')}
              </Button>
            </Link>
          </div>
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
              <SortableTh column="type" label={t('contractors.type')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
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
                <td className="px-4 py-3">{item.type?.name || '—'}</td>
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
        manage={{ projectId: query.data.projectId, contractorId }}
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

  const [tab, setTab] = useState<ContractorManageTab>('info')
  const contractor = query.data
  if (!contractor || !contractorId) {
    return <LoadingState />
  }

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Building2}
        title={t('contractors.details')}
        subtitle={<EntityNameSubtitle name={contractor.name} icon={Building2} />}
      />
      <FormCard icon={Building2} title={contractor.name}>
        <ContractorTabNav tab={tab} onChange={setTab} />
        {tab === 'payments' ? (
          <div className="p-5 sm:p-6">
            <ContractorPaymentListPage
              embedded
              projectId={contractor.projectId}
              contractorId={contractorId}
            />
          </div>
        ) : null}
        {tab === 'team' ? (
          <div className="p-5 sm:p-6">
            <ContractorTeamListPage
              embedded
              projectId={contractor.projectId}
              contractorId={contractorId}
            />
          </div>
        ) : null}
        <div className={tab === 'info' ? 'space-y-6 p-5 sm:p-6' : 'hidden'}>
          <FormSectionTitle icon={Handshake}>{t('contractors.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Building2} label={t('contractors.name')} value={contractor.name} tone="teal" />
            <FormFactTile
              icon={Tags}
              label={t('contractors.type')}
              value={contractor.type?.name || '—'}
              tone="mint"
            />
            <FormFactTile
              icon={FolderKanban}
              label={t('contractors.projectCount')}
              value={formatNumber(contractor._count?.projectLinks ?? 0, locale)}
            />
            <FormFactTile
              icon={IdCard}
              label={t('contractors.nationalId')}
              copyValue={contractor.nationalId}
            />
            <FormFactTile
              icon={Hash}
              label={t('contractors.registrationNumber')}
              value={
                contractor.registrationNumber
                  ? localizeDigits(contractor.registrationNumber, locale)
                  : '—'
              }
            />
            <FormFactTile
              icon={Phone}
              label={t('contractors.phone')}
              value={contractor.phone ? localizeDigits(contractor.phone, locale) : '—'}
            />
            <FormFactTile
              icon={Mail}
              label={t('contractors.email')}
              value={contractor.email ? <span dir="ltr">{contractor.email}</span> : '—'}
            />
            <FormFactTile
              icon={Globe}
              label={t('contractors.website')}
              value={contractor.website ? <span dir="ltr">{contractor.website}</span> : '—'}
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
          <FormSectionTitle icon={CalendarRange}>{t('contractors.contractSection')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={CalendarRange}
              label={t('contractors.contractStartDate')}
              value={contractor.contractStartDate ? <DateText value={contractor.contractStartDate} /> : '—'}
              tone="teal"
            />
            <FormFactTile
              icon={CalendarRange}
              label={t('contractors.contractEndDate')}
              value={contractor.contractEndDate ? <DateText value={contractor.contractEndDate} /> : '—'}
              tone="mint"
            />
            <FormFactTile
              icon={CalendarRange}
              label={t('contractors.supportStartDate')}
              value={contractor.supportStartDate ? <DateText value={contractor.supportStartDate} /> : '—'}
            />
            <FormFactTile
              icon={CalendarRange}
              label={t('contractors.supportEndDate')}
              value={contractor.supportEndDate ? <DateText value={contractor.supportEndDate} /> : '—'}
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
        ]}
      />
    </div>
  )
}
