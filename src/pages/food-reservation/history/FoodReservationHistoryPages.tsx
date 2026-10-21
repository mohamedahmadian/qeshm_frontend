import {
  Building2,
  CalendarRange,
  Check,
  ChevronDown,
  ClipboardCheck,
  FileSpreadsheet,
  Hash,
  Store,
  Ticket,
  Trash2,
  UserRound,
  Users,
  Utensils,
  UtensilsCrossed,
  Wallet,
  History,
} from 'lucide-react'
import { useState } from 'react'
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
import { formatGroupedNumber, formatNumber, formatWeekday } from '../../../lib/datetime'
import type {
  Food,
  FoodReservation,
  OrganizationUnit,
  Paginated,
  Restaurant,
} from '../../../types/app'
import { FoodMealTypeBadge, FoodReservationStatusBadge, ReservationOrderBadges, reservationAudienceQty } from '../FoodReservationStatusBadge'
import { foodReservationHistoryItemPath, foodReservationHistoryPath } from '../food-paths'
import { FoodReservationBulkActions } from './FoodReservationBulkActions'

function ReservationDateCell({ value, locale }: { value: string; locale: string }) {
  const weekday = formatWeekday(value, locale)
  return (
    <span className="flex flex-col items-start gap-1">
      <DateText value={value} />
      {weekday ? (
        <span className="inline-flex rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800 ring-1 ring-teal-100">
          {weekday}
        </span>
      ) : null}
    </span>
  )
}

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
  const mealType = searchParams.get('mealType') ?? ''
  const queryClient = useQueryClient()
  const [exporting, setExporting] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)

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
      mealType,
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
          ...(mealType ? { mealType } : {}),
          ...sortParams,
        },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []
  const filtersActive = Boolean(orgUnitId || restaurantId || foodId || status || reservedAt || mealType)

  async function downloadExcel() {
    setExporting(true)
    try {
      const response = await api.get<Blob>('/food-reservations/export', {
        params: {
          ...(q ? { q } : {}),
          ...(orgUnitId ? { orgUnitId } : {}),
          ...(restaurantId ? { restaurantId } : {}),
          ...(foodId ? { foodId } : {}),
          ...(status ? { status } : {}),
          ...(reservedAt ? { reservedAt } : {}),
          ...(mealType ? { mealType } : {}),
          ...sortParams,
        },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = 'تاریخچه-رزرو-غذا.xlsx'
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('foodReservations.exportFailed')))
    } finally {
      setExporting(false)
    }
  }

  function deleteAllOrders() {
    confirmToast({
      title: t('foodReservations.deleteAllAsk'),
      confirmLabel: t('foodReservations.deleteAll'),
      cancelLabel: t('common.cancel'),
      confirmVariant: 'danger',
      onConfirm: async () => {
        setDeletingAll(true)
        try {
          const { data } = await api.post<{ count: number }>('/food-reservations/delete-all')
          if (data.count === 0) {
            toast.message(t('foodReservations.deleteAllNone'))
          } else {
            toast.success(t('foodReservations.deleteAllSuccess', { count: formatNumber(data.count, locale) }))
          }
          void queryClient.invalidateQueries({ queryKey: ['food-reservations'] })
          void queryClient.invalidateQueries({ queryKey: ['food-reservation'] })
        } catch (error) {
          toast.error(getApiErrorMessage(error, t('common.error')))
        } finally {
          setDeletingAll(false)
        }
      },
    })
  }

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={History}
        title={t('menus.foodReservationHistory')}
        subtitle={t('foodReservations.historySubtitle')}
        action={
          <>
            <Button
              type="button"
              variant="ghost"
              aria-expanded={bulkOpen}
              aria-controls="food-reservation-bulk-panel"
              onClick={() => setBulkOpen((value) => !value)}
            >
              <ClipboardCheck className="size-4" aria-hidden />
              {t('foodReservations.bulkTitle')}
              <ChevronDown className={`size-4 transition ${bulkOpen ? 'rotate-180' : ''}`} aria-hidden />
            </Button>
            <Button type="button" variant="danger" disabled={deletingAll} onClick={deleteAllOrders}>
              <Trash2 className="size-4" aria-hidden />
              {t('foodReservations.deleteAll')}
            </Button>
          </>
        }
      />
      <FoodReservationBulkActions open={bulkOpen} />
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
                  ...(units.data ?? []).map((unit) => ({
                    value: unit.id,
                    label: unit.pathLabel || unit.name,
                  })),
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
            <FormField icon={Utensils} label={t('foodReservations.mealType')} htmlFor="filterMealType">
              <SearchSelect
                id="filterMealType"
                value={mealType}
                onChange={(next) => setParams({ mealType: next || undefined }, { resetPage: true })}
                placeholder={t('foodReservations.mealType')}
                options={[
                  { value: '', label: t('foodReservations.allMealTypes') },
                  { value: 'LUNCH', label: t('foodReservations.lunch') },
                  { value: 'DINNER', label: t('foodReservations.dinner') },
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
              <SortableTh column="mealType" label={t('foodReservations.mealType')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="user" label={t('foodReservations.orderer')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="orgUnit" label={t('foodReservations.orgUnit')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="restaurant" label={t('foodReservations.restaurant')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="food" label={t('foodReservations.food')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="quantity" label={t('foodReservations.ordersColumn')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="status" label={t('foodReservations.status')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <ReservationDateCell value={item.reservedAt} locale={locale} />
                </td>
                <td className="px-4 py-3"><FoodMealTypeBadge mealType={item.mealType} /></td>
                <td className="px-4 py-3">{item.user.fullName}</td>
                <td className="px-4 py-3">{item.orgUnit.name}</td>
                <td className="px-4 py-3">{item.restaurant.name}</td>
                <td className="px-4 py-3">{item.food.name}</td>
                <td className="px-4 py-3"><ReservationOrderBadges item={item} locale={locale} /></td>
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
          startExtra={
            query.data.total > 0 ? (
              <Button
                type="button"
                variant="ghost"
                disabled={exporting}
                onClick={() => void downloadExcel()}
              >
                <FileSpreadsheet className="size-4" aria-hidden />
                {t('foodReservations.exportExcel')}
              </Button>
            ) : null
          }
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
        icon={History}
        title={t('foodReservations.details')}
        subtitle={<EntityNameSubtitle name={item.food.name} icon={Ticket} />}
      />
      <FormCard icon={Ticket} title={item.food.name}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Ticket}>{t('foodReservations.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={CalendarRange} label={t('foodReservations.reservedAt')} value={<DateText value={item.reservedAt} />} tone="teal" />
            <FormFactTile icon={Utensils} label={t('foodReservations.mealType')} value={<FoodMealTypeBadge mealType={item.mealType} />} tone="mint" />
            <FormFactTile icon={UserRound} label={t('foodReservations.orderer')} value={item.user.fullName} tone="mint" />
            <FormFactTile icon={Building2} label={t('foodReservations.orgUnit')} value={item.orgUnit.name} />
            <FormFactTile icon={Store} label={t('foodReservations.restaurant')} value={item.restaurant.name} />
            <FormFactTile icon={UtensilsCrossed} label={t('foodReservations.food')} value={item.food.name} />
            <FormFactTile
              icon={Users}
              label={t('foodReservations.unitQuantity')}
              value={formatNumber(reservationAudienceQty(item).unit, locale)}
              tone="teal"
            />
            <FormFactTile
              icon={Hash}
              label={t('foodReservations.guestQuantity')}
              value={formatNumber(reservationAudienceQty(item).guest, locale)}
              tone="mint"
            />
            <FormFactTile icon={Ticket} label={t('foodReservations.status')} value={<FoodReservationStatusBadge status={item.status} />} />
            <FormFactTile
              icon={Wallet}
              label={t('foodReservations.totalPrice')}
              value={`${formatGroupedNumber(item.totalPrice, locale)} ${t('foodReservations.toman')}`}
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
