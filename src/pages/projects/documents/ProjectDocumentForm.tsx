import { FileText, Paperclip, ScrollText, Type } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FileDropField } from '../../../components/ui/FileDropField'
import { FileName } from '../../../components/ui/FileName'
import { AppForm, FormActions, FormField, fieldClassName } from '../../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { getApiErrorMessage } from '../../../lib/api'
import { formatGroupedQuantity, formatNumber } from '../../../lib/datetime'
import type { ProjectDocument } from '../../../types/app'
import { ProjectDocumentFileActions } from './ProjectDocumentFileActions'

const DOCUMENT_ACCEPT =
  '.pdf,.doc,.docx,.mp4,.webm,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,video/mp4,video/webm'

const MAX_DOCUMENT_BYTES = 500 * 1024 * 1024

export type ProjectDocumentPayload = {
  title: string
  description: string | null
  file: File | null
}

export type ProjectDocumentUploadProgress = {
  loaded: number
  total: number
}

type UploadState = ProjectDocumentUploadProgress & {
  phase: 'uploading' | 'saving'
}

export function ProjectDocumentForm({
  initial,
  onSubmit,
}: {
  initial?: Pick<
    ProjectDocument,
    'id' | 'projectId' | 'title' | 'description' | 'originalName' | 'mimeType'
  >
  onSubmit: (
    payload: ProjectDocumentPayload,
    onUploadProgress: (progress: ProjectDocumentUploadProgress) => void,
  ) => Promise<void>
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [upload, setUpload] = useState<UploadState | null>(null)
  const isEdit = Boolean(initial)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!isEdit && !file) {
      toast.error(t('projectDocuments.fileRequired'))
      return
    }
    setSaving(true)
    if (file) {
      setUpload({ loaded: 0, total: file.size, phase: 'uploading' })
    }
    try {
      await onSubmit(
        {
          title: title.trim(),
          description: description.trim() || null,
          file,
        },
        ({ loaded, total }) => {
          if (!file) return
          const knownTotal = total > 0 ? total : file.size
          const sent = knownTotal > 0 ? Math.min(loaded, knownTotal) : loaded
          setUpload({
            loaded: sent,
            total: knownTotal,
            phase: knownTotal > 0 && loaded >= knownTotal ? 'saving' : 'uploading',
          })
        },
      )
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
      setUpload(null)
    }
  }

  return (
    <FormCard
      icon={Paperclip}
      title={initial ? initial.title || t('projectDocuments.edit') : t('projectDocuments.create')}
      subtitle={initial ? undefined : t('projectDocuments.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={Type} label={t('projectDocuments.titleField')} htmlFor="documentTitle">
          <input
            id="documentTitle"
            className={fieldClassName}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            minLength={2}
            maxLength={200}
          />
        </FormField>
        <FormField icon={ScrollText} label={t('projectDocuments.description')} htmlFor="documentDescription">
          <textarea
            id="documentDescription"
            className={fieldClassName}
            rows={4}
            maxLength={2000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </FormField>
        <FormField icon={FileText} label={t('projectDocuments.file')}>
          <div className="space-y-2">
            {initial?.originalName ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-ink-700">
                  {t('projectDocuments.currentFile')}: <FileName>{initial.originalName}</FileName>
                </p>
                <ProjectDocumentFileActions
                  projectId={initial.projectId}
                  documentId={initial.id}
                  mimeType={initial.mimeType}
                />
              </div>
            ) : null}
            <p className="text-xs leading-6 text-ink-500">
              {isEdit ? t('projectDocuments.replaceFile') : t('projectDocuments.fileHint')}
            </p>
            <FileDropField
              accept={DOCUMENT_ACCEPT}
              allowCamera={false}
              maxBytes={MAX_DOCUMENT_BYTES}
              hideLocalPreview
              uploading={Boolean(upload)}
              hideUploadingHint
              onFile={setFile}
              onClear={() => setFile(null)}
            />
            {upload ? (
              <DocumentUploadProgress
                loaded={upload.loaded}
                total={upload.total}
                phase={upload.phase}
                locale={locale}
              />
            ) : null}
          </div>
        </FormField>
        <FormActions
          submitLabel={t('projectDocuments.save')}
          cancelLabel={t('projectDocuments.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}

const KB = 1024
const MB = 1024 * 1024

function formatUploadSize(
  value: number,
  locale: string,
  unit: 'kb' | 'mb',
  kilobyte: string,
  megabyte: string,
) {
  const amount = unit === 'mb' ? value / MB : value / KB
  const rounded =
    !Number.isFinite(amount) || amount <= 0 ? 0 : Math.max(0.1, Math.round(amount * 10) / 10)
  return `${formatGroupedQuantity(rounded, locale, 1)} ${unit === 'mb' ? megabyte : kilobyte}`
}

function DocumentUploadProgress({
  loaded,
  total,
  phase,
  locale,
}: UploadState & { locale: string }) {
  const { t } = useTranslation()
  const percent = total > 0 ? Math.max(0, Math.min(100, Math.round((loaded / total) * 100))) : 0
  const label =
    phase === 'saving' ? t('projectDocuments.uploadSaving') : t('projectDocuments.uploadProgress')
  const unit = total >= MB ? 'mb' : 'kb'
  const amounts = t('projectDocuments.uploadAmounts', {
    loaded: formatUploadSize(loaded, locale, unit, t('projectDocuments.kilobyte'), t('projectDocuments.megabyte')),
    total: formatUploadSize(total, locale, unit, t('projectDocuments.kilobyte'), t('projectDocuments.megabyte')),
  })

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm text-ink-600">
        <span>{label}</span>
        <span className="tabular-nums" dir="ltr">
          {formatNumber(percent, locale)}٪
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-cream-100"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full bg-teal-500 transition-[width] duration-200${
            phase === 'saving' ? ' animate-pulse' : ''
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-ink-500">{amounts}</p>
    </div>
  )
}
