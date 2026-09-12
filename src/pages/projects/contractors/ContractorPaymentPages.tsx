import { CalendarRange, Plus, ScrollText, Wallet } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
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
} from '../../../components/ui/ListControls'
import {
  Button,
  DetailActions,
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  formShellClassName,
  listShellClassName,
} from '../../../components/ui/Form'
import { DateText } from '../../../components/ui/DateText'
import { FormCard, FormFactTile, FormSectionTitle } from '../../../components/ui/FormLayout'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { useListParams } from '../../../hooks/useListParams'
import { useListSort } from '../../../hooks/useListSort'
import { api } from '../../../lib/api'
import { formatDate, formatNumber } from '../../../lib/datetime'
import type { ContractorPayment, Paginated, ProjectContractor } from '../../../types/app'
import { ContractorPaymentForm } from './ContractorPaymentForm'
import { contractorPaymentsPath } from './contractor-paths'

function useContractor() {
  const { id: projectId, contractorId } = useParams()
  const query = useQuery({
    queryKey: ['contractor', projectId, contractorId],
    enabled: Boolean(projectId && contractorId),
    queryFn: async () => {
      const { data } = await api.get<ProjectContractor>(
        `/projects/${projectId}/contractors/${contractorId}`,
      )
      return data
    },
  })
  return { projectId, contractorId, contractor: query.data }
}

export function ContractorPaymentListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { projectId, contractorId, contractor } = useContractor()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } =
    useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['contractor-payments', projectId, contractorId, q, page, sortBy, sortDir],
    enabled: Boolean(projectId && contractorId),
    queryFn: async () => {
      const { data } = await api.get<Paginated<ContractorPayment>>(
        `/projects/${projectId}/contractors/${contractorId}/payments`,
        { params: { page, ...(q ? { q } : {}), ...sortParams } },
      )
      return data
    },
  })
  if (!contractor || !projectId || !contractorId) {
    return <LoadingState />
  }
  const rows = query.data?.items ?? []
  const base = contractorPaymentsPath(projectId, contractorId)
  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={Wallet}
        title={t('contractorPayments.title')}
        subtitle={<EntityNameSubtitle name={contractor.name} icon={Wallet} />}
        action={
          <Link to={`${base}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('contractorPayments.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('contractorPayments.search')}
        placeholder={t('contractorPayments.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('contractorPayments.noResults') : t('contractorPayments.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="paidAt" label={t('contractorPayments.paidAt')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="amount" label={t('contractorPayments.amount')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="description" label={t('contractorPayments.description')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3"><DateText value={item.paidAt} /></td>
                <td className="px-4 py-3">{formatNumber(item.amount, locale)}</td>
                <td className="px-4 py-3">{item.description || '—'}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={`${base}/${item.id}`}
                    editTo={`${base}/${item.id}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('contractorPayments.confirmDelete'),
                        successMessage: t('contractorPayments.deleted'),
                        path: `/projects/${projectId}/contractors/${contractorId}/payments/${item.id}`,
                        queryKey: ['contractor-payments'],
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

export function ContractorPaymentCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { projectId, contractorId, contractor } = useContractor()
  if (!contractor || !projectId || !contractorId) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Wallet}
        title={t('contractorPayments.create')}
        subtitle={<EntityNameSubtitle name={contractor.name} icon={Wallet} />}
      />
      <ContractorPaymentForm
        onSubmit={async (payload) => {
          await api.post(
            `/projects/${projectId}/contractors/${contractorId}/payments`,
            payload,
          )
          toast.success(t('contractorPayments.created'))
          navigate(contractorPaymentsPath(projectId, contractorId))
        }}
      />
    </div>
  )
}

export function ContractorPaymentEditPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { paymentId } = useParams()
  const navigate = useNavigate()
  const { projectId, contractorId } = useContractor()
  const query = useQuery({
    queryKey: ['contractor-payment', projectId, contractorId, paymentId],
    enabled: Boolean(projectId && contractorId && paymentId),
    queryFn: async () => {
      const { data } = await api.get<ContractorPayment>(
        `/projects/${projectId}/contractors/${contractorId}/payments/${paymentId}`,
      )
      return data
    },
  })
  if (!query.data || !projectId || !contractorId || !paymentId) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Wallet}
        title={t('contractorPayments.edit')}
        subtitle={<EntityNameSubtitle name={formatDate(query.data.paidAt, locale)} icon={Wallet} />}
      />
      <ContractorPaymentForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(
            `/projects/${projectId}/contractors/${contractorId}/payments/${paymentId}`,
            payload,
          )
          toast.success(t('contractorPayments.updated'))
          navigate(contractorPaymentsPath(projectId, contractorId))
        }}
      />
    </div>
  )
}

export function ContractorPaymentDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { paymentId } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const { projectId, contractorId } = useContractor()
  const query = useQuery({
    queryKey: ['contractor-payment', projectId, contractorId, paymentId],
    enabled: Boolean(projectId && contractorId && paymentId),
    queryFn: async () => {
      const { data } = await api.get<ContractorPayment>(
        `/projects/${projectId}/contractors/${contractorId}/payments/${paymentId}`,
      )
      return data
    },
  })
  const payment = query.data
  if (!payment || !projectId || !contractorId || !paymentId) {
    return <LoadingState />
  }
  const base = contractorPaymentsPath(projectId, contractorId)
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Wallet}
        title={t('contractorPayments.details')}
        subtitle={<EntityNameSubtitle name={formatDate(payment.paidAt, locale)} icon={Wallet} />}
      />
      <FormCard icon={Wallet} title={formatDate(payment.paidAt, locale)}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Wallet}>{t('contractorPayments.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={CalendarRange} label={t('contractorPayments.paidAt')} value={<DateText value={payment.paidAt} />} tone="teal" />
            <FormFactTile icon={Wallet} label={t('contractorPayments.amount')} value={formatNumber(payment.amount, locale)} tone="mint" />
            <FormFactTile icon={ScrollText} label={t('contractorPayments.description')} value={payment.description || '—'} />
          </div>
          <DetailActions
            editTo={`${base}/${paymentId}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('contractorPayments.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('contractorPayments.confirmDelete'),
                successMessage: t('contractorPayments.deleted'),
                path: `/projects/${projectId}/contractors/${contractorId}/payments/${paymentId}`,
                queryKey: ['contractor-payments'],
                onDeleted: () => navigate(base),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
