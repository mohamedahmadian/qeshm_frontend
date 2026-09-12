import { CalendarDays, CalendarRange, CircleCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FormField, PageHeader, ToggleField, listShellClassName } from '../../../components/ui/Form'
import { FormCard, FormEmptyHint, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { LoadingState } from '../../../components/ui/LoadingState'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { displayYearNow, formatNumber } from '../../../lib/datetime'
import {
  calendarYearOptions,
  filterCalendarProjects,
  projectsWithEndDate,
} from '../../../lib/project-calendar'
import {
  AgendaProposal,
  MonthAgendaProposal,
  TimelineProposal,
  YearGridProposal,
  YearStripProposal,
} from './ProjectCalendarViews'
import { useProjectCalendarItems } from './useProjectCalendarItems'

export function ProjectCalendarPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const query = useProjectCalendarItems()
  const [includeCompleted, setIncludeCompleted] = useState(false)
  const [year, setYear] = useState(() => String(displayYearNow(locale)))

  useEffect(() => {
    setYear(String(displayYearNow(locale)))
  }, [locale])

  const filtered = useMemo(
    () =>
      filterCalendarProjects(query.data ?? [], {
        includeCompleted,
        includeInactive: false,
      }),
    [includeCompleted, query.data],
  )
  const dated = useMemo(() => projectsWithEndDate(filtered), [filtered])
  const yearOptions = useMemo(
    () =>
      calendarYearOptions(query.data ?? [], locale).map((value) => ({
        value: String(value),
        label: formatNumber(value, locale),
      })),
    [locale, query.data],
  )
  const selectedYear = Number(year) || displayYearNow(locale)
  const undatedCount = filtered.length - dated.length

  return (
    <div className={`${listShellClassName} space-y-5`}>
      <PageHeader
        icon={CalendarDays}
        title={t('projectCalendar.title')}
        subtitle={t('projectCalendar.subtitle')}
      />
      <FormCard
        icon={CalendarRange}
        title={t('projectCalendar.filters')}
        subtitle={t('projectCalendar.filtersHint')}
      >
        <div className={formCardBodyClassName}>
          <FormField icon={CalendarRange} label={t('projectCalendar.year')}>
            <SearchSelect
              value={year}
              onChange={setYear}
              options={yearOptions}
              placeholder={t('projectCalendar.yearPlaceholder')}
            />
          </FormField>
          <FormField icon={CircleCheck} label={t('projectCalendar.includeCompleted')}>
            <ToggleField
              checked={includeCompleted}
              onChange={setIncludeCompleted}
              onLabel={t('projectCalendar.includeCompletedOn')}
              offLabel={t('projectCalendar.includeCompletedOff')}
            />
          </FormField>
          {undatedCount > 0 ? (
            <p className="text-sm text-ink-500">
              {t('projectCalendar.undatedHint', { count: formatNumber(undatedCount, locale) })}
            </p>
          ) : null}
        </div>
      </FormCard>
      {query.isLoading ? <LoadingState /> : null}
      {!query.isLoading && !dated.length ? (
        <FormEmptyHint>{t('projectCalendar.emptyDated')}</FormEmptyHint>
      ) : null}
      {!query.isLoading && dated.length ? (
        <>
          <AgendaProposal items={dated} locale={locale} />
          <YearStripProposal key={`strip-${selectedYear}`} items={dated} year={selectedYear} locale={locale} />
          <YearGridProposal key={`grid-${selectedYear}`} items={dated} year={selectedYear} locale={locale} />
          <YearGridProposal
            key={`busy-${selectedYear}`}
            items={dated}
            year={selectedYear}
            locale={locale}
            onlyWithDeadlines
          />
          <MonthAgendaProposal
            key={`month-${selectedYear}`}
            items={dated}
            year={selectedYear}
            locale={locale}
          />
          <TimelineProposal key={`line-${selectedYear}`} items={dated} year={selectedYear} locale={locale} />
        </>
      ) : null}
    </div>
  )
}
