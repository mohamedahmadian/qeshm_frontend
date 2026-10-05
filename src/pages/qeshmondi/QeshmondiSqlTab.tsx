import { BadgeCheck, Check, Database, Hash, KeyRound, PlugZap, RefreshCw, Server, ShieldCheck, UserPlus, UserRound, UserRoundPen, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AppForm, Button, FormField, LoadingState, ToggleField, inputClassName } from '../../components/ui/Form'
import { FormFactTile, formCardBodyClassName } from '../../components/ui/FormLayout'
import { api, getApiErrorMessage } from '../../lib/api'
import { formatNumber } from '../../lib/datetime'
import { qeshmondiPath } from './qeshmondi-paths'

type SqlConnection = {
  configured: boolean
  host: string
  port: number
  databaseName: string
  username: string
  encrypt: boolean
  trustServerCertificate: boolean
  passwordSet: boolean
  updatedAt: string | null
}

const connectionKey = ['qeshmondi-sql-connection'] as const

type SyncCounts = {
  created: number
  updated: number
  skipped: number
}

type SyncStep = 'lookup' | 'writing' | 'roles' | 'syncing'

type SyncProgress = {
  phase: 'uploading' | 'parsing' | 'saving'
  step?: SyncStep | null
  percent: number
  processed?: number
  total?: number
}

