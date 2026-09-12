import { Mic, Square, Trash2 } from 'lucide-react'
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
const TIMESLICE_MS = 250

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

function isAppleMobile() {
  const ua = navigator.userAgent
  return /iP(hone|od|ad)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isMobileRecorder() {
  return (
    isAppleMobile() ||
    /Android/i.test(navigator.userAgent) ||
    window.matchMedia('(pointer: coarse)').matches
  )
}

function isSecureMicContext() {
  if (window.isSecureContext) return true
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1'
}

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return ''
  const apple = isAppleMobile()
  const types = apple
    ? ['audio/mp4', 'audio/aac', 'audio/x-m4a', 'audio/mpeg', 'audio/webm;codecs=opus', 'audio/webm']
    : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg;codecs=opus']
  return (
    types.find((type) => {
      try {
        return MediaRecorder.isTypeSupported(type)
      } catch {
        return false
      }
    }) ?? ''
  )
}

function fileExtension(type: string) {
  if (type.includes('mp4') || type.includes('m4a') || type.includes('aac')) return 'm4a'
  if (type.includes('mpeg')) return 'mp3'
  if (type.includes('ogg')) return 'ogg'
  return 'webm'
}

async function getMicStream() {
  const media = navigator.mediaDevices
  if (!media?.getUserMedia) {
    throw new DOMException('Unsupported', 'NotSupportedError')
  }
  try {
    return await media.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === 'NotAllowedError' || error.name === 'SecurityError')
    ) {
      throw error
    }
    return media.getUserMedia({ audio: true })
  }
}

function createRecorder(stream: MediaStream, mime: string) {
  try {
    return mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
  } catch {
    return new MediaRecorder(stream)
  }
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
  const recordingRef = useRef(false)
  const previewUrlRef = useRef<string | undefined>(undefined)
  const liveTranscriptRef = useRef(liveTranscript)

  liveTranscriptRef.current = liveTranscript

  useEffect(() => {
    return () => {
      stopTracks()
      stopRecognition()
      if (timerRef.current) window.clearInterval(timerRef.current)
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function setRecordingState(value: boolean) {
    recordingRef.current = value
    setRecording(value)
  }

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
    if (processingMode !== projectProgressProcessingModes.IMMEDIATE) return
    if (isMobileRecorder()) return
    const Ctor = speechCtor()
    if (!Ctor) return
    const recognition = new Ctor()
    recognition.lang = speechLang(locale)
    recognition.continuous = true
    recognition.interimResults = true
    finalsRef.current = liveTranscriptRef.current.trim()
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
      if (recognitionRef.current === recognition && recordingRef.current) {
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
      recognitionRef.current = null
    }
  }

  async function start() {
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      toast.error(t('projectProgress.recordFailed'))
      return
    }
    if (!isSecureMicContext()) {
      toast.error(t('projectProgress.recordNeedsHttps'))
      return
    }
    try {
      const stream = await getMicStream()
      streamRef.current = stream
      mimeRef.current = pickMime()
      const recorder = createRecorder(stream, mimeRef.current)
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data)
      }
      recorder.onerror = () => {
        toast.error(t('projectProgress.recordFailed'))
        void stop()
      }
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeRef.current || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: type.split(';')[0] || type })
        const duration = Date.now() - startedAtRef.current
        stopTracks()
        if (!blob.size) {
          toast.error(t('projectProgress.recordFailed'))
          return
        }
        const ext = fileExtension(type)
        const file = new File([blob], `progress.${ext}`, { type: blob.type || type })
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
        const url = URL.createObjectURL(blob)
        previewUrlRef.current = url
        setPreviewUrl(url)
        onAudio(file, duration)
      }
      recorderRef.current = recorder
      startedAtRef.current = Date.now()
      setElapsed(0)
      if (isAppleMobile()) {
        await new Promise((resolve) => window.setTimeout(resolve, 80))
      }
      try {
        recorder.start(TIMESLICE_MS)
      } catch {
        recorder.start()
      }
      setRecordingState(true)
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
        error instanceof DOMException &&
        (error.name === 'NotAllowedError' || error.name === 'SecurityError')
      toast.error(denied ? t('projectProgress.micDenied') : t('projectProgress.recordFailed'))
      stopTracks()
      setRecordingState(false)
    }
  }

  function stop() {
    if (timerRef.current) window.clearInterval(timerRef.current)
    setRecordingState(false)
    stopRecognition()
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.requestData()
      } catch {
        /* unsupported */
      }
      recorder.stop()
    } else {
      stopTracks()
    }
  }

  function clear() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = undefined
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
            <audio controls playsInline src={src} className="w-full" />
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
