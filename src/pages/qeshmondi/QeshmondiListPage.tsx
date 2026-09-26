import { Plus, UserRoundCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../components/ui/ListControls'
import { Button, PageHeader, listShellClassName } from '../../components/ui/Form'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { DateText } from '../../components/ui/DateText'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import { localizeDigits } from '../../lib/datetime'
import { userStatuses, type ManagedUser, type Paginated } from '../../types/app'
import { GeoStatus, GeoYesNo } from '../geo/GeoShared'
import { qeshmondiCitizenPath, qeshmondiPath } from './qeshmondi-paths'

export function QeshmondiListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const status = searchParams.get('status') ?? ''
  const resident = searchParams.get('isResident') ?? ''

  const query = useQuery({
    queryKey: ['qeshmondi', q, page, status, resident, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<ManagedUser>>('/users', {
        params: {
          page,
          qeshmondiOnly: true,
          ...(q ? { q } : {}),
          ...(status ? { status } : {}),
          ...(resident ? { isResident: resident === 'true' } : {}),
          ...sortParams,
        },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []
  const base = qeshmondiPath()

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={UserRoundCheck}
        title={t('qeshmondi.title')}
        subtitle={t('qeshmondi.subtitle')}
        action={
          <Link to={`${base}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('qeshmondi.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('qeshmondi.search')}
        placeholder={t('qeshmondi.searchPlaceholder')}
        filtersActive={Boolean(status || resident)}
        extra={
          <>
            <SearchSelect
              value={status}
              onChange={(next) => setParams({ status: next || undefined }, { resetPage: true })}
              placeholder={t('users.status')}
              options={[
                { value: '', label: t('common.all') },
                { value: userStatuses.ACTIVE, label: t('geo.active') },
                { value: userStatuses.INACTIVE, label: t('geo.inactive') },
              ]}
            />
            <SearchSelect
              value={resident}
              onChange={(next) => setParams({ isResident: next || undefined }, { resetPage: true })}
              placeholder={t('users.isResident')}
              options={[
                { value: '', label: t('qeshmondi.allResidents') },
                { value: 'true', label: t('users.resident') },
                { value: 'false', label: t('users.nonResident') },
              ]}
            />
          </>
        }
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('qeshmondi.noResults') : t('qeshmondi.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="fullName" label={t('users.fullName')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="nationalId" label={t('users.nationalId')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="phone" label={t('users.phone')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="occupation" label={t('users.occupation')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="isResident" label={t('users.isResident')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh
                column="qeshmondiEndDate"
                label={t('users.qeshmondiEndDate')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh column="status" label={t('users.status')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3">{item.fullName}</td>
                <td className="px-4 py-3">
                  {item.nationalId ? (
                    <span className="digit-field" dir="ltr">
                      {localizeDigits(item.nationalId, locale)}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3">
                  {item.phone ? (
                    <span className="digit-field" dir="ltr">
                      {localizeDigits(item.phone, locale)}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3">{item.occupation || '—'}</td>
                <td className="px-4 py-3">
                  <GeoYesNo value={Boolean(item.isResident)} />
                </td>
                <td className="px-4 py-3">
                  {item.qeshmondiEndDate ? <DateText value={item.qeshmondiEndDate} /> : '—'}
                </td>
                <td className="px-4 py-3">
                  <GeoStatus active={item.status === userStatuses.ACTIVE} />
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={qeshmondiCitizenPath(item.id)}
                    editTo={`${qeshmondiCitizenPath(item.id)}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('qeshmondi.confirmDelete'),
                        successMessage: t('qeshmondi.deleted'),
                        path: `/users/${item.id}`,
                        queryKey: ['qeshmondi'],
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
