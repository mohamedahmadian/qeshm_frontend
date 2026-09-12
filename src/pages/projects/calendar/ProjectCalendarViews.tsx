import { CalendarDays, CalendarRange, ChartGantt, LayoutGrid, ListChecks } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Form'
import { FormCard, FormEmptyHint, FormSectionTitle } from '../../../components/ui/FormLayout'
import { displayDateParts, formatNumber, monthName } from '../../../lib/datetime'
import {
  deadlineBucketOrder,
  groupByDeadline,
  indexProjectsByEndDate,
  monthDeadlineCounts,
  monthsWithDeadlines,
  projectYearBar,
  projectsInDisplayYear,
  projectsWithEndDate,
} from '../../../lib/project-calendar'
import { projectColor, projectColorAlpha } from '../../../lib/project-color'
import type { Project } from '../../../types/app'
import {
  DeadlineGroup,
  DeadlineProjectRow,
  MonthCalendarGrid,
  ProposalCardNote,
} from './ProjectCalendarShared'

function SelectedDayList({
  iso,
  items,
  locale,
}: {
  iso: string | null
  items: Project[]
  locale: string
}) {
  const { t } = useTranslation()
  if (!iso) return null
  if (!items.length) {
    return <FormEmptyHint>{t('projectCalendar.noDeadlineOnDay')}</FormEmptyHint>
  }
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <DeadlineProjectRow key={item.id} project={item} locale={locale} />
      ))}
    </div>
  )
}

export function AgendaProposal({ items, locale }: { items: Project[]; locale: string }) {
  const { t } = useTranslation()
  const groups = useMemo(() => groupByDeadline(items, locale), [items, locale])
  const dated = projectsWithEndDate(items)
  return (
    <FormCard
      icon={ListChecks}
      title={t('projectCalendar.proposals.agenda')}
      subtitle={t('projectCalendar.proposals.agendaHint')}
    >
      <div className="space-y-4 p-5 sm:p-6">
        <ProposalCardNote>{t('projectCalendar.proposals.agendaNote')}</ProposalCardNote>
        {!dated.length ? <FormEmptyHint>{t('projectCalendar.emptyDated')}</FormEmptyHint> : null}
        {dated.length
          ? deadlineBucketOrder.map((key) => (
              <DeadlineGroup
                key={key}
                title={t(`projectCalendar.buckets.${key}`)}
                items={groups[key]}
                locale={locale}
              />
            ))
          : null}
      </div>
    </FormCard>
  )
}

export function YearStripProposal({
  items,
  year,
  locale,
}: {
  items: Project[]
  year: number
  locale: string
}) {
  const { t } = useTranslation()
  const counts = useMemo(() => monthDeadlineCounts(items, year, locale), [items, year, locale])
  const byDate = useMemo(() => indexProjectsByEndDate(items), [items])
  const [month, setMonth] = useState<number | null>(
    counts.findIndex((count) => count > 0) + 1 || null,
  )
  const [selectedIso, setSelectedIso] = useState<string | null>(null)
  const selectedMonth = month && month >= 1 && month <= 12 ? month : null
  const selectedItems = selectedIso ? (byDate.get(selectedIso) ?? []) : []

  return (
    <FormCard
      icon={LayoutGrid}
      title={t('projectCalendar.proposals.strip')}
      subtitle={t('projectCalendar.proposals.stripHint')}
    >
      <div className="space-y-4 p-5 sm:p-6">
        <ProposalCardNote>{t('projectCalendar.proposals.stripNote')}</ProposalCardNote>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {counts.map((count, index) => {
            const value = index + 1
            const active = selectedMonth === value
            const empty = count === 0
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMonth(value)
                  setSelectedIso(null)
                }}
                className={`cursor-pointer rounded-2xl border px-3 py-3 text-start transition ${
                  active
                    ? 'border-teal-300 bg-teal-50 shadow-[0_6px_16px_rgba(46,189,182,0.16)]'
                    : empty
                      ? 'border-line/70 bg-cream-50 text-ink-400'
                      : 'border-teal-100 bg-white hover:bg-teal-50/70'
                }`}
              >
                <p className="text-sm font-semibold text-ink-800">{monthName(value, locale)}</p>
                <p className="mt-1 text-xs text-ink-500">
                  {empty
                    ? t('projectCalendar.noMonthDeadline')
                    : t('projectCalendar.monthCount', { count: formatNumber(count, locale) })}
                </p>
              </button>
            )
          })}
        </div>
        {selectedMonth ? (
          <div className="rounded-2xl border border-teal-50 bg-cream-50/60 p-3 sm:p-4">
            <FormSectionTitle icon={CalendarDays}>
              {monthName(selectedMonth, locale)}
            </FormSectionTitle>
            <MonthCalendarGrid
              year={year}
              month={selectedMonth}
              locale={locale}
              byDate={byDate}
              selectedIso={selectedIso}
              onSelectDay={setSelectedIso}
            />
          </div>
        ) : null}
        {selectedIso ? (
          <SelectedDayList iso={selectedIso} items={selectedItems} locale={locale} />
        ) : null}
      </div>
    </FormCard>
  )
}

