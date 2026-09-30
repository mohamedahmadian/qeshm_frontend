import { Building2, CalendarRange, Check, ClipboardCheck, Store, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { CheckboxField } from '../../../components/ui/CheckboxField'
import { confirmToast } from '../../../components/ui/confirmToast'
import { AppForm, Button, FormField } from '../../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { PersianDateField } from '../../../components/ui/PersianDateField'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../../lib/api'
import { formatNumber } from '../../../lib/datetime'
import type { OrganizationUnit, Restaurant } from '../../../types/app'

type RangePayload = {
  reservedFrom: string
  reservedTo?: string
  orgUnitId?: string
  restaurantId?: string
}

export function FoodReservationBulkActions() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const queryClient = useQueryClient()
  const [orgUnitId, setOrgUnitId] = useState('')
  const [restaurantId, setRestaurantId] = useState('')
  const [reservedFrom, setReservedFrom] = useState('')
  const [reservedTo, setReservedTo] = useState('')
  const [includeConfirmed, setIncludeConfirmed] = useState(false)
  const [saving, setSaving] = useState(false)

  const units = useQuery({
    queryKey: ['organization-units', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnit[]>('/organization/units')
      return data
    },
  })
  const restaurants = useQuery({
    queryKey: ['restaurants', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<Restaurant[]>('/restaurants')
      return data
    },
  })

  function rangePayload(): RangePayload | null {
    if (!reservedFrom) {
      toast.error(t('foodReservations.bulkDateRequired'))
      return null
    }
    if (reservedTo && reservedTo < reservedFrom) {
      toast.error(t('foodReservations.bulkRangeInvalid'))
      return null
    }
    return {
      reservedFrom,
      ...(reservedTo ? { reservedTo } : {}),
      ...(orgUnitId ? { orgUnitId } : {}),
      ...(restaurantId ? { restaurantId } : {}),
    }
  }

  async function runAction(path: string, payload: RangePayload & { includeConfirmed?: boolean }, successKey: string) {
    setSaving(true)
    try {
      const { data } = await api.post<{ count: number }>(path, payload)
      if (data.count === 0) {
        toast.message(t('foodReservations.bulkNone'))
      } else {
        toast.success(t(successKey, { count: formatNumber(data.count, locale) }))
      }
      void queryClient.invalidateQueries({ queryKey: ['food-reservations'] })
      void queryClient.invalidateQueries({ queryKey: ['food-reservation'] })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  function confirmRange() {
    const payload = rangePayload()
    if (!payload) return
    confirmToast({
      title: t('foodReservations.bulkConfirmAsk'),
      confirmLabel: t('foodReservations.bulkConfirm'),
      cancelLabel: t('foodReservations.cancel'),
      onConfirm: () => runAction('/food-reservations/confirm-range', payload, 'foodReservations.bulkConfirmedSuccess'),
    })
  }

  function deleteRange() {
    const payload = rangePayload()
    if (!payload) return
    confirmToast({
      title: t(
        includeConfirmed
          ? 'foodReservations.bulkDeleteAskAll'
          : 'foodReservations.bulkDeleteAskPending',
      ),
      confirmLabel: t('foodReservations.bulkDelete'),
      cancelLabel: t('foodReservations.cancel'),
      confirmVariant: 'danger',
      onConfirm: () =>
        runAction(
          '/food-reservations/cancel-range',
          { ...payload, includeConfirmed },
          'foodReservations.bulkDeletedSuccess',
        ),
    })
  }

  return (
    <FormCard
      className="mb-6"
      icon={ClipboardCheck}
      title={t('foodReservations.bulkTitle')}
      subtitle={t('foodReservations.bulkSubtitle')}
      onDoubleClick={() => {}}
    >
      <AppForm
        autoFocusFirst={false}
        className={formCardBodyClassName}
        onSubmit={(event) => {
          event.preventDefault()
          confirmRange()
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField icon={Store} label={t('foodReservations.restaurant')} htmlFor="bulkRestaurant">
            <SearchSelect
              id="bulkRestaurant"
              value={restaurantId}
              onChange={setRestaurantId}
              placeholder={t('foodReservations.selectRestaurant')}
              options={[
                { value: '', label: t('foodReservations.allRestaurants') },
                ...(restaurants.data ?? []).map((item) => ({ value: item.id, label: item.name })),
              ]}
            />
          </FormField>
          <FormField icon={Building2} label={t('foodReservations.orgUnit')} htmlFor="bulkUnit">
            <SearchSelect
              id="bulkUnit"
              value={orgUnitId}
              onChange={setOrgUnitId}
              placeholder={t('foodReservations.filterUnit')}
              options={[
                { value: '', label: t('foodReservations.allUnits') },
                ...(units.data ?? []).map((unit) => ({
                  value: unit.id,
                  label: unit.pathLabel || unit.name,
                })),
              ]}
            />
          </FormField>
          <FormField icon={CalendarRange} label={t('foodReservations.bulkFrom')} htmlFor="bulkFrom">
            <PersianDateField
              id="bulkFrom"
              value={reservedFrom}
              maxDate={reservedTo || undefined}
              onChange={(value) => {
                const next = value ?? ''
                setReservedFrom(next)
                if (reservedTo && next && reservedTo < next) {
                  setReservedTo('')
                }
              }}
            />
          </FormField>
          <FormField icon={CalendarRange} label={t('foodReservations.bulkTo')} htmlFor="bulkTo">
            <PersianDateField
              id="bulkTo"
              value={reservedTo}
              minDate={reservedFrom || undefined}
              onChange={(value) => setReservedTo(value ?? '')}
            />
            <p className="text-xs text-ink-500">{t('foodReservations.bulkToHint')}</p>
          </FormField>
        </div>
        <FormField icon={Trash2} label={t('foodReservations.bulkDeleteScope')} htmlFor="includeConfirmed">
          <CheckboxField
            id="includeConfirmed"
            checked={includeConfirmed}
            onChange={setIncludeConfirmed}
            label={t('foodReservations.bulkIncludeConfirmed')}
          />
          <p className="text-xs text-ink-500">{t('foodReservations.bulkIncludeConfirmedHint')}</p>
        </FormField>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="danger" disabled={saving} onClick={deleteRange}>
            <Trash2 className="size-4" aria-hidden />
            {t('foodReservations.bulkDelete')}
          </Button>
          <Button type="submit" variant="soft" disabled={saving}>
            <Check className="size-4" aria-hidden />
            {t('foodReservations.bulkConfirm')}
          </Button>
        </div>
      </AppForm>
    </FormCard>
  )
}
