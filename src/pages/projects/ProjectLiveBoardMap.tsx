import {
  CalendarRange,
  Check,
  ClipboardList,
  ExternalLink,
  FolderKanban,
  Globe,
  Handshake,
  Landmark,
  MapPin,
  Mic,
  ScrollText,
  Tags,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { DateText } from '../../components/ui/DateText'
import { Button, fieldClassName } from '../../components/ui/Form'
import { FormFactTile } from '../../components/ui/FormLayout'
import {
  OsmMapPicker,
  type MapOverlayMarkerTone,
} from '../../components/ui/OsmMapPicker'
import { api, getApiErrorMessage } from '../../lib/api'
import { calendarDaysUntil, formatNumber, todayIsoDate } from '../../lib/datetime'
import { QESHM_LIVE_BOARD_BOUNDS } from '../../lib/geo'
import { projectColor, projectColorAlpha } from '../../lib/project-color'
import { projectProgressEntryPath, projectProgressPath } from './progress/progress-paths'
import { useVoiceCapture } from './progress/useVoiceCapture'
import {
  projectImportances,
  projectProgressProcessingModes,
  type ProjectLiveBoardActivity,
  type ProjectLiveBoardItem,
  type ProjectStatus,
} from '../../types/app'
import {
  ProjectImportanceBadge,
  ProjectUrl,
  projectOperatorsText,
} from './ProjectShared'

export const liveBoardCardTheme: Record<
  string,
  { bar: string; ring: string; icon: string }
> = {
  NOT_STARTED: {
    bar: 'bg-ink-400',
    ring: '#8a8278',
    icon: 'bg-ink-700 text-white',
  },
  IN_PROGRESS: {
    bar: 'bg-gradient-to-e from-teal-500 to-mint-500',
    ring: '#2ebdb6',
    icon: 'bg-teal-500 text-white shadow-[0_10px_22px_rgba(46,189,182,0.32)]',
  },
  SUSPENDED: {
    bar: 'bg-ink-300',
    ring: '#7c8684',
    icon: 'bg-ink-500 text-white',
  },
  COMPLETED: {
    bar: 'bg-gradient-to-e from-mint-500 to-teal-400',
    ring: '#3fd6be',
    icon: 'bg-mint-500 text-white shadow-[0_10px_22px_rgba(63,214,190,0.28)]',
  },
  unset: {
    bar: 'bg-teal-200',
    ring: '#2ebdb6',
    icon: 'bg-teal-500 text-white',
  },
}

const statusTone: Record<ProjectStatus, MapOverlayMarkerTone> = {
  NOT_STARTED: 'not-started',
  IN_PROGRESS: 'in-progress',
  SUSPENDED: 'suspended',
  COMPLETED: 'completed',
}

const MOBILE_VIEWPORT = '(max-width: 639.98px)'
const WEB_DOCK_HEIGHT = '8.25rem'
const WEB_DOCK_HEIGHT_TALL = '10.75rem'

function useStickToLastLine(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [value])
  return ref
}

function useNarrowViewport(query = MOBILE_VIEWPORT) {
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setNarrow(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])
  return narrow
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function truncateWords(text: string, maxWords: number) {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  const words = normalized.split(' ')
  if (words.length <= maxWords) return normalized
  return `${words.slice(0, maxWords).join(' ')}…`
}

function excerptPreview(text: string, maxWords = 22) {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  const sentences = normalized.split(/(?<=[.!?؟.])\s+/).filter(Boolean)
  return truncateWords(sentences.slice(0, 2).join(' ') || normalized, maxWords)
}

function activityTitle(text: string) {
  return truncateWords(text, 8)
}

