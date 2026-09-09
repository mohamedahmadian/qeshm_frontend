import { Briefcase, Plus, Type, Users } from 'lucide-react'
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
import type { OrganizationPosition, Paginated } from '../../../types/app'
import { organizationPositionPath, organizationPositionsPath } from '../organization-paths'
import { OrganizationPositionForm } from './OrganizationPositionForm'

export function OrganizationPositionListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['organization-positions', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<OrganizationPosition>>('/organization/positions', {
        params: { page, ...(q ? { q } : {}), ...sortParams },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []
  const base = organizationPositionsPath()

  return (
    <div className={listShellClassName}>
      <PageHeader
        title={t('menus.organizationPositions')}
        subtitle={t('organizationPositions.subtitle')}
        action={
          <Link to={`${base}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('organizationPositions.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('organizationPositions.search')}
        placeholder={t('organizationPositions.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('organizationPositions.noResults') : t('organizationPositions.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="name"
                label={t('organizationPositions.name')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="employeeCount"
                label={t('organizationPositions.employeeCount')}
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
                <td className="px-4 py-3">{formatNumber(item._count?.users ?? 0, locale)}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={organizationPositionPath(item.id)}
                    editTo={`${organizationPositionPath(item.id)}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('organizationPositions.confirmDelete'),
                        successMessage: t('organizationPositions.deleted'),
                        path: `/organization/positions/${item.id}`,
                        queryKey: ['organization-positions'],
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

export function OrganizationPositionCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className={formShellClassName}>
      <PageHeader title={t('organizationPositions.create')} subtitle={t('organizationPositions.createSubtitle')} />
      <OrganizationPositionForm
        onSubmit={async (payload) => {
          const { data } = await api.post<{ id: string }>('/organization/positions', payload)
          toast.success(t('organizationPositions.created'))
          navigate(organizationPositionPath(data.id))
        }}
      />
    </div>
  )
}

export function OrganizationPositionEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['organization-position', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<OrganizationPosition>(`/organization/positions/${id}`)
      return data
    },
  })
  if (!query.data || !id) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        title={t('organizationPositions.edit')}
        subtitle={<EntityNameSubtitle name={query.data.name} icon={Briefcase} />}
      />
      <OrganizationPositionForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/organization/positions/${id}`, payload)
          toast.success(t('organizationPositions.updated'))
          navigate(organizationPositionPath(id))
        }}
      />
    </div>
  )
}

export function OrganizationPositionDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['organization-position', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<OrganizationPosition>(`/organization/positions/${id}`)
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
        title={t('organizationPositions.details')}
        subtitle={<EntityNameSubtitle name={item.name} icon={Briefcase} />}
      />
      <FormCard icon={Briefcase} title={item.name}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Briefcase}>{t('organizationPositions.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Type} label={t('organizationPositions.name')} value={item.name} tone="teal" />
            <FormFactTile
              icon={Users}
              label={t('organizationPositions.employeeCount')}
              value={formatNumber(item._count?.users ?? 0, locale)}
              tone="mint"
            />
          </div>
          <DetailActions
            editTo={`${organizationPositionPath(id)}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('organizationPositions.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('organizationPositions.confirmDelete'),
                successMessage: t('organizationPositions.deleted'),
                path: `/organization/positions/${id}`,
                queryKey: ['organization-positions'],
                onDeleted: () => navigate(organizationPositionsPath()),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
