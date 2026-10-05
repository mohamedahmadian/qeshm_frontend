import { Database, Download, FileSpreadsheet, RefreshCw, UserPlus, UserRoundCheck, UserRoundPen, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { FileDropField } from '../../components/ui/FileDropField'
import { AppForm, Button, FormActions, FormField, PageHeader, formShellClassName } from '../../components/ui/Form'
import { FormCard, FormFactTile, formCardBodyClassName, type FormTone } from '../../components/ui/FormLayout'
import { formatNumber } from '../../lib/datetime'
import { api, getApiErrorMessage } from '../../lib/api'
import { qeshmondiPath } from './qeshmondi-paths'
import { QeshmondiSqlTab } from './QeshmondiSqlTab'

const updateTabs = ['file', 'database'] as const
type UpdateTab = (typeof updateTabs)[number]

const updateTabIcons = {
  file: FileSpreadsheet,
  database: Database,
} as const

const EXCEL_ACCEPT =
  '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel'

const MAX_EXCEL_BYTES = 20 * 1024 * 1024

type ImportResult = {
  created: number
  updated: number
  skipped: number
}

type ExportKind = 'created' | 'skipped'

type ImportStep = 'lookup' | 'writing' | 'roles' | 'syncing'

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
  const [jobId, setJobId] = useState<string | null>(null)
  const [exporting, setExporting] = useState<ExportKind | null>(null)
  const [tab, setTab] = useState<UpdateTab>('file')

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
      setJobId(data.jobId)
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

  function clearOutcome() {
    setResult(null)
    setJobId(null)
  }

  async function download(kind: ExportKind) {
    if (!jobId) return
    setExporting(kind)
    try {
      const response = await api.get<Blob>(`/users/qeshmondi-imports/${jobId}/export`, {
        params: { kind },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = kind === 'created' ? 'افراد-جدید.xlsx' : 'ردیف-های-نادیده.xlsx'
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('qeshmondiUpdate.exportFailed')))
    } finally {
      setExporting(null)
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
        icon={updateTabIcons[tab]}
        title={t(tab === 'file' ? 'qeshmondiUpdate.formTitle' : 'qeshmondiUpdate.dbTitle')}
        subtitle={t(tab === 'file' ? 'qeshmondiUpdate.formSubtitle' : 'qeshmondiUpdate.dbSubtitle')}
      >
        <nav
          className="flex flex-wrap gap-2 border-b border-line bg-cream-50/60 px-4 py-3 sm:px-5"
          role="tablist"
        >
          {updateTabs.map((item) => {
            const Icon = updateTabIcons[item]
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
                {t(`qeshmondiUpdate.tabs.${item}`)}
              </button>
            )
          })}
        </nav>
        {tab === 'database' ? (
          <QeshmondiSqlTab />
        ) : (
          <AppForm onSubmit={submit} className={formCardBodyClassName}>
            <FormField icon={FileSpreadsheet} label={t('qeshmondiUpdate.file')}>
              <FileDropField
                accept={EXCEL_ACCEPT}
                allowCamera={false}
                maxBytes={MAX_EXCEL_BYTES}
                hideLocalPreview
                onFile={(next) => {
                  setFile(next)
                  clearOutcome()
                }}
                onClear={() => {
                  setFile(null)
                  clearOutcome()
                }}
              />
              <p className="text-xs leading-6 text-ink-500">{t('qeshmondiUpdate.fileHint')}</p>
            </FormField>
            {progress ? <ImportProgressBar progress={progress} locale={locale} /> : null}
            {result ? null : (
              <FormActions
                headerIcons={false}
                submitLabel={t('qeshmondiUpdate.submit')}
                cancelLabel={saving ? undefined : t('users.cancel')}
                submitting={saving}
                onCancel={saving ? undefined : () => navigate(qeshmondiPath())}
              />
            )}
          </AppForm>
        )}
      </FormCard>
      {result ? (
        <FormCard
          icon={UserRoundCheck}
          title={t('qeshmondiUpdate.resultTitle')}
          subtitle={t('qeshmondiUpdate.resultSubtitle')}
        >
          <div className="grid gap-2 p-5 sm:grid-cols-3 sm:gap-3 sm:p-6">
            <ResultTile
              icon={UserPlus}
              label={t('qeshmondiUpdate.created')}
              value={formatNumber(result.created, locale)}
              tone="teal"
              downloadLabel={t('qeshmondiUpdate.downloadCreated')}
              downloading={exporting === 'created'}
              disabled={result.created === 0}
              onDownload={() => void download('created')}
            />
            <FormFactTile
              icon={UserRoundPen}
              label={t('qeshmondiUpdate.updated')}
              value={formatNumber(result.updated, locale)}
              tone="mint"
            />
            <ResultTile
              icon={FileSpreadsheet}
              label={t('qeshmondiUpdate.skipped')}
              value={formatNumber(result.skipped, locale)}
              tone="ink"
              downloadLabel={t('qeshmondiUpdate.downloadSkipped')}
              downloading={exporting === 'skipped'}
              disabled={result.skipped === 0}
              onDownload={() => void download('skipped')}
            />
          </div>
        </FormCard>
      ) : null}
    </div>
  )
}

function ResultTile({
  icon,
  label,
  value,
  tone,
  downloadLabel,
  downloading,
  disabled,
  onDownload,
}: {
  icon: LucideIcon
  label: string
  value: string
  tone: FormTone
  downloadLabel: string
  downloading: boolean
  disabled: boolean
  onDownload: () => void
}) {
  return (
    <div className="relative">
      <FormFactTile icon={icon} label={label} value={value} tone={tone} />
      <div className="absolute end-2 top-2 z-20">
        <Button
          type="button"
          variant="ghost"
          icon
          disabled={disabled || downloading}
          aria-label={downloadLabel}
          title={downloadLabel}
          onClick={onDownload}
        >
          <Download className="size-4" aria-hidden />
        </Button>
      </div>
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
