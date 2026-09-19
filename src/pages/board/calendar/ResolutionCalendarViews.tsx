import { ChartGantt, LayoutGrid, ListChecks } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import type { ResolutionCalendarItem } from '../../../lib/resolution-calendar'
import { CalendarResolutionsModal } from './CalendarResolutionsModal'
import {
  DeadlineResolutionGroup,
  ResolutionNameHover,
  type OpenResolutionDossier,
} from './ResolutionCalendarShared'
import { MonthCalendarGrid, ProposalCardNote } from '../../projects/calendar/ProjectCalendarShared'

type ResolutionsModalState = {
  title: string
  subtitle?: string
  items: ResolutionCalendarItem[]
} | null

function useResolutionsModal() {
  const [modal, setModal] = useState<ResolutionsModalState>(null)
  return {
    modal,
    open: setModal,
    close: () => setModal(null),
  }
}

export function ResolutionAgendaProposal({
  items,
  locale,
  onOpenDossier,
}: {
  items: ResolutionCalendarItem[]
  locale: string
  onOpenDossier: OpenResolutionDossier
}) {
  const { t } = useTranslation()
  const groups = useMemo(() => groupByDeadline(items, locale), [items, locale])
  const dated = projectsWithEndDate(items)
  return (
    <FormCard
      icon={ListChecks}
      title={t('boardCalendar.proposals.agenda')}
      subtitle={t('boardCalendar.proposals.agendaHint')}
    >
      <div className="space-y-4 p-5 sm:p-6">
        <ProposalCardNote>{t('boardCalendar.proposals.agendaNote')}</ProposalCardNote>
        {!dated.length ? <FormEmptyHint>{t('boardCalendar.emptyDated')}</FormEmptyHint> : null}
        {dated.length
          ? deadlineBucketOrder.map((key) => (
              <DeadlineResolutionGroup
                key={key}
                title={t(`boardCalendar.buckets.${key}`)}
                items={groups[key]}
                locale={locale}
                onOpen={onOpenDossier}
              />
            ))
          : null}
      </div>
    </FormCard>
  )
}

export function ResolutionYearStripProposal({
  items,
  year,
  locale,
  onOpenDossier,
}: {
  items: ResolutionCalendarItem[]
  year: number
  locale: string
  onOpenDossier: OpenResolutionDossier
}) {
  const { t } = useTranslation()
  const counts = useMemo(() => monthDeadlineCounts(items, year, locale), [items, year, locale])
  const busyMonths = useMemo(() => monthsWithDeadlines(items, year, locale), [items, year, locale])
  const byDate = useMemo(() => indexProjectsByEndDate(items), [items])
  const { modal, open, close } = useResolutionsModal()
  const [month, setMonth] = useState<number | null>(busyMonths[0] ?? null)
  const selectedMonth = month && busyMonths.includes(month) ? month : (busyMonths[0] ?? null)
  const monthItems = selectedMonth
    ? projectsInDisplayMonth(items, year, selectedMonth, locale)
    : []
  const selectedLabel = selectedMonth ? monthName(selectedMonth, locale) : ''

  return (
    <FormCard
      icon={LayoutGrid}
      title={t('boardCalendar.proposals.strip')}
      subtitle={t('boardCalendar.proposals.stripHint')}
    >
      <div className="space-y-4 p-5 sm:p-6">
        <ProposalCardNote>{t('boardCalendar.proposals.stripNote')}</ProposalCardNote>
        {!busyMonths.length ? (
          <FormEmptyHint>{t('boardCalendar.emptyYearStrip')}</FormEmptyHint>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {busyMonths.map((value) => {
              const count = counts[value - 1] ?? 0
              const active = selectedMonth === value
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
                    {t('boardCalendar.monthCount', { count: formatNumber(count, locale) })}
                  </p>
                </button>
              )
            })}
          </div>
        )}
        {selectedMonth ? (
          <article className="rounded-2xl border border-teal-50 bg-white p-3 shadow-[0_4px_14px_rgba(20,40,40,0.04)] sm:p-4">
            <button
              type="button"
              className="mb-3 cursor-pointer text-start text-sm font-semibold text-ink-800 hover:text-teal-700"
              onClick={() =>
                open({
                  title: t('boardCalendar.monthModalTitle', { month: selectedLabel }),
                  subtitle: t('boardCalendar.monthModalHint'),
                  items: monthItems,
                })
              }
              aria-label={t('boardCalendar.openMonthDetails', { month: selectedLabel })}
            >
              {selectedLabel}
            </button>
              <MonthCalendarGrid
                year={year}
                month={selectedMonth}
                locale={locale}
                byDate={byDate}
                showLabels
                forceLtr={false}
                dayCountLabelKey="boardCalendar.dayWithCount"
                moreOnDayKey="boardCalendar.moreOnDay"
                renderItemLabel={(item, label) => (
                  <ResolutionNameHover item={item} className="w-full min-w-0 overflow-hidden">
                    {label}
                  </ResolutionNameHover>
                )}
                onSelectDay={(iso, dayItems) =>
                  open({
                    title: t('boardCalendar.dayModalTitle', { date: formatDate(iso, locale) }),
                    items: dayItems,
                  })
                }
              />
          </article>
        ) : null}
        <CalendarResolutionsModal
          open={Boolean(modal)}
          title={modal?.title ?? ''}
          subtitle={modal?.subtitle}
          items={modal?.items ?? []}
          locale={locale}
          onClose={close}
          onOpenDossier={onOpenDossier}
        />
      </div>
    </FormCard>
  )
}

