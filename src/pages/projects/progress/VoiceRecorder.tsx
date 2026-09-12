import { Mic, Square, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileAudio } from '../../../components/ui/FileMedia'
import { Button } from '../../../components/ui/Form'
import { localizeDigits } from '../../../lib/datetime'
import { type ProjectProgressProcessingMode } from '../../../types/app'
import { useVoiceCapture } from './useVoiceCapture'

function formatClock(ms: number, locale: string) {
  const total = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  const value = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return localizeDigits(value, locale)
}

export function VoiceRecorder({
  audioId,
  durationMs,
  processingMode,
  liveTranscript,
  compact = false,
  disabled,
  onAudio,
  onClear,
  onLiveTranscript,
}: {
  audioId?: string | null
  durationMs?: number | null
  liveTranscript: string
  processingMode: ProjectProgressProcessingMode
  compact?: boolean
  disabled?: boolean
  onAudio: (file: File, durationMs: number) => void
  onClear: () => void
  onLiveTranscript: (value: string) => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [previewUrl, setPreviewUrl] = useState<string>()
  const previewUrlRef = useRef<string | undefined>(undefined)
  const { recording, elapsed, start, stop } = useVoiceCapture({
    processingMode,
    liveTranscript,
    onAudio: (file, duration) => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
      const url = URL.createObjectURL(file)
      previewUrlRef.current = url
      setPreviewUrl(url)
      onAudio(file, duration)
    },
    onLiveTranscript,
  })

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  function clear() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = undefined
    setPreviewUrl(undefined)
    onClear()
  }

  const hasAudio = Boolean(audioId || previewUrl)
  const clock = formatClock(recording ? elapsed : durationMs ?? elapsed, locale)

  return (
    <div
      className={`rounded-2xl border border-teal-100 bg-gradient-to-b from-teal-50/70 to-white ${
        compact ? 'p-2.5' : 'p-3 sm:p-5'
      }`}
    >
      <div className={`flex flex-col items-center ${compact ? 'gap-2' : 'gap-3 sm:gap-4'}`}>
        <button
          type="button"
          disabled={disabled || hasAudio}
          onClick={() => (recording ? stop() : void start())}
          className={`relative flex cursor-pointer items-center justify-center rounded-full text-white shadow-md transition ${
            compact ? 'size-14' : 'size-16 sm:size-20'
          } ${
            recording
              ? 'bg-red-500 hover:bg-red-600'
              : hasAudio
                ? 'bg-teal-300'
                : 'bg-teal-500 hover:bg-teal-600'
          } disabled:cursor-not-allowed disabled:opacity-70`}
          aria-label={recording ? t('projectProgress.stopRecord') : t('projectProgress.record')}
        >
          {recording ? (
            <span className="absolute inset-0 animate-ping rounded-full bg-red-400/40" />
          ) : null}
          {recording ? (
            <Square className={`fill-current ${compact ? 'size-5' : 'size-6 sm:size-7'}`} aria-hidden />
          ) : (
            <Mic className={compact ? 'size-6' : 'size-7 sm:size-8'} aria-hidden />
          )}
        </button>
        <div className="text-center">
          <p className="text-sm font-medium text-ink-800">
            {recording
              ? t('projectProgress.recording')
              : hasAudio
                ? t('projectProgress.audio')
                : t('projectProgress.record')}
          </p>
          <p
            className={`font-mono tabular-nums text-teal-700 ${
              compact ? 'mt-0.5 text-sm' : 'mt-0.5 text-base sm:mt-1 sm:text-lg'
            }`}
            dir="ltr"
          >
            {clock}
          </p>
          {!recording && !hasAudio ? (
            <p className="mt-1 text-xs text-ink-400">{t('projectProgress.recordHint')}</p>
          ) : null}
        </div>
        {hasAudio && !recording ? (
          <div className="w-full space-y-2 sm:space-y-3">
            {previewUrl ? (
              <audio controls playsInline src={previewUrl} className="w-full" />
            ) : audioId ? (
              <FileAudio fileId={audioId} className="w-full" />
            ) : null}
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                variant="ghost"
                icon={compact}
                disabled={disabled}
                aria-label={t('projectProgress.removeAudio')}
                title={t('projectProgress.removeAudio')}
                onClick={clear}
              >
                <Trash2 className="size-4" aria-hidden />
                {compact ? null : t('projectProgress.removeAudio')}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
