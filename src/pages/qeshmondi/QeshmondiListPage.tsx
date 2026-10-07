import { BadgeCheck, Cake, CalendarRange, House, Plus, ToggleRight, UserRoundCheck, type LucideIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
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
import { Button, FormField, PageHeader, fieldClassName, listShellClassName } from '../../components/ui/Form'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { DateText } from '../../components/ui/DateText'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import { localizeDigits, parseDigitString } from '../../lib/datetime'
import { userStatuses, type ManagedUser, type Paginated } from '../../types/app'
import { qeshmondiCitizenPath, qeshmondiPath } from './qeshmondi-paths'

function YearFilterField({
  id,
  label,
  icon,
  param,
  onCommit,
}: {
  id: string
  label: string
  icon: LucideIcon
  param: string
  onCommit: (year: string | undefined) => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [draft, setDraft] = useState(param)
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setDraft(param)
  }, [param])

  return (
    <FormField icon={icon} label={label} htmlFor={id}>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        className={`${fieldClassName} digit-field`}
        dir="ltr"
        placeholder={t('qeshmondi.yearPlaceholder')}
        aria-label={label}
        value={draft ? localizeDigits(draft, locale) : ''}
        onFocus={() => {
          focused.current = true
        }}
        onBlur={() => {
          focused.current = false
          if (draft.length === 4) return
          setDraft('')
          if (param) onCommit(undefined)
        }}
        onChange={(event) => {
          const digits = parseDigitString(event.target.value).slice(0, 4)
          setDraft(digits)
          if (digits.length === 4) onCommit(digits)
          else if (param) onCommit(undefined)
        }}
      />
    </FormField>
  )
}

export function QeshmondiListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const status = searchParams.get('status') ?? ''
  const resident = searchParams.get('isResident') ?? ''
  const validity = searchParams.get('qeshmondiValidity') ?? ''
  const birthYear = searchParams.get('birthYear') ?? ''
  const endYear = searchParams.get('qeshmondiEndYear') ?? ''

  const query = useQuery({
    queryKey: ['qeshmondi', q, page, status, resident, validity, birthYear, endYear, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<ManagedUser>>('/users', {
        params: {
          page,
          qeshmondiOnly: true,
          ...(q ? { q } : {}),
          ...(status ? { status } : {}),
          ...(resident ? { isResident: resident === 'true' } : {}),
          ...(validity ? { qeshmondiValidity: validity } : {}),
          ...(birthYear ? { birthYear } : {}),
          ...(endYear ? { qeshmondiEndYear: endYear } : {}),
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
        filtersActive={Boolean(status || resident || validity || birthYear || endYear)}
        extra={
          <>
            <YearFilterField
              id="qeshmondi-birth-year"
              icon={Cake}
              label={t('qeshmondi.birthYear')}
              param={birthYear}
              onCommit={(year) => setParams({ birthYear: year }, { resetPage: true })}
            />
            <YearFilterField
              id="qeshmondi-end-year"
              icon={CalendarRange}
              label={t('qeshmondi.cardExpiryYear')}
              param={endYear}
              onCommit={(year) => setParams({ qeshmondiEndYear: year }, { resetPage: true })}
            />
            <FormField icon={BadgeCheck} label={t('qeshmondi.citizenshipStatus')} htmlFor="qeshmondi-validity">
              <SearchSelect
                id="qeshmondi-validity"
                value={validity}
                onChange={(next) =>
                  setParams({ qeshmondiValidity: next || undefined }, { resetPage: true })
                }
                placeholder={t('common.all')}
                options={[
                  { value: 'valid', label: t('qeshmondi.citizenshipValid') },
                  { value: 'expired', label: t('qeshmondi.citizenshipExpired') },
                  { value: '', label: t('common.all') },
                ]}
              />
            </FormField>
            <FormField icon={ToggleRight} label={t('users.status')} htmlFor="qeshmondi-status">
              <SearchSelect
                id="qeshmondi-status"
                value={status}
                onChange={(next) => setParams({ status: next || undefined }, { resetPage: true })}
                placeholder={t('common.all')}
                options={[
                  { value: '', label: t('common.all') },
                  { value: userStatuses.ACTIVE, label: t('geo.active') },
                  { value: userStatuses.INACTIVE, label: t('geo.inactive') },
                ]}
              />
            </FormField>
            <FormField icon={House} label={t('users.isResident')} htmlFor="qeshmondi-resident">
              <SearchSelect
                id="qeshmondi-resident"
                value={resident}
                onChange={(next) => setParams({ isResident: next || undefined }, { resetPage: true })}
                placeholder={t('common.all')}
                options={[
                  { value: '', label: t('qeshmondi.allResidents') },
                  { value: 'true', label: t('users.resident') },
                  { value: 'false', label: t('users.nonResident') },
                ]}
              />
            </FormField>
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
              <SortableTh column="qeshmondiGroup" label={t('users.qeshmondiGroup')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh
                column="qeshmondiEndDate"
                label={t('users.qeshmondiEndDate')}
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
                <td className="px-4 py-3">{item.qeshmondiGroup || '—'}</td>
                <td className="px-4 py-3">
                  {item.qeshmondiEndDate ? <DateText value={item.qeshmondiEndDate} /> : '—'}
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
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
