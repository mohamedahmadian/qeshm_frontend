import {
  File,
  FileArchive,
  FileAudio,
  FileSpreadsheet,
  FileText,
  FileType,
  Paperclip,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FileDropField } from '../../components/ui/FileDropField'
import { Button } from '../../components/ui/Form'
import { api, getApiErrorMessage, getFileUrl, getImageUrl } from '../../lib/api'
import { optimizeImageFile } from '../../lib/optimize-image'
import type { BoardAttachment } from '../../types/app'

const MIXED_ACCEPT =
  'image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt,.csv,.rtf,application/pdf'

export type PendingBoardFileKind = 'IMAGE' | 'AUDIO' | 'VIDEO' | 'FILE'

export type PendingBoardFiles = {
  imageIds: string[]
  fileIds: string[]
  labels: {
    id: string
    name: string
    kind: PendingBoardFileKind
    mimeType: string
  }[]
}

export function emptyPendingBoardFiles(): PendingBoardFiles {
  return { imageIds: [], fileIds: [], labels: [] }
}

function extOf(name: string) {
  return name.trim().toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? ''
}

function pendingKind(file: File): PendingBoardFileKind {
  if (file.type.startsWith('image/')) return 'IMAGE'
  if (file.type.startsWith('audio/')) return 'AUDIO'
  if (file.type.startsWith('video/')) return 'VIDEO'
  return 'FILE'
}

function FileKindIcon({ name, mimeType }: { name: string; mimeType?: string | null }) {
  const mime = (mimeType ?? '').toLowerCase()
  const ext = extOf(name)
  const className = 'size-8 shrink-0 text-teal-600'
  if (mime.includes('pdf') || ext === 'pdf') return <FileText className={className} aria-hidden />
  if (mime.includes('spreadsheet') || mime.includes('excel') || ext === 'xls' || ext === 'xlsx' || ext === 'csv') {
    return <FileSpreadsheet className={className} aria-hidden />
  }
  if (mime.includes('word') || mime.includes('msword') || ext === 'doc' || ext === 'docx') {
    return <FileType className={className} aria-hidden />
  }
  if (mime.includes('zip') || ext === 'zip') return <FileArchive className={className} aria-hidden />
  if (mime.startsWith('audio/')) return <FileAudio className={className} aria-hidden />
  return <File className={className} aria-hidden />
}

function AttachmentPreview({
  name,
  kind,
  mimeType,
  imageId,
  fileId,
}: {
  name: string
  kind: PendingBoardFileKind | BoardAttachment['kind']
  mimeType?: string | null
  imageId?: string | null
  fileId?: string | null
}) {
  if ((kind === 'IMAGE' || mimeType?.startsWith('image/')) && imageId) {
    return (
      <a href={getImageUrl(imageId)} target="_blank" rel="noreferrer" className="block">
        <img src={getImageUrl(imageId)} alt={name} className="h-28 w-full rounded-xl object-cover" />
      </a>
    )
  }
  if (fileId && (kind === 'AUDIO' || mimeType?.startsWith('audio/'))) {
    return (
      <div className="space-y-2">
        <audio className="w-full" controls src={getFileUrl(fileId)} preload="metadata">
          <track kind="captions" />
        </audio>
        <p className="truncate text-xs text-ink-600">{name}</p>
      </div>
    )
  }
  if (fileId && (kind === 'VIDEO' || mimeType?.startsWith('video/'))) {
    return (
      <video className="h-28 w-full rounded-xl bg-ink-900" controls src={getFileUrl(fileId)} preload="metadata">
        <track kind="captions" />
      </video>
    )
  }
  return (
    <div className="flex items-center gap-3">
      <FileKindIcon name={name} mimeType={mimeType} />
      {fileId ? (
        <a href={getFileUrl(fileId)} target="_blank" rel="noreferrer" className="truncate text-sm text-ink-800">
          {name}
        </a>
      ) : (
        <span className="truncate text-sm text-ink-800">{name}</span>
      )}
    </div>
  )
}