type SyncJob = {
  phase: 'parsing' | 'saving' | 'done' | 'error'
  step: SyncStep | null
  percent: number
  processed: number
  total: number
  error: string | null
  result: SyncCounts | null
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function QeshmondiSqlTab() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: connectionKey,
    queryFn: async () => {
      const { data } = await api.get<SqlConnection>('/users/qeshmondi-sql-connection')
      return data
    },
  })
  const saved = query.data
  const [host, setHost] = useState('')
  const [port, setPort] = useState('1433')
  const [databaseName, setDatabaseName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [encrypt, setEncrypt] = useState(true)
  const [trustServerCertificate, setTrustServerCertificate] = useState(true)
  const [hydrated, setHydrated] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [progress, setProgress] = useState<SyncProgress | null>(null)
  const [result, setResult] = useState<SyncCounts | null>(null)

  useEffect(() => {
    if (!saved || hydrated) return
    setHost(saved.host)
    setPort(String(saved.port || 1433))
    setDatabaseName(saved.databaseName)
    setUsername(saved.username)
    setEncrypt(saved.encrypt)
    setTrustServerCertificate(saved.trustServerCertificate)
    setHydrated(true)
  }, [saved, hydrated])

  const busy = saving || testing || syncing
  const configured = Boolean(saved?.configured)

  async function save() {
    if (!saved?.passwordSet && !password.trim()) {
      toast.error(t('qeshmondiUpdate.passwordRequired'))
      return
    }
    setSaving(true)
    try {
      const { data } = await api.put<SqlConnection>('/users/qeshmondi-sql-connection', {
        host: host.trim(),
        port: Number(port),
        databaseName: databaseName.trim(),
        username: username.trim(),
        ...(password.trim() ? { password: password.trim() } : {}),
        encrypt,
        trustServerCertificate,
      })
      queryClient.setQueryData(connectionKey, data)
      setPassword('')
      toast.success(t('qeshmondiUpdate.connectionSaved'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('qeshmondiUpdate.connectionSaveFailed')))
    } finally {
      setSaving(false)
    }
  }

  async function testConnection() {
    setTesting(true)
    try {
      await api.post('/users/qeshmondi-sql-connection/test')
      toast.success(t('qeshmondiUpdate.testOk'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('qeshmondiUpdate.testFailed')))
    } finally {
      setTesting(false)
    }
  }

  async function runSync() {
    setSyncing(true)
    setResult(null)
    setProgress({ phase: 'saving', step: 'syncing', percent: 1, processed: 0, total: 0 })
    try {
      const started = Date.now()
      const { data } = await api.post<{ jobId: string }>('/users/qeshmondi-sync')
      let outcome: SyncCounts | null = null
      for (;;) {
        if (Date.now() - started > 60 * 60 * 1000) {
          throw new Error(t('qeshmondiUpdate.importFailed'))
        }
        await wait(400)
        const { data: job } = await api.get<SyncJob>(`/users/qeshmondi-imports/${data.jobId}`)
        if (job.phase === 'error') {
          throw new Error(job.error || t('qeshmondiUpdate.importFailed'))
        }
        setProgress({
          phase: job.phase === 'parsing' ? 'parsing' : 'saving',
          step: job.step,
          percent: job.percent,
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
      setSyncing(false)
      setProgress(null)
    }
  }

  if (query.isError) {
    return (
      <p className={`${formCardBodyClassName} text-sm text-red-700`}>{t('common.error')}</p>
    )
  }

  if (query.isLoading || !saved) {
    return (
      <div className={formCardBodyClassName}>
        <LoadingState variant="inline" />
      </div>
    )
  }

  return (
    <AppForm onSubmit={save} className={formCardBodyClassName}>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField icon={Server} label={t('qeshmondiUpdate.host')} htmlFor="qeshmondi-sql-host">
          <input
            id="qeshmondi-sql-host"
            className={inputClassName()}
            dir="ltr"
            value={host}
            required
            autoComplete="off"
            onChange={(event) => setHost(event.target.value)}
          />
        </FormField>
        <FormField icon={Hash} label={t('qeshmondiUpdate.port')} htmlFor="qeshmondi-sql-port">
          <input
            id="qeshmondi-sql-port"
            className={inputClassName()}
            dir="ltr"
            type="number"
            min={1}
            max={65535}
            value={port}
            required
            onChange={(event) => setPort(event.target.value)}
          />
        </FormField>
        <FormField icon={Database} label={t('qeshmondiUpdate.databaseName')} htmlFor="qeshmondi-sql-db">
          <input
            id="qeshmondi-sql-db"
            className={inputClassName()}
            dir="ltr"
            value={databaseName}
            required
            autoComplete="off"
            onChange={(event) => setDatabaseName(event.target.value)}
          />
        </FormField>
        <FormField icon={UserRound} label={t('qeshmondiUpdate.username')} htmlFor="qeshmondi-sql-user">
          <input
            id="qeshmondi-sql-user"
            className={inputClassName()}
            dir="ltr"
            value={username}
            required
            autoComplete="off"
            onChange={(event) => setUsername(event.target.value)}
          />
        </FormField>
      </div>
      <FormField icon={KeyRound} label={t('qeshmondiUpdate.password')} htmlFor="qeshmondi-sql-password">
        <input
          id="qeshmondi-sql-password"
          className={inputClassName()}
          dir="ltr"
          type="password"
          value={password}
          required={!saved.passwordSet}
          autoComplete="new-password"
          placeholder={saved.passwordSet ? t('qeshmondiUpdate.passwordKept') : undefined}
          onChange={(event) => setPassword(event.target.value)}
        />
        {saved.passwordSet ? (
          <p className="text-xs leading-6 text-ink-500">{t('qeshmondiUpdate.passwordKept')}</p>
        ) : null}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField icon={ShieldCheck} label={t('qeshmondiUpdate.encrypt')} htmlFor="qeshmondi-sql-encrypt">
          <ToggleField
            id="qeshmondi-sql-encrypt"
            checked={encrypt}
            onChange={setEncrypt}
            onLabel={t('qeshmondiUpdate.on')}
            offLabel={t('qeshmondiUpdate.off')}
          />
        </FormField>
        <FormField icon={BadgeCheck} label={t('qeshmondiUpdate.trustServerCertificate')} htmlFor="qeshmondi-sql-trust">
          <ToggleField
            id="qeshmondi-sql-trust"
            checked={trustServerCertificate}
            onChange={setTrustServerCertificate}
            onLabel={t('qeshmondiUpdate.on')}
            offLabel={t('qeshmondiUpdate.off')}
          />
        </FormField>
      </div>
      <p className="text-xs leading-6 text-ink-500">{t('qeshmondiUpdate.savedConnectionHint')}</p>
      {progress ? <SqlSyncProgress progress={progress} locale={locale} /> : null}
      {result ? (
        <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
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
            icon={Database}
            label={t('qeshmondiUpdate.skipped')}
            value={formatNumber(result.skipped, locale)}
            tone="ink"
          />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={busy}>
            <Check className="size-4" aria-hidden />
            {t('qeshmondiUpdate.saveConnection')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => navigate(qeshmondiPath())}
          >
            <X className="size-4" aria-hidden />
            {t('users.cancel')}
          </Button>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="soft" disabled={busy || !configured} onClick={() => void testConnection()}>
            <PlugZap className="size-4" aria-hidden />
            {t('qeshmondiUpdate.testConnection')}
          </Button>
          <Button type="button" variant="soft" disabled={busy || !configured} onClick={() => void runSync()}>
            <RefreshCw className="size-4" aria-hidden />
            {t('qeshmondiUpdate.runSync')}
          </Button>
        </div>
      </div>
    </AppForm>
  )
}

function SqlSyncProgress({
  progress,
  locale,
}: {
  progress: SyncProgress
  locale: string
}) {
  const { t } = useTranslation()
  const percent = Math.max(0, Math.min(100, Math.round(progress.percent)))
  const total = progress.total ?? 0
  const processed = progress.processed ?? 0
  const remaining = Math.max(0, total - processed)
  const counted =
    progress.step && total > 0
      ? t(`qeshmondiUpdate.progress.${progress.step}`, {
          processed: formatNumber(processed, locale),
          total: formatNumber(total, locale),
          remaining: formatNumber(remaining, locale),
        })
      : t('qeshmondiUpdate.progress.saving')

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
