import { Mic, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { api, getApiErrorMessage } from '../../../lib/api'
import { localizeDigits, todayIsoDate } from '../../../lib/datetime'
import { projectProgressProcessingModes } from '../../../types/app'
import { useVoiceCapture } from './useVoiceCapture'

function formatClock(ms: number, locale: string) {
  const total = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  const value = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return localizeDigits(value, locale)
}

const SAVE_AND_PROCESS = projectProgressProcessingModes.DEFERRED

export function ProgressQuickRecord({ projectId }: { projectId: string }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const queryClient = useQueryClient()
  const [liveTranscript, setLiveTranscript] = useState('')
  const [busy, setBusy] = useState(false)
  const wantSaveRef = useRef(false)
  const startingRef = useRef(false)
  const projectIdRef = useRef(projectId)
  const liveTranscriptSaveRef = useRef('')

  projectIdRef.current = projectId
  liveTranscriptSaveRef.current = liveTranscript

  const { recording, elapsed, start, stop } = useVoiceCapture({
    processingMode: SAVE_AND_PROCESS,
    liveTranscript,
    onAudio: (file, durationMs) => {
      void saveRecording(file, durationMs)
    },
    onLiveTranscript: setLiveTranscript,
  })
  const stopRef = useRef(stop)
  stopRef.current = stop

  useEffect(() => {
    return () => {
      wantSaveRef.current = false
      stopRef.current()
    }
  }, [])

  async function saveRecording(file: File, durationMs: number) {
    if (!wantSaveRef.current) return
    wantSaveRef.current = false
    const text = liveTranscriptSaveRef.current.trim()
    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('durationMs', String(Math.round(durationMs)))
      const { data } = await api.post<{ id: string }>('/files', form)
      await api.post(`/projects/${projectIdRef.current}/progress`, {
        occurredAt: todayIsoDate(),
        body: text || null,
        transcript: null,
        progressPercent: null,
        processingMode: SAVE_AND_PROCESS,
        audioId: data.id,
        imageIds: [],
      })
      toast.success(t('projectProgress.created'))
      await queryClient.invalidateQueries({ queryKey: ['project-progress', projectIdRef.current] })
      await queryClient.invalidateQueries({ queryKey: ['project', projectIdRef.current] })
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      setLiveTranscript('')
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setBusy(false)
    }
  }

  async function toggle() {
    if (busy || startingRef.current) return
    if (recording) {
      wantSaveRef.current = true
      stop()
      return
    }
    startingRef.current = true
    setLiveTranscript('')
    const started = await start(SAVE_AND_PROCESS)
    startingRef.current = false
    if (!started) return
  }

  const clock = formatClock(elapsed, locale)
  const showClock = recording || busy

  return (
    <div className="live-board-quick-record">
      <div className="live-board-quick-record-row">
        <button
          type="button"
          disabled={busy}
          title={recording ? t('projectProgress.stopRecord') : t('projectProgress.record')}
          aria-label={recording ? t('projectProgress.stopRecord') : t('projectProgress.record')}
          aria-pressed={recording}
          onClick={() => void toggle()}
          className={`live-board-quick-record-btn${recording ? ' is-recording' : ''}`}
        >
          {recording ? <span className="live-board-quick-record-ping" aria-hidden /> : null}
          {recording ? (
            <Square className="relative z-10 size-4 fill-current" aria-hidden />
          ) : (
            <Mic className="relative z-10 size-4" aria-hidden />
          )}
        </button>
      </div>
      <p className="live-board-quick-record-label">{t('projectProgress.quickRecord')}</p>
      {showClock ? (
        <p className="live-board-quick-record-clock" dir="ltr">
          {clock}
        </p>
      ) : null}
    </div>
  )
}
