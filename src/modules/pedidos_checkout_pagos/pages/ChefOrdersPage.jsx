import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  chefAcceptOrder,
  chefMarkPreparing,
  chefMarkReady,
  chefRejectOrder,
  fetchChefOrders,
} from '../services/order_service'

const actionLabels = {
  accept: 'Aceptar',
  reject: 'Rechazar',
  preparing: 'Pasar a preparacion',
  ready: 'Marcar listo',
  confirm_pickup: 'Ir a confirmar retiro',
}

export default function ChefOrdersPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [busyOrderId, setBusyOrderId] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setMessage('')
    try {
      const data = await fetchChefOrders()
      setItems(data.items || [])
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'No se pudieron cargar los pedidos recibidos.')
    } finally {
      setLoading(false)
    }
  }

  async function runAction(orderId, action) {
    setBusyOrderId(orderId)
    setMessage('')
    try {
      if (action === 'accept') await chefAcceptOrder(orderId)
      if (action === 'reject') await chefRejectOrder(orderId)
      if (action === 'preparing') await chefMarkPreparing(orderId)
      if (action === 'ready') await chefMarkReady(orderId)
      if (action === 'confirm_pickup') {
        navigate(`/chef/orders/${orderId}`)
        return
      }
      await load()
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'No se pudo ejecutar la accion del pedido.')
    } finally {
      setBusyOrderId('')
    }
  }

  const filteredItems = useMemo(() => items.filter((order) => matchesFilter(order, filter)), [items, filter])

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Pedidos recibidos</h1>
          <p style={{ color: 'var(--muted)' }}>Gestiona aceptacion, rechazo, preparacion y cierre hasta READY.</p>
        </div>
        <button type="button" onClick={load} className="px-4 py-2 rounded-lg border" style={{ borderColor: 'var(--line)' }}>
          Recargar
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ['all', 'Todos'],
          ['pending', 'Pendientes'],
          ['accepted', 'Aceptados'],
          ['preparing', 'Preparando'],
          ['ready', 'Listos'],
          ['closed', 'Cerrados'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className="px-4 py-2 rounded-lg border"
            style={{
              borderColor: 'var(--line)',
              backgroundColor: filter === value ? 'rgba(124,58,237,.12)' : 'transparent',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {message && <div className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--line)' }}>{message}</div>}
      {loading ? <div className="rounded-xl border p-4" style={{ borderColor: 'var(--line)' }}>Cargando pedidos...</div> : null}

      {!loading && !filteredItems.length ? (
        <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          No tienes pedidos en este filtro.
        </div>
      ) : null}

      <div className="grid gap-4">
        {filteredItems.map((order) => (
          <article key={order.id} className="rounded-2xl border p-5 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Pedido {order.id}</h2>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Cliente: {order.client?.name || 'Cliente HomeChef'}</p>
              </div>
              <div className="text-sm text-right">
                <p>Estado: <strong>{labelForStatus(order.status)}</strong></p>
                <p>Pago: <strong>{labelForPaymentStatus(order.payment?.status)}</strong></p>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <Info label="Modalidad" value={order.fulfillment_type === 'delivery' ? 'Delivery' : 'Retiro'} />
              <Info label="Total" value={`Bs ${Number(order.total || 0).toFixed(2)}`} />
            </div>

            {order.address ? (
              <div className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--line)' }}>
                <strong>Direccion delivery:</strong> {order.address.line_1}
                {order.address.reference ? ` · ${order.address.reference}` : ''}
              </div>
            ) : null}

            <div className="grid gap-2">
              {order.items.map((item) => (
                <div key={item.id} className="rounded-xl border p-3" style={{ borderColor: 'var(--line)' }}>
                  <p className="font-semibold">{item.dish_name}</p>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>{item.quantity} x Bs {Number(item.unit_price || 0).toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate(`/chef/orders/${order.id}`)}
                className="px-4 py-2 rounded-lg border"
                style={{ borderColor: 'var(--line)' }}
              >
                Ver detalle
              </button>
              <button
                type="button"
                onClick={() => navigate(`/chef/orders/${order.id}/tracking`)}
                className="px-4 py-2 rounded-lg border"
                style={{ borderColor: 'var(--line)' }}
              >
                Tracking
              </button>
              {order.available_actions?.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => runAction(order.id, action)}
                  disabled={busyOrderId === order.id}
                  className="px-4 py-2 rounded-lg text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
                >
                  {busyOrderId === order.id ? 'Procesando...' : actionLabels[action] || action}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--line)' }}>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  )
}

function matchesFilter(order, filter) {
  if (filter === 'pending') return order.status === 'AWAITING_CHEF_CONFIRMATION'
  if (filter === 'accepted') return order.status === 'ACCEPTED'
  if (filter === 'preparing') return order.status === 'PREPARING'
  if (filter === 'ready') return ['READY_FOR_PICKUP', 'READY_FOR_DELIVERY'].includes(order.status)
  if (filter === 'closed') return ['REJECTED', 'PICKED_UP', 'DELIVERED', 'CANCELLED'].includes(order.status)
  return true
}

function labelForStatus(status) {
  const map = {
    AWAITING_CHEF_CONFIRMATION: 'Esperando confirmacion',
    ACCEPTED: 'Aceptado',
    REJECTED: 'Rechazado',
    PREPARING: 'En preparacion',
    READY_FOR_PICKUP: 'Listo para retiro',
    READY_FOR_DELIVERY: 'Listo para delivery',
    PICKED_UP: 'Retirado',
    DELIVERED: 'Entregado',
    CANCELLED: 'Cancelado',
  }
  return map[status] || status
}

function labelForPaymentStatus(status) {
  const map = {
    PENDING: 'Pendiente de cobro',
    PROCESSING: 'Procesando pago',
    CONFIRMED: 'Cobro confirmado',
    CANCELLED: 'Pago cancelado',
    FAILED: 'Pago fallido',
    EXPIRED: 'Pago expirado',
  }
  return map[status] || status || '-'
}
