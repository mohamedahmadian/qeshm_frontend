import {
  BadgeCheck,
  Banknote,
  CalendarDays,
  Car,
  HandCoins,
  Ticket,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, fieldClassName, fieldErrorClassName } from '../../components/ui/Form'
import { FormCard, FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { getApiErrorMessage } from '../../lib/api'
import { currentPersianYear, formatGroupedNumber, localizeDigits, parseDigitString } from '../../lib/datetime'
import type { TicketTariff } from '../../types/app'

export type TicketTariffPayload = {
  year: number
  individualPrice: number
  individualQeshmondiPrice: number
  vehiclePrice: number
  vehicleQeshmondiPrice: number
}

export function TicketTariffForm({
  initial,
  onSubmit,
}: {
  initial?: Pick<
    TicketTariff,
    'year' | 'individualPrice' | 'individualQeshmondiPrice' | 'vehiclePrice' | 'vehicleQeshmondiPrice'
  >
  onSubmit: (payload: TicketTariffPayload) => Promise<void>
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [year, setYear] = useState(initial ? String(initial.year) : String(currentPersianYear()))
  const [individualPrice, setIndividualPrice] = useState(initial ? String(initial.individualPrice) : '')
  const [individualQeshmondiPrice, setIndividualQeshmondiPrice] = useState(
    initial ? String(initial.individualQeshmondiPrice) : '',
  )
  const [vehiclePrice, setVehiclePrice] = useState(initial ? String(initial.vehiclePrice) : '')
  const [vehicleQeshmondiPrice, setVehicleQeshmondiPrice] = useState(
    initial ? String(initial.vehicleQeshmondiPrice) : '',
  )
  const [saving, setSaving] = useState(false)
  const individualSubsidy = priceGap(individualPrice, individualQeshmondiPrice)
  const vehicleSubsidy = priceGap(vehiclePrice, vehicleQeshmondiPrice)
  const yearChoices = useMemo(() => tariffYearOptions(initial?.year), [initial?.year])
  const yearLabel = localizeDigits(year, locale)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (individualSubsidy != null && individualSubsidy < 0) {
      toast.error(t('ticketTariffs.individualSubsidyNegative'))
      return
    }
    if (vehicleSubsidy != null && vehicleSubsidy < 0) {
      toast.error(t('ticketTariffs.vehicleSubsidyNegative'))
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        year: Number(year),
        individualPrice: Number(individualPrice),
        individualQeshmondiPrice: Number(individualQeshmondiPrice),
        vehiclePrice: Number(vehiclePrice),
        vehicleQeshmondiPrice: Number(vehicleQeshmondiPrice),
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={Ticket}
      title={initial ? yearLabel : t('ticketTariffs.create')}
      subtitle={initial ? undefined : t('ticketTariffs.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <div className="space-y-3">
          <FormSectionTitle icon={CalendarDays}>{t('ticketTariffs.yearSection')}</FormSectionTitle>
          <FormField icon={CalendarDays} label={t('ticketTariffs.year')} htmlFor="ticket-tariff-year">
            <SearchSelect
              id="ticket-tariff-year"
              value={year}
              onChange={setYear}
              required
              placeholder={t('ticketTariffs.selectYear')}
              options={yearChoices.map((item) => ({
                value: String(item),
                label: localizeDigits(String(item), locale),
              }))}
            />
          </FormField>
        </div>
        <div className="space-y-3">
          <FormSectionTitle icon={UserRound}>{t('ticketTariffs.individualSection')}</FormSectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MoneyField
              id="individual-price"
              icon={UserRound}
              label={t('ticketTariffs.individualPrice')}
              value={individualPrice}
              onChange={setIndividualPrice}
              locale={locale}
              unit={t('ticketTariffs.toman')}
            />
            <MoneyField
              id="individual-qeshmondi-price"
              icon={BadgeCheck}
              label={t('ticketTariffs.individualQeshmondiPrice')}
              value={individualQeshmondiPrice}
              onChange={setIndividualQeshmondiPrice}
              locale={locale}
              unit={t('ticketTariffs.toman')}
            />
            <MoneyField
              id="individual-subsidy"
              icon={HandCoins}
              label={t('ticketTariffs.individualSubsidy')}
              value={individualSubsidy == null ? '' : String(individualSubsidy)}
              locale={locale}
              unit={t('ticketTariffs.toman')}
              readOnly
              invalid={individualSubsidy != null && individualSubsidy < 0}
              hint={t('ticketTariffs.subsidyHint')}
            />
          </div>
        </div>
        <div className="space-y-3">
          <FormSectionTitle icon={Car}>{t('ticketTariffs.vehicleSection')}</FormSectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MoneyField
              id="vehicle-price"
              icon={Car}
              label={t('ticketTariffs.vehiclePrice')}
              value={vehiclePrice}
              onChange={setVehiclePrice}
              locale={locale}
              unit={t('ticketTariffs.toman')}
            />
            <MoneyField
              id="vehicle-qeshmondi-price"
              icon={BadgeCheck}
              label={t('ticketTariffs.vehicleQeshmondiPrice')}
              value={vehicleQeshmondiPrice}
              onChange={setVehicleQeshmondiPrice}
              locale={locale}
              unit={t('ticketTariffs.toman')}
            />
            <MoneyField
              id="vehicle-subsidy"
              icon={Banknote}
              label={t('ticketTariffs.vehicleSubsidy')}
              value={vehicleSubsidy == null ? '' : String(vehicleSubsidy)}
              locale={locale}
              unit={t('ticketTariffs.toman')}
              readOnly
              invalid={vehicleSubsidy != null && vehicleSubsidy < 0}
              hint={t('ticketTariffs.subsidyHint')}
            />
          </div>
        </div>
        <FormActions
          submitLabel={t('ticketTariffs.save')}
          cancelLabel={t('ticketTariffs.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}

function MoneyField({
  id,
  icon,
  label,
  value,
  onChange,
  locale,
  unit,
  readOnly = false,
  invalid = false,
  hint,
}: {
  id: string
  icon: LucideIcon
  label: string
  value: string
  onChange?: (value: string) => void
  locale: string
  unit: string
  readOnly?: boolean
  invalid?: boolean
  hint?: string
}) {
  const shown =
    value === '' || !Number.isFinite(Number(value)) ? '' : formatGroupedNumber(Number(value), locale)
  return (
    <FormField icon={icon} label={`${label} (${unit})`} htmlFor={id}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        readOnly={readOnly}
        tabIndex={readOnly ? -1 : undefined}
        required={!readOnly}
        aria-invalid={invalid || undefined}
        className={`${fieldClassName} digit-field ${readOnly ? 'bg-white text-ink-700' : ''} ${invalid ? fieldErrorClassName : ''}`}
        value={shown}
        onChange={
          readOnly
            ? undefined
            : (event) => {
                onChange?.(parseDigitString(event.target.value))
              }
        }
      />
      {hint ? <p className="text-xs leading-6 text-ink-500">{hint}</p> : null}
    </FormField>
  )
}

function priceGap(regular: string, resident: string) {
  if (regular === '' || resident === '') return null
  const left = Number(regular)
  const right = Number(resident)
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null
  return left - right
}

function tariffYearOptions(selected?: number) {
  const current = currentPersianYear()
  const years = new Set<number>()
  for (let year = current + 1; year >= current - 20; year -= 1) {
    years.add(year)
  }
  if (selected != null && Number.isFinite(selected)) years.add(selected)
  return [...years].sort((a, b) => b - a)
}
