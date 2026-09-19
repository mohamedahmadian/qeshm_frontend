import {
  ClipboardList,
  Download,
  ExternalLink,
  FolderKanban,
  Handshake,
  Paperclip,
  Percent,
  Radio,
  Sparkles,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { DateText } from '../../components/ui/DateText'
import { Button } from '../../components/ui/Form'
import { FormSectionTitle } from '../../components/ui/FormLayout'
import {
  OsmMapPicker,
  type MapOverlayMarker,
  type MapOverlayMarkerTone,
  type MapOverlayPolygon,
} from '../../components/ui/OsmMapPicker'
import { languageDir } from '../../i18n'
import { api, getProjectDocumentUrl } from '../../lib/api'
import { calendarDaysUntil, formatNumber } from '../../lib/datetime'
import {
  projectBoundaryCenter,
  projectBoundaryPolygons,
  projectHasMapLocation,
  QESHM_LIVE_BOARD_BOUNDS,
} from '../../lib/geo'
import { projectColor, projectColorAlpha, progressTone } from '../../lib/project-color'
import { ProjectProgressForm, type ProjectProgressPayload } from './progress/ProjectProgressForm'
import { projectProgressEntryPath } from './progress/progress-paths'
import {
  projectImportances,
  type ProjectLiveBoardActivity,
  type ProjectLiveBoardItem,
  type ProjectDocument,
  type ProjectStatus,
} from '../../types/app'

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

function activityFullText(activity: ProjectLiveBoardActivity) {
  const text = activity.text?.trim()
  if (text) return text
  return [activity.title, activity.excerpt].filter(Boolean).join('\n').trim()
}

function truncateActivityPreview(text: string, maxChars = 150) {
  const compact = text.replace(/\s+/g, ' ').trim()
  if (compact.length <= maxChars) return compact
  return `${compact.slice(0, maxChars).trimEnd()}...`
}

function LiveBoardActivityCard({
  activity,
  onOpen,
}: {
  activity: ProjectLiveBoardActivity
  onOpen: (activity: ProjectLiveBoardActivity) => void
}) {
  const preview = truncateActivityPreview(activityFullText(activity))
  return (
    <button
      type="button"
      className="live-board-activity-card"
      onClick={() => onOpen(activity)}
    >
      <span className="live-board-activity-card-date">
        <DateText value={activity.occurredAt} />
      </span>
      <p className="live-board-activity-card-text">{preview || '—'}</p>
    </button>
  )
}

function LiveBoardActivityFullModal({
  activity,
  onClose,
}: {
  activity: ProjectLiveBoardActivity
  onClose: () => void
}) {
  const { t } = useTranslation()
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat) return
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [onClose])
  return createPortal(
    <div
      className="live-board-activity-full-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        event.stopPropagation()
        onClose()
      }}
    >
      <div className="live-board-activity-full-card" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="absolute left-3 top-3 z-20 inline-flex size-9 cursor-pointer items-center justify-center rounded-2xl border border-teal-400 bg-white text-ink-700 shadow-[0_4px_12px_rgba(46,189,182,0.16)] transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
          aria-label={t('common.close')}
          onClick={onClose}
        >
          <X className="size-4" aria-hidden />
        </button>
        <div className="live-board-activity-full-body">
          <p className="live-board-activity-full-title">{t('projectLiveBoard.activityFull')}</p>
          <span className="live-board-activity-card-date">
            <DateText value={activity.occurredAt} />
          </span>
          <p className="live-board-activity-full-text mt-3">{activityFullText(activity) || '—'}</p>
        </div>
      </div>
    </div>,
    document.body,
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
  size?: 'xs' | 'sm' | 'md' | 'lg'
}) {
  const { t } = useTranslation()
  const pct = Math.min(100, Math.max(0, value ?? 0))
  const label = value == null ? '—' : `${formatNumber(value, locale)}٪`
  const box =
    size === 'lg'
      ? 'size-[4.75rem] p-[3.5px]'
      : size === 'md'
        ? 'size-14 p-[3px]'
        : size === 'sm'
          ? 'size-11 p-[2.5px]'
          : 'size-8 p-[2px]'
  const text =
    size === 'lg' ? 'text-sm' : size === 'md' ? 'text-xs' : size === 'sm' ? 'text-[10px]' : 'text-[9px]'
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
  size?: 'xs' | 'sm' | 'md' | 'lg'
}) {
  const box =
    size === 'lg' ? 'size-[4.75rem]' : size === 'md' ? 'size-14' : size === 'sm' ? 'size-11' : 'size-8'
  const number =
    size === 'lg' ? 'text-base' : size === 'md' ? 'text-sm' : size === 'sm' ? 'text-[12px]' : 'text-[11px]'
  const caption =
    size === 'lg' ? 'text-[11px]' : size === 'md' ? 'text-[10px]' : size === 'sm' ? 'text-[9px]' : 'text-[8px]'
  return (
    <div
      className={`live-board-days-badge flex shrink-0 flex-col items-center justify-center rounded-full border bg-white text-center ${box}${
        overdue ? ' is-overdue' : ''
      }`}
      title={`${title} ${daysLabel}`}
      aria-label={`${title} ${daysLabel}`}
    >
      <span className={`live-board-days-badge-value font-bold tabular-nums leading-none ${number}`}>
        {daysLabel}
      </span>
      <span className={`live-board-days-badge-caption mt-0.5 font-medium leading-none ${caption}`}>
        {label}
      </span>
    </div>
  )
}

