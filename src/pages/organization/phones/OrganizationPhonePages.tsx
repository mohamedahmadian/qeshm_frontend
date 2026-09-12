import { Landmark, Phone, Plus, ScrollText, Type } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { localizeDigits } from '../../../lib/datetime'
import type { OrganizationPhone, Paginated } from '../../../types/app'
import { organizationNewPath, organizationPath, organizationPhonePath, organizationPhonesPath } from '../organization-paths'
import { useOrganization } from '../useOrganization'
import { OrganizationPhoneForm } from './OrganizationPhoneForm'

function useOrgReady() {
  const query = useOrganization()
  return {
    loading: query.isLoading,
    missing: query.isSuccess && !query.data,
    organization: query.data,
  }
}

export function OrganizationPhoneListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { loading, missing, organization } = useOrgReady()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['organization', 'phones', q, page, sortBy, sortDir],
    enabled: Boolean(organization),
    queryFn: async () => {
      const { data } = await api.get<Paginated<OrganizationPhone>>('/organization/phones', {
        params: { page, ...(q ? { q } : {}), ...sortParams },
      })
      return data
    },
  })

  if (loading) {
    return <LoadingState />
  }
  if (missing || !organization) {
    return <Navigate to={organizationNewPath()} replace />
  }

  const rows = query.data?.items ?? []
  const base = organizationPhonesPath()

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={Phone}
        title={t('organizationPhones.title')}
        subtitle={<EntityNameSubtitle name={organization.name} icon={Landmark} />}
        backTo={organizationPath()}
        action={
          <Link to={`${base}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('organizationPhones.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('organizationPhones.search')}
        placeholder={t('organizationPhones.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('organizationPhones.noResults') : t('organizationPhones.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="title"
                label={t('organizationPhones.titleField')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="phone"
                label={t('organizationPhones.phone')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="description"
                label={t('organizationPhones.description')}
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
                <td className="px-4 py-3">{item.title}</td>
                <td className="px-4 py-3">
                  <span className="digit-field" dir="ltr">
                    {localizeDigits(item.phone, locale)}
                  </span>
                </td>
                <td className="px-4 py-3">{item.description || '—'}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={organizationPhonePath(item.id)}
                    editTo={`${organizationPhonePath(item.id)}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('organizationPhones.confirmDelete'),
                        successMessage: t('organizationPhones.deleted'),
                        path: `/organization/phones/${item.id}`,
                        queryKey: ['organization'],
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

export function OrganizationPhoneCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { loading, missing, organization } = useOrgReady()
  if (loading) {
    return <LoadingState />
  }
  if (missing || !organization) {
    return <Navigate to={organizationNewPath()} replace />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Phone}
        title={t('organizationPhones.create')}
        subtitle={<EntityNameSubtitle name={organization.name} icon={Landmark} />}
      />
      <OrganizationPhoneForm
        onSubmit={async (payload) => {
          await api.post('/organization/phones', payload)
          await queryClient.invalidateQueries({ queryKey: ['organization'] })
          toast.success(t('organizationPhones.created'))
          navigate(organizationPhonesPath())
        }}
      />
    </div>
  )
}

export function OrganizationPhoneEditPage() {
  const { t } = useTranslation()
  const { phoneId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { loading, missing, organization } = useOrgReady()
  const query = useQuery({
    queryKey: ['organization', 'phone', phoneId],
    enabled: Boolean(phoneId) && Boolean(organization),
    queryFn: async () => {
      const { data } = await api.get<OrganizationPhone>(`/organization/phones/${phoneId}`)
      return data
    },
  })
  if (loading || (organization && phoneId && query.isLoading)) {
    return <LoadingState />
  }
  if (missing || !organization) {
    return <Navigate to={organizationNewPath()} replace />
  }
  if (!query.data || !phoneId) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Phone}
        title={t('organizationPhones.edit')}
        subtitle={<EntityNameSubtitle name={query.data.title} icon={Phone} />}
      />
      <OrganizationPhoneForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/organization/phones/${phoneId}`, payload)
          await queryClient.invalidateQueries({ queryKey: ['organization'] })
          toast.success(t('organizationPhones.updated'))
          navigate(organizationPhonesPath())
        }}
      />
    </div>
  )
}

export function OrganizationPhoneDetailPage() {
  const { t } = useTranslation()
  const { phoneId } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const { loading, missing, organization } = useOrgReady()
  const query = useQuery({
    queryKey: ['organization', 'phone', phoneId],
    enabled: Boolean(phoneId) && Boolean(organization),
    queryFn: async () => {
      const { data } = await api.get<OrganizationPhone>(`/organization/phones/${phoneId}`)
      return data
    },
  })
  const item = query.data
  if (loading || (organization && phoneId && query.isLoading)) {
    return <LoadingState />
  }
  if (missing || !organization) {
    return <Navigate to={organizationNewPath()} replace />
  }
  if (!item || !phoneId) {
    return <LoadingState />
  }
  const base = organizationPhonesPath()
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Phone}
        title={t('organizationPhones.details')}
        subtitle={<EntityNameSubtitle name={item.title} icon={Phone} />}
      />
      <FormCard icon={Phone} title={item.title}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Phone}>{t('organizationPhones.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Type} label={t('organizationPhones.titleField')} value={item.title} tone="teal" />
            <FormFactTile
              icon={Phone}
              label={t('organizationPhones.phone')}
              copyValue={item.phone}
              tone="mint"
            />
            <FormFactTile
              icon={ScrollText}
              label={t('organizationPhones.description')}
              value={item.description || '—'}
              empty={!item.description}
              className="sm:col-span-2"
            />
          </div>
          <DetailActions
            editTo={`${organizationPhonePath(phoneId)}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('organizationPhones.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('organizationPhones.confirmDelete'),
                successMessage: t('organizationPhones.deleted'),
                path: `/organization/phones/${phoneId}`,
                queryKey: ['organization'],
                onDeleted: () => navigate(base),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
