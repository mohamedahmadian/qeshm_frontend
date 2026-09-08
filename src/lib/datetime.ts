import { DateObject } from 'react-multi-date-picker'
import arabic from 'react-date-object/calendars/arabic'
import gregorian from 'react-date-object/calendars/gregorian'
import persian from 'react-date-object/calendars/persian'
import arabic_ar from 'react-date-object/locales/arabic_ar'
import gregorian_en from 'react-date-object/locales/gregorian_en'
import gregorian_hi from 'react-date-object/locales/gregorian_hi'
import persian_fa from 'react-date-object/locales/persian_fa'

export const numberingDigits: Record<string, string[]> = {
  fa: ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'],
  ar: ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'],
  ur: ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'],
  hi: ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'],
  en: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
}

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

export function localizeDigits(input: string, locale: string) {
  const digits = numberingDigits[locale] ?? numberingDigits.en
  return input.replace(/\d/g, (digit) => digits[Number(digit)] ?? digit)
}

export function toLatinDigits(input: string) {
  return input.replace(/[۰-۹٠-٩०-९]/g, (digit) => {
    const fa = numberingDigits.fa.indexOf(digit)
    if (fa >= 0) return String(fa)
    const ar = numberingDigits.ar.indexOf(digit)
    if (ar >= 0) return String(ar)
    const hi = numberingDigits.hi.indexOf(digit)
    if (hi >= 0) return String(hi)
    return digit
  })
}

function toGregorianDateObject(value: string, dateOnly: boolean) {
  const normalized = toLatinDigits(value)
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(normalized)
  if (dateOnly && match) {
    return new DateObject({
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
      calendar: gregorian,
    })
  }
  return new DateObject(new Date(normalized))
}

export function usesJalaliCalendar(locale: string) {
  return locale === 'fa' || locale === 'ar' || locale === 'ur'
}

export function isLtrLocale(locale: string) {
  return locale === 'en' || locale === 'hi'
}

export const persianArLocale = {
  name: 'persian_ar',
  months: [
    ['فروردين', 'فر'],
    ['أرديبهشت', 'أر'],
    ['خرداد', 'خرد'],
    ['تير', 'تير'],
    ['مرداد', 'مر'],
    ['شهريور', 'شه'],
    ['مهر', 'مه'],
    ['آبان', 'آبا'],
    ['آذر', 'آذ'],
    ['دي', 'دي'],
    ['بهمن', 'بهم'],
    ['إسفند', 'اسف'],
  ],
  weekDays: [
    ['السبت', 'سبت'],
    ['الأحد', 'أحد'],
    ['الإثنين', 'إثن'],
    ['الثلاثاء', 'ثلا'],
    ['الأربعاء', 'أرب'],
    ['الخميس', 'خمي'],
    ['الجمعة', 'جمع'],
  ],
  digits: numberingDigits.ar,
  meridiems: [
    ['صباحاً', 'ص'],
    ['مساءً', 'م'],
  ],
}

export function datePickerCalendar(locale: string) {
  return usesJalaliCalendar(locale) ? persian : gregorian
}

export function datePickerLocale(locale: string) {
  if (locale === 'ar') return persianArLocale
  if (usesJalaliCalendar(locale)) return persian_fa
  if (locale === 'hi') return gregorian_hi
  return gregorian_en
}

function cloneDateObject(date: DateObject) {
  return new DateObject({
    year: date.year,
    month: date.month.number,
    day: date.day,
    calendar: date.calendar,
  })
}

function toDisplayDate(value: string, locale: string, dateOnly: boolean) {
  const calendar = usesJalaliCalendar(locale) ? persian : gregorian
  return cloneDateObject(toGregorianDateObject(value, dateOnly)).convert(calendar)
}

export function calendarDayParts(date: DateObject, locale: string) {
  const hijriDay = cloneDateObject(date).convert(arabic).day
  const gregorianDay = cloneDateObject(date).convert(gregorian).day
  const jalaliDay = cloneDateObject(date).convert(persian).day
  return {
    primary: localizeDigits(String(date.day), locale),
    hijri: localizeDigits(String(hijriDay), locale),
    other: localizeDigits(
      String(usesJalaliCalendar(locale) ? gregorianDay : jalaliDay),
      locale,
    ),
  }
}

export function formatDate(value: string, locale: string) {
  const date = toDisplayDate(value, locale, true)
  return localizeDigits(
    `${date.year}/${date.month.number}/${date.day}`,
    locale,
  )
}

export function formatHijriDate(value: string, locale: string) {
  const date = fromIsoDateOnly(value)
  if (!date) return ''
  const hijri = cloneDateObject(date).convert(arabic, arabic_ar)
  const month = String(hijri.month?.name ?? '').trim()
  return localizeDigits(`${hijri.day} ${month} ${hijri.year}`, locale)
}

export function formatGregorianDate(value: string, locale: string) {
  const date = fromIsoDateOnly(value)
  if (!date) return ''
  const gregorianDate = cloneDateObject(date).convert(gregorian)
  return localizeDigits(
    `${gregorianDate.year}/${gregorianDate.month.number}/${gregorianDate.day}`,
    locale,
  )
}

export function formatJalaliDate(value: string, locale: string) {
  const date = fromIsoDateOnly(value)
  if (!date) return ''
  const jalaliDate = cloneDateObject(date).convert(persian)
  return localizeDigits(
    `${jalaliDate.year}/${jalaliDate.month.number}/${jalaliDate.day}`,
    locale,
  )
}

