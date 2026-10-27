import { MessageSquare, Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../../components/ui/ListControls'
import { Button, PageHeader, listShellClassName } from '../../../components/ui/Form'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { useListParams } from '../../../hooks/useListParams'
import { useListSort } from '../../../hooks/useListSort'
import { api } from '../../../lib/api'
import { formatNumber } from '../../../lib/datetime'
import { getNavIcon } from '../../../lib/icons'
import type { Paginated, InspectionKind } from '../../../types/app'
import { inspectionKindsPath } from '../inspection-paths'

export function InspectionKindsListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['inspection', 'kinds', 'list', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<InspectionKind>>('/inspection/kinds', {
        params: { q: q || undefined, page, ...sortParams },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={MessageSquare}
        title={t('menus.inspectionKinds')}
        subtitle={t('inspectionKinds.subtitle')}
        action={
          <Link to={`${inspectionKindsPath()}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('inspectionKinds.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('inspectionKinds.search')}
        placeholder={t('inspectionKinds.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('inspectionKinds.noResults') : t('inspectionKinds.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="title" label={t('inspectionKinds.titleField')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="sortOrder" label={t('inspectionKinds.sortOrder')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="isActive" label={t('inspectionKinds.visibility')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh
                column="feedbackCount"
                label={t('inspectionKinds.feedbackCount')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const Icon = getNavIcon(item.icon)
              return (
                <tr key={item.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium text-ink-800">{item.title}</div>
                        {item.description ? (
                          <div className="mt-0.5 line-clamp-2 text-xs text-ink-500">{item.description}</div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{formatNumber(item.sortOrder, locale)}</td>
                  <td className="px-4 py-3">{item.isActive ? t('inspectionKinds.visible') : t('inspectionKinds.hidden')}</td>
                  <td className="px-4 py-3">{formatNumber(item._count.feedbacks, locale)}</td>
                  <td className={actionsColClassName}>
                    <EntityRowActions
                      viewTo={inspectionKindsPath(item.id)}
                      editTo={`${inspectionKindsPath(item.id)}/edit`}
                      onDelete={() =>
                        confirmDelete({
                          message: t('inspectionKinds.confirmDelete'),
                          successMessage: t('inspectionKinds.deleted'),
                          path: `/inspection/kinds/${item.id}`,
                          queryKey: ['inspection', 'kinds'],
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
