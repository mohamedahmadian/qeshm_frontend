import { MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { FormFactTile, FormSectionTitle } from '../../components/ui/FormLayout'
import { OsmMapPicker } from '../../components/ui/OsmMapPicker'
import { localizeDigits } from '../../lib/datetime'
import type { InspectionFeedback } from '../../types/app'

export function InspectionLocationBlock({
  item,
}: {
  item: Pick<InspectionFeedback, 'address' | 'latitude' | 'longitude'>
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const hasPin = item.latitude != null && item.longitude != null
  const hasAddress = Boolean(item.address?.trim())
  if (!hasPin && !hasAddress) return null

  const coords = hasPin
    ? localizeDigits(`${item.latitude}, ${item.longitude}`, locale)
    : '—'

  return (
    <>
      <FormSectionTitle icon={MapPin}>{t('inspection.locationSection')}</FormSectionTitle>
      <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
        <FormFactTile
          icon={MapPin}
          label={t('inspection.address')}
          value={item.address || '—'}
          empty={!hasAddress}
          className="sm:col-span-2"
        />
        <FormFactTile
          icon={MapPin}
          label={t('inspection.coordinates')}
          value={coords}
          empty={!hasPin}
          className="sm:col-span-2"
        />
      </div>
      {hasPin ? (
        <div className="overflow-hidden rounded-2xl ring-1 ring-teal-100">
          <OsmMapPicker
            variant="always"
            readOnly
            latitude={String(item.latitude)}
            longitude={String(item.longitude)}
            onChange={() => undefined}
            heightClass="h-56"
          />
        </div>
      ) : null}
    </>
  )
}
