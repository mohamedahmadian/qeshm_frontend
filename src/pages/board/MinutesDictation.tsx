import { Mic, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Form'

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

export function MinutesDictation({
  value,
  disabled,
  onChange,
}: {
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [recording, setRecording] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const recordingRef = useRef(false)
  const finalsRef = useRef(value)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!recording) finalsRef.current = value
  }, [recording, value])

  useEffect(() => {
    return () => stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function stop() {
    recordingRef.current = false
    setRecording(false)
    const recognition = recognitionRef.current
    recognitionRef.current = null
    try {
      recognition?.stop()
    } catch {
      /* already stopped */
    }
  }

  function start() {
    if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      toast.error(t('boardMinutes.dictationNeedsHttps'))
      return
    }
    const Ctor = speechCtor()
    if (!Ctor) {
      toast.error(t('boardMinutes.dictationFailed'))
      return
    }
    const recognition = new Ctor()
    recognition.lang = speechLang(locale)
    recognition.continuous = true
    recognition.interimResults = true
    finalsRef.current = value.trim()
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
      onChangeRef.current(`${finalsRef.current} ${interim}`.trim())
    }
    recognition.onerror = () => {
      toast.error(t('boardMinutes.dictationDenied'))
      stop()
    }
    recognition.onend = () => {
      if (recognitionRef.current === recognition && recordingRef.current) {
        try {
          recognition.start()
        } catch {
          /* ignore */
        }
      }
    }
    recognitionRef.current = recognition
    recordingRef.current = true
    setRecording(true)
    try {
      recognition.start()
    } catch {
      toast.error(t('boardMinutes.dictationFailed'))
      stop()
    }
  }

  return (
    <Button
      type="button"
      variant={recording ? 'danger' : 'ghost'}
      disabled={disabled}
      aria-pressed={recording}
      aria-label={recording ? t('boardMinutes.dictationStop') : t('boardMinutes.dictationStart')}
      onClick={() => (recording ? stop() : start())}
    >
      {recording ? <Square className="size-4" aria-hidden /> : <Mic className="size-4" aria-hidden />}
      {recording ? t('boardMinutes.dictationStop') : t('boardMinutes.dictation')}
    </Button>
  )
}
