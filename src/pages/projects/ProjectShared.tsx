import { useTranslation } from 'react-i18next'
import { GeoStatus } from '../geo/GeoShared'
import { projectImportances, type ProjectImportance } from '../../types/app'

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
