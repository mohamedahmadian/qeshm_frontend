import { ClipboardList, Clock3, Mic, Square } from 'lucide-react'
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
  type ProjectProgressProcessingMode,
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

const recordModes: {
  value: ProjectProgressProcessingMode
  icon: typeof Mic
}[] = [
  { value: projectProgressProcessingModes.IMMEDIATE, icon: Mic },
  { value: projectProgressProcessingModes.DEFERRED, icon: Clock3 },
]

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
  const [activeMode, setActiveMode] = useState<ProjectProgressProcessingMode | null>(null)
  const [busy, setBusy] = useState(false)
  const wantSaveRef = useRef(false)
  const startingRef = useRef(false)
  const projectIdRef = useRef(project.id)
  const liveTranscriptSaveRef = useRef('')
  const activeModeRef = useRef<ProjectProgressProcessingMode | null>(null)

  projectIdRef.current = project.id
  liveTranscriptSaveRef.current = liveTranscript
  activeModeRef.current = activeMode

  const { recording, elapsed, start, stop } = useVoiceCapture({
    processingMode: activeMode ?? projectProgressProcessingModes.DEFERRED,
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
    setActiveMode(null)
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
    const mode = activeModeRef.current ?? projectProgressProcessingModes.DEFERRED
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
        transcript:
          mode === projectProgressProcessingModes.IMMEDIATE && text ? text : null,
        progressPercent: null,
        processingMode: mode,
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
      setActiveMode(null)
    }
  }

  async function toggle(mode: ProjectProgressProcessingMode) {
    if (busy || startingRef.current) return
    if (recording) {
      if (activeMode !== mode) return
      wantSaveRef.current = true
      stop()
      return
    }
    startingRef.current = true
    setLiveTranscript('')
    setActiveMode(mode)
    const started = await start(mode)
    startingRef.current = false
    if (!started) setActiveMode(null)
  }

  const clock = formatClock(elapsed, locale)
  const showClock = recording || busy

  return (
    <div className="live-board-quick-record">
      <div className="live-board-quick-record-row">
        {recordModes.map((item) => {
          const Icon = item.icon
          const active = recording && activeMode === item.value
          return (
            <button
              key={item.value}
              type="button"
              disabled={busy || detailsOpen || (recording && !active)}
              title={t(`projectProgress.modes.${item.value}`)}
              aria-label={
                active ? t('projectProgress.stopRecord') : t(`projectProgress.modes.${item.value}`)
              }
              aria-pressed={active}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => toggle(item.value)}
              className={`live-board-quick-record-btn${active ? ' is-recording' : ''}${
                item.value === projectProgressProcessingModes.DEFERRED ? ' is-deferred' : ''
              }`}
            >
              {active ? <span className="live-board-quick-record-ping" aria-hidden /> : null}
              {active ? (
                <Square className="relative z-10 size-4 fill-current" aria-hidden />
              ) : (
                <Icon className="relative z-10 size-4" aria-hidden />
              )}
            </button>
          )
        })}
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
      <LiveBoardHeaderStats project={project} locale={locale} size="sm" />
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
  )
}
