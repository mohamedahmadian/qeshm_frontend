import { Building2, MapPin, MessageCircle, Phone, Plus, Send, Share2, Store, Type, Users, UtensilsCrossed } from 'lucide-react'
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
  listShellClassName,
  userFormShellClassName,
} from '../../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../../components/ui/FormLayout'
import { OsmMapPicker } from '../../../components/ui/OsmMapPicker'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { useListParams } from '../../../hooks/useListParams'
import { useListSort } from '../../../hooks/useListSort'
import { api } from '../../../lib/api'
import { formatNumber, localizeDigits } from '../../../lib/datetime'
import type { OrganizationUnit, Paginated } from '../../../types/app'
import { organizationEmployeesPath, organizationUnitPath, organizationUnitRestaurantsPath, organizationUnitsPath } from '../organization-paths'
import { OrganizationUnitForm } from './OrganizationUnitForm'

export function OrganizationUnitListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['organization-units', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<OrganizationUnit>>('/organization/units', {
        params: { page, ...(q ? { q } : {}), ...sortParams },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []
  const base = organizationUnitsPath()

  return (
    <div className={listShellClassName}>
      <PageHeader
        title={t('menus.organizationUnits')}
        subtitle={t('organizationUnits.subtitle')}
        action={
          <Link to={`${base}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('organizationUnits.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('organizationUnits.search')}
        placeholder={t('organizationUnits.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('organizationUnits.noResults') : t('organizationUnits.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="name" label={t('organizationUnits.name')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="phone" label={t('organizationUnits.phone')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh
                column="nutritionRep"
                label={t('organizationUnits.nutritionRep')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="employeeCount"
                label={t('organizationUnits.employeeCount')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="restaurantCount"
                label={t('organizationUnits.restaurantCount')}
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
                <td className="px-4 py-3">
                  {item.phone ? <span className="digit-field" dir="ltr">{localizeDigits(item.phone, locale)}</span> : '—'}
                </td>
                <td className="px-4 py-3">{item.nutritionRep?.fullName || '—'}</td>
                <td className="px-4 py-3">{formatNumber(item._count?.employees ?? 0, locale)}</td>
                <td className="px-4 py-3">{formatNumber(item._count?.restaurants ?? 0, locale)}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={organizationUnitPath(item.id)}
                    showView={false}
                    extra={
                      <Link to={`${organizationEmployeesPath()}?orgUnitId=${item.id}`}>
                        <Button type="button" variant="soft">
                          <Users className="size-4" aria-hidden />
                          {t('employees.manage')}
                        </Button>
                      </Link>
                    }
                    editTo={`${organizationUnitPath(item.id)}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('organizationUnits.confirmDelete'),
                        successMessage: t('organizationUnits.deleted'),
                        path: `/organization/units/${item.id}`,
                        queryKey: ['organization-units'],
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

export function OrganizationUnitCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className={userFormShellClassName}>
      <PageHeader title={t('organizationUnits.create')} subtitle={t('organizationUnits.createSubtitle')} />
      <OrganizationUnitForm
        onSubmit={async (payload) => {
          const { data } = await api.post<{ id: string }>('/organization/units', payload)
          toast.success(t('organizationUnits.created'))
          navigate(organizationUnitPath(data.id))
        }}
      />
    </div>
  )
}

export function OrganizationUnitEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['organization-unit', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnit>(`/organization/units/${id}`)
      return data
    },
  })
  if (!query.data || !id) {
    return <LoadingState />
  }
  return (
    <div className={userFormShellClassName}>
      <PageHeader
        title={t('organizationUnits.edit')}
        subtitle={<EntityNameSubtitle name={query.data.name} icon={Building2} />}
      />
      <OrganizationUnitForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/organization/units/${id}`, payload)
          toast.success(t('organizationUnits.updated'))
          navigate(organizationUnitPath(id))
        }}
      />
    </div>
  )
}

export function OrganizationUnitDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['organization-unit', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnit>(`/organization/units/${id}`)
      return data
    },
  })
  const item = query.data
  if (!item || !id) {
    return <LoadingState />
  }
  const empty = '—'
  const coords =
    item.latitude != null && item.longitude != null
      ? localizeDigits(`${item.latitude}, ${item.longitude}`, locale)
      : empty

  return (
    <div className={userFormShellClassName}>
      <PageHeader
        title={t('organizationUnits.details')}
        subtitle={<EntityNameSubtitle name={item.name} icon={Building2} />}
      />
      <FormCard icon={Building2} title={item.name}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Building2}>{t('organizationUnits.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Type} label={t('organizationUnits.name')} value={item.name} tone="teal" />
            <FormFactTile icon={Phone} label={t('organizationUnits.phone')} copyValue={item.phone} tone="mint" />
            <FormFactTile
              icon={UtensilsCrossed}
              label={t('organizationUnits.nutritionRep')}
              value={item.nutritionRep?.fullName || empty}
              empty={!item.nutritionRep}
            />
            <FormFactTile
              icon={Users}
              label={t('organizationUnits.employeeCount')}
              value={formatNumber(item._count?.employees ?? 0, locale)}
            />
            <FormFactTile
              icon={Store}
              label={t('organizationUnits.restaurantCount')}
              value={formatNumber(item._count?.restaurants ?? 0, locale)}
              tone="mint"
            />
            <FormFactTile
              icon={MapPin}
              label={t('organizationUnits.address')}
              value={item.address || empty}
              empty={!item.address}
              className="sm:col-span-2"
            />
          </div>
          <FormSectionTitle icon={MapPin}>{t('organizationUnits.locationSection')}</FormSectionTitle>
          <FormFactTile
            icon={MapPin}
            label={t('organizationUnits.coordinates')}
            value={coords}
            empty={item.latitude == null || item.longitude == null}
          />
          {item.latitude != null && item.longitude != null ? (
            <div className="overflow-hidden rounded-2xl ring-1 ring-teal-100">
              <OsmMapPicker
                variant="always"
                readOnly
                latitude={String(item.latitude)}
                longitude={String(item.longitude)}
                onChange={() => undefined}
                heightClass="h-56"
              />
            </div>
          ) : null}
          <FormSectionTitle icon={Share2}>{t('organizationUnits.socialSection')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={MessageCircle} label={t('organizationUnits.eitaa')} value={item.eitaa || empty} empty={!item.eitaa} tone="teal" />
            <FormFactTile icon={MessageCircle} label={t('organizationUnits.bale')} value={item.bale || empty} empty={!item.bale} tone="mint" />
            <FormFactTile icon={MessageCircle} label={t('organizationUnits.rubika')} value={item.rubika || empty} empty={!item.rubika} />
            <FormFactTile icon={Share2} label={t('organizationUnits.instagram')} value={item.instagram || empty} empty={!item.instagram} tone="teal" />
            <FormFactTile icon={Send} label={t('organizationUnits.telegram')} value={item.telegram || empty} empty={!item.telegram} tone="mint" />
            <FormFactTile icon={Phone} label={t('organizationUnits.whatsapp')} value={item.whatsapp || empty} empty={!item.whatsapp} />
          </div>
          <DetailActions
            editTo={`${organizationUnitPath(id)}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('organizationUnits.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('organizationUnits.confirmDelete'),
                successMessage: t('organizationUnits.deleted'),
                path: `/organization/units/${id}`,
                queryKey: ['organization-units'],
                onDeleted: () => navigate(organizationUnitsPath()),
              })
            }
            extra={
              <>
                <Link to={organizationUnitRestaurantsPath(id)}>
                  <Button type="button" variant="soft">
                    <Store className="size-4" aria-hidden />
                    {t('organizationUnitRestaurants.manage')}
                  </Button>
                </Link>
                <Link to={`${organizationEmployeesPath()}?orgUnitId=${id}`}>
                  <Button type="button" variant="soft">
                    <Users className="size-4" aria-hidden />
                    {t('employees.manage')}
                  </Button>
                </Link>
              </>
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