function ProjectMapAttachments({
  projectId,
  canManage,
  compact = false,
}: {
  projectId: string
  canManage: boolean
  compact?: boolean
}) {
  const { t } = useTranslation()
  const query = useQuery({
    queryKey: ['project-documents', projectId],
    queryFn: async () => {
      const { data } = await api.get<ProjectDocument[]>(
        `/public/projects/${projectId}/documents`,
      )
      return data
    },
  })
  const items = query.data ?? []
  if (query.isLoading || items.length === 0) return null
  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      <FormSectionTitle icon={Paperclip}>{t('projectDocuments.section')}</FormSectionTitle>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start justify-between gap-2 rounded-2xl bg-white px-3 py-2 ring-1 ring-teal-100"
          >
            <div className="min-w-0 text-start">
              <p className="truncate text-sm font-semibold text-ink-900">{item.title}</p>
              {item.description ? (
                <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-ink-500">
                  {item.description}
                </p>
              ) : null}
              <p className="mt-0.5 truncate text-[11px] text-ink-400">{item.originalName}</p>
            </div>
            <a href={getProjectDocumentUrl(projectId, item.id)} className="shrink-0">
              <Button type="button" variant="ghost" className="h-8 px-3 py-0 text-xs">
                <Download className="size-3.5" aria-hidden />
                {t('projectDocuments.download')}
              </Button>
            </a>
          </li>
        ))}
      </ul>
      {canManage ? (
        <Link to={`/projects/${projectId}/documents`} className="block">
          <Button type="button" variant="soft" className={compact ? 'h-8 px-3 py-0 text-xs' : undefined}>
            <Paperclip className="size-4" aria-hidden />
            {t('projectDocuments.manage')}
          </Button>
        </Link>
      ) : null}
    </div>
  )
}

function projectBoardMeta(
  project: ProjectLiveBoardItem,
  locale: string,
  t: (key: string) => string,
) {
  const theme = liveBoardCardTheme[project.status ?? 'NOT_STARTED'] ?? liveBoardCardTheme.NOT_STARTED
  const remainingDays = calendarDaysUntil(project.endDate)
  const overdue = remainingDays != null && remainingDays < 0
  const daysLabel = remainingDays == null ? '—' : formatNumber(Math.abs(remainingDays), locale)
  const daysTitle = overdue ? t('projectLiveBoard.overdueDays') : t('projectLiveBoard.remainingDays')
  const daysShort = overdue
    ? t('projectLiveBoard.overdueDaysShort')
    : t('projectLiveBoard.remainingDaysShort')
  return { theme, overdue, daysLabel, daysTitle, daysShort }
}

