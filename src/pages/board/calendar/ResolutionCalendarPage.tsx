import { CalendarDays, CalendarRange } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FormField, PageHeader, listShellClassName } from '../../../components/ui/Form'
import { FormCard, FormEmptyHint, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { LoadingState } from '../../../components/ui/LoadingState'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { displayYearNow, formatNumber } from '../../../lib/datetime'
import { calendarYearOptions, projectsWithEndDate } from '../../../lib/project-calendar'
import {
  ResolutionAgendaProposal,
  ResolutionTimelineProposal,
  ResolutionYearStripProposal,
} from './ResolutionCalendarViews'
import { useResolutionCalendarItems } from './useResolutionCalendarItems'

export function ResolutionCalendarPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const query = useResolutionCalendarItems()
  const [year, setYear] = useState(() => String(displayYearNow(locale)))

  useEffect(() => {
    setYear(String(displayYearNow(locale)))
  }, [locale])

  const dated = useMemo(() => projectsWithEndDate(query.data ?? []), [query.data])
  const yearOptions = useMemo(
    () =>
      calendarYearOptions(query.data ?? [], locale).map((value) => ({
        value: String(value),
        label: formatNumber(value, locale),
      })),
    [locale, query.data],
  )
  const selectedYear = Number(year) || displayYearNow(locale)

  return (
    <div className={`${listShellClassName} space-y-5`}>
      <PageHeader
        icon={CalendarDays}
        title={t('boardCalendar.title')}
        subtitle={t('boardCalendar.subtitle')}
      />
      <FormCard
        icon={CalendarRange}
        title={t('boardCalendar.filters')}
        subtitle={t('boardCalendar.filtersHint')}
      >
        <div className={formCardBodyClassName}>
          <FormField icon={CalendarRange} label={t('boardCalendar.year')}>
            <SearchSelect
              value={year}
              onChange={setYear}
              options={yearOptions}
              placeholder={t('boardCalendar.yearPlaceholder')}
            />
          </FormField>
        </div>
      </FormCard>
      {query.isLoading ? <LoadingState /> : null}
      {!query.isLoading && !dated.length ? (
        <FormEmptyHint>{t('boardCalendar.emptyDated')}</FormEmptyHint>
      ) : null}
      {!query.isLoading && dated.length ? (
        <>
          <ResolutionAgendaProposal items={dated} locale={locale} />
          <ResolutionYearStripProposal key={`strip-${selectedYear}`} items={dated} year={selectedYear} locale={locale} />
          <ResolutionTimelineProposal key={`line-${selectedYear}`} items={dated} year={selectedYear} locale={locale} />
        </>
      ) : null}
    </div>
  )
}
