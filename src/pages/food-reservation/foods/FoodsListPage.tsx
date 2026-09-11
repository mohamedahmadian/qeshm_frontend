import { Plus, UtensilsCrossed } from 'lucide-react'
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
import type { Food, Paginated } from '../../../types/app'
import { EntityThumb } from '../EntityThumb'
import { foodPath, foodsPath } from '../food-paths'

export function FoodsListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['foods', 'list', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Food>>('/foods', {
        params: { q: q || undefined, page, ...sortParams },
      })
      return data
    },
  })

  const rows = query.data?.items ?? []

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={UtensilsCrossed}
        title={t('menus.foodManagement')}
        subtitle={t('foods.subtitle')}
        action={
          <Link to={`${foodsPath()}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('foods.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('foods.search')}
        placeholder={t('foods.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('foods.noResults') : t('foods.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="name" label={t('foods.name')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh
                column="description"
                label={t('foods.description')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="menuItemCount"
                label={t('foods.menuItemCount')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((food) => (
              <tr key={food.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <EntityThumb imageId={food.photoId} icon={UtensilsCrossed} label={food.name} />
                    <span>{food.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">{food.description || '—'}</td>
                <td className="px-4 py-3">{formatNumber(food._count?.menuItems ?? 0, locale)}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={foodPath(food.id)}
                    editTo={`${foodPath(food.id)}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('foods.confirmDelete'),
                        successMessage: t('foods.deleted'),
                        path: `/foods/${food.id}`,
                        queryKey: ['foods'],
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
