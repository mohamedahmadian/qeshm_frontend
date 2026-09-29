import { CalendarRange, ClipboardList, Hash, Plus, Store, Ticket, Trash2, UserRound, UtensilsCrossed, Wallet } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthProvider'
import { toast } from 'sonner'
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
  Button,
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  formShellClassName,
  listShellClassName,
} from '../../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../../components/ui/FormLayout'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { useListParams } from '../../../hooks/useListParams'
import { useListSort } from '../../../hooks/useListSort'
import { api } from '../../../lib/api'
import { formatNumber } from '../../../lib/datetime'
import { hasPermission } from '../../../lib/roles'
import type { FoodReservation, FoodReservationContext, Paginated } from '../../../types/app'
import { FoodReservationStatusBadge } from '../FoodReservationStatusBadge'
import { foodMyOrderItemPath, foodMyOrdersPath, foodReserveItemPath, foodReservePath } from '../food-paths'
import { FoodReserveForm } from './FoodReserveForm'

function isMyOrdersPath(pathname: string) {
  return pathname === foodMyOrdersPath() || pathname.startsWith(`${foodMyOrdersPath()}/`)
}

export function FoodReserveListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { pathname } = useLocation()
  const { user } = useAuth()
  const myOrders = isMyOrdersPath(pathname)
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['food-reservations', 'mine', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<FoodReservation>>('/food-reservations', {
        params: { page, mine: true, ...(q ? { q } : {}), ...sortParams },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []
  const canReserve = hasPermission(user, 'food-reservation.reserve')

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={myOrders ? ClipboardList : Ticket}
        title={t(myOrders ? 'menus.foodMyOrders' : 'menus.foodReserve')}
        subtitle={t(myOrders ? 'foodReservations.myOrdersSubtitle' : 'foodReservations.subtitle')}
        action={
          canReserve ? (
            <Link to={`${foodReservePath()}/new`}>
              <Button>
                <Plus className="size-4" />
                {t('foodReservations.create')}
              </Button>
            </Link>
          ) : null
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('foodReservations.search')}
        placeholder={t(myOrders ? 'foodReservations.myOrdersSearchPlaceholder' : 'foodReservations.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('foodReservations.noResults') : t('foodReservations.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="reservedAt" label={t('foodReservations.reservedAt')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
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
                <td className="px-4 py-3">{item.restaurant.name}</td>
                <td className="px-4 py-3">{item.food.name}</td>
                <td className="px-4 py-3">{formatNumber(item.quantity, locale)}</td>
                <td className="px-4 py-3"><FoodReservationStatusBadge status={item.status} /></td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={(myOrders ? foodMyOrderItemPath : foodReserveItemPath)(item.id)}
                    canDelete={item.status === 'PENDING'}
                    onDelete={
                      item.status === 'PENDING'
                        ? () =>
                            confirmDelete({
                              message: t('foodReservations.confirmDelete'),
                              successMessage: t('foodReservations.deleted'),
                              path: `/food-reservations/${item.id}?mine=true`,
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

export function FoodReserveCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const context = useQuery({
    queryKey: ['food-reservations', 'context'],
    queryFn: async () => {
      const { data } = await api.get<FoodReservationContext>('/food-reservations/context')
      return data
    },
  })
  if (!context.data) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Ticket}
        backTo={foodMyOrdersPath()}
        title={t('foodReservations.create')}
        subtitle={
          !context.data.canManage && context.data.orgUnit ? (
            <EntityNameSubtitle name={context.data.orgUnit.name} icon={Ticket} />
          ) : (
            t('foodReservations.createSubtitle')
          )
        }
      />
      <FoodReserveForm
        context={context.data}
        onSubmit={async (payload) => {
          await api.post('/food-reservations', payload)
          toast.success(t('foodReservations.created'))
          navigate(foodMyOrdersPath())
        }}
      />
    </div>
  )
}

export function FoodReserveDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { pathname } = useLocation()
  const listPath = isMyOrdersPath(pathname) ? foodMyOrdersPath() : foodReservePath()
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['food-reservation', id, 'mine'],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<FoodReservation>(`/food-reservations/${id}`, {
        params: { mine: true },
      })
      return data
    },
  })
  const item = query.data
  if (!item) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Ticket}
        title={t('foodReservations.details')}
        subtitle={<EntityNameSubtitle name={item.food.name} icon={Ticket} />}
      />
      <FormCard icon={Ticket} title={item.food.name}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Ticket}>{t('foodReservations.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={CalendarRange} label={t('foodReservations.reservedAt')} value={<DateText value={item.reservedAt} />} tone="teal" />
            <FormFactTile icon={Store} label={t('foodReservations.restaurant')} value={item.restaurant.name} tone="mint" />
            <FormFactTile icon={UtensilsCrossed} label={t('foodReservations.food')} value={item.food.name} />
            <FormFactTile icon={Hash} label={t('foodReservations.quantity')} value={formatNumber(item.quantity, locale)} />
            <FormFactTile icon={UserRound} label={t('foodReservations.orgUnit')} value={item.orgUnit.name} />
            <FormFactTile icon={Ticket} label={t('foodReservations.status')} value={<FoodReservationStatusBadge status={item.status} />} />
            <FormFactTile
              icon={Wallet}
              label={t('foodReservations.unitPrice')}
              value={`${formatNumber(item.unitPrice, locale)} ${t('foodReservations.toman')}`}
            />
            <FormFactTile
              icon={Wallet}
              label={t('foodReservations.totalPrice')}
              value={`${formatNumber(item.totalPrice, locale)} ${t('foodReservations.toman')}`}
            />
          </div>
          {item.status === 'PENDING' ? (
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="danger"
                onClick={() =>
                  confirmDelete({
                    message: t('foodReservations.confirmDelete'),
                    successMessage: t('foodReservations.deleted'),
                    path: `/food-reservations/${item.id}?mine=true`,
                    queryKey: ['food-reservations'],
                    onDeleted: () => navigate(listPath),
                  })
                }
              >
                <Trash2 className="size-4" aria-hidden />
                {t('foodReservations.delete')}
              </Button>
            </div>
          ) : null}
        </div>
      </FormCard>
    </div>
  )
}
