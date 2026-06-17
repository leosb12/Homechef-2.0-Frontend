import { useEffect, useMemo, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const DEFAULT_CENTER = {
  latitude: -17.7833,
  longitude: -63.1821,
}

export default function CheckoutDeliveryMap({
  chefLocation,
  customerLocation,
  routePoints = [],
  onChange,
  onUseCurrentLocation,
  locating = false,
  routeLoading = false,
  routeProvider = '',
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])

  const normalizedChef = useMemo(
    () => normalizePoint(chefLocation) || DEFAULT_CENTER,
    [chefLocation],
  )
  const normalizedCustomer = useMemo(
    () => normalizePoint(customerLocation) || DEFAULT_CENTER,
    [customerLocation],
  )

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: [normalizedCustomer.longitude, normalizedCustomer.latitude],
      zoom: 14,
    })

    mapRef.current.on('load', () => {
      ensureRouteLayer(mapRef.current)
      syncMap(
        mapRef.current,
        markersRef,
        normalizedChef,
        normalizedCustomer,
        routePoints,
      )
    })

    mapRef.current.on('click', (event) => {
      onChange({
        latitude: Number(event.lngLat.lat.toFixed(6)),
        longitude: Number(event.lngLat.lng.toFixed(6)),
      })
    })

    return () => {
      for (const marker of markersRef.current) marker.remove()
      markersRef.current = []
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [normalizedChef, normalizedCustomer, onChange])

  useEffect(() => {
    if (!mapRef.current || !mapRef.current.isStyleLoaded()) return
    ensureRouteLayer(mapRef.current)
    syncMap(
      mapRef.current,
      markersRef,
      normalizedChef,
      normalizedCustomer,
      routePoints,
    )
  }, [normalizedChef, normalizedCustomer, routePoints])

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="h-80 w-full overflow-hidden rounded-2xl border"
        style={{ borderColor: 'var(--line)' }}
      />
      <div
        className="rounded-xl border p-3 text-sm"
        style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}
      >
        <p className="font-medium">Punto seleccionado</p>
        <p className="mt-1" style={{ color: 'var(--muted)' }}>
          {normalizedCustomer.latitude.toFixed(6)}, {normalizedCustomer.longitude.toFixed(6)}
        </p>
        <p className="mt-2" style={{ color: 'var(--muted)' }}>
          Toca el mapa para cambiar el destino. La ruta previa se calcula sobre la red peatonal OSM.
        </p>
        {routeProvider ? (
          <p className="mt-2" style={{ color: 'var(--muted)' }}>
            Proveedor: {routeProvider}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onUseCurrentLocation}
        disabled={locating}
        className="rounded-xl border px-4 py-2 text-sm font-medium disabled:opacity-60"
        style={{ borderColor: 'var(--line)' }}
      >
        {locating ? 'Ubicando...' : 'Usar mi ubicacion actual'}
      </button>
      {routeLoading ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Calculando ruta peatonal...
        </p>
      ) : null}
    </div>
  )
}

function ensureRouteLayer(map) {
  if (map.getSource('checkout-route')) return
  map.addSource('checkout-route', {
    type: 'geojson',
    data: emptyRoute(),
  })
  map.addLayer({
    id: 'checkout-route-line',
    type: 'line',
    source: 'checkout-route',
    paint: {
      'line-color': '#16a34a',
      'line-width': 4,
      'line-dasharray': [2, 2],
      'line-opacity': 0.9,
    },
  })
}

function syncMap(map, markersRef, chefPoint, customerPoint, routePoints) {
  const source = map.getSource('checkout-route')
  const path = routePoints.length >= 2
    ? routePoints
    : [
        { lat: chefPoint.latitude, lng: chefPoint.longitude },
        { lat: customerPoint.latitude, lng: customerPoint.longitude },
      ]
  if (source) {
    source.setData({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: path.map((point) => [point.lng, point.lat]),
      },
      properties: {},
    })
  }

  for (const marker of markersRef.current) marker.remove()
  markersRef.current = []

  const markers = [
    createMarker({
      map,
      label: 'Cocinero',
      point: chefPoint,
      color: '#2563eb',
    }),
    createMarker({
      map,
      label: 'Entrega',
      point: customerPoint,
      color: '#16a34a',
    }),
  ].filter(Boolean)

  markersRef.current = markers

  const bounds = new maplibregl.LngLatBounds()
  for (const point of path) {
    if (typeof point?.lat !== 'number' || typeof point?.lng !== 'number') continue
    bounds.extend([point.lng, point.lat])
  }
  map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 500 })
}

function createMarker({ map, label, point, color }) {
  if (!isValidPoint(point)) return null
  const element = document.createElement('div')
  element.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
      <div style="width:18px;height:18px;border-radius:999px;background:${color};border:2px solid white;"></div>
      <div style="padding:3px 8px;border-radius:999px;background:rgba(15,23,42,.92);color:white;font-size:10px;white-space:nowrap;">${label}</div>
    </div>
  `
  return new maplibregl.Marker({ element })
    .setLngLat([point.longitude, point.latitude])
    .addTo(map)
}

function normalizePoint(point) {
  if (!point) return null
  const latitude = Number(point.latitude)
  const longitude = Number(point.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  return { latitude, longitude }
}

function isValidPoint(point) {
  return Number.isFinite(point?.latitude) && Number.isFinite(point?.longitude)
}

function emptyRoute() {
  return {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [] },
    properties: {},
  }
}
