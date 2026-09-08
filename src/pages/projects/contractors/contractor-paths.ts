export function contractorsPath(projectId: string) {
  return `/projects/${projectId}/contractors`
}

export function contractorPath(projectId: string, contractorId: string) {
  return `${contractorsPath(projectId)}/${contractorId}`
}

export function contractorTeamPath(projectId: string, contractorId: string) {
  return `${contractorPath(projectId, contractorId)}/team`
}

export function contractorPhasesPath(projectId: string, contractorId: string) {
  return `${contractorPath(projectId, contractorId)}/phases`
}

export function contractorPaymentsPath(projectId: string, contractorId: string) {
  return `${contractorPath(projectId, contractorId)}/payments`
}
