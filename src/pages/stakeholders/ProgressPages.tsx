import { ClipboardList, Filter, FolderKanban, Gauge, Handshake, ListChecks, Plus, ScrollText } from 'lucide-react'
import { type FormEvent, useState } from 'react'
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
import { formatNumber } from '../../lib/datetime'
import type { Paginated, Project } from '../../types/app'
import {
  AttachmentList,
  StakeholderAttachmentsField,
  emptyPendingFiles,
  pendingFromAttachments,
  type PendingStakeholderFiles,
} from './attachments'
import type { StakeholderParty, StakeholderProgressListItem } from './types'

function percentText(value: number | null | undefined, locale: string) {
  return value == null ? '—' : `${formatNumber(value, locale)}٪`
}

export function StakeholderProgressListPage({ mode }: { mode: 'contractor' | 'org' }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const projectId = searchParams.get('projectId') ?? ''
  const contractorId = searchParams.get('contractorId') ?? ''
  const base = mode === 'org' ? '/stakeholders/reports' : '/stakeholders/progress'
  const projects = useQuery({
    queryKey: ['stakeholders', 'project-filter', mode],
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
    queryKey: ['stakeholders', mode, 'progress', q, page, projectId, contractorId, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<StakeholderProgressListItem>>(base, {
        params: {
          q: q || undefined,
          page,
          projectId: projectId || undefined,
          contractorId: mode === 'org' ? contractorId || undefined : undefined,
          ...sortParams,
        },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []
  const filtersActive = Boolean(projectId || contractorId)

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={ClipboardList}
        title={t(mode === 'org' ? 'menus.stakeholderReports' : 'menus.stakeholderProgress')}
        subtitle={t(mode === 'org' ? 'stakeholders.reportsSubtitle' : 'stakeholders.progressSubtitle')}
        action={
          mode === 'contractor' ? (
            <Link to="/stakeholders/progress/new">
              <Button>
                <Plus className="size-4" />
                {t('stakeholders.progressCreate')}
              </Button>
            </Link>
          ) : undefined
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('stakeholders.searchProgress')}
        placeholder={t('stakeholders.searchProgressPlaceholder')}
        filtersActive={filtersActive}
        extra={
          <>
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
              <SortableTh column="project" label={t('stakeholders.project')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              {mode === 'org' ? (
                <SortableTh column="contractor" label={t('stakeholders.contractor')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              ) : null}
              <SortableTh column="progressPercent" label={t('stakeholders.proposedPercent')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="author" label={t('stakeholders.author')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3"><DateText value={item.occurredAt} /></td>
                <td className="px-4 py-3">{item.project?.systemName}</td>
                {mode === 'org' ? <td className="px-4 py-3">{item.contractor?.name}</td> : null}
                <td className="px-4 py-3">{percentText(item.progressPercent, locale)}</td>
                <td className="px-4 py-3">{item.createdBy?.fullName}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={`${base}/${item.id}`}
                    editTo={mode === 'contractor' ? `/stakeholders/progress/${item.id}/edit` : undefined}
                    onDelete={
                      mode === 'contractor'
                        ? () =>
                            confirmDelete({
                              message: t('stakeholders.confirmDeleteProgress'),
                              successMessage: t('stakeholders.deleted'),
                              path: `/stakeholders/progress/${item.id}`,
                              queryKey: ['stakeholders'],
                            })
                        : undefined
                    }
                  />
                </td>
              </tr>
            ))}
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
  onSubmit,
}: {
  initial?: StakeholderProgressListItem
  onSubmit: (payload: Record<string, unknown>) => Promise<void>
}) {
  const { t } = useTranslation()
  const [projectId, setProjectId] = useState(initial?.project?.id ?? '')
  const [occurredAt, setOccurredAt] = useState(initial?.occurredAt ?? '')
  const [progressPercent, setProgressPercent] = useState(
    initial?.progressPercent == null ? '' : String(initial.progressPercent),
  )
  const [actionsDone, setActionsDone] = useState(initial?.actionsDone ?? '')
  const [nextPlan, setNextPlan] = useState(initial?.nextPlan ?? '')
  const [blockers, setBlockers] = useState(initial?.blockers ?? '')
  const [needs, setNeeds] = useState(initial?.needs ?? '')
  const [files, setFiles] = useState<PendingStakeholderFiles>(
    initial ? pendingFromAttachments(initial.attachments) : emptyPendingFiles(),
  )
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()
  const projects = useQuery({
    queryKey: ['stakeholders', 'project-options'],
    queryFn: async () => {
      const { data } = await api.get<{ id: string; systemName: string }[]>('/stakeholders/projects/options')
      return data
    },
  })

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!projectId || !occurredAt) {
      toast.error(t('stakeholders.projectDateRequired'))
      return
    }
    const percent = progressPercent.trim() === '' ? null : Number(progressPercent)
    if (!actionsDone.trim() && !nextPlan.trim() && !blockers.trim() && !needs.trim() && percent == null && files.labels.length === 0) {
      toast.error(t('stakeholders.contentRequired'))
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        projectId,
        occurredAt,
        progressPercent: percent,
        actionsDone: actionsDone.trim() || null,
        nextPlan: nextPlan.trim() || null,
        blockers: blockers.trim() || null,
        needs: needs.trim() || null,
        imageIds: files.imageIds,
        fileIds: files.fileIds,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={ClipboardList}
      title={initial ? t('stakeholders.progressEdit') : t('stakeholders.progressCreate')}
      subtitle={initial ? undefined : t('stakeholders.progressCreateSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={FolderKanban} label={t('stakeholders.project')} htmlFor="progress-project">
          <SearchSelect
            id="progress-project"
            value={projectId}
            onChange={setProjectId}
            placeholder={t('stakeholders.selectProject')}
            options={(projects.data ?? []).map((item) => ({ value: item.id, label: item.systemName }))}
          />
        </FormField>
        <FormField icon={ClipboardList} label={t('stakeholders.occurredAt')} htmlFor="progress-date">
          <PersianDateField id="progress-date" value={occurredAt} onChange={(value) => setOccurredAt(value ?? '')} />
        </FormField>
        <FormField icon={Gauge} label={t('stakeholders.proposedPercent')} htmlFor="progress-percent">
          <input
            id="progress-percent"
            type="number"
            min={0}
            max={100}
            className={fieldClassName}
            value={progressPercent}
            onChange={(event) => setProgressPercent(event.target.value)}
          />
        </FormField>
        <FormField icon={ListChecks} label={t('stakeholders.actionsDone')} htmlFor="progress-actions">
          <textarea id="progress-actions" className={fieldClassName} rows={3} value={actionsDone} onChange={(event) => setActionsDone(event.target.value)} />
        </FormField>
        <FormField icon={ScrollText} label={t('stakeholders.nextPlan')} htmlFor="progress-next">
          <textarea id="progress-next" className={fieldClassName} rows={3} value={nextPlan} onChange={(event) => setNextPlan(event.target.value)} />
        </FormField>
        <FormField icon={ScrollText} label={t('stakeholders.blockers')} htmlFor="progress-blockers">
          <textarea id="progress-blockers" className={fieldClassName} rows={3} value={blockers} onChange={(event) => setBlockers(event.target.value)} />
        </FormField>
        <FormField icon={ScrollText} label={t('stakeholders.needs')} htmlFor="progress-needs">
          <textarea id="progress-needs" className={fieldClassName} rows={3} value={needs} onChange={(event) => setNeeds(event.target.value)} />
        </FormField>
        <FormField icon={ScrollText} label={t('stakeholders.attachments')} htmlFor="progress-files">
          <StakeholderAttachmentsField value={files} onChange={setFiles} />
        </FormField>
        <FormActions
          submitLabel={t('stakeholders.save')}
          cancelLabel={t('common.cancel')}
          submitting={saving}
          onCancel={() => navigate('/stakeholders/progress')}
        />
      </AppForm>
    </FormCard>
  )
}

export function StakeholderProgressCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className={formShellClassName}>
      <PageHeader icon={ClipboardList} title={t('stakeholders.progressCreate')} subtitle={t('stakeholders.progressCreateSubtitle')} />
      <ProgressForm
        onSubmit={async (payload) => {
          await api.post('/stakeholders/progress', payload)
          toast.success(t('stakeholders.created'))
          navigate('/stakeholders/progress')
        }}
      />
    </div>
  )
}

export function StakeholderProgressEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['stakeholders', 'progress', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<StakeholderProgressListItem>(`/stakeholders/progress/${id}`)
      return data
    },
  })
  if (!query.data || !id) return <LoadingState />
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={ClipboardList}
        title={t('stakeholders.progressEdit')}
        subtitle={<EntityNameSubtitle name={query.data.project?.systemName || t('stakeholders.progressEdit')} icon={FolderKanban} />}
      />
      <ProgressForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/stakeholders/progress/${id}`, payload)
          toast.success(t('stakeholders.updated'))
          navigate('/stakeholders/progress')
        }}
      />
    </div>
  )
}

export function StakeholderProgressDetailPage({ mode }: { mode: 'contractor' | 'org' }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const base = mode === 'org' ? '/stakeholders/reports' : '/stakeholders/progress'
  const query = useQuery({
    queryKey: ['stakeholders', 'progress', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<StakeholderProgressListItem>(`${base}/${id}`)
      return data
    },
  })
  if (!query.data || !id) return <LoadingState />
  const item = query.data
  const title = item.project?.systemName || t('stakeholders.progressDetails')

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={ClipboardList}
        title={t(mode === 'org' ? 'stakeholders.reportDetails' : 'stakeholders.progressDetails')}
        subtitle={<EntityNameSubtitle name={title} icon={FolderKanban} />}
      />
      <FormCard icon={ClipboardList} title={title}>
        <div className="space-y-6 p-5 sm:p-6">
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={FolderKanban} label={t('stakeholders.project')} value={item.project?.systemName || '—'} tone="teal" />
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
          <FormSectionTitle icon={ScrollText}>{t('stakeholders.attachments')}</FormSectionTitle>
          <AttachmentList items={item.attachments} />
          {mode === 'contractor' ? (
            <DetailActions
              editTo={`/stakeholders/progress/${id}/edit`}
              editLabel={t('common.edit')}
              deleteLabel={t('common.delete')}
              onDelete={() =>
                confirmDelete({
                  message: t('stakeholders.confirmDeleteProgress'),
                  successMessage: t('stakeholders.deleted'),
                  path: `/stakeholders/progress/${id}`,
                  queryKey: ['stakeholders'],
                  onDeleted: () => navigate('/stakeholders/progress'),
                })
              }
            />
          ) : null}
        </div>
      </FormCard>
    </div>
  )
}
