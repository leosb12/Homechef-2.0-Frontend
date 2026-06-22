import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useConnectivity } from '../../../shared/hooks/useConnectivity'
import RiderOfflineBanner from '../components/RiderOfflineBanner'
import { getCachedRiderModule } from '../services/deliveryRiderService'

export default function RiderHistoryPage() {
  const { isOnline } = useConnectivity()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void loadHistory()
  }, [isOnline])

  async function loadHistory() {
    setLoading(true)
    try {
      const data = await getCachedRiderModule('rider_delivery_history')
      setHistory(data || [])
    } catch (err) {
      console.error('Error loading history:', err)
    } finally {
      setLoading(false)
    }
  }

  const deliveredCount = history.filter(h => h.status === 'DELIVERED').length

  return (
    <section className="space-y-6">
      <RiderOfflineBanner />

      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Historial de Entregas</h1>
        <p style={{ color: 'var(--muted)' }}>Consulta tus entregas finalizadas, canceladas o fallidas.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Entregas Realizadas</p>
          <p className="text-4xl font-extrabold mt-1 text-green-500">{deliveredCount}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Total Registros</p>
          <p className="text-4xl font-extrabold mt-1">{history.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border p-5 text-center" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          Cargando historial de entregas...
        </div>
      ) : !history.length ? (
        <div className="rounded-2xl border p-6 text-center space-y-4" style={{ borderColor: 'var(--line)' }}>
          {!isOnline ? (
            <>
              <p className="font-semibold text-lg">No hay datos offline disponibles para esta pantalla.</p>
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Conéctate y sincroniza cuando tengas internet.</p>
            </>
          ) : (
            <>
              <p style={{ color: 'var(--muted)' }}>No tienes entregas registradas en tu historial.</p>
              <Link
                to="/delivery/assigned"
                className="inline-block px-5 py-2.5 rounded-xl font-semibold text-white transition"
                style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
              >
                Ver Entregas Activas
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {history.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border p-5 flex flex-wrap items-center justify-between gap-4"
              style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
            >
              <div>
                <h3 className="font-bold text-lg">Orden #{String(item.order_id || item.id).slice(0, 8)}</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                  <strong>Asignación:</strong> {new Date(item.assigned_at || item.created_at).toLocaleString()}
                </p>
                {item.delivered_at && (
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    <strong>Entregado:</strong> {new Date(item.delivered_at).toLocaleString()}
                  </p>
                )}
              </div>
              <div>
                <span className="text-xs px-2.5 py-1 rounded-full text-white font-bold" style={{
                  background: item.status === 'DELIVERED'
                    ? 'linear-gradient(90deg, #10b981, #059669)'
                    : 'linear-gradient(90deg, #ef4444, #dc2626)'
                }}>
                  {item.status === 'DELIVERED' ? 'Entregado' : 'Cancelado / Fallido'}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
