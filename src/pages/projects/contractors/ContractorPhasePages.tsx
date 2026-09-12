import { CalendarRange, Flag, Plus, Target } from 'lucide-react'
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
import { DateText } from '../../../components/ui/DateText'
import { FormCard, FormFactTile, FormSectionTitle } from '../../../components/ui/FormLayout'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { useListParams } from '../../../hooks/useListParams'
import { useListSort } from '../../../hooks/useListSort'
import { api } from '../../../lib/api'
import type { ContractorPhase, Paginated, ProjectContractor } from '../../../types/app'
import { ContractorPhaseForm } from './ContractorPhaseForm'
import { contractorPhasesPath } from './contractor-paths'

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

export function ContractorPhaseListPage() {
  const { t } = useTranslation()
  const { projectId, contractorId, contractor } = useContractor()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } =
    useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['contractor-phases', projectId, contractorId, q, page, sortBy, sortDir],
    enabled: Boolean(projectId && contractorId),
    queryFn: async () => {
      const { data } = await api.get<Paginated<ContractorPhase>>(
        `/projects/${projectId}/contractors/${contractorId}/phases`,
        { params: { page, ...(q ? { q } : {}), ...sortParams } },
      )
      return data
    },
  })
  if (!contractor || !projectId || !contractorId) {
    return <LoadingState />
  }
  const rows = query.data?.items ?? []
  const base = contractorPhasesPath(projectId, contractorId)
  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={Flag}
        title={t('contractorPhases.title')}
        subtitle={<EntityNameSubtitle name={contractor.name} icon={Flag} />}
        action={
          <Link to={`${base}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('contractorPhases.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('contractorPhases.search')}
        placeholder={t('contractorPhases.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('contractorPhases.noResults') : t('contractorPhases.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="name" label={t('contractorPhases.name')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="startDate" label={t('contractorPhases.startDate')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="endDate" label={t('contractorPhases.endDate')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3 font-medium">{item.name}</td>
                <td className="px-4 py-3"><DateText value={item.startDate} /></td>
                <td className="px-4 py-3"><DateText value={item.endDate} /></td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={`${base}/${item.id}`}
                    editTo={`${base}/${item.id}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('contractorPhases.confirmDelete'),
                        successMessage: t('contractorPhases.deleted'),
                        path: `/projects/${projectId}/contractors/${contractorId}/phases/${item.id}`,
                        queryKey: ['contractor-phases'],
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

export function ContractorPhaseCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { projectId, contractorId, contractor } = useContractor()
  if (!contractor || !projectId || !contractorId) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Flag}
        title={t('contractorPhases.create')}
        subtitle={<EntityNameSubtitle name={contractor.name} icon={Flag} />}
      />
      <ContractorPhaseForm
        onSubmit={async (payload) => {
          await api.post(
            `/projects/${projectId}/contractors/${contractorId}/phases`,
            payload,
          )
          toast.success(t('contractorPhases.created'))
          navigate(contractorPhasesPath(projectId, contractorId))
        }}
      />
    </div>
  )
}

export function ContractorPhaseEditPage() {
  const { t } = useTranslation()
  const { phaseId } = useParams()
  const navigate = useNavigate()
  const { projectId, contractorId } = useContractor()
  const query = useQuery({
    queryKey: ['contractor-phase', projectId, contractorId, phaseId],
    enabled: Boolean(projectId && contractorId && phaseId),
    queryFn: async () => {
      const { data } = await api.get<ContractorPhase>(
        `/projects/${projectId}/contractors/${contractorId}/phases/${phaseId}`,
      )
      return data
    },
  })
  if (!query.data || !projectId || !contractorId || !phaseId) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Flag}
        title={t('contractorPhases.edit')}
        subtitle={<EntityNameSubtitle name={query.data.name} icon={Flag} />}
      />
      <ContractorPhaseForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(
            `/projects/${projectId}/contractors/${contractorId}/phases/${phaseId}`,
            payload,
          )
          toast.success(t('contractorPhases.updated'))
          navigate(contractorPhasesPath(projectId, contractorId))
        }}
      />
    </div>
  )
}

export function ContractorPhaseDetailPage() {
  const { t } = useTranslation()
  const { phaseId } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const { projectId, contractorId } = useContractor()
  const query = useQuery({
    queryKey: ['contractor-phase', projectId, contractorId, phaseId],
    enabled: Boolean(projectId && contractorId && phaseId),
    queryFn: async () => {
      const { data } = await api.get<ContractorPhase>(
        `/projects/${projectId}/contractors/${contractorId}/phases/${phaseId}`,
      )
      return data
    },
  })
  const phase = query.data
  if (!phase || !projectId || !contractorId || !phaseId) {
    return <LoadingState />
  }
  const base = contractorPhasesPath(projectId, contractorId)
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Flag}
        title={t('contractorPhases.details')}
        subtitle={<EntityNameSubtitle name={phase.name} icon={Flag} />}
      />
      <FormCard icon={Flag} title={phase.name}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Flag}>{t('contractorPhases.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Flag} label={t('contractorPhases.name')} value={phase.name} tone="teal" />
            <FormFactTile icon={CalendarRange} label={t('contractorPhases.startDate')} value={<DateText value={phase.startDate} />} tone="mint" />
            <FormFactTile icon={CalendarRange} label={t('contractorPhases.endDate')} value={<DateText value={phase.endDate} />} />
            <FormFactTile icon={Target} label={t('contractorPhases.goals')} value={phase.goals || '—'} />
          </div>
          <DetailActions
            editTo={`${base}/${phaseId}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('contractorPhases.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('contractorPhases.confirmDelete'),
                successMessage: t('contractorPhases.deleted'),
                path: `/projects/${projectId}/contractors/${contractorId}/phases/${phaseId}`,
                queryKey: ['contractor-phases'],
                onDeleted: () => navigate(base),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
