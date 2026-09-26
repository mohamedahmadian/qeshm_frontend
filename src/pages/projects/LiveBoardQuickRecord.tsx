import { ClipboardList, Mic, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Form'
import { api, getApiErrorMessage } from '../../lib/api'
import { localizeDigits, todayIsoDate } from '../../lib/datetime'
import {
  projectProgressProcessingModes,
  type ProjectLiveBoardItem,
} from '../../types/app'
import { LiveBoardHeaderStats } from './ProjectLiveBoardMap'
import { useVoiceCapture } from './progress/useVoiceCapture'

function formatClock(ms: number, locale: string) {
  const total = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  const value = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return localizeDigits(value, locale)
}

const SAVE_AND_PROCESS = projectProgressProcessingModes.DEFERRED

function LiveBoardQuickRecord({
  project,
  detailsOpen = false,
}: {
  project: ProjectLiveBoardItem
  detailsOpen?: boolean
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const queryClient = useQueryClient()
  const [liveTranscript, setLiveTranscript] = useState('')
  const [busy, setBusy] = useState(false)
  const wantSaveRef = useRef(false)
  const startingRef = useRef(false)
  const projectIdRef = useRef(project.id)
  const liveTranscriptSaveRef = useRef('')

  projectIdRef.current = project.id
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
    if (!detailsOpen) return
    wantSaveRef.current = false
    stopRef.current()
  }, [detailsOpen])

  useEffect(() => {
    return () => {
      wantSaveRef.current = false
    }
  }, [project.id])

  async function saveRecording(file: File, durationMs: number) {
    if (!wantSaveRef.current) return
    wantSaveRef.current = false
    const projectId = projectIdRef.current
    const text = liveTranscriptSaveRef.current.trim()
    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('durationMs', String(Math.round(durationMs)))
      const { data } = await api.post<{ id: string }>('/files', form)
      await api.post(`/projects/${projectId}/progress`, {
        occurredAt: todayIsoDate(),
        body: text || null,
        transcript: null,
        progressPercent: null,
        processingMode: SAVE_AND_PROCESS,
        audioId: data.id,
        imageIds: [],
      })
      toast.success(t('projectProgress.created'))
      await queryClient.invalidateQueries({ queryKey: ['projects', 'live-board'] })
      await queryClient.invalidateQueries({ queryKey: ['public', 'projects', 'live-board'] })
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
          disabled={busy || detailsOpen}
          title={t('projectLiveBoard.saveAndProcess')}
          aria-label={
            recording ? t('projectProgress.stopRecord') : t('projectLiveBoard.saveAndProcess')
          }
          aria-pressed={recording}
          onPointerDown={(event) => event.stopPropagation()}
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
      <p className={`live-board-quick-record-clock${showClock ? '' : ' is-idle'}`} dir="ltr">
        {showClock ? clock : '\u00a0'}
      </p>
    </div>
  )
}

export function LiveBoardAdminHeaderActions({
  project,
  locale,
  detailsOpen = false,
  onAddProgress,
}: {
  project: ProjectLiveBoardItem
  locale: string
  detailsOpen?: boolean
  onAddProgress: () => void
}) {
  const { t } = useTranslation()
  return (
    <div
      className="live-board-map-toolbar flex flex-wrap items-center justify-end gap-2"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="live-board-toolbar-stats">
        <LiveBoardHeaderStats project={project} locale={locale} size="sm" />
      </div>
      <div className="live-board-toolbar-actions">
        <LiveBoardQuickRecord key={project.id} project={project} detailsOpen={detailsOpen} />
        <Button
          type="button"
          variant="soft"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onAddProgress}
        >
          <ClipboardList className="size-4" aria-hidden />
          {t('projectLiveBoard.addProgress')}
        </Button>
      </div>
    </div>
  )
}