export function YearGridProposal({
  items,
  year,
  locale,
  onlyWithDeadlines,
}: {
  items: Project[]
  year: number
  locale: string
  onlyWithDeadlines?: boolean
}) {
  const { t } = useTranslation()
  const byDate = useMemo(() => indexProjectsByEndDate(items), [items])
  const months = onlyWithDeadlines
    ? monthsWithDeadlines(items, year, locale)
    : Array.from({ length: 12 }, (_, index) => index + 1)
  const [selectedIso, setSelectedIso] = useState<string | null>(null)
  const selectedItems = selectedIso ? (byDate.get(selectedIso) ?? []) : []

  return (
    <FormCard
      icon={CalendarRange}
      title={
        onlyWithDeadlines
          ? t('projectCalendar.proposals.busyMonths')
          : t('projectCalendar.proposals.yearGrid')
      }
      subtitle={
        onlyWithDeadlines
          ? t('projectCalendar.proposals.busyMonthsHint')
          : t('projectCalendar.proposals.yearGridHint')
      }
    >
      <div className="space-y-4 p-5 sm:p-6">
        <ProposalCardNote>
          {onlyWithDeadlines
            ? t('projectCalendar.proposals.busyMonthsNote')
            : t('projectCalendar.proposals.yearGridNote')}
        </ProposalCardNote>
        {!months.length ? <FormEmptyHint>{t('projectCalendar.emptyYear')}</FormEmptyHint> : null}
        {months.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {months.map((month) => (
              <article
                key={month}
                className="rounded-2xl border border-teal-50 bg-white p-3 shadow-[0_4px_14px_rgba(20,40,40,0.04)]"
              >
                <h3 className="mb-2 text-sm font-semibold text-ink-800">
                  {monthName(month, locale)}
                </h3>
                <MonthCalendarGrid
                  year={year}
                  month={month}
                  locale={locale}
                  byDate={byDate}
                  selectedIso={selectedIso}
                  onSelectDay={setSelectedIso}
                  compact
                />
              </article>
            ))}
          </div>
        ) : null}
        {selectedIso ? (
          <SelectedDayList iso={selectedIso} items={selectedItems} locale={locale} />
        ) : null}
      </div>
    </FormCard>
  )
}

