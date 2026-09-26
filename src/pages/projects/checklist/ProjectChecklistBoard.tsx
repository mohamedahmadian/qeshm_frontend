import { ListChecks, Pencil, Trash2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { CheckboxField } from '../../../components/ui/CheckboxField'
import { Button, LoadingState } from '../../../components/ui/Form'
import { FormCard } from '../../../components/ui/FormLayout'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { api, getApiErrorMessage } from '../../../lib/api'
import { formatNumber } from '../../../lib/datetime'
import type { ProjectChecklistItem, ProjectChecklistSummary } from '../../../types/app'

export function useChecklistActions(projectId: string, apiBase: string) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { confirmDelete } = useConfirmDelete()
  const [pendingId, setPendingId] = useState<string | null>(null)

  async function toggleItem(item: ProjectChecklistItem, isDone: boolean) {
    if (isDone === item.isDone || !apiBase) return
    setPendingId(item.id)
    try {
      await api.patch(`${apiBase}/${item.id}`, { isDone })
      await queryClient.invalidateQueries({ queryKey: ['project-checklist', projectId] })
      await queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      await queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] })
      await queryClient.invalidateQueries({ queryKey: ['project-phase', projectId] })
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setPendingId(null)
    }
  }

  function deleteItem(item: ProjectChecklistItem) {
    confirmDelete({
      message: t('projectChecklist.confirmDelete'),
      successMessage: t('projectChecklist.deleted'),
      path: `${apiBase}/${item.id}`,
      queryKey: ['project-checklist', projectId],
      onDeleted: () => {
        void queryClient.invalidateQueries({ queryKey: ['project', projectId] })
        void queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] })
        void queryClient.invalidateQueries({ queryKey: ['project-phase', projectId] })
        void queryClient.invalidateQueries({ queryKey: ['projects'] })
      },
    })
  }

  return { pendingId, toggleItem, deleteItem }
}

export function ChecklistProgressChart({
  value,
  allocated,
  remaining,
}: {
  value: number
  allocated?: number
  remaining?: number
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const pct = Math.min(100, Math.max(0, value))
  return (
    <section className="rounded-[22px] border border-teal-100 bg-white p-4 shadow-[0_10px_30px_rgba(20,40,40,0.05)] sm:p-5">
      <div className="flex items-center gap-4">
        <div
          className="relative size-24 shrink-0 rounded-full p-1.5"
          style={{
            background: `conic-gradient(#2ebdb6 ${pct * 3.6}deg, #e7f6f4 0deg)`,
          }}
          role="img"
          aria-label={`${t('projects.progress')} ${formatNumber(pct, locale)}٪`}
        >
          <div className="flex size-full items-center justify-center rounded-full bg-white">
            <span className="text-lg font-bold tabular-nums text-ink-900">
              {formatNumber(pct, locale)}٪
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink-800">{t('projects.progress')}</p>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-cream-100">
            <div
              className="h-full rounded-full bg-gradient-to-e from-teal-500 to-mint-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          {allocated != null && remaining != null ? (
            <p className="mt-2 text-xs leading-6 text-ink-500">
              {t('projectChecklist.allocated')} {formatNumber(allocated, locale)}٪
              <span className="px-1.5 text-ink-300" aria-hidden>
                ·
              </span>
              {t('projectChecklist.remaining')} {formatNumber(remaining, locale)}٪
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export function ProjectChecklistBoard({
  items,
  progress,
  allocated,
  remaining,
  pendingId,
  listPath,
  onToggle,
  onDelete,
  empty,
}: {
  items: ProjectChecklistItem[]
  progress: number
  allocated?: number
  remaining?: number
  pendingId: string | null
  listPath: string
  onToggle: (item: ProjectChecklistItem, isDone: boolean) => void
  onDelete: (item: ProjectChecklistItem) => void
  empty: string
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  return (
    <div className="space-y-4">
      <ChecklistProgressChart value={progress} allocated={allocated} remaining={remaining} />
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-teal-200 bg-white px-4 py-10 text-center text-sm text-ink-500">
          {empty}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-2xl border border-teal-100 bg-white px-3 py-2.5 shadow-[0_6px_18px_rgba(20,40,40,0.04)]"
            >
              <CheckboxField
                compact
                id={`checklist-${item.id}`}
                checked={item.isDone}
                disabled={pendingId === item.id}
                label={item.title}
                onChange={(next) => onToggle(item, next)}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-sm ${
                    item.isDone
                      ? 'text-ink-400 line-through decoration-ink-300/80 decoration-2'
                      : 'text-ink-900'
                  }`}
                >
                  {item.title}
                </p>
                <p className="text-xs tabular-nums text-ink-500">
                  {formatNumber(item.weightPercent, locale)}٪
                </p>
              </div>
              <div className="ms-auto flex shrink-0 items-center gap-1">
                <Link to={`${listPath}/${item.id}/edit`} aria-label={t('common.edit')} title={t('common.edit')}>
                  <Button type="button" variant="ghost" icon>
                    <Pencil className="size-4" aria-hidden />
                  </Button>
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  icon
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  aria-label={t('common.delete')}
                  title={t('common.delete')}
                  onClick={() => onDelete(item)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function ProjectDetailChecklist({ projectId }: { projectId: string }) {
  const { t } = useTranslation()
  const itemsQuery = useQuery({
    queryKey: ['project-checklist', projectId, 'project', 'board'],
    queryFn: async () => {
      const { data } = await api.get<ProjectChecklistItem[]>(`/projects/${projectId}/checklist`)
      return data
    },
  })
  const summaryQuery = useQuery({
    queryKey: ['project-checklist', projectId, 'project', 'summary'],
    queryFn: async () => {
      const { data } = await api.get<ProjectChecklistSummary>(
        `/projects/${projectId}/checklist/summary`,
      )
      return data
    },
  })
  const { pendingId, toggleItem, deleteItem } = useChecklistActions(
    projectId,
    `/projects/${projectId}/checklist`,
  )
  const summary = summaryQuery.data
  return (
    <FormCard
      icon={ListChecks}
      title={t('projectChecklist.title')}
      className="mt-6"
      onDoubleClick={() => undefined}
    >
      <div className="space-y-4 p-5 sm:p-6">
        {itemsQuery.isLoading ? (
          <LoadingState />
        ) : (
          <ProjectChecklistBoard
            items={itemsQuery.data ?? []}
            progress={summary?.doneWeight ?? 0}
            allocated={summary?.allocatedWeight}
            remaining={summary?.remainingWeight}
            pendingId={pendingId}
            listPath={`/projects/${projectId}/checklist`}
            onToggle={(item, isDone) => void toggleItem(item, isDone)}
            onDelete={deleteItem}
            empty={t('projectChecklist.empty')}
          />
        )}
      </div>
    </FormCard>
  )
}
