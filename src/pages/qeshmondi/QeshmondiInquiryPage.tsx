import axios from 'axios'
import {
  BadgeCheck,
  Briefcase,
  CalendarClock,
  CalendarX2,
  Database,
  Check,
  FileJson,
  FileSpreadsheet,
  IdCard,
  MapPin,
  Phone,
  ScanSearch,
  Ticket,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { DateText } from '../../components/ui/DateText'
import {
  AppForm,
  Button,
  FormField,
  PageHeader,
  fieldClassName,
  formShellClassName,
} from '../../components/ui/Form'
import {
  FormCard,
  FormFactTile,
  formCardBodyClassName,
} from '../../components/ui/FormLayout'
import { LoadingState } from '../../components/ui/LoadingState'
import { api, getApiErrorMessage, getImageUrl } from '../../lib/api'
import { formatGroupedNumber, formatNumber, localizeDigits } from '../../lib/datetime'
import { useGeoName } from '../../lib/geo'
import type { GeoName, UserGender } from '../../types/app'
import { CitizenTrafficCard } from './CitizenTrafficCard'

const inquiryTabs = ['search', 'bank'] as const
type InquiryTab = (typeof inquiryTabs)[number]

const inquiryTabIcons = {
  search: ScanSearch,
  bank: Database,
} as const

type BankFormat = 'xlsx' | 'json'

type QeshmondiProfile = {
  id: string
  firstName: string
  lastName: string
  fullName: string
  fatherName: string | null
  nationalId: string | null
  gender: UserGender | null
  birthDate: string | null
  phone: string | null
  photoId: string | null
  occupation: string | null
  isResident: boolean
  passportNumber: string | null
  qeshmondiGroup: string | null
  qeshmondiStartDate: string | null
  qeshmondiEndDate: string | null
  individualTicketQuota: number
  province: (GeoName & { id: string }) | null
  city: (GeoName & { id: string }) | null
}

type SearchResponse = {
  items: QeshmondiProfile[]
  hasMore: boolean
}

function remainingDays(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return null
  const end = Date.UTC(year, month - 1, day)
  const now = new Date()
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((end - today) / 86_400_000)
}

async function readBlobError(error: unknown, fallback: string) {
  if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
    try {
      const text = await error.response.data.text()
      const body = JSON.parse(text) as { message?: unknown }
      if (typeof body.message === 'string' && body.message.trim()) return body.message
    } catch {
      return fallback
    }
  }
  return getApiErrorMessage(error, fallback)
}

