import { FileSpreadsheet, RefreshCw, UserPlus, UserRoundCheck, UserRoundPen } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { FileDropField } from '../../components/ui/FileDropField'
import { AppForm, FormActions, FormField, PageHeader, formShellClassName } from '../../components/ui/Form'
import { FormCard, FormFactTile, formCardBodyClassName } from '../../components/ui/FormLayout'
import { formatNumber } from '../../lib/datetime'
import { api, getApiErrorMessage } from '../../lib/api'
import { qeshmondiPath } from './qeshmondi-paths'

const EXCEL_ACCEPT =
  '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel'

const MAX_EXCEL_BYTES = 20 * 1024 * 1024

type ImportResult = {
  created: number
  updated: number
  skipped: number
  skippedRows: { rowNumber: number; reason: string }[]
}

type ImportStep = 'lookup' | 'writing' | 'roles'

type ImportProgress = {
  phase: 'uploading' | 'parsing' | 'saving'
  step?: ImportStep | null
  percent: number
  processed?: number
  total?: number
}

type ImportJob = {
  phase: 'parsing' | 'saving' | 'done' | 'error'
  step: ImportStep | null
  percent: number
  processed: number
  total: number
  error: string | null
  result: ImportResult | null
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function QeshmondiUpdatePage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  async function submit() {
    if (!file) {
      toast.error(t('qeshmondiUpdate.fileRequired'))
      return
    }
    setSaving(true)
    setResult(null)
    setProgress({ phase: 'uploading', percent: 0 })
    try {
      const started = Date.now()
      const body = new FormData()
      body.append('file', file)
      const { data } = await api.post<{ jobId: string }>('/users/qeshmondi-import', body, {
        onUploadProgress: (event) => {
          const total = event.total || file.size || 0
          const ratio = total > 0 ? event.loaded / total : 0
          setProgress({
            phase: 'uploading',
            percent: Math.min(35, Math.round(ratio * 35)),
          })
        },
      })
      setProgress({ phase: 'parsing', percent: 35 })
      let outcome: ImportResult | null = null
      for (;;) {
        if (Date.now() - started > 20 * 60 * 1000) {
          throw new Error(t('qeshmondiUpdate.importFailed'))
        }
        await wait(400)
        const { data: job } = await api.get<ImportJob>(`/users/qeshmondi-imports/${data.jobId}`)
        if (job.phase === 'error') {
          throw new Error(job.error || t('qeshmondiUpdate.importFailed'))
        }
        const phase: ImportProgress['phase'] = job.phase === 'parsing' ? 'parsing' : 'saving'
        setProgress({
          phase,
          step: job.step,
          percent: 35 + Math.round((job.percent / 100) * 65),
          processed: job.processed,
          total: job.total,
        })
        if (job.phase === 'done') {
          outcome = job.result
          break
        }
      }
      if (!outcome) throw new Error(t('qeshmondiUpdate.importFailed'))
      setResult(outcome)
      toast.success(
        t('qeshmondiUpdate.done', {
          created: formatNumber(outcome.created, locale),
          updated: formatNumber(outcome.updated, locale),
        }),
      )
    } catch (error) {
      const message =
        error instanceof Error && error.message && !('isAxiosError' in error)
          ? error.message
          : getApiErrorMessage(error, t('qeshmondiUpdate.importFailed'))
      toast.error(message)
    } finally {
      setSaving(false)
      setProgress(null)
    }
  }

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={RefreshCw}
        title={t('qeshmondiUpdate.title')}
        subtitle={t('qeshmondiUpdate.subtitle')}
      />
      <FormCard
        icon={FileSpreadsheet}
        title={t('qeshmondiUpdate.formTitle')}
        subtitle={t('qeshmondiUpdate.formSubtitle')}
      >
        <AppForm onSubmit={submit} className={formCardBodyClassName}>
          <FormField icon={FileSpreadsheet} label={t('qeshmondiUpdate.file')}>
            <FileDropField
              accept={EXCEL_ACCEPT}
              allowCamera={false}
              maxBytes={MAX_EXCEL_BYTES}
              hideLocalPreview
              onFile={(next) => {
                setFile(next)
                setResult(null)
              }}
              onClear={() => {
                setFile(null)
                setResult(null)
              }}
            />
            <p className="text-xs leading-6 text-ink-500">{t('qeshmondiUpdate.fileHint')}</p>
          </FormField>
          {progress ? <ImportProgressBar progress={progress} locale={locale} /> : null}
          <FormActions
            headerIcons={false}
            submitLabel={t('qeshmondiUpdate.submit')}
            cancelLabel={saving ? undefined : t('users.cancel')}
            submitting={saving}
            onCancel={saving ? undefined : () => navigate(qeshmondiPath())}
          />
        </AppForm>
      </FormCard>
      {result ? (
        <FormCard
          icon={UserRoundCheck}
          title={t('qeshmondiUpdate.resultTitle')}
          subtitle={t('qeshmondiUpdate.resultSubtitle')}
        >
          <div className="grid gap-2 p-5 sm:grid-cols-3 sm:gap-3 sm:p-6">
            <FormFactTile
              icon={UserPlus}
              label={t('qeshmondiUpdate.created')}
              value={formatNumber(result.created, locale)}
              tone="teal"
            />
            <FormFactTile
              icon={UserRoundPen}
              label={t('qeshmondiUpdate.updated')}
              value={formatNumber(result.updated, locale)}
              tone="mint"
            />
            <FormFactTile
              icon={FileSpreadsheet}
              label={t('qeshmondiUpdate.skipped')}
              value={formatNumber(result.skipped, locale)}
              tone="ink"
            />
          </div>
          {result.skippedRows.length ? (
            <ul className="space-y-1 border-t border-line px-5 py-4 text-sm text-ink-600 sm:px-6">
              {result.skippedRows.slice(0, 20).map((item) => (
                <li key={`${item.rowNumber}-${item.reason}`}>
                  {t('qeshmondiUpdate.skippedRow', {
                    row: formatNumber(item.rowNumber, locale),
                    reason: item.reason,
                  })}
                </li>
              ))}
              {result.skippedRows.length > 20 ? (
                <li className="text-ink-400">
                  {t('qeshmondiUpdate.skippedMore', {
                    count: formatNumber(result.skippedRows.length - 20, locale),
                  })}
                </li>
              ) : null}
            </ul>
          ) : null}
        </FormCard>
      ) : null}
    </div>
  )
}

function ImportProgressBar({
  progress,
  locale,
}: {
  progress: ImportProgress
  locale: string
}) {
  const { t } = useTranslation()
  const percent = Math.max(0, Math.min(100, Math.round(progress.percent)))
  const total = progress.total ?? 0
  const processed = progress.processed ?? 0
  const remaining = Math.max(0, total - processed)
  const counted =
    progress.phase === 'saving' && progress.step && total > 0
      ? t(`qeshmondiUpdate.progress.${progress.step}`, {
          processed: formatNumber(processed, locale),
          total: formatNumber(total, locale),
          remaining: formatNumber(remaining, locale),
        })
      : t(`qeshmondiUpdate.progress.${progress.phase === 'saving' ? 'saving' : progress.phase}`)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm text-ink-600">
        <span>{counted}</span>
        <span className="tabular-nums" dir="ltr">
          {formatNumber(percent, locale)}٪
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-cream-100"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={counted}
      >
        <div
          className="h-full rounded-full bg-teal-500 transition-[width] duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
