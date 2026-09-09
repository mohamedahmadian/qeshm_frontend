import { ImagePlus, MapPin, Phone, Store, Type } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FileDropField } from '../../../components/ui/FileDropField'
import { AppForm, FormActions, FormField, fieldClassName } from '../../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { api, getApiErrorMessage, getImageUrl } from '../../../lib/api'
import { toLatinDigits } from '../../../lib/datetime'
import { optimizeImageFile } from '../../../lib/optimize-image'
import type { Restaurant } from '../../../types/app'

export type RestaurantPayload = {
  name: string
  phone: string | null
  address: string | null
  logoId: string | null
}

export function RestaurantForm({
  initial,
  onSubmit,
}: {
  initial?: Pick<Restaurant, 'name' | 'phone' | 'address' | 'logoId'>
  onSubmit: (payload: RestaurantPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(initial?.name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [logoId, setLogoId] = useState(initial?.logoId ?? '')
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
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
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

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}
