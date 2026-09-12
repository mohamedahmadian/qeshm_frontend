import { LocateFixed, MapPinned } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  queryGeolocationPermission,
  requestBrowserGeolocation,
  type GeoErrorKind,
} from '../../lib/geolocation'
import { isProjectColor, projectColor, projectColorAlpha } from '../../lib/project-color'
import { Button } from './Form'

const pinIcon = L.divIcon({
  className: 'eskan-map-pin',
  html: '<span class="eskan-map-pin-dot"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

export type MapFocus = {
  lat: number
  lng: number
  zoom?: number
  bounds?: MapBounds
}

export type MapBounds = {
  south: number
  west: number
  north: number
  east: number
}

const IRAN_BOUNDS: MapBounds = {
  south: 25.06,
  west: 44.03,
  north: 39.78,
  east: 63.33,
}

export type MapOverlayMarkerTone =
  | 'not-started'
  | 'in-progress'
  | 'suspended'
  | 'completed'
  | 'unset'

export type MapOverlayMarker = {
  id: string
  lat: number
  lng: number
  kind: 'previous' | 'current' | 'next' | 'history' | 'station' | 'project'
  tone?: MapOverlayMarkerTone
  badge: string
  title: string
  farTitle?: string
  nearTitle?: string
  nearZoom?: number
  selected?: boolean
  color?: string
  popupHtml?: string
}

function markerVisibleTitle(marker: MapOverlayMarker, zoom: number) {
  const nearZoom = marker.nearZoom ?? 14
  if (marker.farTitle && zoom < nearZoom) return marker.farTitle
  return marker.nearTitle ?? marker.title
}

function projectPinHtml(marker: MapOverlayMarker, zoom: number) {
  const label = markerVisibleTitle(marker, zoom)
  const selected = marker.selected ? ' eskan-project-pin-selected' : ''
  const color = isProjectColor(marker.color) ? projectColor(marker.color) : ''
  const fill = color
    ? `background:${color};box-shadow:0 0 0 3px #fff,${
        marker.selected
          ? `0 0 0 6px ${projectColorAlpha(color, 0.38)},0 4px 12px rgba(20,40,40,0.22)`
          : '0 2px 8px rgba(20,40,40,0.22)'
      }`
    : ''
  const style = fill ? ` style="${fill}"` : ''
  return `<span class="eskan-project-pin${selected}"><span class="eskan-project-pin-dot"${style}></span><span class="eskan-project-pin-label">${label}</span></span>`
}

function overlayMarkerHtml(marker: MapOverlayMarker, zoom = 12) {
  if (marker.kind === 'history') {
    return `<span class="eskan-history-pin">${marker.badge}</span>`
  }
  if (marker.kind === 'project') {
    return projectPinHtml(marker, zoom)
  }
  return `<span class="eskan-route-pin"><span class="eskan-route-pin-badge">${marker.badge}</span><span class="eskan-route-pin-title">${marker.title}</span></span>`
}

function overlayMarkerIcon(marker: MapOverlayMarker, zoom: number) {
  const isHistory = marker.kind === 'history'
  const isProject = marker.kind === 'project'
  return L.divIcon({
    className: `eskan-route-pin-wrap eskan-route-pin-${marker.kind}${
      marker.tone ? ` eskan-route-pin-tone-${marker.tone}` : ''
    }`,
    html: overlayMarkerHtml(marker, zoom),
    iconSize: isHistory ? [28, 28] : isProject ? [120, 42] : [132, 52],
    iconAnchor: isHistory ? [14, 14] : isProject ? [60, 10] : [66, 50],
  })
}

export type MapOverlayClickPoint = {
  x: number
  y: number
}

export type MapSelectedContainerPoint = {
  x: number
  y: number
  width: number
  height: number
}

export type MapOverlays = {
  markers: MapOverlayMarker[]
  path?: { lat: number; lng: number }[]
  /** If set, `fit` zooms to these points instead of every marker and path vertex. */
  fitPoints?: { lat: number; lng: number }[]
  fit?: boolean
  fitMaxZoom?: number
}

function overlayLatLngs(overlays: MapOverlays | null, extra?: L.LatLng | null) {
  if (!overlays) return []
  const points = [
    ...overlays.markers.map((marker) => L.latLng(marker.lat, marker.lng)),
    ...(overlays.path ?? []).map((point) => L.latLng(point.lat, point.lng)),
  ]
  if (extra) points.push(extra)
  return points
}

function overlayFitLatLngs(overlays: MapOverlays | null, extra?: L.LatLng | null) {
  if (!overlays) return []
  if (overlays.fitPoints?.length) {
    const points = overlays.fitPoints.map((point) => L.latLng(point.lat, point.lng))
    if (extra) points.push(extra)
    return points
  }
  return overlayLatLngs(overlays, extra)
}

function overlayFitKey(points: L.LatLng[]) {
  return points.map((point) => `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`).join('|')
}

function fitOverlayBounds(map: L.Map, overlays: MapOverlays | null, extra?: L.LatLng | null) {
  const points = overlayFitLatLngs(overlays, extra)
  if (!points.length) return
  const bounds = L.latLngBounds(points)
  if (!bounds.isValid()) return
  const maxZoom = overlays?.fitMaxZoom ?? 16
  if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
    map.setView(bounds.getCenter(), Math.min(maxZoom, 14))
    return
  }
  map.fitBounds(bounds, { padding: [56, 56], maxZoom })
}

function parseLatLng(latitude: string, longitude: string) {
  const latText = latitude.trim()
  const lngText = longitude.trim()
  if (!latText || !lngText) return null
  const lat = Number(latText)
  const lng = Number(lngText)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return L.latLng(lat, lng)
}

function formatCoord(value: number) {
  return String(Number(value.toFixed(6)))
}

function toLeafletBounds(bounds: MapBounds) {
  return L.latLngBounds(
    [bounds.south, bounds.west],
    [bounds.north, bounds.east],
  )
}

function addMapTiles(map: L.Map) {
  const attribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  const primary = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution,
    maxZoom: 19,
  })
  let fallbackAttached = false
  primary.on('tileerror', () => {
    if (fallbackAttached) return
    fallbackAttached = true
    map.removeLayer(primary)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: `${attribution} &copy; CARTO`,
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)
  })
  primary.addTo(map)
}

