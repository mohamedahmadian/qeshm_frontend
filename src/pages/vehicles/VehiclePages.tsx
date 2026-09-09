import {
  Building2,
  Car,
  FileBadge2,
  Hash,
  Handshake,
  Palette,
  Plus,
  ScrollText,
  Settings2,
  Tags,
  Undo2,
  UserRound,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { DateText } from '../../components/ui/DateText'
import {
  Button,
  DetailActions,
  EntityNameSubtitle,
  FormField,
  LoadingState,
  PageHeader,
  formShellClassName,
  listShellClassName,
} from '../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../components/ui/FormLayout'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../components/ui/ListControls'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import { formatNumber, localizeDigits } from '../../lib/datetime'
import type { OrganizationUnit, Paginated, Vehicle, VehicleBrand } from '../../types/app'
import { vehicleStatusOrder, vehicleTypeOrder } from '../../types/app'
import { VehicleForm } from './VehicleForm'
import { vehicleAssignmentsPath, vehicleDisplayName, vehiclePath, vehiclesPath } from './vehicle-paths'

export function VehicleListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const type = searchParams.get('type') ?? ''
  const status = searchParams.get('status') ?? ''
  const organizationUnitId = searchParams.get('organizationUnitId') ?? ''
  const brandId = searchParams.get('brandId') ?? ''
  const filtersActive = Boolean(type || status || organizationUnitId || brandId)

  const units = useQuery({
    queryKey: ['organization-units', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnit[]>('/organization/units')
      return data
    },
  })
  const brands = useQuery({
    queryKey: ['vehicle-brands', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<VehicleBrand[]>('/vehicle-brands')
      return data
    },
  })
  const query = useQuery({
    queryKey: ['vehicles', q, page, type, status, organizationUnitId, brandId, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Vehicle>>('/vehicles', {
        params: {
          page,
          ...(q ? { q } : {}),
          ...(type ? { type } : {}),
          ...(status ? { status } : {}),
          ...(organizationUnitId ? { organizationUnitId } : {}),
          ...(brandId ? { brandId } : {}),
          ...sortParams,
        },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []
  const base = vehiclesPath()

  return (
    <div className={listShellClassName}>
      <PageHeader
        title={t('menus.vehicles')}
        subtitle={t('vehicles.subtitle')}
        action={
          <Link to={`${base}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('vehicles.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('vehicles.search')}
        placeholder={t('vehicles.searchPlaceholder')}
        filtersActive={filtersActive}
        extraClassName="sm:grid-cols-2 xl:grid-cols-4"
        extra={
          <>
            <FormField icon={Tags} label={t('vehicles.brand')} htmlFor="filterVehicleBrand">
              <SearchSelect
                id="filterVehicleBrand"
                value={brandId}
                onChange={(next) => setParams({ brandId: next || undefined }, { resetPage: true })}
                placeholder={t('vehicles.filterBrand')}
                options={[
                  { value: '', label: t('vehicles.allBrands') },
                  ...(brands.data ?? []).map((item) => ({ value: item.id, label: item.name })),
                ]}
              />
            </FormField>
            <FormField icon={Car} label={t('vehicles.type')} htmlFor="filterVehicleType">
              <SearchSelect
                id="filterVehicleType"
                value={type}
                onChange={(next) => setParams({ type: next || undefined }, { resetPage: true })}
                placeholder={t('vehicles.filterType')}
                options={[
                  { value: '', label: t('vehicles.allTypes') },
                  ...vehicleTypeOrder.map((value) => ({
                    value,
                    label: t(`vehicles.types.${value}`),
                  })),
                ]}
              />
            </FormField>
            <FormField icon={Settings2} label={t('vehicles.status')} htmlFor="filterVehicleStatus">
              <SearchSelect
                id="filterVehicleStatus"
                value={status}
                onChange={(next) => setParams({ status: next || undefined }, { resetPage: true })}
                placeholder={t('vehicles.filterStatus')}
                options={[
                  { value: '', label: t('vehicles.allStatuses') },
                  ...vehicleStatusOrder.map((value) => ({
                    value,
                    label: t(`vehicles.statuses.${value}`),
                  })),
                ]}
              />
            </FormField>
            <FormField icon={Building2} label={t('vehicles.currentUnit')} htmlFor="filterVehicleUnit">
              <SearchSelect
                id="filterVehicleUnit"
                value={organizationUnitId}
                onChange={(next) =>
                  setParams({ organizationUnitId: next || undefined }, { resetPage: true })
                }
                placeholder={t('vehicles.filterUnit')}
                options={[
                  { value: '', label: t('vehicles.allUnits') },
                  ...(units.data ?? []).map((unit) => ({ value: unit.id, label: unit.name })),
                ]}
              />
            </FormField>
          </>
        }
      />
      <TableCard
        loading={query.isLoading}
        empty={q || filtersActive ? t('vehicles.noResults') : t('vehicles.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="assetCode" label={t('vehicles.assetCode')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="plate" label={t('vehicles.plate')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="type" label={t('vehicles.type')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="brand" label={t('vehicles.brand')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="model" label={t('vehicles.model')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="status" label={t('vehicles.status')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <th className="px-4 py-3 text-start">{t('vehicles.currentUnit')}</th>
              <th className="px-4 py-3 text-start">{t('vehicles.currentPerson')}</th>
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <span className="digit-field" dir="ltr">{localizeDigits(item.assetCode, locale)}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="digit-field" dir="ltr">{localizeDigits(item.plate, locale)}</span>
                </td>
                <td className="px-4 py-3">{t(`vehicles.types.${item.type}`)}</td>
                <td className="px-4 py-3">{item.brand.name}</td>
                <td className="px-4 py-3">{item.model}</td>
                <td className="px-4 py-3">{t(`vehicles.statuses.${item.status}`)}</td>
                <td className="px-4 py-3">{item.currentAssignment?.organizationUnit?.name || '—'}</td>
                <td className="px-4 py-3">{item.currentAssignment?.person?.fullName || '—'}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={vehiclePath(item.id)}
                    editTo={`${vehiclePath(item.id)}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('vehicles.confirmDelete'),
                        successMessage: t('vehicles.deleted'),
                        path: `/vehicles/${item.id}`,
                        queryKey: ['vehicles'],
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

export function VehicleCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className={formShellClassName}>
      <PageHeader title={t('vehicles.create')} subtitle={t('vehicles.createSubtitle')} />
      <VehicleForm
        onSubmit={async (payload) => {
          const { data } = await api.post<{ id: string }>('/vehicles', payload)
          toast.success(t('vehicles.created'))
          navigate(vehiclePath(data.id))
        }}
      />
    </div>
  )
}

export function VehicleEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['vehicle', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<Vehicle>(`/vehicles/${id}`)
      return data
    },
  })
  if (!query.data || !id) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        title={t('vehicles.edit')}
        subtitle={<EntityNameSubtitle name={vehicleDisplayName(query.data)} icon={Car} />}
      />
      <VehicleForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/vehicles/${id}`, payload)
          toast.success(t('vehicles.updated'))
          navigate(vehiclePath(id))
        }}
      />
    </div>
  )
}

export function VehicleDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['vehicle', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<Vehicle>(`/vehicles/${id}`)
      return data
    },
  })
  const item = query.data
  if (!item || !id) {
    return <LoadingState />
  }
  const empty = '—'
  const assignment = item.currentAssignment

  return (
    <div className={formShellClassName}>
      <PageHeader
        title={t('vehicles.details')}
        subtitle={<EntityNameSubtitle name={vehicleDisplayName(item)} icon={Car} />}
      />
      <FormCard icon={Car} title={vehicleDisplayName(item)}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Car}>{t('vehicles.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={FileBadge2}
              label={t('vehicles.assetCode')}
              value={localizeDigits(item.assetCode, locale)}
              tone="teal"
            />
            <FormFactTile
              icon={Hash}
              label={t('vehicles.plate')}
              value={localizeDigits(item.plate, locale)}
              tone="mint"
            />
            <FormFactTile icon={Car} label={t('vehicles.type')} value={t(`vehicles.types.${item.type}`)} />
            <FormFactTile icon={Tags} label={t('vehicles.brand')} value={item.brand.name} tone="teal" />
            <FormFactTile icon={Car} label={t('vehicles.model')} value={item.model} tone="mint" />
            <FormFactTile
              icon={Palette}
              label={t('vehicles.color')}
              value={item.color || empty}
              empty={!item.color}
            />
            <FormFactTile
              icon={Hash}
              label={t('vehicles.year')}
              value={item.year != null ? formatNumber(item.year, locale) : empty}
              empty={item.year == null}
              tone="teal"
            />
            <FormFactTile
              icon={Settings2}
              label={t('vehicles.status')}
              value={t(`vehicles.statuses.${item.status}`)}
              tone="mint"
            />
            <FormFactTile
              icon={Hash}
              label={t('vehicles.chassisNumber')}
              value={item.chassisNumber ? localizeDigits(item.chassisNumber, locale) : empty}
              empty={!item.chassisNumber}
            />
            <FormFactTile
              icon={Hash}
              label={t('vehicles.engineNumber')}
              value={item.engineNumber ? localizeDigits(item.engineNumber, locale) : empty}
              empty={!item.engineNumber}
            />
            <FormFactTile
              icon={ScrollText}
              label={t('vehicles.description')}
              value={item.description || empty}
              empty={!item.description}
              className="sm:col-span-2"
            />
          </div>
          <FormSectionTitle icon={Handshake}>{t('vehicles.currentAssignment')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={Building2}
              label={t('vehicles.currentUnit')}
              value={assignment?.organizationUnit?.name || empty}
              empty={!assignment?.organizationUnit}
              tone="teal"
            />
            <FormFactTile
              icon={UserRound}
              label={t('vehicles.currentPerson')}
              value={assignment?.person?.fullName || empty}
              empty={!assignment?.person}
              tone="mint"
            />
            <FormFactTile
              icon={Undo2}
              label={t('vehicleAssignments.status')}
              value={assignment ? t(`vehicleAssignments.statuses.${assignment.status}`) : empty}
              empty={!assignment}
            />
            <FormFactTile
              icon={Handshake}
              label={t('vehicleAssignments.type')}
              value={assignment ? t(`vehicleAssignments.types.${assignment.type}`) : empty}
              empty={!assignment}
            />
            <FormFactTile
              icon={Hash}
              label={t('vehicleAssignments.startDate')}
              value={assignment ? <DateText value={assignment.startDate} /> : empty}
              empty={!assignment}
            />
          </div>
          <DetailActions
            editTo={`${vehiclePath(id)}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('vehicles.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('vehicles.confirmDelete'),
                successMessage: t('vehicles.deleted'),
                path: `/vehicles/${id}`,
                queryKey: ['vehicles'],
                onDeleted: () => navigate(vehiclesPath()),
              })
            }
            extra={
              <Link to={vehicleAssignmentsPath(id)}>
                <Button type="button" variant="soft">
                  <Handshake className="size-4" aria-hidden />
                  {t('vehicleAssignments.manage')}
                </Button>
              </Link>
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
