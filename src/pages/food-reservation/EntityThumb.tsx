import type { LucideIcon } from 'lucide-react'
import { getImageUrl } from '../../lib/api'

export function EntityThumb({
  imageId,
  icon: Icon,
  label,
}: {
  imageId?: string | null
  icon: LucideIcon
  label: string
}) {
  if (!imageId) {
    return (
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
        <Icon className="size-4" aria-hidden />
      </span>
    )
  }
  return (
    <img
      src={getImageUrl(imageId)}
      alt={label}
      className="size-10 shrink-0 rounded-xl object-cover ring-1 ring-teal-100"
    />
  )
}

export function ImageFact({
  imageId,
  empty,
}: {
  imageId?: string | null
  empty: string
}) {
  if (!imageId) {
    return <span className="text-ink-400">{empty}</span>
  }
  return (
    <a href={getImageUrl(imageId)} target="_blank" rel="noreferrer">
      <img
        src={getImageUrl(imageId)}
        alt=""
        className="mt-1 h-28 w-full max-w-[12rem] rounded-xl object-cover ring-1 ring-teal-100"
      />
    </a>
  )
}
