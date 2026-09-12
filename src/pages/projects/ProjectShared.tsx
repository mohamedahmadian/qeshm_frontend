import { useTranslation } from 'react-i18next'
import { GeoStatus } from '../geo/GeoShared'
import { formatNumber } from '../../lib/datetime'
import { projectColor, projectColorAlpha } from '../../lib/project-color'
import {
  projectImportances,
  projectStatuses,
  type ProjectImportance,
  type ProjectStatus as ProjectLifecycle,
} from '../../types/app'

export function ProjectColorDot({
  color,
  className = 'size-2.5',
}: {
  color?: string | null
  className?: string
}) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full ${className}`}
      style={{
        background: projectColor(color),
        boxShadow: `0 0 0 2px #fff, 0 2px 6px ${projectColorAlpha(color, 0.32)}`,
      }}
      aria-hidden
    />
  )
}

export function ProjectNameWithColor({
  name,
  color,
}: {
  name: string
  color?: string | null
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <ProjectColorDot color={color} />
      <span className="min-w-0">{name}</span>
    </span>
  )
}

export function projectOperatorsText(operators?: { name: string }[]) {
  if (!operators?.length) return ''
  return operators.map((item) => item.name).join('، ')
}

export const operatorsColClassName = 'w-52 max-w-52'

export function ProjectOperatorsCell({
  operators,
}: {
  operators?: { id: string; name: string }[]
}) {
  if (!operators?.length) {
    return '—'
  }
  return (
    <div className="flex min-w-0 w-full flex-col items-stretch gap-1">
      {operators.map((item) => (
        <span
          key={item.id}
          className="block max-w-full break-words rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium leading-5 text-teal-800"
        >
          {item.name}
        </span>
      ))}
    </div>
  )
}

export function withCurrent(values: string[] | undefined, current: string) {
  const next = new Set(values ?? [])
  const trimmed = current.trim()
  if (trimmed) next.add(trimmed)
  return [...next].sort((a, b) => a.localeCompare(b, 'fa'))
}

export function ProjectStatus({ active }: { active: boolean }) {
  return <GeoStatus active={active} />
}

const importanceClass: Record<ProjectImportance, string> = {
  [projectImportances.VERY_HIGH]: 'bg-teal-100 text-teal-800',
  [projectImportances.HIGH]: 'bg-teal-50 text-teal-700',
  [projectImportances.MEDIUM]: 'bg-cream-100 text-ink-700',
  [projectImportances.LOW]: 'bg-cream-50 text-ink-500',
}

export function ProjectImportanceBadge({ value }: { value: ProjectImportance }) {
  const { t } = useTranslation()
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${importanceClass[value]}`}
    >
      {t(`projects.importances.${value}`)}
    </span>
  )
}

const lifecycleClass: Record<ProjectLifecycle, string> = {
  [projectStatuses.NOT_STARTED]: 'bg-cream-100 text-ink-600',
  [projectStatuses.IN_PROGRESS]: 'bg-teal-50 text-teal-700',
  [projectStatuses.SUSPENDED]: 'bg-cream-50 text-ink-500',
  [projectStatuses.COMPLETED]: 'bg-mint-100 text-teal-800',
}

export function ProjectLifecycleBadge({ value }: { value: ProjectLifecycle | null }) {
  const { t } = useTranslation()
  if (!value) {
    return '—'
  }
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${lifecycleClass[value]}`}
    >
      {t(`projects.statuses.${value}`)}
    </span>
  )
}

export function ProjectProgress({ value }: { value: number | null }) {
  const { i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  if (value == null) {
    return '—'
  }
  return (
    <div className="flex min-w-24 items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream-100">
        <div className="h-full rounded-full bg-teal-500" style={{ width: `${value}%` }} />
      </div>
      <span className="shrink-0 text-xs text-ink-600">
        {formatNumber(value, locale)}٪
      </span>
    </div>
  )
}

export function ProjectUrl({ value }: { value: string | null }) {
  if (!value) {
    return '—'
  }
  if (/^https?:\/\//i.test(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        dir="ltr"
        className="break-all text-teal-700 hover:underline"
      >
        {value}
      </a>
    )
  }
  return (
    <span dir="ltr" className="break-all">
      {value}
    </span>
  )
}
