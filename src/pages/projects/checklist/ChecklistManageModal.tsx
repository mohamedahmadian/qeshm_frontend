import { ListChecks, Plus, X } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button, LoadingState } from '../../../components/ui/Form'
import { api } from '../../../lib/api'
import type { ProjectChecklistItem, ProjectChecklistSummary } from '../../../types/app'
import { ProjectChecklistBoard, useChecklistActions } from './ProjectChecklistBoard'
import { ProjectChecklistForm } from './ProjectChecklistForm'

export function useChecklistManage(projectId?: string, phaseId?: string) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ProjectChecklistItem | null>(null)
  const [creating, setCreating] = useState(false)

  const openList = useCallback(() => {
    setEditing(null)
    setCreating(false)
    setOpen(true)
  }, [])

  const openEdit = useCallback((item: ProjectChecklistItem) => {
    setCreating(false)
    setEditing(item)
    setOpen(true)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    setEditing(null)
    setCreating(false)
  }, [])

  const modal = projectId ? (
    <ChecklistManageModal
      open={open}
      projectId={projectId}
      phaseId={phaseId}
      editing={editing}
      creating={creating}
      onCreate={() => {
        setEditing(null)
        setCreating(true)
      }}
      onEdit={openEdit}
      onBackToList={() => {
        setEditing(null)
        setCreating(false)
      }}
      onClose={close}
    />
  ) : null

  return { openList, openEdit, modal }
}

function ChecklistManageModal({
  open,
  projectId,
  phaseId,
  editing,
  creating,
  onCreate,
  onEdit,
  onBackToList,
  onClose,
}: {
  open: boolean
  projectId: string
  phaseId?: string
  editing: ProjectChecklistItem | null
  creating: boolean
  onCreate: () => void
  onEdit: (item: ProjectChecklistItem) => void
  onBackToList: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const scopeKey = phaseId ?? 'project'
  const apiBase = phaseId
    ? `/projects/${projectId}/phases/${phaseId}/checklist`
    : `/projects/${projectId}/checklist`
  const showingForm = creating || Boolean(editing)
  const { pendingId, toggleItem, deleteItem } = useChecklistActions(projectId, apiBase)

  const itemsQuery = useQuery({
    queryKey: ['project-checklist', projectId, scopeKey, 'board'],
    enabled: open,
    queryFn: async () => {
      const { data } = await api.get<ProjectChecklistItem[]>(apiBase)
      return data
    },
  })
  const summaryQuery = useQuery({
    queryKey: ['project-checklist', projectId, scopeKey, 'summary'],
    enabled: open,
    queryFn: async () => {
      const { data } = await api.get<ProjectChecklistSummary>(`${apiBase}/summary`)
      return data
    },
  })

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat) return
      if (document.querySelector('[data-confirm-toast], [role="listbox"]')) return
      event.preventDefault()
      if (showingForm) onBackToList()
      else onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [onBackToList, onClose, open, showingForm])

  if (!open) return null

  const summary = summaryQuery.data
  const title = showingForm
    ? editing
      ? t('projectChecklist.edit')
      : t('projectChecklist.create')
    : phaseId
      ? t('projectChecklist.phaseTitle')
      : t('projectChecklist.title')

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['project-checklist', projectId] })
    await queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    await queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] })
    await queryClient.invalidateQueries({ queryKey: ['project-phase', projectId] })
    await queryClient.invalidateQueries({ queryKey: ['projects'] })
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink-900/30 p-4"
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
        aria-labelledby="checklist-manage-title"
        className="relative z-10 flex max-h-[min(88vh,46rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-line bg-cream-50 shadow-xl"
      >
        <header className="relative shrink-0 overflow-hidden bg-gradient-to-e from-mint-50 via-white to-teal-50 px-5 py-4">
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]">
                <ListChecks className="size-5" aria-hidden />
              </span>
              <h2 id="checklist-manage-title" className="truncate text-sm font-semibold text-ink-900">
                {title}
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {showingForm ? null : (
                <Button type="button" onClick={onCreate}>
                  <Plus className="size-4" aria-hidden />
                  {t('projectChecklist.create')}
                </Button>
              )}
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
          {showingForm ? (
            <ProjectChecklistForm
              key={editing?.id ?? 'create'}
              embedded
              initial={
                editing
                  ? {
                      title: editing.title,
                      weightPercent: editing.weightPercent,
                      isDone: editing.isDone,
                    }
                  : undefined
              }
              weightHint={
                phaseId ? t('projectChecklist.phaseWeightHint') : t('projectChecklist.weightHint')
              }
              onCancel={onBackToList}
              onSubmit={async (payload) => {
                if (editing) {
                  await api.patch(`${apiBase}/${editing.id}`, payload)
                  toast.success(t('projectChecklist.updated'))
                } else {
                  await api.post(apiBase, payload)
                  toast.success(t('projectChecklist.created'))
                }
                await refresh()
                onBackToList()
              }}
            />
          ) : itemsQuery.isLoading ? (
            <LoadingState />
          ) : (
            <ProjectChecklistBoard
              items={itemsQuery.data ?? []}
              progress={summary?.doneWeight ?? 0}
              allocated={summary?.allocatedWeight}
              remaining={summary?.remainingWeight}
              pendingId={pendingId}
              idPrefix={phaseId ? `phase-manage-${phaseId}` : 'project-manage'}
              onToggle={(item, isDone) => void toggleItem(item, isDone)}
              onDelete={deleteItem}
              onEdit={onEdit}
              empty={t('projectChecklist.empty')}
            />
          )}
        </div>
      </section>
    </div>,
    document.body,
  )
}
