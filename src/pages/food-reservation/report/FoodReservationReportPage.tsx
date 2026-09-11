import {
  Building2,
  CalendarRange,
  ChartColumn,
  Hash,
  Store,
  Ticket,
  UserRound,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { DateText } from '../../../components/ui/DateText'
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
  AppForm,
  FormActions,
  FormField,
  PageHeader,
  listShellClassName,
} from '../../../components/ui/Form'
import {
  FormCard,
  FormEmptyHint,
  FormFactTile,
  FormSectionTitle,
  formCardBodyClassName,
} from '../../../components/ui/FormLayout'
import { PersianDateField } from '../../../components/ui/PersianDateField'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { useListParams } from '../../../hooks/useListParams'
import { useListSort } from '../../../hooks/useListSort'
import { api } from '../../../lib/api'
import { formatNumber } from '../../../lib/datetime'
import type {
  FoodReservationReport,
  ManagedUser,
  OrganizationUnit,
  Restaurant,
  RestaurantMenuItem,
} from '../../../types/app'
import { FoodReservationStatusBadge } from '../FoodReservationStatusBadge'
import { foodReservationHistoryItemPath } from '../food-paths'

export function FoodReservationReportPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const restaurantId = searchParams.get('restaurantId') ?? ''
  const foodId = searchParams.get('foodId') ?? ''
  const orgUnitId = searchParams.get('orgUnitId') ?? ''
  const userId = searchParams.get('userId') ?? ''
  const status = searchParams.get('status') ?? ''
  const reservedFrom = searchParams.get('reservedFrom') ?? ''
  const reservedTo = searchParams.get('reservedTo') ?? ''

  const restaurants = useQuery({
    queryKey: ['restaurants', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<Restaurant[]>('/restaurants')
      return data
    },
  })
  const menu = useQuery({
    queryKey: ['restaurant-menu', restaurantId, 'lookup'],
    enabled: Boolean(restaurantId),
    queryFn: async () => {
      const { data } = await api.get<RestaurantMenuItem[]>(`/restaurants/${restaurantId}/menu-items`)
      return data
    },
  })
  const units = useQuery({
    queryKey: ['organization-units', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnit[]>('/organization/units')
      return data
    },
  })
  const employees = useQuery({
    queryKey: ['employees', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<ManagedUser[]>('/users', {
        params: { employeesOnly: true },
      })
      return data
    },
  })
  const report = useQuery({
    queryKey: [
      'food-reservations',
      'report',
      restaurantId,
      foodId,
      orgUnitId,
      userId,
      status,
      reservedFrom,
      reservedTo,
      q,
      page,
      sortBy,
      sortDir,
    ],
    enabled: Boolean(restaurantId),
    queryFn: async () => {
      const { data } = await api.get<FoodReservationReport>('/food-reservations/report', {
        params: {
          page,
          restaurantId,
          ...(foodId ? { foodId } : {}),
          ...(orgUnitId ? { orgUnitId } : {}),
          ...(userId ? { userId } : {}),
          ...(status ? { status } : {}),
          ...(reservedFrom ? { reservedFrom } : {}),
          ...(reservedTo ? { reservedTo } : {}),
          ...(q ? { q } : {}),
          ...sortParams,
        },
      })
      return data
    },
  })

  const selectedRestaurant = (restaurants.data ?? []).find((item) => item.id === restaurantId)
  const foodOptions = (menu.data ?? []).map((item) => ({
    value: item.food.id,
    label: item.food.name,
  }))
  const rows = report.data?.items ?? []
  const summary = report.data?.summary
  const filtersActive = Boolean(foodId || orgUnitId || userId || status || reservedFrom || reservedTo)

  function submit(event: FormEvent) {
    event.preventDefault()
    applySearch()
  }

  function clearFilters() {
    setTerm('')
    setParams(
      {
        restaurantId: restaurantId || undefined,
        foodId: undefined,
        orgUnitId: undefined,
        userId: undefined,
        status: undefined,
        reservedFrom: undefined,
        reservedTo: undefined,
        q: undefined,
      },
      { resetPage: true },
    )
  }

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={ChartColumn}
        title={t('menus.foodReservationReport')}
        subtitle={t('foodReservations.reportSubtitle')}
      />
      <FormCard
        icon={ChartColumn}
        title={t('menus.foodReservationReport')}
        subtitle={t('foodReservations.reportHint')}
      >
        <AppForm onSubmit={submit} autoFocusFirst className={formCardBodyClassName}>
          <FormField icon={Store} label={t('foodReservations.restaurant')} htmlFor="reportRestaurant">
            <SearchSelect
              id="reportRestaurant"
              value={restaurantId}
              required
              onChange={(next) =>
                setParams(
                  { restaurantId: next || undefined, foodId: undefined },
                  { resetPage: true },
                )
              }
              placeholder={t('foodReservations.selectRestaurant')}
              options={(restaurants.data ?? []).map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField icon={CalendarRange} label={t('foodReservations.fromDate')} htmlFor="reportFrom">
              <PersianDateField
                id="reportFrom"
                value={reservedFrom}
                maxDate={reservedTo || undefined}
                onChange={(value) =>
                  setParams({ reservedFrom: value || undefined }, { resetPage: true })
                }
              />
            </FormField>
            <FormField icon={CalendarRange} label={t('foodReservations.toDate')} htmlFor="reportTo">
              <PersianDateField
                id="reportTo"
                value={reservedTo}
                minDate={reservedFrom || undefined}
                onChange={(value) =>
                  setParams({ reservedTo: value || undefined }, { resetPage: true })
                }
              />
            </FormField>
            <FormField icon={UtensilsCrossed} label={t('foodReservations.food')} htmlFor="reportFood">
              <SearchSelect
                id="reportFood"
                value={foodId}
                disabled={!restaurantId}
                onChange={(next) => setParams({ foodId: next || undefined }, { resetPage: true })}
                placeholder={t('foodReservations.selectFood')}
                options={[
                  { value: '', label: t('foodReservations.allFoods') },
                  ...foodOptions,
                ]}
              />
            </FormField>
            <FormField icon={Building2} label={t('foodReservations.orgUnit')} htmlFor="reportUnit">
              <SearchSelect
                id="reportUnit"
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
            <FormField icon={UserRound} label={t('foodReservations.employee')} htmlFor="reportEmployee">
              <SearchSelect
                id="reportEmployee"
                value={userId}
                onChange={(next) => setParams({ userId: next || undefined }, { resetPage: true })}
                placeholder={t('foodReservations.selectEmployee')}
                options={[
                  { value: '', label: t('foodReservations.allEmployees') },
                  ...(employees.data ?? []).map((item) => ({
                    value: item.id,
                    label: item.fullName,
                  })),
                ]}
              />
            </FormField>
            <FormField icon={Ticket} label={t('foodReservations.status')} htmlFor="reportStatus">
              <SearchSelect
                id="reportStatus"
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
          </div>
          <FormActions
            submitLabel={t('foodReservations.showReport')}
            cancelLabel={t('foodReservations.clearFilters')}
            onCancel={clearFilters}
          />
        </AppForm>
      </FormCard>

      {!restaurantId ? (
        <div className="mt-6">
          <FormCard icon={Store} title={t('foodReservations.restaurant')}>
            <div className="p-5 sm:p-6">
              <FormEmptyHint>{t('foodReservations.selectRestaurantFirst')}</FormEmptyHint>
            </div>
          </FormCard>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <SearchBar
            autoFocus={false}
            term={term}
            onTermChange={setTerm}
            onSubmit={() => applySearch()}
            label={t('foodReservations.reportSearch')}
            placeholder={t('foodReservations.reportSearchPlaceholder')}
            filtersActive={filtersActive}
          />
          {summary ? (
            <FormCard
              icon={ChartColumn}
              title={t('foodReservations.summary')}
              subtitle={selectedRestaurant?.name}
            >
              <div className="space-y-6 p-5 sm:p-6">
                <FormSectionTitle icon={Ticket}>{t('foodReservations.summary')}</FormSectionTitle>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 sm:gap-3">
                  <FormFactTile
                    icon={Ticket}
                    label={t('foodReservations.totalCount')}
                    value={formatNumber(summary.count, locale)}
                    tone="teal"
                  />
                  <FormFactTile
                    icon={Hash}
                    label={t('foodReservations.totalQuantity')}
                    value={formatNumber(summary.quantity, locale)}
                    tone="mint"
                  />
                  <FormFactTile
                    icon={Wallet}
                    label={t('foodReservations.totalAmount')}
                    value={`${formatNumber(summary.totalPrice, locale)} ${t('foodReservations.toman')}`}
                  />
                  <FormFactTile
                    icon={Ticket}
                    label={t('foodReservations.pendingCount')}
                    value={formatNumber(summary.pendingCount, locale)}
                  />
                  <FormFactTile
                    icon={Ticket}
                    label={t('foodReservations.confirmedCount')}
                    value={formatNumber(summary.confirmedCount, locale)}
                    tone="mint"
                  />
                  <FormFactTile
                    icon={Wallet}
                    label={t('foodReservations.confirmed')}
                    value={`${formatNumber(summary.confirmedTotal, locale)} ${t('foodReservations.toman')}`}
                    tone="teal"
                  />
                </div>
                {report.data && report.data.byFood.length > 0 ? (
                  <div>
                    <FormSectionTitle icon={UtensilsCrossed}>{t('foodReservations.byFood')}</FormSectionTitle>
                    <div className="overflow-x-auto rounded-2xl border border-line">
                      <table className="w-full text-sm">
                        <thead className="bg-cream-50 text-ink-700">
                          <tr>
                            <th className="px-4 py-3 text-start">{t('foodReservations.food')}</th>
                            <th className="px-4 py-3 text-start">{t('foodReservations.totalCount')}</th>
                            <th className="px-4 py-3 text-start">{t('foodReservations.quantity')}</th>
                            <th className="px-4 py-3 text-start">{t('foodReservations.totalPrice')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.data.byFood.map((item) => (
                            <tr key={item.id} className="border-t border-line">
                              <td className="px-4 py-3">{item.name}</td>
                              <td className="px-4 py-3">{formatNumber(item.count, locale)}</td>
                              <td className="px-4 py-3">{formatNumber(item.quantity, locale)}</td>
                              <td className="px-4 py-3">
                                {formatNumber(item.totalPrice, locale)} {t('foodReservations.toman')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
                {report.data && report.data.byUnit.length > 0 ? (
                  <div>
                    <FormSectionTitle icon={Building2}>{t('foodReservations.byUnit')}</FormSectionTitle>
                    <div className="overflow-x-auto rounded-2xl border border-line">
                      <table className="w-full text-sm">
                        <thead className="bg-cream-50 text-ink-700">
                          <tr>
                            <th className="px-4 py-3 text-start">{t('foodReservations.orgUnit')}</th>
                            <th className="px-4 py-3 text-start">{t('foodReservations.totalCount')}</th>
                            <th className="px-4 py-3 text-start">{t('foodReservations.quantity')}</th>
                            <th className="px-4 py-3 text-start">{t('foodReservations.totalPrice')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.data.byUnit.map((item) => (
                            <tr key={item.id} className="border-t border-line">
                              <td className="px-4 py-3">{item.name}</td>
                              <td className="px-4 py-3">{formatNumber(item.count, locale)}</td>
                              <td className="px-4 py-3">{formatNumber(item.quantity, locale)}</td>
                              <td className="px-4 py-3">
                                {formatNumber(item.totalPrice, locale)} {t('foodReservations.toman')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            </FormCard>
          ) : null}
          <TableCard
            loading={report.isLoading}
            empty={q || filtersActive ? t('foodReservations.noResults') : t('foodReservations.reportEmpty')}
            hasRows={rows.length > 0}
          >
            <table className="w-full text-sm">
              <thead className="bg-cream-50 text-ink-700">
                <tr>
                  <SortableTh column="reservedAt" label={t('foodReservations.reservedAt')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
                  <SortableTh column="user" label={t('foodReservations.employee')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
                  <SortableTh column="orgUnit" label={t('foodReservations.orgUnit')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
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
                    <td className="px-4 py-3">{item.food.name}</td>
                    <td className="px-4 py-3">{formatNumber(item.quantity, locale)}</td>
                    <td className="px-4 py-3"><FoodReservationStatusBadge status={item.status} /></td>
                    <td className={actionsColClassName}>
                      <EntityRowActions viewTo={foodReservationHistoryItemPath(item.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
          {report.data ? (
            <PaginationBar
              page={report.data.page}
              pageSize={report.data.pageSize}
              total={report.data.total}
              onPageChange={setPage}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}
