import { CalendarDays, CalendarRange, ChartGantt, LayoutGrid, ListChecks } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Form'
import { FormCard, FormEmptyHint } from '../../../components/ui/FormLayout'
import { formatDate, formatNumber, monthName } from '../../../lib/datetime'
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
} from '../../../lib/project-calendar'
import { projectColorAlpha } from '../../../lib/project-color'
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
  const byDate = useMemo(() => indexProjectsByEndDate(items), [items])
  const { modal, open, close } = useProjectsModal()
  const [month, setMonth] = useState<number | null>(
    counts.findIndex((count) => count > 0) + 1 || null,
  )
  const selectedMonth = month && month >= 1 && month <= 12 ? month : null
  const monthItems = selectedMonth
    ? projectsInDisplayMonth(items, year, selectedMonth, locale)
    : []

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
                onClick={() => setMonth(value)}
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
            <button
              type="button"
              className="mb-3 cursor-pointer text-start text-sm font-semibold text-ink-800 hover:text-teal-700"
              onClick={() =>
                open({
                  title: t('projectCalendar.monthModalTitle', {
                    month: monthName(selectedMonth, locale),
                  }),
                  subtitle: t('projectCalendar.monthModalHint'),
                  items: monthItems,
                })
              }
            >
              {monthName(selectedMonth, locale)}
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
          </div>
        ) : null}
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

export function YearGridProposal({
  items,
  year,
  locale,
}: {
  items: Project[]
  year: number
  locale: string
}) {
  const { t } = useTranslation()
  const byDate = useMemo(() => indexProjectsByEndDate(items), [items])
  const months = monthsWithDeadlines(items, year, locale)
  const { modal, open, close } = useProjectsModal()

  return (
    <FormCard
      icon={CalendarRange}
      title={t('projectCalendar.proposals.busyMonths')}
      subtitle={t('projectCalendar.proposals.busyMonthsHint')}
    >
      <div className="space-y-4 p-5 sm:p-6">
        <ProposalCardNote>{t('projectCalendar.proposals.busyMonthsNote')}</ProposalCardNote>
        {!months.length ? <FormEmptyHint>{t('projectCalendar.emptyYear')}</FormEmptyHint> : null}
        {months.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {months.map((month) => {
              const monthItems = projectsInDisplayMonth(items, year, month, locale)
              const label = monthName(month, locale)
              return (
                <article
                  key={month}
                  className="rounded-2xl border border-teal-50 bg-white p-3 shadow-[0_4px_14px_rgba(20,40,40,0.04)] sm:p-4"
                >
                  <button
                    type="button"
                    className="mb-3 cursor-pointer text-start text-sm font-semibold text-ink-800 hover:text-teal-700"
                    onClick={() =>
                      open({
                        title: t('projectCalendar.monthModalTitle', { month: label }),
                        subtitle: t('projectCalendar.monthModalHint'),
                        items: monthItems,
                      })
                    }
                    aria-label={t('projectCalendar.openMonthDetails', { month: label })}
                  >
                    {label}
                  </button>
                  <MonthCalendarGrid
                    year={year}
                    month={month}
                    locale={locale}
                    byDate={byDate}
                    showLabels
                    onSelectDay={(iso, dayItems) =>
                      open({
                        title: t('projectCalendar.dayModalTitle', {
                          date: formatDate(iso, locale),
                        }),
                        items: dayItems,
                      })
                    }
                  />
                </article>
              )
            })}
          </div>
        ) : null}
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
  const { modal, open, close } = useProjectsModal()
  const safeMonth = month >= 1 && month <= 12 ? month : 1
  const monthItems = useMemo(
    () => projectsInDisplayMonth(items, year, safeMonth, locale),
    [items, locale, safeMonth, year],
  )
  const label = monthName(safeMonth, locale)

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
            onClick={() => setMonth((value) => Math.max(1, value - 1))}
          >
            {t('projectCalendar.prevMonth')}
          </Button>
          <button
            type="button"
            className="min-w-28 cursor-pointer text-center text-sm font-semibold text-ink-800 hover:text-teal-700"
            onClick={() =>
              open({
                title: t('projectCalendar.monthModalTitle', { month: label }),
                subtitle: t('projectCalendar.monthModalHint'),
                items: monthItems,
              })
            }
            aria-label={t('projectCalendar.openMonthDetails', { month: label })}
          >
            {label}
          </button>
          <Button
            type="button"
            variant="ghost"
            disabled={safeMonth >= 12}
            onClick={() => setMonth((value) => Math.min(12, value + 1))}
          >
            {t('projectCalendar.nextMonth')}
          </Button>
        </div>
        <div className="rounded-2xl border border-teal-50 bg-cream-50/50 p-3 sm:p-4">
          <MonthCalendarGrid
            year={year}
            month={safeMonth}
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
        </div>
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
