import {
  CalendarRange,
  ClipboardList,
  Mic,
  Pencil,
  Percent,
  Plus,
  RefreshCw,
  ScrollText,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { DateText } from '../../../components/ui/DateText'
import { FileAudio } from '../../../components/ui/FileMedia'
import { Button, LoadingState } from '../../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../../components/ui/FormLayout'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { api, getApiErrorMessage, getImageUrl } from '../../../lib/api'
import {
  projectProgressTranscriptionStatuses,
  type ProjectProgressEntry,
} from '../../../types/app'
import { ProjectProgress } from '../ProjectShared'
import {
  ProjectProgressEntries,
  TranscriptionBadge,
  entryTitle,
  formatDuration,
} from './ProjectProgressPages'
import { ProgressQuickRecord } from './ProgressQuickRecord'
import { ProjectProgressForm } from './ProjectProgressForm'

type ProgressManageMode = 'list' | 'create' | 'edit' | 'view'

export function useProgressManage(projectId?: string, onSynced?: (percent: number) => void) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<ProgressManageMode>('list')
  const [entryId, setEntryId] = useState<string | null>(null)

  const openList = useCallback(() => {
    setMode('list')
    setEntryId(null)
    setOpen(true)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    setMode('list')
    setEntryId(null)
  }, [])

  const modal = projectId ? (
    <ProgressManageModal
      open={open}
      projectId={projectId}
      mode={mode}
      entryId={entryId}
      onCreate={() => {
        setEntryId(null)
        setMode('create')
      }}
      onEdit={(id) => {
        setEntryId(id)
        setMode('edit')
      }}
      onView={(id) => {
        setEntryId(id)
        setMode('view')
      }}
      onBackToList={() => {
        setEntryId(null)
        setMode('list')
      }}
      onSynced={onSynced}
      onClose={close}
    />
  ) : null

  return { openList, modal }
}

function ProgressManageModal({
  open,
  projectId,
  mode,
  entryId,
  onCreate,
  onEdit,
  onView,
  onBackToList,
  onSynced,
  onClose,
}: {
  open: boolean
  projectId: string
  mode: ProgressManageMode
  entryId: string | null
  onCreate: () => void
  onEdit: (entryId: string) => void
  onView: (entryId: string) => void
  onBackToList: () => void
  onSynced?: (percent: number) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const showingForm = mode === 'create' || mode === 'edit'
  const showingEntry = mode === 'edit' || mode === 'view'

  const entryQuery = useQuery({
    queryKey: ['project-progress-entry', projectId, entryId],
    enabled: open && showingEntry && Boolean(entryId),
    refetchInterval: (current) => {
      if (mode !== 'view') return false
      const status = current.state.data?.transcriptionStatus
      return status === projectProgressTranscriptionStatuses.PENDING ||
        status === projectProgressTranscriptionStatuses.PROCESSING
        ? 5000
        : false
    },
    queryFn: async () => {
      const { data } = await api.get<ProjectProgressEntry>(
        `/projects/${projectId}/progress/${entryId}`,
      )
      return data
    },
  })

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat) return
      if (document.querySelector('[data-confirm-toast], [role="listbox"], [role="menu"], .rmdp-wrapper')) {
        return
      }
      event.preventDefault()
      if (mode === 'list') onClose()
      else onBackToList()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [mode, onBackToList, onClose, open])

  if (!open) return null

  const title =
    mode === 'create'
      ? t('projectProgress.create')
      : mode === 'edit'
        ? t('projectProgress.edit')
        : mode === 'view'
          ? t('projectProgress.details')
          : t('projectProgress.manage')

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['project-progress', projectId] })
    await queryClient.invalidateQueries({ queryKey: ['project-progress-entry', projectId] })
    await queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    await queryClient.invalidateQueries({ queryKey: ['projects'] })
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-900/30 p-4"
      data-nested-dialog
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={t('common.close')}
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="progress-manage-title"
        className="relative z-10 flex max-h-[min(88vh,52rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-line bg-cream-50 shadow-xl"
      >
        <header className="relative shrink-0 overflow-hidden bg-gradient-to-e from-mint-50 via-white to-teal-50 px-5 py-4">
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]">
                <ClipboardList className="size-5" aria-hidden />
              </span>
              <h2 id="progress-manage-title" className="truncate text-sm font-semibold text-ink-900">
                {title}
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {mode === 'list' ? (
                <>
                  <ProgressQuickRecord projectId={projectId} />
                  <Button type="button" onClick={onCreate}>
                    <Plus className="size-4" aria-hidden />
                    {t('projectProgress.create')}
                  </Button>
                </>
              ) : null}
              <button
                type="button"
                className="cursor-pointer rounded-xl p-2 text-ink-500 hover:bg-white"
                onClick={onClose}
                aria-label={t('common.close')}
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {mode === 'list' ? (
            <ProjectProgressEntries
              projectId={projectId}
              embedded
              onView={onView}
              onEdit={onEdit}
              onDeleted={() => void refresh()}
            />
          ) : showingForm ? (
            entryQuery.isLoading && mode === 'edit' ? (
              <LoadingState />
            ) : mode === 'edit' && !entryQuery.data ? (
              <LoadingState />
            ) : (
              <ProjectProgressForm
                key={mode === 'edit' ? entryId ?? 'edit' : 'create'}
                embedded
                initial={mode === 'edit' ? entryQuery.data : undefined}
                onCancel={onBackToList}
                onSubmit={async (payload) => {
                  if (mode === 'edit' && entryId) {
                    await api.patch(`/projects/${projectId}/progress/${entryId}`, payload)
                    toast.success(t('projectProgress.updated'))
                  } else {
                    await api.post(`/projects/${projectId}/progress`, payload)
                    toast.success(t('projectProgress.created'))
                  }
                  if (payload.progressPercent != null) onSynced?.(payload.progressPercent)
                  await refresh()
                  onBackToList()
                }}
              />
            )
          ) : entryQuery.data ? (
            <ProgressEntryPreview
              entry={entryQuery.data}
              onEdit={() => {
                const current = entryQuery.data
                if (current) onEdit(current.id)
              }}
              onDeleted={() => {
                void refresh()
                onBackToList()
              }}
              onRetry={async () => {
                const current = entryQuery.data
                if (!current) return
                try {
                  await api.post(`/projects/${projectId}/progress/${current.id}/process`)
                  await entryQuery.refetch()
                } catch (error) {
                  toast.error(getApiErrorMessage(error, t('common.error')))
                }
              }}
            />
          ) : (
            <LoadingState />
          )}
        </div>
      </section>
    </div>,
    document.body,
  )
}

