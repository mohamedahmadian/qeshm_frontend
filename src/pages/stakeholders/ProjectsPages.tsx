import { Building2, CalendarRange, FolderKanban, Gauge, Hash, MapPin, ScrollText } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useParams } from 'react-router-dom'
import {
  ActionsTh,
  EntityRowActions,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../components/ui/ListControls'
import { EntityNameSubtitle, LoadingState, PageHeader, formShellClassName, listShellClassName } from '../../components/ui/Form'
import { DateText } from '../../components/ui/DateText'
import { FormCard, FormFactTile, FormSectionTitle } from '../../components/ui/FormLayout'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api } from '../../lib/api'
import { formatNumber } from '../../lib/datetime'
import type { Paginated } from '../../types/app'
import type { StakeholderProject } from './types'

export function StakeholderProjectsPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const query = useQuery({
    queryKey: ['stakeholders', 'projects', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<StakeholderProject>>('/stakeholders/projects', {
        params: { q: q || undefined, page, ...sortParams },
      })
      return data
    },
  })
  const rows = query.data?.items ?? []

  return (
    <div className={listShellClassName}>
      <PageHeader icon={FolderKanban} title={t('menus.stakeholderProjects')} subtitle={t('stakeholders.projectsSubtitle')} />
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('stakeholders.searchProjects')}
        placeholder={t('stakeholders.searchProjectsPlaceholder')}
      />
      <TableCard
        loading={query.isLoading}
        empty={q ? t('stakeholders.noProjects') : t('stakeholders.emptyProjects')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh column="systemName" label={t('stakeholders.project')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="code" label={t('stakeholders.code')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="status" label={t('stakeholders.status')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableTh column="progressPercent" label={t('stakeholders.officialPercent')} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3 font-medium">{item.systemName}</td>
                <td className="px-4 py-3">{item.code}</td>
                <td className="px-4 py-3">{t(`projects.statuses.${item.status}`)}</td>
                <td className="px-4 py-3">
                  {item.progressPercent == null ? '—' : `${formatNumber(item.progressPercent, locale)}٪`}
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions viewTo={`/stakeholders/projects/${item.id}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
      {query.data ? (
        <PaginationBar page={query.data.page} pageSize={query.data.pageSize} total={query.data.total} onPageChange={setPage} />
      ) : null}
    </div>
  )
}

export function StakeholderProjectDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const query = useQuery({
    queryKey: ['stakeholders', 'project', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<StakeholderProject>(`/stakeholders/projects/${id}`)
      return data
    },
  })
  if (!query.data || !id) return <LoadingState />
  const project = query.data

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={FolderKanban}
        title={t('stakeholders.projectDetails')}
        subtitle={<EntityNameSubtitle name={project.systemName} icon={FolderKanban} />}
      />
      <FormCard icon={FolderKanban} title={project.systemName}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={FolderKanban}>{t('stakeholders.projectDetails')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Hash} label={t('stakeholders.code')} value={project.code} tone="teal" />
            <FormFactTile icon={Gauge} label={t('stakeholders.status')} value={t(`projects.statuses.${project.status}`)} tone="mint" />
            <FormFactTile
              icon={Gauge}
              label={t('stakeholders.officialPercent')}
              value={project.progressPercent == null ? '—' : `${formatNumber(project.progressPercent, locale)}٪`}
              tone="teal"
            />
            <FormFactTile icon={Building2} label={t('stakeholders.orgUnit')} value={project.orgUnit?.name || '—'} tone="ink" />
            <FormFactTile icon={CalendarRange} label={t('stakeholders.startDate')} value={project.startDate ? <DateText value={project.startDate} /> : '—'} tone="mint" />
            <FormFactTile icon={CalendarRange} label={t('stakeholders.endDate')} value={project.endDate ? <DateText value={project.endDate} /> : '—'} tone="teal" />
            <FormFactTile icon={MapPin} label={t('stakeholders.address')} value={project.address || '—'} tone="ink" />
            <FormFactTile icon={ScrollText} label={t('stakeholders.description')} value={project.description || '—'} tone="mint" />
          </div>
          <FormSectionTitle icon={ScrollText}>{t('stakeholders.timeline')}</FormSectionTitle>
          {project.reports?.length ? (
            <ul className="space-y-2">
              {project.reports.map((item) => (
                <li key={item.id}>
                  <Link to={`/stakeholders/progress/${item.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-teal-100 px-3 py-2 text-sm hover:bg-teal-50">
                    <span className="truncate">{item.actionsDone || t('stakeholders.progressDetails')}</span>
                    <DateText value={item.occurredAt} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-500">{t('stakeholders.emptyProgress')}</p>
          )}
          <FormSectionTitle icon={ScrollText}>{t('stakeholders.relatedCorrespondence')}</FormSectionTitle>
          {project.correspondences?.length ? (
            <ul className="space-y-2">
              {project.correspondences.map((item) => (
                <li key={item.id}>
                  <Link to={`/stakeholders/correspondence/${item.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-teal-100 px-3 py-2 text-sm hover:bg-teal-50">
                    <span className="truncate">{item.subject}</span>
                    <span>{t(`stakeholders.statuses.${item.status}`)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-500">{t('stakeholders.emptyCorrespondence')}</p>
          )}
        </div>
      </FormCard>
    </div>
  )
}
