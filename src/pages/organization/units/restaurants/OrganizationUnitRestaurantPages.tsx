import { ImagePlus, MapPin, Phone, Plus, Store, Type } from 'lucide-react'
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
  DetailActions,
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  formShellClassName,
  listShellClassName,
} from '../../../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../../../components/ui/FormLayout'
import { useConfirmDelete } from '../../../../hooks/useConfirmDelete'
import { useListParams } from '../../../../hooks/useListParams'
import { useListSort } from '../../../../hooks/useListSort'
import { api } from '../../../../lib/api'
import { localizeDigits } from '../../../../lib/datetime'
import type {
  OrganizationUnit,
  OrganizationUnitRestaurant,
  Paginated,
  Restaurant,
} from '../../../../types/app'
import { EntityThumb, ImageFact } from '../../../food-reservation/EntityThumb'
import { organizationUnitRestaurantPath, organizationUnitRestaurantsPath } from '../../organization-paths'
import {
  OrganizationUnitRestaurantCreateForm,
  OrganizationUnitRestaurantEditForm,
} from './OrganizationUnitRestaurantForm'

function useUnit() {
  const { id: unitId } = useParams()
  const query = useQuery({
    queryKey: ['organization-unit', unitId],
    enabled: Boolean(unitId),
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnit>(`/organization/units/${unitId}`)
      return data
    },
  })
  return { unitId, unit: query.data }
}

function useRestaurants() {
  return useQuery({
    queryKey: ['restaurants', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<Restaurant[]>('/restaurants')
      return data
    },
  })
}

function useTakenRestaurantIds(unitId?: string, currentId?: string) {
  return useQuery({
    queryKey: ['organization-unit-restaurants', unitId, 'all', currentId],
    enabled: Boolean(unitId),
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnitRestaurant[]>(
        `/organization/units/${unitId}/restaurants`,
      )
      return data.filter((item) => item.id !== currentId).map((item) => item.restaurantId)
    },
  })
}

export function OrganizationUnitRestaurantListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { unitId, unit } = useUnit()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['organization-unit-restaurants', unitId, q, page, sortBy, sortDir],
    enabled: Boolean(unitId),
    queryFn: async () => {
      const { data } = await api.get<Paginated<OrganizationUnitRestaurant>>(
        `/organization/units/${unitId}/restaurants`,
        { params: { page, ...(q ? { q } : {}), ...sortParams } },
      )
      return data
    },
  })
  if (!unit || !unitId) {
    return <LoadingState />
  }
  const rows = query.data?.items ?? []
  const base = organizationUnitRestaurantsPath(unitId)

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={Store}
        title={t('organizationUnitRestaurants.title')}
        subtitle={<EntityNameSubtitle name={unit.name} icon={Store} />}
        action={
          <Link to={`${base}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('organizationUnitRestaurants.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('organizationUnitRestaurants.search')}
        placeholder={t('organizationUnitRestaurants.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('organizationUnitRestaurants.noResults') : t('organizationUnitRestaurants.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="restaurant"
                label={t('organizationUnitRestaurants.restaurant')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh column="phone" label={t('restaurants.phone')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="address" label={t('restaurants.address')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <EntityThumb imageId={item.restaurant.logoId} icon={Store} label={item.restaurant.name} />
                    <span>{item.restaurant.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {item.restaurant.phone ? (
                    <span className="digit-field" dir="ltr">
                      {localizeDigits(item.restaurant.phone, locale)}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3">{item.restaurant.address || '—'}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={organizationUnitRestaurantPath(unitId, item.id)}
                    editTo={`${organizationUnitRestaurantPath(unitId, item.id)}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('organizationUnitRestaurants.confirmDelete'),
                        successMessage: t('organizationUnitRestaurants.deleted'),
                        path: `/organization/units/${unitId}/restaurants/${item.id}`,
                        queryKey: ['organization-unit-restaurants'],
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

export function OrganizationUnitRestaurantCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { unitId, unit } = useUnit()
  const restaurants = useRestaurants()
  const taken = useTakenRestaurantIds(unitId)
  if (!unit || !unitId || !restaurants.data || !taken.data) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Store}
        title={t('organizationUnitRestaurants.create')}
        subtitle={<EntityNameSubtitle name={unit.name} icon={Store} />}
      />
      <OrganizationUnitRestaurantCreateForm
        restaurants={restaurants.data}
        takenIds={taken.data}
        onSubmit={async (restaurantIds) => {
          await api.post(`/organization/units/${unitId}/restaurants`, { restaurantIds })
          await queryClient.invalidateQueries({ queryKey: ['organization-unit'] })
          await queryClient.invalidateQueries({ queryKey: ['organization-units'] })
          await queryClient.invalidateQueries({ queryKey: ['organization-unit-restaurants'] })
          toast.success(t('organizationUnitRestaurants.created'))
          navigate(organizationUnitRestaurantsPath(unitId))
        }}
      />
    </div>
  )
}

