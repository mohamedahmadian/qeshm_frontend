import { Building2, CalendarRange, Car, Handshake, Plus, ScrollText, Undo2, UserRound } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { DateText } from '../../../components/ui/DateText'
import {
  Button,
  DetailActions,
  EntityNameSubtitle,
  FormField,
  LoadingState,
  PageHeader,
  formShellClassName,
  listShellClassName,
} from '../../../components/ui/Form'
import { FormCard, FormEmptyHint, FormFactTile, FormSectionTitle } from '../../../components/ui/FormLayout'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../../components/ui/ListControls'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { useListParams } from '../../../hooks/useListParams'
import { useListSort } from '../../../hooks/useListSort'
import { api } from '../../../lib/api'
import type { Paginated, Vehicle, VehicleAssignment } from '../../../types/app'
import { vehicleAssignmentStatusOrder } from '../../../types/app'
import {
  vehicleAssignmentPath,
  vehicleAssignmentReturnPath,
  vehicleAssignmentsPath,
  vehicleDisplayName,
} from '../vehicle-paths'
import { VehicleAssignmentForm } from './VehicleAssignmentForm'
import { VehicleAssignmentReturnForm } from './VehicleAssignmentReturnForm'

function assignmentTitle(item: VehicleAssignment, empty: string) {
  return item.person?.fullName || item.organizationUnit?.name || empty
}

function useVehicle() {
  const { id: vehicleId } = useParams()
  const query = useQuery({
    queryKey: ['vehicle', vehicleId],
    enabled: Boolean(vehicleId),
    queryFn: async () => {
      const { data } = await api.get<Vehicle>(`/vehicles/${vehicleId}`)
      return data
    },
  })
  return { vehicleId, vehicle: query.data }
}

export function VehicleAssignmentListPage() {
  const { t } = useTranslation()
  const { vehicleId, vehicle } = useVehicle()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const status = searchParams.get('status') ?? ''
  const query = useQuery({
    queryKey: ['vehicle-assignments', vehicleId, q, page, status, sortBy, sortDir],
    enabled: Boolean(vehicleId),
    queryFn: async () => {
      const { data } = await api.get<Paginated<VehicleAssignment>>(
        `/vehicles/${vehicleId}/assignments`,
        { params: { page, ...(q ? { q } : {}), ...(status ? { status } : {}), ...sortParams } },
      )
      return data
    },
  })
  if (!vehicle || !vehicleId) {
    return <LoadingState />
  }
  const rows = query.data?.items ?? []
  const base = vehicleAssignmentsPath(vehicleId)

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={Handshake}
        title={t('vehicleAssignments.title')}
        subtitle={<EntityNameSubtitle name={vehicleDisplayName(vehicle)} icon={Car} />}
        action={
          <Link to={`${base}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('vehicleAssignments.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('vehicleAssignments.search')}
        placeholder={t('vehicleAssignments.searchPlaceholder')}
        filtersActive={Boolean(status)}
        extra={
          <FormField icon={Undo2} label={t('vehicleAssignments.status')} htmlFor="filterAssignmentStatus">
            <SearchSelect
              id="filterAssignmentStatus"
              value={status}
              onChange={(next) => setParams({ status: next || undefined }, { resetPage: true })}
              placeholder={t('vehicleAssignments.filterStatus')}
              options={[
                { value: '', label: t('vehicleAssignments.allStatuses') },
                ...vehicleAssignmentStatusOrder.map((value) => ({
                  value,
                  label: t(`vehicleAssignments.statuses.${value}`),
                })),
              ]}
            />
          </FormField>
        }
      />
      <TableCard
        loading={query.isLoading}
        empty={q || status ? t('vehicleAssignments.noResults') : t('vehicleAssignments.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="type" label={t('vehicleAssignments.type')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh
                column="organizationUnit"
                label={t('vehicleAssignments.organizationUnit')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh column="person" label={t('vehicleAssignments.person')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="status" label={t('vehicleAssignments.status')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="startDate" label={t('vehicleAssignments.startDate')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="returnedAt" label={t('vehicleAssignments.returnedAt')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">{t(`vehicleAssignments.types.${item.type}`)}</td>
                <td className="px-4 py-3">{item.organizationUnit?.name || '—'}</td>
                <td className="px-4 py-3">{item.person?.fullName || '—'}</td>
                <td className="px-4 py-3">{t(`vehicleAssignments.statuses.${item.status}`)}</td>
                <td className="px-4 py-3"><DateText value={item.startDate} /></td>
                <td className="px-4 py-3">
                  {item.returnedAt ? <DateText value={item.returnedAt} /> : '—'}
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={vehicleAssignmentPath(vehicleId, item.id)}
                    editTo={`${vehicleAssignmentPath(vehicleId, item.id)}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('vehicleAssignments.confirmDelete'),
                        successMessage: t('vehicleAssignments.deleted'),
                        path: `/vehicles/${vehicleId}/assignments/${item.id}`,
                        queryKey: ['vehicle-assignments'],
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

export function VehicleAssignmentCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { vehicleId, vehicle } = useVehicle()
  if (!vehicle || !vehicleId) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Handshake}
        title={t('vehicleAssignments.create')}
        subtitle={<EntityNameSubtitle name={vehicleDisplayName(vehicle)} icon={Car} />}
      />
      <VehicleAssignmentForm
        onSubmit={async (payload) => {
          const { data } = await api.post<{ id: string }>(
            `/vehicles/${vehicleId}/assignments`,
            payload,
          )
          toast.success(t('vehicleAssignments.created'))
          navigate(vehicleAssignmentPath(vehicleId, data.id))
        }}
      />
    </div>
  )
}

