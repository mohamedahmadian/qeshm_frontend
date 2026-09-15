export const DEFAULT_PROJECT_COLOR = '#2ebdb6'

export const PROJECT_COLOR_SWATCHES = [
  '#2ebdb6',
  '#3fd6be',
  '#0ea5e9',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#0f766e',
  '#64748b',
  '#1e293b',
] as const

const hexColor = /^#[0-9a-fA-F]{6}$/

export function isProjectColor(value: string | null | undefined): value is string {
  return Boolean(value && hexColor.test(value))
}

export function projectColor(value?: string | null) {
  return isProjectColor(value) ? value.toLowerCase() : DEFAULT_PROJECT_COLOR
}

export function projectColorAlpha(value: string | null | undefined, alpha: number) {
  const hex = projectColor(value).slice(1)
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function swatchColorFromId(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return PROJECT_COLOR_SWATCHES[hash % PROJECT_COLOR_SWATCHES.length]
}
