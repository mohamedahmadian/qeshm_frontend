import { FileText, Paperclip, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FileDropField } from '../../components/ui/FileDropField'
import { Button } from '../../components/ui/Form'
import { api, getApiErrorMessage, getFileUrl, getImageUrl } from '../../lib/api'
import { optimizeImageFile } from '../../lib/optimize-image'
import type { StakeholderAttachment } from './types'

const ACCEPT = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt,.csv,.rtf,application/pdf'

export type PendingStakeholderFiles = {
  imageIds: string[]
  fileIds: string[]
  labels: { id: string; name: string; kind: 'IMAGE' | 'FILE' }[]
}

export function emptyPendingFiles(): PendingStakeholderFiles {
  return { imageIds: [], fileIds: [], labels: [] }
}

export function pendingFromAttachments(items: StakeholderAttachment[] | undefined): PendingStakeholderFiles {
  const labels = (items ?? []).map((item) => ({
    id: item.imageId ?? item.fileId ?? item.id,
    name: item.originalName || item.image?.originalName || item.file?.originalName || 'file',
    kind: item.imageId ? ('IMAGE' as const) : ('FILE' as const),
  }))
  return {
    imageIds: labels.filter((item) => item.kind === 'IMAGE').map((item) => item.id),
    fileIds: labels.filter((item) => item.kind === 'FILE').map((item) => item.id),
    labels,
  }
}

export function AttachmentList({ items }: { items: StakeholderAttachment[] | undefined }) {
  const { t } = useTranslation()
  if (!items?.length) return <p className="text-sm text-ink-500">{t('stakeholders.attachments')} —</p>
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => {
        const name = item.originalName || item.image?.originalName || item.file?.originalName || t('stakeholders.attachments')
        return (
          <li key={item.id} className="rounded-2xl border border-teal-100 bg-white p-3">
            {item.imageId ? (
              <a href={getImageUrl(item.imageId)} target="_blank" rel="noreferrer" className="block">
                <img src={getImageUrl(item.imageId)} alt="" className="mb-2 max-h-36 w-full rounded-xl object-cover" />
                <span className="text-sm text-ink-800">{name}</span>
              </a>
            ) : item.fileId ? (
              <a href={getFileUrl(item.fileId)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-ink-800">
                <FileText className="size-5 shrink-0 text-teal-600" aria-hidden />
                <span className="truncate">{name}</span>
              </a>
            ) : (
              <span className="text-sm">{name}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export function StakeholderAttachmentsField({
  value,
  onChange,
}: {
  value: PendingStakeholderFiles
  onChange: (next: PendingStakeholderFiles) => void
}) {
  const { t } = useTranslation()
  const [uploading, setUploading] = useState(false)
  const [open, setOpen] = useState(value.labels.length > 0)

  async function addFile(file: File) {
    const kind = file.type.startsWith('image/') ? 'IMAGE' : 'FILE'
    setUploading(true)
    try {
      const form = new FormData()
      if (kind === 'IMAGE') {
        form.append('file', await optimizeImageFile(file))
        const { data } = await api.post<{ id: string }>('/images', form)
        onChange({
          imageIds: [...value.imageIds, data.id],
          fileIds: value.fileIds,
          labels: [...value.labels, { id: data.id, name: file.name, kind }],
        })
      } else {
        form.append('file', file)
        const { data } = await api.post<{ id: string }>('/files/documents', form)
        onChange({
          imageIds: value.imageIds,
          fileIds: [...value.fileIds, data.id],
          labels: [...value.labels, { id: data.id, name: file.name, kind }],
        })
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setUploading(false)
    }
  }

  function remove(id: string, kind: 'IMAGE' | 'FILE') {
    onChange({
      imageIds: kind === 'IMAGE' ? value.imageIds.filter((item) => item !== id) : value.imageIds,
      fileIds: kind === 'FILE' ? value.fileIds.filter((item) => item !== id) : value.fileIds,
      labels: value.labels.filter((item) => item.id !== id),
    })
  }

  return (
    <div className="space-y-3">
      {open ? (
        <FileDropField accept={ACCEPT} allowCamera hideLocalPreview uploading={uploading} onFile={addFile} />
      ) : (
        <Button type="button" variant="soft" onClick={() => setOpen(true)}>
          <Paperclip className="size-4" aria-hidden />
          {t('stakeholders.addAttachment')}
        </Button>
      )}
      {value.labels.length ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {value.labels.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 rounded-2xl border border-teal-100 p-3 text-sm">
              <span className="truncate">{item.name}</span>
              <Button type="button" variant="ghost" icon aria-label={t('common.delete')} onClick={() => remove(item.id, item.kind)}>
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