export function VehicleAssignmentEditPage() {
  const { t } = useTranslation()
  const { assignmentId } = useParams()
  const navigate = useNavigate()
  const { vehicleId } = useVehicle()
  const query = useQuery({
    queryKey: ['vehicle-assignment', vehicleId, assignmentId],
    enabled: Boolean(vehicleId && assignmentId),
    queryFn: async () => {
      const { data } = await api.get<VehicleAssignment>(
        `/vehicles/${vehicleId}/assignments/${assignmentId}`,
      )
      return data
    },
  })
  if (!query.data || !vehicleId || !assignmentId) {
    return <LoadingState />
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Handshake}
        title={t('vehicleAssignments.edit')}
        subtitle={<EntityNameSubtitle name={assignmentTitle(query.data, query.data.vehicle.plate)} icon={Handshake} />}
      />
      <VehicleAssignmentForm
        initial={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/vehicles/${vehicleId}/assignments/${assignmentId}`, payload)
          toast.success(t('vehicleAssignments.updated'))
          navigate(vehicleAssignmentPath(vehicleId, assignmentId))
        }}
      />
    </div>
  )
}

export function VehicleAssignmentDetailPage() {
  const { t } = useTranslation()
  const { assignmentId } = useParams()
  const navigate = useNavigate()
  const { vehicleId, vehicle } = useVehicle()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['vehicle-assignment', vehicleId, assignmentId],
    enabled: Boolean(vehicleId && assignmentId),
    queryFn: async () => {
      const { data } = await api.get<VehicleAssignment>(
        `/vehicles/${vehicleId}/assignments/${assignmentId}`,
      )
      return data
    },
  })
  const item = query.data
  if (!item || !vehicle || !vehicleId || !assignmentId) {
    return <LoadingState />
  }
  const empty = '—'
  const name = assignmentTitle(item, vehicle.plate)

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Handshake}
        title={t('vehicleAssignments.details')}
        subtitle={<EntityNameSubtitle name={name} icon={Handshake} />}
      />
      <FormCard icon={Handshake} title={name}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Handshake}>{t('vehicleAssignments.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={Undo2}
              label={t('vehicleAssignments.status')}
              value={t(`vehicleAssignments.statuses.${item.status}`)}
              tone={item.status === 'LENT' ? 'teal' : 'ink'}
            />
            <FormFactTile
              icon={Handshake}
              label={t('vehicleAssignments.type')}
              value={t(`vehicleAssignments.types.${item.type}`)}
              tone="mint"
            />
            <FormFactTile
              icon={Building2}
              label={t('vehicleAssignments.organizationUnit')}
              value={item.organizationUnit?.name || empty}
              empty={!item.organizationUnit}
              tone="mint"
            />
            <FormFactTile
              icon={UserRound}
              label={t('vehicleAssignments.person')}
              value={item.person?.fullName || empty}
              empty={!item.person}
            />
            <FormFactTile
              icon={CalendarRange}
              label={t('vehicleAssignments.startDate')}
              value={<DateText value={item.startDate} />}
              tone="teal"
            />
            <FormFactTile
              icon={CalendarRange}
              label={t('vehicleAssignments.endDate')}
              value={item.endDate ? <DateText value={item.endDate} /> : empty}
              empty={!item.endDate}
              tone="mint"
            />
            <FormFactTile
              icon={CalendarRange}
              label={t('vehicleAssignments.returnedAt')}
              value={item.returnedAt ? <DateText value={item.returnedAt} /> : empty}
              empty={!item.returnedAt}
            />
            <FormFactTile
              icon={ScrollText}
              label={t('vehicleAssignments.description')}
              value={item.description || empty}
              empty={!item.description}
              className="sm:col-span-2"
            />
          </div>
          <DetailActions
            editTo={`${vehicleAssignmentPath(vehicleId, assignmentId)}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('vehicleAssignments.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('vehicleAssignments.confirmDelete'),
                successMessage: t('vehicleAssignments.deleted'),
                path: `/vehicles/${vehicleId}/assignments/${assignmentId}`,
                queryKey: ['vehicle-assignments'],
                onDeleted: () => navigate(vehicleAssignmentsPath(vehicleId)),
              })
            }
            extraItems={
              item.status === 'LENT'
                ? [
                    {
                      to: vehicleAssignmentReturnPath(vehicleId, assignmentId),
                      icon: Undo2,
                      label: t('vehicleAssignments.return'),
                    },
                  ]
                : undefined
            }
          />
        </div>
      </FormCard>
    </div>
  )
}

