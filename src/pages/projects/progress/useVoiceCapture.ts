import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
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

export function useVoiceCapture({
  processingMode,
  liveTranscript,
  onAudio,
  onLiveTranscript,
}: {
  processingMode: ProjectProgressProcessingMode
  liveTranscript: string
  onAudio: (file: File, durationMs: number) => void
  onLiveTranscript: (value: string) => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef(0)
  const timerRef = useRef<number | undefined>(undefined)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const finalsRef = useRef('')
  const mimeRef = useRef('')
  const recordingRef = useRef(false)
  const liveTranscriptRef = useRef(liveTranscript)
  const onAudioRef = useRef(onAudio)
  const onLiveTranscriptRef = useRef(onLiveTranscript)
  const processingModeRef = useRef(processingMode)

  liveTranscriptRef.current = liveTranscript
  onAudioRef.current = onAudio
  onLiveTranscriptRef.current = onLiveTranscript
  processingModeRef.current = processingMode

  useEffect(() => {
    return () => {
      stopTracks()
      stopRecognition()
      if (timerRef.current) window.clearInterval(timerRef.current)
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
    if (processingModeRef.current !== projectProgressProcessingModes.IMMEDIATE) return
    if (isAppleMobile()) return
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
      onLiveTranscriptRef.current(`${finalsRef.current} ${interim}`.trim())
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

  async function start(nextMode?: ProjectProgressProcessingMode) {
    if (nextMode) processingModeRef.current = nextMode
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      toast.error(t('projectProgress.recordFailed'))
      return false
    }
    if (!isSecureMicContext()) {
      toast.error(t('projectProgress.recordNeedsHttps'))
      return false
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
        stop()
      }
      recorder.onstop = () => {
        const type = (recorder.mimeType || mimeRef.current || 'audio/webm').split(';')[0] || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type })
        const duration = Date.now() - startedAtRef.current
        stopTracks()
        if (!blob.size) {
          toast.error(t('projectProgress.recordFailed'))
          return
        }
        const ext = fileExtension(type)
        onAudioRef.current(new File([blob], `progress.${ext}`, { type: blob.type || type }), duration)
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
          stop()
        }
      }, 200)
      startRecognition()
      return true
    } catch (error) {
      const denied =
        error instanceof DOMException &&
        (error.name === 'NotAllowedError' || error.name === 'SecurityError')
      toast.error(denied ? t('projectProgress.micDenied') : t('projectProgress.recordFailed'))
      stopTracks()
      setRecordingState(false)
      return false
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

  return { recording, elapsed, start, stop }
}
