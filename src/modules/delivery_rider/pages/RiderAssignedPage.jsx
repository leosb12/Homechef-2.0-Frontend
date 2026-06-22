import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useConnectivity } from '../../../shared/hooks/useConnectivity'
import RiderOfflineBanner from '../components/RiderOfflineBanner'
import {
  fetchAssignedDeliveries,
  fetchAvailableOffers,
  fetchAvailability,
  updateAvailability,
  acceptDelivery,
  claimDelivery,
} from '../services/deliveryRiderService'

export default function RiderAssignedPage() {
  const { isOnline } = useConnectivity()
  const [assigned, setAssigned] = useState([])
  const [offers, setOffers] = useState([])
  const [availability, setAvailability] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [actionLoading, setActionLoading] = useState('')

  useEffect(() => {
    void loadData()
  }, [isOnline])

  async function loadData() {
    setLoading(true)
    setErrorMsg('')
    try {
      const [assignedData, offersData, availData] = await Promise.all([
        fetchAssignedDeliveries(),
        fetchAvailableOffers(),
        fetchAvailability(),
      ])
      setAssigned(assignedData || [])
      setOffers(offersData || [])
      setAvailability(availData)
    } catch (err) {
      console.error('Error loading rider dashboard:', err)
      if (!isOnline) {
        setErrorMsg('Sin conexión. Mostrando datos de tu última sincronización.')
      } else {
        setErrorMsg(err?.response?.data?.detail || 'No se pudieron cargar los datos.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleAvailability() {
    if (!availability) return
    const nextStatus = availability.manual_status === 'DISPONIBLE' ? 'FUERA_DE_SERVICIO' : 'DISPONIBLE'
    setActionLoading('availability')
    try {
      const updated = await updateAvailability(nextStatus)
      setAvailability(updated)
    } catch (err) {
      alert(err?.response?.data?.detail || 'Error al actualizar disponibilidad.')
    } finally {
      setActionLoading('')
    }
  }

  async function handleAccept(id, isClaim = false) {
    setActionLoading(id)
    try {
      if (isClaim) {
        await claimDelivery(id)
      } else {
        await acceptDelivery(id)
      }
      await loadData()
    } catch (err) {
      alert(err?.response?.data?.detail || 'Error al procesar el pedido.')
    } finally {
      setActionLoading('')
    }
  }

  const noCache = !loading && !assigned.length && !offers.length && !availability

  return (
    <section className="space-y-6">
      <RiderOfflineBanner />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Dashboard del Repartidor</h1>
          <p style={{ color: 'var(--muted)' }}>Gestiona tus entregas asignadas y mantente al tanto de nuevas ofertas.</p>
        </div>
        
        {availability && (
          <div className="flex items-center gap-3 rounded-2xl border p-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
            <div className="text-right">
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Estado de servicio</p>
              <p className="text-sm font-bold" style={{ color: availability.manual_status === 'DISPONIBLE' ? '#10b981' : '#ef4444' }}>
                {availability.manual_status === 'DISPONIBLE' ? 'Disponible' : 'Fuera de servicio'}
              </p>
            </div>
            <button
              onClick={handleToggleAvailability}
              disabled={actionLoading === 'availability'}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition text-white"
              style={{
                background: availability.manual_status === 'DISPONIBLE'
                  ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                  : 'linear-gradient(90deg, #10b981, #059669)',
              }}
            >
              {actionLoading === 'availability' ? '...' : availability.manual_status === 'DISPONIBLE' ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="rounded-xl border p-3 text-sm text-yellow-600 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-900/30">
          {errorMsg}
        </div>
      )}

      {noCache && (
        <div className="rounded-2xl border p-6 text-center" style={{ borderColor: 'var(--line)' }}>
          <p className="font-semibold text-lg">No hay datos offline disponibles para esta pantalla.</p>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Conéctate y sincroniza cuando tengas internet.</p>
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border p-6 text-center" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          Cargando información del repartidor...
        </div>
      )}

      {!loading && !noCache && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Asignados */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Mis Entregas Asignadas ({assigned.length})</h2>
            {!assigned.length ? (
              <div className="rounded-2xl border p-5 text-center" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
                <p style={{ color: 'var(--muted)' }}>No tienes entregas activas asignadas.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {assigned.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border p-5 space-y-3"
                    style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs px-2 py-1 rounded-full text-white" style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}>
                        {item.status_label || item.status}
                      </span>
                      {item.__offline && (
                        <span className="text-xs text-orange-500 font-semibold animate-pulse">Pendiente de sincronizar</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold">Orden #{String(item.order_id || item.order?.id).slice(0, 8)}</h3>
                      <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                        <strong>Cocina:</strong> {item.chef_business_name || item.order?.chef_name || 'HomeChef'}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--muted)' }}>
                        <strong>Cliente:</strong> {item.client_name || item.order?.client_name}
                      </p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Link
                        to="/delivery/active"
                        state={{ assignmentId: item.id }}
                        className="flex-1 text-center py-2 rounded-xl text-sm font-semibold text-white transition"
                        style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
                      >
                        Ver Ruta y Detalles
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* Ofertas Disponibles */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Tablero de Ofertas ({offers.length})</h2>
            {!offers.length ? (
              <div className="rounded-2xl border p-5 text-center" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
                <p style={{ color: 'var(--muted)' }}>No hay ofertas disponibles en el tablero actualmente.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {offers.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border p-5 space-y-3"
                    style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
                  >
                    <div>
                      <h3 className="font-bold">Oferta de Entrega</h3>
                      <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                        <strong>Distancia estimada:</strong> {item.distance_km || 'N/A'} km
                      </p>
                      <p className="text-sm" style={{ color: 'var(--muted)' }}>
                        <strong>Pago estimado:</strong> ${item.estimated_earning || 'N/A'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAccept(item.id, true)}
                      disabled={actionLoading === item.id}
                      className="w-full py-2 rounded-xl text-sm font-semibold text-white transition"
                      style={{ background: 'linear-gradient(90deg, #10b981, #059669)' }}
                    >
                      {actionLoading === item.id ? 'Reclamando...' : 'Reclamar Pedido'}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
