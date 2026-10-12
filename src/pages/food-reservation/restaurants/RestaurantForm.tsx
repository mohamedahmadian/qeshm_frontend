import { Briefcase, ImagePlus, MapPin, Phone, Store, Type, Users, UtensilsCrossed, type LucideIcon } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FileDropField } from '../../../components/ui/FileDropField'
import { AppForm, FormActions, FormField, fieldClassName } from '../../../components/ui/Form'
import { FormCard, FormSectionTitle, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { api, getApiErrorMessage, getImageUrl } from '../../../lib/api'
import { formatGroupedNumber, parseDigitString, toLatinDigits } from '../../../lib/datetime'
import { optimizeImageFile } from '../../../lib/optimize-image'
import type { Restaurant } from '../../../types/app'
import { RestaurantMenuListPage } from './menu/RestaurantMenuPages'
import { RestaurantTabNav, type RestaurantManageTab } from './RestaurantTabs'
import { RestaurantUnitListPage } from './units/RestaurantUnitPages'

export type RestaurantPayload = {
  name: string
  phone: string | null
  address: string | null
  logoId: string | null
  employeeMealPrice: number
  managementMealPrice: number
}

export function RestaurantForm({
  initial,
  restaurantId,
  onSubmit,
}: {
  initial?: Pick<
    Restaurant,
    'name' | 'phone' | 'address' | 'logoId' | 'employeeMealPrice' | 'managementMealPrice'
  >
  restaurantId?: string
  onSubmit: (payload: RestaurantPayload) => Promise<void>
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [tab, setTab] = useState<RestaurantManageTab>('info')
  const manage = Boolean(initial && restaurantId)
  const [name, setName] = useState(initial?.name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [logoId, setLogoId] = useState(initial?.logoId ?? '')
  const [employeeMealPrice, setEmployeeMealPrice] = useState(
    initial?.employeeMealPrice != null ? String(initial.employeeMealPrice) : '',
  )
  const [managementMealPrice, setManagementMealPrice] = useState(
    initial?.managementMealPrice != null ? String(initial.managementMealPrice) : '',
  )
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  async function uploadImage(file: File) {
    setUploading(true)
    try {
      const optimized = await optimizeImageFile(file)
      const body = new FormData()
      body.append('file', optimized)
      const { data } = await api.post<{ id: string }>('/images', body)
      setLogoId(data.id)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setUploading(false)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        phone: emptyToNull(toLatinDigits(phone).replace(/[^\d+]/g, '')),
        address: emptyToNull(address),
        logoId: emptyToNull(logoId),
        employeeMealPrice: Number(employeeMealPrice),
        managementMealPrice: Number(managementMealPrice),
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={Store}
      title={initial ? initial.name || t('restaurants.edit') : t('restaurants.create')}
      subtitle={initial ? undefined : t('restaurants.createSubtitle')}
    >
      {manage ? <RestaurantTabNav tab={tab} onChange={setTab} /> : null}
      {manage && restaurantId && tab === 'units' ? (
        <div className="p-5 sm:p-6">
          <RestaurantUnitListPage embedded restaurantId={restaurantId} />
        </div>
      ) : null}
      {manage && restaurantId && tab === 'menu' ? (
        <div className="p-5 sm:p-6">
          <RestaurantMenuListPage embedded restaurantId={restaurantId} />
        </div>
      ) : null}
      <AppForm
        onSubmit={submit}
        className={`${formCardBodyClassName}${manage && tab !== 'info' ? ' hidden' : ''}`}
      >
        <FormField icon={Type} label={t('restaurants.name')} htmlFor="restaurantName">
          <input
            id="restaurantName"
            className={fieldClassName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
          />
        </FormField>
        <FormSectionTitle icon={UtensilsCrossed} className="mb-2.5 mt-2">
          {t('restaurants.mealsSection')}
        </FormSectionTitle>
        <p className="text-xs leading-6 text-ink-500">{t('restaurants.mealsHint')}</p>
        <MealPriceField
          id="employeeMealPrice"
          icon={Users}
          label={t('restaurants.staffMeal', {
            name: name.trim() || t('restaurants.mealNamePending'),
          })}
          value={employeeMealPrice}
          onChange={setEmployeeMealPrice}
          locale={locale}
          priceLabel={t('restaurants.mealPrice')}
          unit={t('restaurantMenuItems.toman')}
        />
        <MealPriceField
          id="managementMealPrice"
          icon={Briefcase}
          label={t('restaurants.managementMeal', {
            name: name.trim() || t('restaurants.mealNamePending'),
          })}
          value={managementMealPrice}
          onChange={setManagementMealPrice}
          locale={locale}
          priceLabel={t('restaurants.mealPrice')}
          unit={t('restaurantMenuItems.toman')}
        />
        <FormField icon={Phone} label={t('restaurants.phone')} htmlFor="restaurantPhone">
          <input
            id="restaurantPhone"
            inputMode="numeric"
            className={`${fieldClassName} digit-field`}
            value={phone}
            onChange={(e) => setPhone(toLatinDigits(e.target.value).replace(/[^\d+]/g, '').slice(0, 20))}
          />
        </FormField>
        <FormField icon={MapPin} label={t('restaurants.address')} htmlFor="restaurantAddress">
          <textarea
            id="restaurantAddress"
            className={fieldClassName}
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </FormField>
        <FormField icon={ImagePlus} label={t('restaurants.logo')} htmlFor="restaurantLogo">
          <FileDropField
            id="restaurantLogo"
            accept="image/*"
            capture="environment"
            previewUrl={logoId ? getImageUrl(logoId) : undefined}
            uploading={uploading}
            onFile={(file) => void uploadImage(file)}
            onClear={() => setLogoId('')}
          />
        </FormField>
        <FormActions
          submitLabel={t('restaurants.save')}
          cancelLabel={t('restaurants.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}

function MealPriceField({
  id,
  icon,
  label,
  value,
  onChange,
  priceLabel,
  unit,
  locale,
}: {
  id: string
  icon: LucideIcon
  label: string
  value: string
  onChange: (value: string) => void
  priceLabel: string
  unit: string
  locale: string
}) {
  const shown =
    value === '' || !Number.isFinite(Number(value)) ? '' : formatGroupedNumber(Number(value), locale)
  return (
    <FormField icon={icon} label={label} htmlFor={id}>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          required
          placeholder={priceLabel}
          className={`${fieldClassName} digit-field`}
          value={shown}
          onChange={(event) => onChange(parseDigitString(event.target.value))}
        />
        <span className="shrink-0 text-sm text-ink-500">{unit}</span>
      </div>
    </FormField>
  )
}

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}