export function LastActivityPreview({
  activity,
  projectId,
  empty = '—',
  size = 'compact',
}: {
  activity: ProjectLiveBoardActivity | null
  projectId?: string
  empty?: string
  size?: 'compact' | 'comfortable'
}) {
  const { t } = useTranslation()
  const comfortable = size === 'comfortable'
  if (!activity) {
    return (
      <span className={comfortable ? 'text-sm text-ink-400' : 'text-[11px] text-ink-400'}>
        {empty}
      </span>
    )
  }
  const title = activityTitle(activity.title)
  const leftover =
    activity.excerpt && activity.excerpt !== activity.title
      ? activity.excerpt
      : activity.title.replace(/\s+/g, ' ').trim().split(' ').slice(8).join(' ')
  const excerpt = excerptPreview(leftover, comfortable ? 16 : 22)
  const body =
    !title && !excerpt ? (
      <span className={comfortable ? 'text-sm text-ink-500' : 'text-[11px] text-ink-500'}>
        <DateText value={activity.occurredAt} />
      </span>
    ) : (
      <div className={comfortable ? 'min-w-0 space-y-1' : 'min-w-0 space-y-0.5'}>
        {title ? (
          <p
            className={
              comfortable
                ? 'text-sm font-semibold leading-5 text-ink-900'
                : 'text-[11px] font-medium leading-4 text-ink-900'
            }
          >
            {title}
          </p>
        ) : null}
        {excerpt ? (
          <p
            className={
              comfortable ? 'text-xs leading-5 text-ink-500' : 'text-[10px] leading-4 text-ink-500'
            }
          >
            {excerpt}
          </p>
        ) : null}
      </div>
    )
  if (!projectId) {
    return body
  }
  return (
    <button
      type="button"
      className="flex w-full cursor-pointer items-start gap-2 rounded-xl text-start hover:text-teal-800"
      aria-label={t('projectLiveBoard.openActivity')}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        window.open(
          projectProgressEntryPath(projectId, activity.id),
          '_blank',
          'noopener,noreferrer',
        )
      }}
    >
      <span className="min-w-0 flex-1">{body}</span>
      <ExternalLink
        className={`mt-0.5 shrink-0 text-teal-600 ${comfortable ? 'size-4' : 'size-3.5'}`}
        aria-hidden
      />
    </button>
  )
}

function activityPreviewText(activity: ProjectLiveBoardActivity) {
  const title = activityTitle(activity.title)
  const leftover =
    activity.excerpt && activity.excerpt !== activity.title
      ? activity.excerpt
      : activity.title.replace(/\s+/g, ' ').trim().split(' ').slice(8).join(' ')
  const excerpt = excerptPreview(leftover, 18)
  if (title && excerpt) return `${title} ${excerpt}`
  return title || excerpt
}

function LastActivityDockLine({
  activity,
  projectId,
  size = 'compact',
}: {
  activity: ProjectLiveBoardActivity
  projectId?: string
  size?: 'compact' | 'comfortable'
}) {
  const { t } = useTranslation()
  const text = activityPreviewText(activity)
  const comfortable = size === 'comfortable'
  const inner = (
    <>
      <span
        className={`inline-flex shrink-0 items-center rounded-full bg-teal-500 font-semibold text-white ${
          comfortable ? 'px-2 py-0.5 text-xs leading-5' : 'px-1.5 py-px text-[11px] leading-4'
        }`}
      >
        <DateText value={activity.occurredAt} />
      </span>
      {projectId ? (
        <ClipboardList
          className={`shrink-0 text-teal-700 ${comfortable ? 'size-5' : 'size-4'}`}
          aria-hidden
        />
      ) : null}
      <p
        className={`min-w-0 flex-1 font-medium text-ink-800 ${
          comfortable ? 'text-base leading-6' : 'truncate text-sm leading-5'
        }`}
      >
        {text || '—'}
      </p>
    </>
  )
  const className = comfortable
    ? 'flex min-w-0 items-start gap-2 rounded-2xl border border-mint-100 bg-gradient-to-e from-mint-50/80 to-teal-50/40 px-3 py-2.5'
    : 'flex min-w-0 flex-[3] items-center gap-1.5 rounded-xl border border-mint-100 bg-gradient-to-e from-mint-50/80 to-teal-50/40 px-2 py-1'
  if (!projectId) {
    return <div className={className}>{inner}</div>
  }
  return (
    <Link
      to={projectProgressPath(projectId)}
      className={`${className} cursor-pointer hover:border-teal-200 hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400`}
      aria-label={t('projectLiveBoard.openActivities')}
      title={t('projectLiveBoard.openActivities')}
      onClick={(event) => event.stopPropagation()}
    >
      {inner}
    </Link>
  )
}

