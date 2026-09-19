import { CalendarDays, CalendarRange, ChartGantt, ListChecks } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader, listShellClassName } from '../../../components/ui/Form'
import { LoadingState } from '../../../components/ui/LoadingState'
import { displayYearNow } from '../../../lib/datetime'
import { projectsWithEndDate } from '../../../lib/project-calendar'
import type { ResolutionCalendarItem } from '../../../lib/resolution-calendar'
import { BoardMinutesDossierModal } from '../BoardMinutesDossierModal'
import {
  ResolutionAgendaProposal,
  ResolutionTimelineProposal,
  ResolutionYearStripProposal,
} from './ResolutionCalendarViews'
import { useResolutionCalendarItems } from './useResolutionCalendarItems'

const tabs = ['timeline', 'nearest', 'yearStrip'] as const
type CalendarTab = (typeof tabs)[number]

const tabIcons = {
  timeline: ChartGantt,
  nearest: ListChecks,
  yearStrip: CalendarRange,
} as const

export function ResolutionCalendarPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const query = useResolutionCalendarItems()
  const [tab, setTab] = useState<CalendarTab>('timeline')
  const [dossier, setDossier] = useState<{ minutesId: string; resolutionId: string } | null>(null)
  const dated = useMemo(() => projectsWithEndDate(query.data ?? []), [query.data])
  const selectedYear = displayYearNow(locale)

  function openDossier(item: ResolutionCalendarItem) {
    setDossier({ minutesId: item.minutesId, resolutionId: item.id })
  }

  return (
    <div className={`${listShellClassName} space-y-5`}>
      <PageHeader
        icon={CalendarDays}
        title={t('boardCalendar.title')}
        subtitle={t('boardCalendar.subtitle')}
      />
      <nav className="flex flex-wrap gap-2">
        {tabs.map((item) => {
          const Icon = tabIcons[item]
          const active = tab === item
          return (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-medium transition ${
                active
                  ? 'bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]'
                  : 'bg-white text-ink-700 shadow-[0_6px_14px_rgba(46,189,182,0.12)] ring-1 ring-teal-400 hover:bg-cream-50'
              }`}
            >
              <Icon className={`size-3.5 ${active ? 'text-white' : 'text-teal-600'}`} aria-hidden />
              {t(`boardCalendar.tabs.${item}`)}
            </button>
          )
        })}
      </nav>
      {query.isLoading ? <LoadingState /> : null}
      {!query.isLoading && tab === 'timeline' ? (
        <ResolutionTimelineProposal
          key={`line-${selectedYear}`}
          items={dated}
          year={selectedYear}
          locale={locale}
          onOpenDossier={openDossier}
        />
      ) : null}
      {!query.isLoading && tab === 'nearest' ? (
        <ResolutionAgendaProposal items={dated} locale={locale} onOpenDossier={openDossier} />
      ) : null}
      {!query.isLoading && tab === 'yearStrip' ? (
        <ResolutionYearStripProposal
          key={`strip-${selectedYear}`}
          items={dated}
          year={selectedYear}
          locale={locale}
          onOpenDossier={openDossier}
        />
      ) : null}
      <BoardMinutesDossierModal
        minutesId={dossier?.minutesId ?? null}
        focusResolutionId={dossier?.resolutionId}
        locale={locale}
        onClose={() => setDossier(null)}
      />
    </div>
  )
}
