import { ImagePlus, Mic, Video } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getFileUrl, getImageUrl } from '../../lib/api'
import type { SingardAttachment } from '../../types/app'

export function SingardAttachments({ items }: { items?: SingardAttachment[] }) {
  const { t } = useTranslation()
  if (!items?.length) {
    return <p className="text-sm text-ink-400">{t('singard.attachments')}: —</p>
  }
  const images = items.filter((item) => item.kind === 'IMAGE' && item.imageId)
  const audios = items.filter((item) => item.kind === 'AUDIO' && item.fileId)
  const videos = items.filter((item) => item.kind === 'VIDEO' && item.fileId)

  return (
    <div className="space-y-4">
      {images.length ? (
        <div className="flex flex-wrap gap-3">
          {images.map((item) => (
            <a
              key={item.id}
              href={getImageUrl(item.imageId!)}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-2xl ring-1 ring-teal-100"
            >
              <img src={getImageUrl(item.imageId!)} alt="" className="h-28 w-28 object-cover" />
            </a>
          ))}
        </div>
      ) : null}
      {audios.map((item) => (
        <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-teal-100 bg-teal-50/50 p-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-teal-500 text-white">
            <Mic className="size-4" aria-hidden />
          </span>
          <audio className="min-w-0 flex-1" controls src={getFileUrl(item.fileId!)} />
        </div>
      ))}
      {videos.map((item) => (
        <div key={item.id} className="overflow-hidden rounded-2xl border border-teal-100 bg-white">
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-ink-600">
            <Video className="size-4 text-teal-600" aria-hidden />
            {item.file?.originalName || t('singardWizard.video')}
          </div>
          <video className="max-h-80 w-full bg-ink-900" controls src={getFileUrl(item.fileId!)} />
        </div>
      ))}
      {!images.length && !audios.length && !videos.length ? (
        <p className="inline-flex items-center gap-2 text-sm text-ink-400">
          <ImagePlus className="size-4" aria-hidden />—
        </p>
      ) : null}
    </div>
  )
}
