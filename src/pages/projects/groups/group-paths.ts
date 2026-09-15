export function projectGroupsPath() {
  return '/projects/groups'
}

export function projectGroupPath(id: string) {
  return `${projectGroupsPath()}/${id}`
}
