import {
  Building2,
  Hash,
  MapPin,
  MessageCircle,
  Network,
  Phone,
  Send,
  Share2,
  Tags,
  Type,
  UtensilsCrossed,
} from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, fieldClassName } from '../../../components/ui/Form'
import { FormCard, FormSectionTitle, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { OsmMapPicker } from '../../../components/ui/OsmMapPicker'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../../lib/api'
import { toLatinDigits } from '../../../lib/datetime'
import { QESHM_MAP_BOUNDS, QESHM_MAP_CENTER } from '../../../lib/geo'
import type { ManagedUser, OrganizationUnit, OrganizationUnitKind } from '../../../types/app'
import { descendantUnitIds, organizationUnitPathLabel } from '../organization-unit-label'

export type OrganizationUnitPayload = {
  name: string
  kindId: string
  parentId: string | null
  phone: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  eitaa: string | null
  bale: string | null
  rubika: string | null
  instagram: string | null
  telegram: string | null
  whatsapp: string | null
  nutritionRepId: string | null
  maxMeals: number | null
}

function toCoordString(value: number | null | undefined) {
  return value == null ? '' : String(value)
}

function toOptionalNumber(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

export function OrganizationUnitForm({
  initial,
  onSubmit,
}: {
  initial?: OrganizationUnit
  onSubmit: (payload: OrganizationUnitPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(initial?.name ?? '')
  const [kindId, setKindId] = useState(initial?.kindId ?? '')
  const [parentId, setParentId] = useState(initial?.parentId ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [latitude, setLatitude] = useState(toCoordString(initial?.latitude))
  const [longitude, setLongitude] = useState(toCoordString(initial?.longitude))
  const [eitaa, setEitaa] = useState(initial?.eitaa ?? '')
  const [bale, setBale] = useState(initial?.bale ?? '')
  const [rubika, setRubika] = useState(initial?.rubika ?? '')
  const [instagram, setInstagram] = useState(initial?.instagram ?? '')
  const [telegram, setTelegram] = useState(initial?.telegram ?? '')
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? '')
  const [nutritionRepId, setNutritionRepId] = useState(initial?.nutritionRepId ?? '')
  const [maxMeals, setMaxMeals] = useState(initial?.maxMeals != null ? String(initial.maxMeals) : '')
  const [saving, setSaving] = useState(false)

  const units = useQuery({
    queryKey: ['organization-units', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnit[]>('/organization/units')
      return data
    },
  })
  const kinds = useQuery({
    queryKey: ['organization-unit-kinds', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnitKind[]>('/organization/unit-kinds')
      return data
    },
  })
  const employees = useQuery({
    queryKey: ['users', 'unit', initial?.id],
    enabled: Boolean(initial?.id),
    queryFn: async () => {
      const { data } = await api.get<ManagedUser[]>('/users', {
        params: { orgUnitId: initial?.id },
      })
      return data
    },
  })
  const parentOptions = useMemo(() => {
    const blocked = initial?.id ? descendantUnitIds(units.data ?? [], initial.id) : new Set<string>()
    return (units.data ?? []).filter((unit) => unit.id !== initial?.id && !blocked.has(unit.id))
  }, [initial?.id, units.data])

  const hasPin = toOptionalNumber(latitude) != null && toOptionalNumber(longitude) != null
  const focus = useMemo(() => {
    if (hasPin) return null
    return {
      lat: QESHM_MAP_CENTER.lat,
      lng: QESHM_MAP_CENTER.lng,
      zoom: 12,
      bounds: QESHM_MAP_BOUNDS,
    }
  }, [hasPin])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const digits = toLatinDigits(phone).replace(/\D/g, '')
    if (digits && (digits.length < 8 || digits.length > 15)) {
      toast.error(t('organizationPhones.phoneInvalid'))
      return
    }
    const mealsLimit = toOptionalNumber(toLatinDigits(maxMeals))
    if (mealsLimit != null && (!Number.isInteger(mealsLimit) || mealsLimit < 1)) {
      toast.error(t('organizationUnits.maxMealsInvalid'))
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        kindId,
        parentId: emptyToNull(parentId),
        phone: digits || null,
        address: emptyToNull(address),
        latitude: toOptionalNumber(latitude),
        longitude: toOptionalNumber(longitude),
        eitaa: emptyToNull(eitaa),
        bale: emptyToNull(bale),
        rubika: emptyToNull(rubika),
        instagram: emptyToNull(instagram),
        telegram: emptyToNull(telegram),
        whatsapp: emptyToNull(whatsapp),
        nutritionRepId: emptyToNull(nutritionRepId),
        maxMeals: mealsLimit,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={Building2}
      title={initial ? initial.name || t('organizationUnits.edit') : t('organizationUnits.create')}
      subtitle={initial ? undefined : t('organizationUnits.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormSectionTitle icon={Building2}>{t('organizationUnits.section')}</FormSectionTitle>
        <FormField icon={Type} label={t('organizationUnits.name')} htmlFor="unitName">
          <input
            id="unitName"
            className={fieldClassName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField icon={Tags} label={t('organizationUnits.kind')} htmlFor="unitKind">
            <SearchSelect
              id="unitKind"
              value={kindId}
              required
              onChange={setKindId}
              placeholder={t('organizationUnits.selectKind')}
              options={(kinds.data ?? []).map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />
          </FormField>
          <FormField icon={Network} label={t('organizationUnits.parent')} htmlFor="unitParent">
            <SearchSelect
              id="unitParent"
              value={parentId}
              onChange={setParentId}
              placeholder={t('organizationUnits.selectParent')}
              options={[
                { value: '', label: t('organizationUnits.noParent') },
                ...parentOptions.map((unit) => ({
                  value: unit.id,
                  label: organizationUnitPathLabel(unit),
                })),
              ]}
            />
          </FormField>
        </div>
        <FormField icon={Phone} label={t('organizationUnits.phone')} htmlFor="unitPhone">
          <input
            id="unitPhone"
            inputMode="numeric"
            className={`${fieldClassName} digit-field`}
            value={phone}
            onChange={(e) => setPhone(toLatinDigits(e.target.value).replace(/\D/g, '').slice(0, 15))}
          />
        </FormField>
        <FormField icon={MapPin} label={t('organizationUnits.address')} htmlFor="unitAddress">
          <textarea
            id="unitAddress"
            className={fieldClassName}
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </FormField>
        <FormSectionTitle icon={UtensilsCrossed}>{t('organizationUnits.foodSection')}</FormSectionTitle>
        {initial ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField icon={UtensilsCrossed} label={t('organizationUnits.nutritionRep')} htmlFor="unitNutritionRep">
              <SearchSelect
                id="unitNutritionRep"
                value={nutritionRepId}
                onChange={setNutritionRepId}
                placeholder={t('organizationUnits.selectNutritionRep')}
                options={[
                  { value: '', label: t('organizationUnits.selectNutritionRep') },
                  ...(employees.data ?? []).map((user) => ({
                    value: user.id,
                    label: user.fullName,
                  })),
                ]}
              />
            </FormField>
            <FormField icon={Hash} label={t('organizationUnits.maxMeals')} htmlFor="unitMaxMeals">
              <input
                id="unitMaxMeals"
                type="number"
                min={1}
                max={9999}
                className={fieldClassName}
                value={maxMeals}
                onChange={(e) => setMaxMeals(toLatinDigits(e.target.value).replace(/\D/g, '').slice(0, 4))}
              />
            </FormField>
          </div>
        ) : (
          <>
            <p className="text-xs leading-6 text-ink-500">{t('organizationUnits.nutritionRepHint')}</p>
            <FormField icon={Hash} label={t('organizationUnits.maxMeals')} htmlFor="unitMaxMeals">
              <input
                id="unitMaxMeals"
                type="number"
                min={1}
                max={9999}
                className={fieldClassName}
                value={maxMeals}
                onChange={(e) => setMaxMeals(toLatinDigits(e.target.value).replace(/\D/g, '').slice(0, 4))}
              />
            </FormField>
          </>
        )}
        <FormSectionTitle icon={MapPin}>{t('organizationUnits.locationSection')}</FormSectionTitle>
        <div className="space-y-2">
          <p className="text-xs leading-6 text-ink-500">{t('organizationUnits.mapHint')}</p>
          <OsmMapPicker
            variant="always"
            latitude={latitude}
            longitude={longitude}
            focus={focus}
            heightClass="h-72 sm:h-80"
            onChange={(nextLat, nextLng) => {
              setLatitude(nextLat)
              setLongitude(nextLng)
            }}
          />
        </div>
        <FormSectionTitle icon={Share2}>{t('organizationUnits.socialSection')}</FormSectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField icon={MessageCircle} label={t('organizationUnits.eitaa')} htmlFor="unitEitaa">
            <input id="unitEitaa" className={`${fieldClassName} latin-field`} dir="ltr" value={eitaa} onChange={(e) => setEitaa(e.target.value)} />
          </FormField>
          <FormField icon={MessageCircle} label={t('organizationUnits.bale')} htmlFor="unitBale">
            <input id="unitBale" className={`${fieldClassName} latin-field`} dir="ltr" value={bale} onChange={(e) => setBale(e.target.value)} />
          </FormField>
          <FormField icon={MessageCircle} label={t('organizationUnits.rubika')} htmlFor="unitRubika">
            <input id="unitRubika" className={`${fieldClassName} latin-field`} dir="ltr" value={rubika} onChange={(e) => setRubika(e.target.value)} />
          </FormField>
          <FormField icon={Share2} label={t('organizationUnits.instagram')} htmlFor="unitInstagram">
            <input id="unitInstagram" className={`${fieldClassName} latin-field`} dir="ltr" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
          </FormField>
          <FormField icon={Send} label={t('organizationUnits.telegram')} htmlFor="unitTelegram">
            <input id="unitTelegram" className={`${fieldClassName} latin-field`} dir="ltr" value={telegram} onChange={(e) => setTelegram(e.target.value)} />
          </FormField>
          <FormField icon={Phone} label={t('organizationUnits.whatsapp')} htmlFor="unitWhatsapp">
            <input id="unitWhatsapp" className={`${fieldClassName} latin-field`} dir="ltr" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          </FormField>
        </div>
        <FormActions
          submitLabel={t('organizationUnits.save')}
          cancelLabel={t('organizationUnits.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