export function formatWeekday(value: string, locale: string) {
  const date = fromIsoDateOnly(value)
  if (!date) return ''
  const calendar = usesJalaliCalendar(locale) ? persian : gregorian
  const converted = cloneDateObject(date).convert(calendar, datePickerLocale(locale))
  const name = converted.weekDay?.name
  return typeof name === 'string' ? name.trim() : ''
}

function yearSpanLabel(from: number, to: number, locale: string) {
  if (from === to) return formatNumber(from, locale)
  return `${formatNumber(from, locale)}–${formatNumber(to, locale)}`
}

export function formatJalaliYearEquivalents(jalaliYear: number, locale: string) {
  if (!Number.isFinite(jalaliYear) || jalaliYear < 1) {
    return { gregorian: '', hijri: '' }
  }
  const start = new DateObject({
    year: jalaliYear,
    month: 1,
    day: 1,
    calendar: persian,
  })
  const end = new DateObject({
    year: jalaliYear,
    month: 12,
    day: 1,
    calendar: persian,
  }).toLastOfMonth()
  const gregorianStart = cloneDateObject(start).convert(gregorian).year
  const gregorianEnd = cloneDateObject(end).convert(gregorian).year
  const hijriStart = cloneDateObject(start).convert(arabic).year
  const hijriEnd = cloneDateObject(end).convert(arabic).year
  return {
    gregorian: yearSpanLabel(gregorianStart, gregorianEnd, locale),
    hijri: yearSpanLabel(hijriStart, hijriEnd, locale),
  }
}

export function formatDateTimeDate(value: string, locale: string) {
  const date = toDisplayDate(value, locale, false)
  return localizeDigits(
    `${date.year}/${pad2(date.month.number)}/${pad2(date.day)}`,
    locale,
  )
}

export function formatTime(value: string, locale: string) {
  const time = new Date(value)
  return localizeDigits(
    `${pad2(time.getHours())}:${pad2(time.getMinutes())}:${pad2(time.getSeconds())}`,
    locale,
  )
}

export function formatDateTime(value: string, locale: string) {
  return `${formatDateTimeDate(value, locale)} ${formatTime(value, locale)}`
}

export function elapsedDurationParts(fromIso: string, nowMs = Date.now()) {
  const start = Date.parse(fromIso)
  if (!Number.isFinite(start)) return null
  const totalSeconds = Math.max(0, Math.floor((nowMs - start) / 1000))
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  }
}

export function formatNumber(value: number, locale: string) {
  return localizeDigits(String(value), locale)
}

export function parseDigitString(input: string) {
  return toLatinDigits(input).replace(/\D/g, '')
}

export function formatGroupedNumber(value: number, locale: string) {
  if (!Number.isFinite(value)) {
    return ''
  }
  const grouped = Math.trunc(value).toLocaleString('en-US')
  const withSeparator = isLtrLocale(locale) ? grouped : grouped.replace(/,/g, '٬')
  return localizeDigits(withSeparator, locale)
}

/** Integer grouping plus optional decimals (for stock like ۱۰۰٬۰۰۰ or ۱٫۵). */
export function formatGroupedQuantity(value: number, locale: string, fractionDigits = 3) {
  if (!Number.isFinite(value)) {
    return ''
  }
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  const factor = 10 ** fractionDigits
  const rounded = Math.round(abs * factor) / factor
  const intPart = Math.trunc(rounded)
  const frac = Math.round((rounded - intPart) * factor)
  const grouped = `${sign}${formatGroupedNumber(intPart, locale)}`
  if (frac === 0) {
    return grouped
  }
  const fracStr = String(frac).padStart(fractionDigits, '0').replace(/0+$/, '')
  return `${grouped}.${localizeDigits(fracStr, locale)}`
}

export function currentPersianYear() {
  return new DateObject({ calendar: persian }).year
}

export function collaborationYears(startYear?: number | null) {
  if (startYear == null || !Number.isFinite(startYear)) return null
  const current = currentPersianYear()
  if (startYear < 1300 || startYear > current) return null
  return Math.max(1, Math.ceil(current - startYear))
}

export function persianYearOptions(locale: string, selected?: number) {
  const current = currentPersianYear()
  const max = Math.max(current + 1, selected ?? current)
  const min = Math.min(current - 10, selected ?? current)
  const options = []
  for (let year = max; year >= min; year -= 1) {
    options.push({ value: String(year), label: formatNumber(year, locale) })
  }
  return options
}

export function fromIsoDateOnly(value?: string) {
  if (!value) return undefined
  return toGregorianDateObject(value, true)
}

export function toIsoDateOnly(date: DateObject) {
  const gregorianDate = new DateObject({
    year: date.year,
    month: date.month.number,
    day: date.day,
    calendar: date.calendar,
  }).convert(gregorian)
  return `${gregorianDate.year}-${pad2(gregorianDate.month.number)}-${pad2(gregorianDate.day)}`
}

export function todayIsoDate() {
  return toIsoDateOnly(new DateObject({ calendar: gregorian }))
}

/** شنبهٔ هفتهٔ جاری در تقویم ایران */
export function startOfIranWeekIso(iso = todayIsoDate()) {
  const js = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(js.getTime())) return iso
  const daysSinceSaturday = (js.getDay() + 1) % 7
  return addDaysIso(iso, -daysSinceSaturday)
}

export function endOfIranWeekIso(iso = todayIsoDate()) {
  return addDaysIso(startOfIranWeekIso(iso), 6)
}

export function addDaysIso(iso: string, days: number) {
  const date = fromIsoDateOnly(iso)
  if (!date) return ''
  return toIsoDateOnly(date.add(days, 'days'))
}
