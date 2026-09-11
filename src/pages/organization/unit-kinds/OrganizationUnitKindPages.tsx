import { Building2, Plus, Tags, Type } from 'lucide-react'
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
import type { OrganizationUnitKind, Paginated } from '../../../types/app'
import { organizationUnitKindPath, organizationUnitKindsPath } from '../organization-paths'
import { OrganizationUnitKindForm } from './OrganizationUnitKindForm'

export function OrganizationUnitKindListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['organization-unit-kinds', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<OrganizationUnitKind>>('/organization/unit-kinds', {
        params: { page, ...(q ? { q } : {}), ...sortParams },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []
  const base = organizationUnitKindsPath()

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={Tags}
        title={t('menus.organizationUnitKinds')}
        subtitle={t('organizationUnitKinds.subtitle')}
        action={
          <Link to={`${base}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('organizationUnitKinds.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('organizationUnitKinds.search')}
        placeholder={t('organizationUnitKinds.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('organizationUnitKinds.noResults') : t('organizationUnitKinds.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="name"
                label={t('organizationUnitKinds.name')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="unitCount"
                label={t('organizationUnitKinds.unitCount')}
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
                <td className="px-4 py-3">{formatNumber(item._count?.units ?? 0, locale)}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={organizationUnitKindPath(item.id)}
                    editTo={`${organizationUnitKindPath(item.id)}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('organizationUnitKinds.confirmDelete'),
                        successMessage: t('organizationUnitKinds.deleted'),
                        path: `/organization/unit-kinds/${item.id}`,
                        queryKey: ['organization-unit-kinds'],
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

export function OrganizationUnitKindCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className={formShellClassName}>
      <PageHeader icon={Tags} title={t('organizationUnitKinds.create')} subtitle={t('organizationUnitKinds.createSubtitle')} />
      <OrganizationUnitKindForm
        onSubmit={async (payload) => {
          const { data } = await api.post<{ id: string }>('/organization/unit-kinds', payload)
          toast.success(t('organizationUnitKinds.created'))
          navigate(organizationUnitKindPath(data.id))
        }}
      />
    </div>
  )
}

export function OrganizationUnitKindEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['organization-unit-kind', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnitKind>(`/organization/unit-kinds/${id}`)
      return data
    },
  })
  if (!query.data || !id) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Tags}
        title={t('organizationUnitKinds.edit')}
        subtitle={<EntityNameSubtitle name={query.data.name} icon={Tags} />}
      />
      <OrganizationUnitKindForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/organization/unit-kinds/${id}`, payload)
          toast.success(t('organizationUnitKinds.updated'))
          navigate(organizationUnitKindPath(id))
        }}
      />
    </div>
  )
}

export function OrganizationUnitKindDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['organization-unit-kind', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnitKind>(`/organization/unit-kinds/${id}`)
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
        icon={Tags}
        title={t('organizationUnitKinds.details')}
        subtitle={<EntityNameSubtitle name={item.name} icon={Tags} />}
      />
      <FormCard icon={Tags} title={item.name}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Tags}>{t('organizationUnitKinds.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Type} label={t('organizationUnitKinds.name')} value={item.name} tone="teal" />
            <FormFactTile
              icon={Building2}
              label={t('organizationUnitKinds.unitCount')}
              value={formatNumber(item._count?.units ?? 0, locale)}
              tone="mint"
            />
          </div>
          <DetailActions
            editTo={`${organizationUnitKindPath(id)}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('organizationUnitKinds.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('organizationUnitKinds.confirmDelete'),
                successMessage: t('organizationUnitKinds.deleted'),
                path: `/organization/unit-kinds/${id}`,
                queryKey: ['organization-unit-kinds'],
                onDeleted: () => navigate(organizationUnitKindsPath()),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
