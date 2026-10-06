import { Anchor, Building2, Handshake, MapPin, Phone, Ticket, UserRound } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, fieldClassName } from '../../components/ui/Form'
import { FormCard, FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import { OsmMapPicker } from '../../components/ui/OsmMapPicker'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../lib/api'
import { geoName, IRAN_MAP_BOUNDS, IRAN_MAP_CENTER } from '../../lib/geo'
import type { City, Port, PortKind } from '../../types/app'
import { portKinds } from '../../types/app'

export type PortPayload = {
  name: string
  cityId: string
  cooperativeName: string
  address: string | null
  kind: PortKind
  managerName: string
  phone: string
  latitude: number | null
  longitude: number | null
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

export function PortForm({
  initial,
  onSubmit,
}: {
  initial?: Port
  onSubmit: (payload: PortPayload) => Promise<void>
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [name, setName] = useState(initial?.name ?? '')
  const [cityId, setCityId] = useState(initial?.cityId ?? '')
  const [cooperativeName, setCooperativeName] = useState(initial?.cooperativeName ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [kind, setKind] = useState<PortKind>(initial?.kind ?? 'INDIVIDUAL')
  const [managerName, setManagerName] = useState(initial?.managerName ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [latitude, setLatitude] = useState(toCoordString(initial?.latitude))
  const [longitude, setLongitude] = useState(toCoordString(initial?.longitude))
  const [saving, setSaving] = useState(false)
  const cities = useQuery({
    queryKey: ['cities', 'lookup', 'ports'],
    queryFn: async () => {
      const { data } = await api.get<City[]>('/cities', { params: { activeOnly: true } })
      return data
    },
  })
  const cityOptions = useMemo(() => {
    const rows = cities.data ?? []
    const current = initial?.city
    const withCurrent =
      current && !rows.some((city) => city.id === current.id)
        ? [{ id: current.id, nameFa: current.nameFa, nameEn: current.nameEn }, ...rows]
        : rows
    return withCurrent.map((city) => ({
      value: city.id,
      label: geoName(city, locale),
    }))
  }, [cities.data, initial?.city, locale])
  const kindOptions = portKinds.map((value) => ({
    value,
    label: t(`ports.kindLabel.${value}`),
  }))
  const hasPin = toOptionalNumber(latitude) != null && toOptionalNumber(longitude) != null
  const focus = useMemo(() => {
    if (hasPin) return null
    return {
      lat: IRAN_MAP_CENTER.lat,
      lng: IRAN_MAP_CENTER.lng,
      zoom: 5,
      bounds: IRAN_MAP_BOUNDS,
    }
  }, [hasPin])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const nextLatitude = toOptionalNumber(latitude)
    const nextLongitude = toOptionalNumber(longitude)
    if ((nextLatitude == null) !== (nextLongitude == null)) {
      toast.error(t('ports.coordinatesPair'))
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        cityId,
        cooperativeName: cooperativeName.trim(),
        address: address.trim() || null,
        kind,
        managerName: managerName.trim(),
        phone: phone.trim(),
        latitude: nextLatitude,
        longitude: nextLongitude,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={Anchor}
      title={initial ? initial.name : t('ports.create')}
      subtitle={initial ? undefined : t('ports.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormSectionTitle icon={Anchor}>{t('ports.section')}</FormSectionTitle>
        <FormField icon={Anchor} label={t('ports.name')} htmlFor="port-name">
          <input
            id="port-name"
            className={fieldClassName}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={2}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField icon={Building2} label={t('ports.city')}>
            <SearchSelect
              value={cityId}
              onChange={setCityId}
              options={cityOptions}
              placeholder={t('ports.selectCity')}
              required
            />
          </FormField>
          <FormField icon={Ticket} label={t('ports.kind')}>
            <SearchSelect
              value={kind}
              onChange={(next) => setKind(next as PortKind)}
              options={kindOptions}
              placeholder={t('ports.selectKind')}
              required
            />
          </FormField>
        </div>
        <FormField icon={Handshake} label={t('ports.cooperative')} htmlFor="port-cooperative">
          <input
            id="port-cooperative"
            className={fieldClassName}
            value={cooperativeName}
            onChange={(event) => setCooperativeName(event.target.value)}
            required
            minLength={2}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField icon={UserRound} label={t('ports.manager')} htmlFor="port-manager">
            <input
              id="port-manager"
              className={fieldClassName}
              value={managerName}
              onChange={(event) => setManagerName(event.target.value)}
              required
              minLength={2}
            />
          </FormField>
          <FormField icon={Phone} label={t('ports.phone')} htmlFor="port-phone">
            <input
              id="port-phone"
              className={`${fieldClassName} digit-field`}
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
            />
          </FormField>
        </div>
        <FormField icon={MapPin} label={t('ports.address')} htmlFor="port-address">
          <textarea
            id="port-address"
            className={fieldClassName}
            rows={3}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
        </FormField>
        <FormSectionTitle icon={MapPin}>{t('ports.locationSection')}</FormSectionTitle>
        <div className="space-y-2">
          <p className="text-xs leading-6 text-ink-500">{t('ports.mapHint')}</p>
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
        <FormActions
          submitLabel={t('ports.save')}
          cancelLabel={t('ports.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
