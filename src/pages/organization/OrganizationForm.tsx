import { Landmark, MapPin, MessageCircle, Phone, Send, Share2, Type } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, fieldClassName } from '../../components/ui/Form'
import { FormCard, FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import { OsmMapPicker } from '../../components/ui/OsmMapPicker'
import { getApiErrorMessage } from '../../lib/api'
import { QESHM_MAP_BOUNDS, QESHM_MAP_CENTER } from '../../lib/geo'
import type { Organization } from '../../types/app'

export type OrganizationPayload = {
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
  eitaa: string | null
  bale: string | null
  rubika: string | null
  instagram: string | null
  telegram: string | null
  whatsapp: string | null
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

export function OrganizationForm({
  initial,
  onSubmit,
}: {
  initial?: Pick<
    Organization,
    | 'name'
    | 'address'
    | 'latitude'
    | 'longitude'
    | 'eitaa'
    | 'bale'
    | 'rubika'
    | 'instagram'
    | 'telegram'
    | 'whatsapp'
  >
  onSubmit: (payload: OrganizationPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(initial?.name ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [latitude, setLatitude] = useState(toCoordString(initial?.latitude))
  const [longitude, setLongitude] = useState(toCoordString(initial?.longitude))
  const [eitaa, setEitaa] = useState(initial?.eitaa ?? '')
  const [bale, setBale] = useState(initial?.bale ?? '')
  const [rubika, setRubika] = useState(initial?.rubika ?? '')
  const [instagram, setInstagram] = useState(initial?.instagram ?? '')
  const [telegram, setTelegram] = useState(initial?.telegram ?? '')
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? '')
  const [saving, setSaving] = useState(false)

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
    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        address: emptyToNull(address),
        latitude: toOptionalNumber(latitude),
        longitude: toOptionalNumber(longitude),
        eitaa: emptyToNull(eitaa),
        bale: emptyToNull(bale),
        rubika: emptyToNull(rubika),
        instagram: emptyToNull(instagram),
        telegram: emptyToNull(telegram),
        whatsapp: emptyToNull(whatsapp),
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={Landmark}
      title={initial ? initial.name || t('organization.edit') : t('organization.create')}
      subtitle={initial ? undefined : t('organization.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormSectionTitle icon={Landmark}>{t('organization.section')}</FormSectionTitle>
        <FormField icon={Type} label={t('organization.name')} htmlFor="organizationName">
          <input
            id="organizationName"
            className={fieldClassName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
          />
        </FormField>
        <FormField icon={MapPin} label={t('organization.address')} htmlFor="organizationAddress">
          <textarea
            id="organizationAddress"
            className={fieldClassName}
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </FormField>
        <FormSectionTitle icon={MapPin}>{t('organization.locationSection')}</FormSectionTitle>
        <div className="space-y-2">
          <p className="text-xs leading-6 text-ink-500">{t('organization.mapHint')}</p>
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
        <FormSectionTitle icon={Share2}>{t('organization.socialSection')}</FormSectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField icon={MessageCircle} label={t('organization.eitaa')} htmlFor="organizationEitaa">
            <input
              id="organizationEitaa"
              className={`${fieldClassName} latin-field`}
              dir="ltr"
              value={eitaa}
              onChange={(e) => setEitaa(e.target.value)}
            />
          </FormField>
          <FormField icon={MessageCircle} label={t('organization.bale')} htmlFor="organizationBale">
            <input
              id="organizationBale"
              className={`${fieldClassName} latin-field`}
              dir="ltr"
              value={bale}
              onChange={(e) => setBale(e.target.value)}
            />
          </FormField>
          <FormField icon={MessageCircle} label={t('organization.rubika')} htmlFor="organizationRubika">
            <input
              id="organizationRubika"
              className={`${fieldClassName} latin-field`}
              dir="ltr"
              value={rubika}
              onChange={(e) => setRubika(e.target.value)}
            />
          </FormField>
          <FormField icon={Share2} label={t('organization.instagram')} htmlFor="organizationInstagram">
            <input
              id="organizationInstagram"
              className={`${fieldClassName} latin-field`}
              dir="ltr"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
            />
          </FormField>
          <FormField icon={Send} label={t('organization.telegram')} htmlFor="organizationTelegram">
            <input
              id="organizationTelegram"
              className={`${fieldClassName} latin-field`}
              dir="ltr"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
            />
          </FormField>
          <FormField icon={Phone} label={t('organization.whatsapp')} htmlFor="organizationWhatsapp">
            <input
              id="organizationWhatsapp"
              className={`${fieldClassName} latin-field`}
              dir="ltr"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </FormField>
        </div>
        <FormActions
          submitLabel={t('organization.save')}
          cancelLabel={t('organization.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