export function VehicleAssignmentReturnPage() {
  const { t } = useTranslation()
  const { assignmentId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { vehicleId, vehicle } = useVehicle()
  const query = useQuery({
    queryKey: ['vehicle-assignment', vehicleId, assignmentId],
    enabled: Boolean(vehicleId && assignmentId),
    queryFn: async () => {
      const { data } = await api.get<VehicleAssignment>(
        `/vehicles/${vehicleId}/assignments/${assignmentId}`,
      )
      return data
    },
  })
  if (!query.data || !vehicle || !vehicleId || !assignmentId) {
    return <LoadingState />
  }
  if (query.data.status === 'RETURNED') {
    return (
      <div className={formShellClassName}>
        <PageHeader
          icon={Handshake}
          title={t('vehicleAssignments.return')}
          subtitle={<EntityNameSubtitle name={assignmentTitle(query.data, vehicle.plate)} icon={Undo2} />}
        />
        <FormEmptyHint>{t('vehicleAssignments.alreadyReturned')}</FormEmptyHint>
      </div>
    )
  }
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Handshake}
        title={t('vehicleAssignments.return')}
        subtitle={<EntityNameSubtitle name={assignmentTitle(query.data, vehicle.plate)} icon={Undo2} />}
      />
      <VehicleAssignmentReturnForm
        assignment={query.data}
        onSubmit={async (payload) => {
          await api.patch(`/vehicles/${vehicleId}/assignments/${assignmentId}/return`, payload)
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['vehicle-assignment', vehicleId, assignmentId] }),
            queryClient.invalidateQueries({ queryKey: ['vehicle-assignments'] }),
            queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] }),
            queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
          ])
          toast.success(t('vehicleAssignments.returned'))
          navigate(vehicleAssignmentPath(vehicleId, assignmentId))
        }}
      />
    </div>
  )
}
