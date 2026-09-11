import { Landmark, MapPin, MessageCircle, Phone, Send, Share2, Type } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'
import {
  DetailActions,
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  userFormShellClassName,
} from '../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../components/ui/FormLayout'
import { OsmMapPicker } from '../../components/ui/OsmMapPicker'
import { formatNumber, localizeDigits } from '../../lib/datetime'
import { organizationEditPath, organizationNewPath, organizationPhonesPath } from './organization-paths'
import { useOrganization } from './useOrganization'

export function OrganizationDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const query = useOrganization()
  const organization = query.data

  if (query.isLoading) {
    return <LoadingState />
  }
  if (!organization) {
    return <Navigate to={organizationNewPath()} replace />
  }

  const empty = '—'
  const coords =
    organization.latitude != null && organization.longitude != null
      ? localizeDigits(`${organization.latitude}, ${organization.longitude}`, locale)
      : empty

  return (
    <div className={userFormShellClassName}>
      <PageHeader
        icon={Landmark}
        title={t('organization.details')}
        subtitle={<EntityNameSubtitle name={organization.name} icon={Landmark} />}
      />
      <FormCard icon={Landmark} title={organization.name}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Landmark}>{t('organization.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Type} label={t('organization.name')} value={organization.name} tone="teal" />
            <FormFactTile
              icon={Phone}
              label={t('organizationPhones.title')}
              value={formatNumber(organization._count?.phones ?? organization.phones?.length ?? 0, locale)}
              tone="mint"
            />
            <FormFactTile
              icon={MapPin}
              label={t('organization.address')}
              value={organization.address || empty}
              empty={!organization.address}
              className="sm:col-span-2"
            />
          </div>
          <FormSectionTitle icon={MapPin}>{t('organization.locationSection')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={MapPin}
              label={t('organization.coordinates')}
              value={coords}
              empty={organization.latitude == null || organization.longitude == null}
              className="sm:col-span-2"
            />
          </div>
          {organization.latitude != null && organization.longitude != null ? (
            <div className="overflow-hidden rounded-2xl ring-1 ring-teal-100">
              <OsmMapPicker
                variant="always"
                readOnly
                latitude={String(organization.latitude)}
                longitude={String(organization.longitude)}
                onChange={() => undefined}
                heightClass="h-56"
              />
            </div>
          ) : null}
          <FormSectionTitle icon={Share2}>{t('organization.socialSection')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={MessageCircle}
              label={t('organization.eitaa')}
              value={organization.eitaa || empty}
              empty={!organization.eitaa}
              tone="teal"
            />
            <FormFactTile
              icon={MessageCircle}
              label={t('organization.bale')}
              value={organization.bale || empty}
              empty={!organization.bale}
              tone="mint"
            />
            <FormFactTile
              icon={MessageCircle}
              label={t('organization.rubika')}
              value={organization.rubika || empty}
              empty={!organization.rubika}
            />
            <FormFactTile
              icon={Share2}
              label={t('organization.instagram')}
              value={organization.instagram || empty}
              empty={!organization.instagram}
              tone="teal"
            />
            <FormFactTile
              icon={Send}
              label={t('organization.telegram')}
              value={organization.telegram || empty}
              empty={!organization.telegram}
              tone="mint"
            />
            <FormFactTile
              icon={Phone}
              label={t('organization.whatsapp')}
              value={organization.whatsapp || empty}
              empty={!organization.whatsapp}
            />
          </div>
          {organization.phones?.length ? (
            <>
              <FormSectionTitle icon={Phone}>{t('organizationPhones.title')}</FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                {organization.phones.map((item) => (
                  <FormFactTile key={item.id} icon={Phone} label={item.title} copyValue={item.phone} />
                ))}
              </div>
            </>
          ) : null}
          <DetailActions
            editTo={organizationEditPath()}
            editLabel={t('common.edit')}
            extraItems={[
              {
                to: organizationPhonesPath(),
                icon: Phone,
                label: t('organizationPhones.manage'),
              },
            ]}
          />
        </div>
      </FormCard>
    </div>
  )
}
