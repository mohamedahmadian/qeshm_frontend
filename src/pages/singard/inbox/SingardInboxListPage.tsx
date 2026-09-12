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
  singardFeedbackKinds,
  singardFeedbackStatuses,
  type Paginated,
  type SingardCategory,
  type SingardFeedback,
} from '../../../types/app'
import { SingardKindBadge, SingardStatusBadge } from '../SingardBadges'
import { singardInboxPath } from '../singard-paths'

export function SingardInboxListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const kind = searchParams.get('kind') ?? ''
  const status = searchParams.get('status') ?? ''
  const categoryId = searchParams.get('categoryId') ?? ''
  const filtersActive = Boolean(kind || status || categoryId)

  const categories = useQuery({
    queryKey: ['singard', 'categories', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<SingardCategory[]>('/singard/categories')
      return data
    },
  })
  const query = useQuery({
    queryKey: ['singard', 'inbox', q, page, sortBy, sortDir, kind, status, categoryId],
    queryFn: async () => {
      const { data } = await api.get<Paginated<SingardFeedback>>('/singard/feedbacks', {
        params: {
          q: q || undefined,
          page,
          kind: kind || undefined,
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
      <PageHeader icon={MessagesSquare} title={t('menus.singardInbox')} subtitle={t('singard.subtitle')} />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('singard.search')}
        placeholder={t('singard.searchPlaceholder')}
        filtersActive={filtersActive}
        extra={
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField icon={MessagesSquare} label={t('singard.kind')}>
              <SearchSelect
                value={kind}
                onChange={(value) => setParams({ kind: value || undefined }, { resetPage: true })}
                placeholder={t('common.all')}
                options={[
                  { value: '', label: t('common.all') },
                  ...Object.values(singardFeedbackKinds).map((value) => ({
                    value,
                    label: t(`singard.kinds.${value}`),
                  })),
                ]}
              />
            </FormField>
            <FormField icon={MessagesSquare} label={t('singard.status')}>
              <SearchSelect
                value={status}
                onChange={(value) => setParams({ status: value || undefined }, { resetPage: true })}
                placeholder={t('common.all')}
                options={[
                  { value: '', label: t('common.all') },
                  ...Object.values(singardFeedbackStatuses).map((value) => ({
                    value,
                    label: t(`singard.statuses.${value}`),
                  })),
                ]}
              />
            </FormField>
            <FormField icon={MessagesSquare} label={t('singard.category')}>
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
        empty={q || filtersActive ? t('singard.noResults') : t('singard.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="trackingCode" label={t('singard.trackingCode')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="kind" label={t('singard.kind')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="category" label={t('singard.category')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="submitter" label={t('singard.submitter')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="phone" label={t('singard.phone')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="status" label={t('singard.status')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="createdAt" label={t('singard.createdAt')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
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
                  <SingardKindBadge kind={item.kind} />
                </td>
                <td className="px-4 py-3">{item.category.name}</td>
                <td className="px-4 py-3">{item.submitterName || t('singard.anonymous')}</td>
                <td className="px-4 py-3">
                  {item.phone ? localizeDigits(item.phone, locale) : '—'}
                </td>
                <td className="px-4 py-3">
                  <SingardStatusBadge status={item.status} />
                </td>
                <td className="px-4 py-3">
                  <DateText value={item.createdAt} withTime />
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={singardInboxPath(item.id)}
                    onDelete={() =>
                      confirmDelete({
                        message: t('singard.confirmDelete'),
                        successMessage: t('singard.deleted'),
                        path: `/singard/feedbacks/${item.id}`,
                        queryKey: ['singard', 'inbox'],
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
