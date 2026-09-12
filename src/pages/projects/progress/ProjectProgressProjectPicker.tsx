import { ChevronsUpDown, FolderKanban, LayoutGrid } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, FormField } from '../../../components/ui/Form'
import { FormEmptyHint } from '../../../components/ui/FormLayout'
import { SearchSelect } from '../../../components/ui/SearchSelect'
import type { Project } from '../../../types/app'
import { ProjectColorDot } from '../ProjectShared'

const BADGE_LIMIT = 10

function ProjectBadge({
  project,
  selected,
  onSelect,
}: {
  project: Project
  selected: boolean
  onSelect: (id: string) => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(project.id)}
      className={`inline-flex max-w-full cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition ${
        selected
          ? 'bg-teal-500 text-white shadow-sm'
          : 'bg-teal-50 text-teal-800 ring-1 ring-teal-200 hover:bg-teal-100'
      }`}
    >
      <ProjectColorDot color={project.color} className="size-2" />
      <span className="truncate">{project.systemName}</span>
    </button>
  )
}

function ProjectBadgeList({
  projects,
  value,
  onChange,
}: {
  projects: Project[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {projects.map((item) => (
        <ProjectBadge
          key={item.id}
          project={item}
          selected={item.id === value}
          onSelect={onChange}
        />
      ))}
    </div>
  )
}

export function ProjectProgressProjectPicker({
  projects,
  value,
  onChange,
}: {
  projects: Project[]
  value: string
  onChange: (id: string) => void
}) {
  const { t } = useTranslation()
  const useDropdown = projects.length >= BADGE_LIMIT
  const [showBadges, setShowBadges] = useState(!useDropdown)

  if (!projects.length) {
    return (
      <FormField icon={FolderKanban} label={t('projectProgress.selectProject')}>
        <FormEmptyHint>{t('projectProgress.noProjects')}</FormEmptyHint>
      </FormField>
    )
  }

  if (!useDropdown || showBadges) {
    return (
      <FormField icon={FolderKanban} label={t('projectProgress.selectProject')}>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <ProjectBadgeList projects={projects} value={value} onChange={onChange} />
          </div>
          {useDropdown ? (
            <Button
              type="button"
              variant="ghost"
              icon
              className="shrink-0"
              aria-label={t('projectProgress.showProjectsAsList')}
              title={t('projectProgress.showProjectsAsList')}
              onClick={() => setShowBadges(false)}
            >
              <ChevronsUpDown className="size-4" aria-hidden />
            </Button>
          ) : null}
        </div>
      </FormField>
    )
  }

  return (
    <FormField
      icon={FolderKanban}
      label={t('projectProgress.selectProject')}
      htmlFor="progress-project"
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <SearchSelect
            id="progress-project"
            value={value}
            required
            placeholder={t('projectProgress.selectProjectPlaceholder')}
            onChange={onChange}
            options={projects.map((item) => ({
              value: item.id,
              label: item.systemName,
            }))}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          icon
          className="shrink-0"
          aria-label={t('projectProgress.showProjectsAsBadges')}
          title={t('projectProgress.showProjectsAsBadges')}
          onClick={() => setShowBadges(true)}
        >
          <LayoutGrid className="size-4" aria-hidden />
        </Button>
      </div>
    </FormField>
  )
}
