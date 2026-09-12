import { Plus, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
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
import { Button, PageHeader, formShellClassName, listShellClassName } from '../../../components/ui/Form'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { useListParams } from '../../../hooks/useListParams'
import { useListSort } from '../../../hooks/useListSort'
import { api } from '../../../lib/api'
import { localizeDigits } from '../../../lib/datetime'
import type { ManagedUser, OrganizationPosition, OrganizationUnit, Paginated } from '../../../types/app'
import { organizationEmployeePath, organizationEmployeesPath } from '../organization-paths'
import { EmployeeForm } from './EmployeeForm'

export function EmployeeListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const orgUnitId = searchParams.get('orgUnitId') ?? ''
  const positionId = searchParams.get('positionId') ?? ''

  const units = useQuery({
    queryKey: ['organization-units', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<OrganizationUnit[]>('/organization/units')
      return data
    },
  })
  const positions = useQuery({
    queryKey: ['organization-positions', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<OrganizationPosition[]>('/organization/positions')
      return data
    },
  })
  const query = useQuery({
    queryKey: ['employees', q, page, orgUnitId, positionId, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<ManagedUser>>('/users', {
        params: {
          page,
          employeesOnly: true,
          ...(q ? { q } : {}),
          ...(orgUnitId ? { orgUnitId } : {}),
          ...(positionId ? { positionId } : {}),
          ...sortParams,
        },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []
  const base = organizationEmployeesPath()

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={Users}
        title={t('menus.organizationEmployees')}
        subtitle={t('employees.subtitle')}
        action={
          <Link to={`${base}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('employees.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('employees.search')}
        placeholder={t('employees.searchPlaceholder')}
        filtersActive={Boolean(orgUnitId || positionId)}
        extra={
          <>
            <SearchSelect
              value={positionId}
              onChange={(next) => setParams({ positionId: next || undefined }, { resetPage: true })}
              placeholder={t('employees.filterPosition')}
              options={[
                { value: '', label: t('employees.allPositions') },
                ...(positions.data ?? []).map((item) => ({ value: item.id, label: item.name })),
              ]}
            />
            <SearchSelect
              value={orgUnitId}
              onChange={(next) => setParams({ orgUnitId: next || undefined }, { resetPage: true })}
              placeholder={t('employees.filterUnit')}
              options={[
                { value: '', label: t('employees.allUnits') },
                ...(units.data ?? []).map((unit) => ({
                  value: unit.id,
                  label: unit.pathLabel || unit.name,
                })),
              ]}
            />
          </>
        }
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('employees.noResults') : t('employees.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="fullName" label={t('users.fullName')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="phone" label={t('users.phone')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="position" label={t('users.position')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="orgUnit" label={t('users.orgUnit')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">{item.fullName}</td>
                <td className="px-4 py-3">
                  {item.phone ? <span className="digit-field" dir="ltr">{localizeDigits(item.phone, locale)}</span> : '—'}
                </td>
                <td className="px-4 py-3">{item.position?.name || '—'}</td>
                <td className="px-4 py-3">{item.orgUnit?.name || '—'}</td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={organizationEmployeePath(item.id)}
                    editTo={`${organizationEmployeePath(item.id)}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('users.confirmDelete'),
                        successMessage: t('users.deleted'),
                        path: `/users/${item.id}`,
                        queryKey: ['employees'],
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

export function EmployeeCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className={formShellClassName}>
      <PageHeader icon={Users} title={t('employees.create')} subtitle={t('employees.createSubtitle')} />
      <EmployeeForm
        onSubmit={async (payload) => {
          await api.post('/users', payload)
          toast.success(t('employees.created'))
          navigate(organizationEmployeesPath())
        }}
      />
    </div>
  )
}
