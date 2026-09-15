import { FileCheck } from 'lucide-react'
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
import { PageHeader, listShellClassName } from '../../components/ui/Form'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import type { BoardMinutesResolution, Paginated } from '../../types/app'
import { boardMinuteResolutionPath } from './board-paths'

function relatedRequestId(item: BoardMinutesResolution) {
  return item.minutes?.requestId || item.minutes?.request?.id || undefined
}

export function BoardResolutionsListPage() {
  const { t } = useTranslation()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['board-resolutions', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<BoardMinutesResolution>>('/board/resolutions', {
        params: { page, ...(q ? { q } : {}), ...sortParams },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []
  return (
    <div className={`${listShellClassName} space-y-5`}>
      <PageHeader
        icon={FileCheck}
        title={t('menus.boardResolutions')}
        subtitle={t('boardResolutions.listSubtitle')}
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('boardResolutions.search')}
        placeholder={t('boardResolutions.searchAllPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('boardResolutions.noResults') : t('boardResolutions.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="title"
                label={t('boardResolutions.titleField')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="unit"
                label={t('boardResolutions.unit')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="dueDate"
                label={t('boardResolutions.dueDate')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="minutes"
                label={t('boardResolutions.minutes')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="request"
                label={t('boardMinutes.request')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const requestId = relatedRequestId(item)
              const base = boardMinuteResolutionPath(item.minutesId, item.id, requestId)
              return (
                <tr key={item.id} className="border-t border-line">
                  <td className="px-4 py-3">{item.title}</td>
                  <td className="px-4 py-3">{item.unit.name}</td>
                  <td className="px-4 py-3">{item.dueDate ? <DateText value={item.dueDate} /> : '—'}</td>
                  <td className="px-4 py-3">{item.minutes?.subject || '—'}</td>
                  <td className="px-4 py-3">{item.minutes?.request?.subject || t('boardResolutions.noRequest')}</td>
                  <td className={actionsColClassName}>
                    <EntityRowActions
                      viewTo={base}
                      editTo={`${base}/edit`}
                      onDelete={() =>
                        confirmDelete({
                          message: t('boardResolutions.confirmDelete'),
                          successMessage: t('boardResolutions.deleted'),
                          path: `/board/minutes/${item.minutesId}/resolutions/${item.id}`,
                          queryKey: ['board-resolutions'],
                        })
                      }
                    />
                  </td>
                </tr>
              )
            })}
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