function DockStatChip({
  value,
  label,
  title,
  overdue = false,
}: {
  value: string
  label: string
  title: string
  overdue?: boolean
}) {
  return (
    <div
      className={`flex h-8 shrink-0 flex-col items-center justify-center rounded-xl border bg-white px-2 ${
        overdue ? 'border-ink-200' : 'border-mint-200'
      }`}
      title={`${title} ${value}`}
      aria-label={`${title} ${value}`}
    >
      <span
        className={`text-[11px] font-bold tabular-nums leading-none ${
          overdue ? 'text-ink-800' : 'text-mint-700'
        }`}
      >
        {value}
      </span>
      <span className="mt-0.5 text-[8px] font-medium leading-none text-ink-500">{label}</span>
    </div>
  )
}

function ProjectColorLamp({ color }: { color?: string | null }) {
  const { t } = useTranslation()
  return (
    <span
      className="live-board-color-lamp"
      style={
        {
          '--lamp-color': projectColor(color),
          '--lamp-ring': projectColorAlpha(color, 0.22),
          '--lamp-glow': projectColorAlpha(color, 0.48),
          '--lamp-ring-dim': projectColorAlpha(color, 0.08),
          '--lamp-glow-dim': projectColorAlpha(color, 0.14),
        } as CSSProperties
      }
      title={t('projects.color')}
      aria-label={t('projects.color')}
    />
  )
}

function MiniProgressRing({
  value,
  locale,
  color,
  size = 'sm',
}: {
  value: number | null
  locale: string
  color: string
  size?: 'xs' | 'sm' | 'md'
}) {
  const { t } = useTranslation()
  const pct = Math.min(100, Math.max(0, value ?? 0))
  const label = value == null ? '—' : `${formatNumber(value, locale)}٪`
  const box =
    size === 'md' ? 'size-14 p-[3px]' : size === 'sm' ? 'size-11 p-[2.5px]' : 'size-8 p-[2px]'
  const text = size === 'md' ? 'text-xs' : size === 'sm' ? 'text-[10px]' : 'text-[9px]'
  return (
    <div
      className={`relative shrink-0 rounded-full ${box}`}
      style={{ background: `conic-gradient(${color} ${pct * 3.6}deg, #e8f4f2 0deg)` }}
      title={`${t('projects.progress')} ${label}`}
      aria-label={`${t('projects.progress')} ${label}`}
    >
      <div className="flex size-full items-center justify-center rounded-full bg-white">
        <span className={`px-0.5 font-bold tabular-nums leading-none text-ink-900 ${text}`}>
          {label}
        </span>
      </div>
    </div>
  )
}

