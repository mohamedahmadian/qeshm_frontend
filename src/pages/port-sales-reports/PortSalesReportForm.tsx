import { Anchor, CalendarDays, CalendarRange, FileSpreadsheet, MapPin, Ship } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { DateObject } from 'react-multi-date-picker'
import persian from 'react-date-object/calendars/persian'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FileDropField } from '../../components/ui/FileDropField'
import { AppForm, FormActions, FormField } from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../lib/api'
import { geoName } from '../../lib/geo'
import {
  displayDateParts,
  formatNumber,
  monthName,
  persianYearOptions,
  todayIsoDate,
  toIsoDateOnly,
  usesJalaliCalendar,
} from '../../lib/datetime'
import type { Port, PortSalesReport } from '../../types/app'
import { DEFAULT_PORT_ORIGIN } from './port-sales-report-paths'

const EXCEL_ACCEPT =
  '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel'

const MAX_EXCEL_BYTES = 20 * 1024 * 1024

export type PortSalesReportPayload = {
  reportDate: string
  origin: string
  destination: string
  file: File | null
}

export type PortSalesImportProgress = {
  phase: 'uploading' | 'parsing' | 'saving'
  percent: number
  processed?: number
  total?: number
}

export function PortSalesReportForm({
  initial,
  onSubmit,
}: {
  initial?: Pick<PortSalesReport, 'reportDate' | 'origin' | 'destination' | 'originalFileName'>
  onSubmit: (
    payload: PortSalesReportPayload,
    onProgress?: (progress: PortSalesImportProgress) => void,
  ) => Promise<void>
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const monthLocale = usesJalaliCalendar(locale) ? locale : 'fa'
  const initialPeriod = reportPeriodFromIso(initial?.reportDate)
  const [reportYear, setReportYear] = useState(initialPeriod.year)
  const [reportMonth, setReportMonth] = useState(initialPeriod.month)
  const [origin, setOrigin] = useState(initial?.origin ?? '')
  const [destination, setDestination] = useState(initial?.destination ?? '')
  const portsQuery = usePortsLookup()
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState<PortSalesImportProgress | null>(null)
  const isEdit = Boolean(initial)
  const yearOptions = useMemo(
    () => persianYearOptions(locale, Number(reportYear) || undefined),
    [locale, reportYear],
  )
  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const value = String(index + 1)
        return { value, label: monthName(index + 1, monthLocale) }
      }),
    [monthLocale],
  )

  const originOptions = useMemo(() => {
    const labels = new Map(
      (portsQuery.data ?? []).map((port) => [normalizePort(port.name), portNameWithCity(port.name, portsQuery.data, locale)]),
    )
    return portChoices([
      ...(portsQuery.data ?? []).map((port) => port.name),
      initial?.origin ?? '',
      initial?.destination ?? '',
    ]).map((option) => ({
      ...option,
      label: labels.get(normalizePort(option.value)) ?? option.label,
    }))
  }, [initial?.destination, initial?.origin, locale, portsQuery.data])
  const destinationOptions = useMemo(
    () => originOptions.filter((option) => !samePort(option.value, origin)),
    [origin, originOptions],
  )
  const soleDestination = destinationOptions.length === 1 ? destinationOptions[0]?.value : undefined

  useEffect(() => {
    if (initial || origin || !portsQuery.data?.length) return
    const preferred = portsQuery.data.find((port) => samePort(port.name, DEFAULT_PORT_ORIGIN))
    const first = portsQuery.data[0]
    if (!preferred && !first) return
    setOrigin(preferred?.name ?? first?.name ?? '')
  }, [initial, origin, portsQuery.data])

  useEffect(() => {
    if (!soleDestination || samePort(destination, soleDestination)) return
    setDestination(soleDestination)
  }, [destination, soleDestination])

  function selectOrigin(next: string) {
    const value = next.trim()
    if (!value) return
    setOrigin(value)
    setDestination((current) =>
      nextDestination(
        value,
        current,
        originOptions.map((option) => option.value),
      ),
    )
  }

  function selectDestination(next: string) {
    const value = next.trim()
    if (!value || samePort(value, origin)) {
      if (value) toast.error(t('portSalesReports.samePort'))
      return
    }
    setDestination(value)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const reportDate = reportDateFromPeriod(reportYear, reportMonth)
    if (!reportDate) {
      toast.error(t('portSalesReports.reportDate'))
      return
    }
    if (!isEdit && !file) {
      toast.error(t('portSalesReports.fileRequired'))
      return
    }
    const nextOrigin = origin.trim()
    const nextDestination = destination.trim()
    if (!nextOrigin || !nextDestination) {
      toast.error(t('portSalesReports.selectPort'))
      return
    }
    if (samePort(nextOrigin, nextDestination)) {
      toast.error(t('portSalesReports.samePort'))
      return
    }
    setSaving(true)
    if (!isEdit) setProgress({ phase: 'uploading', percent: 0 })
    try {
      await onSubmit(
        {
          reportDate,
          origin: nextOrigin,
          destination: nextDestination,
          file,
        },
        setProgress,
      )
    } catch (error) {
      const message =
        error instanceof Error && error.message && !('isAxiosError' in error)
          ? error.message
          : getApiErrorMessage(error, t('portSalesReports.importFailed'))
      toast.error(message)
    } finally {
      setSaving(false)
      setProgress(null)
    }
  }

  return (
    <FormCard
      icon={Ship}
      title={initial ? portRouteLabel(initial, portsQuery.data, locale) : t('portSalesReports.create')}
      subtitle={initial ? undefined : t('portSalesReports.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <FormField icon={CalendarRange} label={t('portSalesReports.reportYear')}>
              <SearchSelect
                value={reportYear}
                onChange={setReportYear}
                options={yearOptions}
                placeholder={t('portSalesReports.reportYear')}
                required
              />
            </FormField>
            <FormField icon={CalendarDays} label={t('portSalesReports.reportMonth')}>
              <SearchSelect
                value={reportMonth}
                onChange={setReportMonth}
                options={monthOptions}
                placeholder={t('portSalesReports.reportMonth')}
                required
              />
            </FormField>
          </div>
          <p className="text-sm leading-7 text-ink-600">{t('portSalesReports.reportMonthHint')}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField icon={Anchor} label={t('portSalesReports.origin')}>
            <SearchSelect
              value={origin}
              onChange={selectOrigin}
              options={originOptions}
              placeholder={t('portSalesReports.selectPort')}
              disabled={portsQuery.isLoading}
              required
            />
          </FormField>
          <FormField icon={MapPin} label={t('portSalesReports.destination')}>
            <SearchSelect
              value={destination}
              onChange={selectDestination}
              options={destinationOptions}
              placeholder={t('portSalesReports.selectPort')}
              disabled={portsQuery.isLoading}
              required
            />
          </FormField>
        </div>
        {!portsQuery.isLoading && (portsQuery.data?.length ?? 0) === 0 ? (
          <p className="text-sm leading-7 text-ink-600">{t('portSalesReports.noPorts')}</p>
        ) : null}
        {isEdit ? null : (
          <FormField icon={FileSpreadsheet} label={t('portSalesReports.file')}>
            <FileDropField
              accept={EXCEL_ACCEPT}
              allowCamera={false}
              maxBytes={MAX_EXCEL_BYTES}
              hideLocalPreview
              onFile={setFile}
              onClear={() => setFile(null)}
            />
            <p className="text-xs leading-6 text-ink-500">{t('portSalesReports.fileHint')}</p>
          </FormField>
        )}
        {progress ? (
          <ImportProgressBar progress={progress} locale={i18n.language} />
        ) : null}
        <FormActions
          className="justify-center"
          submitLabel={t(isEdit ? 'portSalesReports.save' : 'portSalesReports.saveAndUpload')}
          cancelLabel={saving ? undefined : t('portSalesReports.cancel')}
          submitting={saving}
          onCancel={saving ? undefined : () => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}

function ImportProgressBar({
  progress,
  locale,
}: {
  progress: PortSalesImportProgress
  locale: string
}) {
  const { t } = useTranslation()
  const percent = Math.max(0, Math.min(100, Math.round(progress.percent)))
  const label =
    progress.phase === 'saving' && progress.total
      ? t('portSalesReports.progress.savingCount', {
          processed: formatNumber(progress.processed ?? 0, locale),
          total: formatNumber(progress.total, locale),
        })
      : t(`portSalesReports.progress.${progress.phase}`)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm text-ink-600">
        <span>{label}</span>
        <span className="tabular-nums" dir="ltr">
          {formatNumber(percent, locale)}٪
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-cream-100"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-teal-500 transition-[width] duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

function reportPeriodFromIso(iso?: string | null) {
  const parts = displayDateParts(iso || todayIsoDate(), 'fa')
  return {
    year: parts ? String(parts.year) : '',
    month: parts ? String(parts.month) : '',
  }
}

function reportDateFromPeriod(year: string, month: string) {
  const y = Number(year)
  const m = Number(month)
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) return ''
  return toIsoDateOnly(new DateObject({ year: y, month: m, day: 1, calendar: persian }))
}

function normalizePort(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function samePort(left: string, right: string) {
  return normalizePort(left) === normalizePort(right)
}

function nextDestination(nextOrigin: string, current: string, ports: string[]) {
  const remaining = portChoices([...ports, nextOrigin, current]).filter(
    (option) => !samePort(option.value, nextOrigin),
  )
  const sole = remaining.length === 1 ? remaining[0]?.value : undefined
  if (sole) return sole
  if (!current || samePort(current, nextOrigin)) return ''
  return current
}

export function usePortsLookup() {
  return useQuery({
    queryKey: ['ports', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<Port[]>('/ports')
      return data
    },
  })
}

export function portNameWithCity(name: string, ports: Port[] | undefined, locale: string) {
  const value = name.trim()
  if (!value) return value
  const match = ports?.find((port) => samePort(port.name, value))
  const city = match ? geoName(match.city, locale).trim() : ''
  return city ? `${value} (${city})` : value
}

export function portRouteLabel(
  item: { origin?: string | null; destination?: string | null; originalFileName?: string | null },
  ports: Port[] | undefined,
  locale: string,
) {
  const route = [item.origin, item.destination]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => portNameWithCity(value, ports, locale))
    .join(' به ')
  return route || item.originalFileName || ''
}

function portChoices(values: string[]) {
  const seen = new Set<string>()
  const options: { value: string; label: string }[] = []
  for (const raw of values) {
    const value = raw.trim()
    const key = normalizePort(value)
    if (!key || seen.has(key)) continue
    seen.add(key)
    options.push({ value, label: value })
  }
  return options
}

