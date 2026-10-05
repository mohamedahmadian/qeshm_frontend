import { AlertCircle, Clock3, History, RefreshCw, UserRound, UserRoundPen, UserPlus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { EntityNameSubtitle, LoadingState, PageHeader, formShellClassName } from '../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../components/ui/FormLayout'
import { DateText } from '../../components/ui/DateText'
import { api } from '../../lib/api'
import { formatDateTime, formatNumber } from '../../lib/datetime'

type SyncLog = {
  id: string
  source: 'FILE' | 'DATABASE'
  status: 'RUNNING' | 'DONE' | 'FAILED'
  startedAt: string
  finishedAt: string | null
  createdCount: number
  updatedCount: number
  failedCount: number
  errorMessage: string | null
  actor: { id: string; fullName: string } | null
}

export function QeshmondiSyncLogDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const query = useQuery({
    queryKey: ['qeshmondi-sync-log', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<SyncLog>(`/users/qeshmondi-sync-logs/${id}`)
      return data
    },
  })

  const log = query.data
  if (!log) {
    return <LoadingState />
  }

  const when = formatDateTime(log.startedAt, locale)

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={History}
        title={t('qeshmondiSyncLogs.details')}
        subtitle={<EntityNameSubtitle name={when} icon={History} />}
      />
      <FormCard icon={History} title={when}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Clock3}>{t('qeshmondiSyncLogs.details')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={Clock3}
              label={t('qeshmondiSyncLogs.startedAt')}
              value={<DateText value={log.startedAt} withTime />}
              tone="teal"
            />
            <FormFactTile
              icon={Clock3}
              label={t('qeshmondiSyncLogs.finishedAt')}
              value={log.finishedAt ? <DateText value={log.finishedAt} withTime /> : '—'}
              empty={!log.finishedAt}
              tone="mint"
            />
            <FormFactTile
              icon={RefreshCw}
              label={t('qeshmondiSyncLogs.source')}
              value={t(`qeshmondiSyncLogs.sources.${log.source}`)}
              tone="teal"
            />
            <FormFactTile
              icon={History}
              label={t('qeshmondiSyncLogs.status')}
              value={t(`qeshmondiSyncLogs.statuses.${log.status}`)}
              tone="ink"
            />
            <FormFactTile
              icon={UserPlus}
              label={t('qeshmondiSyncLogs.created')}
              value={formatNumber(log.createdCount, locale)}
              tone="teal"
            />
            <FormFactTile
              icon={UserRoundPen}
              label={t('qeshmondiSyncLogs.updated')}
              value={formatNumber(log.updatedCount, locale)}
              tone="mint"
            />
            <FormFactTile
              icon={AlertCircle}
              label={t('qeshmondiSyncLogs.failed')}
              value={formatNumber(log.failedCount, locale)}
              tone="ink"
            />
            <FormFactTile
              icon={UserRound}
              label={t('qeshmondiSyncLogs.actor')}
              value={log.actor?.fullName || '—'}
              empty={!log.actor}
              tone="ink"
            />
            <FormFactTile
              icon={AlertCircle}
              label={t('qeshmondiSyncLogs.error')}
              value={log.errorMessage || '—'}
              empty={!log.errorMessage}
              tone="ink"
              className="sm:col-span-2"
            />
          </div>
        </div>
      </FormCard>
    </div>
  )
}
