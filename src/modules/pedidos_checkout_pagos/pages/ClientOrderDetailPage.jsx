import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { cancelMyOrder, fetchMyOrderDetail } from '../services/order_service'

export default function ClientOrderDetailPage() {
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [message, setMessage] = useState('')
  const [timelineOpen, setTimelineOpen] = useState(false)

  useEffect(() => {
    load()
  }, [id])

  async function load() {
    setLoading(true)
    setMessage('')
    try {
      const data = await fetchMyOrderDetail(id)
      setOrder(data.order || null)
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'No se pudo cargar el detalle del pedido.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    if (!order?.can_cancel || cancelling) return
    setCancelling(true)
    setMessage('')
    try {
      const data = await cancelMyOrder(order.id)
      setOrder(data.order || null)
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'No se pudo cancelar el pedido.')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return <div className="rounded-xl border p-4" style={{ borderColor: 'var(--line)' }}>Cargando detalle del pedido...</div>
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Detalle del pedido</h1>
          <p style={{ color: 'var(--muted)' }}>Revisa el historial operativo y el estado actual del pedido.</p>
        </div>
        <button type="button" onClick={() => navigate('/client/orders')} className="px-4 py-2 rounded-lg border" style={{ borderColor: 'var(--line)' }}>
          Volver
        </button>
      </div>

      {message ? <div className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--line)' }}>{message}</div> : null}
      {!order ? <div className="rounded-xl border p-4" style={{ borderColor: 'var(--line)' }}>No se encontro el pedido.</div> : null}

      {order ? (
        <div className="grid gap-4">
          <section className="rounded-2xl border p-5 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Pedido {order.id}</h2>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Cocinero: {order.chef?.name || 'HomeChef'}</p>
              </div>
              <div className="text-sm text-right">
                <p>Estado: <strong>{labelForStatus(order.status)}</strong></p>
                <p>Pago: <strong>{labelForPaymentStatus(order.payment?.status)}</strong></p>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <Info label="Modalidad" value={order.fulfillment_type === 'delivery' ? 'Delivery' : 'Retiro'} />
              <Info label="Metodo" value={labelForPaymentMethod(order.payment_method)} />
              <Info label="Total" value={`Bs ${Number(order.total || 0).toFixed(2)}`} />
              <Info label="Creado" value={formatDate(order.created_at)} />
            </div>

            {order.address ? (
              <div className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--line)' }}>
                <strong>Direccion:</strong> {order.address.line_1}
                {order.address.reference ? ` · ${order.address.reference}` : ''}
              </div>
            ) : null}

            {order.delivery ? (
              <div className="rounded-xl border p-3 text-sm space-y-1" style={{ borderColor: 'var(--line)' }}>
                <p><strong>Entrega:</strong> {order.delivery.status_label}</p>
                <p><strong>Repartidor:</strong> {order.delivery.delivery_user_name || 'Aun no asignado'}</p>
                <p><strong>Incidencias abiertas:</strong> {order.delivery.open_incidents || 0}</p>
              </div>
            ) : null}

            {order.pickup ? (
              <div className="rounded-xl border p-3 text-sm space-y-1" style={{ borderColor: 'var(--line)' }}>
                <p><strong>Codigo de retiro:</strong> {order.pickup.pickup_code || '-'}</p>
                <p><strong>Instrucciones:</strong> {order.pickup.pickup_instructions || 'Presenta el codigo al cocinero.'}</p>
                <p><strong>Horario estimado:</strong> {order.pickup.pickup_schedule_note || 'Segun avance de preparacion.'}</p>
                {order.pickup.confirmed_at ? (
                  <p><strong>Retirado:</strong> {formatDate(order.pickup.confirmed_at)}</p>
                ) : null}
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

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTimelineOpen(true)}
                className="px-4 py-2 rounded-lg border"
                style={{ borderColor: 'var(--line)' }}
              >
                Ver timeline
              </button>
              {order.fulfillment_type === 'delivery' ? (
                <button
                  type="button"
                  onClick={() => navigate(`/client/orders/${order.id}/tracking`)}
                  className="px-4 py-2 rounded-lg border"
                  style={{ borderColor: 'var(--line)' }}
                >
                  Ver tracking
                </button>
              ) : null}
              {order.can_cancel ? (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="px-4 py-2 rounded-lg border disabled:opacity-50"
                  style={{ borderColor: 'var(--line)' }}
                >
                  {cancelling ? 'Cancelando...' : 'Cancelar pedido'}
                </button>
              ) : (
                <div className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--line)' }}>
                  {order.cancel_restriction || 'El pedido ya no puede cancelarse.'}
                </div>
              )}
              {order.payment_method === 'qr_simulado' && order.payment?.payment_url && ['PENDING', 'PROCESSING'].includes(order.payment?.status) ? (
                <button
                  type="button"
                  onClick={() => navigate(order.payment.payment_url)}
                  className="px-4 py-2 rounded-lg text-white"
                  style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
                >
                  Continuar pago QR
                </button>
              ) : null}
              {order.payment_method === 'bitcoin_coingate' && order.payment?.payment_url && ['PENDING', 'PROCESSING'].includes(order.payment?.status) ? (
                <button
                  type="button"
                  onClick={() => window.location.assign(order.payment.payment_url)}
                  className="px-4 py-2 rounded-lg text-white"
                  style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
                >
                  Continuar pago Bitcoin
                </button>
              ) : null}
              {order.payment_method === 'stripe_test' && order.payment?.payment_url && ['PENDING', 'PROCESSING'].includes(order.payment?.status) ? (
                <button
                  type="button"
                  onClick={() => window.location.assign(order.payment.payment_url)}
                  className="px-4 py-2 rounded-lg text-white"
                  style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
                >
                  Continuar pago Stripe
                </button>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {order ? (
        <TimelineModal
          open={timelineOpen}
          title="Timeline"
          subtitle="Bitacora completa del pedido."
          entries={order.timeline || []}
          onClose={() => setTimelineOpen(false)}
        />
      ) : null}
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

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function labelForStatus(status) {
  const map = {
    PAYMENT_VALIDATING: 'Validando pago',
    PAYMENT_FAILED: 'Pago fallido',
    AWAITING_CHEF_CONFIRMATION: 'Esperando al cocinero',
    ACCEPTED: 'Aceptado',
    PREPARING: 'En preparacion',
    READY_FOR_PICKUP: 'Listo para retiro',
    READY_FOR_DELIVERY: 'Listo para delivery',
    OUT_FOR_DELIVERY: 'En camino',
    PICKED_UP: 'Retirado',
    DELIVERED: 'Entregado',
    CANCELLED: 'Cancelado',
    EXPIRED: 'Expirado',
  }
  return map[status] || status
}

function labelForPaymentStatus(status) {
  const map = {
    PENDING: 'Pendiente de cobro',
    PROCESSING: 'Procesando pago',
    CONFIRMED: 'Cobro confirmado',
    FAILED: 'Pago fallido',
    CANCELLED: 'Pago cancelado',
    EXPIRED: 'Pago expirado',
  }
  return map[status] || status || '-'
}

function labelForPaymentMethod(method) {
  const map = {
    cash: 'Efectivo',
    stripe_test: 'Stripe test',
    qr_simulado: 'QR simulado',
    bitcoin_coingate: 'Bitcoin CoinGate',
  }
  return map[method] || method || '-'
}

function TimelineModal({ open, title, subtitle, entries, onClose }) {
  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  if (!open) return null

  const modal = (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.58)' }}
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-3xl max-h-[85vh] flex-col overflow-hidden rounded-2xl border shadow-xl"
        style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b p-5" style={{ borderColor: 'var(--line)' }}>
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="h-10 w-10 rounded-lg border" style={{ borderColor: 'var(--line)' }}>
            x
          </button>
        </div>
        <div className="space-y-3 overflow-y-auto p-5">
          {entries.length ? entries.map((entry, index) => (
            <div key={`${entry.occurred_at}-${entry.event_code}-${index}`} className="rounded-xl border p-3" style={{ borderColor: 'var(--line)' }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{entry.event_label || entry.event_code}</p>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>{entry.actor_role || 'SISTEMA'}</p>
                </div>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>{formatDate(entry.occurred_at)}</p>
              </div>
              {entry.from_status || entry.to_status ? (
                <p className="text-sm pt-2">{entry.from_status || '-'} → {entry.to_status || '-'}</p>
              ) : null}
              {entry.notes ? <p className="text-sm pt-2">{entry.notes}</p> : null}
            </div>
          )) : (
            <div className="rounded-xl border p-4 text-sm" style={{ borderColor: 'var(--line)' }}>
              No hay eventos en el timeline todavia.
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return modal
  return createPortal(modal, document.body)
}
