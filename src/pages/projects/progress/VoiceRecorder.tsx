import { Mic, RotateCcw, Square, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '../../../components/ui/Form'
import { getFileUrl } from '../../../lib/api'
import { localizeDigits } from '../../../lib/datetime'
import {
  projectProgressProcessingModes,
  type ProjectProgressProcessingMode,
} from '../../../types/app'

const MAX_MS = 10 * 60 * 1000

function speechCtor() {
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechResultEvent) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechResultEvent = {
  resultIndex: number
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
}

function speechLang(locale: string) {
  if (locale === 'fa') return 'fa-IR'
  if (locale === 'ar') return 'ar-SA'
  if (locale === 'ur') return 'ur-PK'
  if (locale === 'hi') return 'hi-IN'
  return 'en-US'
}

function pickMime() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  if (typeof MediaRecorder === 'undefined') return ''
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

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
  processingMode: ProjectProgressProcessingMode
  liveTranscript: string
  compact?: boolean
  disabled?: boolean
  onAudio: (file: File, durationMs: number) => void
  onClear: () => void
  onLiveTranscript: (value: string) => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string>()
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef(0)
  const timerRef = useRef<number | undefined>(undefined)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const finalsRef = useRef('')
  const mimeRef = useRef('')

  useEffect(() => {
    return () => {
      stopTracks()
      stopRecognition()
      if (timerRef.current) window.clearInterval(timerRef.current)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    recorderRef.current = null
  }

  function stopRecognition() {
    const recognition = recognitionRef.current
    recognitionRef.current = null
    try {
      recognition?.stop()
    } catch {
      /* already stopped */
    }
  }

  function startRecognition() {
    if (processingMode !== projectProgressProcessingModes.IMMEDIATE) {
      return
    }
    const Ctor = speechCtor()
    if (!Ctor) {
      toast.error(t('projectProgress.speechUnsupported'))
      return
    }
    const recognition = new Ctor()
    recognition.lang = speechLang(locale)
    recognition.continuous = true
    recognition.interimResults = true
    finalsRef.current = liveTranscript.trim()
    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i]
        if (piece.isFinal) {
          finalsRef.current = `${finalsRef.current} ${piece[0].transcript}`.trim()
        } else {
          interim += piece[0].transcript
        }
      }
      onLiveTranscript(`${finalsRef.current} ${interim}`.trim())
    }
    recognition.onerror = () => undefined
    recognition.onend = () => {
      if (recognitionRef.current === recognition && recording) {
        try {
          recognition.start()
        } catch {
          /* ignore restart */
        }
      }
    }
    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch {
      toast.error(t('projectProgress.speechUnsupported'))
    }
  }

  async function start() {
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      toast.error(t('projectProgress.recordFailed'))
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      mimeRef.current = pickMime()
      const recorder = mimeRef.current
        ? new MediaRecorder(stream, { mimeType: mimeRef.current })
        : new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeRef.current || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type })
        const ext = type.includes('mp4') ? 'm4a' : 'webm'
        const file = new File([blob], `progress.${ext}`, { type })
        const duration = Date.now() - startedAtRef.current
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setPreviewUrl(URL.createObjectURL(blob))
        onAudio(file, duration)
        stopTracks()
      }
      recorderRef.current = recorder
      startedAtRef.current = Date.now()
      setElapsed(0)
      recorder.start()
      setRecording(true)
      timerRef.current = window.setInterval(() => {
        const next = Date.now() - startedAtRef.current
        setElapsed(next)
        if (next >= MAX_MS) {
          toast.message(t('projectProgress.maxDuration'))
          void stop()
        }
      }, 200)
      startRecognition()
    } catch (error) {
      const denied =
        error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError')
      toast.error(denied ? t('projectProgress.micDenied') : t('projectProgress.recordFailed'))
      stopTracks()
    }
  }

  function stop() {
    if (timerRef.current) window.clearInterval(timerRef.current)
    setRecording(false)
    stopRecognition()
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    } else {
      stopTracks()
    }
  }

  function clear() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(undefined)
    setElapsed(0)
    onClear()
  }

  const hasAudio = Boolean(audioId || previewUrl)
  const src = previewUrl || (audioId ? getFileUrl(audioId) : undefined)
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
        {hasAudio && src && !recording ? (
          <div className="w-full space-y-2 sm:space-y-3">
            <audio controls src={src} className="w-full" />
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" variant="ghost" disabled={disabled} onClick={() => void start()}>
                <RotateCcw className="size-4" aria-hidden />
                {t('projectProgress.reRecord')}
              </Button>
              <Button type="button" variant="ghost" disabled={disabled} onClick={clear}>
                <Trash2 className="size-4" aria-hidden />
                {t('projectProgress.removeAudio')}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
