import { Ban, CalendarRange, CookingPot, Filter, ImagePlus, ScrollText, Store, ToggleRight, UtensilsCrossed, Wallet } from 'lucide-react'
import { useState } from 'react'
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
  FormField,
  LoadingState,
  PageHeader,
  formShellClassName,
  listShellClassName,
} from '../../../../components/ui/Form'
import { DateText } from '../../../../components/ui/DateText'
import { FormCard, FormFactTile, FormSectionTitle } from '../../../../components/ui/FormLayout'
import { PersianDateField } from '../../../../components/ui/PersianDateField'
import { SearchSelect } from '../../../../components/ui/SearchSelect'
import { useConfirmDelete } from '../../../../hooks/useConfirmDelete'
import { useListParams } from '../../../../hooks/useListParams'
import { useListSort } from '../../../../hooks/useListSort'
import { api } from '../../../../lib/api'
import { formatNumber } from '../../../../lib/datetime'
import type { Food, Paginated, Restaurant, RestaurantMenuItem } from '../../../../types/app'
import { GeoStatus } from '../../../geo/GeoShared'
import { EntityThumb, ImageFact } from '../../EntityThumb'
import { restaurantMenuPath } from '../../food-paths'
import { RestaurantMenuCancelForm, RestaurantMenuForm } from './RestaurantMenuForm'

const menuManageTabs = [
  { id: 'create', icon: CookingPot, labelKey: 'restaurantMenuItems.create' },
  { id: 'cancel', icon: Ban, labelKey: 'restaurantMenuItems.cancelPlan' },
] as const

type MenuManageTab = (typeof menuManageTabs)[number]['id']

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

function useFoods() {
  return useQuery({
    queryKey: ['foods', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<Food[]>('/foods')
      return data
    },
  })
}

function useMenuItems(restaurantId?: string) {
  return useQuery({
    queryKey: ['restaurant-menu', restaurantId, 'all'],
    enabled: Boolean(restaurantId),
    queryFn: async () => {
      const { data } = await api.get<RestaurantMenuItem[]>(
        `/restaurants/${restaurantId}/menu-items`,
      )
      return data
    },
  })
}

