import { Flag, Hash, Languages, Map, MapPinned, Plane, TrainFront } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LoadingState, Button, DetailActions, EntityNameSubtitle, PageHeader, formShellClassName } from '../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../components/ui/FormLayout'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { formatNumber } from '../../lib/datetime'
import { api } from '../../lib/api'
import { useGeoName } from '../../lib/geo'
import type { Province } from '../../types/app'
import { GeoHas, GeoStatus } from './GeoShared'

export function ProvinceDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const name = useGeoName()
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['province', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<Province>(`/provinces/${id}`)
      return data
    },
  })

  const province = query.data
  if (!province) {
    return <LoadingState />
  }

  return (
    <div className={formShellClassName}>
      <PageHeader
        title={t('provinces.details')}
        subtitle={<EntityNameSubtitle name={name(province)} icon={Map} />}
      />
      <FormCard icon={Map} title={name(province)}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Map}>{t('provinces.details')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Languages} label={t('geo.nameFa')} value={province.nameFa} tone="teal" />
            <FormFactTile icon={Languages} label={t('geo.nameEn')} value={province.nameEn} tone="mint" />
            <FormFactTile icon={Hash} label={t('geo.code')} value={province.code} />
            <FormFactTile icon={Flag} label={t('geo.country')} value={name(province.country)} />
            <FormFactTile
              icon={MapPinned}
              label={t('geo.cityCount')}
              value={formatNumber(province._count?.cities ?? 0, locale)}
            />
            <FormFactTile icon={TrainFront} label={t('geo.hasRailway')} value={<GeoHas value={province.hasRailway} />} />
            <FormFactTile icon={Plane} label={t('geo.hasAirport')} value={<GeoHas value={province.hasAirport} />} />
            <FormFactTile icon={Map} label={t('geo.isActive')} value={<GeoStatus active={province.isActive} />} />
          </div>
          <DetailActions
            editTo={`/base-info/provinces/${province.id}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('provinces.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('provinces.confirmDelete'),
                successMessage: t('provinces.deleted'),
                path: `/provinces/${province.id}`,
                queryKey: ['provinces'],
                onDeleted: () => navigate('/base-info/provinces'),
              })
            }
            extra={
              <Link to={`/base-info/cities?countryId=${province.countryId}&provinceId=${province.id}`}>
                <Button type="button" variant="soft">
                  <MapPinned className="size-4" aria-hidden />
                  {t('menus.cities')}
                </Button>
              </Link>
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
