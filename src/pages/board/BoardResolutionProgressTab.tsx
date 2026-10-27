import { CalendarRange, ClipboardList, FileText, Pencil, Percent, ScrollText, Tags, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { DateText } from '../../components/ui/DateText'
import {
  AppForm,
  Button,
  FormActions,
  FormField,
  fieldClassName,
} from '../../components/ui/Form'
import { FormEmptyHint, FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { api, getApiErrorMessage } from '../../lib/api'
import { formatNumber, todayIsoDate } from '../../lib/datetime'
import type { BoardResolutionProgressList, BoardResolutionProgressReport } from '../../types/app'

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function parseProgressAmount(value: string) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : NaN
}

export function BoardResolutionProgressTab({
  minutesId,
  resolutionId,
  readOnly = false,
}: {
  minutesId: string
  resolutionId: string
  readOnly?: boolean
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const queryClient = useQueryClient()
  const { confirmDelete } = useConfirmDelete()
  const queryKey = ['board-resolution-progress', minutesId, resolutionId]
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await api.get<BoardResolutionProgressList>(
        `/board/minutes/${minutesId}/resolutions/${resolutionId}/progress`,
      )
      return data
    },
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [reportedAt, setReportedAt] = useState(todayIsoDate())
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [body, setBody] = useState('')
  const [progressAmount, setProgressAmount] = useState('0')
  const [saving, setSaving] = useState(false)
  const items = query.data?.items ?? []
  const totalProgress = query.data?.totalProgress ?? 0

  function fillForm(row: BoardResolutionProgressReport) {
    setEditingId(row.id)
    setReportedAt(row.reportedAt)
    setTitle(row.title)
    setCategory(row.category ?? '')
    setBody(row.body ?? '')
    setProgressAmount(String(row.progressAmount))
  }

  function resetForm() {
    setEditingId(null)
    setReportedAt(todayIsoDate())
    setTitle('')
    setCategory('')
    setBody('')
    setProgressAmount('0')
  }

  async function submit() {
    if (!reportedAt) {
      toast.error(t('boardResolutions.progressDateRequired'))
      return
    }
    if (!title.trim()) {
      toast.error(t('boardResolutions.progressTitleRequired'))
      return
    }
    const amount = parseProgressAmount(progressAmount)
    if (!Number.isFinite(amount) || amount < 0 || amount > 100) {
      toast.error(t('boardResolutions.progressAmountInvalid'))
      return
    }
    const payload = {
      reportedAt,
      title: title.trim(),
      category: emptyToNull(category),
      body: emptyToNull(body),
      progressAmount: amount,
    }
    setSaving(true)
    try {
      if (editingId) {
        await api.patch(
          `/board/minutes/${minutesId}/resolutions/${resolutionId}/progress/${editingId}`,
          payload,
        )
        toast.success(t('boardResolutions.progressUpdated'))
      } else {
        await api.post(`/board/minutes/${minutesId}/resolutions/${resolutionId}/progress`, payload)
        toast.success(t('boardResolutions.progressCreated'))
      }
      resetForm()
      await queryClient.invalidateQueries({ queryKey })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={formCardBodyClassName}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FormSectionTitle icon={ClipboardList} className="mb-0">
          {t('boardResolutions.progressTitle')}
        </FormSectionTitle>
        <p className="rounded-2xl bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-800 ring-1 ring-teal-100">
          {t('boardResolutions.progressTotal', { value: formatNumber(totalProgress, locale) })}
        </p>
      </div>
      {readOnly ? null : (
        <AppForm onSubmit={() => void submit()} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField icon={CalendarRange} label={t('boardResolutions.progressDate')}>
              <PersianDateField value={reportedAt} onChange={(value) => setReportedAt(value ?? '')} />
            </FormField>
            <FormField icon={FileText} label={t('boardResolutions.progressReportTitle')} htmlFor="resolution-progress-title">
              <input
                id="resolution-progress-title"
                required
                className={fieldClassName}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </FormField>
            <FormField icon={Tags} label={t('boardResolutions.progressCategory')} htmlFor="resolution-progress-category">
              <input
                id="resolution-progress-category"
                className={fieldClassName}
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder={t('boardResolutions.progressCategoryPlaceholder')}
              />
            </FormField>
          </div>
          <FormField icon={ScrollText} label={t('boardResolutions.progressBody')} htmlFor="resolution-progress-body">
            <textarea
              id="resolution-progress-body"
              className={`${fieldClassName} min-h-24`}
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </FormField>
          <FormField icon={Percent} label={t('boardResolutions.progressAmount')} htmlFor="resolution-progress-amount">
            <input
              id="resolution-progress-amount"
              type="number"
              min={0}
              max={100}
              className={fieldClassName}
              value={progressAmount}
              onChange={(event) => setProgressAmount(event.target.value)}
            />
          </FormField>
          <FormActions
            submitLabel={editingId ? t('boardResolutions.progressSave') : t('boardResolutions.progressCreate')}
            cancelLabel={editingId ? t('common.cancel') : undefined}
            onCancel={editingId ? resetForm : undefined}
            submitting={saving}
            headerIcons={false}
          />
        </AppForm>
      )}
      {items.length ? (
        <div className="grid gap-2">
          {items.map((row) => (
            <article
              key={row.id}
              className="rounded-2xl border border-teal-100 bg-cream-50/70 p-3 sm:p-4"
            >
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-ink-900">{row.title}</p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    <DateText value={row.reportedAt} />
                    {row.category ? ` · ${row.category}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-xl bg-white px-2.5 py-1 text-sm font-semibold text-teal-700 ring-1 ring-teal-100">
                    {formatNumber(row.progressAmount, locale)}٪
                  </span>
                  {readOnly ? null : (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        icon
                        aria-label={t('common.edit')}
                        title={t('common.edit')}
                        onClick={() => fillForm(row)}
                      >
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        icon
                        aria-label={t('common.delete')}
                        title={t('common.delete')}
                        onClick={() =>
                          confirmDelete({
                            message: t('boardResolutions.progressConfirmDelete'),
                            successMessage: t('boardResolutions.progressDeleted'),
                            path: `/board/minutes/${minutesId}/resolutions/${resolutionId}/progress/${row.id}`,
                            queryKey,
                            onDeleted: () => {
                              if (editingId === row.id) resetForm()
                            },
                          })
                        }
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {row.body ? (
                <p className="whitespace-pre-wrap text-sm leading-6 text-ink-700">{row.body}</p>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <FormEmptyHint>{t('boardResolutions.progressEmpty')}</FormEmptyHint>
      )}
    </div>
  )
}
