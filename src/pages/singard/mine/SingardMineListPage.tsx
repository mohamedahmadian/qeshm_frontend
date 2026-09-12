import { Inbox } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { DateText } from '../../../components/ui/DateText'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../../components/ui/ListControls'
import { PageHeader, listShellClassName } from '../../../components/ui/Form'
import { useListParams } from '../../../hooks/useListParams'
import { useListSort } from '../../../hooks/useListSort'
import { api } from '../../../lib/api'
import type { Paginated, SingardFeedback } from '../../../types/app'
import { SingardKindBadge, SingardStatusBadge } from '../SingardBadges'
import { singardMinePath } from '../singard-paths'

export function SingardMineListPage() {
  const { t } = useTranslation()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const query = useQuery({
    queryKey: ['singard', 'mine', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<SingardFeedback>>('/singard/mine', {
        params: { q: q || undefined, page, ...sortParams },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []

  return (
    <div className={listShellClassName}>
      <PageHeader icon={Inbox} title={t('menus.singardMine')} subtitle={t('singardMine.subtitle')} />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('singard.search')}
        placeholder={t('singard.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('singardMine.noResults') : t('singardMine.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="trackingCode" label={t('singard.trackingCode')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="kind" label={t('singard.kind')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="category" label={t('singard.category')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="status" label={t('singard.status')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="createdAt" label={t('singard.createdAt')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3 font-mono" dir="ltr">
                  {item.trackingCode}
                </td>
                <td className="px-4 py-3">
                  <SingardKindBadge kind={item.kind} />
                </td>
                <td className="px-4 py-3">{item.category.name}</td>
                <td className="px-4 py-3">
                  <SingardStatusBadge status={item.status} />
                </td>
                <td className="px-4 py-3">
                  <DateText value={item.createdAt} withTime />
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions viewTo={singardMinePath(item.id)} />
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
