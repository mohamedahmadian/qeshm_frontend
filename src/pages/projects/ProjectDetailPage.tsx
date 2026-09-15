import {
  CalendarRange,
  FolderKanban,
  Gauge,
  Globe,
  Flag,
  Handshake,
  Landmark,
  Layers,
  Link2,
  MapPin,
  Monitor,
  Palette,
  Percent,
  Radio,
  ScrollText,
  Shield,
  Tags,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DateText } from '../../components/ui/DateText'
import { DetailActions, EntityNameSubtitle, LoadingState, PageHeader, formShellClassName } from '../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../components/ui/FormLayout'
import { OsmMapPicker } from '../../components/ui/OsmMapPicker'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { api } from '../../lib/api'
import { formatNumber, localizeDigits } from '../../lib/datetime'
import { projectBoundaryPolygons } from '../../lib/geo'
import { projectColor } from '../../lib/project-color'
import type { Project } from '../../types/app'
import {
  ProjectColorDot,
  ProjectImportanceBadge,
  ProjectLifecycleBadge,
  ProjectProgress,
  ProjectStatus,
  ProjectUrl,
  projectLabelOrUnspecified,
  projectManageExtraItems,
} from './ProjectShared'

export function ProjectDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['project', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<Project>(`/projects/${id}`)
      return data
    },
  })

  const project = query.data
  if (!project) {
    return <LoadingState />
  }

  const rings = projectBoundaryPolygons(project.boundary)
  const hasPolygon = rings.length > 0
  const hasPoint = project.latitude != null && project.longitude != null
  const coords =
    hasPoint
      ? localizeDigits(`${project.latitude}, ${project.longitude}`, locale)
      : '—'

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={FolderKanban}
        title={t('projects.details')}
        subtitle={<EntityNameSubtitle name={project.systemName} icon={FolderKanban} />}
      />
      <FormCard icon={FolderKanban} title={project.systemName}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Landmark}>{t('projects.orgSection')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={Landmark}
              label={t('projects.orgUnit')}
              value={projectLabelOrUnspecified(project.orgUnit?.pathLabel || project.orgUnit?.name, t)}
              tone="teal"
            />
            <FormFactTile
              icon={Layers}
              label={t('projects.group')}
              value={
                project.group ? (
                  <span className="inline-flex items-center gap-2">
                    <ProjectColorDot color={project.group.color} />
                    <span>{project.group.name}</span>
                  </span>
                ) : (
                  t('projects.unspecified')
                )
              }
              tone="mint"
            />
            {(project.operators ?? []).length ? (
              (project.operators ?? []).map((item, index) => (
                <FormFactTile
                  key={item.id}
                  icon={Landmark}
                  label={item.kind.name || t('projects.operators')}
                  value={item.pathLabel || item.name}
                  tone={index % 2 === 0 ? 'teal' : 'mint'}
                />
              ))
            ) : (
              <FormFactTile icon={Landmark} label={t('projects.operators')} value="—" empty />
            )}
          </div>
          <FormSectionTitle icon={Monitor}>{t('projects.systemSection')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={Monitor}
              label={t('projects.systemName')}
              value={project.systemName}
              tone="teal"
            />
            <FormFactTile
              icon={Tags}
              label={t('projects.code')}
              value={project.code}
              tone="mint"
            />
            <FormFactTile
              icon={Handshake}
              label={t('projects.companyName')}
              value={project.companyName || '—'}
              tone="mint"
            />
            <FormFactTile
              icon={Globe}
              label={t('projects.systemUrl')}
              value={<ProjectUrl value={project.systemUrl} />}
            />
            <FormFactTile
              icon={CalendarRange}
              label={t('projects.launchYear')}
              value={project.launchYear != null ? formatNumber(project.launchYear, locale) : '—'}
            />
            <FormFactTile
              icon={Monitor}
              label={t('projects.isActive')}
              value={<ProjectStatus active={project.isActive} />}
            />
            <FormFactTile
              icon={Gauge}
              label={t('projects.status')}
              value={<ProjectLifecycleBadge value={project.status} />}
              tone="mint"
            />
            <FormFactTile
              icon={Shield}
              label={t('projects.isSupportActive')}
              value={<ProjectStatus active={project.isSupportActive} />}
            />
            <FormFactTile
              icon={Radio}
              label={t('projects.showOnLiveBoard')}
              value={
                project.showOnLiveBoard
                  ? t('projects.showOnLiveBoardOn')
                  : t('projects.showOnLiveBoardOff')
              }
              tone={project.showOnLiveBoard ? 'teal' : 'ink'}
            />
            <FormFactTile
              icon={Link2}
              label={t('projects.replacement')}
              value={
                project.replacementProject ? (
                  <Link
                    to={`/projects/${project.replacementProject.id}`}
                    className="text-teal-700 hover:underline"
                  >
                    {project.replacementProject.systemName}
                  </Link>
                ) : (
                  '—'
                )
              }
            />
            <FormFactTile
              icon={Tags}
              label={t('projects.importance')}
              value={<ProjectImportanceBadge value={project.importance} />}
            />
            <FormFactTile
              icon={Palette}
              label={t('projects.color')}
              value={
                <span className="inline-flex items-center gap-2">
                  <ProjectColorDot color={project.color} className="size-4" />
                  <span dir="ltr">{projectColor(project.color)}</span>
                </span>
              }
            />
            <FormFactTile
              icon={ScrollText}
              label={t('projects.description')}
              value={project.description || '—'}
            />
          </div>
          <FormSectionTitle icon={CalendarRange}>{t('projects.timelineSection')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={CalendarRange}
              label={t('projects.startDate')}
              value={project.startDate ? <DateText value={project.startDate} /> : '—'}
              empty={!project.startDate}
              tone="teal"
            />
            <FormFactTile
              icon={CalendarRange}
              label={t('projects.endDate')}
              value={project.endDate ? <DateText value={project.endDate} /> : '—'}
              empty={!project.endDate}
              tone="mint"
            />
            <FormFactTile
              icon={Percent}
              label={t('projects.progress')}
              value={<ProjectProgress value={project.progressPercent} />}
              empty={project.progressPercent == null}
            />
            <FormFactTile
              icon={Flag}
              label={t('projects.phaseCount')}
              value={formatNumber(project._count?.phases ?? 0, locale)}
              tone="mint"
            />
          </div>
          <FormSectionTitle icon={MapPin}>{t('projects.locationSection')}</FormSectionTitle>
          <FormFactTile
            icon={MapPin}
            label={t('projects.address')}
            value={project.address || '—'}
            empty={!project.address}
          />
          <FormFactTile
            icon={MapPin}
            label={t('projects.coordinates')}
            value={coords}
            empty={project.latitude == null || project.longitude == null}
          />
          {hasPolygon || hasPoint ? (
            <div className="overflow-hidden rounded-2xl ring-1 ring-teal-100">
              <OsmMapPicker
                variant="always"
                readOnly
                latitude={hasPolygon || !hasPoint ? '' : String(project.latitude)}
                longitude={hasPolygon || !hasPoint ? '' : String(project.longitude)}
                onChange={() => undefined}
                heightClass="h-56"
                overlays={
                  hasPolygon
                    ? {
                        markers: [],
                        polygons: rings.map((latlngs) => ({
                          id: project.id,
                          latlngs,
                          color: projectColor(project.color),
                          title: project.systemName,
                        })),
                      }
                    : undefined
                }
              />
            </div>
          ) : null}
        </div>
      </FormCard>
      <DetailActions
        editTo={`/projects/${project.id}/edit`}
        editLabel={t('common.edit')}
        deleteLabel={t('projects.delete')}
        onDelete={() =>
          confirmDelete({
            message: t('projects.confirmDelete'),
            successMessage: t('projects.deleted'),
            path: `/projects/${project.id}`,
            queryKey: ['projects'],
            onDeleted: () => navigate('/projects'),
          })
        }
        extraItems={projectManageExtraItems(project.id, t)}
      />
    </div>
  )
}