function MiniDaysBadge({
  daysLabel,
  overdue,
  title,
  label,
  size = 'sm',
}: {
  daysLabel: string
  overdue: boolean
  title: string
  label: string
  size?: 'xs' | 'sm' | 'md'
}) {
  const box = size === 'md' ? 'size-14' : size === 'sm' ? 'size-11' : 'size-8'
  const number = size === 'md' ? 'text-sm' : size === 'sm' ? 'text-[12px]' : 'text-[11px]'
  const caption = size === 'md' ? 'text-[10px]' : size === 'sm' ? 'text-[9px]' : 'text-[8px]'
  return (
    <div
      className={`flex shrink-0 flex-col items-center justify-center rounded-full border bg-white text-center ${box} ${
        overdue
          ? 'border-ink-300 shadow-[0_4px_10px_rgba(20,40,40,0.08)]'
          : 'border-mint-200 shadow-[0_4px_10px_rgba(63,214,190,0.18)]'
      }`}
      title={`${title} ${daysLabel}`}
      aria-label={`${title} ${daysLabel}`}
    >
      <span
        className={`font-bold tabular-nums leading-none ${number} ${
          overdue ? 'text-ink-800' : 'text-mint-700'
        }`}
      >
        {daysLabel}
      </span>
      <span className={`mt-0.5 font-medium leading-none text-ink-500 ${caption}`}>{label}</span>
    </div>
  )
}

