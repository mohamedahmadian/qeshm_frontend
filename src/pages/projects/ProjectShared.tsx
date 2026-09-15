import { ClipboardList, Flag, Handshake, Paperclip } from 'lucide-react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { HoverTooltip } from '../../components/ui/HoverTooltip'
import {
  ActionsTh,
  EntityRowActions,
  SortableTh,
  TableCard,
  actionsColClassName,
  type SortDir,
} from '../../components/ui/ListControls'
import { Button, type DetailActionExtraItem } from '../../components/ui/Form'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { formatNumber } from '../../lib/datetime'
import { projectColor, projectColorAlpha } from '../../lib/project-color'
import {
  projectImportances,
  projectStatuses,
  type Project,
  type ProjectImportance,
  type ProjectStatus as ProjectLifecycle,
} from '../../types/app'
import { GeoStatus } from '../geo/GeoShared'
import { projectProgressCreatePath } from './progress/progress-paths'

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

export function projectManageExtraItems(
  projectId: string,
  t: TFunction,
): DetailActionExtraItem[] {
  return [
    {
      to: `/projects/${projectId}/progress`,
      icon: ClipboardList,
      label: t('projectProgress.manage'),
    },
    {
      to: `/projects/${projectId}/phases`,
      icon: Flag,
      label: t('projectPhases.manage'),
    },
    {
      to: `/projects/${projectId}/documents`,
      icon: Paperclip,
      label: t('projectDocuments.manage'),
    },
    {
      to: `/projects/${projectId}/contractors`,
      icon: Handshake,
      label: t('contractors.manage'),
    },
  ]
}

export const operatorsColClassName = 'w-52 max-w-52'

function OperatorsTooltipList({
  items,
}: {
  items: { id: string; name: string }[]
}) {
  return (
    <ul className="max-h-64 space-y-1 overflow-y-auto p-3">
      {items.map((item) => (
        <li key={item.id} className="text-sm leading-6 text-ink-800">
          {item.name}
        </li>
      ))}
    </ul>
  )
}

export function ProjectOperatorsCell({
  operators,
}: {
  operators?: { id: string; name: string }[]
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  if (!operators?.length) {
    return '—'
  }
  const first = operators[0]
  if (!first) {
    return '—'
  }
  const count = operators.length
  const chip = (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
      <span className="min-w-0 truncate rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium leading-5 text-teal-800">
        {first.name}
      </span>
      {count > 1 ? (
        <span
          className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-teal-500 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white"
          aria-label={t('projects.operatorCount', { count: formatNumber(count, locale) })}
        >
          {formatNumber(count, locale)}
        </span>
      ) : null}
    </span>
  )
  if (count <= 1) {
    return chip
  }
  return (
    <HoverTooltip
      className="max-w-full"
      label={t('projects.operators')}
      content={<OperatorsTooltipList items={operators} />}
    >
      {chip}
    </HoverTooltip>
  )
}

export const unspecifiedProjectFilter = 'none'

export function orgUnitFilterOptions(
  units: { id: string; name: string; pathLabel?: string }[],
  t: (key: string) => string,
) {
  return [
    { value: '', label: t('projects.allOrgUnits') },
    { value: unspecifiedProjectFilter, label: t('projects.unspecified') },
    ...units.map((item) => ({
      value: item.id,
      label: item.pathLabel || item.name,
    })),
  ]
}

export function projectLabelOrUnspecified(value: string | null | undefined, t: (key: string) => string) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : t('projects.unspecified')
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

export function projectContractorName(item: {
  companyName?: string | null
  mainContractor?: { name: string } | null
}) {
  return item.companyName || item.mainContractor?.name || '—'
}

export function ProjectsSummaryTable({
  rows,
  loading,
  empty,
  sortBy,
  sortDir,
  onSort,
}: {
  rows: Project[]
  loading: boolean
  empty: string
  sortBy: string
  sortDir: SortDir | ''
  onSort: (column: string) => void
}) {
  const { t } = useTranslation()
  const { confirmDelete } = useConfirmDelete()

  return (
    <TableCard loading={loading} empty={empty} hasRows={rows.length > 0}>
      <table className="w-full text-sm">
        <thead className="bg-cream-50 text-ink-700">
          <tr>
            <SortableTh
              column="systemName"
              label={t('projects.systemName')}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortableTh
              column="orgUnit"
              label={t('projects.orgUnit')}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortableTh
              column="group"
              label={t('projects.group')}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortableTh
              column="operators"
              label={t('projects.operators')}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={onSort}
              className={operatorsColClassName}
            />
            <SortableTh
              column="companyName"
              label={t('projects.companyName')}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortableTh
              column="progressPercent"
              label={t('projects.progress')}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortableTh
              column="status"
              label={t('projects.status')}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={onSort}
            />
            <ActionsTh />
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id} className="border-t border-line">
              <td className="px-4 py-3 font-medium">
                <ProjectNameWithColor name={item.systemName} color={item.color} />
              </td>
              <td className="px-4 py-3">{projectLabelOrUnspecified(item.orgUnit?.name, t)}</td>
              <td className="px-4 py-3">
                {item.group ? (
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <ProjectColorDot color={item.group.color} />
                    <span>{item.group.name}</span>
                  </span>
                ) : (
                  t('projects.unspecified')
                )}
              </td>
              <td className={`px-4 py-3 ${operatorsColClassName}`}>
                <ProjectOperatorsCell operators={item.operators} />
              </td>
              <td className="px-4 py-3">{projectContractorName(item)}</td>
              <td className="px-4 py-3">
                <ProjectProgress value={item.progressPercent} />
              </td>
              <td className="px-4 py-3">
                <ProjectLifecycleBadge value={item.status} />
              </td>
              <td className={actionsColClassName}>
                <EntityRowActions
                  viewTo={`/projects/${item.id}`}
                  showView={false}
                  extra={
                    <Link to={projectProgressCreatePath(item.id)}>
                      <Button type="button" variant="soft">
                        <ClipboardList className="size-4" aria-hidden />
                        {t('projectProgress.create')}
                      </Button>
                    </Link>
                  }
                  editTo={`/projects/${item.id}/edit`}
                  onDelete={() =>
                    confirmDelete({
                      message: t('projects.confirmDelete'),
                      successMessage: t('projects.deleted'),
                      path: `/projects/${item.id}`,
                      queryKey: ['projects'],
                    })
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableCard>
  )
}
