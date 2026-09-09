import { Car, FileBadge2, Hash, Palette, ScrollText, Settings2, Tags } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, fieldClassName } from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../lib/api'
import {
  type Vehicle,
  type VehicleBrand,
  type VehicleStatus,
  type VehicleType,
  vehicleStatusOrder,
  vehicleTypeOrder,
} from '../../types/app'

export type VehiclePayload = {
  assetCode: string
  plate: string
  type: VehicleType
  brandId: string
  model: string
  color: string | null
  year: number | null
  chassisNumber: string | null
  engineNumber: string | null
  status: VehicleStatus
  description: string | null
}

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function toYear(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isInteger(parsed) ? parsed : null
}

export function VehicleForm({
  initial,
  onSubmit,
}: {
  initial?: Vehicle
  onSubmit: (payload: VehiclePayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [assetCode, setAssetCode] = useState(initial?.assetCode ?? '')
  const [plate, setPlate] = useState(initial?.plate ?? '')
  const [type, setType] = useState(initial?.type ?? '')
  const [brandId, setBrandId] = useState(initial?.brandId ?? '')
  const [model, setModel] = useState(initial?.model ?? '')
  const [color, setColor] = useState(initial?.color ?? '')
  const [year, setYear] = useState(initial?.year != null ? String(initial.year) : '')
  const [chassisNumber, setChassisNumber] = useState(initial?.chassisNumber ?? '')
  const [engineNumber, setEngineNumber] = useState(initial?.engineNumber ?? '')
  const [status, setStatus] = useState<VehicleStatus>(initial?.status ?? 'ACTIVE')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [saving, setSaving] = useState(false)
  const brands = useQuery({
    queryKey: ['vehicle-brands', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<VehicleBrand[]>('/vehicle-brands')
      return data
    },
  })

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!type) {
      toast.error(t('vehicles.typeRequired'))
      return
    }
    if (!brandId) {
      toast.error(t('vehicles.brandRequired'))
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        assetCode: assetCode.trim(),
        plate: plate.trim(),
        type: type as VehicleType,
        brandId,
        model: model.trim(),
        color: emptyToNull(color),
        year: toYear(year),
        chassisNumber: emptyToNull(chassisNumber),
        engineNumber: emptyToNull(engineNumber),
        status,
        description: emptyToNull(description),
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={Car}
      title={initial ? initial.plate || t('vehicles.edit') : t('vehicles.create')}
      subtitle={initial ? undefined : t('vehicles.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={FileBadge2} label={t('vehicles.assetCode')} htmlFor="vehicleAssetCode">
          <input
            id="vehicleAssetCode"
            className={`${fieldClassName} latin-field`}
            dir="ltr"
            value={assetCode}
            onChange={(e) => setAssetCode(e.target.value)}
            required
            minLength={2}
          />
        </FormField>
        <FormField icon={Hash} label={t('vehicles.plate')} htmlFor="vehiclePlate">
          <input
            id="vehiclePlate"
            className={`${fieldClassName} latin-field`}
            dir="ltr"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            required
            minLength={2}
          />
        </FormField>
        <FormField icon={Car} label={t('vehicles.type')} htmlFor="vehicleType">
          <SearchSelect
            id="vehicleType"
            value={type}
            required
            onChange={setType}
            placeholder={t('vehicles.selectType')}
            options={vehicleTypeOrder.map((value) => ({
              value,
              label: t(`vehicles.types.${value}`),
            }))}
          />
        </FormField>
        <FormField icon={Tags} label={t('vehicles.brand')} htmlFor="vehicleBrand">
          <SearchSelect
            id="vehicleBrand"
            value={brandId}
            required
            onChange={setBrandId}
            placeholder={t('vehicles.selectBrand')}
            options={(brands.data ?? []).map((item) => ({ value: item.id, label: item.name }))}
          />
        </FormField>
        <FormField icon={Car} label={t('vehicles.model')} htmlFor="vehicleModel">
          <input
            id="vehicleModel"
            className={fieldClassName}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            required
            minLength={1}
          />
        </FormField>
        <FormField icon={Palette} label={t('vehicles.color')} htmlFor="vehicleColor">
          <input
            id="vehicleColor"
            className={fieldClassName}
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </FormField>
        <FormField icon={Hash} label={t('vehicles.year')} htmlFor="vehicleYear">
          <input
            id="vehicleYear"
            type="number"
            className={`${fieldClassName} digit-field`}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            min={1300}
            max={2100}
          />
        </FormField>
        <FormField icon={Hash} label={t('vehicles.chassisNumber')} htmlFor="vehicleChassis">
          <input
            id="vehicleChassis"
            className={`${fieldClassName} latin-field`}
            dir="ltr"
            value={chassisNumber}
            onChange={(e) => setChassisNumber(e.target.value)}
          />
        </FormField>
        <FormField icon={Hash} label={t('vehicles.engineNumber')} htmlFor="vehicleEngine">
          <input
            id="vehicleEngine"
            className={`${fieldClassName} latin-field`}
            dir="ltr"
            value={engineNumber}
            onChange={(e) => setEngineNumber(e.target.value)}
          />
        </FormField>
        <FormField icon={Settings2} label={t('vehicles.status')} htmlFor="vehicleStatus">
          <SearchSelect
            id="vehicleStatus"
            value={status}
            required
            onChange={(next) => setStatus(next as VehicleStatus)}
            placeholder={t('vehicles.selectStatus')}
            options={vehicleStatusOrder.map((value) => ({
              value,
              label: t(`vehicles.statuses.${value}`),
            }))}
          />
        </FormField>
        <FormField icon={ScrollText} label={t('vehicles.description')} htmlFor="vehicleDescription">
          <textarea
            id="vehicleDescription"
            className={fieldClassName}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>
        <FormActions
          submitLabel={t('vehicles.save')}
          cancelLabel={t('vehicles.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
