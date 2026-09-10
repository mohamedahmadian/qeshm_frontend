export function projectProgressPath(projectId: string) {
  return `/projects/${projectId}/progress`
}

export function projectProgressEntryPath(projectId: string, entryId: string) {
  return `${projectProgressPath(projectId)}/${entryId}`
}
