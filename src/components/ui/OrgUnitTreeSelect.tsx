import { Building2, ChevronDown, ChevronRight, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  buildOrganizationUnitForest,
  flattenOrganizationUnitForest,
  organizationUnitMatches,
  pruneOrganizationUnitForest,
  type OrganizationUnitNode,
} from '../../pages/organization/organization-unit-label'
import type { OrganizationUnit } from '../../types/app'
import { formatNumber } from '../../lib/datetime'
import { CheckboxField } from './CheckboxField'
import { fieldClassName } from './Form'
import { FormEmptyHint } from './FormLayout'
import { HoverTooltip } from './HoverTooltip'

function SelectedUnitsSummary({
  units,
  disabled,
  locale,
  onRemove,
}: {
  units: OrganizationUnit[]
  disabled?: boolean
  locale: string
  onRemove: (id: string) => void
}) {
  const { t } = useTranslation()
  const first = units[0]
  if (!first) return null
  const count = units.length
  const chip = (
    <div className="inline-flex min-w-0 max-w-full items-center gap-1.5">
      <span className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-100">
        <span className="truncate">{first.pathLabel || first.name}</span>
        {disabled ? null : (
          <button
            type="button"
            className="inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full text-teal-700 hover:bg-teal-100"
            aria-label={t('projects.removeOperator', { name: first.name })}
            onClick={() => onRemove(first.id)}
          >
            <X className="size-3" aria-hidden />
          </button>
        )}
      </span>
      {count > 1 ? (
        <span
          className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-teal-500 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white"
          aria-label={t('projects.operatorCount', {
            count: formatNumber(count, locale),
          })}
        >
          {formatNumber(count, locale)}
        </span>
      ) : null}
    </div>
  )
  if (count <= 1) return chip
  return (
    <HoverTooltip
      className="max-w-full"
      label={t('projects.operators')}
      content={
        <ul className="max-h-64 space-y-1 overflow-y-auto p-3">
          {units.map((unit) => (
            <li key={unit.id} className="text-sm leading-6 text-ink-800">
              {unit.pathLabel || unit.name}
            </li>
          ))}
        </ul>
      }
    >
      {chip}
    </HoverTooltip>
  )
}

export function OrgUnitTreeSelect({
  id,
  value,
  onChange,
  units,
  required,
  disabled,
  loading,
}: {
  id: string
  value: string[]
  onChange: (ids: string[]) => void
  units: OrganizationUnit[]
  required?: boolean
  disabled?: boolean
  loading?: boolean
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [term, setTerm] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const selected = useMemo(() => new Set(value), [value])
  const byId = useMemo(() => new Map(units.map((unit) => [unit.id, unit])), [units])
  const forest = useMemo(() => {
    const tree = buildOrganizationUnitForest(units, locale)
    const q = term.trim()
    if (!q) return tree
    return pruneOrganizationUnitForest(tree, (unit) => organizationUnitMatches(unit, q, ''))
  }, [locale, term, units])
  const searching = Boolean(term.trim())
  const rows = useMemo(
    () => flattenOrganizationUnitForest(forest, searching ? new Set() : collapsed),
    [collapsed, forest, searching],
  )
  const collapsibleIds = useMemo(() => {
    const ids: string[] = []
    const walk = (nodes: OrganizationUnitNode[]) => {
      for (const node of nodes) {
        if (node.children.length) {
          ids.push(node.id)
          walk(node.children)
        }
      }
    }
    walk(forest)
    return ids
  }, [forest])
  const selectedUnits = value
    .map((unitId) => byId.get(unitId))
    .filter((unit): unit is OrganizationUnit => Boolean(unit))

  function toggle(unitId: string, checked: boolean) {
    const next = new Set(selected)
    if (checked) next.add(unitId)
    else next.delete(unitId)
    onChange([...next])
  }

  function toggleCollapsed(unitId: string) {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(unitId)) next.delete(unitId)
      else next.add(unitId)
      return next
    })
  }

  return (
    <div className="space-y-2">
      <input
        id={id}
        className="sr-only"
        tabIndex={-1}
        value={value.length ? value.join(',') : ''}
        onChange={() => undefined}
        required={required}
        aria-required={required}
      />
      {selectedUnits.length ? (
        <SelectedUnitsSummary
          units={selectedUnits}
          disabled={disabled}
          locale={locale}
          onRemove={(unitId) => toggle(unitId, false)}
        />
      ) : null}
      <div className="overflow-hidden rounded-2xl border border-line bg-cream-50">
        <div className="flex flex-wrap items-center gap-2 border-b border-line/80 bg-white px-3 py-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-teal-600" aria-hidden />
            <input
              id={`${id}-search`}
              className={`${fieldClassName} ps-9`}
              value={term}
              disabled={disabled}
              onChange={(event) => setTerm(event.target.value)}
              placeholder={t('projects.operatorSearch')}
              aria-label={t('projects.operatorSearch')}
            />
          </div>
          {collapsibleIds.length ? (
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                className="cursor-pointer rounded-xl px-2 py-1 text-xs text-teal-700 hover:bg-teal-50"
                disabled={disabled}
                onClick={() => setCollapsed(new Set())}
              >
                {t('projects.expandAll')}
              </button>
              <button
                type="button"
                className="cursor-pointer rounded-xl px-2 py-1 text-xs text-teal-700 hover:bg-teal-50"
                disabled={disabled}
                onClick={() => setCollapsed(new Set(collapsibleIds))}
              >
                {t('projects.collapseAll')}
              </button>
            </div>
          ) : null}
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {loading ? (
            <p className="px-3 py-6 text-center text-sm text-ink-400">{t('common.loading')}</p>
          ) : rows.length === 0 ? (
            <FormEmptyHint>{t('projects.operatorEmpty')}</FormEmptyHint>
          ) : (
            <ul className="space-y-1">
              {rows.map(({ unit, depth }) => {
                const expanded = searching || !collapsed.has(unit.id)
                return (
                  <li key={unit.id}>
                    <div
                      className="flex items-center gap-1"
                      style={{ paddingInlineStart: `${depth * 1.15}rem` }}
                    >
                      {unit.children.length ? (
                        <button
                          type="button"
                          className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-xl text-teal-700 hover:bg-white"
                          aria-expanded={expanded}
                          aria-label={
                            expanded
                              ? t('organizationUnits.collapseUnit')
                              : t('organizationUnits.expandUnit')
                          }
                          disabled={disabled || searching}
                          onClick={() => toggleCollapsed(unit.id)}
                        >
                          {expanded ? (
                            <ChevronDown className="size-4" aria-hidden />
                          ) : (
                            <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
                          )}
                        </button>
                      ) : (
                        <span className="inline-flex size-8 shrink-0 items-center justify-center text-teal-500">
                          <Building2 className="size-3.5" aria-hidden />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <CheckboxField
                          id={`${id}-${unit.id}`}
                          checked={selected.has(unit.id)}
                          disabled={disabled}
                          label={
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="truncate">{unit.name}</span>
                              <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] text-ink-500 ring-1 ring-teal-100">
                                {unit.kind.name}
                              </span>
                            </span>
                          }
                          onChange={(checked) => toggle(unit.id, checked)}
                        />
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
