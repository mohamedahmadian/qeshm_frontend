import { CalendarDays } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  formatGregorianDate,
  formatHijriDate,
  formatJalaliDate,
  formatWeekday,
  todayIsoDate,
} from '../../lib/datetime'

function useTodayIso() {
  const [iso, setIso] = useState(todayIsoDate)

  useEffect(() => {
    let timeoutId = 0
    function schedule() {
      const now = new Date()
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        1,
      )
      timeoutId = window.setTimeout(() => {
        setIso(todayIsoDate())
        schedule()
      }, Math.max(1000, nextMidnight.getTime() - now.getTime()))
    }
    schedule()
    return () => window.clearTimeout(timeoutId)
  }, [])

  return iso
}

function CalendarCol({
  label,
  value,
  dir,
  lang,
  className = '',
}: {
  label: string
  value: string
  dir?: 'ltr' | 'rtl'
  lang?: string
  className?: string
}) {
  if (!value) return null
  return (
    <span
      className={`flex min-w-0 flex-col gap-0.5 px-2.5 sm:px-3 ${className}`}
    >
      <span className="text-[10px] font-medium leading-none text-teal-700">{label}</span>
      <span
        className="truncate text-sm font-semibold leading-tight text-ink-900"
        dir={dir}
        lang={lang}
        title={value}
      >
        {value}
      </span>
    </span>
  )
}

export function HeaderToday() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const iso = useTodayIso()
  const weekday = formatWeekday(iso, locale)
  const jalali = formatJalaliDate(iso, locale)
  const hijri = formatHijriDate(iso, locale)
  const gregorian = formatGregorianDate(iso, locale)

  return (
    <time
      dateTime={iso}
      aria-label={t('nav.todayCalendars')}
      className="flex max-w-[min(100%,22rem)] shrink-0 items-center gap-2 overflow-hidden rounded-2xl border border-line bg-white py-1.5 pe-2 ps-1.5 shadow-sm sm:max-w-none sm:gap-2.5 sm:py-2 sm:pe-3 sm:ps-2"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-mint-500 text-white shadow-[0_6px_12px_rgba(46,189,182,0.28)]">
        <CalendarDays className="size-4" aria-hidden />
      </span>
      {weekday ? (
        <span className="hidden min-w-0 flex-col justify-center xl:flex">
          <span className="text-[10px] font-medium leading-none text-ink-400">
            {t('common.today')}
          </span>
          <span className="mt-0.5 truncate text-xs font-semibold leading-tight text-teal-800">
            {weekday}
          </span>
        </span>
      ) : null}
      <span className="flex min-w-0 items-stretch">
        <CalendarCol label={t('common.calendarJalali')} value={jalali} dir="ltr" />
        <CalendarCol
          className="hidden border-s border-line md:flex"
          label={t('common.calendarHijri')}
          value={hijri}
          dir="rtl"
          lang="ar"
        />
        <CalendarCol
          className="hidden border-s border-line md:flex"
          label={t('common.calendarGregorian')}
          value={gregorian}
          dir="ltr"
        />
      </span>
    </time>
  )
}