function ProjectMapDetails({
  project,
  locale,
  canManage,
  variant = 'stack',
}: {
  project: ProjectLiveBoardItem
  locale: string
  canManage: boolean
  variant?: 'stack' | 'inline'
}) {
  const { t } = useTranslation()
  const inline = variant === 'inline'
  const tileClass = inline ? 'min-w-[9.5rem] max-w-[13rem] shrink-0' : undefined
  const facts = (
    <>
      <FormFactTile
        icon={Landmark}
        label={t('projects.operators')}
        value={projectOperatorsText(project.operators) || '—'}
        empty={!project.operators?.length}
        compact
        className={tileClass}
      />
      <FormFactTile
        icon={Tags}
        label={t('projects.importance')}
        value={<ProjectImportanceBadge value={project.importance} />}
        compact
        className={tileClass}
      />
      <FormFactTile
        icon={CalendarRange}
        label={t('projects.startDate')}
        value={project.startDate ? <DateText value={project.startDate} /> : '—'}
        empty={!project.startDate}
        compact
        className={tileClass}
      />
      <FormFactTile
        icon={CalendarRange}
        label={t('projects.endDate')}
        value={project.endDate ? <DateText value={project.endDate} /> : '—'}
        empty={!project.endDate}
        compact
        tone="mint"
        className={tileClass}
      />
      <FormFactTile
        icon={ClipboardList}
        label={t('projectLiveBoard.activityCount')}
        value={formatNumber(project.activityCount, locale)}
        compact
        className={tileClass}
      />
      {project.systemUrl ? (
        <FormFactTile
          icon={Globe}
          label={t('projects.systemUrl')}
          value={<ProjectUrl value={project.systemUrl} />}
          compact
          className={tileClass}
        />
      ) : null}
      {project.address ? (
        <FormFactTile
          icon={MapPin}
          label={t('projects.address')}
          value={project.address}
          compact
          className={inline ? 'min-w-[12rem] max-w-[16rem] shrink-0' : undefined}
        />
      ) : null}
      {project.description ? (
        <FormFactTile
          icon={ScrollText}
          label={t('projects.description')}
          value={project.description}
          compact
          className={inline ? 'min-w-[14rem] max-w-[18rem] shrink-0' : undefined}
        />
      ) : null}
    </>
  )
  const openProject = canManage ? (
    <Link to={`/projects/${project.id}`} className={inline ? 'shrink-0' : 'block'}>
      <Button type="button" className={inline ? 'h-8 px-3 py-0 text-xs' : 'w-full'}>
        <FolderKanban className={inline ? 'size-3.5' : 'size-4'} aria-hidden />
        {t('projectLiveBoard.openProject')}
      </Button>
    </Link>
  ) : null
  if (inline) {
    return (
      <div className="flex h-full min-w-0 items-center gap-1.5 overflow-x-auto [scrollbar-width:thin]">
        {facts}
        {openProject}
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {facts}
      {openProject}
    </div>
  )
}

function ProjectMapCard({
  project,
  locale,
  canManage,
  onClose,
}: {
  project: ProjectLiveBoardItem
  locale: string
  canManage: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const isMobile = useNarrowViewport()
  const [showDetails, setShowDetails] = useState(false)
  const [body, setBody] = useState('')
  const [progressValue, setProgressValue] = useState(project.progressPercent ?? 0)
  const [audioId, setAudioId] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [entered, setEntered] = useState(false)
  const theme = liveBoardCardTheme[project.status ?? 'NOT_STARTED'] ?? liveBoardCardTheme.NOT_STARTED
  const contractor = project.mainContractor?.name || project.companyName
  const remainingDays = calendarDaysUntil(project.endDate)
  const overdue = remainingDays != null && remainingDays < 0
  const daysLabel = remainingDays == null ? '—' : formatNumber(Math.abs(remainingDays), locale)
  const daysTitle = overdue ? t('projectLiveBoard.overdueDays') : t('projectLiveBoard.remainingDays')
  const daysShort = overdue
    ? t('projectLiveBoard.overdueDaysShort')
    : t('projectLiveBoard.remainingDaysShort')
  const reportRef = useStickToLastLine(body)
  const { recording, start, stop } = useVoiceCapture({
    processingMode: projectProgressProcessingModes.IMMEDIATE,
    liveTranscript: body,
    onAudio: (file, durationMs) => {
      void uploadAudio(file, durationMs)
    },
    onLiveTranscript: setBody,
  })

  async function uploadAudio(file: File, durationMs: number) {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('durationMs', String(Math.round(durationMs)))
      const { data } = await api.post<{ id: string }>('/files', form)
      setAudioId(data.id)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setUploading(false)
    }
  }

  function clearDraft() {
    if (recording) stop()
    setBody('')
    setAudioId('')
    setProgressValue(project.progressPercent ?? 0)
  }

  useEffect(() => {
    clearDraft()
    setShowDetails(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id])

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setEntered(true))
    return () => window.cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat) return
      event.preventDefault()
      if (recording) {
        stop()
        return
      }
      if (showDetails) {
        setShowDetails(false)
        return
      }
      onClose()
    }
    document.addEventListener('keydown', onKey)
    const previousOverflow = isMobile ? document.body.style.overflow : ''
    if (isMobile) document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      if (isMobile) document.body.style.overflow = previousOverflow
    }
  }, [isMobile, onClose, recording, showDetails, stop])

  async function toggleRecord() {
    if (recording) {
      stop()
      return
    }
    await start()
  }

  async function saveProgress() {
    if (recording) stop()
    const text = body.trim()
    if (!text && !audioId) {
      toast.error(t('projectProgress.needContent'))
      return
    }
    setSaving(true)
    try {
      await api.post(`/projects/${project.id}/progress`, {
        occurredAt: todayIsoDate(),
        body: text || null,
        transcript: text || null,
        progressPercent: progressValue,
        processingMode: projectProgressProcessingModes.IMMEDIATE,
        audioId: audioId || null,
        imageIds: [],
      })
      toast.success(t('projectProgress.created'))
      await queryClient.invalidateQueries({ queryKey: ['projects', 'live-board'] })
      await queryClient.invalidateQueries({ queryKey: ['public', 'projects', 'live-board'] })
      clearDraft()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  const lastActivity =
    !showDetails && project.lastActivity ? (
      <LastActivityDockLine
        activity={project.lastActivity}
        projectId={canManage ? project.id : undefined}
        size="comfortable"
      />
    ) : null

  const inner = (
    <>
      <div className={`${isMobile ? 'px-10' : 'px-8'} text-center`}>
        <div className="flex items-start justify-center gap-2">
          <h2
            id="live-board-project-title"
            className={`min-w-0 max-w-[calc(100%-2.5rem)] whitespace-normal break-words font-bold text-ink-900 ${
              isMobile ? 'text-lg leading-7' : 'text-base leading-6'
            }`}
          >
            <button
              type="button"
              className="cursor-pointer hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              aria-pressed={showDetails}
              title={showDetails ? t('projectLiveBoard.hideDetails') : t('projectLiveBoard.viewDetails')}
              onClick={() => setShowDetails((open) => !open)}
            >
              {project.systemName}
            </button>
          </h2>
        </div>
        {contractor ? (
          <p className="mt-1.5 flex items-center justify-center gap-1 text-xs text-ink-600">
            <Handshake className="size-3.5 shrink-0 text-teal-600" aria-hidden />
            <span className="whitespace-normal break-words">{contractor}</span>
          </p>
        ) : null}
      </div>
      <div className="mt-4 flex justify-center gap-3">
        <div className="flex min-w-[6.5rem] flex-col items-center rounded-2xl border border-teal-100 bg-white px-4 py-3 shadow-[0_8px_18px_rgba(46,189,182,0.1)]">
          <MiniProgressRing
            value={project.progressPercent}
            locale={locale}
            color={theme.ring}
            size="md"
          />
          <p className="mt-1.5 text-[11px] font-medium text-ink-500">{t('projects.progress')}</p>
        </div>
        <div className="flex min-w-[6.5rem] flex-col items-center rounded-2xl border border-mint-100 bg-white px-4 py-3 shadow-[0_8px_18px_rgba(63,214,190,0.12)]">
          <MiniDaysBadge
            daysLabel={daysLabel}
            overdue={overdue}
            title={daysTitle}
            label={daysShort}
            size="md"
          />
          <p className="mt-1.5 text-[11px] font-medium text-ink-500">{daysTitle}</p>
        </div>
      </div>
      {lastActivity ? <div className="mt-4">{lastActivity}</div> : null}
      {canManage ? (
        <div className="mt-5 flex flex-col items-center gap-3">
          <Button
            type="button"
            className={`relative min-w-[12rem] gap-1.5 px-5 py-2.5 text-sm ${
              recording ? '!bg-red-500 hover:!bg-red-600' : ''
            }`}
            onClick={() => void toggleRecord()}
          >
            {recording ? (
              <span className="absolute inset-0 animate-ping rounded-2xl bg-red-400/30" aria-hidden />
            ) : null}
            <Mic className={`relative size-4 shrink-0 ${recording ? 'animate-pulse' : ''}`} aria-hidden />
            <span className="relative">
              {recording ? t('projectProgress.stopRecord') : t('projectProgress.record')}
            </span>
          </Button>
          <textarea
            ref={reportRef}
            className={`${fieldClassName} progress-report-field progress-report-field-roomy`}
            rows={4}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={t('projectLiveBoard.reportPlaceholder')}
          />
          <div className="w-full space-y-1.5">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              dir="ltr"
              className="progress-slider"
              style={{ '--slider-fill': `${progressValue}%` } as CSSProperties}
              value={progressValue}
              onChange={(event) => setProgressValue(Number(event.target.value))}
              aria-label={t('projectProgress.progress')}
            />
            <p className="text-center text-sm tabular-nums text-ink-700">
              {`${formatNumber(progressValue, locale)}٪`}
            </p>
          </div>
          <Button
            type="button"
            disabled={saving || uploading}
            onClick={() => void saveProgress()}
          >
            <Check className="size-4" aria-hidden />
            {t('projectProgress.save')}
          </Button>
        </div>
      ) : null}
      {showDetails ? (
        <div className="mt-5">
          <ProjectMapDetails project={project} locale={locale} canManage={canManage} />
        </div>
      ) : null}
    </>
  )

  if (isMobile) {
    return createPortal(
      <div
        className={`fixed inset-0 z-[80] flex flex-col bg-cream-50 transition-opacity duration-300 ${
          entered ? 'opacity-100' : 'opacity-0'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="live-board-project-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="h-0.5 shrink-0" style={{ background: projectColor(project.color) }} />
        <div className="absolute start-3 top-4 z-10">
          <ProjectColorLamp color={project.color} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
          <div className="mx-auto my-auto w-full max-w-md">{inner}</div>
        </div>
      </div>,
      document.body,
    )
  }

  const dockButtonClass = 'h-8 min-w-[7.75rem] px-2.5 py-0 text-xs'
  const showDockSecondRow = canManage || Boolean(project.lastActivity)

  return (
    <aside
      className={`absolute inset-x-0 bottom-0 z-[1000] overflow-hidden rounded-t-2xl border border-b-0 bg-white transition-transform duration-300 ease-out ${
        entered ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{
        height: showDockSecondRow ? WEB_DOCK_HEIGHT_TALL : WEB_DOCK_HEIGHT,
        borderColor: projectColorAlpha(project.color, 0.35),
        boxShadow: `0 -8px 22px ${projectColorAlpha(project.color, 0.16)}`,
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="h-0.5" style={{ background: projectColor(project.color) }} />
      <div className="flex h-[calc(100%-2px)] flex-col gap-1.5 px-3 py-1.5">
        <div className="flex min-h-0 flex-1 items-center gap-2.5">
          <div className="flex min-w-0 max-w-[15rem] shrink-0 items-start gap-2">
            <ProjectColorLamp color={project.color} />
            <div className="min-w-0">
              <h2
                id="live-board-project-title"
                className="truncate text-sm font-bold leading-5 text-ink-900"
              >
                <button
                  type="button"
                  className="block w-full truncate cursor-pointer text-start hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                  title={showDetails ? t('projectLiveBoard.hideDetails') : t('projectLiveBoard.viewDetails')}
                  aria-pressed={showDetails}
                  onClick={() => setShowDetails((open) => !open)}
                >
                  {project.systemName}
                </button>
              </h2>
              <span className="mt-1 inline-flex max-w-full items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800 ring-1 ring-teal-200">
                <Handshake className="size-3 shrink-0 text-teal-600" aria-hidden />
                <span className="truncate">
                  {contractor || t('projectLiveBoard.noContractors')}
                </span>
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="flex items-center justify-center rounded-xl border border-teal-100 bg-white p-1 shadow-[0_4px_10px_rgba(46,189,182,0.1)]">
              <MiniProgressRing
                value={project.progressPercent}
                locale={locale}
                color={theme.ring}
                size="xs"
              />
            </div>
            <div className="flex items-center justify-center rounded-xl border border-mint-100 bg-white p-1 shadow-[0_4px_10px_rgba(63,214,190,0.1)]">
              <MiniDaysBadge
                daysLabel={daysLabel}
                overdue={overdue}
                title={daysTitle}
                label={daysShort}
                size="xs"
              />
            </div>
          </div>
          {canManage ? (
            <Button
              type="button"
              className={`relative ${dockButtonClass} ${
                recording ? '!bg-red-500 hover:!bg-red-600' : ''
              }`}
              variant={recording ? 'primary' : 'ghost'}
              aria-pressed={recording}
              onClick={() => void toggleRecord()}
            >
              {recording ? (
                <span className="absolute inset-0 animate-ping rounded-2xl bg-red-400/30" aria-hidden />
              ) : null}
              <Mic className={`relative size-3.5 shrink-0 ${recording ? 'animate-pulse' : ''}`} aria-hidden />
              <span className="relative">
                {recording ? t('projectProgress.stopRecord') : t('projectProgress.record')}
              </span>
            </Button>
          ) : null}
          <div className="flex min-h-0 min-w-0 flex-1 items-center gap-2 self-stretch overflow-hidden pe-1">
            {canManage ? (
              <textarea
                ref={reportRef}
                className={`${fieldClassName} progress-report-field h-full min-h-0 max-h-none w-full min-w-[12rem] flex-1 resize-none border-teal-200 px-3 py-2 text-xs leading-5`}
                rows={2}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={t('projectLiveBoard.reportPlaceholder')}
              />
            ) : null}
            {showDetails ? (
              <div className="min-h-0 min-w-0 flex-1 self-stretch py-0.5">
                <ProjectMapDetails
                  project={project}
                  locale={locale}
                  canManage={canManage}
                  variant="inline"
                />
              </div>
            ) : null}
          </div>
        </div>
        {showDockSecondRow ? (
          <div className="flex shrink-0 items-center gap-2">
            {project.lastActivity ? (
              <>
                <LastActivityDockLine
                  activity={project.lastActivity}
                  projectId={canManage ? project.id : undefined}
                />
                <DockStatChip
                  value={formatNumber(project.activityCount, locale)}
                  label={t('projectLiveBoard.activityCountShort')}
                  title={t('projectLiveBoard.activityCount')}
                />
              </>
            ) : (
              <div className="min-w-0 flex-1" />
            )}
            {canManage ? (
              <>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  dir="ltr"
                  className="progress-slider progress-slider-lg w-[10rem] min-w-[8rem] max-w-[11rem] shrink-0"
                  style={{ '--slider-fill': `${progressValue}%` } as CSSProperties}
                  value={progressValue}
                  onChange={(event) => setProgressValue(Number(event.target.value))}
                  aria-label={t('projectProgress.progress')}
                />
                <span className="w-8 shrink-0 text-end text-[11px] font-semibold tabular-nums text-ink-700">
                  {`${formatNumber(progressValue, locale)}٪`}
                </span>
                <Button
                  type="button"
                  className="h-8 shrink-0 px-2.5 py-0 text-xs"
                  disabled={saving || uploading}
                  onClick={() => void saveProgress()}
                >
                  <Check className="size-3.5" aria-hidden />
                  {t('projectProgress.save')}
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
  )
}

export function ProjectLiveBoardMap({
  items,
  locale,
  className = 'relative h-[28rem] min-h-[20rem] overflow-hidden sm:h-[34rem]',
  canManage = true,
}: {
  items: ProjectLiveBoardItem[]
  locale: string
  className?: string
  canManage?: boolean
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = items.find((item) => item.id === selectedId) ?? null
  const located = useMemo(
    () =>
      items.filter(
        (item) =>
          item.showOnLiveBoard !== false && item.latitude != null && item.longitude != null,
      ),
    [items],
  )
  const overlays = useMemo(
    () => ({
      markers: located.map((item) => ({
        id: item.id,
        lat: item.latitude as number,
        lng: item.longitude as number,
        kind: 'project' as const,
        tone: item.status ? statusTone[item.status] : 'not-started',
        color: projectColor(item.color),
        badge: escapeHtml(item.code),
        title: escapeHtml(item.systemName),
        nearTitle: escapeHtml(item.systemName),
        hint: item.address ? escapeHtml(item.address) : undefined,
        pulse:
          item.importance === projectImportances.HIGH ||
          item.importance === projectImportances.VERY_HIGH,
        pulseStrong: item.importance === projectImportances.VERY_HIGH,
        selected: selectedId === item.id,
      })),
    }),
    [located, selectedId],
  )

  useEffect(() => {
    if (selectedId && !items.some((item) => item.id === selectedId)) {
      setSelectedId(null)
    }
  }, [items, selectedId])

  return (
    <div className={`live-board-map-shell ${className}`}>
      <div className="live-board-map-ring">
        <div className="live-board-map-frame">
          <OsmMapPicker
            latitude=""
            longitude=""
            onChange={() => undefined}
            variant="always"
            readOnly
            fill
            plainChrome
            maxBounds={QESHM_LIVE_BOARD_BOUNDS}
            overlays={overlays}
            onMapClick={() => setSelectedId(null)}
            onMarkerClick={(id) => setSelectedId((current) => (current === id ? null : id))}
          />
          {selected ? (
            <ProjectMapCard
              key={selected.id}
              project={selected}
              locale={locale}
              canManage={canManage}
              onClose={() => setSelectedId(null)}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