export function BoardExistingAttachments({ items }: { items: BoardAttachment[] }) {
  const { t } = useTranslation()
  if (!items.length) {
    return <p className="text-sm text-ink-500">{t('board.noAttachments')}</p>
  }
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => {
        const name = item.originalName || t('board.attachments')
        const kind: PendingBoardFileKind =
          item.kind === 'IMAGE'
            ? 'IMAGE'
            : item.mimeType?.startsWith('audio/')
              ? 'AUDIO'
              : item.mimeType?.startsWith('video/')
                ? 'VIDEO'
                : 'FILE'
        return (
          <li key={item.id} className="rounded-2xl border border-line p-3">
            <AttachmentPreview
              name={name}
              kind={kind}
              mimeType={item.mimeType}
              imageId={item.imageId}
              fileId={item.fileId}
            />
          </li>
        )
      })}
    </ul>
  )
}

export function BoardAttachmentsField({
  value,
  onChange,
  disabled,
  showToggle = true,
  open: openProp,
}: {
  value: PendingBoardFiles
  onChange: (next: PendingBoardFiles) => void
  disabled?: boolean
  showToggle?: boolean
  open?: boolean
}) {
  const { t } = useTranslation()
  const [uploading, setUploading] = useState(false)
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen

  async function addFile(file: File) {
    const kind = pendingKind(file)
    setUploading(true)
    try {
      if (kind === 'IMAGE') {
        const optimized = await optimizeImageFile(file)
        const form = new FormData()
        form.append('file', optimized)
        const { data } = await api.post<{ id: string }>('/images', form)
        onChange({
          imageIds: [...value.imageIds, data.id],
          fileIds: value.fileIds,
          labels: [...value.labels, { id: data.id, name: file.name, kind, mimeType: file.type }],
        })
        return
      }
      const form = new FormData()
      form.append('file', file)
      const path = kind === 'AUDIO' || kind === 'VIDEO' ? '/files' : '/files/documents'
      const { data } = await api.post<{ id: string }>(path, form)
      onChange({
        imageIds: value.imageIds,
        fileIds: [...value.fileIds, data.id],
        labels: [...value.labels, { id: data.id, name: file.name, kind, mimeType: file.type }],
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setUploading(false)
    }
  }

  function remove(id: string, kind: PendingBoardFileKind) {
    onChange({
      imageIds: kind === 'IMAGE' ? value.imageIds.filter((item) => item !== id) : value.imageIds,
      fileIds: kind === 'IMAGE' ? value.fileIds : value.fileIds.filter((item) => item !== id),
      labels: value.labels.filter((item) => item.id !== id),
    })
  }

  return (
    <div className="space-y-3">
      {open ? (
        <FileDropField
          accept={MIXED_ACCEPT}
          allowCamera
          hideLocalPreview
          uploading={uploading}
          maxBytes={15 * 1024 * 1024}
          onFile={addFile}
        />
      ) : showToggle ? (
        <Button type="button" variant="soft" disabled={disabled} onClick={() => setInternalOpen(true)}>
          <Paperclip className="size-4" aria-hidden />
          {t('board.addAttachments')}
        </Button>
      ) : null}
      {value.labels.length ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {value.labels.map((item) => (
            <li key={item.id} className="relative rounded-2xl border border-line p-3">
              <AttachmentPreview
                name={item.name}
                kind={item.kind}
                mimeType={item.mimeType}
                imageId={item.kind === 'IMAGE' ? item.id : null}
                fileId={item.kind === 'IMAGE' ? null : item.id}
              />
              {disabled ? null : (
                <Button
                  type="button"
                  variant="ghost"
                  icon
                  className="absolute end-2 top-2 size-8"
                  onClick={() => remove(item.id, item.kind)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
