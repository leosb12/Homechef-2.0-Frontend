import { useEffect, useMemo, useState } from 'react'
import {
  fetchOperationalNotifications,
  markAllOperationalNotificationsRead,
  markOperationalNotificationRead,
} from '../services/notification_service'
import { useConnectivity } from '../../../shared/hooks/useConnectivity'
import ChefOfflineBanner from '../../gestion_cocinero/components/ChefOfflineBanner'
import RiderOfflineBanner from '../../delivery_rider/components/RiderOfflineBanner'

export default function NotificationCenterPage({ viewerRole = 'client' }) {
  const { isOnline } = useConnectivity()
  const [items, setItems] = useState([])
  const [summary, setSummary] = useState({ total_count: 0, unread_count: 0 })
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [busyId, setBusyId] = useState('')

  const title = useMemo(() => (
    viewerRole === 'chef' ? 'Notificaciones del cocinero' : 'Notificaciones'
  ), [viewerRole])

  useEffect(() => {
    void load()
  }, [isOnline])

  async function load() {
    setLoading(true)
    setMessage('')
    try {
      const data = await fetchOperationalNotifications()
      setItems(data.items || [])
      setSummary(data.summary || { total_count: 0, unread_count: 0 })
    } catch (error) {
      if (!isOnline) {
        setMessage('No hay datos offline disponibles para esta pantalla. Conéctate y sincroniza cuando tengas internet.')
      } else {
        setMessage(error?.response?.data?.detail || 'No se pudieron cargar las notificaciones.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkRead(notificationId) {
    setBusyId(notificationId)
    setMessage('')
    try {
      await markOperationalNotificationRead(notificationId)
      await load()
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'No se pudo marcar la notificacion.')
    } finally {
      setBusyId('')
    }
  }

  async function handleMarkAllRead() {
    setBusyId('all')
    setMessage('')
    try {
      await markAllOperationalNotificationsRead()
      await load()
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'No se pudieron marcar las notificaciones.')
    } finally {
      setBusyId('')
    }
  }

  return (
    <section className="space-y-4">
      {viewerRole === 'chef' && <ChefOfflineBanner />}
      {viewerRole === 'rider' && <RiderOfflineBanner />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p style={{ color: 'var(--muted)' }}>
            Centro operativo persistente para pedidos, pagos, delivery e incidencias.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={load}
            className="px-4 py-2 rounded-lg border"
            style={{ borderColor: 'var(--line)' }}
          >
            Recargar
          </button>
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={busyId === 'all' || !summary.unread_count}
            className="px-4 py-2 rounded-lg border disabled:opacity-50"
            style={{ borderColor: 'var(--line)' }}
          >
            {busyId === 'all' ? 'Marcando...' : 'Marcar todo leido'}
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <MetricCard label="Totales" value={summary.total_count} />
        <MetricCard label="Sin leer" value={summary.unread_count} />
      </div>

      {message ? (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--line)' }}>
          {message}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          Cargando notificaciones...
        </div>
      ) : null}

      {!loading && !items.length ? (
        <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          Aun no tienes notificaciones operativas.
        </div>
      ) : null}

      <div className="grid gap-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border p-5 space-y-3"
            style={{
              borderColor: 'var(--line)',
              backgroundColor: item.is_read ? 'var(--panel)' : 'var(--panel-soft)',
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full border" style={{ borderColor: 'var(--line)' }}>
                    {categoryLabel(item.category)}
                  </span>
                  {!item.is_read ? (
                    <span className="text-xs px-2 py-1 rounded-full text-white" style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}>
                      Nuevo
                    </span>
                  ) : null}
                </div>
                <h2 className="text-xl font-semibold mt-2">{item.title}</h2>
                <p style={{ color: 'var(--muted)' }}>{item.message}</p>
              </div>
              <div className="text-sm text-right" style={{ color: 'var(--muted)' }}>
                <p>{formatDate(item.created_at)}</p>
                <p>{item.role_context || '-'}</p>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              <Info label="Pedido" value={item.order_ref || '-'} />
              <Info label="Entrega" value={item.assignment_ref || '-'} />
              <Info label="Evento" value={item.event_code} />
            </div>

            <div className="flex flex-wrap gap-2">
              {item.action_web_path ? (
                <a
                  href={item.action_web_path}
                  className="px-4 py-2 rounded-lg text-white"
                  style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
                >
                  {item.action_label || 'Abrir'}
                </a>
              ) : null}
              {!item.is_read ? (
                <button
                  type="button"
                  onClick={() => handleMarkRead(item.id)}
                  disabled={busyId === item.id}
                  className="px-4 py-2 rounded-lg border disabled:opacity-50"
                  style={{ borderColor: 'var(--line)' }}
                >
                  {busyId === item.id ? 'Marcando...' : 'Marcar leida'}
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--line)' }}>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="font-semibold break-all">{value}</p>
    </div>
  )
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function categoryLabel(value) {
  const map = {
    ORDER: 'Pedido',
    PAYMENT: 'Pago',
    DELIVERY: 'Delivery',
    INCIDENT: 'Incidencia',
    INVENTORY: 'Inventario',
  }
  return map[value] || value
}
