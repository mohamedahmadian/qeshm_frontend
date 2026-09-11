import { Building2, FolderKanban, Plus } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
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
  AppForm,
  Button,
  EntityNameSubtitle,
  FormActions,
  FormField,
  LoadingState,
  PageHeader,
  formShellClassName,
  listShellClassName,
} from '../../../components/ui/Form'
import { FormCard, FormEmptyHint, formCardBodyClassName } from '../../../components/ui/FormLayout'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { useListParams } from '../../../hooks/useListParams'
import { useListSort } from '../../../hooks/useListSort'
import { api, getApiErrorMessage } from '../../../lib/api'
import type { ContractorProject, Paginated, Project, ProjectContractor } from '../../../types/app'
import { ProjectLifecycleBadge, ProjectProgress } from '../ProjectShared'
import { contractorProjectsPath } from './contractor-paths'

function useContractor(contractorId?: string) {
  return useQuery({
    queryKey: ['contractor', contractorId],
    enabled: Boolean(contractorId),
    queryFn: async () => {
      const { data } = await api.get<ProjectContractor>(`/contractors/${contractorId}`)
      return data
    },
  })
}

export function ContractorProjectListPage() {
  const { t } = useTranslation()
  const { contractorId } = useParams()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } =
    useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const { confirmDelete } = useConfirmDelete()
  const contractor = useContractor(contractorId)

  const query = useQuery({
    queryKey: ['contractor-projects', contractorId, q, page, sortBy, sortDir],
    enabled: Boolean(contractorId),
    queryFn: async () => {
      const { data } = await api.get<Paginated<ContractorProject>>(
        `/contractors/${contractorId}/projects`,
        { params: { page, ...(q ? { q } : {}), ...sortParams } },
      )
      return data
    },
  })

  if (!contractor.data || !contractorId) {
    return <LoadingState />
  }

  const rows = query.data?.items ?? []

  return (
    <div className={listShellClassName}>
      <PageHeader
        icon={FolderKanban}
        title={t('contractorProjects.title')}
        subtitle={<EntityNameSubtitle name={contractor.data.name} icon={Building2} />}
        action={
          <Link to={`${contractorProjectsPath(contractorId)}/new`}>
            <Button>
              <Plus className="size-4" />
              {t('contractorProjects.create')}
            </Button>
          </Link>
        }
      />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('contractorProjects.search')}
        placeholder={t('contractorProjects.searchPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('contractorProjects.noResults') : t('contractorProjects.empty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="systemName" label={t('projects.systemName')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="code" label={t('projects.code')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="status" label={t('projects.status')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="progressPercent" label={t('projects.progress')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3 font-medium">{item.systemName}</td>
                <td className="px-4 py-3">{item.code}</td>
                <td className="px-4 py-3">
                  <ProjectLifecycleBadge value={item.status} />
                </td>
                <td className="px-4 py-3">
                  <ProjectProgress value={item.progressPercent} />
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={`/projects/${item.id}`}
                    onDelete={() =>
                      confirmDelete({
                        message: t('contractorProjects.confirmUnlink'),
                        successMessage: t('contractorProjects.unlinked'),
                        path: `/contractors/${contractorId}/projects/${item.id}`,
                        queryKey: ['contractor-projects'],
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

export function ContractorProjectCreatePage() {
  const { t } = useTranslation()
  const { contractorId } = useParams()
  const navigate = useNavigate()
  const contractor = useContractor(contractorId)
  const [projectId, setProjectId] = useState('')
  const [saving, setSaving] = useState(false)

  const projects = useQuery({
    queryKey: ['projects', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<Project[]>('/projects')
      return data
    },
  })

  const linked = useQuery({
    queryKey: ['contractor-projects', contractorId, 'all'],
    enabled: Boolean(contractorId),
    queryFn: async () => {
      const { data } = await api.get<ContractorProject[]>(`/contractors/${contractorId}/projects`)
      return data
    },
  })

  const options = useMemo(() => {
    const taken = new Set((linked.data ?? []).map((item) => item.id))
    return (projects.data ?? [])
      .filter((item) => !taken.has(item.id))
      .map((item) => ({ value: item.id, label: item.systemName }))
  }, [linked.data, projects.data])

  if (!contractor.data || !contractorId) {
    return <LoadingState />
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!projectId) {
      toast.error(t('contractorProjects.projectRequired'))
      return
    }
    setSaving(true)
    try {
      await api.post(`/contractors/${contractorId}/projects`, { projectId })
      toast.success(t('contractorProjects.linked'))
      navigate(contractorProjectsPath(contractorId!))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={FolderKanban}
        title={t('contractorProjects.create')}
        subtitle={<EntityNameSubtitle name={contractor.data.name} icon={Building2} />}
      />
      <FormCard
        icon={FolderKanban}
        title={t('contractorProjects.create')}
        subtitle={t('contractorProjects.createSubtitle')}
      >
        <AppForm onSubmit={submit} className={formCardBodyClassName}>
          <FormField icon={FolderKanban} label={t('contractors.project')} htmlFor="linkProject">
            {options.length ? (
              <SearchSelect
                id="linkProject"
                value={projectId}
                onChange={setProjectId}
                required
                placeholder={t('contractorProjects.selectProject')}
                options={options}
              />
            ) : (
              <FormEmptyHint>{t('contractorProjects.allAssigned')}</FormEmptyHint>
            )}
          </FormField>
          <FormActions
            submitLabel={t('contractorProjects.save')}
            cancelLabel={t('contractorProjects.cancel')}
            submitting={saving}
            onCancel={() => history.back()}
          />
        </AppForm>
      </FormCard>
    </div>
  )
}