export function QeshmondiInquiryPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [tab, setTab] = useState<InquiryTab>('search')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [profile, setProfile] = useState<QeshmondiProfile | null>(null)
  const [matches, setMatches] = useState<QeshmondiProfile[] | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [exporting, setExporting] = useState<BankFormat | null>(null)

  const bank = useQuery({
    queryKey: ['qeshmondi-bank'],
    enabled: tab === 'bank',
    queryFn: async () => {
      const { data } = await api.get<{
        total: number
        valid: number
        expired: number
        male: number
        female: number
        lastUpdatedAt: string | null
      }>('/users/qeshmondi-bank')
      return data
    },
  })

  async function submit() {
    const q = query.trim()
    if (!q) {
      toast.error(t('qeshmondiInquiry.needQuery'))
      return
    }
    setSearching(true)
    setProfile(null)
    setMatches(null)
    try {
      const { data } = await api.get<SearchResponse>('/users/qeshmondi-inquiry', {
        params: { q },
      })
      if (data.items.length === 0) {
        toast.error(t('qeshmondiInquiry.notFound'))
        return
      }
      if (data.items.length === 1) {
        setProfile(data.items[0])
        return
      }
      setHasMore(data.hasMore)
      setMatches(data.items)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('qeshmondiInquiry.searchFailed')))
    } finally {
      setSearching(false)
    }
  }

  async function download(format: BankFormat) {
    setExporting(format)
    try {
      const response = await api.get<Blob>('/users/qeshmondi-bank/export', {
        params: { format },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = format === 'json' ? 'قشموندان.json' : 'قشموندان.xlsx'
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(await readBlobError(error, t('qeshmondiInquiry.exportFailed')))
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={IdCard}
        title={t('qeshmondiInquiry.title')}
        subtitle={t('qeshmondiInquiry.subtitle')}
      />
      <nav className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label={t('qeshmondiInquiry.title')}>
        {inquiryTabs.map((item) => {
          const Icon = inquiryTabIcons[item]
          const active = tab === item
          return (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item)}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 ${
                active
                  ? 'bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]'
                  : 'bg-white text-ink-700 ring-1 ring-line hover:bg-cream-50'
              }`}
            >
              <Icon className={`size-3.5 ${active ? 'text-white' : 'text-teal-600'}`} aria-hidden />
              {t(`qeshmondiInquiry.tabs.${item}`)}
            </button>
          )
        })}
      </nav>

      {tab === 'search' ? (
        <FormCard
          icon={IdCard}
          title={profile ? profile.fullName : t('qeshmondiInquiry.searchTitle')}
          subtitle={profile ? t('qeshmondiInquiry.profileTitle') : t('qeshmondiInquiry.searchSubtitle')}
          onDoubleClick={() => undefined}
        >
          <div className="space-y-5 p-5 sm:p-6">
            <AppForm onSubmit={submit} autoFocusFirst>
              <div className="flex items-end gap-3">
                <div className="min-w-0 flex-1">
                  <FormField icon={ScanSearch} label={t('qeshmondiInquiry.query')}>
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      className={fieldClassName}
                      placeholder={t('qeshmondiInquiry.queryPlaceholder')}
                      autoComplete="off"
                    />
                  </FormField>
                </div>
                <Button type="submit" disabled={searching} className="shrink-0">
                  <Check className="size-4" aria-hidden />
                  {t('qeshmondiInquiry.search')}
                </Button>
              </div>
            </AppForm>
            {profile ? <CitizenProfile profile={profile} locale={locale} /> : null}
          </div>
        </FormCard>
      ) : null}
      {tab === 'search' && profile ? (
        <CitizenTrafficCard nationalId={profile.nationalId} locale={locale} />
      ) : null}
      {tab === 'bank' ? (
        <FormCard
          icon={Database}
          title={t('qeshmondiInquiry.bankTitle')}
          subtitle={t('qeshmondiInquiry.bankSubtitle')}
          onDoubleClick={() => undefined}
        >
          <div className={formCardBodyClassName}>
            {bank.isLoading ? <LoadingState variant="inline" /> : null}
            {bank.isError ? (
              <p className="text-sm text-ink-600">{t('qeshmondiInquiry.countFailed')}</p>
            ) : null}
            {bank.data ? (
              <div className="relative overflow-hidden rounded-[22px] border border-teal-100 bg-gradient-to-b from-teal-50 to-white px-5 py-6">
                <div
                  className="pointer-events-none absolute -end-8 -top-10 size-28 rounded-full bg-mint-100/80"
                  aria-hidden
                />
                <div className="relative space-y-5">
                  <div className="grid gap-5 sm:grid-cols-3 sm:gap-0">
                    <div className="flex items-center gap-4 sm:pe-6">
                      <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]">
                        <Users className="size-7" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-500">{t('qeshmondiInquiry.total')}</p>
                        <p className="mt-1 text-4xl font-bold tabular-nums text-ink-900">
                          {formatGroupedNumber(bank.data.total, locale)}
                        </p>
                        <p className="mt-1 text-xs text-ink-500">{t('qeshmondiInquiry.totalHint')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 border-t border-teal-100 pt-5 sm:border-s sm:border-t-0 sm:px-6 sm:pt-0">
                      <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]">
                        <BadgeCheck className="size-7" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-500">{t('qeshmondiInquiry.valid')}</p>
                        <p className="mt-1 text-4xl font-bold tabular-nums text-teal-700">
                          {formatGroupedNumber(bank.data.valid, locale)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 border-t border-teal-100 pt-5 sm:border-s sm:border-t-0 sm:ps-6 sm:pt-0">
                      <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-[0_8px_16px_rgba(244,63,94,0.28)]">
                        <CalendarX2 className="size-7" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-500">{t('qeshmondiInquiry.expired')}</p>
                        <p className="mt-1 text-4xl font-bold tabular-nums text-rose-700">
                          {formatGroupedNumber(bank.data.expired, locale)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-5 border-t border-teal-100 pt-5 sm:grid-cols-3 sm:gap-0">
                    <div className="flex items-center gap-4 sm:pe-6">
                      <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]">
                        <UserRound className="size-7" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-500">{t('qeshmondiInquiry.male')}</p>
                        <p className="mt-1 text-4xl font-bold tabular-nums text-ink-900">
                          {formatGroupedNumber(bank.data.male, locale)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 border-t border-teal-100 pt-5 sm:border-s sm:border-t-0 sm:px-6 sm:pt-0">
                      <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-mint-500 text-white shadow-[0_8px_16px_rgba(63,214,190,0.28)]">
                        <UserRound className="size-7" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-500">{t('qeshmondiInquiry.female')}</p>
                        <p className="mt-1 text-4xl font-bold tabular-nums text-ink-900">
                          {formatGroupedNumber(bank.data.female, locale)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 border-t border-teal-100 pt-5 sm:border-s sm:border-t-0 sm:ps-6 sm:pt-0">
                      <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-mint-500 text-white shadow-[0_8px_16px_rgba(63,214,190,0.28)]">
                        <CalendarClock className="size-7" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-500">{t('qeshmondiInquiry.lastUpdated')}</p>
                        <p className="mt-1 text-lg font-bold text-ink-900">
                          {bank.data.lastUpdatedAt ? (
                            <DateText value={bank.data.lastUpdatedAt} withTime />
                          ) : (
                            '—'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button type="button" disabled={exporting != null} onClick={() => void download('xlsx')}>
                <FileSpreadsheet className="size-4" aria-hidden />
                {t('qeshmondiInquiry.downloadExcel')}
              </Button>
              <Button
                type="button"
                variant="soft"
                disabled={exporting != null}
                onClick={() => void download('json')}
              >
                <FileJson className="size-4" aria-hidden />
                {t('qeshmondiInquiry.downloadJson')}
              </Button>
            </div>
          </div>
        </FormCard>
      ) : null}

      <MatchPicker
        items={matches}
        hasMore={hasMore}
        locale={locale}
        onClose={() => setMatches(null)}
        onPick={(item) => {
          setProfile(item)
          setMatches(null)
        }}
      />
    </div>
  )
}

function CitizenProfile({ profile, locale }: { profile: QeshmondiProfile; locale: string }) {
  const { t } = useTranslation()
  const geoName = useGeoName()
  const photoUrl = profile.photoId ? getImageUrl(profile.photoId) : null
  const initials = `${profile.firstName.slice(0, 1)}${profile.lastName.slice(0, 1)}`
  const place = [profile.province, profile.city]
    .filter((item): item is GeoName & { id: string } => Boolean(item))
    .map((item) => geoName(item))
    .filter((name) => name && name !== '—')
    .join(' · ')

  return (
    <>
      <div className="grid items-start gap-4 lg:grid-cols-[11.5rem_minmax(0,1fr)]">
          <div className="flex flex-col items-center gap-3">
            <div className="relative size-36 overflow-hidden rounded-[28px] bg-cream-100 shadow-[0_12px_28px_rgba(46,189,182,0.22)] ring-4 ring-white">
              {photoUrl ? (
                <img src={photoUrl} alt="" className="size-full object-cover" />
              ) : (
                <div className="flex size-full flex-col items-center justify-center gap-1 bg-gradient-to-b from-teal-50 to-mint-50 text-teal-700">
                  {initials ? (
                    <span className="text-3xl font-bold">{initials}</span>
                  ) : (
                    <UserRound className="size-10" aria-hidden />
                  )}
                  <span className="text-[11px] font-medium">{t('qeshmondiInquiry.noPhoto')}</span>
                </div>
              )}
            </div>
            {place ? (
              <p className="flex items-center gap-1 text-center text-xs text-ink-500">
                <MapPin className="size-3.5 shrink-0 text-teal-600" aria-hidden />
                <span>{place}</span>
              </p>
            ) : null}
          </div>
          <ExpiryPanel endDate={profile.qeshmondiEndDate} locale={locale} />
        </div>
        <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
          <FormFactTile
            icon={IdCard}
            label={t('users.nationalId')}
            copyValue={profile.nationalId}
            tone="teal"
          />
          <FormFactTile
            icon={UserRound}
            label={t('users.fatherName')}
            value={profile.fatherName || '—'}
            tone="mint"
          />
          <FormFactTile
            icon={Users}
            label={t('users.gender')}
            value={profile.gender ? t(`userGenders.${profile.gender}`) : '—'}
            tone="teal"
          />
          <FormFactTile
            icon={CalendarClock}
            label={t('users.birthDate')}
            value={profile.birthDate ? <DateText value={profile.birthDate} /> : '—'}
            tone="mint"
          />
          <FormFactTile icon={Phone} label={t('users.phone')} copyValue={profile.phone} tone="teal" />
          <FormFactTile
            icon={Briefcase}
            label={t('users.occupation')}
            value={profile.occupation || '—'}
            tone="mint"
          />
          <FormFactTile
            icon={MapPin}
            label={t('users.isResident')}
            value={profile.isResident ? t('users.resident') : t('users.nonResident')}
            tone="teal"
          />
          <FormFactTile
            icon={IdCard}
            label={t('users.passportNumber')}
            value={
              profile.passportNumber ? (
                <span className="digit-field" dir="ltr">
                  {localizeDigits(profile.passportNumber, locale)}
                </span>
              ) : (
                '—'
              )
            }
            tone="mint"
          />
          <FormFactTile
            icon={Users}
            label={t('users.qeshmondiGroup')}
            value={profile.qeshmondiGroup || '—'}
            tone="teal"
          />
          <FormFactTile
            icon={Ticket}
            label={t('users.individualTicketQuota')}
            value={formatNumber(profile.individualTicketQuota, locale)}
            tone="mint"
          />
          <FormFactTile
            icon={CalendarClock}
            label={t('users.qeshmondiStartDate')}
            value={profile.qeshmondiStartDate ? <DateText value={profile.qeshmondiStartDate} /> : '—'}
            tone="teal"
          />
        </div>
    </>
  )
}

function ExpiryPanel({ endDate, locale }: { endDate?: string | null; locale: string }) {
  const { t } = useTranslation()
  const days = endDate ? remainingDays(endDate) : null
  const expired = days != null && days < 0
  const today = days === 0
  const soon = days != null && days > 0 && days <= 30

  return (
    <div className="grid items-stretch gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
      <section
        className="flex items-center justify-end rounded-[22px] border border-teal-100 bg-white px-4 py-3 shadow-[0_10px_30px_rgba(20,40,40,0.06)]"
        aria-label={t('qeshmondiInquiry.expiryTitle')}
      >
        <p className="flex items-baseline gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500">
            <CalendarClock className="size-4 text-teal-600" aria-hidden />
            {t('qeshmondiInquiry.expiryTitle')}
          </span>
          <span className="text-2xl font-bold leading-none text-ink-900" dir="ltr">
            {endDate ? <DateText value={endDate} /> : '—'}
          </span>
        </p>
      </section>
      <div
        className={`flex min-w-28 flex-col items-center justify-center rounded-2xl border-2 px-4 py-3 ${
          expired ? 'border-red-200 bg-red-50' : 'border-teal-200 bg-teal-50'
        }`}
      >
        {days == null ? (
          <p className="text-center text-xs text-ink-500">{t('qeshmondiInquiry.expiryEmpty')}</p>
        ) : today ? (
          <p className="text-center text-sm font-bold text-teal-700">{t('qeshmondiInquiry.expiresToday')}</p>
        ) : (
          <>
            <p
              className={`qeshmondi-days-blink text-4xl font-bold leading-none tabular-nums ${
                expired ? 'text-red-600' : 'text-teal-600'
              }`}
              dir="ltr"
            >
              {formatGroupedNumber(Math.abs(days), locale)}
            </p>
            <p className="mt-1 text-center text-xs font-medium text-ink-600">
              {expired ? t('qeshmondiInquiry.expiredDays') : t('qeshmondiInquiry.daysRemaining')}
            </p>
            {soon ? <p className="mt-1 text-center text-[11px] text-teal-700">{t('qeshmondiInquiry.expiringSoon')}</p> : null}
          </>
        )}
      </div>
    </div>
  )
}

function MatchPicker({
  items,
  hasMore,
  locale,
  onClose,
  onPick,
}: {
  items: QeshmondiProfile[] | null
  hasMore: boolean
  locale: string
  onClose: () => void
  onPick: (item: QeshmondiProfile) => void
}) {
  const { t } = useTranslation()
  const titleId = useId()
  const open = Boolean(items?.length)

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !items) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink-900/30 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(36rem,calc(100vh-2rem))] w-full max-w-lg flex-col overflow-hidden rounded-[22px] bg-white shadow-[0_18px_50px_rgba(20,40,40,0.16)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative overflow-hidden bg-teal-500 bg-[linear-gradient(to_inline-end,var(--color-teal-500),var(--color-mint-500))] px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-bold">
                {t('qeshmondiInquiry.pickTitle')}
              </h2>
              <p className="mt-1 text-sm text-white/85">{t('qeshmondiInquiry.pickSubtitle')}</p>
            </div>
            <button
              type="button"
              className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-2xl text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              aria-label={t('common.close')}
              onClick={onClose}
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-3">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl px-3 py-3 text-start transition hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
                onClick={() => onPick(item)}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink-900">{item.fullName}</span>
                  <span className="mt-0.5 block truncate text-xs text-ink-500">
                    {t('users.fatherName')}: {item.fatherName || '—'}
                  </span>
                </span>
                <span className="digit-field shrink-0 text-sm text-ink-700" dir="ltr">
                  {item.nationalId ? localizeDigits(item.nationalId, locale) : '—'}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {hasMore ? (
          <p className="border-t border-line px-4 py-3 text-xs text-ink-500">{t('qeshmondiInquiry.hasMore')}</p>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
