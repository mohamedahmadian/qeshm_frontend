import {
  CalendarRange,
  Clock,
  Download,
  FileBadge2,
  FileText,
  Handshake,
  Hash,
  Paperclip,
  Plus,
  ScrollText,
  Stamp,
  Tags,
  Trash2,
  UserRound,
  Wallet,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FileDropField } from '../../components/ui/FileDropField'
import { FileName } from '../../components/ui/FileName'
import {
  AppForm,
  Button,
  FormActions,
  FormField,
  fieldClassName,
} from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { api, getApiErrorMessage, getFileUrl } from '../../lib/api'
import {
  boardResolutionContractKindList,
  boardResolutionContractKinds,
  boardResolutionContractStatusList,
  type BoardResolutionContract,
  type BoardResolutionContractKind,
  type BoardResolutionContractStatus,
  type ProjectContractor,
} from '../../types/app'
import { BoardTabFormModal } from './BoardTabFormModal'
import { ContractorQuickCreateModal } from './ContractorQuickCreateModal'

const CONTRACT_ACCEPT =
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt,.csv,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const MAX_CONTRACT_BYTES = 10 * 1024 * 1024

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function parseOptionalAmount(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

function emptyForm() {
  return {
    title: '',
    contractNo: '',
    contractorId: '',
    kind: '' as BoardResolutionContractKind | '',
    kindOther: '',
    amount: '',
    signedAt: '',
    duration: '',
    startDate: '',
    endDate: '',
    status: '' as BoardResolutionContractStatus | '',
    paidAmount: '',
    supervisor: '',
    notes: '',
  }
}

function formFromContract(row: BoardResolutionContract) {
  return {
    title: row.title,
    contractNo: row.contractNo ?? '',
    contractorId: row.contractorId ?? '',
    kind: row.kind ?? ('' as BoardResolutionContractKind | ''),
    kindOther: row.kindOther ?? '',
    amount: row.amount == null ? '' : String(row.amount),
    signedAt: row.signedAt ?? '',
    duration: row.duration ?? '',
    startDate: row.startDate ?? '',
    endDate: row.endDate ?? '',
    status: row.status ?? ('' as BoardResolutionContractStatus | ''),
    paidAmount: row.paidAmount == null ? '' : String(row.paidAmount),
    supervisor: row.supervisor ?? '',
    notes: row.notes ?? '',
  }
}

export function BoardResolutionContractFormModal({
  open,
  minutesId,
  resolutionId,
  initial,
  overlayClassName,
  onClose,
  onSaved,
}: {
  open: boolean
  minutesId: string
  resolutionId: string
  initial?: BoardResolutionContract | null
  overlayClassName?: string
  onClose: () => void
  onSaved?: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const editingId = initial?.id ?? null
  const [form, setForm] = useState(emptyForm)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [existingFile, setExistingFile] = useState<BoardResolutionContract['file']>(null)
  const [removeExistingFile, setRemoveExistingFile] = useState(false)
  const [fileNonce, setFileNonce] = useState(0)
  const [saving, setSaving] = useState(false)
  const [addContractorOpen, setAddContractorOpen] = useState(false)
  const contractors = useQuery({
    queryKey: ['contractors', 'lookup'],
    enabled: open,
    queryFn: async () => {
      const { data } = await api.get<ProjectContractor[] | { items: ProjectContractor[] }>('/contractors')
      return Array.isArray(data) ? data : data.items
    },
  })

  useEffect(() => {
    if (!open) return
    setForm(initial ? formFromContract(initial) : emptyForm())
    setPendingFile(null)
    setExistingFile(initial?.file ?? null)
    setRemoveExistingFile(false)
    setFileNonce((value) => value + 1)
    setAddContractorOpen(false)
  }, [initial, open])

  function patchForm(patch: Partial<typeof form>) {
    setForm((current) => ({ ...current, ...patch }))
  }

  async function uploadFile(file: File) {
    const body = new FormData()
    body.append('file', file)
    const { data } = await api.post<{ id: string }>('/files/documents', body)
    return data.id
  }

  async function submit() {
    if (!form.title.trim()) {
      toast.error(t('boardResolutions.contractTitleRequired'))
      return
    }
    if (form.kind === boardResolutionContractKinds.OTHER && !form.kindOther.trim()) {
      toast.error(t('boardResolutions.contractKindOtherRequired'))
      return
    }
    const amount = parseOptionalAmount(form.amount)
    if (Number.isNaN(amount) || (amount != null && amount < 0)) {
      toast.error(t('boardResolutions.contractAmountInvalid'))
      return
    }
    const paidAmount = parseOptionalAmount(form.paidAmount)
    if (Number.isNaN(paidAmount) || (paidAmount != null && paidAmount < 0)) {
      toast.error(t('boardResolutions.contractPaidAmountInvalid'))
      return
    }
    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      toast.error(t('boardResolutions.contractDateRangeInvalid'))
      return
    }
    setSaving(true)
    try {
      let fileId: string | null | undefined
      if (pendingFile) {
        fileId = await uploadFile(pendingFile)
      } else if (editingId && removeExistingFile) {
        fileId = null
      }
      const payload = {
        title: form.title.trim(),
        contractNo: emptyToNull(form.contractNo),
        contractorId: form.contractorId || null,
        kind: form.kind || null,
        kindOther: form.kind === boardResolutionContractKinds.OTHER ? emptyToNull(form.kindOther) : null,
        amount,
        signedAt: form.signedAt || null,
        duration: emptyToNull(form.duration),
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        status: form.status || null,
        paidAmount,
        supervisor: emptyToNull(form.supervisor),
        notes: emptyToNull(form.notes),
        ...(fileId !== undefined ? { fileId } : {}),
      }
      if (editingId) {
        await api.patch(
          `/board/minutes/${minutesId}/resolutions/${resolutionId}/contracts/${editingId}`,
          payload,
        )
        toast.success(t('boardResolutions.contractUpdated'))
      } else {
        await api.post(`/board/minutes/${minutesId}/resolutions/${resolutionId}/contracts`, payload)
        toast.success(t('boardResolutions.contractCreated'))
      }
      onClose()
      onSaved?.()
      await queryClient.invalidateQueries({ queryKey: ['board-resolution-contracts', minutesId, resolutionId] })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <BoardTabFormModal
        open={open}
        labelledBy="resolution-contract-modal-title"
        overlayClassName={overlayClassName}
        onClose={onClose}
      >
        <FormCard
          icon={FileBadge2}
          title={
            <span id="resolution-contract-modal-title">
              {editingId ? t('boardResolutions.contractEdit') : t('boardResolutions.contractCreate')}
            </span>
          }
          subtitle={t('boardResolutions.contractsTitle')}
          onDoubleClick={() => undefined}
          action={
            <button
              type="button"
              className="cursor-pointer rounded-xl p-2 text-ink-500 hover:bg-white"
              onClick={onClose}
              aria-label={t('common.close')}
            >
              <X className="size-4" />
            </button>
          }
        >
          <AppForm onSubmit={() => void submit()} className={formCardBodyClassName} autoFocusFirst>
            <FormField icon={FileText} label={t('boardResolutions.contractTitleField')} htmlFor="resolution-contract-title">
              <input
                id="resolution-contract-title"
                required
                className={fieldClassName}
                value={form.title}
                onChange={(event) => patchForm({ title: event.target.value })}
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField icon={Hash} label={t('boardResolutions.contractNo')} htmlFor="resolution-contract-no">
                <input
                  id="resolution-contract-no"
                  className={fieldClassName}
                  value={form.contractNo}
                  onChange={(event) => patchForm({ contractNo: event.target.value })}
                />
              </FormField>
              <FormField
                icon={Handshake}
                label={t('boardResolutions.contractContractor')}
                htmlFor="resolution-contract-contractor"
              >
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <SearchSelect
                      id="resolution-contract-contractor"
                      value={form.contractorId}
                      onChange={(value) => patchForm({ contractorId: value })}
                      placeholder={t('boardResolutions.selectContractor')}
                      options={[
                        { value: '', label: t('boardResolutions.selectContractor') },
                        ...(contractors.data ?? []).map((item) => ({
                          value: item.id,
                          label: item.name,
                        })),
                      ]}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    icon
                    aria-label={t('boardResolutions.addContractor')}
                    title={t('boardResolutions.addContractor')}
                    onClick={() => setAddContractorOpen(true)}
                  >
                    <Plus className="size-4" aria-hidden />
                  </Button>
                </div>
              </FormField>
              <FormField icon={Tags} label={t('boardResolutions.contractKind')}>
                <SearchSelect
                  value={form.kind}
                  onChange={(value) =>
                    patchForm({
                      kind: value as BoardResolutionContractKind | '',
                      kindOther: value === boardResolutionContractKinds.OTHER ? form.kindOther : '',
                    })
                  }
                  placeholder={t('boardResolutions.contractSelectOptional')}
                  options={[
                    { value: '', label: t('boardResolutions.contractSelectOptional') },
                    ...boardResolutionContractKindList.map((item) => ({
                      value: item,
                      label: t(`boardResolutions.contractKinds.${item}`),
                      keywords: t(`boardResolutions.contractKindHints.${item}`),
                    })),
                  ]}
                />
              </FormField>
              <FormField icon={Stamp} label={t('boardResolutions.contractStatus')}>
                <SearchSelect
                  value={form.status}
                  onChange={(value) => patchForm({ status: value as BoardResolutionContractStatus | '' })}
                  placeholder={t('boardResolutions.contractSelectOptional')}
                  options={[
                    { value: '', label: t('boardResolutions.contractSelectOptional') },
                    ...boardResolutionContractStatusList.map((item) => ({
                      value: item,
                      label: t(`boardResolutions.contractStatuses.${item}`),
                    })),
                  ]}
                />
              </FormField>
              {form.kind === boardResolutionContractKinds.OTHER ? (
                <FormField
                  icon={Tags}
                  label={t('boardResolutions.contractKindOther')}
                  htmlFor="resolution-contract-kind-other"
                >
                  <input
                    id="resolution-contract-kind-other"
                    className={fieldClassName}
                    value={form.kindOther}
                    onChange={(event) => patchForm({ kindOther: event.target.value })}
                  />
                </FormField>
              ) : null}
              <FormField icon={Wallet} label={t('boardResolutions.contractAmount')} htmlFor="resolution-contract-amount">
                <input
                  id="resolution-contract-amount"
                  type="number"
                  min={0}
                  className={fieldClassName}
                  value={form.amount}
                  onChange={(event) => patchForm({ amount: event.target.value })}
                />
              </FormField>
              <FormField icon={Wallet} label={t('boardResolutions.contractPaidAmount')} htmlFor="resolution-contract-paid">
                <input
                  id="resolution-contract-paid"
                  type="number"
                  min={0}
                  className={fieldClassName}
                  value={form.paidAmount}
                  onChange={(event) => patchForm({ paidAmount: event.target.value })}
                />
              </FormField>
              <FormField icon={CalendarRange} label={t('boardResolutions.contractSignedAt')}>
                <PersianDateField value={form.signedAt} onChange={(value) => patchForm({ signedAt: value ?? '' })} />
              </FormField>
              <FormField icon={Clock} label={t('boardResolutions.contractDuration')} htmlFor="resolution-contract-duration">
                <input
                  id="resolution-contract-duration"
                  className={fieldClassName}
                  value={form.duration}
                  onChange={(event) => patchForm({ duration: event.target.value })}
                  placeholder={t('boardResolutions.contractDurationPlaceholder')}
                />
              </FormField>
              <FormField icon={CalendarRange} label={t('boardResolutions.contractStartDate')}>
                <PersianDateField value={form.startDate} onChange={(value) => patchForm({ startDate: value ?? '' })} />
              </FormField>
              <FormField icon={CalendarRange} label={t('boardResolutions.contractEndDate')}>
                <PersianDateField value={form.endDate} onChange={(value) => patchForm({ endDate: value ?? '' })} />
              </FormField>
              <FormField
                icon={UserRound}
                label={t('boardResolutions.contractSupervisor')}
                htmlFor="resolution-contract-supervisor"
              >
                <input
                  id="resolution-contract-supervisor"
                  className={fieldClassName}
                  value={form.supervisor}
                  onChange={(event) => patchForm({ supervisor: event.target.value })}
                />
              </FormField>
            </div>
            <FormField icon={Paperclip} label={t('boardResolutions.contractFile')}>
              <div className="space-y-2">
                {existingFile && !removeExistingFile && !pendingFile ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm text-ink-700">
                      <FileName>{existingFile.originalName || existingFile.id}</FileName>
                    </p>
                    <a href={getFileUrl(existingFile.id)} target="_blank" rel="noreferrer">
                      <Button type="button" variant="ghost">
                        <Download className="size-4" aria-hidden />
                        {t('boardResolutions.contractDownload')}
                      </Button>
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setRemoveExistingFile(true)
                        setExistingFile(null)
                      }}
                    >
                      <Trash2 className="size-4" aria-hidden />
                      {t('boardResolutions.contractRemoveFile')}
                    </Button>
                  </div>
                ) : null}
                <p className="text-xs leading-6 text-ink-500">{t('boardResolutions.contractFileHint')}</p>
                <FileDropField
                  key={`${editingId ?? 'new'}-${fileNonce}`}
                  accept={CONTRACT_ACCEPT}
                  allowCamera={false}
                  maxBytes={MAX_CONTRACT_BYTES}
                  hideLocalPreview
                  onFile={setPendingFile}
                  onClear={() => setPendingFile(null)}
                />
              </div>
            </FormField>
            <FormField icon={ScrollText} label={t('boardResolutions.contractNotes')} htmlFor="resolution-contract-notes">
              <textarea
                id="resolution-contract-notes"
                className={`${fieldClassName} min-h-24`}
                value={form.notes}
                onChange={(event) => patchForm({ notes: event.target.value })}
              />
            </FormField>
            <FormActions
              submitLabel={editingId ? t('boardResolutions.contractSave') : t('boardResolutions.contractCreate')}
              cancelLabel={t('common.cancel')}
              onCancel={onClose}
              submitting={saving}
              headerIcons={false}
            />
          </AppForm>
        </FormCard>
      </BoardTabFormModal>
      <ContractorQuickCreateModal
        open={addContractorOpen}
        onClose={() => setAddContractorOpen(false)}
        onCreated={(contractor) => {
          patchForm({ contractorId: contractor.id })
          void queryClient.invalidateQueries({ queryKey: ['contractors', 'lookup'] })
        }}
      />
    </>
  )
}