export function LiveBoardHeaderStats({
  project,
  locale,
  size = 'lg',
}: {
  project: ProjectLiveBoardItem
  locale: string
  size?: 'sm' | 'lg'
}) {
  const { t } = useTranslation()
  const { theme, overdue, daysLabel, daysTitle, daysShort } = projectBoardMeta(project, locale, t)
  const compact = size === 'sm'
  return (
    <div className={`flex shrink-0 items-center ${compact ? 'gap-1.5' : 'gap-2.5'}`}>
      <div
        className={`live-board-stat-chip${compact ? ' is-compact' : ''}`}
        title={`${t('projects.progress')} ${
          project.progressPercent == null ? '—' : `${formatNumber(project.progressPercent, locale)}٪`
        }`}
      >
        <MiniProgressRing
          value={project.progressPercent}
          locale={locale}
          color={theme.ring}
          size={compact ? 'sm' : 'lg'}
        />
        {compact ? null : (
          <span className="live-board-stat-chip-label">{t('projects.progress')}</span>
        )}
      </div>
      <div
        className={`live-board-stat-chip${overdue ? ' is-overdue' : ''}${compact ? ' is-compact' : ''}`}
        title={`${daysTitle} ${daysLabel}`}
      >
        <MiniDaysBadge
          daysLabel={daysLabel}
          overdue={overdue}
          title={daysTitle}
          label={daysShort}
          size={compact ? 'sm' : 'lg'}
        />
        {compact ? null : <span className="live-board-stat-chip-label">{daysTitle}</span>}
      </div>
    </div>
  )
}

