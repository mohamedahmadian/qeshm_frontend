import { History } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../components/ui/ListControls'
import { PageHeader, listShellClassName } from '../../components/ui/Form'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { DateText } from '../../components/ui/DateText'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import { formatNumber } from '../../lib/datetime'
import type { Paginated } from '../../types/app'
import { qeshmondiSyncLogPath } from './qeshmondi-paths'

const sources = ['FILE', 'DATABASE'] as const
const statuses = ['RUNNING', 'DONE', 'FAILED'] as const

type SyncLog = {
  id: string
  source: (typeof sources)[number]
  status: (typeof statuses)[number]
  startedAt: string
  finishedAt: string | null
  createdCount: number
  updatedCount: number
  failedCount: number
  errorMessage: string | null
  actor: { id: string; fullName: string } | null
}

export function QeshmondiSyncLogListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const source = searchParams.get('source') ?? ''
  const status = searchParams.get('status') ?? ''

  const query = useQuery({
    queryKey: ['qeshmondi-sync-logs', q, page, source, status, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<SyncLog>>('/users/qeshmondi-sync-logs', {
        params: {
          page,
          ...(q ? { q } : {}),
          ...(source ? { source } : {}),
          ...(status ? { status } : {}),
          ...sortParams,
        },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []
  const filtersActive = Boolean(source || status)

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={History}
        title={t('qeshmondiSyncLogs.title')}
        subtitle={t('qeshmondiSyncLogs.subtitle')}
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('qeshmondiSyncLogs.search')}
        placeholder={t('qeshmondiSyncLogs.searchPlaceholder')}
        filtersActive={filtersActive}
        extra={
          <>
            <SearchSelect
              value={source}
              onChange={(next) => setParams({ source: next || undefined }, { resetPage: true })}
              placeholder={t('qeshmondiSyncLogs.source')}
              options={[
                { value: '', label: t('common.all') },
                ...sources.map((item) => ({
                  value: item,
                  label: t(`qeshmondiSyncLogs.sources.${item}`),
                })),
              ]}
            />
            <SearchSelect
              value={status}
              onChange={(next) => setParams({ status: next || undefined }, { resetPage: true })}
              placeholder={t('qeshmondiSyncLogs.status')}
              options={[
                { value: '', label: t('common.all') },
                ...statuses.map((item) => ({
                  value: item,
                  label: t(`qeshmondiSyncLogs.statuses.${item}`),
                })),
              ]}
            />
          </>
        }
      />
      <TableCard
        loading={query.isLoading}
        empty={q || filtersActive ? t('qeshmondiSyncLogs.noResults') : t('qeshmondiSyncLogs.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="startedAt"
                label={t('qeshmondiSyncLogs.startedAt')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="source"
                label={t('qeshmondiSyncLogs.source')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="createdCount"
                label={t('qeshmondiSyncLogs.created')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="updatedCount"
                label={t('qeshmondiSyncLogs.updated')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="failedCount"
                label={t('qeshmondiSyncLogs.failed')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="status"
                label={t('qeshmondiSyncLogs.status')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="actor"
                label={t('qeshmondiSyncLogs.actor')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <DateText value={item.startedAt} withTime />
                </td>
                <td className="px-4 py-3">{t(`qeshmondiSyncLogs.sources.${item.source}`)}</td>
                <td className="px-4 py-3">{formatNumber(item.createdCount, locale)}</td>
                <td className="px-4 py-3">{formatNumber(item.updatedCount, locale)}</td>
                <td className="px-4 py-3">{formatNumber(item.failedCount, locale)}</td>
                <td className="px-4 py-3">{t(`qeshmondiSyncLogs.statuses.${item.status}`)}</td>
                <td className="px-4 py-3">{item.actor?.fullName || '—'}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions viewTo={qeshmondiSyncLogPath(item.id)} rowOpensView />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
      {query.data ? (
        <PaginationBar
          page={query.data.page}
          pageSize={query.data.pageSize}
          total={query.data.total}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  )
}
