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

export function QeshmondiUpdatePage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  async function submit() {
    if (!file) {
      toast.error(t('qeshmondiUpdate.fileRequired'))
      return
    }
    setSaving(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const { data } = await api.post<ImportResult>('/users/qeshmondi-import', body)
      setResult(data)
      toast.success(
        t('qeshmondiUpdate.done', {
          created: formatNumber(data.created, locale),
          updated: formatNumber(data.updated, locale),
        }),
      )
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
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
          <FormActions
            headerIcons={false}
            submitLabel={t('qeshmondiUpdate.submit')}
            cancelLabel={t('users.cancel')}
            submitting={saving}
            onCancel={() => navigate(qeshmondiPath())}
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
