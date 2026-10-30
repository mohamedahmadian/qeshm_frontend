import { ClipboardList, FileBadge2, FileText, Filter, FolderKanban, Gauge, Handshake, ListChecks, Percent, Plus, ScrollText } from 'lucide-react'
import { type CSSProperties, type FormEvent, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { isAdmin, isContractor } from '../../lib/roles'
import { toast } from 'sonner'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../components/ui/ListControls'
import {
  AppForm,
  Button,
  DetailActions,
  EntityNameSubtitle,
  FormActions,
  FormField,
  LoadingState,
  PageHeader,
  fieldClassName,
  formShellClassName,
  listShellClassName,
} from '../../components/ui/Form'
import { DateText } from '../../components/ui/DateText'
import { FormCard, FormFactTile, FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api, getApiErrorMessage } from '../../lib/api'
import { formatNumber, todayIsoDate } from '../../lib/datetime'
import type { Paginated, Project } from '../../types/app'
import {
  AttachmentList,
  StakeholderAttachmentsField,
  emptyPendingFiles,
  pendingFromAttachments,
  type PendingStakeholderFiles,
} from './attachments'
import type { StakeholderParty, StakeholderProgressListItem, StakeholderResolutionContract } from './types'

type ProgressScope = 'project' | 'resolution'

function progressScopeOf(search: URLSearchParams): ProgressScope {
  return search.get('scope') === 'resolution' ? 'resolution' : 'project'
}

function progressApiBase(scope: ProgressScope, mode: 'contractor' | 'org' = 'contractor') {
  if (scope === 'resolution') return '/stakeholders/resolution-progress'
  return mode === 'org' ? '/stakeholders/reports' : '/stakeholders/progress'
}

function progressListPath(scope: ProgressScope, mode: 'contractor' | 'org' = 'contractor') {
  const base = mode === 'org' ? '/stakeholders/reports' : '/stakeholders/progress'
  return scope === 'resolution' ? `${base}?scope=resolution` : base
}

function percentText(value: number | null | undefined, locale: string) {
  return value == null ? '—' : `${formatNumber(value, locale)}٪`
}

function ProgressTotalRing({ value }: { value: number | null }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const pct = Math.min(100, Math.max(0, value ?? 0))
  const label = percentText(value, locale)
  return (
    <span
      className="relative inline-flex size-12 shrink-0 rounded-full p-1"
      style={{ background: `conic-gradient(#2ebdb6 ${pct * 3.6}deg, #e7f6f4 0deg)` }}
      role="img"
      aria-label={`${t('stakeholders.progressTotal')} ${label}`}
    >
      <span className="flex size-full items-center justify-center rounded-full bg-white">
        <span className="text-[11px] font-bold tabular-nums leading-none text-ink-900">{label}</span>
      </span>
    </span>
  )
}

function RelatedReportCount({ count }: { count: number | null }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const label = t('stakeholders.relatedReportCount')
  const value = count == null ? '—' : formatNumber(count, locale)
  return (
    <span
      className="inline-flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-white px-2.5 shadow-[0_6px_16px_rgba(46,189,182,0.16)] ring-1 ring-teal-100"
      role="img"
      aria-label={`${label} ${value}`}
    >
      <span className="flex size-8 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
        <ClipboardList className="size-4" aria-hidden />
      </span>
      <span className="flex min-w-8 flex-col items-start leading-none">
        <span className="text-sm font-bold tabular-nums text-ink-900">{value}</span>
        <span className="mt-0.5 text-[10px] font-medium text-ink-500">{label}</span>
      </span>
    </span>
  )
}

export function StakeholderProgressListPage({ mode }: { mode: 'contractor' | 'org' }) {
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const projectId = searchParams.get('projectId') ?? ''
  const contractorId = searchParams.get('contractorId') ?? ''
  const scope = progressScopeOf(searchParams)
  const apiBase = progressApiBase(scope, mode)
  const pageBase = mode === 'org' ? '/stakeholders/reports' : '/stakeholders/progress'
  const scopeQuery = scope === 'resolution' ? '?scope=resolution' : ''
  const projects = useQuery({
    queryKey: ['stakeholders', 'project-filter', mode],
    enabled: scope === 'project',
    queryFn: async () => {
      if (mode === 'org') {
        const { data } = await api.get<Project[] | Paginated<Project>>('/projects')
        return Array.isArray(data) ? data : data.items
      }
      const { data } = await api.get<{ id: string; systemName: string }[]>('/stakeholders/projects/options')
      return data
    },
  })
  const contractors = useQuery({
    queryKey: ['stakeholders', 'contractors'],
    enabled: mode === 'org',
    queryFn: async () => {
      const { data } = await api.get<StakeholderParty[]>('/stakeholders/contractors')
      return data
    },
  })
  const query = useQuery({
    queryKey: ['stakeholders', mode, 'progress', scope, q, page, projectId, contractorId, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<StakeholderProgressListItem> & { avgProgressPercent: number | null }>(apiBase, {
        params: {
          q: q || undefined,
          page,
          projectId: scope === 'project' ? projectId || undefined : undefined,
          contractorId: mode === 'org' ? contractorId || undefined : undefined,
          ...sortParams,
        },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []
  const filtersActive = Boolean((scope === 'project' && projectId) || contractorId)
  if (mode === 'org' && isContractor(user) && !isAdmin(user)) {
    return <Navigate to={progressListPath(scope, 'contractor')} replace />
  }

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={ClipboardList}
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            {t(mode === 'contractor' ? 'menus.stakeholderProgress' : 'menus.stakeholderReports')}
            <ProgressTotalRing value={query.data?.avgProgressPercent ?? null} />
            {mode === 'org' && (projectId || contractorId) ? (
              <RelatedReportCount count={query.data?.total ?? null} />
            ) : null}
          </span>
        }
        subtitle={t(
          scope === 'resolution'
            ? 'stakeholders.resolutionProgressSubtitle'
            : mode === 'org'
              ? 'stakeholders.reportsSubtitle'
              : 'stakeholders.progressSubtitle',
        )}
        action={
          <Link to={`${pageBase}/new${scopeQuery}`}>
            <Button>
              <Plus className="size-4" />
              {t(scope === 'resolution' ? 'stakeholders.progressCreateResolution' : 'stakeholders.progressCreateProject')}
            </Button>
          </Link>
        }
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={scope === 'project' ? 'primary' : 'ghost'}
          onClick={() => setParams({ scope: undefined, projectId: projectId || undefined }, { resetPage: true })}
        >
          {t('stakeholders.progressScopeProject')}
        </Button>
        <Button
          type="button"
          variant={scope === 'resolution' ? 'primary' : 'ghost'}
          onClick={() => setParams({ scope: 'resolution', projectId: undefined }, { resetPage: true })}
        >
          {t('stakeholders.progressScopeResolution')}
        </Button>
      </div>
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('stakeholders.searchProgress')}
        placeholder={t(
          scope === 'resolution'
            ? 'stakeholders.searchResolutionProgressPlaceholder'
            : 'stakeholders.searchProgressPlaceholder',
        )}
        filtersActive={filtersActive}
        extra={
          scope === 'resolution' && mode !== 'org' ? undefined : (
            <>
              {scope === 'project' ? (
                <FormField icon={Filter} label={t('stakeholders.project')} htmlFor="progress-project-filter">
                  <SearchSelect
                    id="progress-project-filter"
                    value={projectId}
                    onChange={(value) => setParams({ projectId: value || undefined }, { resetPage: true })}
                    placeholder={t('common.all')}
                    options={[
                      { value: '', label: t('common.all') },
                      ...(projects.data ?? []).map((project) => ({
                        value: project.id,
                        label: 'systemName' in project ? project.systemName : '',
                      })),
                    ]}
                  />
                </FormField>
              ) : null}
              {mode === 'org' ? (
                <FormField icon={Handshake} label={t('stakeholders.contractor')} htmlFor="progress-contractor-filter">
                  <SearchSelect
                    id="progress-contractor-filter"
                    value={contractorId}
                    onChange={(value) => setParams({ contractorId: value || undefined }, { resetPage: true })}
                    placeholder={t('stakeholders.allContractors')}
                    options={[
                      { value: '', label: t('stakeholders.allContractors') },
                      ...(contractors.data ?? []).map((item) => ({ value: item.id, label: item.name })),
                    ]}
                  />
                </FormField>
              ) : null}
            </>
          )
        }
      />
      <TableCard
        loading={query.isLoading}
        empty={q || filtersActive ? t('stakeholders.noProgress') : t('stakeholders.emptyProgress')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="occurredAt" label={t('stakeholders.occurredAt')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              {scope === 'resolution' ? (
                <>
                  <SortableTh column="title" label={t('stakeholders.progressTitleField')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
                  <SortableTh column="contract" label={t('stakeholders.resolutionContract')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
                  <SortableTh column="project" label={t('stakeholders.resolution')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
                </>
              ) : (
                <SortableTh column="project" label={t('stakeholders.project')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              )}
              {mode === 'org' ? (
                <SortableTh column="contractor" label={t('stakeholders.contractor')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              ) : null}
              <SortableTh column="progressPercent" label={t('stakeholders.proposedPercent')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="author" label={t('stakeholders.author')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const ownReport = item.createdBy?.id === user?.id
              return (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3"><DateText value={item.occurredAt} /></td>
                {scope === 'resolution' ? (
                  <>
                    <td className="px-4 py-3">{item.title || '—'}</td>
                    <td className="px-4 py-3">{item.contract?.title || '—'}</td>
                    <td className="px-4 py-3">{item.resolution?.title || item.project?.systemName || '—'}</td>
                  </>
                ) : (
                  <td className="px-4 py-3">{item.project?.systemName}</td>
                )}
                {mode === 'org' ? <td className="px-4 py-3">{item.contractor?.name}</td> : null}
                <td className="px-4 py-3">{percentText(item.progressPercent, locale)}</td>
                <td className="px-4 py-3">{item.createdBy?.fullName}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={`${pageBase}/${item.id}${scopeQuery}`}
                    editTo={ownReport ? `${pageBase}/${item.id}/edit${scopeQuery}` : undefined}
                    onDelete={
                      ownReport
                        ? () =>
                            confirmDelete({
                              message: t('stakeholders.confirmDeleteProgress'),
                              successMessage: t('stakeholders.deleted'),
                              path: `${apiBase}/${item.id}`,
                              queryKey: ['stakeholders'],
                            })
                        : undefined
                    }
                  />
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </TableCard>
      {query.data ? (
        <PaginationBar page={query.data.page} pageSize={query.data.pageSize} total={query.data.total} onPageChange={setPage} />
      ) : null}
    </div>
  )
}

function ProgressForm({
  initial,
  scope,
  mode,
  onSubmit,
}: {
  initial?: StakeholderProgressListItem
  scope: ProgressScope
  mode: 'contractor' | 'org'
  onSubmit: (payload: Record<string, unknown>) => Promise<void>
}) {
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const onBehalf = mode === 'org' || !isContractor(user)
  const [contractorId, setContractorId] = useState(initial?.contractor?.id ?? '')
  const [projectId, setProjectId] = useState(initial?.project?.id ?? '')
  const [contractId, setContractId] = useState(initial?.contract?.id ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [occurredAt, setOccurredAt] = useState(initial?.occurredAt || todayIsoDate())
  const [progressPercent, setProgressPercent] = useState<number | null>(initial?.progressPercent ?? null)
  const [actionsDone, setActionsDone] = useState(initial?.actionsDone ?? '')
  const [nextPlan, setNextPlan] = useState(initial?.nextPlan ?? '')
  const [blockers, setBlockers] = useState(initial?.blockers ?? '')
  const [needs, setNeeds] = useState(initial?.needs ?? '')
  const [files, setFiles] = useState<PendingStakeholderFiles>(
    initial ? pendingFromAttachments(initial.attachments) : emptyPendingFiles(),
  )
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()
  const contractors = useQuery({
    queryKey: ['stakeholders', 'contractors'],
    enabled: onBehalf,
    queryFn: async () => {
      const { data } = await api.get<StakeholderParty[]>('/stakeholders/contractors')
      return data
    },
  })
  const projects = useQuery({
    queryKey: ['stakeholders', 'project-options', contractorId],
    enabled: scope === 'project' && (!onBehalf || Boolean(contractorId)),
    queryFn: async () => {
      const { data } = await api.get<{ id: string; systemName: string }[]>('/stakeholders/projects/options', {
        params: onBehalf && contractorId ? { contractorId } : undefined,
      })
      return data
    },
  })
  const contracts = useQuery({
    queryKey: ['stakeholders', 'resolution-contracts', contractorId],
    enabled: scope === 'resolution' && (!onBehalf || Boolean(contractorId)),
    queryFn: async () => {
      const { data } = await api.get<StakeholderResolutionContract[]>('/stakeholders/resolution-contracts', {
        params: onBehalf && contractorId ? { contractorId } : undefined,
      })
      return data
    },
  })

  function changeContractor(value: string) {
    setContractorId(value)
    setProjectId('')
    setContractId('')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (onBehalf && !contractorId) {
      toast.error(t('stakeholders.contractorRequired'))
      return
    }
    if (scope === 'resolution') {
      if (!contractId || !occurredAt || !title.trim()) {
        toast.error(t('stakeholders.contractDateRequired'))
        return
      }
    } else if (!projectId || !occurredAt) {
      toast.error(t('stakeholders.projectDateRequired'))
      return
    }
    if (
      scope === 'project' &&
      !actionsDone.trim() &&
      !nextPlan.trim() &&
      !blockers.trim() &&
      !needs.trim() &&
      progressPercent == null &&
      files.labels.length === 0
    ) {
      toast.error(t('stakeholders.contentRequired'))
      return
    }
    setSaving(true)
    try {
      if (scope === 'resolution') {
        await onSubmit({
          contractId,
          occurredAt,
          title: title.trim(),
          progressPercent,
          actionsDone: actionsDone.trim() || null,
          nextPlan: nextPlan.trim() || null,
          blockers: blockers.trim() || null,
          needs: needs.trim() || null,
        })
      } else {
        await onSubmit({
          ...(onBehalf ? { contractorId } : {}),
          projectId,
          occurredAt,
          progressPercent,
          actionsDone: actionsDone.trim() || null,
          nextPlan: nextPlan.trim() || null,
          blockers: blockers.trim() || null,
          needs: needs.trim() || null,
          imageIds: files.imageIds,
          fileIds: files.fileIds,
        })
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={ClipboardList}
      title={
        initial
          ? t('stakeholders.progressEdit')
          : t(scope === 'resolution' ? 'stakeholders.progressCreateResolution' : 'stakeholders.progressCreateProject')
      }
      subtitle={
        initial
          ? undefined
          : t(scope === 'resolution' ? 'stakeholders.resolutionProgressCreateSubtitle' : 'stakeholders.progressCreateSubtitle')
      }
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        {onBehalf ? (
          <FormField icon={Handshake} label={t('stakeholders.contractor')} htmlFor="progress-contractor">
            <SearchSelect
              id="progress-contractor"
              value={contractorId}
              onChange={changeContractor}
              placeholder={t('stakeholders.selectContractor')}
              options={(contractors.data ?? []).map((item) => ({ value: item.id, label: item.name }))}
            />
          </FormField>
        ) : null}
        {scope === 'resolution' ? (
          <>
            <FormField icon={FileBadge2} label={t('stakeholders.resolutionContract')} htmlFor="progress-contract">
              <SearchSelect
                id="progress-contract"
                value={contractId}
                onChange={setContractId}
                placeholder={t('stakeholders.selectContract')}
                options={(contracts.data ?? []).map((item) => ({
                  value: item.id,
                  label: `${item.title} · ${item.resolution.title}`,
                }))}
              />
              {contracts.isSuccess && contracts.data.length === 0 ? (
                <p className="mt-1.5 text-xs text-ink-500">{t('stakeholders.emptyResolutionContracts')}</p>
              ) : null}
            </FormField>
            <FormField icon={FileText} label={t('stakeholders.progressTitleField')} htmlFor="progress-title">
              <input
                id="progress-title"
                required
                className={fieldClassName}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </FormField>
          </>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <FormField icon={FolderKanban} label={t('stakeholders.project')} htmlFor="progress-project">
                <SearchSelect
                  id="progress-project"
                  value={projectId}
                  onChange={setProjectId}
                  placeholder={t('stakeholders.selectProject')}
                  options={(projects.data ?? []).map((item) => ({ value: item.id, label: item.systemName }))}
                />
                {onBehalf && projects.isSuccess && projects.data.length === 0 ? (
                  <p className="mt-1.5 text-xs text-ink-500">{t('stakeholders.emptyContractorProjects')}</p>
                ) : null}
              </FormField>
            </div>
            <FormField icon={ClipboardList} label={t('stakeholders.occurredAt')} htmlFor="progress-date">
              <PersianDateField id="progress-date" value={occurredAt} onChange={(value) => setOccurredAt(value ?? '')} />
            </FormField>
          </div>
        )}
        {scope === 'resolution' ? (
          <FormField icon={ClipboardList} label={t('stakeholders.occurredAt')} htmlFor="progress-date">
            <PersianDateField id="progress-date" value={occurredAt} onChange={(value) => setOccurredAt(value ?? '')} />
          </FormField>
        ) : null}
        <FormField icon={Percent} label={t('stakeholders.proposedPercent')} htmlFor="progress-percent">
          <div className="space-y-1.5">
            <input
              id="progress-percent"
              type="range"
              min={0}
              max={100}
              step={1}
              dir="ltr"
              className="progress-slider"
              style={{ '--slider-fill': `${progressPercent ?? 0}%` } as CSSProperties}
              value={progressPercent ?? 0}
              onChange={(event) => setProgressPercent(Number(event.target.value))}
            />
            <p className="text-center text-sm tabular-nums text-ink-700">
              {progressPercent == null ? '—' : `${formatNumber(progressPercent, locale)}٪`}
            </p>
          </div>
        </FormField>
        <FormField icon={ListChecks} label={t('stakeholders.actionsDone')} htmlFor="progress-actions">
          <textarea id="progress-actions" className={fieldClassName} rows={6} value={actionsDone} onChange={(event) => setActionsDone(event.target.value)} />
        </FormField>
        <FormField icon={ScrollText} label={t('stakeholders.nextPlan')} htmlFor="progress-next">
          <textarea id="progress-next" className={fieldClassName} rows={6} value={nextPlan} onChange={(event) => setNextPlan(event.target.value)} />
        </FormField>
        <FormField icon={ScrollText} label={t('stakeholders.blockers')} htmlFor="progress-blockers">
          <textarea id="progress-blockers" className={fieldClassName} rows={6} value={blockers} onChange={(event) => setBlockers(event.target.value)} />
        </FormField>
        <FormField icon={ScrollText} label={t('stakeholders.needs')} htmlFor="progress-needs">
          <textarea id="progress-needs" className={fieldClassName} rows={3} value={needs} onChange={(event) => setNeeds(event.target.value)} />
        </FormField>
        {scope === 'project' ? (
          <FormField icon={ScrollText} label={t('stakeholders.attachments')} htmlFor="progress-files">
            <StakeholderAttachmentsField value={files} onChange={setFiles} />
          </FormField>
        ) : null}
        <FormActions
          submitLabel={t('stakeholders.save')}
          cancelLabel={t('common.cancel')}
          submitting={saving}
          onCancel={() => navigate(progressListPath(scope, mode))}
        />
      </AppForm>
    </FormCard>
  )
}

export function StakeholderProgressCreatePage({ mode = 'contractor' }: { mode?: 'contractor' | 'org' }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const scope = progressScopeOf(searchParams)
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={ClipboardList}
        title={t(scope === 'resolution' ? 'stakeholders.progressCreateResolution' : 'stakeholders.progressCreateProject')}
        subtitle={t(scope === 'resolution' ? 'stakeholders.resolutionProgressCreateSubtitle' : 'stakeholders.progressCreateSubtitle')}
      />
      <ProgressForm
        scope={scope}
        mode={mode}
        onSubmit={async (payload) => {
          await api.post(progressApiBase(scope, mode), payload)
          toast.success(t('stakeholders.created'))
          navigate(progressListPath(scope, mode))
        }}
      />
    </div>
  )
}

export function StakeholderProgressEditPage({ mode = 'contractor' }: { mode?: 'contractor' | 'org' }) {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const scope = progressScopeOf(searchParams)
  const query = useQuery({
    queryKey: ['stakeholders', 'progress', scope, id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<StakeholderProgressListItem>(`${progressApiBase(scope, mode)}/${id}`)
      return data
    },
  })
  if (!query.data || !id) return <LoadingState />
  const name = scope === 'resolution'
    ? query.data.title || query.data.contract?.title || t('stakeholders.progressEdit')
    : query.data.project?.systemName || t('stakeholders.progressEdit')
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={ClipboardList}
        title={t('stakeholders.progressEdit')}
        subtitle={<EntityNameSubtitle name={name} icon={scope === 'resolution' ? FileBadge2 : FolderKanban} />}
      />
      <ProgressForm
        initial={query.data}
        scope={scope}
        mode={mode}
        onSubmit={async (payload) => {
          await api.patch(`${progressApiBase(scope, mode)}/${id}`, payload)
          toast.success(t('stakeholders.updated'))
          navigate(progressListPath(scope, mode))
        }}
      />
    </div>
  )
}

export function StakeholderProgressDetailPage({ mode }: { mode: 'contractor' | 'org' }) {
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const [searchParams] = useSearchParams()
  const scope = progressScopeOf(searchParams)
  const apiBase = progressApiBase(scope, mode)
  const query = useQuery({
    queryKey: ['stakeholders', 'progress', scope, id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<StakeholderProgressListItem>(`${apiBase}/${id}`)
      return data
    },
  })
  if (mode === 'org' && id && isContractor(user) && !isAdmin(user)) {
    return (
      <Navigate
        to={`/stakeholders/progress/${id}${scope === 'resolution' ? '?scope=resolution' : ''}`}
        replace
      />
    )
  }
  if (!query.data || !id) return <LoadingState />
  const item = query.data
  const ownReport = item.createdBy?.id === user?.id
  const title =
    scope === 'resolution'
      ? item.title || item.contract?.title || t('stakeholders.progressDetails')
      : item.project?.systemName || t('stakeholders.progressDetails')

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={ClipboardList}
        title={t(mode === 'org' ? 'stakeholders.reportDetails' : 'stakeholders.progressDetails')}
        subtitle={<EntityNameSubtitle name={title} icon={scope === 'resolution' ? FileBadge2 : FolderKanban} />}
        backTo={progressListPath(scope, mode)}
      />
      <FormCard icon={ClipboardList} title={title}>
        <div className="space-y-6 p-5 sm:p-6">
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            {scope === 'resolution' ? (
              <>
                <FormFactTile icon={FileBadge2} label={t('stakeholders.resolutionContract')} value={item.contract?.title || '—'} tone="teal" />
                <FormFactTile icon={FolderKanban} label={t('stakeholders.resolution')} value={item.resolution?.title || item.project?.systemName || '—'} tone="mint" />
              </>
            ) : (
              <FormFactTile icon={FolderKanban} label={t('stakeholders.project')} value={item.project?.systemName || '—'} tone="teal" />
            )}
            {mode === 'org' ? (
              <FormFactTile icon={Handshake} label={t('stakeholders.contractor')} value={item.contractor?.name || '—'} tone="mint" />
            ) : null}
            <FormFactTile icon={ClipboardList} label={t('stakeholders.occurredAt')} value={item.occurredAt ? <DateText value={item.occurredAt} /> : '—'} tone="ink" />
            <FormFactTile icon={Gauge} label={t('stakeholders.proposedPercent')} value={percentText(item.progressPercent, locale)} tone="mint" />
            <FormFactTile icon={ListChecks} label={t('stakeholders.actionsDone')} value={item.actionsDone || '—'} tone="teal" />
            <FormFactTile icon={ScrollText} label={t('stakeholders.nextPlan')} value={item.nextPlan || '—'} tone="mint" />
            <FormFactTile icon={ScrollText} label={t('stakeholders.blockers')} value={item.blockers || '—'} tone="ink" />
            <FormFactTile icon={ScrollText} label={t('stakeholders.needs')} value={item.needs || '—'} tone="teal" />
          </div>
          {scope === 'project' ? (
            <>
              <FormSectionTitle icon={ScrollText}>{t('stakeholders.attachments')}</FormSectionTitle>
              <AttachmentList items={item.attachments} />
            </>
          ) : null}
          {ownReport ? (
            <DetailActions
              editTo={`${mode === 'org' ? '/stakeholders/reports' : '/stakeholders/progress'}/${id}/edit${scope === 'resolution' ? '?scope=resolution' : ''}`}
              editLabel={t('common.edit')}
              deleteLabel={t('common.delete')}
              onDelete={() =>
                confirmDelete({
                  message: t('stakeholders.confirmDeleteProgress'),
                  successMessage: t('stakeholders.deleted'),
                  path: `${apiBase}/${id}`,
                  queryKey: ['stakeholders'],
                  onDeleted: () => navigate(progressListPath(scope, mode)),
                })
              }
            />
          ) : null}
        </div>
      </FormCard>
    </div>
  )
}
