import { Mic, Square, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '../../../components/ui/Form'
import { localizeDigits } from '../../../lib/datetime'

const MAX_MS = 3 * 60 * 1000

function formatClock(ms: number, locale: string) {
  const total = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return localizeDigits(
    `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
    locale,
  )
}

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return ''
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

export function SingardVoiceRecorder({
  disabled,
  onAudio,
  onClear,
}: {
  disabled?: boolean
  onAudio: (file: File, durationMs: number) => void
  onClear: () => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string>()
  const previewRef = useRef<string | undefined>(undefined)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAt = useRef(0)
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
      recorderRef.current?.state === 'recording' && recorderRef.current.stop()
      window.clearInterval(timerRef.current)
    }
  }, [])

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error(t('common.error'))
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = pickMime()
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        const type = (recorder.mimeType || mime || 'audio/webm').split(';')[0] || 'audio/webm'
        const ext = type.includes('mp4') || type.includes('m4a') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'
        const blob = new Blob(chunksRef.current, { type })
        const duration = Date.now() - startedAt.current
        const file = new File([blob], `singard-voice.${ext}`, { type })
        if (previewRef.current) URL.revokeObjectURL(previewRef.current)
        const url = URL.createObjectURL(blob)
        previewRef.current = url
        setPreviewUrl(url)
        onAudio(file, duration)
      }
      recorderRef.current = recorder
      startedAt.current = Date.now()
      setElapsed(0)
      setRecording(true)
      try {
        recorder.start(250)
      } catch {
        recorder.start()
      }
      timerRef.current = window.setInterval(() => {
        const next = Date.now() - startedAt.current
        setElapsed(next)
        if (next >= MAX_MS) stop()
      }, 200)
    } catch {
      toast.error(t('common.error'))
    }
  }

  function stop() {
    window.clearInterval(timerRef.current)
    setRecording(false)
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  function clear() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = undefined
    setPreviewUrl(undefined)
    setElapsed(0)
    onClear()
  }

  return (
    <div className="rounded-2xl border border-teal-100 bg-gradient-to-b from-teal-50/80 to-white p-4">
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => (recording ? stop() : start())}
          className="relative flex size-16 items-center justify-center rounded-full bg-teal-500 text-white shadow-[0_10px_24px_rgba(46,189,182,0.35)] transition hover:bg-teal-600 disabled:opacity-50"
        >
          {recording ? (
            <>
              <span className="absolute inset-0 animate-ping rounded-full bg-rose-400/40" />
              <Square className="relative size-6" aria-hidden />
            </>
          ) : (
            <Mic className="size-7" aria-hidden />
          )}
        </button>
        <p className="text-sm font-semibold text-teal-800">
          {formatClock(elapsed, locale)}
        </p>
        <p className="text-xs text-ink-500">
          {recording ? t('singardWizard.recordStop') : t('singardWizard.recordStart')}
        </p>
        {previewUrl ? (
          <div className="flex w-full flex-col items-center gap-2">
            <audio className="w-full" controls src={previewUrl} />
            <Button type="button" variant="ghost" onClick={clear}>
              <Trash2 className="size-4" aria-hidden />
              {t('common.removeFile')}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