function ProgressEntryPreview({
  entry,
  onEdit,
  onDeleted,
  onRetry,
}: {
  entry: ProjectProgressEntry
  onEdit: () => void
  onDeleted: () => void
  onRetry: () => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { confirmDelete } = useConfirmDelete()
  const title = entryTitle(entry, entry.occurredAt)
  const pending =
    entry.transcriptionStatus === projectProgressTranscriptionStatuses.PENDING ||
    entry.transcriptionStatus === projectProgressTranscriptionStatuses.PROCESSING ||
    entry.transcriptionStatus === projectProgressTranscriptionStatuses.FAILED
  const canRetry =
    Boolean(entry.audioId) &&
    entry.transcriptionStatus !== projectProgressTranscriptionStatuses.READY

  return (
    <FormCard icon={ClipboardList} title={title} onDoubleClick={onEdit}>
      <div className="space-y-6 p-5 sm:p-6">
        <FormSectionTitle icon={ClipboardList}>{t('projectProgress.section')}</FormSectionTitle>
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
          <FormFactTile
            icon={CalendarRange}
            label={t('projectProgress.occurredAt')}
            value={<DateText value={entry.occurredAt} />}
            tone="teal"
          />
          <FormFactTile
            icon={Percent}
            label={t('projectProgress.progress')}
            value={<ProjectProgress value={entry.progressPercent} />}
            empty={entry.progressPercent == null}
            tone="mint"
          />
          <FormFactTile
            icon={Sparkles}
            label={t('projectProgress.transcriptionStatus')}
            value={<TranscriptionBadge value={entry.transcriptionStatus} />}
          />
          <FormFactTile
            icon={Mic}
            label={t('projectProgress.processingMode')}
            value={t(`projectProgress.modes.${entry.processingMode}`)}
          />
          <FormFactTile
            icon={ScrollText}
            label={t('projectProgress.body')}
            value={entry.body || '—'}
            empty={!entry.body}
            className="sm:col-span-2"
          />
          <FormFactTile
            icon={ScrollText}
            label={t('projectProgress.transcript')}
            value={entry.transcript || '—'}
            empty={!entry.transcript}
            className="sm:col-span-2"
          />
          <FormFactTile
            icon={Sparkles}
            label={t('projectProgress.summary')}
            value={entry.summary || '—'}
            empty={!entry.summary}
            className="sm:col-span-2"
          />
        </div>
        <FormSectionTitle icon={Mic}>{t('projectProgress.attachments')}</FormSectionTitle>
        <div className="space-y-4">
          {entry.audioId ? (
            <div className="rounded-2xl bg-cream-50 p-3 ring-1 ring-teal-100">
              <p className="mb-2 text-xs text-ink-500">
                {t('projectProgress.audio')}
                {entry.audio?.durationMs != null
                  ? ` · ${formatDuration(entry.audio.durationMs, locale)}`
                  : ''}
              </p>
              <FileAudio fileId={entry.audioId} className="w-full" />
            </div>
          ) : (
            <p className="text-sm text-ink-400">{t('projectProgress.audio')}: —</p>
          )}
          {entry.images.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {entry.images.map((item) => (
                <a key={item.id} href={getImageUrl(item.imageId)} target="_blank" rel="noreferrer">
                  <img
                    src={getImageUrl(item.imageId)}
                    alt=""
                    className="h-32 w-full rounded-2xl object-cover ring-1 ring-teal-100"
                  />
                </a>
              ))}
            </div>
          ) : null}
          {pending ? <p className="text-sm text-teal-700">{t('projectProgress.processing')}</p> : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={onEdit}>
              <Pencil className="size-4" aria-hidden />
              {t('common.edit')}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() =>
                confirmDelete({
                  message: t('projectProgress.confirmDelete'),
                  successMessage: t('projectProgress.deleted'),
                  path: `/projects/${entry.projectId}/progress/${entry.id}`,
                  queryKey: ['project-progress'],
                  onDeleted,
                })
              }
            >
              <Trash2 className="size-4" aria-hidden />
              {t('projectProgress.delete')}
            </Button>
          </div>
          {canRetry ? (
            <Button type="button" variant="soft" onClick={onRetry}>
              <RefreshCw className="size-4" aria-hidden />
              {t('projectProgress.retryProcess')}
            </Button>
          ) : null}
        </div>
      </div>
    </FormCard>
  )
}