export function ResolutionTimelineProposal({
  items,
  year,
  locale,
  onOpenDossier,
}: {
  items: ResolutionCalendarItem[]
  year: number
  locale: string
  onOpenDossier: OpenResolutionDossier
}) {
  const { t } = useTranslation()
  const today = useMemo(() => yearTodayMarker(year, locale), [locale, year])
  const rows = useMemo(() => {
    return projectsInDisplayYear(projectsWithEndDate(items), year, locale)
      .map((item) => ({
        item,
        bar: projectYearBar(item, year, locale),
        startDay: displayDateParts(item.startDate, locale)?.day,
        endDay: displayDateParts(item.endDate, locale)?.day,
      }))
      .filter((row) => row.bar)
      .sort((a, b) => (a.item.endDate ?? '').localeCompare(b.item.endDate ?? ''))
  }, [items, locale, year])
  return (
    <FormCard
      icon={ChartGantt}
      title={t('boardCalendar.proposals.timeline')}
      subtitle={t('boardCalendar.proposals.timelineHint')}
    >
      <div className="space-y-4 p-5 sm:p-6">
        {!rows.length ? <FormEmptyHint>{t('boardCalendar.emptyYear')}</FormEmptyHint> : null}
        {rows.length ? (
          <div className="overflow-x-auto">
            <div className="min-w-[46rem] space-y-2 pt-6">
              <div className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] items-center gap-3 text-[10px] font-medium text-ink-400">
                <div />
                <div className="relative min-w-0 grid grid-cols-12">
                  {today.pastPercent > 0 ? (
                    <div
                      className="pointer-events-none absolute inset-y-0 z-0 bg-ink-900/[0.07]"
                      style={{
                        insetInlineStart: 0,
                        inlineSize: `${today.pastPercent}%`,
                      }}
                      aria-hidden
                    />
                  ) : null}
                  {Array.from({ length: 12 }, (_, index) => (
                    <div
                      key={index}
                      className={`relative z-[1] truncate py-1 text-center ${
                        index < today.pastMonths ? 'text-ink-400' : 'text-ink-500'
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
                        {t('boardCalendar.todayShort')}
                      </span>
                      <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-teal-600" />
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] items-stretch gap-3">
                <div className="min-w-0 space-y-2 overflow-hidden">
                  {rows.map(({ item }) => (
                    <ResolutionNameHover
                      key={item.id}
                      item={item}
                      className="flex h-9 w-full min-w-0 max-w-full items-center overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => onOpenDossier(item)}
                        className="block w-full min-w-0 cursor-pointer truncate text-start text-xs font-semibold text-ink-800 hover:text-teal-700"
                        title={item.title}
                      >
                        {item.title}
                      </button>
                    </ResolutionNameHover>
                  ))}
                </div>
                <div className="relative min-w-0 space-y-2 overflow-hidden rounded-xl">
                  {today.pastPercent > 0 ? (
                    <div
                      className="pointer-events-none absolute inset-y-0 z-[2] bg-ink-900/[0.1]"
                      style={{
                        insetInlineStart: 0,
                        inlineSize: `${today.pastPercent}%`,
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
                  {rows.map(({ item, bar, startDay, endDay }) => (
                    <div key={item.id} className="relative h-9 overflow-hidden rounded-xl bg-cream-50">
                      <div className="pointer-events-none absolute inset-0 grid grid-cols-12">
                        {Array.from({ length: 12 }, (_, index) => (
                          <div key={index} className="border-line/60 border-e last:border-e-0" />
                        ))}
                      </div>
                      {bar ? (
                        <button
                          type="button"
                          onClick={() => onOpenDossier(item)}
                          className="absolute top-1 bottom-1 z-[1] cursor-pointer overflow-hidden rounded-lg text-[11px] font-bold text-white"
                          style={{
                            insetInlineStart: `${bar.offsetPercent}%`,
                            width: bar.markerOnly
                              ? '1.75rem'
                              : `${Math.max(bar.widthPercent, 4.5)}%`,
                            background: bar.markerOnly
                              ? projectColor(item.color)
                              : projectColorAlpha(item.color, 0.42),
                            boxShadow: `0 4px 10px ${projectColorAlpha(item.color, 0.28)}`,
                          }}
                          title={item.title}
                        >
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
                        </button>
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
