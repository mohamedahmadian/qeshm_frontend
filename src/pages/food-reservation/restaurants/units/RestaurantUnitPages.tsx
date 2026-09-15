import { Building2, Plus, Store } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../../../components/ui/ListControls'
import {
  Button,
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  formShellClassName,
  listShellClassName,
} from '../../../../components/ui/Form'
import { useConfirmDelete } from '../../../../hooks/useConfirmDelete'
import { useListParams } from '../../../../hooks/useListParams'
import { useListSort } from '../../../../hooks/useListSort'
import { api } from '../../../../lib/api'
import { localizeDigits } from '../../../../lib/datetime'
import type { OrganizationUnit, Paginated, Restaurant, RestaurantUnit } from '../../../../types/app'
import { restaurantUnitPath, restaurantUnitsPath } from '../../food-paths'
import { RestaurantUnitCreateForm, RestaurantUnitEditForm } from './RestaurantUnitForm'

function useRestaurant() {
  const { id: restaurantId } = useParams()
  const query = useQuery({
    queryKey: ['restaurant', restaurantId],
    enabled: Boolean(restaurantId),
    queryFn: async () => {
      const { data } = await api.get<Restaurant>(`/restaurants/${restaurantId}`)
      return data
    },
  })
  return { restaurantId, restaurant: query.data }
}

function useUnits() {
  return useQuery({
    queryKey: ['organization-units', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnit[]>('/organization/units')
      return data
    },
  })
}

function useTakenUnitIds(restaurantId?: string, currentId?: string) {
  return useQuery({
    queryKey: ['restaurant-units', restaurantId, 'all', currentId],
    enabled: Boolean(restaurantId),
    queryFn: async () => {
      const { data } = await api.get<RestaurantUnit[]>(`/restaurants/${restaurantId}/units`)
      return data.filter((item) => item.id !== currentId).map((item) => item.unitId)
    },
  })
}

export function RestaurantUnitListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { restaurantId, restaurant } = useRestaurant()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['restaurant-units', restaurantId, q, page, sortBy, sortDir],
    enabled: Boolean(restaurantId),
    queryFn: async () => {
      const { data } = await api.get<Paginated<RestaurantUnit>>(`/restaurants/${restaurantId}/units`, {
        params: { page, ...(q ? { q } : {}), ...sortParams },
      })
      return data
    },
  })
  if (!restaurant || !restaurantId) {
    return <LoadingState />
  }
  const rows = query.data?.items ?? []
  const base = restaurantUnitsPath(restaurantId)

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={Building2}
        title={t('restaurantUnits.title')}
        subtitle={<EntityNameSubtitle name={restaurant.name} icon={Store} />}
        action={
          <Link to={`${base}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('restaurantUnits.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('restaurantUnits.search')}
        placeholder={t('restaurantUnits.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('restaurantUnits.noResults') : t('restaurantUnits.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="unit"
                label={t('restaurantUnits.unit')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="kind"
                label={t('organizationUnits.kind')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="phone"
                label={t('organizationUnits.phone')}
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
                <td className="px-4 py-3">{item.unit.name}</td>
                <td className="px-4 py-3">{item.unit.kind.name}</td>
                <td className="px-4 py-3">
                  {item.unit.phone ? (
                    <span className="digit-field" dir="ltr">
                      {localizeDigits(item.unit.phone, locale)}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={restaurantUnitPath(restaurantId, item.id)}
                    showView={false}
                    editTo={`${restaurantUnitPath(restaurantId, item.id)}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('restaurantUnits.confirmDelete'),
                        successMessage: t('restaurantUnits.deleted'),
                        path: `/restaurants/${restaurantId}/units/${item.id}`,
                        queryKey: ['restaurant-units'],
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

export function RestaurantUnitCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { restaurantId, restaurant } = useRestaurant()
  const units = useUnits()
  const taken = useTakenUnitIds(restaurantId)
  if (!restaurant || !restaurantId || !units.data || !taken.data) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Building2}
        title={t('restaurantUnits.create')}
        subtitle={<EntityNameSubtitle name={restaurant.name} icon={Store} />}
      />
      <RestaurantUnitCreateForm
        units={units.data}
        takenIds={taken.data}
        onSubmit={async (unitIds) => {
          await api.post(`/restaurants/${restaurantId}/units`, { unitIds })
          await queryClient.invalidateQueries({ queryKey: ['restaurants'] })
          await queryClient.invalidateQueries({ queryKey: ['restaurant'] })
          await queryClient.invalidateQueries({ queryKey: ['restaurant-units'] })
          await queryClient.invalidateQueries({ queryKey: ['organization-unit-restaurants'] })
          toast.success(t('restaurantUnits.created'))
          navigate(restaurantUnitsPath(restaurantId))
        }}
      />
    </div>
  )
}

export function RestaurantUnitEditPage() {
  const { t } = useTranslation()
  const { linkId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { restaurantId, restaurant } = useRestaurant()
  const units = useUnits()
  const taken = useTakenUnitIds(restaurantId, linkId)
  const query = useQuery({
    queryKey: ['restaurant-unit', restaurantId, linkId],
    enabled: Boolean(restaurantId && linkId),
    queryFn: async () => {
      const { data } = await api.get<RestaurantUnit>(`/restaurants/${restaurantId}/units/${linkId}`)
      return data
    },
  })
  if (!restaurant || !restaurantId || !linkId || !query.data || !units.data || !taken.data) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Building2}
        title={t('restaurantUnits.edit')}
        subtitle={<EntityNameSubtitle name={query.data.unit.name} icon={Building2} />}
      />
      <RestaurantUnitEditForm
        units={units.data}
        takenIds={taken.data}
        initial={query.data}
        onSubmit={async (unitId) => {
          await api.patch(`/restaurants/${restaurantId}/units/${linkId}`, { unitId })
          await queryClient.invalidateQueries({ queryKey: ['restaurants'] })
          await queryClient.invalidateQueries({ queryKey: ['restaurant'] })
          await queryClient.invalidateQueries({ queryKey: ['restaurant-units'] })
          await queryClient.invalidateQueries({ queryKey: ['organization-unit-restaurants'] })
          toast.success(t('restaurantUnits.updated'))
          navigate(restaurantUnitsPath(restaurantId))
        }}
      />
    </div>
  )
}
