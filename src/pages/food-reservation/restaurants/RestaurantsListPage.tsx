import { CookingPot, Plus, Store } from 'lucide-react'
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
import { formatNumber, localizeDigits } from '../../../lib/datetime'
import type { Paginated, Restaurant } from '../../../types/app'
import { EntityThumb } from '../EntityThumb'
import { restaurantMenuPath, restaurantPath, restaurantsPath } from '../food-paths'

export function RestaurantsListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['restaurants', 'list', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Restaurant>>('/restaurants', {
        params: { q: q || undefined, page, ...sortParams },
      })
      return data
    },
  })

  const rows = query.data?.items ?? []

  return (
    <div className={listShellClassName}>
      <PageHeader
        title={t('menus.restaurantManagement')}
        subtitle={t('restaurants.subtitle')}
        action={
          <Link to={`${restaurantsPath()}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('restaurants.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('restaurants.search')}
        placeholder={t('restaurants.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('restaurants.noResults') : t('restaurants.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="name" label={t('restaurants.name')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="phone" label={t('restaurants.phone')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh
                column="address"
                label={t('restaurants.address')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="menuItemCount"
                label={t('restaurants.menuItemCount')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((restaurant) => (
              <tr key={restaurant.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <EntityThumb imageId={restaurant.logoId} icon={Store} label={restaurant.name} />
                    <span>{restaurant.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {restaurant.phone ? localizeDigits(restaurant.phone, locale) : '—'}
                </td>
                <td className="px-4 py-3">{restaurant.address || '—'}</td>
                <td className="px-4 py-3">
                  {formatNumber(restaurant._count?.menuItems ?? 0, locale)}
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={restaurantPath(restaurant.id)}
                    editTo={`${restaurantPath(restaurant.id)}/edit`}
                    extra={
                      <Link to={restaurantMenuPath(restaurant.id)}>
                        <Button type="button" variant="soft">
                          <CookingPot className="size-4" aria-hidden />
                          {t('restaurants.menu')}
                        </Button>
                      </Link>
                    }
                    onDelete={() =>
                      confirmDelete({
                        message: t('restaurants.confirmDelete'),
                        successMessage: t('restaurants.deleted'),
                        path: `/restaurants/${restaurant.id}`,
                        queryKey: ['restaurants'],
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
