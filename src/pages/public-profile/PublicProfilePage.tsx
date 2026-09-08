import { Download } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { toDataURL } from 'qrcode'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button, LoadingState } from '../../components/ui/Form'
import { FormEmptyHint } from '../../components/ui/FormLayout'
import { api } from '../../lib/api'
import { publicProfileUrl } from '../../lib/public-profile'
import type { PublicProfile } from '../../types/app'
import { PublicProfileCard } from './PublicProfileCard'

export function PublicProfilePage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const cardRef = useRef<HTMLDivElement>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  const query = useQuery({
    queryKey: ['public', 'profile', id],
    enabled: Boolean(id),
    retry: false,
    queryFn: async () => {
      const { data } = await api.get<PublicProfile>(`/public/profiles/${encodeURIComponent(id ?? '')}`)
      return data
    },
  })

  const profile = query.data
  const shareUrl = id ? publicProfileUrl(id) : ''

  useEffect(() => {
    if (!shareUrl) {
      setQrUrl(null)
      return
    }
    let cancelled = false
    toDataURL(shareUrl, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f6e6a', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelled) setQrUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [shareUrl])

  async function downloadCard() {
    if (!cardRef.current || !profile) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3,
        backgroundColor: '#ffffff',
        cacheBust: true,
      })
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `member-card-${profile.nationalId || profile.id}.png`
      link.click()
      toast.success(t('publicProfile.downloaded'))
    } catch {
      toast.error(t('publicProfile.downloadFailed'))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="min-h-svh bg-cream-50 px-4 py-8">
      <div className="mx-auto w-full max-w-lg space-y-4">
        {query.isLoading ? <LoadingState /> : null}
        {query.isError ? <FormEmptyHint>{t('publicProfile.notFound')}</FormEmptyHint> : null}
        {profile ? (
          <>
            <PublicProfileCard ref={cardRef} profile={profile} qrUrl={qrUrl} />
            <Button type="button" className="w-full" disabled={downloading} onClick={() => void downloadCard()}>
              <Download className="size-4" aria-hidden />
              {t('publicProfile.download')}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  )
}
