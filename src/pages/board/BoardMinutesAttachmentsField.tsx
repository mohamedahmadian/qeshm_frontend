import { ImagePlus, Mic, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FileDropField } from '../../components/ui/FileDropField'
import { FileAudio } from '../../components/ui/FileMedia'
import { Button } from '../../components/ui/Form'
import { api, getApiErrorMessage, getImageUrl } from '../../lib/api'
import { optimizeImageFile } from '../../lib/optimize-image'
import { formatNumber } from '../../lib/datetime'
import type { BoardMinutesAttachment } from '../../types/app'

export type PendingMinutesFiles = {
  imageIds: string[]
  audioIds: string[]
  labels: { id: string; name: string; kind: 'IMAGE' | 'AUDIO' }[]
}

export function emptyPendingMinutesFiles(): PendingMinutesFiles {
  return { imageIds: [], audioIds: [], labels: [] }
}

export function pendingFilesFromAttachments(attachments: BoardMinutesAttachment[]): PendingMinutesFiles {
  const imageIds = attachments.filter((row) => row.kind === 'IMAGE' && row.imageId).map((row) => row.imageId!)
  const audioIds = attachments.filter((row) => row.kind === 'AUDIO' && row.fileId).map((row) => row.fileId!)
  return {
    imageIds,
    audioIds,
    labels: [
      ...imageIds.map((id) => {
        const row = attachments.find((item) => item.imageId === id)
        return { id, name: row?.originalName || id, kind: 'IMAGE' as const }
      }),
      ...audioIds.map((id) => {
        const row = attachments.find((item) => item.fileId === id)
        return { id, name: row?.originalName || id, kind: 'AUDIO' as const }
      }),
    ],
  }
}

export function BoardMinutesAttachmentsField({
  value,
  onChange,
  disabled,
}: {
  value: PendingMinutesFiles
  onChange: (next: PendingMinutesFiles) => void
  disabled?: boolean
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [tab, setTab] = useState<'IMAGE' | 'AUDIO'>('IMAGE')
  const [uploading, setUploading] = useState(false)

  async function addFile(file: File, kind: 'IMAGE' | 'AUDIO') {
    setUploading(true)
    try {
      if (kind === 'IMAGE') {
        const optimized = await optimizeImageFile(file)
        const form = new FormData()
        form.append('file', optimized)
        const { data } = await api.post<{ id: string }>('/images', form)
        onChange({
          imageIds: [...value.imageIds, data.id],
          audioIds: value.audioIds,
          labels: [...value.labels, { id: data.id, name: file.name, kind }],
        })
        return
      }
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post<{ id: string }>('/files', form)
      onChange({
        imageIds: value.imageIds,
        audioIds: [...value.audioIds, data.id],
        labels: [...value.labels, { id: data.id, name: file.name, kind }],
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setUploading(false)
    }
  }

  function remove(id: string, kind: 'IMAGE' | 'AUDIO') {
    onChange({
      imageIds: kind === 'IMAGE' ? value.imageIds.filter((item) => item !== id) : value.imageIds,
      audioIds: kind === 'AUDIO' ? value.audioIds.filter((item) => item !== id) : value.audioIds,
      labels: value.labels.filter((item) => item.id !== id),
    })
  }

  const tabs = [
    { id: 'IMAGE' as const, icon: ImagePlus, label: t('boardMinutes.images'), count: value.imageIds.length },
    { id: 'AUDIO' as const, icon: Mic, label: t('boardMinutes.audio'), count: value.audioIds.length },
  ]

  return (
    <div>
      <div role="tablist" className="grid w-full grid-cols-2 overflow-hidden rounded-2xl border border-teal-100">
        {tabs.map((item) => {
          const Icon = item.icon
          const selected = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 px-3 py-2 text-sm font-semibold ${
                selected
                  ? 'bg-teal-500 bg-[linear-gradient(to_inline-end,var(--color-teal-500),var(--color-mint-500))] text-white'
                  : 'bg-cream-50 text-ink-600 hover:bg-teal-50'
              }`}
              onClick={() => setTab(item.id)}
            >
              <Icon className="size-4" aria-hidden />
              {item.label}
              {item.count ? (
                <span className={`rounded-full px-1.5 text-[11px] ${selected ? 'bg-white/20' : 'bg-emerald-500 text-white'}`}>
                  {formatNumber(item.count, locale)}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
      <div className="space-y-3 border border-t-0 border-teal-100 p-4">
        {tab === 'IMAGE' ? (
          <>
            {disabled ? null : (
              <FileDropField
                accept="image/*"
                allowCamera
                hideLocalPreview
                uploading={uploading}
                onFile={(file) => void addFile(file, 'IMAGE')}
              />
            )}
            {value.imageIds.length ? (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {value.imageIds.map((id) => (
                  <li key={id} className="relative overflow-hidden rounded-2xl ring-1 ring-teal-100">
                    <img src={getImageUrl(id)} alt="" className="h-28 w-full object-cover" />
                    {disabled ? null : (
                      <Button
                        type="button"
                        variant="ghost"
                        className="absolute end-1 top-1 size-8"
                        onClick={() => remove(id, 'IMAGE')}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-500">{t('boardMinutes.noImages')}</p>
            )}
          </>
        ) : (
          <>
            {disabled ? null : (
              <FileDropField
                accept="audio/*"
                hideLocalPreview
                uploading={uploading}
                maxBytes={25 * 1024 * 1024}
                onFile={(file) => void addFile(file, 'AUDIO')}
              />
            )}
            {value.audioIds.length ? (
              <ul className="space-y-2">
                {value.audioIds.map((id) => {
                  const label = value.labels.find((item) => item.id === id)?.name
                  return (
                    <li key={id} className="rounded-2xl border border-line p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="truncate text-sm text-ink-700">{label}</span>
                        {disabled ? null : (
                          <Button type="button" variant="ghost" className="size-8 shrink-0" onClick={() => remove(id, 'AUDIO')}>
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        )}
                      </div>
                      <FileAudio fileId={id} className="w-full" />
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm text-ink-500">{t('boardMinutes.noAudio')}</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
