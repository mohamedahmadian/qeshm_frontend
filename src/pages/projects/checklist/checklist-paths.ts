export function projectChecklistPath(projectId: string) {
  return `/projects/${projectId}/checklist`
}

export function projectPhaseChecklistPath(projectId: string, phaseId: string) {
  return `/projects/${projectId}/phases/${phaseId}/checklist`
}