export function OsmMapPicker({
  latitude,
  longitude,
  onChange,
  active = true,
  variant = 'collapsible',
  readOnly = false,
  autoGeolocate = false,
  showGeolocate = false,
  focus = null,
  maxBounds = null,
  heightClass = 'h-72',
  overlays = null,
  fill = false,
  keepInView = null,
  onMarkerClick,
  onSelectedContainerPoint,
  onMapClick,
  onGeolocate,
  onGeoError,
  onGeoOutside,
}: {
  latitude: string
  longitude: string
  onChange: (latitude: string, longitude: string) => void
  active?: boolean
  variant?: 'collapsible' | 'always'
  readOnly?: boolean
  autoGeolocate?: boolean
  showGeolocate?: boolean
  focus?: MapFocus | null
  maxBounds?: MapBounds | null
  heightClass?: string
  overlays?: MapOverlays | null
  fill?: boolean
  keepInView?: {
    id: string
    padding: { top: number; right: number; bottom: number; left: number }
  } | null
  onMarkerClick?: (id: string, point: MapOverlayClickPoint) => void
  onSelectedContainerPoint?: (point: MapSelectedContainerPoint | null) => void
  onMapClick?: () => void
  onGeolocate?: (latitude: string, longitude: string) => void
  onGeoError?: (kind: GeoErrorKind) => void
  onGeoOutside?: () => void
}) {
  const { t } = useTranslation()
  const alwaysOpen = variant === 'always'
  const [open, setOpen] = useState(alwaysOpen)
  const [locating, setLocating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const overlayLayerRef = useRef<L.LayerGroup | null>(null)
  const overlayFitKeyRef = useRef<string>('')
  const overlaysRef = useRef(overlays)
  const onChangeRef = useRef(onChange)
  const onGeolocateRef = useRef(onGeolocate)
  const onGeoErrorRef = useRef(onGeoError)
  const onGeoOutsideRef = useRef(onGeoOutside)
  const onMarkerClickRef = useRef(onMarkerClick)
  const onSelectedContainerPointRef = useRef(onSelectedContainerPoint)
  const onMapClickRef = useRef(onMapClick)
  const maxBoundsRef = useRef(maxBounds)
  const autoGeoDoneRef = useRef(false)
  const stopGeoRef = useRef<(() => void) | null>(null)
  onChangeRef.current = onChange
  onGeolocateRef.current = onGeolocate
  onGeoErrorRef.current = onGeoError
  onGeoOutsideRef.current = onGeoOutside
  onMarkerClickRef.current = onMarkerClick
  onSelectedContainerPointRef.current = onSelectedContainerPoint
  onMapClickRef.current = onMapClick
  overlaysRef.current = overlays
  maxBoundsRef.current = maxBounds

  const canEdit = !readOnly
  const geolocateEnabled = showGeolocate || (alwaysOpen && !readOnly)

  function placeMarker(map: L.Map, latlng: L.LatLng, draggable: boolean) {
    if (markerRef.current) {
      markerRef.current.setLatLng(latlng)
      if (markerRef.current.dragging) {
        if (draggable) markerRef.current.dragging.enable()
        else markerRef.current.dragging.disable()
      }
      return
    }
    markerRef.current = L.marker(latlng, { icon: pinIcon, draggable }).addTo(map)
    if (draggable) {
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current?.getLatLng()
        if (!pos) return
        onChangeRef.current(formatCoord(pos.lat), formatCoord(pos.lng))
      })
    }
  }

  useEffect(() => {
    if (!open || !containerRef.current || mapRef.current) return

    const container = containerRef.current
    const start = parseLatLng(latitude, longitude)
    const map = L.map(container, {
      scrollWheelZoom: true,
      dragging: true,
      doubleClickZoom: !readOnly,
    })
    const currentOverlays = overlaysRef.current
    if (start) {
      map.setView(start, 16)
    } else if (currentOverlays?.fit && overlayFitLatLngs(currentOverlays).length) {
      fitOverlayBounds(map, currentOverlays)
    } else if (maxBounds) {
      map.fitBounds(toLeafletBounds(maxBounds), { padding: [28, 28], maxZoom: focus?.zoom ?? 13 })
    } else if (focus?.bounds) {
      map.fitBounds(toLeafletBounds(focus.bounds), { padding: [56, 56], maxZoom: focus.zoom ?? 16 })
    } else if (focus) {
      map.setView([focus.lat, focus.lng], focus.zoom ?? 9)
    } else {
      map.fitBounds(toLeafletBounds(IRAN_BOUNDS), { padding: [28, 28], maxZoom: 6 })
    }
    addMapTiles(map)

    if (start) placeMarker(map, start, canEdit)

    if (canEdit) {
      map.on('click', (event: L.LeafletMouseEvent) => {
        placeMarker(map, event.latlng, true)
        onChangeRef.current(formatCoord(event.latlng.lat), formatCoord(event.latlng.lng))
      })
    } else {
      map.on('click', () => {
        onMapClickRef.current?.()
      })
    }

    mapRef.current = map
    const frame = window.requestAnimationFrame(() => map.invalidateSize())
    const observer = new ResizeObserver(() => {
      map.invalidateSize({ animate: false })
    })
    observer.observe(container)

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // Map is created once per open session; lat/lng sync is handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    const map = mapRef.current
    if (!open || !map) return
    const next = parseLatLng(latitude, longitude)
    if (!next) return
    const previous = markerRef.current?.getLatLng()
    placeMarker(map, next, canEdit)
    if ((!previous || previous.distanceTo(next) > 1) && !overlays?.fit) {
      map.setView(next, Math.max(map.getZoom(), 16))
    }
  }, [canEdit, latitude, longitude, open, overlays?.fit])

  useEffect(() => {
    const map = mapRef.current
    if (!open || !map) return
    if (overlays?.fit) {
      map.setMaxBounds(undefined as unknown as L.LatLngBounds)
      return
    }
    if (maxBounds) {
      const bounds = toLeafletBounds(maxBounds)
      map.setMaxBounds(bounds.pad(0.08))
      map.options.maxBoundsViscosity = 1
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: focus?.zoom ?? 13 })
      return
    }
    map.setMaxBounds(undefined as unknown as L.LatLngBounds)
    if (focus?.bounds) {
      map.fitBounds(toLeafletBounds(focus.bounds), { padding: [16, 16] })
    } else if (focus) {
      map.setView([focus.lat, focus.lng], focus.zoom ?? 9)
    }
  }, [focus, maxBounds, open, overlays?.fit])

  useEffect(() => {
    const map = mapRef.current
    if (!open || !map) return
    overlayLayerRef.current?.remove()
    overlayLayerRef.current = null
    if (!overlays?.markers.length && !overlays?.path?.length) {
      overlayFitKeyRef.current = ''
      return
    }

    const layer = L.layerGroup().addTo(map)
    overlayLayerRef.current = layer
    if (overlays.path && overlays.path.length >= 2) {
      L.polyline(
        overlays.path.map((point) => [point.lat, point.lng] as L.LatLngTuple),
        {
          color: '#2EBDB6',
          weight: 4,
          opacity: 0.88,
          dashArray: '10 8',
          lineCap: 'round',
        },
      ).addTo(layer)
    }
    const projectPins: { marker: MapOverlayMarker; pin: L.Marker }[] = []
    for (const marker of overlays.markers) {
      const isHistory = marker.kind === 'history'
      const pin = L.marker([marker.lat, marker.lng], {
        icon: overlayMarkerIcon(marker, map.getZoom()),
        zIndexOffset: marker.selected || marker.kind === 'current' ? 500 : isHistory ? 420 : 400,
        keyboard: false,
      }).addTo(layer)
      pin.on('click', (event: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(event)
        const point = map.latLngToContainerPoint(event.latlng)
        onMarkerClickRef.current?.(marker.id, { x: point.x, y: point.y })
      })
      if (marker.popupHtml) {
        pin.bindPopup(marker.popupHtml, {
          className: 'eskan-route-popup',
          maxWidth: 280,
          autoClose: false,
        })
      }
      if (marker.kind === 'project') {
        projectPins.push({ marker, pin })
      }
    }
    function syncProjectLabels() {
      const current = mapRef.current
      if (!current) return
      const zoom = current.getZoom()
      for (const item of projectPins) {
        item.pin.setIcon(overlayMarkerIcon(item.marker, zoom))
      }
    }
    map.on('zoomend', syncProjectLabels)
    if (overlays.fit) {
      const here = parseLatLng(latitude, longitude)
      const points = overlayFitLatLngs(overlays, here)
      const fitKey = overlayFitKey(points)
      if (points.length && overlayFitKeyRef.current !== fitKey) {
        overlayFitKeyRef.current = fitKey
        fitOverlayBounds(map, overlays, here)
      }
    } else {
      overlayFitKeyRef.current = ''
    }
    return () => {
      map.off('zoomend', syncProjectLabels)
      layer.remove()
      if (overlayLayerRef.current === layer) overlayLayerRef.current = null
    }
  }, [latitude, longitude, open, overlays])

  useEffect(() => {
    if (!open || !active || !mapRef.current) return
    const map = mapRef.current
    function resizeAndFit() {
      map.invalidateSize()
      const current = overlaysRef.current
      if (!current?.fit) return
      const here = parseLatLng(latitude, longitude)
      overlayFitKeyRef.current = overlayFitKey(overlayFitLatLngs(current, here))
      fitOverlayBounds(map, current, here)
    }
    const first = window.setTimeout(resizeAndFit, 50)
    const second = window.setTimeout(resizeAndFit, 220)
    return () => {
      window.clearTimeout(first)
      window.clearTimeout(second)
    }
  }, [active, latitude, longitude, open])

  useEffect(() => {
    const map = mapRef.current
    if (!open || !map || !keepInView) return
    const marker = overlaysRef.current?.markers.find((item) => item.id === keepInView.id)
    if (!marker) return
    const timer = window.setTimeout(() => {
      map.panInside(L.latLng(marker.lat, marker.lng), {
        paddingTopLeft: [keepInView.padding.left, keepInView.padding.top],
        paddingBottomRight: [keepInView.padding.right, keepInView.padding.bottom],
        animate: true,
      })
    }, 40)
    return () => window.clearTimeout(timer)
  }, [keepInView, open])

  useEffect(() => {
    const map = mapRef.current
    if (!open || !map || !onSelectedContainerPoint) return
    let frame = 0
    function report() {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        const leafletMap = mapRef.current
        if (!leafletMap) return
        const selected = overlaysRef.current?.markers.find((item) => item.selected)
        const size = leafletMap.getSize()
        if (!selected) {
          onSelectedContainerPointRef.current?.(null)
          return
        }
        const point = leafletMap.latLngToContainerPoint(L.latLng(selected.lat, selected.lng))
        onSelectedContainerPointRef.current?.({
          x: point.x,
          y: point.y,
          width: size.x,
          height: size.y,
        })
      })
    }
    report()
    map.on('move', report)
    map.on('zoom', report)
    map.on('resize', report)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      map.off('move', report)
      map.off('zoom', report)
      map.off('resize', report)
    }
  }, [onSelectedContainerPoint, open, overlays])

  function applyPosition(lat: number, lng: number, fromGeo: boolean) {
    const map = mapRef.current
    const latlng = L.latLng(lat, lng)
    const bounds = maxBoundsRef.current
    if (bounds && !toLeafletBounds(bounds).contains(latlng)) {
      return 'outside' as const
    }
    onChangeRef.current(formatCoord(lat), formatCoord(lng))
    if (fromGeo) onGeolocateRef.current?.(formatCoord(lat), formatCoord(lng))
    if (map) {
      placeMarker(map, latlng, canEdit)
      map.setView(latlng, Math.max(map.getZoom(), 16))
    }
    return 'ok' as const
  }

  function requestGeolocation(fromAuto: boolean) {
    if (!canEdit) return
    stopGeoRef.current?.()
    setLocating(true)
    let applied = false
    let lastOutside = false

    stopGeoRef.current = requestBrowserGeolocation({
      onPosition(coords) {
        const result = applyPosition(coords.latitude, coords.longitude, !applied)
        if (result === 'ok') {
          applied = true
          lastOutside = false
          setLocating(false)
          return
        }
        lastOutside = true
      },
      onError(kind) {
        if (fromAuto) return
        onGeoErrorRef.current?.(kind)
      },
      onSettled(reason) {
        stopGeoRef.current = null
        setLocating(false)
        if (reason === 'cancel' || fromAuto || applied) return
        if (lastOutside) onGeoOutsideRef.current?.()
      },
    })
  }

  useEffect(() => {
    return () => {
      stopGeoRef.current?.()
      stopGeoRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!open || !autoGeolocate || !canEdit || autoGeoDoneRef.current) return
    if (parseLatLng(latitude, longitude)) {
      autoGeoDoneRef.current = true
      return
    }
    autoGeoDoneRef.current = true
    let cancelled = false
    void queryGeolocationPermission().then((state) => {
      if (cancelled || state !== 'granted') return
      requestGeolocation(true)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGeolocate, canEdit, open])

  const showMapToggle = variant === 'collapsible'
  const showGeoButton = geolocateEnabled && open
  const fillBleed = fill && !showMapToggle && !showGeoButton

  return (
    <div
      className={
        showMapToggle || showGeoButton
          ? 'space-y-3'
          : fillBleed
            ? 'absolute inset-0 min-h-0'
            : fill
              ? 'h-full min-h-0'
              : undefined
      }
    >
      {showMapToggle || showGeoButton ? (
        <div className="flex flex-wrap gap-2">
          {showMapToggle ? (
            <Button
              type="button"
              variant="soft"
              aria-expanded={open}
              onClick={() => setOpen((current) => !current)}
            >
              <MapPinned className="size-4" aria-hidden />
              {open ? t('accommodations.hideMap') : t('accommodations.pickFromMap')}
            </Button>
          ) : null}
          {showGeoButton ? (
            <Button
              type="button"
              variant="soft"
              disabled={locating}
              onClick={() => requestGeolocation(false)}
            >
              <LocateFixed className="size-4" aria-hidden />
              {locating ? t('location.locating') : t('location.useMyLocation')}
            </Button>
          ) : null}
        </div>
      ) : null}
      {open ? (
        <div
          dir="ltr"
          className={`overflow-hidden rounded-2xl border border-line shadow-[0_8px_24px_rgba(20,40,40,0.06)] ${
            fill ? 'h-full' : ''
          }`}
        >
          <div
            ref={containerRef}
            className={`eskan-osm-map w-full ${fill ? 'h-full' : heightClass}`}
          />
        </div>
      ) : null}
    </div>
  )
}
