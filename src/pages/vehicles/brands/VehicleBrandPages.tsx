import { Car, Plus, Tags, Type } from 'lucide-react'
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
import type { Paginated, VehicleBrand } from '../../../types/app'
import { vehicleBrandPath, vehicleBrandsPath } from '../vehicle-paths'
import { VehicleBrandForm } from './VehicleBrandForm'

export function VehicleBrandListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['vehicle-brands', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<VehicleBrand>>('/vehicle-brands', {
        params: { page, ...(q ? { q } : {}), ...sortParams },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []
  const base = vehicleBrandsPath()

  return (
    <div className={listShellClassName}>
      <PageHeader
        title={t('menus.vehicleBrands')}
        subtitle={t('vehicleBrands.subtitle')}
        action={
          <Link to={`${base}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('vehicleBrands.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('vehicleBrands.search')}
        placeholder={t('vehicleBrands.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('vehicleBrands.noResults') : t('vehicleBrands.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="name" label={t('vehicleBrands.name')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh
                column="vehicleCount"
                label={t('vehicleBrands.vehicleCount')}
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
                <td className="px-4 py-3">{item.name}</td>
                <td className="px-4 py-3">{formatNumber(item._count?.vehicles ?? 0, locale)}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={vehicleBrandPath(item.id)}
                    editTo={`${vehicleBrandPath(item.id)}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('vehicleBrands.confirmDelete'),
                        successMessage: t('vehicleBrands.deleted'),
                        path: `/vehicle-brands/${item.id}`,
                        queryKey: ['vehicle-brands'],
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

export function VehicleBrandCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className={formShellClassName}>
      <PageHeader title={t('vehicleBrands.create')} subtitle={t('vehicleBrands.createSubtitle')} />
      <VehicleBrandForm
        onSubmit={async (payload) => {
          const { data } = await api.post<{ id: string }>('/vehicle-brands', payload)
          toast.success(t('vehicleBrands.created'))
          navigate(vehicleBrandPath(data.id))
        }}
      />
    </div>
  )
}

export function VehicleBrandEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['vehicle-brand', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<VehicleBrand>(`/vehicle-brands/${id}`)
      return data
    },
  })
  if (!query.data || !id) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        title={t('vehicleBrands.edit')}
        subtitle={<EntityNameSubtitle name={query.data.name} icon={Tags} />}
      />
      <VehicleBrandForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/vehicle-brands/${id}`, payload)
          toast.success(t('vehicleBrands.updated'))
          navigate(vehicleBrandPath(id))
        }}
      />
    </div>
  )
}

export function VehicleBrandDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['vehicle-brand', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<VehicleBrand>(`/vehicle-brands/${id}`)
      return data
    },
  })
  const item = query.data
  if (!item || !id) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        title={t('vehicleBrands.details')}
        subtitle={<EntityNameSubtitle name={item.name} icon={Tags} />}
      />
      <FormCard icon={Tags} title={item.name}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Tags}>{t('vehicleBrands.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Type} label={t('vehicleBrands.name')} value={item.name} tone="teal" />
            <FormFactTile
              icon={Car}
              label={t('vehicleBrands.vehicleCount')}
              value={formatNumber(item._count?.vehicles ?? 0, locale)}
              tone="mint"
            />
          </div>
          <DetailActions
            editTo={`${vehicleBrandPath(id)}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('vehicleBrands.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('vehicleBrands.confirmDelete'),
                successMessage: t('vehicleBrands.deleted'),
                path: `/vehicle-brands/${id}`,
                queryKey: ['vehicle-brands'],
                onDeleted: () => navigate(vehicleBrandsPath()),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
