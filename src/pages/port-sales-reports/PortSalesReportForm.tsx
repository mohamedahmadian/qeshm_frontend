import { Anchor, CalendarDays, FileSpreadsheet, MapPin, Ship } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FileDropField } from '../../components/ui/FileDropField'
import { AppForm, FormActions, FormField } from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { getApiErrorMessage } from '../../lib/api'
import { todayIsoDate } from '../../lib/datetime'
import type { PortSalesReport } from '../../types/app'
import {
  DEFAULT_PORT_DESTINATION,
  DEFAULT_PORT_ORIGIN,
  PORT_OPTIONS,
} from './port-sales-report-paths'

const EXCEL_ACCEPT =
  '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel'

const MAX_EXCEL_BYTES = 20 * 1024 * 1024

export type PortSalesReportPayload = {
  reportDate: string
  origin: string
  destination: string
  file: File | null
}

export function PortSalesReportForm({
  initial,
  onSubmit,
}: {
  initial?: Pick<PortSalesReport, 'reportDate' | 'origin' | 'destination' | 'originalFileName'>
  onSubmit: (payload: PortSalesReportPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [reportDate, setReportDate] = useState(initial?.reportDate ?? todayIsoDate())
  const [origin, setOrigin] = useState(initial?.origin ?? DEFAULT_PORT_ORIGIN)
  const [destination, setDestination] = useState(initial?.destination ?? DEFAULT_PORT_DESTINATION)
  const [customPorts, setCustomPorts] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(initial)

  const portOptions = useMemo(() => {
    const values = [...PORT_OPTIONS, ...customPorts, origin, destination].filter(Boolean)
    return [...new Set(values)].map((value) => ({ value, label: value }))
  }, [customPorts, destination, origin])

  function addPort(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    setCustomPorts((current) => (current.includes(trimmed) ? current : [...current, trimmed]))
    return trimmed
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!reportDate) {
      toast.error(t('portSalesReports.reportDate'))
      return
    }
    if (!isEdit && !file) {
      toast.error(t('portSalesReports.fileRequired'))
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        reportDate,
        origin: origin.trim() || DEFAULT_PORT_ORIGIN,
        destination: destination.trim() || DEFAULT_PORT_DESTINATION,
        file,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={Ship}
      title={initial ? portTitle(initial) : t('portSalesReports.create')}
      subtitle={initial ? undefined : t('portSalesReports.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={CalendarDays} label={t('portSalesReports.reportDate')}>
          <PersianDateField
            value={reportDate}
            onChange={(value) => setReportDate(value ?? '')}
          />
        </FormField>
        <FormField icon={Anchor} label={t('portSalesReports.origin')}>
          <SearchSelect
            value={origin}
            onChange={setOrigin}
            options={portOptions}
            placeholder={t('portSalesReports.selectPort')}
            required
            onCreate={(query) => setOrigin(addPort(query) ?? query)}
            createLabel={(query) => t('portSalesReports.useCustomPort', { name: query })}
          />
        </FormField>
        <FormField icon={MapPin} label={t('portSalesReports.destination')}>
          <SearchSelect
            value={destination}
            onChange={setDestination}
            options={portOptions}
            placeholder={t('portSalesReports.selectPort')}
            required
            onCreate={(query) => setDestination(addPort(query) ?? query)}
            createLabel={(query) => t('portSalesReports.useCustomPort', { name: query })}
          />
        </FormField>
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
        <FormActions
          submitLabel={t('portSalesReports.save')}
          cancelLabel={t('portSalesReports.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}

function portTitle(initial: Pick<PortSalesReport, 'origin' | 'destination' | 'originalFileName'>) {
  return [initial.origin, initial.destination].filter(Boolean).join(' به ') || initial.originalFileName
}
