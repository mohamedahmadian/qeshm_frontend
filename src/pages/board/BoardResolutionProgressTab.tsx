import {
  CalendarRange,
  ClipboardList,
  FileBadge2,
  FileText,
  Handshake,
  ListChecks,
  Percent,
  Plus,
  ScrollText,
  Tags,
  X,
} from 'lucide-react'
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
import { FormCard, FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import {
  ActionsTh,
  EntityRowActions,
  TableCard,
  actionsColClassName,
} from '../../components/ui/ListControls'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { api, getApiErrorMessage } from '../../lib/api'
import { formatNumber, todayIsoDate } from '../../lib/datetime'
import type {
  BoardResolutionContractList,
  BoardResolutionProgressList,
  BoardResolutionProgressReport,
} from '../../types/app'
import { BoardTabFormModal } from './BoardTabFormModal'

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function parseProgressAmount(value: string) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : NaN
}

function emptyProgressForm() {
  return {
    reportedAt: todayIsoDate(),
    title: '',
    category: '',
    body: '',
    actionsDone: '',
    nextPlan: '',
    blockers: '',
    needs: '',
    contractId: '',
    progressAmount: '0',
  }
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
  const contracts = useQuery({
    queryKey: ['board-resolution-contracts', minutesId, resolutionId],
    queryFn: async () => {
      const { data } = await api.get<BoardResolutionContractList>(
        `/board/minutes/${minutesId}/resolutions/${resolutionId}/contracts`,
      )
      return data
    },
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyProgressForm)
  const [saving, setSaving] = useState(false)
  const items = query.data?.items ?? []
  const totalProgress = query.data?.totalProgress ?? 0
  const selectedContract = (contracts.data?.items ?? []).find((item) => item.id === form.contractId)

  function patchForm(patch: Partial<typeof form>) {
    setForm((current) => ({ ...current, ...patch }))
  }

  function closeModal() {
    setModalOpen(false)
    setEditingId(null)
    setForm(emptyProgressForm())
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyProgressForm())
    setModalOpen(true)
  }

  function openEdit(row: BoardResolutionProgressReport) {
    setEditingId(row.id)
    setForm({
      reportedAt: row.reportedAt,
      title: row.title,
      category: row.category ?? '',
      body: row.body ?? '',
      actionsDone: row.actionsDone ?? '',
      nextPlan: row.nextPlan ?? '',
      blockers: row.blockers ?? '',
      needs: row.needs ?? '',
      contractId: row.contractId ?? '',
      progressAmount: String(row.progressAmount),
    })
    setModalOpen(true)
  }

  async function submit() {
    if (!form.reportedAt) {
      toast.error(t('boardResolutions.progressDateRequired'))
      return
    }
    if (!form.title.trim()) {
      toast.error(t('boardResolutions.progressTitleRequired'))
      return
    }
    const amount = parseProgressAmount(form.progressAmount)
    if (!Number.isFinite(amount) || amount < 0 || amount > 100) {
      toast.error(t('boardResolutions.progressAmountInvalid'))
      return
    }
    const payload = {
      reportedAt: form.reportedAt,
      title: form.title.trim(),
      category: emptyToNull(form.category),
      body: emptyToNull(form.body),
      actionsDone: emptyToNull(form.actionsDone),
      nextPlan: emptyToNull(form.nextPlan),
      blockers: emptyToNull(form.blockers),
      needs: emptyToNull(form.needs),
      contractId: form.contractId || null,
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
      closeModal()
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
        <div className="flex flex-wrap items-center gap-2">
          <p className="rounded-2xl bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-800 ring-1 ring-teal-100">
            {t('boardResolutions.progressTotal', { value: formatNumber(totalProgress, locale) })}
          </p>
          {readOnly ? null : (
            <Button type="button" onClick={openCreate}>
              <Plus className="size-4" aria-hidden />
              {t('boardResolutions.progressAdd')}
            </Button>
          )}
        </div>
      </div>
      <TableCard
        loading={query.isLoading}
        empty={t('boardResolutions.progressEmpty')}
        hasRows={items.length > 0}
        rowClick={!readOnly}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{t('boardResolutions.progressReportTitle')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('boardResolutions.progressDate')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('boardResolutions.progressCategory')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('boardResolutions.progressContract')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('boardResolutions.progressAmount')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('stakeholders.author')}</th>
              {readOnly ? null : <ActionsTh />}
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="px-4 py-3">{row.title}</td>
                <td className="px-4 py-3">
                  <DateText value={row.reportedAt} />
                </td>
                <td className="px-4 py-3">{row.category || '—'}</td>
                <td className="px-4 py-3">
                  {row.contract?.title
                    ? row.contractor?.name
                      ? `${row.contract.title} · ${row.contractor.name}`
                      : row.contract.title
                    : '—'}
                </td>
                <td className="px-4 py-3">{formatNumber(row.progressAmount, locale)}٪</td>
                <td className="px-4 py-3">{row.createdBy?.fullName || '—'}</td>
                {readOnly ? null : (
                  <td className={actionsColClassName}>
                    <EntityRowActions
                      showView={false}
                      onEdit={() => openEdit(row)}
                      onDelete={() =>
                        confirmDelete({
                          message: t('boardResolutions.progressConfirmDelete'),
                          successMessage: t('boardResolutions.progressDeleted'),
                          path: `/board/minutes/${minutesId}/resolutions/${resolutionId}/progress/${row.id}`,
                          queryKey,
                          onDeleted: () => {
                            if (editingId === row.id) closeModal()
                          },
                        })
                      }
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
      {readOnly ? null : (
        <BoardTabFormModal open={modalOpen} labelledBy="resolution-progress-modal-title" onClose={closeModal}>
          <FormCard
            icon={ClipboardList}
            title={
              <span id="resolution-progress-modal-title">
                {editingId ? t('boardResolutions.progressEdit') : t('boardResolutions.progressCreate')}
              </span>
            }
            subtitle={t('boardResolutions.progressSubtitle')}
            onDoubleClick={() => undefined}
            action={
              <button
                type="button"
                className="cursor-pointer rounded-xl p-2 text-ink-500 hover:bg-white"
                onClick={closeModal}
                aria-label={t('common.close')}
              >
                <X className="size-4" />
              </button>
            }
          >
            <AppForm onSubmit={() => void submit()} className={formCardBodyClassName} autoFocusFirst>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField icon={CalendarRange} label={t('boardResolutions.progressDate')}>
                  <PersianDateField
                    value={form.reportedAt}
                    onChange={(value) => patchForm({ reportedAt: value ?? '' })}
                  />
                </FormField>
                <FormField
                  icon={FileText}
                  label={t('boardResolutions.progressReportTitle')}
                  htmlFor="resolution-progress-title"
                >
                  <input
                    id="resolution-progress-title"
                    required
                    className={fieldClassName}
                    value={form.title}
                    onChange={(event) => patchForm({ title: event.target.value })}
                  />
                </FormField>
                <FormField
                  icon={Tags}
                  label={t('boardResolutions.progressCategory')}
                  htmlFor="resolution-progress-category"
                >
                  <input
                    id="resolution-progress-category"
                    className={fieldClassName}
                    value={form.category}
                    onChange={(event) => patchForm({ category: event.target.value })}
                    placeholder={t('boardResolutions.progressCategoryPlaceholder')}
                  />
                </FormField>
              </div>
              <FormField icon={FileBadge2} label={t('boardResolutions.progressContract')}>
                <SearchSelect
                  value={form.contractId}
                  onChange={(value) => patchForm({ contractId: value })}
                  placeholder={t('boardResolutions.progressSelectContract')}
                  options={[
                    { value: '', label: t('boardResolutions.progressSelectContract') },
                    ...(contracts.data?.items ?? []).map((item) => ({
                      value: item.id,
                      label: item.contractor?.name ? `${item.title} · ${item.contractor.name}` : item.title,
                    })),
                  ]}
                />
                <p className="mt-1.5 text-xs leading-6 text-ink-500">{t('boardResolutions.progressOnBehalfHint')}</p>
                {selectedContract?.contractor?.name ? (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-teal-700">
                    <Handshake className="size-3.5" aria-hidden />
                    {t('boardResolutions.contractContractor')}: {selectedContract.contractor.name}
                  </p>
                ) : null}
              </FormField>
              <FormField icon={ScrollText} label={t('boardResolutions.progressBody')} htmlFor="resolution-progress-body">
                <textarea
                  id="resolution-progress-body"
                  className={`${fieldClassName} min-h-24`}
                  value={form.body}
                  onChange={(event) => patchForm({ body: event.target.value })}
                />
              </FormField>
              <FormField icon={ListChecks} label={t('stakeholders.actionsDone')} htmlFor="resolution-progress-actions">
                <textarea
                  id="resolution-progress-actions"
                  className={`${fieldClassName} min-h-24`}
                  value={form.actionsDone}
                  onChange={(event) => patchForm({ actionsDone: event.target.value })}
                />
              </FormField>
              <FormField icon={ScrollText} label={t('stakeholders.nextPlan')} htmlFor="resolution-progress-next">
                <textarea
                  id="resolution-progress-next"
                  className={`${fieldClassName} min-h-24`}
                  value={form.nextPlan}
                  onChange={(event) => patchForm({ nextPlan: event.target.value })}
                />
              </FormField>
              <FormField icon={ScrollText} label={t('stakeholders.blockers')} htmlFor="resolution-progress-blockers">
                <textarea
                  id="resolution-progress-blockers"
                  className={`${fieldClassName} min-h-24`}
                  value={form.blockers}
                  onChange={(event) => patchForm({ blockers: event.target.value })}
                />
              </FormField>
              <FormField icon={ScrollText} label={t('stakeholders.needs')} htmlFor="resolution-progress-needs">
                <textarea
                  id="resolution-progress-needs"
                  className={`${fieldClassName} min-h-20`}
                  value={form.needs}
                  onChange={(event) => patchForm({ needs: event.target.value })}
                />
              </FormField>
              <FormField icon={Percent} label={t('boardResolutions.progressAmount')} htmlFor="resolution-progress-amount">
                <input
                  id="resolution-progress-amount"
                  type="number"
                  min={0}
                  max={100}
                  className={fieldClassName}
                  value={form.progressAmount}
                  onChange={(event) => patchForm({ progressAmount: event.target.value })}
                />
              </FormField>
              <FormActions
                submitLabel={editingId ? t('boardResolutions.progressSave') : t('boardResolutions.progressCreate')}
                cancelLabel={t('common.cancel')}
                onCancel={closeModal}
                submitting={saving}
                headerIcons={false}
              />
            </AppForm>
          </FormCard>
        </BoardTabFormModal>
      )}
    </div>
  )
}
