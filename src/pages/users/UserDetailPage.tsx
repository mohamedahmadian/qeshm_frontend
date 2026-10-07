import {
  Briefcase,
  Building2,
  Calendar,
  Car,
  CreditCard,
  FileImage,
  FileText,
  Fingerprint,
  Flag,
  GraduationCap,
  Hash,
  IdCard,
  ImagePlus,
  KeyRound,
  Landmark,
  Languages,
  LocateFixed,
  Mail,
  MapPin,
  MapPinned,
  MessageCircle,
  Phone,
  Printer,
  Handshake,
  Share2,
  Shield,
  Ticket,
  ToggleRight,
  UserRound,
  UserRoundCheck,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { OpenUserPanelButton } from '../../components/auth/OpenUserPanelButton'
import {
  DetailActions,
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  userFormShellClassName,
} from '../../components/ui/Form'
import { DateText } from '../../components/ui/DateText'
import { RoleBadges } from '../../components/ui/RoleBadges'
import { OsmMapPicker } from '../../components/ui/OsmMapPicker'
import {
  FormCard,
  FormFactTile,
  FormSectionTitle,
  formToneClass,
  type FormTone,
} from '../../components/ui/FormLayout'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { languages, type AppLanguage } from '../../i18n'
import { api, getImageUrl } from '../../lib/api'
import { formatNumber, localizeDigits } from '../../lib/datetime'
import { publicProfilePath } from '../../lib/public-profile'
import { useGeoName } from '../../lib/geo'
import type { ManagedUser } from '../../types/app'
import {
  isOrganizationEmployeePath,
  organizationEmployeePath,
  organizationEmployeesPath,
} from '../organization/organization-paths'
import { isQeshmondiPath, qeshmondiCitizenPath, qeshmondiPath } from '../qeshmondi/qeshmondi-paths'

const tabs = ['personal', 'account', 'location', 'documents', 'social', 'qeshmondi', 'other'] as const
type UserDetailTab = (typeof tabs)[number]

const tabIcons: Record<UserDetailTab, LucideIcon> = {
  personal: UserRound,
  account: KeyRound,
  location: MapPin,
  documents: ImagePlus,
  social: Share2,
  qeshmondi: UserRoundCheck,
  other: FileText,
}

export function UserDetailPage() {
  const { t, i18n } = useTranslation()
  const uiLocale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const employeeView = isOrganizationEmployeePath(pathname)
  const qeshmondiView = isQeshmondiPath(pathname)
  const headerIcon = qeshmondiView ? UserRoundCheck : UserRound
  const listPath = employeeView
    ? organizationEmployeesPath()
    : qeshmondiView
      ? qeshmondiPath()
      : '/users'
  const geoName = useGeoName()
  const { confirmDelete } = useConfirmDelete()
  const [tab, setTab] = useState<UserDetailTab>('personal')
  const query = useQuery({
    queryKey: ['user', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<ManagedUser>(`/users/${id}`)
      return data
    },
  })

  const user = query.data
  if (!user) {
    return <LoadingState />
  }

  const empty = '—'
  const editPath = employeeView
    ? `${organizationEmployeePath(user.id)}/edit`
    : qeshmondiView
      ? `${qeshmondiCitizenPath(user.id)}/edit`
      : `/users/${user.id}/edit`
  const locale = user.locale as AppLanguage
  const religionLabel = user.religion
    ? user.religion === 'OTHER' && user.religionOther
      ? `${t(`religions.${user.religion}`)} (${user.religionOther})`
      : t(`religions.${user.religion}`)
    : empty

  return (
    <div className={userFormShellClassName}>
      <PageHeader
        icon={headerIcon}
        title={
          employeeView
            ? t('employees.details')
            : qeshmondiView
              ? t('qeshmondi.details')
              : t('users.details')
        }
        subtitle={<EntityNameSubtitle name={user.fullName} icon={headerIcon} />}
      />
      <FormCard
        icon={headerIcon}
        title={user.fullName}
        action={<OpenUserPanelButton userId={user.id} status={user.status} />}
      >
        <nav className="flex flex-wrap gap-2 border-b border-line bg-cream-50/60 px-4 py-3 sm:px-5">
          {tabs.map((item) => {
            const Icon = tabIcons[item]
            const active = tab === item
            return (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={`inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]'
                    : 'bg-white text-ink-700 ring-1 ring-line hover:bg-cream-50'
                }`}
              >
                <Icon className={`size-3.5 ${active ? 'text-white' : 'text-teal-600'}`} aria-hidden />
                {t(`users.tabs.${item}`)}
              </button>
            )
          })}
        </nav>

        <div className="space-y-6 p-5 sm:p-6">
          {tab === 'personal' ? (
            <section>
              <FormSectionTitle icon={UserRound}>{t('users.tabs.personal')}</FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <FormFactTile icon={UserRound} label={t('users.firstName')} value={user.firstName} tone="teal" />
                <FormFactTile icon={UserRound} label={t('users.lastName')} value={user.lastName} tone="mint" />
                <FormFactTile
                  icon={UserRound}
                  label={t('users.fatherName')}
                  value={user.fatherName || empty}
                  empty={!user.fatherName}
                  tone="ink"
                />
                <FormFactTile
                  icon={Calendar}
                  label={t('users.birthDate')}
                  value={user.birthDate ? <DateText value={user.birthDate} /> : empty}
                  empty={!user.birthDate}
                  tone="teal"
                />
                <FormFactTile
                  icon={UserRound}
                  label={t('users.gender')}
                  value={user.gender ? t(`userGenders.${user.gender}`) : empty}
                  empty={!user.gender}
                  tone="ink"
                />
                <FormFactTile icon={IdCard} label={t('users.nationalId')} copyValue={user.nationalId} tone="teal" />
                <FormFactTile icon={Phone} label={t('users.phone')} copyValue={user.phone} tone="mint" />
                <FormFactTile
                  icon={Building2}
                  label={t('users.orgUnit')}
                  value={user.orgUnit?.name || empty}
                  empty={!user.orgUnit}
                  tone="teal"
                />
                <FormFactTile
                  icon={Briefcase}
                  label={t('users.position')}
                  value={user.position?.name || empty}
                  empty={!user.position}
                  tone="mint"
                />
                <FormFactTile
                  icon={Handshake}
                  label={t('users.contractor')}
                  value={user.contractor?.name || empty}
                  empty={!user.contractor}
                  tone="teal"
                />
                <FormFactTile
                  icon={Share2}
                  label={t('users.religion')}
                  value={religionLabel}
                  empty={!user.religion}
                  tone="ink"
                />
              </div>
            </section>
          ) : null}

          {tab === 'account' ? (
            <section>
              <FormSectionTitle icon={KeyRound}>{t('users.tabs.account')}</FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <FormFactTile
                  icon={UserRound}
                  label={t('users.username')}
                  value={localizeDigits(user.username, uiLocale)}
                  tone="teal"
                />
                <FormFactTile
                  icon={Languages}
                  label={t('users.locale')}
                  value={languages[locale] ? t(`languages.${locale}`) : user.locale}
                  tone="mint"
                />
                <FormFactTile
                  icon={Calendar}
                  label={t('users.createdAt')}
                  value={<DateText value={user.createdAt} withTime />}
                  tone="ink"
                />
                <FormFactTile
                  icon={Calendar}
                  label={t('users.updatedAt')}
                  value={<DateText value={user.updatedAt} withTime />}
                  tone="teal"
                />
                <FormFactTile
                  icon={Shield}
                  label={t('users.roles')}
                  value={user.roles?.length ? <RoleBadges roles={user.roles} /> : empty}
                  empty={!user.roles?.length}
                  className="sm:col-span-2"
                />
              </div>
            </section>
          ) : null}

          {tab === 'location' ? (
            <section>
              <FormSectionTitle icon={MapPin}>{t('users.tabs.location')}</FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <FormFactTile
                  icon={Flag}
                  label={t('geo.country')}
                  value={user.country ? geoName(user.country) : empty}
                  empty={!user.country}
                  tone="teal"
                />
                <FormFactTile
                  icon={MapPin}
                  label={t('geo.province')}
                  value={user.province ? geoName(user.province) : empty}
                  empty={!user.province}
                  tone="mint"
                />
                <FormFactTile
                  icon={Building2}
                  label={t('geo.city')}
                  value={user.city ? geoName(user.city) : empty}
                  empty={!user.city}
                  tone="ink"
                />
                <FormFactTile
                  icon={MapPinned}
                  label={t('users.address')}
                  value={user.address || empty}
                  empty={!user.address}
                  tone="teal"
                  className="sm:col-span-2"
                />
              </div>
              <FormSectionTitle icon={LocateFixed} className="mb-2.5 mt-6">
                {t('location.title')}
              </FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <FormFactTile
                  icon={MapPinned}
                  label={t('geo.province')}
                  value={user.locationProvince ? geoName(user.locationProvince) : empty}
                  empty={!user.locationProvince}
                  tone="teal"
                />
                <FormFactTile
                  icon={Building2}
                  label={t('geo.city')}
                  value={user.locationCity ? geoName(user.locationCity) : empty}
                  empty={!user.locationCity}
                  tone="mint"
                />
                <FormFactTile
                  icon={MapPinned}
                  label={t('location.notes')}
                  value={user.locationNotes || empty}
                  empty={!user.locationNotes}
                  tone="ink"
                  className="sm:col-span-2"
                />
              </div>
              {user.latitude != null && user.longitude != null ? (
                <div className="mt-3 overflow-hidden rounded-2xl ring-1 ring-teal-100">
                  <OsmMapPicker
                    variant="always"
                    readOnly
                    latitude={String(user.latitude)}
                    longitude={String(user.longitude)}
                    onChange={() => undefined}
                    heightClass="h-56"
                  />
                </div>
              ) : null}
              {user.locationUpdatedAt ? (
                <p className="mt-2 text-xs text-ink-400">
                  {t('location.updatedAt')}
                  {' · '}
                  <DateText value={user.locationUpdatedAt} withTime />
                </p>
              ) : null}
            </section>
          ) : null}

          {tab === 'documents' ? (
            <section>
              <FormSectionTitle icon={ImagePlus}>{t('users.tabs.documents')}</FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <DocumentTile icon={UserRound} label={t('users.photo')} imageId={user.photoId} tone="teal" />
                <DocumentTile
                  icon={IdCard}
                  label={t('users.nationalCardPhoto')}
                  imageId={user.nationalCardPhotoId}
                  tone="mint"
                />
                <DocumentTile
                  icon={FileImage}
                  label={t('users.passportPhoto')}
                  imageId={user.passportPhotoId}
                  tone="ink"
                />
                <DocumentTile
                  icon={FileText}
                  label={t('users.identityBookletPhoto')}
                  imageId={user.identityBookletPhotoId}
                  tone="teal"
                />
              </div>
            </section>
          ) : null}

          {tab === 'social' ? (
            <section>
              <FormSectionTitle icon={Share2}>{t('users.tabs.social')}</FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <FormFactTile icon={Share2} label={t('users.telegram')} value={user.telegram || empty} empty={!user.telegram} tone="teal" />
                <FormFactTile icon={MessageCircle} label={t('users.bale')} value={user.bale || empty} empty={!user.bale} tone="mint" />
                <FormFactTile icon={MessageCircle} label={t('users.eitaa')} value={user.eitaa || empty} empty={!user.eitaa} tone="ink" />
                <FormFactTile icon={Phone} label={t('users.whatsapp')} value={user.whatsapp || empty} empty={!user.whatsapp} tone="teal" />
                <FormFactTile
                  icon={Share2}
                  label={t('users.otherSocial')}
                  value={user.otherSocial || empty}
                  empty={!user.otherSocial}
                  tone="mint"
                  className="sm:col-span-2"
                />
              </div>
            </section>
          ) : null}

          {tab === 'qeshmondi' ? (
            <section>
              <FormSectionTitle icon={UserRoundCheck}>{t('users.tabs.qeshmondi')}</FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <FormFactTile
                  icon={UserRoundCheck}
                  label={t('users.isQeshmondi')}
                  value={user.isQeshmondi ? t('users.qeshmondi') : t('users.nonQeshmondi')}
                  tone="teal"
                />
                <FormFactTile
                  icon={ToggleRight}
                  label={t('users.isResident')}
                  value={user.isResident ? t('users.resident') : t('users.nonResident')}
                  tone="mint"
                />
                <FormFactTile
                  icon={Users}
                  label={t('users.qeshmondiGroup')}
                  value={user.qeshmondiGroup || empty}
                  empty={!user.qeshmondiGroup}
                  tone="ink"
                />
                <FormFactTile
                  icon={Ticket}
                  label={t('users.individualTicketQuota')}
                  value={formatNumber(user.individualTicketQuota ?? 1, uiLocale)}
                  tone="teal"
                />
                <FormFactTile
                  icon={Briefcase}
                  label={t('users.occupation')}
                  value={user.occupation || empty}
                  empty={!user.occupation}
                  tone="ink"
                />
                <FormFactTile
                  icon={IdCard}
                  label={t('users.passportNumber')}
                  copyValue={user.passportNumber}
                  tone="teal"
                />
                <FormFactTile
                  icon={Calendar}
                  label={t('users.qeshmondiStartDate')}
                  value={user.qeshmondiStartDate ? <DateText value={user.qeshmondiStartDate} /> : empty}
                  empty={!user.qeshmondiStartDate}
                  tone="mint"
                />
                <FormFactTile
                  icon={Calendar}
                  label={t('users.qeshmondiEndDate')}
                  value={user.qeshmondiEndDate ? <DateText value={user.qeshmondiEndDate} /> : empty}
                  empty={!user.qeshmondiEndDate}
                  tone="ink"
                />
              </div>

              <FormSectionTitle icon={Languages} className="mb-2.5 mt-6">
                {t('users.qeshmondiSections.identity')}
              </FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <FormFactTile icon={Languages} label={t('users.latinFirstName')} value={user.latinFirstName || empty} empty={!user.latinFirstName} tone="teal" />
                <FormFactTile icon={Languages} label={t('users.latinLastName')} value={user.latinLastName || empty} empty={!user.latinLastName} tone="mint" />
                <FormFactTile icon={Languages} label={t('users.latinFatherName')} value={user.latinFatherName || empty} empty={!user.latinFatherName} tone="ink" />
                <FormFactTile icon={Hash} label={t('users.identityNumber')} value={user.identityNumber ? localizeDigits(user.identityNumber, uiLocale) : empty} empty={!user.identityNumber} tone="teal" />
                <FormFactTile icon={Hash} label={t('users.identitySerial')} value={user.identitySerial ? localizeDigits(user.identitySerial, uiLocale) : empty} empty={!user.identitySerial} tone="mint" />
                <FormFactTile icon={FileText} label={t('users.religionBranch')} value={user.religionOther || empty} empty={!user.religionOther} tone="ink" />
              </div>

              <FormSectionTitle icon={Phone} className="mb-2.5 mt-6">
                {t('users.qeshmondiSections.contact')}
              </FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <FormFactTile icon={Phone} label={t('users.landlinePhone')} value={user.landlinePhone ? localizeDigits(user.landlinePhone, uiLocale) : empty} empty={!user.landlinePhone} tone="teal" />
                <FormFactTile icon={Printer} label={t('users.fax')} value={user.fax ? localizeDigits(user.fax, uiLocale) : empty} empty={!user.fax} tone="mint" />
                <FormFactTile icon={Hash} label={t('users.postalCode')} value={user.postalCode ? localizeDigits(user.postalCode, uiLocale) : empty} empty={!user.postalCode} tone="ink" />
                <FormFactTile icon={Zap} label={t('users.electricitySubscription')} value={user.electricitySubscription || empty} empty={!user.electricitySubscription} tone="teal" />
                <FormFactTile icon={Building2} label={t('users.jobAddress')} value={user.jobAddress || empty} empty={!user.jobAddress} tone="mint" />
                <FormFactTile icon={Phone} label={t('users.jobPhone')} value={user.jobPhone ? localizeDigits(user.jobPhone, uiLocale) : empty} empty={!user.jobPhone} tone="ink" />
                <FormFactTile icon={Printer} label={t('users.jobFax')} value={user.jobFax ? localizeDigits(user.jobFax, uiLocale) : empty} empty={!user.jobFax} tone="teal" />
                <FormFactTile icon={Hash} label={t('users.jobPostalCode')} value={user.jobPostalCode ? localizeDigits(user.jobPostalCode, uiLocale) : empty} empty={!user.jobPostalCode} tone="mint" />
              </div>

              <FormSectionTitle icon={GraduationCap} className="mb-2.5 mt-6">
                {t('users.qeshmondiSections.status')}
              </FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <FormFactTile
                  icon={Users}
                  label={t('users.isSingle')}
                  value={user.isSingle == null ? empty : user.isSingle ? t('users.single') : t('users.married')}
                  empty={user.isSingle == null}
                  tone="teal"
                />
                <FormFactTile icon={GraduationCap} label={t('users.education')} value={user.education || empty} empty={!user.education} tone="mint" />
                <FormFactTile icon={Flag} label={t('users.nationality')} value={user.nationality || empty} empty={!user.nationality} tone="ink" />
                <FormFactTile icon={Landmark} label={t('users.protectorOffice')} value={user.protectorOffice || empty} empty={!user.protectorOffice} tone="teal" />
                <FormFactTile icon={Fingerprint} label={t('users.fingerprint')} value={user.hasFingerprint ? t('users.fingerprintSaved') : t('users.fingerprintEmpty')} tone="mint" />
              </div>

              <FormSectionTitle icon={Calendar} className="mb-2.5 mt-6">
                {t('users.qeshmondiSections.expiry')}
              </FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <FormFactTile icon={Calendar} label={t('users.nationalIdExpiresAt')} value={user.nationalIdExpiresAt ? <DateText value={user.nationalIdExpiresAt} /> : empty} empty={!user.nationalIdExpiresAt} tone="teal" />
                <FormFactTile icon={Calendar} label={t('users.passportExpiresAt')} value={user.passportExpiresAt ? <DateText value={user.passportExpiresAt} /> : empty} empty={!user.passportExpiresAt} tone="mint" />
              </div>

              <FormSectionTitle icon={Landmark} className="mb-2.5 mt-6">
                {t('users.qeshmondiSections.bank')}
              </FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <FormFactTile
                  icon={ToggleRight}
                  label={t('users.isBank')}
                  value={user.isBank == null ? empty : user.isBank ? t('users.hasBank') : t('users.noBank')}
                  empty={user.isBank == null}
                  tone="teal"
                />
                <FormFactTile icon={Landmark} label={t('users.bankFullName')} value={user.bankFullName || empty} empty={!user.bankFullName} tone="mint" />
                <FormFactTile icon={Languages} label={t('users.bankFullLatinName')} value={user.bankFullLatinName || empty} empty={!user.bankFullLatinName} tone="ink" />
                <FormFactTile icon={CreditCard} label={t('users.accountNumber')} value={user.accountNumber ? localizeDigits(user.accountNumber, uiLocale) : empty} empty={!user.accountNumber} tone="teal" />
                <FormFactTile icon={CreditCard} label={t('users.cardNumber')} value={user.cardNumber ? localizeDigits(user.cardNumber, uiLocale) : empty} empty={!user.cardNumber} tone="mint" />
                <FormFactTile icon={Hash} label={t('users.cardSeries')} value={user.cardSeries || empty} empty={!user.cardSeries} tone="ink" />
                <FormFactTile icon={Calendar} label={t('users.accountOpeningDate')} value={user.accountOpeningDate ? <DateText value={user.accountOpeningDate} /> : empty} empty={!user.accountOpeningDate} tone="teal" />
                <FormFactTile icon={Calendar} label={t('users.cardIssuanceDate')} value={user.cardIssuanceDate ? <DateText value={user.cardIssuanceDate} /> : empty} empty={!user.cardIssuanceDate} tone="mint" />
                <FormFactTile icon={Calendar} label={t('users.cardDeliverDate')} value={user.cardDeliverDate ? <DateText value={user.cardDeliverDate} /> : empty} empty={!user.cardDeliverDate} tone="ink" />
              </div>

              <FormSectionTitle icon={Building2} className="mb-2.5 mt-6">
                {t('users.qeshmondiSections.company')}
              </FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <FormFactTile icon={Building2} label={t('users.companyName')} value={user.companyName || empty} empty={!user.companyName} tone="teal" />
                <FormFactTile icon={FileText} label={t('users.companySubject')} value={user.companySubject || empty} empty={!user.companySubject} tone="mint" />
                <FormFactTile icon={Hash} label={t('users.companyLicenseNumber')} value={user.companyLicenseNumber || empty} empty={!user.companyLicenseNumber} tone="ink" />
                <FormFactTile icon={Calendar} label={t('users.companyLicenseDate')} value={user.companyLicenseDate ? <DateText value={user.companyLicenseDate} /> : empty} empty={!user.companyLicenseDate} tone="teal" />
                <FormFactTile icon={Hash} label={t('users.companyPaperNumber')} value={user.companyPaperNumber || empty} empty={!user.companyPaperNumber} tone="mint" />
                <FormFactTile icon={Calendar} label={t('users.companyPaperDate')} value={user.companyPaperDate ? <DateText value={user.companyPaperDate} /> : empty} empty={!user.companyPaperDate} tone="ink" />
              </div>
            </section>
          ) : null}

          {tab === 'other' ? (
            <section>
              <FormSectionTitle icon={FileText}>{t('users.tabs.other')}</FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <FormFactTile icon={Mail} label={t('users.email')} value={user.email || empty} empty={!user.email} tone="teal" />
                <FormFactTile
                  icon={ToggleRight}
                  label={t('users.status')}
                  value={t(`userStatuses.${user.status}`)}
                  tone="mint"
                />
                <FormFactTile
                  icon={Car}
                  label={t('users.vehiclePlates')}
                  value={user.vehiclePlates.length ? user.vehiclePlates.join('، ') : empty}
                  empty={!user.vehiclePlates.length}
                  tone="ink"
                  className="sm:col-span-2"
                />
                <FormFactTile
                  icon={FileText}
                  label={t('users.notes')}
                  value={user.notes ? <span className="whitespace-pre-wrap">{user.notes}</span> : empty}
                  empty={!user.notes}
                  tone="teal"
                  className="sm:col-span-2"
                />
              </div>
            </section>
          ) : null}

          <DetailActions
            editTo={editPath}
            editLabel={t('common.edit')}
            deleteLabel={qeshmondiView ? t('qeshmondi.delete') : t('users.delete')}
            onDelete={() =>
              confirmDelete({
                message: qeshmondiView ? t('qeshmondi.confirmDelete') : t('users.confirmDelete'),
                successMessage: qeshmondiView ? t('qeshmondi.deleted') : t('users.deleted'),
                path: `/users/${user.id}`,
                queryKey: employeeView ? ['employees'] : qeshmondiView ? ['qeshmondi'] : ['users'],
                onDeleted: () => navigate(listPath),
              })
            }
            extraItems={[
              {
                to: `/users/${user.id}/location`,
                icon: MapPin,
                label: t('location.register'),
              },
              {
                to: publicProfilePath(user.id),
                icon: IdCard,
                label: t('nav.publicCard'),
                variant: 'ghost',
              },
            ]}
          />
        </div>
      </FormCard>
    </div>
  )
}

function DocumentTile({
  icon: Icon,
  label,
  imageId,
  tone,
}: {
  icon: LucideIcon
  label: string
  imageId?: string | null
  tone: FormTone
}) {
  const colors = formToneClass[tone]
  return (
    <article className={`rounded-2xl border px-3 py-3 ${colors.wrap}`}>
      <div className="mb-2.5 flex items-center gap-2">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${colors.icon}`}>
          <Icon className="size-4" aria-hidden />
        </span>
        <p className="text-xs font-semibold text-ink-700">{label}</p>
      </div>
      {imageId ? (
        <a href={getImageUrl(imageId)} target="_blank" rel="noreferrer">
          <img src={getImageUrl(imageId)} alt="" className="h-28 w-full rounded-xl object-cover ring-1 ring-white/80" />
        </a>
      ) : (
        <p className="rounded-xl border border-dashed border-line bg-white/70 px-3 py-8 text-center text-xs text-ink-400">
          —
        </p>
      )}
    </article>
  )
}
