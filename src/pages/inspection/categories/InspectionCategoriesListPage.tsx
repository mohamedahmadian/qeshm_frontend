import { FolderTree, Plus } from 'lucide-react'
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
import type { Paginated, InspectionCategory } from '../../../types/app'
import { inspectionCategoriesPath } from '../inspection-paths'

export function InspectionCategoriesListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['inspection', 'categories', 'list', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<InspectionCategory>>('/inspection/categories', {
        params: { q: q || undefined, page, ...sortParams },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={FolderTree}
        title={t('menus.inspectionCategories')}
        subtitle={t('inspectionCategories.subtitle')}
        action={
          <Link to={`${inspectionCategoriesPath()}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('inspectionCategories.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('inspectionCategories.search')}
        placeholder={t('inspectionCategories.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('inspectionCategories.noResults') : t('inspectionCategories.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="name" label={t('inspectionCategories.name')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="parent" label={t('inspectionCategories.parent')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="childCount" label={t('inspectionCategories.childCount')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh
                column="feedbackCount"
                label={t('inspectionCategories.feedbackCount')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh column="isActive" label={t('geo.isActive')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">{item.path || item.name}</td>
                <td className="px-4 py-3">{item.parent?.name || t('inspectionCategories.noParent')}</td>
                <td className="px-4 py-3">{formatNumber(item._count.children, locale)}</td>
                <td className="px-4 py-3">{formatNumber(item._count.feedbacks, locale)}</td>
                <td className="px-4 py-3">{item.isActive ? t('geo.active') : t('geo.inactive')}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={inspectionCategoriesPath(item.id)}
                    editTo={`${inspectionCategoriesPath(item.id)}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('inspectionCategories.confirmDelete'),
                        successMessage: t('inspectionCategories.deleted'),
                        path: `/inspection/categories/${item.id}`,
                        queryKey: ['inspection', 'categories'],
                      })
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
