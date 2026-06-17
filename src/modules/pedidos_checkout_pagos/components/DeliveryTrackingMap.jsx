import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

export default function DeliveryTrackingMap({ mapData }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: [mapData?.tile_url || 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: [-63.1821, -17.7833],
      zoom: 12,
    })

    mapRef.current.on('load', () => {
      if (!mapRef.current.getSource('route')) {
        mapRef.current.addSource('route', {
          type: 'geojson',
          data: emptyRoute(),
        })
        mapRef.current.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          paint: {
            'line-color': '#7c3aed',
            'line-width': 4,
          },
        })
      }
      syncMap(mapRef.current, markersRef, mapData)
    })

    return () => {
      for (const marker of markersRef.current) marker.remove()
      markersRef.current = []
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [mapData])

  useEffect(() => {
    if (!mapRef.current || !mapRef.current.isStyleLoaded()) return
    syncMap(mapRef.current, markersRef, mapData)
  }, [mapData])

  return <div ref={containerRef} className="h-80 w-full rounded-xl overflow-hidden border" style={{ borderColor: 'var(--line)' }} />
}

function syncMap(map, markersRef, mapData) {
  const polyline = mapData?.route?.polyline || []
  const source = map.getSource('route')
  if (source) {
    source.setData({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: polyline.map((point) => [point.lng, point.lat]),
      },
      properties: {},
    })
  }

  for (const marker of markersRef.current) marker.remove()
  markersRef.current = []

  const markers = []
  const markerMap = [
    ['Cocinero', mapData?.markers?.chef, '#2563eb'],
    ['Cliente', mapData?.markers?.client, '#16a34a'],
    ['Delivery', mapData?.markers?.delivery_current, '#dc2626'],
  ]

  for (const [label, point, color] of markerMap) {
    if (!isPoint(point)) continue
    const element = document.createElement('div')
    element.style.width = '16px'
    element.style.height = '16px'
    element.style.borderRadius = '999px'
    element.style.background = color
    element.style.border = '2px solid white'
    element.title = label
    markers.push(new maplibregl.Marker({ element }).setLngLat([point.lng, point.lat]).addTo(map))
  }
  markersRef.current = markers

  const bounds = new maplibregl.LngLatBounds()
  let hasBounds = false
  for (const point of polyline) {
    if (!isPoint(point)) continue
    bounds.extend([point.lng, point.lat])
    hasBounds = true
  }
  for (const [, point] of markerMap) {
    if (!isPoint(point)) continue
    bounds.extend([point.lng, point.lat])
    hasBounds = true
  }

  if (hasBounds) {
    map.fitBounds(bounds, { padding: 40, maxZoom: 15, duration: 600 })
  }
}

function isPoint(point) {
  return point && typeof point.lat === 'number' && typeof point.lng === 'number'
}

function emptyRoute() {
  return {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [] },
    properties: {},
  }
}
