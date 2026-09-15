import { ChartGantt, LayoutGrid, ListChecks } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { FormCard, FormEmptyHint } from '../../../components/ui/FormLayout'
import { displayDateParts, formatDate, formatNumber, monthName } from '../../../lib/datetime'
import {
  deadlineBucketOrder,
  groupByDeadline,
  indexProjectsByEndDate,
  monthDeadlineCounts,
  monthsWithDeadlines,
  projectYearBar,
  projectsInDisplayMonth,
  projectsInDisplayYear,
  projectsWithEndDate,
  yearTodayMarker,
} from '../../../lib/project-calendar'
import { projectColor, projectColorAlpha } from '../../../lib/project-color'
import type { Project } from '../../../types/app'
import { CalendarProjectsModal } from './CalendarProjectsModal'
import { DeadlineGroup, MonthCalendarGrid, ProposalCardNote } from './ProjectCalendarShared'

type ProjectsModalState = {
  title: string
  subtitle?: string
  items: Project[]
} | null

function useProjectsModal() {
  const [modal, setModal] = useState<ProjectsModalState>(null)
  return {
    modal,
    open: setModal,
    close: () => setModal(null),
  }
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
  const busyMonths = useMemo(() => monthsWithDeadlines(items, year, locale), [items, year, locale])
  const byDate = useMemo(() => indexProjectsByEndDate(items), [items])
  const { modal, open, close } = useProjectsModal()
  const [month, setMonth] = useState<number | null>(busyMonths[0] ?? null)
  const selectedMonth = month && busyMonths.includes(month) ? month : (busyMonths[0] ?? null)
  const monthItems = selectedMonth
    ? projectsInDisplayMonth(items, year, selectedMonth, locale)
    : []
  const selectedLabel = selectedMonth ? monthName(selectedMonth, locale) : ''

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
            const empty = count === 0
            const active = selectedMonth === value
            if (empty) {
              return (
                <div
                  key={value}
                  className="rounded-2xl border border-line/70 bg-cream-50 px-3 py-3 text-start text-ink-400"
                >
                  <p className="text-sm font-semibold">{monthName(value, locale)}</p>
                  <p className="mt-1 text-xs">{t('projectCalendar.noMonthDeadline')}</p>
                </div>
              )
            }
            return (
              <button
                key={value}
                type="button"
                onClick={() => setMonth(value)}
                className={`cursor-pointer rounded-2xl border px-3 py-3 text-start transition ${
                  active
                    ? 'border-teal-300 bg-teal-50 shadow-[0_6px_16px_rgba(46,189,182,0.16)]'
                    : 'border-teal-100 bg-white hover:bg-teal-50/70'
                }`}
              >
                <p className="text-sm font-semibold text-ink-800">{monthName(value, locale)}</p>
                <p className="mt-1 text-xs text-ink-500">
                  {t('projectCalendar.monthCount', { count: formatNumber(count, locale) })}
                </p>
              </button>
            )
          })}
        </div>
        {selectedMonth ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {busyMonths.map((value) => {
                const active = selectedMonth === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMonth(value)}
                    className={`inline-flex cursor-pointer items-center rounded-2xl px-3 py-2 text-sm font-medium transition ${
                      active
                        ? 'bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]'
                        : 'bg-white text-ink-700 ring-1 ring-teal-400 shadow-[0_6px_14px_rgba(46,189,182,0.12)] hover:bg-cream-50'
                    }`}
                  >
                    {monthName(value, locale)}
                  </button>
                )
              })}
            </div>
            <article className="rounded-2xl border border-teal-50 bg-white p-3 shadow-[0_4px_14px_rgba(20,40,40,0.04)] sm:p-4">
              <button
                type="button"
                className="mb-3 cursor-pointer text-start text-sm font-semibold text-ink-800 hover:text-teal-700"
                onClick={() =>
                  open({
                    title: t('projectCalendar.monthModalTitle', { month: selectedLabel }),
                    subtitle: t('projectCalendar.monthModalHint'),
                    items: monthItems,
                  })
                }
                aria-label={t('projectCalendar.openMonthDetails', { month: selectedLabel })}
              >
                {selectedLabel}
              </button>
              <MonthCalendarGrid
                year={year}
                month={selectedMonth}
                locale={locale}
                byDate={byDate}
                showLabels
                onSelectDay={(iso, dayItems) =>
                  open({
                    title: t('projectCalendar.dayModalTitle', { date: formatDate(iso, locale) }),
                    items: dayItems,
                  })
                }
              />
            </article>
          </div>
        ) : (
          <FormEmptyHint>{t('projectCalendar.emptyYear')}</FormEmptyHint>
        )}
        <CalendarProjectsModal
          open={Boolean(modal)}
          title={modal?.title ?? ''}
          subtitle={modal?.subtitle}
          items={modal?.items ?? []}
          locale={locale}
          onClose={close}
        />
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
  const today = useMemo(() => yearTodayMarker(year, locale), [locale, year])
  const rows = useMemo(() => {
    return projectsInDisplayYear(projectsWithEndDate(items), year, locale)
      .map((project) => ({
        project,
        bar: projectYearBar(project, year, locale),
        startDay: displayDateParts(project.startDate, locale)?.day,
        endDay: displayDateParts(project.endDate, locale)?.day,
      }))
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
        {!rows.length ? <FormEmptyHint>{t('projectCalendar.emptyYear')}</FormEmptyHint> : null}
        {rows.length ? (
          <div className="overflow-x-auto">
            <div className="min-w-[46rem] space-y-2 pt-6">
              <div className="grid grid-cols-[9rem_minmax(0,1fr)] items-center gap-3 text-[10px] font-medium text-ink-400">
                <div />
                <div className="relative grid grid-cols-12">
                  {Array.from({ length: 12 }, (_, index) => (
                    <div
                      key={index}
                      className={`truncate py-1 text-center ${
                        index < today.pastMonths ? 'bg-ink-900/[0.07] text-ink-400' : 'text-ink-500'
                      }`}
                    >
                      {monthName(index + 1, locale)}
                    </div>
                  ))}
                  {today.offsetPercent != null ? (
                    <div
                      className="pointer-events-none absolute inset-y-0 z-[3] w-0"
                      style={{ insetInlineStart: `${today.offsetPercent}%` }}
                    >
                      <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-teal-600 px-1.5 py-px text-[9px] font-semibold text-white">
                        {t('projectCalendar.todayShort')}
                      </span>
                      <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-teal-600" />
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="grid grid-cols-[9rem_minmax(0,1fr)] items-stretch gap-3">
                <div className="space-y-2">
                  {rows.map(({ project }) => (
                    <Link
                      key={project.id}
                      to={`/projects/${project.id}`}
                      className="flex h-9 min-w-0 items-center truncate text-xs font-semibold text-ink-800 hover:text-teal-700"
                    >
                      {project.systemName}
                    </Link>
                  ))}
                </div>
                <div className="relative space-y-2 overflow-hidden rounded-xl">
                  {today.pastMonths > 0 ? (
                    <div
                      className="pointer-events-none absolute inset-y-0 z-[2] bg-ink-900/[0.1]"
                      style={{
                        insetInlineStart: 0,
                        width: `${(today.pastMonths / 12) * 100}%`,
                      }}
                      aria-hidden
                    />
                  ) : null}
                  {today.offsetPercent != null ? (
                    <div
                      className="pointer-events-none absolute inset-y-0 z-[3] w-0.5 bg-teal-600"
                      style={{
                        insetInlineStart: `${today.offsetPercent}%`,
                        marginInlineStart: '-1px',
                      }}
                      aria-hidden
                    />
                  ) : null}
                  {rows.map(({ project, bar, startDay, endDay }) => (
                    <div key={project.id} className="relative h-9 overflow-hidden rounded-xl bg-cream-50">
                      <div className="pointer-events-none absolute inset-0 grid grid-cols-12">
                        {Array.from({ length: 12 }, (_, index) => (
                          <div key={index} className="border-line/60 border-e last:border-e-0" />
                        ))}
                      </div>
                      {bar ? (
                        <Link
                          to={`/projects/${project.id}`}
                          className="absolute top-1 bottom-1 z-[1] overflow-hidden rounded-lg text-[11px] font-bold text-white"
                          style={{
                            insetInlineStart: `${bar.offsetPercent}%`,
                            width: bar.markerOnly
                              ? '1.75rem'
                              : `${Math.max(bar.widthPercent, 4.5)}%`,
                            background: bar.markerOnly
                              ? projectColor(project.color)
                              : projectColorAlpha(project.color, 0.42),
                            boxShadow: `0 4px 10px ${projectColorAlpha(project.color, 0.28)}`,
                          }}
                          title={project.systemName}
                        >
                          {!bar.markerOnly && project.progressPercent != null ? (
                            <span
                              className="absolute inset-y-0 inset-inline-start-0"
                              style={{
                                width: `${Math.min(100, Math.max(0, project.progressPercent))}%`,
                                background: projectColor(project.color),
                              }}
                            />
                          ) : null}
                          <span className="relative z-[1] flex h-full items-center justify-between gap-1 px-1.5">
                            {bar.markerOnly || startDay == null ? (
                              <span className="mx-auto tabular-nums">
                                {endDay != null ? formatNumber(endDay, locale) : ''}
                              </span>
                            ) : (
                              <>
                                <span className="tabular-nums">{formatNumber(startDay, locale)}</span>
                                <span className="tabular-nums">
                                  {endDay != null ? formatNumber(endDay, locale) : ''}
                                </span>
                              </>
                            )}
                          </span>
                        </Link>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </FormCard>
  )
}
