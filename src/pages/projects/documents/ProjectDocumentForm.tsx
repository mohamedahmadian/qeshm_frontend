import { FileText, Paperclip, ScrollText, Type } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FileDropField } from '../../../components/ui/FileDropField'
import { AppForm, FormActions, FormField, fieldClassName } from '../../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { getApiErrorMessage } from '../../../lib/api'
import type { ProjectDocument } from '../../../types/app'

const DOCUMENT_ACCEPT =
  '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024

export type ProjectDocumentPayload = {
  title: string
  description: string | null
  file: File | null
}

export function ProjectDocumentForm({
  initial,
  onSubmit,
}: {
  initial?: Pick<ProjectDocument, 'title' | 'description' | 'originalName'>
  onSubmit: (payload: ProjectDocumentPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(initial)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!isEdit && !file) {
      toast.error(t('projectDocuments.fileRequired'))
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        file,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
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
              <p className="text-sm text-ink-700">
                {t('projectDocuments.currentFile')}: {initial.originalName}
              </p>
            ) : null}
            <p className="text-xs leading-6 text-ink-500">
              {isEdit ? t('projectDocuments.replaceFile') : t('projectDocuments.fileHint')}
            </p>
            <FileDropField
              accept={DOCUMENT_ACCEPT}
              allowCamera={false}
              maxBytes={MAX_DOCUMENT_BYTES}
              hideLocalPreview
              onFile={setFile}
              onClear={() => setFile(null)}
            />
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