export function ProjectSystemNameBanner({
  name,
  color,
  compact = false,
}: {
  name: string
  color?: string | null
  compact?: boolean
}) {
  return (
    <div className={`live-board-system-name${compact ? ' is-compact' : ''}`}>
      {compact ? null : (
        <span className="live-board-system-name-orbit" aria-hidden>
          <Sparkles className="live-board-system-name-icon is-a" />
          <Radio className="live-board-system-name-icon is-b" />
        </span>
      )}
      <ProjectColorLamp color={color} />
      <span className="live-board-system-name-text">{name}</span>
      {compact ? null : (
        <span className="live-board-system-name-orbit" aria-hidden>
          <FolderKanban className="live-board-system-name-icon is-c" />
          <Sparkles className="live-board-system-name-icon is-d" />
        </span>
      )}
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
  const [entered, setEntered] = useState(false)
  const [openActivity, setOpenActivity] = useState<ProjectLiveBoardActivity | null>(null)
  const contractor = project.mainContractor?.name || project.companyName
  const activities = (project.recentActivities?.length
    ? project.recentActivities
    : project.lastActivity
      ? [project.lastActivity]
      : []
  ).slice(0, 3)

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setEntered(true))
    return () => window.cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat) return
      event.preventDefault()
      onClose()
    }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  async function saveProgressFromForm(payload: ProjectProgressPayload) {
    await api.post(`/projects/${project.id}/progress`, payload)
    toast.success(t('projectProgress.created'))
    await queryClient.invalidateQueries({ queryKey: ['projects', 'live-board'] })
    await queryClient.invalidateQueries({ queryKey: ['public', 'projects', 'live-board'] })
    onClose()
  }

  return createPortal(
    <div
      className={`live-board-project-overlay ${entered ? 'is-open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-board-project-title"
      onClick={onClose}
    >
      <div
        className={`live-board-project-sheet ${entered ? 'is-open' : ''}${
          canManage ? ' is-manage' : activities.length ? ' is-activities' : ''
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="h-1 shrink-0" style={{ background: projectColor(project.color) }} />
        <button
          type="button"
          className="absolute left-3 top-3 z-20 inline-flex size-9 cursor-pointer items-center justify-center rounded-2xl border border-teal-400 bg-white text-ink-700 shadow-[0_4px_12px_rgba(46,189,182,0.16)] transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
          aria-label={t('common.close')}
          onClick={onClose}
        >
          <X className="size-4" aria-hidden />
        </button>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-[max(0.9rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
          <div className="mx-auto w-full max-w-xl space-y-3">
            <div className="flex items-start gap-2 pl-12" dir="ltr">
              <div className="min-w-0 flex-1 text-start" dir={languageDir(locale)}>
                <h2
                  id="live-board-project-title"
                  className="text-sm font-bold leading-5 text-ink-900"
                >
                  {project.systemName}
                </h2>
                {contractor ? (
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-600">
                    <Handshake className="size-3.5 shrink-0 text-teal-600" aria-hidden />
                    <span className="whitespace-normal break-words">{contractor}</span>
                  </p>
                ) : null}
              </div>
              <LiveBoardHeaderStats project={project} locale={locale} size="sm" />
            </div>
            {canManage ? (
              <ProjectProgressForm key={project.id} onSubmit={saveProgressFromForm} />
            ) : activities.length ? (
              <div className="live-board-activity-list">
                {activities.map((activity) => (
                  <LiveBoardActivityCard
                    key={activity.id}
                    activity={activity}
                    onOpen={setOpenActivity}
                  />
                ))}
              </div>
            ) : null}
            <ProjectMapAttachments projectId={project.id} canManage={canManage} compact />
          </div>
        </div>
      </div>
      {openActivity ? (
        <LiveBoardActivityFullModal activity={openActivity} onClose={() => setOpenActivity(null)} />
      ) : null}
    </div>,
    document.body,
  )
}

const ALL_GROUPS = 'all'
const LAPTOP_MQ = '(min-width: 640px)'

function shouldOpenSheetOnSelect(mode: boolean | 'mobile') {
  if (mode === true) return true
  if (mode === false) return false
  return typeof window === 'undefined' ? false : !window.matchMedia(LAPTOP_MQ).matches
}

type LiveBoardGroupChip = {
  id: string
  name: string
  color: string
  count: number
}

function LiveBoardGroupBadge({
  chip,
  selected,
  locale,
  onSelect,
}: {
  chip: LiveBoardGroupChip
  selected: boolean
  locale: string
  onSelect: (id: string) => void
}) {
  const color = projectColor(chip.color)
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      className={`live-board-group-badge${selected ? ' is-active' : ''}`}
      style={
        {
          '--badge-color': color,
          '--badge-soft': projectColorAlpha(color, 0.14),
          '--badge-ring': projectColorAlpha(color, 0.32),
          '--badge-glow': projectColorAlpha(color, 0.2),
        } as CSSProperties
      }
      onClick={() => onSelect(chip.id)}
    >
      <span className="live-board-group-badge-dot" aria-hidden />
      <span className="live-board-group-badge-label">{chip.name}</span>
      <span className="live-board-group-badge-count">{formatNumber(chip.count, locale)}</span>
    </button>
  )
}

function LiveBoardGroupBadges({
  located,
  selectedId,
  locale,
  onSelect,
}: {
  located: ProjectLiveBoardItem[]
  selectedId: string
  locale: string
  onSelect: (id: string) => void
}) {
  const { t } = useTranslation()
  const chips = useMemo(() => {
    const byId = new Map<string, LiveBoardGroupChip>()
    for (const item of located) {
      if (!item.group) continue
      const current = byId.get(item.group.id)
      if (current) {
        current.count += 1
      } else {
        byId.set(item.group.id, {
          id: item.group.id,
          name: item.group.name,
          color: projectColor(item.group.color),
          count: 1,
        })
      }
    }
    const named = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, locale))
    if (!named.length) return []
    return [
      {
        id: ALL_GROUPS,
        name: t('projectLiveBoard.allCategories'),
        color: '#2ebdb6',
        count: located.length,
      },
      ...named,
    ]
  }, [located, locale, t])

  if (!chips.length) return null

  return (
    <div
      className="live-board-group-badges"
      role="tablist"
      aria-label={t('projectLiveBoard.categories')}
      dir={languageDir(locale)}
    >
      {chips.map((chip) => (
        <LiveBoardGroupBadge
          key={chip.id}
          chip={chip}
          selected={selectedId === chip.id}
          locale={locale}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

function LiveBoardLastActivityPanel({
  project,
  locale,
  canManage,
}: {
  project: ProjectLiveBoardItem
  locale: string
  canManage: boolean
}) {
  const { t } = useTranslation()
  const activity = project.lastActivity
  return (
    <section
      className="live-board-last-activity"
      dir={languageDir(locale)}
      aria-label={t('projectLiveBoard.lastActivity')}
    >
      <div className="live-board-last-activity-head">
        <span className="live-board-last-activity-icon" aria-hidden>
          <ClipboardList />
        </span>
        <p className="live-board-last-activity-title">{t('projectLiveBoard.lastActivity')}</p>
        {activity ? (
          <span className="live-board-last-activity-date">
            <DateText value={activity.occurredAt} withTime />
          </span>
        ) : null}
      </div>
      <div className="live-board-last-activity-body">
        {activity ? (
          <LastActivityPreview
            activity={activity}
            projectId={canManage ? project.id : undefined}
            empty={t('projectLiveBoard.noActivity')}
            size="comfortable"
          />
        ) : (
          <p className="live-board-last-activity-empty">{t('projectLiveBoard.noActivity')}</p>
        )}
      </div>
    </section>
  )
}

function LiveBoardProgressPanel({
  value,
  locale,
}: {
  value: number | null
  locale: string
}) {
  const { t } = useTranslation()
  const pct = Math.min(100, Math.max(0, value ?? 0))
  const label = value == null ? '—' : `${formatNumber(Math.round(pct), locale)}٪`
  const ticks = [100, 75, 50, 25, 0]
  const tone = progressTone(value)
  const toneSoft = progressTone(pct * 0.35)
  return (
    <aside
      className="live-board-progress-panel"
      dir={languageDir(locale)}
      aria-label={`${t('projectLiveBoard.progressPanel')} ${label}`}
    >
      <div className="live-board-progress-panel-head">
        <span className="live-board-progress-panel-icon" aria-hidden>
          <Percent />
        </span>
        <p className="live-board-progress-panel-title">{t('projectLiveBoard.progressPanel')}</p>
      </div>
      <p className="live-board-progress-panel-value" style={{ color: tone }}>
        {label}
      </p>
      <div className="live-board-progress-track" aria-hidden>
        <div className="live-board-progress-ticks">
          {ticks.map((tick) => (
            <span key={tick} className="live-board-progress-tick" style={{ bottom: `${tick}%` }}>
              {formatNumber(tick, locale)}
            </span>
          ))}
        </div>
        <div className="live-board-progress-bar">
          <div
            className="live-board-progress-fill"
            style={
              {
                '--fill-pct': `${value == null ? 0 : pct}%`,
                '--fill-color': tone,
                '--fill-soft': toneSoft,
                '--fill-glow': projectColorAlpha(tone, 0.42),
              } as CSSProperties
            }
          />
        </div>
      </div>
    </aside>
  )
}

export function ProjectLiveBoardMap({
  items,
  locale,
  className = 'relative h-[28rem] min-h-[20rem] overflow-hidden sm:h-[34rem]',
  canManage = true,
  onSelectedChange,
  openSheetOnSelect = true,
  detailsOpen: detailsOpenProp,
  onDetailsOpenChange,
}: {
  items: ProjectLiveBoardItem[]
  locale: string
  className?: string
  canManage?: boolean
  onSelectedChange?: (project: ProjectLiveBoardItem | null) => void
  openSheetOnSelect?: boolean | 'mobile'
  detailsOpen?: boolean
  onDetailsOpenChange?: (open: boolean) => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [groupFilter, setGroupFilter] = useState(ALL_GROUPS)
  const [detailsOpenState, setDetailsOpenState] = useState(false)
  const detailsOpen = detailsOpenProp ?? detailsOpenState
  const selected = items.find((item) => item.id === selectedId) ?? null

  function setDetailsOpen(open: boolean) {
    onDetailsOpenChange?.(open)
    if (detailsOpenProp === undefined) setDetailsOpenState(open)
  }
  const [progressProject, setProgressProject] = useState<ProjectLiveBoardItem | null>(null)
  const onSelectedChangeRef = useRef(onSelectedChange)
  onSelectedChangeRef.current = onSelectedChange
  const located = useMemo(() => items.filter(projectHasMapLocation), [items])
  const visibleLocated = useMemo(() => {
    if (groupFilter === ALL_GROUPS) return located
    return located.filter((item) => item.groupId === groupFilter)
  }, [located, groupFilter])
  const progressSource = selected ?? progressProject
  const progressValue = progressSource?.progressPercent ?? null
  const overlays = useMemo(() => {
    const markers: MapOverlayMarker[] = []
    const polygons: MapOverlayPolygon[] = []
    for (const item of visibleLocated) {
      const rings = projectBoundaryPolygons(item.boundary)
      const selected = selectedId === item.id
      const color = projectColor(item.color)
      const title = escapeHtml(item.systemName)
      if (rings.length) {
        for (const latlngs of rings) {
          polygons.push({
            id: item.id,
            latlngs,
            color,
            selected,
          })
        }
      }
      const pin =
        item.latitude != null && item.longitude != null
          ? { lat: item.latitude, lng: item.longitude }
          : projectBoundaryCenter(item.boundary)
      if (!pin) continue
      markers.push({
        id: item.id,
        lat: pin.lat,
        lng: pin.lng,
        kind: 'project' as const,
        tone: item.status ? statusTone[item.status] : 'not-started',
        color,
        badge: escapeHtml(item.code),
        title,
        nearTitle: title,
        hint: item.address ? escapeHtml(item.address) : undefined,
        pulse:
          item.importance === projectImportances.HIGH ||
          item.importance === projectImportances.VERY_HIGH,
        pulseStrong: item.importance === projectImportances.VERY_HIGH,
        selected,
      })
    }
    return { markers, polygons }
  }, [visibleLocated, selectedId])

  useEffect(() => {
    if (selectedId && !visibleLocated.some((item) => item.id === selectedId)) {
      setSelectedId(null)
    }
  }, [visibleLocated, selectedId])

  useEffect(() => {
    if (!selected && detailsOpen) setDetailsOpen(false)
  }, [selected, detailsOpen])

  useEffect(() => {
    onSelectedChangeRef.current?.(selected)
  }, [selected])

  useEffect(() => {
    return () => onSelectedChangeRef.current?.(null)
  }, [])

  useEffect(() => {
    if (!selectedId) return
    function onPagePointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Element)) return
      if (
        target.closest(
          '.leaflet-container, .leaflet-marker-icon, .leaflet-interactive, .leaflet-tooltip, .live-board-project-overlay, .live-board-activity-full-overlay, .live-board-group-badge, .live-board-last-activity, .live-board-progress-panel, .live-board-map-card header, .live-board-map-toolbar, .live-board-quick-record, button, a, input, textarea, [data-sonner-toast]',
        )
      ) {
        return
      }
      setSelectedId(null)
      setDetailsOpen(false)
    }
    document.addEventListener('pointerdown', onPagePointerDown)
    return () => document.removeEventListener('pointerdown', onPagePointerDown)
  }, [selectedId])

  useEffect(() => {
    if (selected) {
      setProgressProject(selected)
      return
    }
    const id = window.setTimeout(() => setProgressProject(null), 320)
    return () => window.clearTimeout(id)
  }, [selected])

  return (
    <>
      <div className={`live-board-map-shell ${className}`}>
        <LiveBoardGroupBadges
          located={located}
          selectedId={groupFilter}
          locale={locale}
          onSelect={(id) => setGroupFilter((current) => (current === id && id !== ALL_GROUPS ? ALL_GROUPS : id))}
        />
        <div className="live-board-map-stage">
          <div className={`live-board-progress-slot${selected ? ' is-open' : ''}`}>
            {progressSource ? (
              <LiveBoardProgressPanel value={progressValue} locale={locale} />
            ) : null}
          </div>
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
                zoomOnSelected
                onMapClick={() => {
                  setSelectedId(null)
                  setDetailsOpen(false)
                }}
                onMarkerClick={(id) => {
                  const next = selectedId === id ? null : id
                  setSelectedId(next)
                  setDetailsOpen(Boolean(next) && shouldOpenSheetOnSelect(openSheetOnSelect))
                }}
              />
            </div>
          </div>
        </div>
        {selected?.lastActivity ? (
          <LiveBoardLastActivityPanel
            project={selected}
            locale={locale}
            canManage={canManage}
          />
        ) : null}
      </div>
      {selected && detailsOpen ? (
        <ProjectMapCard
          key={selected.id}
          project={selected}
          locale={locale}
          canManage={canManage}
          onClose={() => setDetailsOpen(false)}
        />
      ) : null}
    </>
  )
}
