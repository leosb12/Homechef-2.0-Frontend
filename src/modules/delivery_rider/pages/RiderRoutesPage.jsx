import React, { useEffect, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useConnectivity } from '../../../shared/hooks/useConnectivity'
import RiderOfflineBanner from '../components/RiderOfflineBanner'
import DeliveryTrackingMap from '../../pedidos_checkout_pagos/components/DeliveryTrackingMap'
import { fetchRouteSnapshot, fetchDeliveryDetail } from '../services/deliveryRiderService'

export default function RiderRoutesPage() {
  const { isOnline } = useConnectivity()
  const location = useLocation()
  const [assignmentId, setAssignmentId] = useState(location.state?.assignmentId || null)
  const [route, setRoute] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    void loadRoute()
  }, [assignmentId, isOnline])

  async function loadRoute() {
    if (!assignmentId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setErrorMsg('')
    try {
      const [routeData, detailData] = await Promise.all([
        fetchRouteSnapshot(assignmentId),
        fetchDeliveryDetail(assignmentId),
      ])
      setRoute(routeData)
      setDetail(detailData)
    } catch (err) {
      console.error('Error loading route data:', err)
      if (!isOnline) {
        setErrorMsg('Mapa no disponible sin conexión. Mostrando la última información guardada.')
      } else {
        setErrorMsg(err?.response?.data?.detail || 'No se pudo cargar la ruta.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border p-6 text-center" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
        Cargando mapa e indicaciones de entrega...
      </div>
    )
  }

  if (!assignmentId || !detail) {
    return (
      <div className="rounded-2xl border p-6 text-center space-y-4" style={{ borderColor: 'var(--line)' }}>
        {!isOnline && !detail ? (
          <>
            <p className="font-semibold text-lg">No hay datos offline disponibles para esta pantalla.</p>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Conéctate y sincroniza cuando tengas internet.</p>
          </>
        ) : (
          <>
            <p className="font-semibold text-lg">No hay datos de ruta disponibles para esta entrega.</p>
            <Link
              to="/delivery/assigned"
              className="inline-block px-5 py-2.5 rounded-xl font-semibold text-white transition"
              style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
            >
              Volver al Dashboard
            </Link>
          </>
        )}
      </div>
    )
  }

  // Prep map Data
  const mapData = route ? {
    tile_url: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
    route: {
      polyline: route.polyline || []
    },
    markers: {
      chef: { lat: route.start_latitude, lng: route.start_longitude },
      client: { lat: route.end_latitude, lng: route.end_longitude },
      delivery_current: { lat: route.start_latitude, lng: route.start_longitude } // fallback
    }
  } : null

  return (
    <section className="space-y-6">
      <RiderOfflineBanner />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Mapa y Ruta Actual</h1>
          <p style={{ color: 'var(--muted)' }}>Guía de navegación para recoger y entregar el pedido.</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/delivery/active"
            state={{ assignmentId }}
            className="px-4 py-2 rounded-xl border font-semibold transition"
            style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
          >
            Volver a la Entrega
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border p-3 text-sm text-yellow-600 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-900/30">
          {errorMsg}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Mapa / Fallback */}
        <div className="lg:col-span-2 space-y-4">
          {isOnline && mapData ? (
            <div className="rounded-2xl border overflow-hidden p-1" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
              <DeliveryTrackingMap mapData={mapData} />
            </div>
          ) : (
            <div className="rounded-2xl border p-6 text-center space-y-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
              <span className="text-4xl">🗺️ Offline</span>
              <h3 className="font-bold text-lg">Mapa no disponible sin conexión</h3>
              <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--muted)' }}>
                Mostrando la última información guardada. Puedes guiarte usando los detalles de dirección abajo.
              </p>
            </div>
          )}

          {/* Guía textual de la ruta */}
          <div className="rounded-2xl border p-6 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
            <h2 className="text-xl font-bold">Guía de Entrega</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--line)' }}>
                <h3 className="text-xs uppercase font-extrabold tracking-wide" style={{ color: '#2563eb' }}>Punto A - Recogida</h3>
                <p className="font-bold mt-1">{detail.chef_business_name || 'Cocinero'}</p>
                <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{detail.chef_address || 'Dirección de la cocina'}</p>
                {route && (
                  <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
                    Coord: {route.start_latitude.toFixed(5)}, {route.start_longitude.toFixed(5)}
                  </p>
                )}
              </div>
              <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--line)' }}>
                <h3 className="text-xs uppercase font-extrabold tracking-wide" style={{ color: '#16a34a' }}>Punto B - Entrega</h3>
                <p className="font-bold mt-1">{detail.client_name || 'Cliente'}</p>
                <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{detail.client_address || 'Dirección de entrega'}</p>
                {route && (
                  <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
                    Coord: {route.end_latitude.toFixed(5)}, {route.end_longitude.toFixed(5)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Resumen del Trayecto */}
        <div className="space-y-4">
          <div className="rounded-2xl border p-5 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
            <h3 className="font-bold">Resumen de Ruta</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--line)' }}>
                <span className="text-sm" style={{ color: 'var(--muted)' }}>Distancia Estimada</span>
                <span className="font-bold">{route?.distance_meters ? `${(route.distance_meters / 1000).toFixed(2)} km` : 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--line)' }}>
                <span className="text-sm" style={{ color: 'var(--muted)' }}>Tiempo Estimado</span>
                <span className="font-bold">{route?.duration_seconds ? `${Math.ceil(route.duration_seconds / 60)} min` : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: 'var(--muted)' }}>Proveedor de Mapa</span>
                <span className="font-bold text-xs">{route?.provider || 'OSM'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
