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
import type { Paginated, SingardCategory } from '../../../types/app'
import { singardCategoriesPath } from '../singard-paths'

export function SingardCategoriesListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['singard', 'categories', 'list', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<SingardCategory>>('/singard/categories', {
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
        title={t('menus.singardCategories')}
        subtitle={t('singardCategories.subtitle')}
        action={
          <Link to={`${singardCategoriesPath()}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('singardCategories.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('singardCategories.search')}
        placeholder={t('singardCategories.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('singardCategories.noResults') : t('singardCategories.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="name" label={t('singardCategories.name')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="parent" label={t('singardCategories.parent')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="childCount" label={t('singardCategories.childCount')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh
                column="feedbackCount"
                label={t('singardCategories.feedbackCount')}
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
                <td className="px-4 py-3">{item.parent?.name || t('singardCategories.noParent')}</td>
                <td className="px-4 py-3">{formatNumber(item._count.children, locale)}</td>
                <td className="px-4 py-3">{formatNumber(item._count.feedbacks, locale)}</td>
                <td className="px-4 py-3">{item.isActive ? t('geo.active') : t('geo.inactive')}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={singardCategoriesPath(item.id)}
                    editTo={`${singardCategoriesPath(item.id)}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('singardCategories.confirmDelete'),
                        successMessage: t('singardCategories.deleted'),
                        path: `/singard/categories/${item.id}`,
                        queryKey: ['singard', 'categories'],
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
