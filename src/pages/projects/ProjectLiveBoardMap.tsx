import {
  CalendarClock,
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
import { QESHM_MAP_BOUNDS, QESHM_MAP_CENTER } from '../../lib/geo'
import { projectColor, projectColorAlpha } from '../../lib/project-color'
import { ProjectProgressForm } from './progress/ProjectProgressForm'
import { projectProgressEntryPath } from './progress/progress-paths'
import type {
  ProjectLiveBoardActivity,
  ProjectLiveBoardItem,
  ProjectStatus,
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

function mapSheetWidth(mapWidth: number) {
  if (mapWidth <= 0) return 0
  return Math.min(mapWidth * 0.5, Math.max(mapWidth - 24, 0))
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

function mapSheetLeft(anchor: MapSelectedContainerPoint | null) {
  const mapWidth = anchor?.width ?? 0
  const width = mapSheetWidth(mapWidth)
  if (!anchor || mapWidth < 440) return 12
  return Math.min(Math.max(anchor.x - width / 2, 12), Math.max(mapWidth - width - 12, 12))
}

function MapProgressRing({
  value,
  locale,
  color,
}: {
  value: number | null
  locale: string
  color: string
}) {
  const pct = Math.min(100, Math.max(0, value ?? 0))
  return (
    <div
      className="relative size-[5.5rem] shrink-0 rounded-full p-[5px] shadow-[0_10px_22px_rgba(46,189,182,0.2)]"
      style={{
        background: `conic-gradient(${color} ${pct * 3.6}deg, #e8f4f2 0deg)`,
      }}
    >
      <div className="flex size-full flex-col items-center justify-center rounded-full bg-white text-center">
        <span className="text-lg font-bold tabular-nums leading-none text-ink-900">
          {value == null ? '—' : `${formatNumber(value, locale)}٪`}
        </span>
      </div>
    </div>
  )
}

function MapDaysBadge({
  days,
  overdue,
  locale,
}: {
  days: number | null
  overdue: boolean
  locale: string
}) {
  const label = days == null ? '—' : formatNumber(Math.abs(days), locale)
  return (
    <div
      className={`flex size-[5.5rem] shrink-0 flex-col items-center justify-center rounded-full border-[3px] text-center shadow-[0_10px_22px_rgba(46,189,182,0.16)] ${
        overdue
          ? 'border-ink-300 bg-gradient-to-b from-ink-50 to-white'
          : 'border-mint-400 bg-gradient-to-b from-mint-50 to-white'
      }`}
    >
      <CalendarClock
        className={`mb-1 size-4 ${overdue ? 'text-ink-600' : 'text-mint-600'}`}
        aria-hidden
      />
      <span className="text-lg font-bold tabular-nums leading-none text-ink-900">{label}</span>
    </div>
  )
}

export function LastActivityPreview({
  activity,
  projectId,
  empty = '—',
  size = 'sm',
}: {
  activity: ProjectLiveBoardActivity | null
  projectId?: string
  empty?: string
  size?: 'sm' | 'md'
}) {
  const { t } = useTranslation()
  const large = size === 'md'
  if (!activity) {
    return <span className={large ? 'text-sm text-ink-400' : 'text-[11px] text-ink-400'}>{empty}</span>
  }
  const title = activityTitle(activity.title)
  const leftover =
    activity.excerpt && activity.excerpt !== activity.title
      ? activity.excerpt
      : activity.title.replace(/\s+/g, ' ').trim().split(' ').slice(8).join(' ')
  const excerpt = excerptPreview(leftover)
  const body =
    !title && !excerpt ? (
      <span className={large ? 'text-sm text-ink-500' : 'text-[11px] text-ink-500'}>
        <DateText value={activity.occurredAt} />
      </span>
    ) : (
      <div className="min-w-0 space-y-0.5">
        {title ? (
          <p className={large ? 'text-sm font-medium leading-5 text-ink-900' : 'text-[11px] font-medium leading-4 text-ink-900'}>
            {title}
          </p>
        ) : null}
        {excerpt ? (
          <p className={large ? 'text-xs leading-5 text-ink-500' : 'text-[10px] leading-4 text-ink-500'}>
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
      <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-teal-600" aria-hidden />
    </button>
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
  const fullBleed = (anchor?.width ?? 800) < 440

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
        fullBleed ? 'inset-x-3' : 'w-1/2'
      } ${entered ? 'translate-y-0' : 'translate-y-full'} ${
        showProgress || showDetails ? 'max-h-[min(82%,40rem)]' : 'max-h-[min(58%,30rem)]'
      }`}
      style={{
        ...(fullBleed ? {} : { left: mapSheetLeft(anchor) }),
        borderColor: projectColorAlpha(project.color, 0.28),
        borderInlineStartWidth: 4,
        borderInlineStartStyle: 'solid',
        borderInlineStartColor: projectColor(project.color),
        boxShadow: `0 -12px 32px ${projectColorAlpha(project.color, 0.2)}`,
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <div className={`h-1.5 ${theme.bar}`} />
      <div className="relative min-h-0 flex-1 overflow-auto px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 pe-1">
            <h2 className="text-lg font-bold leading-6 text-ink-900">{project.systemName}</h2>
          </div>
          <button
            type="button"
            className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-teal-400 bg-white text-teal-700 shadow-[0_4px_12px_rgba(46,189,182,0.16)] hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            aria-label={t('projectLiveBoard.close')}
            onClick={onClose}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="mt-4 flex items-start justify-center gap-6">
          <div className="flex flex-col items-center gap-1.5">
            <MapProgressRing
              value={project.progressPercent}
              locale={locale}
              color={theme.ring}
            />
            <p className="text-center text-sm font-medium text-ink-600">{t('projects.progress')}</p>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <MapDaysBadge days={remainingDays} overdue={overdue} locale={locale} />
            <p className="text-center text-sm font-medium text-ink-600">
              {overdue ? t('projectLiveBoard.overdueDays') : t('projectLiveBoard.remainingDays')}
            </p>
          </div>
        </div>
        {contractor ? (
          <div className="mt-4 flex justify-center">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-teal-100 bg-teal-50/80 px-3.5 py-1.5 text-sm text-ink-800">
              <Handshake className="size-4 shrink-0 text-teal-600" aria-hidden />
              <span className="truncate font-medium">{contractor}</span>
            </div>
          </div>
        ) : null}
        {!showProgress ? (
          <div className="mt-3 flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <LastActivityPreview
                activity={project.lastActivity}
                empty={t('projectLiveBoard.noActivity')}
                size="md"
              />
            </div>
            {canManage && project.lastActivity ? (
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
        <div className="mt-2 space-y-2">
          <div className={`grid gap-2 ${canManage ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <Button
              type="button"
              variant="soft"
              className="w-full gap-1.5 px-3 py-2 text-sm"
              onClick={() => setPanel((current) => (current === 'details' ? 'none' : 'details'))}
            >
              <Monitor className="size-4 shrink-0" aria-hidden />
              {showDetails ? t('projectLiveBoard.hideDetails') : t('projectLiveBoard.viewDetails')}
            </Button>
            {canManage ? (
              <Button
                type="button"
                className="w-full gap-1.5 px-3 py-2 text-sm"
                onClick={() => setPanel((current) => (current === 'progress' ? 'none' : 'progress'))}
              >
                <Mic className="size-4 shrink-0" aria-hidden />
                {showProgress ? t('projectLiveBoard.hideProgress') : t('projectLiveBoard.addProgress')}
              </Button>
            ) : null}
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
            <div className="space-y-2.5">
              <FormFactTile
                icon={Landmark}
                label={t('projects.operators')}
                value={projectOperatorsText(project.operators) || '—'}
                empty={!project.operators?.length}
              />
              <FormFactTile
                icon={Tags}
                label={t('projects.importance')}
                value={<ProjectImportanceBadge value={project.importance} />}
              />
              <FormFactTile
                icon={CalendarRange}
                label={t('projects.startDate')}
                value={project.startDate ? <DateText value={project.startDate} /> : '—'}
                empty={!project.startDate}
              />
              <FormFactTile
                icon={CalendarRange}
                label={t('projects.endDate')}
                value={project.endDate ? <DateText value={project.endDate} /> : '—'}
                empty={!project.endDate}
                tone="mint"
              />
              <FormFactTile
                icon={ClipboardList}
                label={t('projectLiveBoard.activityCount')}
                value={formatNumber(project.activityCount, locale)}
              />
              {project.systemUrl ? (
                <FormFactTile
                  icon={Globe}
                  label={t('projects.systemUrl')}
                  value={<ProjectUrl value={project.systemUrl} />}
                />
              ) : null}
              {project.address ? (
                <FormFactTile
                  icon={MapPin}
                  label={t('projects.address')}
                  value={project.address}
                />
              ) : null}
              {project.description ? (
                <FormFactTile
                  icon={ScrollText}
                  label={t('projects.description')}
                  value={project.description}
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
        badge: '',
        title: escapeHtml(item.code),
        farTitle: escapeHtml(item.code),
        nearTitle: escapeHtml(item.systemName),
        nearZoom: 14,
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
    <div className={className}>
      <OsmMapPicker
        latitude=""
        longitude=""
        onChange={() => undefined}
        variant="always"
        readOnly
        fill
        maxBounds={QESHM_MAP_BOUNDS}
        focus={{
          lat: QESHM_MAP_CENTER.lat,
          lng: QESHM_MAP_CENTER.lng,
          zoom: 11,
          bounds: QESHM_MAP_BOUNDS,
        }}
        overlays={overlays}
        onMapClick={() => setSelectedId(null)}
        keepInView={
          selected
            ? {
                id: selected.id,
                padding: { top: 40, right: 24, bottom: 280, left: 24 },
              }
            : null
        }
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
  )
}
