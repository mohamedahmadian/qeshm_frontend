export function contractorsPath(projectId: string) {
  return `/projects/${projectId}/contractors`
}

export function globalContractorsPath() {
  return '/projects/contractors'
}

export function contractorTypesPath() {
  return `${globalContractorsPath()}/types`
}

export function contractorTypePath(typeId: string) {
  return `${contractorTypesPath()}/${typeId}`
}

export function globalContractorPath(contractorId: string) {
  return `${globalContractorsPath()}/${contractorId}`
}

export function contractorProjectsPath(contractorId: string) {
  return `${globalContractorPath(contractorId)}/projects`
}

export function contractorPath(projectId: string, contractorId: string) {
  return `${contractorsPath(projectId)}/${contractorId}`
}

export function contractorUsersPath(projectId: string, contractorId: string) {
  return `${contractorPath(projectId, contractorId)}/users`
}

export function contractorTeamPath(projectId: string, contractorId: string) {
  return `${contractorPath(projectId, contractorId)}/team`
}

export function contractorPaymentsPath(projectId: string, contractorId: string) {
  return `${contractorPath(projectId, contractorId)}/payments`
}
