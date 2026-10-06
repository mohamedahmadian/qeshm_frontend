import { BadgeCheck, Banknote, CalendarDays, Car, HandCoins, Plus, Ticket, UserRound } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../components/ui/ListControls'
import {
  Button,
  DetailActions,
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  formShellClassName,
  listShellClassName,
} from '../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../components/ui/FormLayout'
import { useAuth } from '../../auth/AuthProvider'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import { canManageTicketTariffs } from '../../lib/roles'
import { formatGroupedNumber, localizeDigits } from '../../lib/datetime'
import type { Paginated, TicketTariff } from '../../types/app'
import { TicketTariffForm } from './TicketTariffForm'
import { ticketTariffPath, ticketTariffsPath } from './ticket-tariff-paths'

export function TicketTariffListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { user } = useAuth()
  const canEdit = canManageTicketTariffs(user)
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['ticket-tariffs', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<TicketTariff>>('/ticket-tariffs', {
        params: { page, ...(q ? { q } : {}), ...sortParams },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={Ticket}
        title={t('ticketTariffs.title')}
        subtitle={t('ticketTariffs.subtitle')}
        action={
          canEdit ? (
            <Link to={`${ticketTariffsPath()}/new`}>
              <Button>
                <Plus className="size-4" />
                {t('ticketTariffs.create')}
              </Button>
            </Link>
          ) : undefined
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('ticketTariffs.search')}
        placeholder={t('ticketTariffs.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('ticketTariffs.noResults') : t('ticketTariffs.empty')}
        hasRows={rows.length > 0}
        rowClick={canEdit}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="year" label={t('ticketTariffs.year')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh
                column="individualPrice"
                label={t('ticketTariffs.individualPrice')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="individualQeshmondiPrice"
                label={t('ticketTariffs.individualQeshmondiPrice')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="individualSubsidy"
                label={t('ticketTariffs.individualSubsidy')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="vehiclePrice"
                label={t('ticketTariffs.vehiclePrice')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="vehicleQeshmondiPrice"
                label={t('ticketTariffs.vehicleQeshmondiPrice')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="vehicleSubsidy"
                label={t('ticketTariffs.vehicleSubsidy')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              {canEdit ? <ActionsTh /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3 font-medium">{localizeDigits(String(item.year), locale)}</td>
                <td className={priceCellClassName}>
                  <PriceValue value={item.individualPrice} locale={locale} />
                </td>
                <td className={priceCellClassName}>
                  <PriceValue value={item.individualQeshmondiPrice} locale={locale} />
                </td>
                <td className={priceCellClassName}>
                  <PriceValue value={item.individualSubsidy} locale={locale} />
                </td>
                <td className={priceCellClassName}>
                  <PriceValue value={item.vehiclePrice} locale={locale} />
                </td>
                <td className={priceCellClassName}>
                  <PriceValue value={item.vehicleQeshmondiPrice} locale={locale} />
                </td>
                <td className={priceCellClassName}>
                  <PriceValue value={item.vehicleSubsidy} locale={locale} />
                </td>
                {canEdit ? (
                  <td className={actionsColClassName}>
                    <EntityRowActions
                      editTo={`${ticketTariffPath(item.id)}/edit`}
                      onDelete={() =>
                        confirmDelete({
                          message: t('ticketTariffs.confirmDelete'),
                          successMessage: t('ticketTariffs.deleted'),
                          path: `/ticket-tariffs/${item.id}`,
                          queryKey: ['ticket-tariffs'],
                        })
                      }
                    />
                  </td>
                ) : null}
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

export function TicketTariffCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  if (!canManageTicketTariffs(user)) {
    return <Navigate to={ticketTariffsPath()} replace />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader icon={Ticket} title={t('ticketTariffs.create')} subtitle={t('ticketTariffs.createSubtitle')} />
      <TicketTariffForm
        onSubmit={async (payload) => {
          await api.post('/ticket-tariffs', payload)
          toast.success(t('ticketTariffs.created'))
          navigate(ticketTariffsPath())
        }}
      />
    </div>
  )
}

export function TicketTariffEditPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const canEdit = canManageTicketTariffs(user)
  const query = useQuery({
    queryKey: ['ticket-tariff', id],
    enabled: Boolean(id) && canEdit,
    queryFn: async () => {
      const { data } = await api.get<TicketTariff>(`/ticket-tariffs/${id}`)
      return data
    },
  })
  if (!canEdit) {
    return <Navigate to={ticketTariffsPath()} replace />
  }
  if (!query.data || !id) {
    return <LoadingState />
  }
  const yearLabel = localizeDigits(String(query.data.year), locale)
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Ticket}
        title={t('ticketTariffs.edit')}
        subtitle={<EntityNameSubtitle name={yearLabel} icon={Ticket} />}
      />
      <TicketTariffForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/ticket-tariffs/${id}`, payload)
          toast.success(t('ticketTariffs.updated'))
          navigate(ticketTariffsPath())
        }}
      />
    </div>
  )
}

export function TicketTariffDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const canEdit = canManageTicketTariffs(user)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['ticket-tariff', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<TicketTariff>(`/ticket-tariffs/${id}`)
      return data
    },
  })
  const item = query.data
  if (!item || !id) {
    return <LoadingState />
  }
  const yearLabel = localizeDigits(String(item.year), locale)
  const toman = t('ticketTariffs.toman')
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Ticket}
        title={t('ticketTariffs.details')}
        subtitle={<EntityNameSubtitle name={yearLabel} icon={Ticket} />}
      />
      <FormCard icon={Ticket} title={yearLabel}>
        <div className="space-y-6 p-5 sm:p-6">
          <div>
            <FormSectionTitle icon={CalendarDays}>{t('ticketTariffs.yearSection')}</FormSectionTitle>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <FormFactTile icon={CalendarDays} label={t('ticketTariffs.year')} value={yearLabel} tone="teal" />
            </div>
          </div>
          <div>
            <FormSectionTitle icon={UserRound}>{t('ticketTariffs.individualSection')}</FormSectionTitle>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
              <FormFactTile
                icon={UserRound}
                label={t('ticketTariffs.individualPrice')}
                value={moneyText(item.individualPrice, locale, toman)}
                tone="teal"
              />
              <FormFactTile
                icon={BadgeCheck}
                label={t('ticketTariffs.individualQeshmondiPrice')}
                value={moneyText(item.individualQeshmondiPrice, locale, toman)}
                tone="teal"
              />
              <FormFactTile
                icon={HandCoins}
                label={t('ticketTariffs.individualSubsidy')}
                value={moneyText(item.individualSubsidy, locale, toman)}
                tone="mint"
              />
            </div>
          </div>
          <div>
            <FormSectionTitle icon={Car}>{t('ticketTariffs.vehicleSection')}</FormSectionTitle>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
              <FormFactTile
                icon={Car}
                label={t('ticketTariffs.vehiclePrice')}
                value={moneyText(item.vehiclePrice, locale, toman)}
                tone="teal"
              />
              <FormFactTile
                icon={BadgeCheck}
                label={t('ticketTariffs.vehicleQeshmondiPrice')}
                value={moneyText(item.vehicleQeshmondiPrice, locale, toman)}
                tone="teal"
              />
              <FormFactTile
                icon={Banknote}
                label={t('ticketTariffs.vehicleSubsidy')}
                value={moneyText(item.vehicleSubsidy, locale, toman)}
                tone="mint"
              />
            </div>
          </div>
        </div>
      </FormCard>
      {canEdit ? (
        <DetailActions
          editTo={`${ticketTariffPath(id)}/edit`}
          editLabel={t('common.edit')}
          deleteLabel={t('ticketTariffs.delete')}
          onDelete={() =>
            confirmDelete({
              message: t('ticketTariffs.confirmDelete'),
              successMessage: t('ticketTariffs.deleted'),
              path: `/ticket-tariffs/${id}`,
              queryKey: ['ticket-tariffs'],
              onDeleted: () => navigate(ticketTariffsPath()),
            })
          }
        />
      ) : null}
    </div>
  )
}

const priceCellClassName = 'px-4 py-3 text-base font-medium'

function TomanBadge() {
  const { t } = useTranslation()
  return (
    <span className="inline-flex shrink-0 rounded-full bg-teal-50 px-1.5 py-px text-[10px] font-medium leading-none text-teal-700 ring-1 ring-teal-100">
      {t('ticketTariffs.toman')}
    </span>
  )
}

function PriceValue({ value, locale }: { value: number; locale: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{formatGroupedNumber(value, locale)}</span>
      <TomanBadge />
    </span>
  )
}

function moneyText(value: number, locale: string, toman: string) {
  return `${formatGroupedNumber(value, locale)} ${toman}`
}
