import {
  Check,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  ImagePlus,
  MapPin,
  MessageCircleHeart,
  Mic,
  Phone,
  Shield,
  Sparkles,
  UserRound,
  UserRoundX,
  Video,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../../../auth/AuthProvider'
import { FileDropField } from '../../../components/ui/FileDropField'
import { AppForm, Button, FormField, fieldClassName } from '../../../components/ui/Form'
import { OsmMapPicker } from '../../../components/ui/OsmMapPicker'
import { api, getApiErrorMessage, getImageUrl } from '../../../lib/api'
import { formatNumber, localizeDigits } from '../../../lib/datetime'
import { QESHM_MAP_BOUNDS, QESHM_MAP_CENTER } from '../../../lib/geo'
import { geoErrorI18nKey } from '../../../lib/geolocation'
import { optimizeImageFile } from '../../../lib/optimize-image'
import { getNavIcon } from '../../../lib/icons'
import type { InspectionCategory, InspectionFeedback, InspectionKind } from '../../../types/app'
import { inspectionMinePath } from '../inspection-paths'
import { InspectionVoiceRecorder } from './InspectionVoiceRecorder'

const IMAGE_MAX = 8 * 1024 * 1024
const VIDEO_MAX = 25 * 1024 * 1024
const AUDIO_MAX = 8 * 1024 * 1024
const MAX_IMAGES = 5

type IdentityMode = 'introduce' | 'anonymous' | null
type MediaTabId = 'photo' | 'audio' | 'video' | 'location'
type WizardStepId = 'kind' | 'identity' | 'identity-form' | 'category' | 'content'

function toOptionalNumber(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

const kindTones = [
  'from-teal-50 to-white border-teal-200',
  'from-rose-50 to-white border-rose-200',
  'from-amber-50 to-white border-amber-200',
  'from-mint-50 to-white border-mint-200',
]

export function InspectionWizard({
  categories,
  kinds,
  variant = 'public',
}: {
  categories: InspectionCategory[]
  kinds: InspectionKind[]
  variant?: 'public' | 'panel'
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { user } = useAuth()
  const loggedIn = Boolean(user)

  const [kindId, setKindId] = useState<string>()
  const [identity, setIdentity] = useState<IdentityMode>(loggedIn ? 'introduce' : null)
  const [identityReady, setIdentityReady] = useState(loggedIn)
  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [trail, setTrail] = useState<InspectionCategory[]>([])
  const [category, setCategory] = useState<InspectionCategory>()
  const [body, setBody] = useState('')
  const [imageIds, setImageIds] = useState<string[]>([])
  const [audioId, setAudioId] = useState<string>()
  const [videoId, setVideoId] = useState<string>()
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [mapNonce, setMapNonce] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mediaTab, setMediaTab] = useState<MediaTabId>('photo')
  const [result, setResult] = useState<InspectionFeedback>()
  const [wizardIndex, setWizardIndex] = useState(0)

  const steps = useMemo<WizardStepId[]>(() => {
    const ids: WizardStepId[] = ['kind']
    if (!loggedIn) {
      ids.push('identity')
      if (identity === 'introduce') ids.push('identity-form')
    }
    ids.push('category', 'content')
    return ids
  }, [identity, loggedIn])

  const step = result ? 'thanks' : steps[Math.min(wizardIndex, steps.length - 1)]
  const currentNodes = trail.length ? trail[trail.length - 1]?.children ?? [] : categories
  const identityFormValid =
    firstName.trim().length >= 2 && lastName.trim().length >= 2 && phone.trim().length >= 8
  const stepLabels = useMemo(() => {
    const labels = [t('inspectionWizard.stepKindShort')]
    if (!loggedIn) {
      labels.push(t('inspectionWizard.stepIdentityShort'))
      if (identity === 'introduce') labels.push(t('inspectionWizard.stepIdentityFormShort'))
    }
    labels.push(t('inspectionWizard.stepCategoryShort'), t('inspectionWizard.stepContentShort'))
    return labels
  }, [identity, loggedIn, t])

  const furthestIndex = useMemo(() => {
    if (!kindId) return 0
    if (!loggedIn) {
      if (!identity) return steps.indexOf('identity')
      if (identity === 'introduce' && !identityReady) return steps.indexOf('identity-form')
    }
    if (!category) return steps.indexOf('category')
    return steps.indexOf('content')
  }, [category, identity, identityReady, kindId, loggedIn, steps])

  function canAdvance() {
    if (step === 'kind') return Boolean(kindId)
    if (step === 'identity') return Boolean(identity)
    if (step === 'identity-form') return identityFormValid
    if (step === 'category') return Boolean(category)
    return false
  }

  function goBack() {
    if (step === 'category' && trail.length) {
      setTrail((current) => current.slice(0, -1))
      return
    }
    setWizardIndex((current) => Math.max(0, current - 1))
  }

  function goNext() {
    if (!canAdvance()) return
    if (step === 'identity-form') setIdentityReady(true)
    setWizardIndex((current) => Math.min(steps.length - 1, current + 1))
  }

  function goToStep(stepNo: number) {
    const index = stepNo - 1
    if (index === wizardIndex || index < 0 || index >= steps.length) return
    if (index < wizardIndex || index <= furthestIndex) {
      setWizardIndex(index)
      return
    }
    if (index === wizardIndex + 1) goNext()
  }

  async function uploadImage(file: File) {
    if (imageIds.length >= MAX_IMAGES) return
    setUploading(true)
    try {
      const optimized = await optimizeImageFile(file)
      const form = new FormData()
      form.append('file', optimized)
      const { data } = await api.post<{ id: string }>('/public/inspection/images', form)
      setImageIds((current) => [...current, data.id])
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setUploading(false)
    }
  }

  async function uploadMedia(file: File, kind: 'audio' | 'video', durationMs?: number) {
    if (kind === 'audio' && file.size > AUDIO_MAX) {
      toast.error(t('common.fileTooLarge'))
      return
    }
    if (kind === 'video' && file.size > VIDEO_MAX) {
      toast.error(t('common.fileTooLarge'))
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      if (durationMs != null) form.append('durationMs', String(Math.round(durationMs)))
      const { data } = await api.post<{ id: string }>('/public/inspection/files', form)
      if (kind === 'audio') setAudioId(data.id)
      else setVideoId(data.id)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setUploading(false)
    }
  }

  async function submit() {
    if (!kindId || !category) return
    if (!body.trim() && !imageIds.length && !audioId && !videoId) {
      toast.error(t('inspectionWizard.needContent'))
      return
    }
    setSaving(true)
    try {
      const path = loggedIn ? '/inspection/mine' : '/public/inspection/feedbacks'
      const { data } = await api.post<InspectionFeedback>(path, {
        kindId,
        categoryId: category.id,
        introduce: !loggedIn && identity === 'introduce',
        firstName: identity === 'introduce' ? firstName.trim() : undefined,
        lastName: identity === 'introduce' ? lastName.trim() : undefined,
        phone: identity === 'introduce' ? phone.trim() : undefined,
        body: body.trim() || null,
        address: address.trim() || null,
        latitude: toOptionalNumber(latitude),
        longitude: toOptionalNumber(longitude),
        imageIds,
        audioIds: audioId ? [audioId] : [],
        videoIds: videoId ? [videoId] : [],
      })
      setResult(data)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  function reset() {
    setResult(undefined)
    setKindId(undefined)
    setIdentity(loggedIn ? 'introduce' : null)
    setIdentityReady(loggedIn)
    setTrail([])
    setCategory(undefined)
    setBody('')
    setImageIds([])
    setAudioId(undefined)
    setVideoId(undefined)
    setAddress('')
    setLatitude('')
    setLongitude('')
    setMapNonce(0)
    setMediaTab('photo')
    setWizardIndex(0)
  }

  return (
    <div className={variant === 'panel' ? 'space-y-5' : 'mx-auto w-full space-y-5 px-1 py-4 sm:py-6'}>
      <header className="text-center">
        <span className="inspection-hero-icon mx-auto mb-3 flex size-16 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-500 to-mint-500 text-white shadow-[0_14px_30px_rgba(46,189,182,0.32)]">
          <Shield className="size-8" aria-hidden />
        </span>
        <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">{t('inspectionWizard.title')}</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-ink-500">{t('inspectionWizard.subtitle')}</p>
        {step !== 'thanks' ? (
          <WizardProgress
            current={wizardIndex + 1}
            labels={stepLabels}
            total={steps.length}
            maxClickable={
              (canAdvance() ? Math.max(furthestIndex, wizardIndex) + 1 : Math.max(furthestIndex, wizardIndex)) + 1
            }
            onStepClick={goToStep}
          />
        ) : null}
      </header>

      <div className="inspection-step rounded-[2rem] border border-teal-100 bg-white/90 p-4 shadow-[0_18px_40px_rgba(20,40,40,0.08)] sm:p-7">
        {step === 'kind' ? (
          <StepFrame
            title={t('inspectionWizard.stepKind')}
            hint={t('inspectionWizard.stepKindHint')}
            onNext={goNext}
            nextDisabled={!kindId}
          >
            {kinds.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {kinds.map((item, index) => (
                  <ChoiceCard
                    key={item.id}
                    icon={getNavIcon(item.icon)}
                    title={item.title}
                    hint={item.description || ''}
                    className={kindTones[index % kindTones.length]}
                    onClick={() => {
                      setKindId(item.id)
                      setWizardIndex(1)
                    }}
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/60 px-4 py-8 text-center text-sm text-ink-500">
                {t('inspectionWizard.noKinds')}
              </p>
            )}
          </StepFrame>
        ) : null}

        {step === 'identity' ? (
          <StepFrame
            title={t('inspectionWizard.stepIdentity')}
            hint={t('inspectionWizard.stepIdentityHint')}
            onBack={goBack}
            onNext={goNext}
            nextDisabled={!identity}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <ChoiceCard
                icon={UserRound}
                title={t('inspectionWizard.introduceTitle')}
                hint={t('inspectionWizard.introduceHint')}
                className="from-teal-50 to-white border-teal-200"
                onClick={() => {
                  setIdentity('introduce')
                  setIdentityReady(false)
                  setWizardIndex(2)
                }}
              />
              <ChoiceCard
                icon={UserRoundX}
                title={t('inspectionWizard.anonymousTitle')}
                hint={t('inspectionWizard.anonymousHint')}
                className="from-cream-50 to-white border-line"
                onClick={() => {
                  setIdentity('anonymous')
                  setIdentityReady(true)
                  setWizardIndex(2)
                }}
              />
            </div>
          </StepFrame>
        ) : null}

        {step === 'identity-form' ? (
          <StepFrame
            title={t('inspectionWizard.stepIdentityForm')}
            hint={t('inspectionWizard.stepIdentityFormHint')}
            onBack={goBack}
            onNext={goNext}
            nextDisabled={!identityFormValid}
          >
            <AppForm
              onSubmit={() => {
                if (identityFormValid) goNext()
              }}
              className="space-y-4"
            >
              <FormField icon={UserRound} label={t('inspectionWizard.firstName')} htmlFor="sgFirst">
                <input
                  id="sgFirst"
                  className={fieldClassName}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  minLength={2}
                />
              </FormField>
              <FormField icon={HeartHandshake} label={t('inspectionWizard.lastName')} htmlFor="sgLast">
                <input
                  id="sgLast"
                  className={fieldClassName}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  minLength={2}
                />
              </FormField>
              <FormField icon={Phone} label={t('inspectionWizard.phone')} htmlFor="sgPhone">
                <input
                  id="sgPhone"
                  className={`${fieldClassName} digit-field`}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  minLength={8}
                  inputMode="tel"
                />
                <p className="mt-1 text-xs text-ink-400">{t('inspectionWizard.phoneHint')}</p>
              </FormField>
              <Button type="submit" className="w-full">
                {t('inspectionWizard.continue')}
                <ChevronLeft className="size-4 ltr:rotate-180" aria-hidden />
              </Button>
            </AppForm>
          </StepFrame>
        ) : null}

        {step === 'category' ? (
          <StepFrame
            title={t('inspectionWizard.stepCategory')}
            hint={t('inspectionWizard.stepCategoryHint')}
            onBack={goBack}
            onNext={goNext}
            nextDisabled={!category}
          >
            {trail.length ? (
              <p className="mb-3 text-sm text-teal-800">
                {trail.map((item) => item.name).join(' / ')}
              </p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              {currentNodes.map((item) => {
                const hasKids = Boolean(item.children?.length)
                return (
                  <ChoiceCard
                    key={item.id}
                    icon={hasKids ? Sparkles : Check}
                    title={item.name}
                    hint={item.description || (hasKids ? t('inspectionWizard.hasChildren') : undefined)}
                    className="from-teal-50/80 to-white border-teal-100"
                    onClick={() => {
                      if (hasKids) setTrail((current) => [...current, item])
                      else {
                        setCategory(item)
                        setWizardIndex(steps.indexOf('content'))
                      }
                    }}
                  />
                )
              })}
            </div>
            {trail.length ? (
              <Button
                type="button"
                variant="soft"
                className="mt-4 w-full"
                onClick={() => {
                  setCategory(trail[trail.length - 1])
                  setWizardIndex(steps.indexOf('content'))
                }}
              >
                <Check className="size-4" aria-hidden />
                {t('inspectionWizard.selectThis')}
              </Button>
            ) : null}
          </StepFrame>
        ) : null}

        {step === 'content' ? (
          <div className="-m-4 sm:-m-7">
            <div className="px-4 pt-4 sm:px-7 sm:pt-7">
              <StepFrame title={t('inspectionWizard.stepContent')} hint={t('inspectionWizard.stepContentHint')} onBack={goBack}>
                <FormField icon={MessageCircleHeart} label={t('inspectionWizard.bodyLabel')} htmlFor="sgBody">
                  <textarea
                    id="sgBody"
                    className={fieldClassName}
                    rows={5}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={t('inspectionWizard.bodyPlaceholder')}
                  />
                </FormField>
              </StepFrame>
            </div>
            <MediaAttachTabs
              tab={mediaTab}
              onTabChange={setMediaTab}
              imageIds={imageIds}
              audioId={audioId}
              videoId={videoId}
              uploading={uploading}
              onRemoveImage={(id) => setImageIds((current) => current.filter((item) => item !== id))}
              onImage={(file) => void uploadImage(file)}
              onAudio={(file, durationMs) => void uploadMedia(file, 'audio', durationMs)}
              onClearAudio={() => setAudioId(undefined)}
              onVideo={(file) => void uploadMedia(file, 'video')}
              onClearVideo={() => setVideoId(undefined)}
              address={address}
              latitude={latitude}
              longitude={longitude}
              mapNonce={mapNonce}
              onAddressChange={setAddress}
              onCoordsChange={(nextLat, nextLng) => {
                setLatitude(nextLat)
                setLongitude(nextLng)
              }}
              onClearLocation={() => {
                setLatitude('')
                setLongitude('')
                setMapNonce((current) => current + 1)
              }}
            />
            <div className="px-4 pb-4 pt-5 sm:px-7 sm:pb-7">
              <Button
                type="button"
                className="w-full"
                disabled={saving || uploading}
                onClick={() => void submit()}
              >
                <Check className="size-4" aria-hidden />
                {saving ? t('inspectionWizard.submitting') : t('inspectionWizard.submit')}
              </Button>
            </div>
          </div>
        ) : null}

        {step === 'thanks' && result ? (
          <div className="space-y-5 text-center">
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-mint-500 text-white shadow-lg">
              <Check className="size-8" aria-hidden />
            </span>
            <h2 className="text-2xl font-bold text-ink-900">{t('inspectionWizard.thanksTitle')}</h2>
            <p className="text-sm leading-7 text-ink-600">
              {result.isAnonymous
                ? t('inspectionWizard.thanksAnonymous')
                : t('inspectionWizard.thanksIdentified', {
                    phone: localizeDigits(result.phone || phone, locale),
                  })}
            </p>
            {!result.isAnonymous ? (
              <p className="text-sm leading-7 text-teal-800">{t('inspectionWizard.thanksSms')}</p>
            ) : null}
            <div className="rounded-2xl bg-teal-50 px-4 py-3">
              <p className="text-xs text-teal-700">{t('inspectionWizard.thanksCode')}</p>
              <p className="mt-1 font-mono text-xl font-bold tracking-widest text-teal-900" dir="ltr">
                {result.trackingCode}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {variant === 'public' ? (
                <Link to="/">
                  <Button variant="ghost">{t('inspectionWizard.backHome')}</Button>
                </Link>
              ) : (
                <Link to={inspectionMinePath()}>
                  <Button variant="ghost">{t('inspectionWizard.seeMine')}</Button>
                </Link>
              )}
              <Button variant="soft" onClick={reset}>
                {t('inspectionWizard.another')}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function StepFrame({
  title,
  hint,
  onBack,
  onNext,
  nextDisabled,
  children,
}: {
  title: string
  hint: string
  onBack?: () => void
  onNext?: () => void
  nextDisabled?: boolean
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div>
      {onBack || onNext ? (
        <div className="mb-3 flex items-center justify-between">
          <div>
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                aria-label={t('inspectionWizard.back')}
                className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-teal-700 hover:bg-teal-50 hover:text-teal-900"
              >
                <ChevronRight className="size-5 ltr:rotate-180" aria-hidden />
              </button>
            ) : null}
          </div>
          <div>
            {onNext ? (
              <button
                type="button"
                onClick={onNext}
                disabled={nextDisabled}
                aria-label={t('inspectionWizard.nextStep')}
                className={`inline-flex size-10 items-center justify-center rounded-full border-0 bg-transparent ${
                  nextDisabled
                    ? 'cursor-not-allowed text-ink-300'
                    : 'cursor-pointer text-teal-700 hover:bg-teal-50 hover:text-teal-900'
                }`}
              >
                <ChevronLeft className="size-5 ltr:rotate-180" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      <h2 className="text-xl font-bold text-ink-900">{title}</h2>
      <p className="mt-1 mb-5 text-sm leading-7 text-ink-500">{hint}</p>
      {children}
    </div>
  )
}

function ChoiceCard({
  icon: Icon,
  title,
  hint,
  className,
  onClick,
}: {
  icon: typeof Sparkles
  title: string
  hint?: string
  className?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inspection-choice cursor-pointer rounded-3xl border bg-gradient-to-b p-4 text-start shadow-sm ${className ?? ''}`}
    >
      <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-white text-teal-600 shadow-sm">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="font-semibold text-ink-900">{title}</p>
      {hint ? <p className="mt-1 text-xs leading-6 text-ink-500">{hint}</p> : null}
    </button>
  )
}

function WizardProgress({
  current,
  total,
  labels,
  maxClickable,
  onStepClick,
}: {
  current: number
  total: number
  labels: string[]
  maxClickable: number
  onStepClick: (stepNo: number) => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'

  return (
    <nav aria-label={t('inspectionWizard.progress')} className="mx-auto mt-5 w-full max-w-2xl px-1">
      <ol className="flex items-center">
        {Array.from({ length: total }, (_, index) => {
          const stepNo = index + 1
          const done = current > stepNo
          const active = current === stepNo
          const clickable = stepNo !== current && stepNo <= maxClickable
          const status = done
            ? t('inspectionWizard.stepDone')
            : active
              ? t('inspectionWizard.stepCurrent')
              : t('inspectionWizard.stepUpcoming')
          const dotClassName = `inspection-step-dot flex size-8 items-center justify-center rounded-full border-0 p-0 text-sm font-bold sm:size-9 ${
            done
              ? 'bg-emerald-500 text-white shadow-[0_8px_16px_rgba(16,185,129,0.35)]'
              : active
                ? 'bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.35)] ring-4 ring-teal-100'
                : 'bg-white text-ink-400 ring-2 ring-teal-200'
          } ${clickable ? 'cursor-pointer hover:scale-105' : ''}`
          const label = `${labels[index] ?? formatNumber(stepNo, locale)} — ${status}`
          return (
            <li
              key={stepNo}
              className={`flex items-center ${index < total - 1 ? 'min-w-0 flex-1' : ''}`}
            >
              <div className="flex w-12 shrink-0 flex-col items-center sm:w-16">
                {clickable ? (
                  <button
                    type="button"
                    className={dotClassName}
                    aria-label={label}
                    onClick={() => onStepClick(stepNo)}
                  >
                    {done ? <Check className="size-4" aria-hidden /> : formatNumber(stepNo, locale)}
                  </button>
                ) : (
                  <span className={dotClassName} aria-current={active ? 'step' : undefined} aria-label={label}>
                    {done ? <Check className="size-4" aria-hidden /> : formatNumber(stepNo, locale)}
                  </span>
                )}
                <span
                  className={`mt-1.5 line-clamp-2 text-center text-[10px] leading-4 sm:text-[11px] ${
                    done ? 'text-emerald-700' : active ? 'font-semibold text-teal-700' : 'text-ink-400'
                  }`}
                >
                  {labels[index]}
                </span>
              </div>
              {index < total - 1 ? (
                <span
                  className="inspection-step-line mb-6 flex min-w-3 flex-1 items-center"
                  aria-hidden
                >
                  {done ? (
                    <span className="h-1 w-full rounded-full bg-emerald-500" />
                  ) : active ? (
                    <span className="inspection-step-line-dashed" />
                  ) : (
                    <span className="h-1 w-full rounded-full bg-teal-300" />
                  )}
                </span>
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function MediaAttachTabs({
  tab,
  onTabChange,
  imageIds,
  audioId,
  videoId,
  uploading,
  onRemoveImage,
  onImage,
  onAudio,
  onClearAudio,
  onVideo,
  onClearVideo,
  address,
  latitude,
  longitude,
  mapNonce,
  onAddressChange,
  onCoordsChange,
  onClearLocation,
}: {
  tab: MediaTabId
  onTabChange: (tab: MediaTabId) => void
  imageIds: string[]
  audioId?: string
  videoId?: string
  uploading: boolean
  onRemoveImage: (id: string) => void
  onImage: (file: File) => void
  onAudio: (file: File, durationMs?: number) => void
  onClearAudio: () => void
  onVideo: (file: File) => void
  onClearVideo: () => void
  address: string
  latitude: string
  longitude: string
  mapNonce: number
  onAddressChange: (value: string) => void
  onCoordsChange: (latitude: string, longitude: string) => void
  onClearLocation: () => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const hasPin = toOptionalNumber(latitude) != null && toOptionalNumber(longitude) != null
  const locationCount = hasPin || address.trim() ? 1 : 0
  const mapFocus = useMemo(
    () =>
      hasPin
        ? null
        : {
            lat: QESHM_MAP_CENTER.lat,
            lng: QESHM_MAP_CENTER.lng,
            zoom: 12,
            bounds: QESHM_MAP_BOUNDS,
          },
    [hasPin],
  )
  const tabs: { id: MediaTabId; icon: typeof ImagePlus; labelKey: string; count: number }[] = [
    { id: 'photo', icon: ImagePlus, labelKey: 'inspectionWizard.addPhoto', count: imageIds.length },
    { id: 'audio', icon: Mic, labelKey: 'inspectionWizard.addAudioFile', count: audioId ? 1 : 0 },
    { id: 'video', icon: Video, labelKey: 'inspectionWizard.addVideo', count: videoId ? 1 : 0 },
    { id: 'location', icon: MapPin, labelKey: 'inspectionWizard.addLocation', count: locationCount },
  ]

  return (
    <div className="mt-5 w-full">
      <div
        role="tablist"
        aria-label={t('inspectionWizard.stepContent')}
        className="grid w-full grid-cols-2 border-y border-teal-100 sm:grid-cols-4"
      >
        {tabs.map((item) => {
          const Icon = item.icon
          const selected = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`inspection-media-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`inspection-media-panel-${item.id}`}
              className={`flex min-h-14 w-full cursor-pointer flex-col items-center justify-center gap-1 px-2 py-3 text-center text-xs font-semibold transition sm:min-h-16 sm:flex-row sm:gap-2 sm:text-sm ${
                selected
                  ? 'bg-teal-500 bg-[linear-gradient(to_inline-end,var(--color-teal-500),var(--color-mint-500))] text-white shadow-[0_8px_18px_rgba(46,189,182,0.22)]'
                  : 'bg-cream-50 text-ink-600 hover:bg-teal-50 hover:text-teal-800'
              }`}
              onClick={() => onTabChange(item.id)}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span>{t(item.labelKey)}</span>
              {item.count ? (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                    selected ? 'bg-white/20 text-white' : 'bg-emerald-500 text-white'
                  }`}
                >
                  {formatNumber(item.count, locale)}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {tab === 'photo' ? (
        <div
          role="tabpanel"
          id="inspection-media-panel-photo"
          aria-labelledby="inspection-media-tab-photo"
          className="border-t border-teal-100 bg-white px-4 py-5 sm:px-7"
        >
          <p className="mb-3 text-xs text-ink-400">{t('inspectionWizard.photosHint')}</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {imageIds.map((id) => (
              <button
                key={id}
                type="button"
                className="relative cursor-pointer overflow-hidden rounded-2xl ring-1 ring-teal-100"
                onClick={() => onRemoveImage(id)}
              >
                <img src={getImageUrl(id)} alt="" className="h-20 w-20 object-cover" />
              </button>
            ))}
          </div>
          {imageIds.length < MAX_IMAGES ? (
            <FileDropField
              accept="image/*"
              capture="environment"
              maxBytes={IMAGE_MAX}
              uploading={uploading}
              onFile={onImage}
            />
          ) : null}
        </div>
      ) : null}

      {tab === 'audio' ? (
        <div
          role="tabpanel"
          id="inspection-media-panel-audio"
          aria-labelledby="inspection-media-tab-audio"
          className="space-y-4 border-t border-teal-100 bg-white px-4 py-5 sm:px-7"
        >
          <p className="text-xs text-ink-400">{t('inspectionWizard.audioHint')}</p>
          <InspectionVoiceRecorder disabled={uploading} onAudio={onAudio} onClear={onClearAudio} />
          <FileDropField
            accept="audio/*"
            allowCamera={false}
            maxBytes={AUDIO_MAX}
            uploading={uploading}
            onFile={(file) => onAudio(file)}
            onClear={onClearAudio}
          />
        </div>
      ) : null}

      {tab === 'video' ? (
        <div
          role="tabpanel"
          id="inspection-media-panel-video"
          aria-labelledby="inspection-media-tab-video"
          className="border-t border-teal-100 bg-white px-4 py-5 sm:px-7"
        >
          <p className="mb-3 text-xs text-ink-400">{t('inspectionWizard.videoHint')}</p>
          <FileDropField
            accept="video/*"
            allowCamera={false}
            maxBytes={VIDEO_MAX}
            uploading={uploading}
            onFile={onVideo}
            onClear={onClearVideo}
          />
        </div>
      ) : null}

      {tab === 'location' ? (
        <div
          role="tabpanel"
          id="inspection-media-panel-location"
          aria-labelledby="inspection-media-tab-location"
          className="space-y-4 border-t border-teal-100 bg-white px-4 py-5 sm:px-7"
        >
          <p className="text-xs text-ink-400">{t('inspectionWizard.locationHint')}</p>
          <OsmMapPicker
            key={mapNonce}
            variant="always"
            active={tab === 'location'}
            latitude={latitude}
            longitude={longitude}
            focus={mapFocus}
            heightClass="h-56 sm:h-72"
            onChange={onCoordsChange}
            onGeoError={(kind) => toast.error(t(geoErrorI18nKey(kind)))}
            onGeoOutside={() => toast.error(t('location.outsideSelectedArea'))}
          />
          {hasPin ? (
            <Button type="button" variant="ghost" className="w-full" onClick={onClearLocation}>
              {t('inspectionWizard.clearLocation')}
            </Button>
          ) : null}
          <FormField icon={MapPin} label={t('inspectionWizard.address')} htmlFor="sgAddress">
            <textarea
              id="sgAddress"
              className={fieldClassName}
              rows={3}
              value={address}
              onChange={(e) => onAddressChange(e.target.value)}
              placeholder={t('inspectionWizard.addressPlaceholder')}
            />
          </FormField>
        </div>
      ) : null}
    </div>
  )
}