export function MonthAgendaProposal({
  items,
  year,
  locale,
}: {
  items: Project[]
  year: number
  locale: string
}) {
  const { t } = useTranslation()
  const counts = useMemo(() => monthDeadlineCounts(items, year, locale), [items, year, locale])
  const byDate = useMemo(() => indexProjectsByEndDate(items), [items])
  const firstBusy = counts.findIndex((count) => count > 0) + 1
  const [month, setMonth] = useState(firstBusy || 1)
  const [selectedIso, setSelectedIso] = useState<string | null>(null)
  const selectedItems = selectedIso ? (byDate.get(selectedIso) ?? []) : []
  const safeMonth = month >= 1 && month <= 12 ? month : 1
  const monthItems = useMemo(
    () =>
      projectsWithEndDate(items).filter((item) => {
        const parts = displayDateParts(item.endDate, locale)
        return parts?.year === year && parts.month === safeMonth
      }),
    [items, locale, safeMonth, year],
  )

  return (
    <FormCard
      icon={CalendarDays}
      title={t('projectCalendar.proposals.monthAgenda')}
      subtitle={t('projectCalendar.proposals.monthAgendaHint')}
    >
      <div className="space-y-4 p-5 sm:p-6">
        <ProposalCardNote>{t('projectCalendar.proposals.monthAgendaNote')}</ProposalCardNote>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={safeMonth <= 1}
            onClick={() => {
              setMonth((value) => Math.max(1, value - 1))
              setSelectedIso(null)
            }}
          >
            {t('projectCalendar.prevMonth')}
          </Button>
          <p className="min-w-28 text-center text-sm font-semibold text-ink-800">
            {monthName(safeMonth, locale)}
          </p>
          <Button
            type="button"
            variant="ghost"
            disabled={safeMonth >= 12}
            onClick={() => {
              setMonth((value) => Math.min(12, value + 1))
              setSelectedIso(null)
            }}
          >
            {t('projectCalendar.nextMonth')}
          </Button>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
          <div className="rounded-2xl border border-teal-50 bg-cream-50/50 p-3 sm:p-4">
            <MonthCalendarGrid
              year={year}
              month={safeMonth}
              locale={locale}
              byDate={byDate}
              selectedIso={selectedIso}
              onSelectDay={setSelectedIso}
            />
          </div>
          <div className="min-w-0 space-y-3">
            <FormSectionTitle icon={ListChecks}>
              {selectedIso
                ? t('projectCalendar.selectedDay')
                : t('projectCalendar.monthDeadlines')}
            </FormSectionTitle>
            {selectedIso ? (
              <SelectedDayList iso={selectedIso} items={selectedItems} locale={locale} />
            ) : monthItems.length ? (
              <div className="space-y-2">
                {monthItems.map((item) => (
                  <DeadlineProjectRow key={item.id} project={item} locale={locale} />
                ))}
              </div>
            ) : (
              <FormEmptyHint>{t('projectCalendar.noMonthDeadline')}</FormEmptyHint>
            )}
          </div>
        </div>
      </div>
    </FormCard>
  )
}

export function TimelineProposal({
  items,
  year,
  locale,
}: {
  items: Project[]
  year: number
  locale: string
}) {
  const { t } = useTranslation()
  const rows = useMemo(() => {
    return projectsInDisplayYear(projectsWithEndDate(items), year, locale)
      .map((project) => ({ project, bar: projectYearBar(project, year, locale) }))
      .filter((row) => row.bar)
      .sort((a, b) => (a.project.endDate ?? '').localeCompare(b.project.endDate ?? ''))
  }, [items, locale, year])
  return (
    <FormCard
      icon={ChartGantt}
      title={t('projectCalendar.proposals.timeline')}
      subtitle={t('projectCalendar.proposals.timelineHint')}
    >
      <div className="space-y-4 p-5 sm:p-6">
        <ProposalCardNote>{t('projectCalendar.proposals.timelineNote')}</ProposalCardNote>
        {!rows.length ? <FormEmptyHint>{t('projectCalendar.emptyYear')}</FormEmptyHint> : null}
        {rows.length ? (
          <div className="overflow-x-auto">
            <div className="min-w-[40rem] space-y-2">
              <div className="grid grid-cols-12 gap-1 px-[9.5rem] text-[10px] font-medium text-ink-400">
                {Array.from({ length: 12 }, (_, index) => (
                  <div key={index} className="truncate text-center">
                    {monthName(index + 1, locale)}
                  </div>
                ))}
              </div>
              {rows.map(({ project, bar }) => (
                <div key={project.id} className="flex items-center gap-3">
                  <Link
                    to={`/projects/${project.id}`}
                    className="w-36 shrink-0 truncate text-xs font-semibold text-ink-800 hover:text-teal-700"
                  >
                    {project.systemName}
                  </Link>
                  <div className="relative h-8 flex-1 rounded-xl bg-cream-50">
                    {bar ? (
                      <Link
                        to={`/projects/${project.id}`}
                        className="absolute top-1 bottom-1 rounded-lg"
                        style={{
                          insetInlineStart: `${bar.offsetPercent}%`,
                          width: bar.markerOnly ? '0.7rem' : `${Math.max(bar.widthPercent, 1.4)}%`,
                          background: projectColorAlpha(project.color, 0.85),
                          boxShadow: `0 4px 10px ${projectColorAlpha(project.color, 0.28)}`,
                        }}
                        title={project.systemName}
                      />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </FormCard>
  )
}
