import {
  CalendarRange,
  ClipboardList,
  ExternalLink,
  Eye,
  FolderKanban,
  Globe,
  Handshake,
  Landmark,
  MapPin,
  Mic,
  Monitor,
  ScrollText,
  Tags,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { DateText } from '../../components/ui/DateText'
import { Button } from '../../components/ui/Form'
import { FormFactTile } from '../../components/ui/FormLayout'
import {
  OsmMapPicker,
  type MapOverlayMarkerTone,
  type MapSelectedContainerPoint,
} from '../../components/ui/OsmMapPicker'
import { api } from '../../lib/api'
import { calendarDaysUntil, formatNumber } from '../../lib/datetime'
import { QESHM_LIVE_BOARD_BOUNDS } from '../../lib/geo'
import { projectColor, projectColorAlpha } from '../../lib/project-color'
import { ProjectProgressForm } from './progress/ProjectProgressForm'
import { projectProgressEntryPath } from './progress/progress-paths'
import {
  projectImportances,
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

const MAP_SHEET_WIDTH = 420

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

function mapSheetLeft(anchor: MapSelectedContainerPoint | null) {
  const mapWidth = anchor?.width ?? 0
  const width = Math.min(MAP_SHEET_WIDTH, Math.max(mapWidth - 24, 0) || MAP_SHEET_WIDTH)
  if (!anchor || mapWidth < 500) return 12
  return Math.min(Math.max(anchor.x - width / 2, 12), mapWidth - width - 12)
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

function MiniProgressRing({
  value,
  locale,
  color,
}: {
  value: number | null
  locale: string
  color: string
}) {
  const { t } = useTranslation()
  const pct = Math.min(100, Math.max(0, value ?? 0))
  const label = value == null ? '—' : `${formatNumber(value, locale)}٪`
  return (
    <div
      className="relative size-11 shrink-0 rounded-full p-[2.5px]"
      style={{ background: `conic-gradient(${color} ${pct * 3.6}deg, #e8f4f2 0deg)` }}
      title={`${t('projects.progress')} ${label}`}
      aria-label={`${t('projects.progress')} ${label}`}
    >
      <div className="flex size-full items-center justify-center rounded-full bg-white">
        <span className="px-0.5 text-[10px] font-bold tabular-nums leading-none text-ink-900">
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
}: {
  daysLabel: string
  overdue: boolean
  title: string
  label: string
}) {
  return (
    <div
      className={`flex size-11 shrink-0 flex-col items-center justify-center rounded-full border bg-white text-center ${
        overdue
          ? 'border-ink-300 shadow-[0_4px_10px_rgba(20,40,40,0.08)]'
          : 'border-mint-200 shadow-[0_4px_10px_rgba(63,214,190,0.18)]'
      }`}
      title={`${title} ${daysLabel}`}
      aria-label={`${title} ${daysLabel}`}
    >
      <span
        className={`text-[12px] font-bold tabular-nums leading-none ${
          overdue ? 'text-ink-800' : 'text-mint-700'
        }`}
      >
        {daysLabel}
      </span>
      <span className="mt-0.5 text-[9px] font-medium leading-none text-ink-500">{label}</span>
    </div>
  )
}

function ProjectMapCard({
  project,
  locale,
  anchor,
  canManage,
  onClose,
}: {
  project: ProjectLiveBoardItem
  locale: string
  anchor: MapSelectedContainerPoint | null
  canManage: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [panel, setPanel] = useState<'none' | 'details' | 'progress'>('none')
  const [entered, setEntered] = useState(false)
  const theme = liveBoardCardTheme[project.status ?? 'NOT_STARTED'] ?? liveBoardCardTheme.NOT_STARTED
  const contractor = project.mainContractor?.name || project.companyName
  const showDetails = panel === 'details'
  const showProgress = panel === 'progress'
  const remainingDays = calendarDaysUntil(project.endDate)
  const overdue = remainingDays != null && remainingDays < 0
  const fullBleed = (anchor?.width ?? 800) < 500
  const daysLabel = remainingDays == null ? '—' : formatNumber(Math.abs(remainingDays), locale)
  const daysTitle = overdue ? t('projectLiveBoard.overdueDays') : t('projectLiveBoard.remainingDays')
  const daysShort = overdue
    ? t('projectLiveBoard.overdueDaysShort')
    : t('projectLiveBoard.remainingDaysShort')

  useEffect(() => {
    setPanel('none')
  }, [project.id])

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setEntered(true))
    return () => window.cancelAnimationFrame(id)
  }, [])

  return (
    <aside
      className={`absolute bottom-0 z-[1000] flex flex-col overflow-hidden rounded-t-3xl border-x border-t bg-white transition-transform duration-300 ease-out ${
        fullBleed ? 'inset-x-3' : 'w-[min(calc(100%-1.5rem),26.25rem)]'
      } ${entered ? 'translate-y-0' : 'translate-y-full'} ${
        showProgress || showDetails ? 'max-h-[min(82%,36rem)]' : ''
      }`}
      style={{
        ...(fullBleed ? {} : { left: mapSheetLeft(anchor) }),
        borderColor: projectColorAlpha(project.color, 0.28),
        borderInlineStartWidth: 4,
        borderInlineStartStyle: 'solid',
        borderInlineStartColor: projectColor(project.color),
        borderTopWidth: 4,
        borderTopStyle: 'solid',
        borderTopColor: projectColor(project.color),
        boxShadow: `0 -12px 32px ${projectColorAlpha(project.color, 0.2)}`,
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="h-1.5 shrink-0" style={{ background: projectColor(project.color) }} />
      <div
        className={`relative flex-1 px-4 py-3.5 ${
          showProgress || showDetails ? 'min-h-0 overflow-auto' : 'overflow-hidden'
        }`}
      >
        <div className="flex items-start gap-2.5">
          <div className="min-w-0 flex-1 pe-1">
            <h2 className="text-base font-bold leading-6 text-ink-900">{project.systemName}</h2>
            {contractor ? (
              <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-ink-600">
                <Handshake className="size-3.5 shrink-0 text-teal-600" aria-hidden />
                <span className="truncate">{contractor}</span>
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <MiniProgressRing
              value={project.progressPercent}
              locale={locale}
              color={theme.ring}
            />
            <MiniDaysBadge
              daysLabel={daysLabel}
              overdue={overdue}
              title={daysTitle}
              label={daysShort}
            />
            {canManage ? (
              <button
                type="button"
                className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-teal-400 bg-white text-teal-700 shadow-[0_4px_12px_rgba(46,189,182,0.16)] hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                aria-label={t('projectLiveBoard.close')}
                onClick={onClose}
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
        {!showProgress && project.lastActivity ? (
          <div className="mt-3 flex items-start gap-2 rounded-2xl border border-mint-100 bg-gradient-to-e from-mint-50/80 to-teal-50/40 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-xs font-medium text-ink-500">{t('projectLiveBoard.lastActivity')}</p>
              <LastActivityPreview
                activity={project.lastActivity}
                empty={t('projectLiveBoard.noActivity')}
                size="comfortable"
              />
            </div>
            {canManage ? (
              <Link
                to={projectProgressEntryPath(project.id, project.lastActivity.id)}
                aria-label={t('projectLiveBoard.openActivity')}
                className="shrink-0"
                onClick={(event) => event.stopPropagation()}
              >
                <Button type="button" variant="ghost" icon>
                  <Eye className="size-4" aria-hidden />
                </Button>
              </Link>
            ) : null}
          </div>
        ) : null}
        <div className="mt-3 space-y-2.5">
          <div className={canManage ? 'grid grid-cols-2 gap-2' : 'flex justify-center'}>
            {canManage ? (
              <Button
                type="button"
                className="w-full gap-1.5 px-3 py-2.5 text-sm"
                onClick={() => setPanel((current) => (current === 'progress' ? 'none' : 'progress'))}
              >
                <Mic className="size-4 shrink-0" aria-hidden />
                {showProgress ? t('projectLiveBoard.hideProgress') : t('projectLiveBoard.addProgress')}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="soft"
              className={`gap-1.5 px-3 py-2 text-sm ${canManage ? 'w-full' : 'w-auto'}`}
              onClick={() => setPanel((current) => (current === 'details' ? 'none' : 'details'))}
            >
              <Monitor className="size-4 shrink-0" aria-hidden />
              {showDetails ? t('projectLiveBoard.hideDetails') : t('projectLiveBoard.viewDetails')}
            </Button>
          </div>
          {canManage && showProgress ? (
            <div className="rounded-2xl border border-teal-100 bg-cream-50/70 p-3">
              <ProjectProgressForm
                embedded
                onSubmit={async (payload) => {
                  await api.post(`/projects/${project.id}/progress`, payload)
                  toast.success(t('projectProgress.created'))
                  await queryClient.invalidateQueries({ queryKey: ['projects', 'live-board'] })
                  await queryClient.invalidateQueries({ queryKey: ['public', 'projects', 'live-board'] })
                  setPanel('none')
                }}
              />
            </div>
          ) : null}
          {showDetails ? (
            <div className="space-y-2">
              <FormFactTile
                icon={Landmark}
                label={t('projects.operators')}
                value={projectOperatorsText(project.operators) || '—'}
                empty={!project.operators?.length}
                compact
              />
              <FormFactTile
                icon={Tags}
                label={t('projects.importance')}
                value={<ProjectImportanceBadge value={project.importance} />}
                compact
              />
              <FormFactTile
                icon={CalendarRange}
                label={t('projects.startDate')}
                value={project.startDate ? <DateText value={project.startDate} /> : '—'}
                empty={!project.startDate}
                compact
              />
              <FormFactTile
                icon={CalendarRange}
                label={t('projects.endDate')}
                value={project.endDate ? <DateText value={project.endDate} /> : '—'}
                empty={!project.endDate}
                compact
                tone="mint"
              />
              <FormFactTile
                icon={ClipboardList}
                label={t('projectLiveBoard.activityCount')}
                value={formatNumber(project.activityCount, locale)}
                compact
              />
              {project.systemUrl ? (
                <FormFactTile
                  icon={Globe}
                  label={t('projects.systemUrl')}
                  value={<ProjectUrl value={project.systemUrl} />}
                  compact
                />
              ) : null}
              {project.address ? (
                <FormFactTile
                  icon={MapPin}
                  label={t('projects.address')}
                  value={project.address}
                  compact
                />
              ) : null}
              {project.description ? (
                <FormFactTile
                  icon={ScrollText}
                  label={t('projects.description')}
                  value={project.description}
                  compact
                />
              ) : null}
              {canManage ? (
                <Link to={`/projects/${project.id}`} className="block">
                  <Button type="button" className="w-full">
                    <FolderKanban className="size-4" aria-hidden />
                    {t('projectLiveBoard.openProject')}
                  </Button>
                </Link>
              ) : null}
            </div>
          ) : null}
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
}: {
  items: ProjectLiveBoardItem[]
  locale: string
  className?: string
  canManage?: boolean
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [markerPoint, setMarkerPoint] = useState<MapSelectedContainerPoint | null>(null)
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
            onSelectedContainerPoint={selectedId ? setMarkerPoint : undefined}
          />
          {selected ? (
            <ProjectMapCard
              key={selected.id}
              project={selected}
              locale={locale}
              anchor={markerPoint}
              canManage={canManage}
              onClose={() => setSelectedId(null)}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
