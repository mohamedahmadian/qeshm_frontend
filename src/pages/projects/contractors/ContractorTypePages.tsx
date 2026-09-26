import { Handshake, Plus, Tags, Type } from 'lucide-react'
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
import { FormCard, FormFactTile, FormSectionTitle } from '../../../components/ui/FormLayout'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { useListParams } from '../../../hooks/useListParams'
import { useListSort } from '../../../hooks/useListSort'
import { api } from '../../../lib/api'
import { formatNumber } from '../../../lib/datetime'
import type { ContractorType, Paginated } from '../../../types/app'
import { ContractorTypeForm } from './ContractorTypeForm'
import { contractorTypePath, contractorTypesPath } from './contractor-paths'

export function ContractorTypeListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['contractor-types', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<ContractorType>>('/contractor-types', {
        params: { page, ...(q ? { q } : {}), ...sortParams },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []
  const base = contractorTypesPath()

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={Tags}
        title={t('contractorTypes.title')}
        subtitle={t('contractorTypes.subtitle')}
        action={
          <Link to={`${base}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('contractorTypes.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('contractorTypes.search')}
        placeholder={t('contractorTypes.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('contractorTypes.noResults') : t('contractorTypes.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="name"
                label={t('contractorTypes.name')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="contractorCount"
                label={t('contractorTypes.contractorCount')}
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
                <td className="px-4 py-3 font-medium">{item.name}</td>
                <td className="px-4 py-3">{formatNumber(item._count?.contractors ?? 0, locale)}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={contractorTypePath(item.id)}
                    editTo={`${contractorTypePath(item.id)}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('contractorTypes.confirmDelete'),
                        successMessage: t('contractorTypes.deleted'),
                        path: `/contractor-types/${item.id}`,
                        queryKey: ['contractor-types'],
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

export function ContractorTypeCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Tags}
        title={t('contractorTypes.create')}
        subtitle={t('contractorTypes.createSubtitle')}
      />
      <ContractorTypeForm
        onSubmit={async (payload) => {
          await api.post('/contractor-types', payload)
          toast.success(t('contractorTypes.created'))
          navigate(contractorTypesPath())
        }}
      />
    </div>
  )
}

export function ContractorTypeEditPage() {
  const { t } = useTranslation()
  const { typeId } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['contractor-type', typeId],
    enabled: Boolean(typeId),
    queryFn: async () => {
      const { data } = await api.get<ContractorType>(`/contractor-types/${typeId}`)
      return data
    },
  })
  if (!query.data || !typeId) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Tags}
        title={t('contractorTypes.edit')}
        subtitle={<EntityNameSubtitle name={query.data.name} icon={Tags} />}
      />
      <ContractorTypeForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/contractor-types/${typeId}`, payload)
          toast.success(t('contractorTypes.updated'))
          navigate(contractorTypesPath())
        }}
      />
    </div>
  )
}

export function ContractorTypeDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { typeId } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['contractor-type', typeId],
    enabled: Boolean(typeId),
    queryFn: async () => {
      const { data } = await api.get<ContractorType>(`/contractor-types/${typeId}`)
      return data
    },
  })
  const item = query.data
  if (!item || !typeId) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Tags}
        title={t('contractorTypes.details')}
        subtitle={<EntityNameSubtitle name={item.name} icon={Tags} />}
      />
      <FormCard icon={Tags} title={item.name}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Tags}>{t('contractorTypes.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Type} label={t('contractorTypes.name')} value={item.name} tone="teal" />
            <FormFactTile
              icon={Handshake}
              label={t('contractorTypes.contractorCount')}
              value={formatNumber(item._count?.contractors ?? 0, locale)}
              tone="mint"
            />
          </div>
        </div>
      </FormCard>
      <DetailActions
        editTo={`${contractorTypePath(typeId)}/edit`}
        editLabel={t('common.edit')}
        deleteLabel={t('contractorTypes.delete')}
        onDelete={() =>
          confirmDelete({
            message: t('contractorTypes.confirmDelete'),
            successMessage: t('contractorTypes.deleted'),
            path: `/contractor-types/${typeId}`,
            queryKey: ['contractor-types'],
            onDeleted: () => navigate(contractorTypesPath()),
          })
        }
      />
    </div>
  )
}
