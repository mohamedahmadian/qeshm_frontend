import { FolderKanban, Plus, Building2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../../components/ui/ListControls'
import { Button, EntityNameSubtitle, LoadingState, PageHeader, listShellClassName } from '../../../components/ui/Form'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { useListParams } from '../../../hooks/useListParams'
import { useListSort } from '../../../hooks/useListSort'
import { api } from '../../../lib/api'
import { formatNumber, localizeDigits } from '../../../lib/datetime'
import type { Paginated, Project, ProjectContractor } from '../../../types/app'
import { contractorPath, contractorsPath } from './contractor-paths'

export function ContractorsListPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id: projectId } = useParams()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } =
    useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()

  const project = useQuery({
    queryKey: ['project', projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data } = await api.get<Project>(`/projects/${projectId}`)
      return data
    },
  })

  const query = useQuery({
    queryKey: ['contractors', projectId, q, page, sortBy, sortDir],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data } = await api.get<Paginated<ProjectContractor>>(
        `/projects/${projectId}/contractors`,
        { params: { page, ...(q ? { q } : {}), ...sortParams } },
      )
      return data
    },
  })

  if (!project.data || !projectId) {
    return <LoadingState />
  }

  const rows = query.data?.items ?? []

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={Building2}
        title={t('contractors.title')}
        subtitle={<EntityNameSubtitle name={project.data.systemName} icon={FolderKanban} />}
        action={
          <Link to={`${contractorsPath(projectId)}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('contractors.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('contractors.search')}
        placeholder={t('contractors.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('contractors.noResults') : t('contractors.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="name" label={t('contractors.name')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="nationalId" label={t('contractors.nationalId')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="ceoName" label={t('contractors.ceoName')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="timeEstimate" label={t('contractors.timeEstimate')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="costEstimate" label={t('contractors.costEstimate')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3 font-medium">{item.name}</td>
                <td className="px-4 py-3">
                  {item.nationalId ? localizeDigits(item.nationalId, locale) : '—'}
                </td>
                <td className="px-4 py-3">{item.ceoName || '—'}</td>
                <td className="px-4 py-3">{item.timeEstimate || '—'}</td>
                <td className="px-4 py-3">
                  {item.costEstimate != null ? formatNumber(item.costEstimate, locale) : '—'}
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={contractorPath(projectId, item.id)}
                    editTo={`${contractorPath(projectId, item.id)}/edit`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('contractors.confirmDelete'),
                        successMessage: t('contractors.deleted'),
                        path: `/projects/${projectId}/contractors/${item.id}`,
                        queryKey: ['contractors'],
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