export function OrganizationUnitRestaurantEditPage() {
  const { t } = useTranslation()
  const { linkId } = useParams()
  const navigate = useNavigate()
  const { unitId, unit } = useUnit()
  const restaurants = useRestaurants()
  const taken = useTakenRestaurantIds(unitId, linkId)
  const query = useQuery({
    queryKey: ['organization-unit-restaurant', unitId, linkId],
    enabled: Boolean(unitId && linkId),
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnitRestaurant>(
        `/organization/units/${unitId}/restaurants/${linkId}`,
      )
      return data
    },
  })
  if (!unit || !unitId || !linkId || !query.data || !restaurants.data || !taken.data) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Store}
        title={t('organizationUnitRestaurants.edit')}
        subtitle={<EntityNameSubtitle name={query.data.restaurant.name} icon={Store} />}
      />
      <OrganizationUnitRestaurantEditForm
        restaurants={restaurants.data}
        takenIds={taken.data}
        initial={query.data}
        onSubmit={async (restaurantId) => {
          await api.patch(`/organization/units/${unitId}/restaurants/${linkId}`, { restaurantId })
          toast.success(t('organizationUnitRestaurants.updated'))
          navigate(organizationUnitRestaurantsPath(unitId))
        }}
      />
    </div>
  )
}

export function OrganizationUnitRestaurantDetailPage() {
  const { t } = useTranslation()
  const { linkId } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const { unitId, unit } = useUnit()
  const query = useQuery({
    queryKey: ['organization-unit-restaurant', unitId, linkId],
    enabled: Boolean(unitId && linkId),
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnitRestaurant>(
        `/organization/units/${unitId}/restaurants/${linkId}`,
      )
      return data
    },
  })
  const item = query.data
  if (!item || !unit || !unitId || !linkId) {
    return <LoadingState />
  }
  const base = organizationUnitRestaurantsPath(unitId)
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Store}
        title={t('organizationUnitRestaurants.details')}
        subtitle={<EntityNameSubtitle name={item.restaurant.name} icon={Store} />}
      />
      <FormCard icon={Store} title={item.restaurant.name}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Store}>{t('organizationUnitRestaurants.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Type} label={t('organizationUnitRestaurants.restaurant')} value={item.restaurant.name} tone="teal" />
            <FormFactTile icon={Phone} label={t('restaurants.phone')} copyValue={item.restaurant.phone} tone="mint" />
            <FormFactTile
              icon={MapPin}
              label={t('restaurants.address')}
              value={item.restaurant.address || '—'}
              empty={!item.restaurant.address}
              className="sm:col-span-2"
            />
            <FormFactTile
              icon={ImagePlus}
              label={t('restaurants.logo')}
              value={<ImageFact imageId={item.restaurant.logoId} empty="—" />}
              empty={!item.restaurant.logoId}
              className="sm:col-span-2"
            />
          </div>
          <p className="text-xs text-ink-500">{unit.name}</p>
          <DetailActions
            editTo={`${organizationUnitRestaurantPath(unitId, linkId)}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('organizationUnitRestaurants.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('organizationUnitRestaurants.confirmDelete'),
                successMessage: t('organizationUnitRestaurants.deleted'),
                path: `/organization/units/${unitId}/restaurants/${linkId}`,
                queryKey: ['organization-unit-restaurants'],
                onDeleted: () => navigate(base),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
