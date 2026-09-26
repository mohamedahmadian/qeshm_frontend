import { Filter, FolderKanban, Handshake, MessagesSquare, Plus, ScrollText, Send } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import type { Paginated, Project } from '../../types/app'
import {
  AttachmentList,
  StakeholderAttachmentsField,
  emptyPendingFiles,
  pendingFromAttachments,
  type PendingStakeholderFiles,
} from './attachments'
import {
  stakeholderActionResults,
  stakeholderCorrespondenceKinds,
  stakeholderCorrespondenceStatuses,
  type StakeholderCorrespondence,
  type StakeholderCorrespondenceKind,
  type StakeholderCorrespondenceStatus,
  type StakeholderParty,
} from './types'

export function StakeholderCorrespondenceListPage({ mode }: { mode: 'contractor' | 'org' }) {
  const { t } = useTranslation()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const kind = searchParams.get('kind') ?? ''
  const status = searchParams.get('status') ?? ''
  const projectId = searchParams.get('projectId') ?? ''
  const contractorId = searchParams.get('contractorId') ?? ''
  const base = mode === 'org' ? '/stakeholders/inbox' : '/stakeholders/correspondence'
  const projects = useQuery({
    queryKey: ['stakeholders', 'project-filter', mode, 'mail'],
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
    queryKey: ['stakeholders', mode, 'mail', q, page, kind, status, projectId, contractorId, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<StakeholderCorrespondence>>(base, {
        params: {
          q: q || undefined,
          page,
          kind: kind || undefined,
          status: status || undefined,
          projectId: projectId || undefined,
          contractorId: mode === 'org' ? contractorId || undefined : undefined,
          ...sortParams,
        },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []
  const filtersActive = Boolean(kind || status || projectId || contractorId)

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={mode === 'org' ? Handshake : MessagesSquare}
        title={t(mode === 'org' ? 'menus.stakeholderInbox' : 'menus.stakeholderCorrespondence')}
        subtitle={t(mode === 'org' ? 'stakeholders.inboxSubtitle' : 'stakeholders.correspondenceSubtitle')}
        action={
          mode === 'contractor' ? (
            <Link to="/stakeholders/correspondence/new">
              <Button>
                <Plus className="size-4" />
                {t('stakeholders.correspondenceCreate')}
              </Button>
            </Link>
          ) : undefined
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('stakeholders.searchCorrespondence')}
        placeholder={t('stakeholders.searchCorrespondencePlaceholder')}
        filtersActive={filtersActive}
        extra={
          <>
            <FormField icon={Filter} label={t('stakeholders.kind')} htmlFor="mail-kind-filter">
              <SearchSelect
                id="mail-kind-filter"
                value={kind}
                onChange={(value) => setParams({ kind: value || undefined }, { resetPage: true })}
                placeholder={t('common.all')}
                options={[
                  { value: '', label: t('common.all') },
                  ...stakeholderCorrespondenceKinds.map((item) => ({
                    value: item,
                    label: t(`stakeholders.kinds.${item}`),
                  })),
                ]}
              />
            </FormField>
            <FormField icon={Filter} label={t('stakeholders.workflowStatus')} htmlFor="mail-status-filter">
              <SearchSelect
                id="mail-status-filter"
                value={status}
                onChange={(value) => setParams({ status: value || undefined }, { resetPage: true })}
                placeholder={t('common.all')}
                options={[
                  { value: '', label: t('common.all') },
                  ...stakeholderCorrespondenceStatuses.map((item) => ({
                    value: item,
                    label: t(`stakeholders.statuses.${item}`),
                  })),
                ]}
              />
            </FormField>
            <FormField icon={FolderKanban} label={t('stakeholders.project')} htmlFor="mail-project-filter">
              <SearchSelect
                id="mail-project-filter"
                value={projectId}
                onChange={(value) => setParams({ projectId: value || undefined }, { resetPage: true })}
                placeholder={t('common.all')}
                options={[
                  { value: '', label: t('common.all') },
                  ...(projects.data ?? []).map((project) => ({ value: project.id, label: project.systemName })),
                ]}
              />
            </FormField>
            {mode === 'org' ? (
              <FormField icon={Handshake} label={t('stakeholders.contractor')} htmlFor="mail-contractor-filter">
                <SearchSelect
                  id="mail-contractor-filter"
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
        empty={q || filtersActive ? t('stakeholders.noCorrespondence') : t('stakeholders.emptyCorrespondence')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="subject" label={t('stakeholders.subject')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="kind" label={t('stakeholders.kind')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="status" label={t('stakeholders.workflowStatus')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="project" label={t('stakeholders.project')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              {mode === 'org' ? (
                <SortableTh column="contractor" label={t('stakeholders.contractor')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              ) : null}
              <SortableTh column="createdAt" label={t('stakeholders.occurredAt')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const editable = mode === 'contractor' && item.status === 'SENT'
              return (
                <tr key={item.id} className="border-t border-line">
                  <td className="px-4 py-3 font-medium">{item.subject}</td>
                  <td className="px-4 py-3">{t(`stakeholders.kinds.${item.kind}`)}</td>
                  <td className="px-4 py-3">{t(`stakeholders.statuses.${item.status}`)}</td>
                  <td className="px-4 py-3">{item.project?.systemName || '—'}</td>
                  {mode === 'org' ? <td className="px-4 py-3">{item.contractor.name}</td> : null}
                  <td className="px-4 py-3"><DateText value={item.createdAt} withTime /></td>
                  <td className={actionsColClassName}>
                    <EntityRowActions
                      viewTo={`${base}/${item.id}`}
                      editTo={editable ? `/stakeholders/correspondence/${item.id}/edit` : undefined}
                      onDelete={
                        editable
                          ? () =>
                              confirmDelete({
                                message: t('stakeholders.confirmDeleteCorrespondence'),
                                successMessage: t('stakeholders.correspondenceDeleted'),
                                path: `/stakeholders/correspondence/${item.id}`,
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

function CorrespondenceForm({
  initial,
  onSubmit,
}: {
  initial?: StakeholderCorrespondence
  onSubmit: (payload: Record<string, unknown>) => Promise<void>
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [kind, setKind] = useState<StakeholderCorrespondenceKind>(initial?.kind ?? 'ACTION_REQUEST')
  const [subject, setSubject] = useState(initial?.subject ?? '')
  const [body, setBody] = useState(initial?.body ?? '')
  const [projectId, setProjectId] = useState(initial?.project?.id ?? '')
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '')
  const [files, setFiles] = useState<PendingStakeholderFiles>(
    initial ? pendingFromAttachments(initial.attachments) : emptyPendingFiles(),
  )
  const [saving, setSaving] = useState(false)
  const projects = useQuery({
    queryKey: ['stakeholders', 'project-options'],
    queryFn: async () => {
      const { data } = await api.get<{ id: string; systemName: string }[]>('/stakeholders/projects/options')
      return data
    },
  })

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit({
        kind,
        subject: subject.trim(),
        body: body.trim(),
        projectId: projectId || null,
        dueDate: kind === 'ACTION_REQUEST' ? dueDate || null : null,
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
      icon={MessagesSquare}
      title={initial ? t('stakeholders.correspondenceEdit') : t('stakeholders.correspondenceCreate')}
      subtitle={initial ? undefined : t('stakeholders.correspondenceCreateSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={Filter} label={t('stakeholders.kind')} htmlFor="mail-kind">
          <SearchSelect
            id="mail-kind"
            value={kind}
            onChange={(value) => setKind(value as StakeholderCorrespondenceKind)}
            options={stakeholderCorrespondenceKinds.map((item) => ({
              value: item,
              label: t(`stakeholders.kinds.${item}`),
            }))}
          />
        </FormField>
        <FormField icon={ScrollText} label={t('stakeholders.subject')} htmlFor="mail-subject">
          <input id="mail-subject" className={fieldClassName} required value={subject} onChange={(event) => setSubject(event.target.value)} />
        </FormField>
        <FormField icon={ScrollText} label={t('stakeholders.body')} htmlFor="mail-body">
          <textarea id="mail-body" className={fieldClassName} rows={5} required value={body} onChange={(event) => setBody(event.target.value)} />
        </FormField>
        <FormField icon={FolderKanban} label={t('stakeholders.project')} htmlFor="mail-project">
          <SearchSelect
            id="mail-project"
            value={projectId}
            onChange={setProjectId}
            placeholder={t('stakeholders.projectOptional')}
            options={[
              { value: '', label: t('stakeholders.projectOptional') },
              ...(projects.data ?? []).map((item) => ({ value: item.id, label: item.systemName })),
            ]}
          />
        </FormField>
        {kind === 'ACTION_REQUEST' ? (
          <FormField icon={ScrollText} label={t('stakeholders.dueDate')} htmlFor="mail-due">
            <PersianDateField id="mail-due" value={dueDate} onChange={(value) => setDueDate(value ?? '')} />
          </FormField>
        ) : null}
        <FormField icon={ScrollText} label={t('stakeholders.attachments')} htmlFor="mail-files">
          <StakeholderAttachmentsField value={files} onChange={setFiles} />
        </FormField>
        <FormActions
          submitLabel={t('stakeholders.save')}
          cancelLabel={t('common.cancel')}
          submitting={saving}
          onCancel={() => navigate('/stakeholders/correspondence')}
        />
      </AppForm>
    </FormCard>
  )
}

export function StakeholderCorrespondenceCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className={formShellClassName}>
      <PageHeader icon={MessagesSquare} title={t('stakeholders.correspondenceCreate')} subtitle={t('stakeholders.correspondenceCreateSubtitle')} />
      <CorrespondenceForm
        onSubmit={async (payload) => {
          await api.post('/stakeholders/correspondence', payload)
          toast.success(t('stakeholders.correspondenceCreated'))
          navigate('/stakeholders/correspondence')
        }}
      />
    </div>
  )
}

export function StakeholderCorrespondenceEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['stakeholders', 'correspondence', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<StakeholderCorrespondence>(`/stakeholders/correspondence/${id}`)
      return data
    },
  })
  if (!query.data || !id) return <LoadingState />
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={MessagesSquare}
        title={t('stakeholders.correspondenceEdit')}
        subtitle={<EntityNameSubtitle name={query.data.subject} icon={MessagesSquare} />}
      />
      <CorrespondenceForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/stakeholders/correspondence/${id}`, payload)
          toast.success(t('stakeholders.correspondenceUpdated'))
          navigate('/stakeholders/correspondence')
        }}
      />
    </div>
  )
}

export function StakeholderCorrespondenceDetailPage({ mode }: { mode: 'contractor' | 'org' }) {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { confirmDelete } = useConfirmDelete()
  const base = mode === 'org' ? '/stakeholders/inbox' : '/stakeholders/correspondence'
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<StakeholderCorrespondenceStatus | ''>('')
  const [actionResult, setActionResult] = useState<string>('')
  const [savingStatus, setSavingStatus] = useState(false)
  const query = useQuery({
    queryKey: ['stakeholders', 'correspondence', id, mode],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<StakeholderCorrespondence>(`${base}/${id}`)
      setStatus(data.status)
      setActionResult(data.actionResult ?? '')
      return data
    },
  })
  if (!query.data || !id) return <LoadingState />
  const item = query.data
  const editable = mode === 'contractor' && item.status === 'SENT'
  const closed = item.status === 'CLOSED'

  async function sendReply(event: FormEvent) {
    event.preventDefault()
    if (!reply.trim() || closed) return
    setSending(true)
    try {
      await api.post(`${base}/${id}/messages`, { body: reply.trim() })
      setReply('')
      toast.success(t('stakeholders.messageSent'))
      await queryClient.invalidateQueries({ queryKey: ['stakeholders', 'correspondence', id, mode] })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSending(false)
    }
  }

  async function saveWorkflow(event: FormEvent) {
    event.preventDefault()
    setSavingStatus(true)
    try {
      await api.patch(`/stakeholders/inbox/${id}`, {
        status: status || undefined,
        actionResult: item.kind === 'ACTION_REQUEST' ? actionResult || null : undefined,
      })
      toast.success(t('stakeholders.workflowSaved'))
      await queryClient.invalidateQueries({ queryKey: ['stakeholders', 'correspondence', id, mode] })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSavingStatus(false)
    }
  }

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={mode === 'org' ? Handshake : MessagesSquare}
        title={t(mode === 'org' ? 'stakeholders.inboxDetails' : 'stakeholders.correspondenceDetails')}
        subtitle={<EntityNameSubtitle name={item.subject} icon={MessagesSquare} />}
      />
      <FormCard icon={MessagesSquare} title={item.subject}>
        <div className="space-y-6 p-5 sm:p-6">
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Filter} label={t('stakeholders.kind')} value={t(`stakeholders.kinds.${item.kind}`)} tone="teal" />
            <FormFactTile icon={ScrollText} label={t('stakeholders.workflowStatus')} value={t(`stakeholders.statuses.${item.status}`)} tone="mint" />
            <FormFactTile icon={Handshake} label={t('stakeholders.contractor')} value={item.contractor.name} tone="ink" />
            <FormFactTile icon={FolderKanban} label={t('stakeholders.project')} value={item.project?.systemName || '—'} tone="teal" />
            {item.kind === 'ACTION_REQUEST' ? (
              <FormFactTile icon={ScrollText} label={t('stakeholders.dueDate')} value={item.dueDate ? <DateText value={item.dueDate} /> : '—'} tone="mint" />
            ) : null}
            {item.kind === 'ACTION_REQUEST' ? (
              <FormFactTile
                icon={ScrollText}
                label={t('stakeholders.actionResult')}
                value={item.actionResult ? t(`stakeholders.results.${item.actionResult}`) : '—'}
                tone="ink"
              />
            ) : null}
            <FormFactTile icon={ScrollText} label={t('stakeholders.body')} value={item.body} tone="teal" />
          </div>
          <FormSectionTitle icon={ScrollText}>{t('stakeholders.attachments')}</FormSectionTitle>
          <AttachmentList items={item.attachments} />
          <FormSectionTitle icon={MessagesSquare}>{t('stakeholders.reply')}</FormSectionTitle>
          <ul className="space-y-3">
            {(item.messages ?? []).map((message) => (
              <li key={message.id} className="rounded-2xl border border-teal-100 bg-white p-3">
                <div className="mb-1 flex items-center justify-between gap-2 text-xs text-ink-500">
                  <span>{t(`stakeholders.sides.${message.side}`)} · {message.author.fullName}</span>
                  <DateText value={message.createdAt} withTime />
                </div>
                <p className="whitespace-pre-wrap text-sm text-ink-800">{message.body}</p>
              </li>
            ))}
          </ul>
          {closed ? <p className="text-sm text-ink-500">{t('stakeholders.closed')}</p> : (
            <AppForm onSubmit={sendReply} className="space-y-3">
              <FormField icon={Send} label={t('stakeholders.reply')} htmlFor="mail-reply">
                <textarea
                  id="mail-reply"
                  className={fieldClassName}
                  rows={3}
                  value={reply}
                  placeholder={t('stakeholders.replyPlaceholder')}
                  onChange={(event) => setReply(event.target.value)}
                />
              </FormField>
              <Button type="submit" disabled={sending || !reply.trim()}>
                <Send className="size-4" aria-hidden />
                {t('stakeholders.sendReply')}
              </Button>
            </AppForm>
          )}
          {mode === 'org' ? (
            <AppForm onSubmit={saveWorkflow} className="space-y-4">
              <FormSectionTitle icon={Handshake}>{t('stakeholders.workflowStatus')}</FormSectionTitle>
              <FormField icon={Filter} label={t('stakeholders.workflowStatus')} htmlFor="inbox-status">
                <SearchSelect
                  id="inbox-status"
                  value={status}
                  onChange={(value) => setStatus(value as StakeholderCorrespondenceStatus)}
                  options={stakeholderCorrespondenceStatuses.map((itemStatus) => ({
                    value: itemStatus,
                    label: t(`stakeholders.statuses.${itemStatus}`),
                  }))}
                />
              </FormField>
              {item.kind === 'ACTION_REQUEST' ? (
                <FormField icon={ScrollText} label={t('stakeholders.actionResult')} htmlFor="inbox-result">
                  <SearchSelect
                    id="inbox-result"
                    value={actionResult}
                    onChange={setActionResult}
                    placeholder={t('stakeholders.noActionResult')}
                    options={[
                      { value: '', label: t('stakeholders.noActionResult') },
                      ...stakeholderActionResults.map((result) => ({
                        value: result,
                        label: t(`stakeholders.results.${result}`),
                      })),
                    ]}
                  />
                </FormField>
              ) : null}
              <FormActions headerIcons={false} submitLabel={t('stakeholders.saveWorkflow')} submitting={savingStatus} />
            </AppForm>
          ) : null}
          {editable ? (
            <DetailActions
              editTo={`/stakeholders/correspondence/${id}/edit`}
              editLabel={t('common.edit')}
              deleteLabel={t('common.delete')}
              onDelete={() =>
                confirmDelete({
                  message: t('stakeholders.confirmDeleteCorrespondence'),
                  successMessage: t('stakeholders.correspondenceDeleted'),
                  path: `/stakeholders/correspondence/${id}`,
                  queryKey: ['stakeholders'],
                  onDeleted: () => navigate('/stakeholders/correspondence'),
                })
              }
            />
          ) : null}
        </div>
      </FormCard>
    </div>
  )
}
