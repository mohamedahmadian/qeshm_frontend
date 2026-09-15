import { FileText, Inbox, Scale, Stamp, Wallet, Gavel, Ban } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { DateText } from '../../components/ui/DateText'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../components/ui/ListControls'
import { FormField, PageHeader, listShellClassName } from '../../components/ui/Form'
import { FormFactTile } from '../../components/ui/FormLayout'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import { formatNumber } from '../../lib/datetime'
import {
  boardRequestStatuses,
  type BoardRequest,
  type BoardRequestStats,
  type Paginated,
} from '../../types/app'
import { BoardStatusBadge, boardStatusOptions } from './BoardStatusBadge'
import { boardRequestEditPath, boardRequestPath } from './board-paths'

export function BoardPlansPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const status = searchParams.get('status') ?? ''
  const filtersActive = Boolean(status)
  const stats = useQuery({
    queryKey: ['board-plans-stats'],
    queryFn: async () => {
      const { data } = await api.get<BoardRequestStats>('/board/plans/stats')
      return data
    },
  })
  const query = useQuery({
    queryKey: ['board-plans', q, page, sortBy, sortDir, status],
    queryFn: async () => {
      const { data } = await api.get<Paginated<BoardRequest>>('/board/plans', {
        params: {
          page,
          ...(q ? { q } : {}),
          ...(status ? { status } : {}),
          ...sortParams,
        },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []
  const kpiTiles = (stats.data
    ? [
        { status: '', value: stats.data.total, icon: Inbox, label: t('boardPlans.total'), tone: 'teal' as const },
        {
          status: 'PENDING_REVIEW',
          value: stats.data.pendingReview,
          icon: Stamp,
          label: t('board.statuses.PENDING_REVIEW'),
          tone: 'mint' as const,
        },
        {
          status: 'PENDING_LEGAL',
          value: stats.data.pendingLegal,
          icon: Scale,
          label: t('board.statuses.PENDING_LEGAL'),
          tone: undefined,
        },
        {
          status: 'PENDING_BUDGET',
          value: stats.data.pendingBudget,
          icon: Wallet,
          label: t('board.statuses.PENDING_BUDGET'),
          tone: 'teal' as const,
        },
        {
          status: 'PENDING_SECRETARY',
          value: stats.data.pendingSecretary,
          icon: Gavel,
          label: t('board.statuses.PENDING_SECRETARY'),
          tone: 'mint' as const,
        },
        {
          status: 'APPROVED',
          value: stats.data.approved,
          icon: FileText,
          label: t('board.statuses.APPROVED'),
          tone: undefined,
        },
        {
          status: 'REJECTED',
          value: stats.data.rejected,
          icon: Ban,
          label: t('board.statuses.REJECTED'),
          tone: undefined,
        },
      ]
    : []
  ).filter((item) => item.value !== 0)

  function setStatusFilter(value: string) {
    setParams({ status: value || undefined }, { resetPage: true })
  }

  return (
    <div className={`${listShellClassName} space-y-5`}>
      <PageHeader icon={Stamp} title={t('menus.boardPlans')} subtitle={t('boardPlans.subtitle')} />
      {kpiTiles.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 sm:gap-3">
          {kpiTiles.map((item) => (
            <button key={item.status || 'total'} type="button" onClick={() => setStatusFilter(item.status)}>
              <FormFactTile icon={item.icon} label={item.label} value={formatNumber(item.value, locale)} tone={item.tone} />
            </button>
          ))}
        </div>
      ) : null}
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('boardRequests.search')}
        placeholder={t('boardRequests.searchPlaceholder')}
        filtersActive={filtersActive}
        extra={
          <FormField icon={Stamp} label={t('boardPlans.filterStatus')}>
            <SearchSelect
              value={status}
              onChange={setStatusFilter}
              placeholder={t('common.all')}
              options={[
                { value: '', label: t('common.all') },
                ...boardStatusOptions.map((item) => ({
                  value: item,
                  label: t(`board.statuses.${item}`),
                })),
              ]}
            />
          </FormField>
        }
      />
      <TableCard
        loading={query.isLoading}
        empty={q || status ? t('boardPlans.noResults') : t('boardPlans.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="subject" label={t('boardRequests.subject')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="unit" label={t('boardRequests.unit')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="createdBy" label={t('boardRequests.createdBy')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="requestedAt" label={t('boardRequests.requestedAt')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="status" label={t('boardRequests.status')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">{item.subject}</td>
                <td className="px-4 py-3">{item.unit.name}</td>
                <td className="px-4 py-3">{item.createdBy.fullName}</td>
                <td className="px-4 py-3">{item.requestedAt ? <DateText value={item.requestedAt} /> : '—'}</td>
                <td className="px-4 py-3">
                  <BoardStatusBadge value={item.status} />
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={boardRequestPath(item.id)}
                    rowOpensView
                    editTo={
                      item.status === boardRequestStatuses.PENDING_REVIEW
                        ? boardRequestEditPath(item.id)
                        : undefined
                    }
                  />
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