export function RestaurantMenuListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { restaurantId, restaurant } = useRestaurant()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } =
    useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const isActive = searchParams.get('isActive') ?? ''
  const offeredAt = searchParams.get('offeredAt') ?? ''
  const query = useQuery({
    queryKey: ['restaurant-menu', restaurantId, q, page, sortBy, sortDir, isActive, offeredAt],
    enabled: Boolean(restaurantId),
    queryFn: async () => {
      const { data } = await api.get<Paginated<RestaurantMenuItem>>(
        `/restaurants/${restaurantId}/menu-items`,
        {
          params: {
            page,
            ...(q ? { q } : {}),
            ...(isActive ? { isActive } : {}),
            ...(offeredAt ? { offeredAt } : {}),
            ...sortParams,
          },
        },
      )
      return data
    },
  })

  if (!restaurant || !restaurantId) {
    return <LoadingState />
  }

  const rows = query.data?.items ?? []
  const base = restaurantMenuPath(restaurantId)

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={UtensilsCrossed}
        title={t('restaurantMenuItems.title')}
        subtitle={<EntityNameSubtitle name={restaurant.name} icon={Store} />}
        action={
          <Link to={`${base}/new`}>
            <Button>
              <CookingPot className="size-4" />
              {t('restaurantMenuItems.manage')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('restaurantMenuItems.search')}
        placeholder={t('restaurantMenuItems.searchPlaceholder')}
        filtersActive={Boolean(isActive || offeredAt)}
        extra={
          <>
            <FormField icon={CalendarRange} label={t('restaurantMenuItems.date')} htmlFor="menu-date">
              <PersianDateField
                id="menu-date"
                value={offeredAt}
                onChange={(value) => setParams({ offeredAt: value || undefined }, { resetPage: true })}
              />
            </FormField>
            <FormField icon={Filter} label={t('restaurantMenuItems.isActive')} htmlFor="menu-status">
              <SearchSelect
                id="menu-status"
                value={isActive}
                placeholder={t('restaurantMenuItems.allStatuses')}
                onChange={(next) => setParams({ isActive: next || undefined }, { resetPage: true })}
                options={[
                  { value: '', label: t('restaurantMenuItems.allStatuses') },
                  { value: 'true', label: t('geo.active') },
                  { value: 'false', label: t('geo.inactive') },
                ]}
              />
            </FormField>
          </>
        }
      />
      <TableCard
        loading={query.isLoading}
        empty={q || isActive || offeredAt ? t('restaurantMenuItems.noResults') : t('restaurantMenuItems.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="offeredAt"
                label={t('restaurantMenuItems.date')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="food"
                label={t('restaurantMenuItems.food')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="price"
                label={t('restaurantMenuItems.price')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="isActive"
                label={t('restaurantMenuItems.isActive')}
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
                <td className="px-4 py-3">
                  <DateText value={item.offeredAt} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <EntityThumb imageId={item.food.photoId} icon={UtensilsCrossed} label={item.food.name} />
                    <span>{item.food.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {`${formatNumber(item.price, locale)} ${t('restaurantMenuItems.toman')}`}
                </td>
                <td className="px-4 py-3">
                  <GeoStatus active={item.isActive} />
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={`${base}/${item.id}`}
                    editTo={`${base}/${item.id}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('restaurantMenuItems.confirmDelete'),
                        successMessage: t('restaurantMenuItems.deleted'),
                        path: `/restaurants/${restaurantId}/menu-items/${item.id}`,
                        queryKey: ['restaurant-menu'],
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

export function RestaurantMenuCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { restaurantId, restaurant } = useRestaurant()
  const foods = useFoods()
  const menuItems = useMenuItems(restaurantId)
  const [tab, setTab] = useState<MenuManageTab>('create')
  if (!restaurant || !restaurantId || !foods.data || !menuItems.data) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={UtensilsCrossed}
        title={t('restaurantMenuItems.manage')}
        subtitle={<EntityNameSubtitle name={restaurant.name} icon={Store} />}
      />
      <FormCard
        icon={CookingPot}
        title={t('restaurantMenuItems.manage')}
        subtitle={t('restaurantMenuItems.manageSubtitle')}
      >
        <nav className="flex flex-wrap gap-2 border-b border-line bg-cream-50/60 px-4 py-3 sm:px-5">
          {menuManageTabs.map((itemTab) => {
            const Icon = itemTab.icon
            const active = tab === itemTab.id
            return (
              <button
                key={itemTab.id}
                type="button"
                onClick={() => setTab(itemTab.id)}
                className={`inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]'
                    : 'bg-white text-ink-700 ring-1 ring-line hover:bg-cream-50'
                }`}
              >
                <Icon className={`size-3.5 ${active ? 'text-white' : 'text-teal-600'}`} aria-hidden />
                {t(itemTab.labelKey)}
              </button>
            )
          })}
        </nav>
        {tab === 'create' ? (
          <RestaurantMenuForm
            embedded
            foods={foods.data}
            existingItems={menuItems.data}
            onSubmit={async (payload) => {
              await api.post(`/restaurants/${restaurantId}/menu-items`, {
                foodId: payload.foodId,
                offeredAt: payload.offeredAt,
                ...(payload.offeredUntil ? { offeredUntil: payload.offeredUntil } : {}),
                price: payload.price,
                isActive: payload.isActive,
              })
              toast.success(t('restaurantMenuItems.created'))
              navigate(restaurantMenuPath(restaurantId))
            }}
          />
        ) : (
          <RestaurantMenuCancelForm
            foods={foods.data}
            onSubmit={async (payload) => {
              const { data } = await api.post<{ menuItemCount: number; reservationCount: number }>(
                `/restaurants/${restaurantId}/menu-items/cancel`,
                {
                  foodId: payload.foodId,
                  offeredAt: payload.offeredAt,
                  ...(payload.offeredUntil ? { offeredUntil: payload.offeredUntil } : {}),
                },
              )
              if (!data.menuItemCount && !data.reservationCount) {
                toast.error(t('restaurantMenuItems.cancelPlanEmpty'))
                return
              }
              await queryClient.invalidateQueries({ queryKey: ['restaurant-menu'] })
              await queryClient.invalidateQueries({ queryKey: ['food-reservations'] })
              toast.success(t('restaurantMenuItems.cancelPlanSuccess'))
              navigate(restaurantMenuPath(restaurantId))
            }}
          />
        )}
      </FormCard>
    </div>
  )
}

export function RestaurantMenuEditPage() {
  const { t } = useTranslation()
  const { itemId } = useParams()
  const navigate = useNavigate()
  const { restaurantId } = useRestaurant()
  const foods = useFoods()
  const menuItems = useMenuItems(restaurantId)
  const query = useQuery({
    queryKey: ['restaurant-menu-item', restaurantId, itemId],
    enabled: Boolean(restaurantId && itemId),
    queryFn: async () => {
      const { data } = await api.get<RestaurantMenuItem>(
        `/restaurants/${restaurantId}/menu-items/${itemId}`,
      )
      return data
    },
  })
  if (!query.data || !restaurantId || !itemId || !foods.data || !menuItems.data) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={UtensilsCrossed}
        title={t('restaurantMenuItems.edit')}
        subtitle={<EntityNameSubtitle name={query.data.food.name} icon={UtensilsCrossed} />}
      />
      <RestaurantMenuForm
        foods={foods.data}
        existingItems={menuItems.data}
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/restaurants/${restaurantId}/menu-items/${itemId}`, {
            foodId: payload.foodId,
            offeredAt: payload.offeredAt,
            price: payload.price,
            isActive: payload.isActive,
          })
          toast.success(t('restaurantMenuItems.updated'))
          navigate(restaurantMenuPath(restaurantId))
        }}
      />
    </div>
  )
}

export function RestaurantMenuDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { itemId } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const { restaurantId } = useRestaurant()
  const query = useQuery({
    queryKey: ['restaurant-menu-item', restaurantId, itemId],
    enabled: Boolean(restaurantId && itemId),
    queryFn: async () => {
      const { data } = await api.get<RestaurantMenuItem>(
        `/restaurants/${restaurantId}/menu-items/${itemId}`,
      )
      return data
    },
  })
  const item = query.data
  if (!item || !restaurantId || !itemId) {
    return <LoadingState />
  }
  const base = restaurantMenuPath(restaurantId)
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={UtensilsCrossed}
        title={t('restaurantMenuItems.details')}
        subtitle={<EntityNameSubtitle name={item.food.name} icon={UtensilsCrossed} />}
      />
      <FormCard icon={CookingPot} title={item.food.name}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={CookingPot}>{t('restaurantMenuItems.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={CalendarRange}
              label={t('restaurantMenuItems.date')}
              value={<DateText value={item.offeredAt} />}
              tone="teal"
            />
            <FormFactTile
              icon={UtensilsCrossed}
              label={t('restaurantMenuItems.food')}
              value={item.food.name}
              tone="mint"
            />
            <FormFactTile
              icon={Wallet}
              label={t('restaurantMenuItems.price')}
              value={`${formatNumber(item.price, locale)} ${t('restaurantMenuItems.toman')}`}
            />
            <FormFactTile
              icon={ToggleRight}
              label={t('restaurantMenuItems.isActive')}
              value={<GeoStatus active={item.isActive} />}
            />
            <FormFactTile
              icon={ScrollText}
              label={t('foods.description')}
              value={item.food.description || '—'}
              className="sm:col-span-2"
            />
            <FormFactTile
              icon={ImagePlus}
              label={t('foods.photo')}
              value={<ImageFact imageId={item.food.photoId} empty="—" />}
              empty={!item.food.photoId}
              className="sm:col-span-2"
            />
          </div>
          <DetailActions
            editTo={`${base}/${itemId}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('restaurantMenuItems.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('restaurantMenuItems.confirmDelete'),
                successMessage: t('restaurantMenuItems.deleted'),
                path: `/restaurants/${restaurantId}/menu-items/${itemId}`,
                queryKey: ['restaurant-menu'],
                onDeleted: () => navigate(base),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
