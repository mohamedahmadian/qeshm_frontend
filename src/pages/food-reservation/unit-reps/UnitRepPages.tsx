import { Building2, Phone, Plus, Store, Tags, UserRoundCheck } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { OrganizationUnitRestaurantListPage } from '../../organization/units/restaurants/OrganizationUnitRestaurantPages'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { useListParams } from '../../../hooks/useListParams'
import { useListSort } from '../../../hooks/useListSort'
import { api } from '../../../lib/api'
import type { OrganizationUnit, Paginated, UnitRepresentative } from '../../../types/app'
import { unitRepPath, unitRepsPath } from '../food-paths'
import { UnitRepForm } from './UnitRepForm'

function useUnitRep(unitId?: string) {
  return useQuery({
    queryKey: ['unit-rep', unitId],
    enabled: Boolean(unitId),
    queryFn: async () => {
      const { data } = await api.get<UnitRepresentative>(`/food-reservation/unit-reps/${unitId}`)
      return data
    },
  })
}

export function UnitRepListPage() {
  const { t } = useTranslation()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['unit-reps', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<UnitRepresentative>>('/food-reservation/unit-reps', {
        params: { q: q || undefined, page, ...sortParams },
      })
      return data
    },
  })

  const rows = query.data?.items ?? []

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={Building2}
        title={t('menus.unitReps')}
        subtitle={t('unitReps.subtitle')}
        action={
          <Link to={`${unitRepsPath()}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('unitReps.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('unitReps.search')}
        placeholder={t('unitReps.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('unitReps.noResults') : t('unitReps.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="name"
                label={t('unitReps.unit')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="kind"
                label={t('organizationUnits.kind')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="representative"
                label={t('unitReps.representative')}
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
                <td className="px-4 py-3">{item.pathLabel || item.name}</td>
                <td className="px-4 py-3">{item.kind.name}</td>
                <td className="px-4 py-3">{item.nutritionRep?.fullName || '—'}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={unitRepPath(item.id)}
                    editTo={`${unitRepPath(item.id)}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('unitReps.confirmDelete'),
                        successMessage: t('unitReps.deleted'),
                        path: `/food-reservation/unit-reps/${item.id}`,
                        queryKey: ['unit-reps'],
                        onDeleted: () => {
                          void queryClient.invalidateQueries({ queryKey: ['unit-rep'] })
                          void queryClient.invalidateQueries({ queryKey: ['organization-units'] })
                        },
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

export function UnitRepCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const units = useQuery({
    queryKey: ['organization-units', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnit[]>('/organization/units')
      return data
    },
  })

  if (!units.data) {
    return <LoadingState />
  }

  return (
    <div className={formShellClassName}>
      <PageHeader icon={UserRoundCheck} title={t('unitReps.create')} subtitle={t('unitReps.createSubtitle')} />
      <UnitRepForm
        units={units.data}
        onSubmit={async (payload) => {
          await api.post('/food-reservation/unit-reps', payload)
          await queryClient.invalidateQueries({ queryKey: ['unit-reps'] })
          await queryClient.invalidateQueries({ queryKey: ['unit-rep'] })
          await queryClient.invalidateQueries({ queryKey: ['organization-units'] })
          toast.success(t('unitReps.created'))
          navigate(unitRepsPath())
        }}
      />
    </div>
  )
}

export function UnitRepEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const query = useUnitRep(id)

  if (!query.data || !id) {
    return <LoadingState />
  }

  const unit = query.data
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Building2}
        title={t('unitReps.edit')}
        subtitle={<EntityNameSubtitle name={unit.pathLabel || unit.name} icon={Building2} />}
      />
      <div className="space-y-6">
        <UnitRepForm
          initial={unit}
          onSubmit={async (payload) => {
            await api.patch(`/food-reservation/unit-reps/${id}`, {
              nutritionRepId: payload.nutritionRepId,
            })
            await queryClient.invalidateQueries({ queryKey: ['unit-reps'] })
            await queryClient.invalidateQueries({ queryKey: ['unit-rep'] })
            await queryClient.invalidateQueries({ queryKey: ['organization-units'] })
            toast.success(t('unitReps.updated'))
            navigate(unitRepsPath())
          }}
        />
        <FormCard
          icon={Store}
          title={t('organizationUnitRestaurants.title')}
          subtitle={t('organizationUnitRestaurants.subtitle')}
        >
          <div className="p-5 sm:p-6">
            <OrganizationUnitRestaurantListPage embedded unitId={id} />
          </div>
        </FormCard>
      </div>
    </div>
  )
}

export function UnitRepDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { confirmDelete } = useConfirmDelete()
  const query = useUnitRep(id)
  const unit = query.data

  if (!unit) {
    return <LoadingState />
  }

  const name = unit.pathLabel || unit.name
  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Building2}
        title={t('unitReps.details')}
        subtitle={<EntityNameSubtitle name={name} icon={Building2} />}
      />
      <FormCard icon={UserRoundCheck} title={name}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={UserRoundCheck}>{t('unitReps.section')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Building2} label={t('unitReps.unit')} value={name} tone="teal" />
            <FormFactTile icon={Tags} label={t('organizationUnits.kind')} value={unit.kind.name} tone="mint" />
            <FormFactTile
              icon={UserRoundCheck}
              label={t('unitReps.representative')}
              value={unit.nutritionRep?.fullName || '—'}
              empty={!unit.nutritionRep}
              tone="teal"
            />
            <FormFactTile
              icon={Phone}
              label={t('unitReps.phone')}
              value={unit.nutritionRep?.phone || '—'}
              copyValue={unit.nutritionRep?.phone}
              empty={!unit.nutritionRep?.phone}
              tone="mint"
            />
          </div>
          <DetailActions
            editTo={`${unitRepPath(unit.id)}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('unitReps.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('unitReps.confirmDelete'),
                successMessage: t('unitReps.deleted'),
                path: `/food-reservation/unit-reps/${unit.id}`,
                queryKey: ['unit-reps'],
                onDeleted: () => {
                  void queryClient.invalidateQueries({ queryKey: ['unit-rep'] })
                  void queryClient.invalidateQueries({ queryKey: ['organization-units'] })
                  navigate(unitRepsPath())
                },
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
