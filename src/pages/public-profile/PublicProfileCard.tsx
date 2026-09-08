import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { AppLogo } from '../../components/brand/AppLogo'
import { CopyableDigits } from '../../components/ui/CopyableDigits'
import { languageDir } from '../../i18n'
import { getImageUrl } from '../../lib/api'
import { useGeoName } from '../../lib/geo'
import type { PublicProfile } from '../../types/app'

export const PublicProfileCard = forwardRef<
  HTMLDivElement,
  { profile: PublicProfile; qrUrl?: string | null }
>(function PublicProfileCard({ profile, qrUrl }, ref) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const geoName = useGeoName()
  const photoUrl = profile.photoId ? getImageUrl(profile.photoId) : null
  const place = [profile.country, profile.province, profile.city]
    .filter(Boolean)
    .map((item) => geoName(item!))
    .join(' · ')

  return (
    <div ref={ref} className="member-card" dir={languageDir(locale)}>
      <div className="member-card__header">
        <div className="member-card__header-pattern" aria-hidden />
        <div className="member-card__header-row">
          <div className="member-card__header-main">
            <div className="member-card__brand">
              <AppLogo className="member-card__logo" decorative />
              <div>
                <p className="member-card__app">{t('app.name')}</p>
                <h2 className="member-card__title">{t('publicProfile.cardTitle')}</h2>
              </div>
            </div>
          </div>
          {qrUrl ? (
            <img src={qrUrl} alt="" className="member-card__qr" />
          ) : (
            <div className="member-card__qr" aria-hidden />
          )}
        </div>
      </div>
      <div className="member-card__gold" />
      <div className="member-card__body">
        <div className="member-card__identity">
          <div className="member-card__photo-wrap">
            {photoUrl ? (
              <img src={photoUrl} alt="" className="member-card__photo" crossOrigin="anonymous" />
            ) : (
              <div className="member-card__photo-fallback" aria-hidden>
                {`${profile.firstName.slice(0, 1)}${profile.lastName.slice(0, 1)}`}
              </div>
            )}
          </div>
          <div>
            <p className="member-card__name">{profile.fullName}</p>
            {place ? <p className="member-card__place">{place}</p> : null}
            <div className="member-card__digits">
              {profile.nationalId ? <CopyableDigits value={profile.nationalId} /> : null}
              {profile.phone ? <CopyableDigits value={profile.phone} /> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
