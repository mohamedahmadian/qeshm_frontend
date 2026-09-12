export function projectProgressPath(projectId: string) {
  return `/projects/${projectId}/progress`
}

export function projectProgressCreatePath(projectId: string) {
  return `${projectProgressPath(projectId)}/new`
}

export const projectProgressCreateGlobalPath = '/projects/progress/new'

export function projectProgressEntryPath(projectId: string, entryId: string) {
  return `${projectProgressPath(projectId)}/${entryId}`
}
