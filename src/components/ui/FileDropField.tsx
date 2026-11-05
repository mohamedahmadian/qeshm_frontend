import { Camera, FolderOpen, ImagePlus, ScanLine, Trash2, X } from 'lucide-react'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FileName } from './FileName'
import { Button } from './Form'
import { LoadingSpinner } from './LoadingState'
import { ScanSettingsModal } from './ScanSettingsModal'

const defaultMaxBytes = 8 * 1024 * 1024

function fileMatchesAccept(file: File, accept: string) {
  const tokens = accept
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
  if (!tokens.length) return true
  const mime = (file.type || '').toLowerCase()
  const name = file.name.toLowerCase()
  const ext = name.includes('.') ? `.${name.split('.').pop()}` : ''
  return tokens.some((token) => {
    if (token.endsWith('/*')) return mime.startsWith(token.slice(0, -1))
    if (token.startsWith('.')) return ext === token
    return mime === token
  })
}

export function FileDropField({
  id,
  accept = 'image/*',
  capture = 'user',
  allowCamera,
  allowScan,
  previewUrl,
  uploading,
  hideUploadingHint,
  previewClassName = 'mx-auto mb-4 h-28 w-28 rounded-2xl object-cover',
  maxBytes = defaultMaxBytes,
  hideLocalPreview,
  onFile,
  onClear,
}: {
  id?: string
  accept?: string
  capture?: 'user' | 'environment'
  allowCamera?: boolean
  allowScan?: boolean
  previewUrl?: string
  uploading?: boolean
  hideUploadingHint?: boolean
  previewClassName?: string
  maxBytes?: number
  hideLocalPreview?: boolean
  onFile: (file: File) => void
  onClear?: () => void
}) {
  const { t } = useTranslation()
  const generatedId = useId()
  const inputId = id ?? generatedId
  const cameraId = `${inputId}-camera`
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const dragCount = useRef(0)
  const [dragging, setDragging] = useState(false)
  const [localPreview, setLocalPreview] = useState<string>()
  const [selectedName, setSelectedName] = useState<string>()
  const [scanOpen, setScanOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const cameraEnabled = allowCamera ?? accept.includes('image')
  const scanEnabled = allowScan ?? accept.includes('image')
  const busy = Boolean(uploading)

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview)
    }
  }, [localPreview])

  function takeFile(file: File | undefined) {
    if (!file) return
    if (file.size > maxBytes) {
      toast.error(t('common.fileTooLarge'))
      return
    }
    if (!fileMatchesAccept(file, accept)) {
      toast.error(t('common.fileInvalidType'))
      return
    }
    if (!hideLocalPreview && file.type.startsWith('image/')) {
      if (localPreview) URL.revokeObjectURL(localPreview)
      setLocalPreview(URL.createObjectURL(file))
    } else if (localPreview) {
      URL.revokeObjectURL(localPreview)
      setLocalPreview(undefined)
    }
    setSelectedName(file.name)
    onFile(file)
  }

  function fromInput(event: ChangeEvent<HTMLInputElement>) {
    takeFile(event.target.files?.[0])
    event.target.value = ''
  }

  function onDragEnter(event: DragEvent) {
    event.preventDefault()
    dragCount.current += 1
    setDragging(true)
  }

  function onDragLeave(event: DragEvent) {
    event.preventDefault()
    dragCount.current -= 1
    if (dragCount.current <= 0) {
      dragCount.current = 0
      setDragging(false)
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    dragCount.current = 0
    setDragging(false)
    takeFile(event.dataTransfer.files?.[0])
  }

  const preview = hideLocalPreview ? previewUrl : localPreview || previewUrl
  const hasFile = Boolean(preview || selectedName)

  return (
    <div
      onDragEnter={onDragEnter}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`rounded-2xl border-2 border-dashed px-4 py-5 text-center transition ${
        dragging
          ? 'border-teal-500 bg-teal-50'
          : 'border-line bg-cream-50'
      }`}
    >
      <input
        ref={fileRef}
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={fromInput}
      />
      {cameraEnabled ? (
        <input
          ref={cameraRef}
          id={cameraId}
          type="file"
          accept="image/*"
          capture={capture}
          className="sr-only"
          onChange={fromInput}
        />
      ) : null}

      {preview ? (
        <button
          type="button"
          className="mx-auto block cursor-pointer"
          aria-label={t('common.viewImage')}
          onClick={() => setPreviewOpen(true)}
        >
          <img
            src={preview}
            alt=""
            className={`${previewClassName} cursor-pointer ring-1 ring-transparent transition hover:ring-teal-400`}
          />
        </button>
      ) : (
        <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-white text-teal-600 shadow-sm">
          <ImagePlus className="size-6" aria-hidden />
        </span>
      )}

      {selectedName && !preview ? (
        <p className="mb-2 text-sm font-medium text-ink-800">
          <FileName>{selectedName}</FileName>
        </p>
      ) : null}

      <p className="text-sm text-ink-700">{t('common.dropFileHint')}</p>
      <p className="mt-1 text-xs text-ink-400">{t('common.orSelect')}</p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <FolderOpen className="size-4" aria-hidden />
          {t('common.selectFile')}
        </Button>
        {scanEnabled ? (
          <Button
            type="button"
            variant="ghost"
            className="hidden lg:inline-flex"
            disabled={busy}
            onClick={() => setScanOpen(true)}
          >
            <ScanLine className="size-4" aria-hidden />
            {t('common.scan')}
          </Button>
        ) : null}
        {cameraEnabled ? (
          <Button
            type="button"
            variant="ghost"
            className="hidden pointer-coarse:inline-flex"
            disabled={busy}
            onClick={() => cameraRef.current?.click()}
          >
            <Camera className="size-4" aria-hidden />
            {t('common.takePhoto')}
          </Button>
        ) : null}
        {hasFile && onClear ? (
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (localPreview) URL.revokeObjectURL(localPreview)
              setLocalPreview(undefined)
              setSelectedName(undefined)
              setPreviewOpen(false)
              onClear()
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            {t('common.removeFile')}
          </Button>
        ) : null}
      </div>

      {busy && !hideUploadingHint ? (
        <div className="mt-3 flex flex-col items-center gap-2">
          <LoadingSpinner size="sm" />
          <p className="mt-1 text-xs text-teal-700">{t('common.uploading')}</p>
        </div>
      ) : null}
      {scanOpen ? (
        <ScanSettingsModal
          onClose={() => setScanOpen(false)}
          onFile={takeFile}
        />
      ) : null}
      {previewOpen && preview ? (
        <ImagePreviewOverlay src={preview} onClose={() => setPreviewOpen(false)} />
      ) : null}
    </div>
  )
}

function ImagePreviewOverlay({ src, onClose }: { src: string; onClose: () => void }) {
  const { t } = useTranslation()

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat) return
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey, true)
    }
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-900/75 p-4"
      data-nested-dialog
      role="dialog"
      aria-modal="true"
      aria-label={t('common.viewImage')}
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute end-4 top-4 z-10 inline-flex size-10 cursor-pointer items-center justify-center rounded-full bg-white text-ink-800 shadow-md"
        aria-label={t('common.close')}
        onClick={onClose}
      >
        <X className="size-5" aria-hidden />
      </button>
      <img
        src={src}
        alt=""
        className="max-h-[90vh] max-w-[min(92vw,72rem)] rounded-2xl object-contain shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      />
    </div>,
    document.body,
  )
}
