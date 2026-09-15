import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '../ui/Form'

const RESERVED_PROJECT_SEGMENTS = new Set([
  'new',
  'reports',
  'live-board',
  'contractors',
  'progress',
  'groups',
  'calendar',
])

function projectIdFromPath(pathname: string) {
  const match = pathname.match(/^\/projects\/([^/]+)(?:\/(.*))?$/)
  if (!match || RESERVED_PROJECT_SEGMENTS.has(match[1])) return null
  return { id: match[1], rest: match[2] ?? '' }
}

export function ProjectHeaderProgressButton() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const project = projectIdFromPath(pathname)
  if (!project || project.rest === 'progress/new') return null

  return (
    <Link to={`/projects/${project.id}/progress/new`} className="hidden lg:block">
      <Button type="button">
        <Plus className="size-4" aria-hidden />
        {t('projectProgress.create')}
      </Button>
    </Link>
  )
}
