import { ImagePlus, ScrollText, Type, UtensilsCrossed } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FileDropField } from '../../../components/ui/FileDropField'
import { AppForm, FormActions, FormField, fieldClassName } from '../../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { api, getApiErrorMessage, getImageUrl } from '../../../lib/api'
import { optimizeImageFile } from '../../../lib/optimize-image'
import type { Food } from '../../../types/app'

export type FoodPayload = {
  name: string
  description: string | null
  photoId: string | null
}

export function FoodForm({
  initial,
  onSubmit,
}: {
  initial?: Pick<Food, 'name' | 'description' | 'photoId'>
  onSubmit: (payload: FoodPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [photoId, setPhotoId] = useState(initial?.photoId ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  async function uploadImage(file: File) {
    setUploading(true)
    try {
      const optimized = await optimizeImageFile(file)
      const body = new FormData()
      body.append('file', optimized)
      const { data } = await api.post<{ id: string }>('/images', body)
      setPhotoId(data.id)
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
        description: emptyToNull(description),
        photoId: emptyToNull(photoId),
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={UtensilsCrossed}
      title={initial ? initial.name || t('foods.edit') : t('foods.create')}
      subtitle={initial ? undefined : t('foods.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={Type} label={t('foods.name')} htmlFor="foodName">
          <input
            id="foodName"
            className={fieldClassName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
          />
        </FormField>
        <FormField icon={ScrollText} label={t('foods.description')} htmlFor="foodDescription">
          <textarea
            id="foodDescription"
            className={fieldClassName}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>
        <FormField icon={ImagePlus} label={t('foods.photo')} htmlFor="foodPhoto">
          <FileDropField
            id="foodPhoto"
            accept="image/*"
            capture="environment"
            previewUrl={photoId ? getImageUrl(photoId) : undefined}
            uploading={uploading}
            onFile={(file) => void uploadImage(file)}
            onClear={() => setPhotoId('')}
          />
        </FormField>
        <FormActions
          submitLabel={t('foods.save')}
          cancelLabel={t('foods.cancel')}
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
