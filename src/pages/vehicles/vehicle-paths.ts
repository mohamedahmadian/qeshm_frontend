export function vehiclesPath() {
  return '/vehicles'
}

export function vehicleBrandsPath() {
  return `${vehiclesPath()}/brands`
}

export function vehicleBrandPath(id: string) {
  return `${vehicleBrandsPath()}/${id}`
}

export function vehiclePath(id: string) {
  return `${vehiclesPath()}/${id}`
}

export function vehicleAssignmentsPath(vehicleId: string) {
  return `${vehiclePath(vehicleId)}/assignments`
}

export function vehicleAssignmentPath(vehicleId: string, id: string) {
  return `${vehicleAssignmentsPath(vehicleId)}/${id}`
}

export function vehicleAssignmentReturnPath(vehicleId: string, id: string) {
  return `${vehicleAssignmentPath(vehicleId, id)}/return`
}

export function vehicleDisplayName(item: {
  plate: string
  brand?: string | { name?: string } | null
  model?: string
}) {
  const brandName = typeof item.brand === 'string' ? item.brand : item.brand?.name
  const title = [brandName, item.model].filter(Boolean).join(' ').trim()
  return title ? `${item.plate} — ${title}` : item.plate
}
