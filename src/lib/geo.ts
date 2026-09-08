import { useTranslation } from 'react-i18next'
import type { GeoName } from '../types/app'

export function geoName(item: GeoName, locale: string) {
  const useEn = locale === 'en' || locale === 'hi'
  if (useEn) {
    return item.nameEn || item.nameFa
  }
  return item.nameFa || item.nameEn
}

export function useGeoName() {
  const { i18n } = useTranslation()
  const locale = i18n.language.split('-')[0]
  return (item?: GeoName | null) => (item ? geoName(item, locale) : '—')
}

/** Missing country is treated as Iranian so existing users keep the current flow. */
export function isIranCountry(
  countryId: string | null | undefined,
  iranId: string | null | undefined,
) {
  if (!countryId || !iranId) return true
  return countryId === iranId
}

export function slugifyCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function nearestGeoItem<
  T extends { latitude: number | null; longitude: number | null },
>(lat: number, lng: number, items: T[], maxKm = 80) {
  let best: T | null = null
  let bestDistance = maxKm
  for (const item of items) {
    if (item.latitude == null || item.longitude == null) continue
    const distance = haversineKm(lat, lng, item.latitude, item.longitude)
    if (distance < bestDistance) {
      best = item
      bestDistance = distance
    }
  }
  return best
}

function toCoord(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

export function stageCoordinates(stage: {
  latitude?: number | string | null
  longitude?: number | string | null
  city?: { latitude?: number | string | null; longitude?: number | string | null } | null
}) {
  const stageLat = toCoord(stage.latitude)
  const stageLng = toCoord(stage.longitude)
  if (stageLat != null && stageLng != null) return { lat: stageLat, lng: stageLng }
  const cityLat = toCoord(stage.city?.latitude)
  const cityLng = toCoord(stage.city?.longitude)
  if (cityLat != null && cityLng != null) return { lat: cityLat, lng: cityLng }
  return null
}

export function resolveWalkingProgress<
  T extends {
    cityId: string
    stageNumber: number
    latitude?: number | null
    longitude?: number | null
    city?: { latitude?: number | null; longitude?: number | null } | null
  },
>(
  stages: T[],
  here: { cityId?: string | null; lat?: number | null; lng?: number | null },
) {
  const ordered = [...stages].sort((a, b) => a.stageNumber - b.stageNumber)
  let index = here.cityId
    ? ordered.findIndex((stage) => stage.cityId === here.cityId)
    : -1
  if (index < 0 && here.lat != null && here.lng != null) {
    let best = -1
    let bestDistance = 80
    ordered.forEach((stage, stageIndex) => {
      const coords = stageCoordinates(stage)
      if (!coords) return
      const distance = haversineKm(here.lat!, here.lng!, coords.lat, coords.lng)
      if (distance < bestDistance) {
        best = stageIndex
        bestDistance = distance
      }
    })
    index = best
  }
  const current = index >= 0 ? ordered[index] ?? null : null
  const previous = index > 0 ? ordered[index - 1] ?? null : null
  const next =
    index >= 0
      ? ordered[index + 1] ?? null
      : ordered[0] ?? null
  return { ordered, index, current, previous, next }
}

export function pointBounds(lat: number, lng: number, padDeg: number) {
  return {
    south: lat - padDeg,
    west: lng - padDeg,
    north: lat + padDeg,
    east: lng + padDeg,
  }
}

/** Bounding box covering Iran, used as the default map view. */
export const IRAN_MAP_BOUNDS = {
  south: 24.4,
  west: 43.9,
  north: 40.0,
  east: 63.5,
}

export const IRAN_MAP_CENTER = { lat: 32.4279, lng: 53.688 }
