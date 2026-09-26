import {
  CalendarRange,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileAudio,
  ImagePlus,
  Mic,
  Percent,
  ScrollText,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { type CSSProperties, type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FileDropField } from '../../../components/ui/FileDropField'
import { AppForm, Button, FormActions, FormField, fieldClassName } from '../../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { PersianDateField } from '../../../components/ui/PersianDateField'
import { api, getApiErrorMessage, getImageUrl } from '../../../lib/api'
import { formatNumber, todayIsoDate } from '../../../lib/datetime'
import { optimizeImageFile } from '../../../lib/optimize-image'
import {
  projectProgressProcessingModes,
  type ProjectProgressEntry,
  type ProjectProgressProcessingMode,
} from '../../../types/app'
import { ProcessingModeField } from './ProcessingModeField'
import { VoiceRecorder } from './VoiceRecorder'

export type ProjectProgressPayload = {
  occurredAt: string
  body: string | null
  transcript: string | null
  progressPercent: number | null
  processingMode: ProjectProgressProcessingMode
  audioId: string | null
  imageIds: string[]
}

export function ProjectProgressForm({
  initial,
  onSubmit,
  embedded = false,
  leading,
  onDismiss,
}: {
  initial?: Pick<
    ProjectProgressEntry,
    | 'occurredAt'
    | 'body'
    | 'transcript'
    | 'progressPercent'
    | 'processingMode'
    | 'audioId'
    | 'audio'
    | 'images'
  >
  onSubmit: (payload: ProjectProgressPayload) => Promise<void>
  embedded?: boolean
  leading?: ReactNode
  onDismiss?: () => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [occurredAt, setOccurredAt] = useState(initial?.occurredAt || todayIsoDate())
  const [body, setBody] = useState(initial?.body ?? initial?.transcript ?? '')
  const [processingMode, setProcessingMode] = useState<ProjectProgressProcessingMode>(
    initial?.processingMode ?? projectProgressProcessingModes.DEFERRED,
  )
  const [progressPercent, setProgressPercent] = useState<number | null>(
    initial?.progressPercent ?? null,
  )
  const [audioId, setAudioId] = useState(initial?.audioId ?? '')
  const [audioDurationMs, setAudioDurationMs] = useState(initial?.audio?.durationMs ?? null)
  const [imageIds, setImageIds] = useState(initial?.images.map((item) => item.imageId) ?? [])
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showAudioDrop, setShowAudioDrop] = useState(false)
  const [showImageDrop, setShowImageDrop] = useState(false)
  const [showMoreDetails, setShowMoreDetails] = useState(() => {
    const web =
      typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches
    if (web) return true
    return Boolean(
      initial &&
        (initial.images.length > 0 ||
          initial.progressPercent != null ||
          initial.processingMode === projectProgressProcessingModes.DEFERRED),
    )
  })
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const field = bodyRef.current
    if (!field) return
    const pinBottom = () => {
      field.scrollTop = field.scrollHeight
    }
    pinBottom()
    const frame = requestAnimationFrame(pinBottom)
    return () => cancelAnimationFrame(frame)
  }, [body])

  async function uploadAudio(file: File, durationMs?: number) {
    setUploadingAudio(true)
    try {
      const form = new FormData()
      form.append('file', file)
      if (durationMs != null) {
        form.append('durationMs', String(Math.round(durationMs)))
      }
      const { data } = await api.post<{ id: string; durationMs: number | null }>('/files', form)
      setAudioId(data.id)
      setAudioDurationMs(data.durationMs ?? durationMs ?? null)
      setShowAudioDrop(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setUploadingAudio(false)
    }
  }

  async function uploadImage(file: File) {
    setUploadingImage(true)
    try {
      const optimized = await optimizeImageFile(file)
      const form = new FormData()
      form.append('file', optimized)
      const { data } = await api.post<{ id: string }>('/images', form)
      setImageIds((current) => [...current, data.id])
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setUploadingImage(false)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const text = body.trim()
    if (!text && !audioId && !imageIds.length) {
      toast.error(t('projectProgress.needContent'))
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        occurredAt,
        body: text || null,
        transcript:
          processingMode === projectProgressProcessingModes.IMMEDIATE && text ? text : null,
        progressPercent,
        processingMode,
        audioId: audioId || null,
        imageIds,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  const recorder = (
    <VoiceRecorder
      audioId={audioId || null}
      durationMs={audioDurationMs}
      processingMode={processingMode}
      liveTranscript={body}
      compact={embedded}
      bare={showMoreDetails}
      disabled={uploadingAudio || saving}
      onAudio={(file, durationMs) => void uploadAudio(file, durationMs)}
      onClear={() => {
        setAudioId('')
        setAudioDurationMs(null)
      }}
      onLiveTranscript={setBody}
    />
  )

  const extraFields = (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 sm:items-center">
        <div className="flex items-center justify-center">{recorder}</div>
        <div className="flex min-w-0 flex-col gap-3">
          <FormField icon={CalendarRange} label={t('projectProgress.occurredAt')} htmlFor="progressDate">
            <PersianDateField
              id="progressDate"
              value={occurredAt}
              onChange={(value) => setOccurredAt(value ?? todayIsoDate())}
            />
          </FormField>
          <FormField icon={SlidersHorizontal} label={t('projectProgress.processingMode')}>
            <ProcessingModeField value={processingMode} onChange={setProcessingMode} />
          </FormField>
        </div>
      </div>
      <FormField icon={Percent} label={t('projectProgress.progress')} htmlFor="progressPercent">
        <div className="space-y-1.5">
          <input
            id="progressPercent"
            type="range"
            min={0}
            max={100}
            step={1}
            dir="ltr"
            className="progress-slider"
            style={{ '--slider-fill': `${progressPercent ?? 0}%` } as CSSProperties}
            value={progressPercent ?? 0}
            onChange={(event) => setProgressPercent(Number(event.target.value))}
          />
          <p className="text-center text-sm tabular-nums text-ink-700">
            {progressPercent == null ? '—' : `${formatNumber(progressPercent, locale)}٪`}
          </p>
        </div>
      </FormField>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          variant="ghost"
          className="w-full sm:w-auto"
          disabled={saving}
          onClick={() => setShowImageDrop((open) => !open)}
        >
          <ImagePlus className="size-4" aria-hidden />
          {t('projectProgress.addImage')}
        </Button>
        {!audioId ? (
          <Button
            type="button"
            variant="ghost"
            className="w-full sm:w-auto"
            disabled={saving}
            onClick={() => setShowAudioDrop((open) => !open)}
          >
            <FileAudio className="size-4" aria-hidden />
            {t('projectProgress.addAudioFile')}
          </Button>
        ) : null}
      </div>
      {showAudioDrop && !audioId ? (
        <FileDropField
          accept="audio/*"
          allowCamera={false}
          uploading={uploadingAudio}
          onFile={(file) => void uploadAudio(file)}
        />
      ) : null}
      {showImageDrop || imageIds.length ? (
        <div className="space-y-3">
          {imageIds.length ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {imageIds.map((id) => (
                <div key={id} className="relative">
                  <img
                    src={getImageUrl(id)}
                    alt=""
                    className="h-20 w-full rounded-xl object-cover ring-1 ring-teal-100 sm:h-24"
                  />
                  <button
                    type="button"
                    className="absolute top-1 end-1 cursor-pointer rounded-full bg-white/90 px-2 py-0.5 text-[11px] text-teal-700 shadow-sm"
                    onClick={() => setImageIds((current) => current.filter((item) => item !== id))}
                  >
                    {t('common.removeFile')}
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {showImageDrop ? (
            <FileDropField
              accept="image/*"
              capture="environment"
              uploading={uploadingImage}
              onFile={(file) => void uploadImage(file)}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )

  const fields = (
      <AppForm
        onSubmit={submit}
        className={
          embedded ? (onDismiss ? 'mx-auto w-full space-y-4' : 'space-y-3') : formCardBodyClassName
        }
      >
        {leading}
        {showMoreDetails ? (
          extraFields
        ) : (
          <FormField icon={Mic} label={t('projectProgress.record')}>
            <div className={onDismiss ? 'flex items-center gap-2' : undefined}>
              <div className={onDismiss ? 'min-w-0 flex-1' : undefined}>{recorder}</div>
              {onDismiss ? (
                <button
                  type="button"
                  className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-teal-400 bg-white text-teal-700 shadow-[0_4px_12px_rgba(46,189,182,0.16)] hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                  aria-label={t('common.back')}
                  onClick={onDismiss}
                >
                  <X className="size-4" aria-hidden />
                </button>
              ) : null}
            </div>
          </FormField>
        )}
        <FormField icon={ScrollText} label={t('projectProgress.body')} htmlFor="progressBody">
          <textarea
            id="progressBody"
            ref={bodyRef}
            className={`${fieldClassName} progress-report-field${onDismiss ? ' progress-report-field-roomy' : ''}`}
            rows={onDismiss ? 5 : embedded ? 2 : 3}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={t('projectProgress.bodyPlaceholder')}
          />
        </FormField>
        <div className="flex justify-center">
          <Button
            type="button"
            variant="ghost"
            className="!rounded-xl !px-2.5 !py-1 !text-[11px]"
            onClick={() => setShowMoreDetails((open) => !open)}
          >
            {showMoreDetails ? (
              <ChevronUp className="size-3.5" aria-hidden />
            ) : (
              <ChevronDown className="size-3.5" aria-hidden />
            )}
            {showMoreDetails ? t('projectProgress.hideMoreDetails') : t('projectProgress.moreDetails')}
          </Button>
        </div>
        <FormActions
          submitLabel={t('projectProgress.save')}
          submitting={saving || uploadingAudio || uploadingImage}
          className="justify-center"
        />
      </AppForm>
  )

  if (embedded) {
    return fields
  }

  return (
    <FormCard
      icon={ClipboardList}
      title={initial ? t('projectProgress.edit') : t('projectProgress.create')}
      subtitle={initial ? undefined : t('projectProgress.createSubtitle')}
    >
      {fields}
    </FormCard>
  )
}
