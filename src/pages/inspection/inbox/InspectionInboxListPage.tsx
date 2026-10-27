import { MessagesSquare } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { DateText } from '../../../components/ui/DateText'
import { FormField } from '../../../components/ui/Form'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../../components/ui/ListControls'
import { PageHeader, listShellClassName } from '../../../components/ui/Form'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { useListParams } from '../../../hooks/useListParams'
import { useListSort } from '../../../hooks/useListSort'
import { api } from '../../../lib/api'
import { localizeDigits } from '../../../lib/datetime'
import {
  inspectionFeedbackStatuses,
  type Paginated,
  type InspectionCategory,
  type InspectionFeedback,
  type InspectionKind,
} from '../../../types/app'
import { InspectionKindBadge, InspectionStatusBadge } from '../InspectionBadges'
import { inspectionInboxPath } from '../inspection-paths'

export function InspectionInboxListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const kindId = searchParams.get('kindId') ?? ''
  const status = searchParams.get('status') ?? ''
  const categoryId = searchParams.get('categoryId') ?? ''
  const filtersActive = Boolean(kindId || status || categoryId)

  const kinds = useQuery({
    queryKey: ['inspection', 'kinds', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<InspectionKind[]>('/inspection/kinds')
      return data
    },
  })
  const categories = useQuery({
    queryKey: ['inspection', 'categories', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<InspectionCategory[]>('/inspection/categories')
      return data
    },
  })
  const query = useQuery({
    queryKey: ['inspection', 'inbox', q, page, sortBy, sortDir, kindId, status, categoryId],
    queryFn: async () => {
      const { data } = await api.get<Paginated<InspectionFeedback>>('/inspection/feedbacks', {
        params: {
          q: q || undefined,
          page,
          kindId: kindId || undefined,
          status: status || undefined,
          categoryId: categoryId || undefined,
          ...sortParams,
        },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []

  return (
    <div className={listShellClassName}>
      <PageHeader icon={MessagesSquare} title={t('menus.inspectionInbox')} subtitle={t('inspection.subtitle')} />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('inspection.search')}
        placeholder={t('inspection.searchPlaceholder')}
        filtersActive={filtersActive}
        extra={
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField icon={MessagesSquare} label={t('inspection.kind')}>
              <SearchSelect
                value={kindId}
                onChange={(value) => setParams({ kindId: value || undefined }, { resetPage: true })}
                placeholder={t('common.all')}
                options={[
                  { value: '', label: t('common.all') },
                  ...(kinds.data ?? []).map((item) => ({
                    value: item.id,
                    label: item.title,
                  })),
                ]}
              />
            </FormField>
            <FormField icon={MessagesSquare} label={t('inspection.status')}>
              <SearchSelect
                value={status}
                onChange={(value) => setParams({ status: value || undefined }, { resetPage: true })}
                placeholder={t('common.all')}
                options={[
                  { value: '', label: t('common.all') },
                  ...Object.values(inspectionFeedbackStatuses).map((value) => ({
                    value,
                    label: t(`inspection.statuses.${value}`),
                  })),
                ]}
              />
            </FormField>
            <FormField icon={MessagesSquare} label={t('inspection.category')}>
              <SearchSelect
                value={categoryId}
                onChange={(value) => setParams({ categoryId: value || undefined }, { resetPage: true })}
                placeholder={t('common.all')}
                options={[
                  { value: '', label: t('common.all') },
                  ...(categories.data ?? []).map((item) => ({
                    value: item.id,
                    label: item.path || item.name,
                  })),
                ]}
              />
            </FormField>
          </div>
        }
      />
      <TableCard
        loading={query.isLoading}
        empty={q || filtersActive ? t('inspection.noResults') : t('inspection.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="trackingCode" label={t('inspection.trackingCode')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="kind" label={t('inspection.kind')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="category" label={t('inspection.category')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="submitter" label={t('inspection.submitter')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="phone" label={t('inspection.phone')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="status" label={t('inspection.status')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="createdAt" label={t('inspection.createdAt')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3 font-mono" dir="ltr">
                  {item.trackingCode}
                </td>
                <td className="px-4 py-3">
                  <InspectionKindBadge kind={item.kind} />
                </td>
                <td className="px-4 py-3">{item.category.name}</td>
                <td className="px-4 py-3">{item.submitterName || t('inspection.anonymous')}</td>
                <td className="px-4 py-3">
                  {item.phone ? localizeDigits(item.phone, locale) : '—'}
                </td>
                <td className="px-4 py-3">
                  <InspectionStatusBadge status={item.status} />
                </td>
                <td className="px-4 py-3">
                  <DateText value={item.createdAt} withTime />
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={inspectionInboxPath(item.id)}
                    onDelete={() =>
                      confirmDelete({
                        message: t('inspection.confirmDelete'),
                        successMessage: t('inspection.deleted'),
                        path: `/inspection/feedbacks/${item.id}`,
                        queryKey: ['inspection', 'inbox'],
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
