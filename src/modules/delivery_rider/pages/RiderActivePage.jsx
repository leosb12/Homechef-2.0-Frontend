import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useConnectivity } from '../../../shared/hooks/useConnectivity'
import RiderOfflineBanner from '../components/RiderOfflineBanner'
import {
  fetchDeliveryDetail,
  confirmArrivedChef,
  confirmPickedUp,
  confirmDelivered,
  cancelDelivery,
  fetchActiveDeliveries
} from '../services/deliveryRiderService'

export default function RiderActivePage() {
  const { isOnline } = useConnectivity()
  const location = useLocation()
  const navigate = useNavigate()
  
  const [assignmentId, setAssignmentId] = useState(location.state?.assignmentId || null)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [actionLoading, setActionLoading] = useState('')

  useEffect(() => {
    void initPage()
  }, [assignmentId, isOnline])

  async function initPage() {
    setErrorMsg('')
    setLoading(true)
    
    let targetId = assignmentId
    if (!targetId) {
      try {
        const active = await fetchActiveDeliveries()
        if (active && active.length > 0) {
          targetId = active[0].id
          setAssignmentId(targetId)
        } else {
          setLoading(false)
          return
        }
      } catch (err) {
        console.error('Error finding active deliveries:', err)
      }
    }

    if (targetId) {
      try {
        const data = await fetchDeliveryDetail(targetId)
        setDetail(data)
      } catch (err) {
        console.error('Error fetching assignment detail:', err)
        if (!isOnline) {
          setErrorMsg('Sin conexión. Mostrando datos de tu última sincronización.')
        } else {
          setErrorMsg(err?.response?.data?.detail || 'No se pudo cargar la entrega.')
        }
      } finally {
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }

  async function handleTransition(action) {
    if (!assignmentId) return
    setActionLoading(action)
    try {
      let updated
      if (action === 'ARRIVED_CHEF') {
        updated = await confirmArrivedChef(assignmentId)
      } else if (action === 'PICKED_UP') {
        updated = await confirmPickedUp(assignmentId)
      } else if (action === 'DELIVERED') {
        updated = await confirmDelivered(assignmentId)
      } else if (action === 'CANCEL') {
        updated = await cancelDelivery(assignmentId)
      }
      
      if (updated?.__offline) {
        // Optimistic offline update
        setDetail(prev => ({
          ...prev,
          status: updated.status,
          __offline: true
        }))
      } else {
        await initPage()
      }
    } catch (err) {
      alert(err?.response?.data?.detail || 'Error al actualizar el estado de la entrega.')
    } finally {
      setActionLoading('')
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border p-6 text-center" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
        Cargando detalles de entrega activa...
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
            <p className="font-semibold text-lg">No tienes ninguna entrega activa seleccionada.</p>
            <Link
              to="/delivery/assigned"
              className="inline-block px-5 py-2.5 rounded-xl font-semibold text-white transition"
              style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
            >
              Ir al Dashboard
            </Link>
          </>
        )}
      </div>
    )
  }

  const orderId = detail.order_id || detail.order?.id || ''
  const chef = detail.chef || detail.order?.chef || {}
  const client = detail.client || detail.order?.client || {}

  return (
    <section className="space-y-6">
      <RiderOfflineBanner />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Entrega en Curso</h1>
          <p style={{ color: 'var(--muted)' }}>Detalle de la entrega activa y control del trayecto en tiempo real.</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/delivery/assigned"
            className="px-4 py-2 rounded-xl border font-semibold transition"
            style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
          >
            Volver
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border p-3 text-sm text-yellow-600 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-900/30">
          {errorMsg}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Info principal y cliente */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border p-6 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Orden #{String(orderId).slice(0, 8)}</h2>
              <span className="text-xs px-2.5 py-1 rounded-full text-white font-bold" style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}>
                {detail.status_label || detail.status}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border rounded-xl p-4" style={{ borderColor: 'var(--line)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Punto de Recogida (Cocina)</p>
                <p className="font-bold mt-1 text-base">{detail.chef_business_name || chef.business_name || 'HomeChef Kitchen'}</p>
                <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{detail.chef_address || chef.address || 'Calle Ficticia 123'}</p>
              </div>

              <div className="border rounded-xl p-4" style={{ borderColor: 'var(--line)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Punto de Entrega (Cliente)</p>
                <p className="font-bold mt-1 text-base">{detail.client_name || client.name || 'Cliente'}</p>
                <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{detail.client_address || client.address || 'Avenida Principal 456'}</p>
              </div>
            </div>

            {detail.status === 'ASSIGNED' && (
              <button
                onClick={() => handleTransition('ARRIVED_CHEF')}
                disabled={actionLoading === 'ARRIVED_CHEF'}
                className="w-full py-3.5 rounded-xl font-bold text-white transition text-lg"
                style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
              >
                {actionLoading === 'ARRIVED_CHEF' ? 'Procesando...' : 'Iniciar Ruta a Cocina'}
              </button>
            )}

            {detail.status === 'EN_ROUTE_TO_CHEF' && (
              <button
                onClick={() => handleTransition('ARRIVED_CHEF')}
                disabled={actionLoading === 'ARRIVED_CHEF'}
                className="w-full py-3.5 rounded-xl font-bold text-white transition text-lg"
                style={{ background: 'linear-gradient(90deg, #3b82f6, #2563eb)' }}
              >
                {actionLoading === 'ARRIVED_CHEF' ? 'Procesando...' : 'Marcar Llegada a Cocina'}
              </button>
            )}

            {detail.status === 'AT_CHEF' && (
              <button
                onClick={() => handleTransition('PICKED_UP')}
                disabled={actionLoading === 'PICKED_UP'}
                className="w-full py-3.5 rounded-xl font-bold text-white transition text-lg"
                style={{ background: 'linear-gradient(90deg, #f59e0b, #d97706)' }}
              >
                {actionLoading === 'PICKED_UP' ? 'Procesando...' : 'Confirmar Retiro (Recogido)'}
              </button>
            )}

            {detail.status === 'PICKED_UP' && (
              <button
                onClick={() => handleTransition('DELIVERED')}
                disabled={actionLoading === 'DELIVERED'}
                className="w-full py-3.5 rounded-xl font-bold text-white transition text-lg"
                style={{ background: 'linear-gradient(90deg, #10b981, #059669)' }}
              >
                {actionLoading === 'DELIVERED' ? 'Procesando...' : 'Marcar Rumbo a Cliente'}
              </button>
            )}

            {detail.status === 'EN_ROUTE_TO_CLIENT' && (
              <div className="flex gap-3">
                <button
                  onClick={() => handleTransition('CANCEL')}
                  disabled={actionLoading === 'CANCEL'}
                  className="flex-1 py-3.5 rounded-xl font-bold text-white transition bg-red-600 hover:bg-red-700"
                >
                  Reportar Fallido
                </button>
                <button
                  onClick={() => handleTransition('DELIVERED')}
                  disabled={actionLoading === 'DELIVERED'}
                  className="flex-1 py-3.5 rounded-xl font-bold text-white transition bg-green-600 hover:bg-green-700"
                >
                  Marcar Entregado
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Acciones de Navegación del Repartidor */}
        <div className="space-y-4">
          <div className="rounded-2xl border p-5 space-y-3 text-center" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
            <h3 className="font-bold text-base">Herramientas Operativas</h3>
            
            <Link
              to="/delivery/routes"
              state={{ assignmentId }}
              className="block w-full py-2.5 rounded-xl text-sm font-semibold transition border hover:bg-slate-50 dark:hover:bg-slate-900"
              style={{ borderColor: 'var(--line)', color: 'var(--text)' }}
            >
              🗺️ Ver Ruta en Mapa
            </Link>

            <Link
              to="/delivery/incidents"
              state={{ assignmentId }}
              className="block w-full py-2.5 rounded-xl text-sm font-semibold transition border hover:bg-slate-50 dark:hover:bg-slate-900"
              style={{ borderColor: 'var(--line)', color: 'var(--text)' }}
            >
              ⚠️ Reportar/Ver Incidencias
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
