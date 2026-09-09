import {
  Building2,
  CalendarRange,
  Check,
  Hash,
  Store,
  Ticket,
  Trash2,
  UserRound,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { DateText } from '../../../components/ui/DateText'
import { confirmToast } from '../../../components/ui/confirmToast'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../../components/ui/ListControls'
import {
  Button,
  EntityNameSubtitle,
  FormField,
  LoadingState,
  PageHeader,
  formShellClassName,
  listShellClassName,
} from '../../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../../components/ui/FormLayout'
import { PersianDateField } from '../../../components/ui/PersianDateField'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { useListParams } from '../../../hooks/useListParams'
import { useListSort } from '../../../hooks/useListSort'
import { api, getApiErrorMessage } from '../../../lib/api'
import { formatNumber } from '../../../lib/datetime'
import type {
  Food,
  FoodReservation,
  OrganizationUnit,
  Paginated,
  Restaurant,
} from '../../../types/app'
import { FoodReservationStatusBadge } from '../FoodReservationStatusBadge'
import { foodReservationHistoryItemPath, foodReservationHistoryPath } from '../food-paths'

export function FoodReservationHistoryListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const orgUnitId = searchParams.get('orgUnitId') ?? ''
  const restaurantId = searchParams.get('restaurantId') ?? ''
  const foodId = searchParams.get('foodId') ?? ''
  const status = searchParams.get('status') ?? ''
  const reservedAt = searchParams.get('reservedAt') ?? ''

  const units = useQuery({
    queryKey: ['organization-units', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnit[]>('/organization/units')
      return data
    },
  })
  const restaurants = useQuery({
    queryKey: ['restaurants', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<Restaurant[]>('/restaurants')
      return data
    },
  })
  const foods = useQuery({
    queryKey: ['foods', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<Food[]>('/foods')
      return data
    },
  })
  const query = useQuery({
    queryKey: [
      'food-reservations',
      'history',
      q,
      page,
      orgUnitId,
      restaurantId,
      foodId,
      status,
      reservedAt,
      sortBy,
      sortDir,
    ],
    queryFn: async () => {
      const { data } = await api.get<Paginated<FoodReservation>>('/food-reservations', {
        params: {
          page,
          ...(q ? { q } : {}),
          ...(orgUnitId ? { orgUnitId } : {}),
          ...(restaurantId ? { restaurantId } : {}),
          ...(foodId ? { foodId } : {}),
          ...(status ? { status } : {}),
          ...(reservedAt ? { reservedAt } : {}),
          ...sortParams,
        },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []
  const filtersActive = Boolean(orgUnitId || restaurantId || foodId || status || reservedAt)

  return (
    <div className={listShellClassName}>
      <PageHeader
        title={t('menus.foodReservationHistory')}
        subtitle={t('foodReservations.historySubtitle')}
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('foodReservations.search')}
        placeholder={t('foodReservations.searchPlaceholder')}
        filtersActive={filtersActive}
        extraClassName="sm:grid-cols-2 xl:grid-cols-3"
        extra={
          <>
            <FormField icon={Building2} label={t('foodReservations.orgUnit')} htmlFor="filterUnit">
              <SearchSelect
                id="filterUnit"
                value={orgUnitId}
                onChange={(next) => setParams({ orgUnitId: next || undefined }, { resetPage: true })}
                placeholder={t('foodReservations.filterUnit')}
                options={[
                  { value: '', label: t('foodReservations.allUnits') },
                  ...(units.data ?? []).map((unit) => ({ value: unit.id, label: unit.name })),
                ]}
              />
            </FormField>
            <FormField icon={Store} label={t('foodReservations.restaurant')} htmlFor="filterRestaurant">
              <SearchSelect
                id="filterRestaurant"
                value={restaurantId}
                onChange={(next) => setParams({ restaurantId: next || undefined }, { resetPage: true })}
                placeholder={t('foodReservations.selectRestaurant')}
                options={[
                  { value: '', label: t('foodReservations.allRestaurants') },
                  ...(restaurants.data ?? []).map((item) => ({ value: item.id, label: item.name })),
                ]}
              />
            </FormField>
            <FormField icon={UtensilsCrossed} label={t('foodReservations.food')} htmlFor="filterFood">
              <SearchSelect
                id="filterFood"
                value={foodId}
                onChange={(next) => setParams({ foodId: next || undefined }, { resetPage: true })}
                placeholder={t('foodReservations.selectFood')}
                options={[
                  { value: '', label: t('foodReservations.allFoods') },
                  ...(foods.data ?? []).map((item) => ({ value: item.id, label: item.name })),
                ]}
              />
            </FormField>
            <FormField icon={Ticket} label={t('foodReservations.status')} htmlFor="filterStatus">
              <SearchSelect
                id="filterStatus"
                value={status}
                onChange={(next) => setParams({ status: next || undefined }, { resetPage: true })}
                placeholder={t('foodReservations.status')}
                options={[
                  { value: '', label: t('foodReservations.allStatuses') },
                  { value: 'PENDING', label: t('foodReservations.pending') },
                  { value: 'CONFIRMED', label: t('foodReservations.confirmed') },
                ]}
              />
            </FormField>
            <FormField icon={CalendarRange} label={t('foodReservations.reservedAt')} htmlFor="filterDate">
              <PersianDateField
                id="filterDate"
                value={reservedAt}
                onChange={(value) => setParams({ reservedAt: value || undefined }, { resetPage: true })}
              />
            </FormField>
          </>
        }
      />
      <TableCard
        loading={query.isLoading}
        empty={q || filtersActive ? t('foodReservations.noResults') : t('foodReservations.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="reservedAt" label={t('foodReservations.reservedAt')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="user" label={t('foodReservations.employee')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="orgUnit" label={t('foodReservations.orgUnit')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="restaurant" label={t('foodReservations.restaurant')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="food" label={t('foodReservations.food')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="quantity" label={t('foodReservations.quantity')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="status" label={t('foodReservations.status')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3"><DateText value={item.reservedAt} /></td>
                <td className="px-4 py-3">{item.user.fullName}</td>
                <td className="px-4 py-3">{item.orgUnit.name}</td>
                <td className="px-4 py-3">{item.restaurant.name}</td>
                <td className="px-4 py-3">{item.food.name}</td>
                <td className="px-4 py-3">{formatNumber(item.quantity, locale)}</td>
                <td className="px-4 py-3"><FoodReservationStatusBadge status={item.status} /></td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={foodReservationHistoryItemPath(item.id)}
                    canDelete={item.status === 'PENDING'}
                    onDelete={
                      item.status === 'PENDING'
                        ? () =>
                            confirmDelete({
                              message: t('foodReservations.confirmDelete'),
                              successMessage: t('foodReservations.deleted'),
                              path: `/food-reservations/${item.id}`,
                              queryKey: ['food-reservations'],
                            })
                        : undefined
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

export function FoodReservationHistoryDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['food-reservation', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<FoodReservation>(`/food-reservations/${id}`)
      return data
    },
  })
  const item = query.data
  if (!item) {
    return <LoadingState />
  }

  function confirmReservation() {
    confirmToast({
      title: t('foodReservations.confirmAsk'),
      confirmLabel: t('foodReservations.confirm'),
      cancelLabel: t('foodReservations.cancel'),
      onConfirm: async () => {
        try {
          await api.patch(`/food-reservations/${id}/confirm`)
          toast.success(t('foodReservations.confirmedSuccess'))
          void queryClient.invalidateQueries({ queryKey: ['food-reservations'] })
          void queryClient.invalidateQueries({ queryKey: ['food-reservation', id] })
        } catch (error) {
          toast.error(getApiErrorMessage(error, t('common.error')))
        }
      },
    })
  }

  return (
    <div className={formShellClassName}>
      <PageHeader
        title={t('foodReservations.details')}
        subtitle={<EntityNameSubtitle name={item.food.name} icon={Ticket} />}
      />
      <FormCard icon={Ticket} title={item.food.name}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Ticket}>{t('foodReservations.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={CalendarRange} label={t('foodReservations.reservedAt')} value={<DateText value={item.reservedAt} />} tone="teal" />
            <FormFactTile icon={UserRound} label={t('foodReservations.employee')} value={item.user.fullName} tone="mint" />
            <FormFactTile icon={Building2} label={t('foodReservations.orgUnit')} value={item.orgUnit.name} />
            <FormFactTile icon={Store} label={t('foodReservations.restaurant')} value={item.restaurant.name} />
            <FormFactTile icon={UtensilsCrossed} label={t('foodReservations.food')} value={item.food.name} />
            <FormFactTile icon={Hash} label={t('foodReservations.quantity')} value={formatNumber(item.quantity, locale)} />
            <FormFactTile icon={Ticket} label={t('foodReservations.status')} value={<FoodReservationStatusBadge status={item.status} />} />
            <FormFactTile
              icon={Wallet}
              label={t('foodReservations.totalPrice')}
              value={`${formatNumber(item.totalPrice, locale)} ${t('foodReservations.toman')}`}
            />
          </div>
          {item.status === 'PENDING' ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="danger"
                onClick={() =>
                  confirmDelete({
                    message: t('foodReservations.confirmDelete'),
                    successMessage: t('foodReservations.deleted'),
                    path: `/food-reservations/${item.id}`,
                    queryKey: ['food-reservations'],
                    onDeleted: () => navigate(foodReservationHistoryPath()),
                  })
                }
              >
                <Trash2 className="size-4" aria-hidden />
                {t('foodReservations.delete')}
              </Button>
              <Button type="button" variant="soft" onClick={confirmReservation}>
                <Check className="size-4" aria-hidden />
                {t('foodReservations.confirm')}
              </Button>
            </div>
          ) : null}
        </div>
      </FormCard>
    </div>
  )
}
