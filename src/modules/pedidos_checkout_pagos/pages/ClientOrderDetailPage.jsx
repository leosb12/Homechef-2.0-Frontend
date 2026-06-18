import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import LastLoadedNotice from '../../../shared/components/LastLoadedNotice'
import { extractScreenSnapshotMeta } from '../../../shared/services/screen_cache'
import ReceiptActions from '../components/ReceiptActions'
import RepeatOrderSummaryModal from '../components/RepeatOrderSummaryModal'
import { createChefReview, createDishReview } from '../../marketplace_platos/services/public_dashboard_service'
import { cancelMyOrder, fetchMyOrderDetail, repeatMyOrder } from '../services/order_service'

export default function ClientOrderDetailPage() {
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [repeating, setRepeating] = useState(false)
  const [message, setMessage] = useState('')
  const [offlineMeta, setOfflineMeta] = useState(null)
  const [timelineOpen, setTimelineOpen] = useState(false)
  const [repeatSummary, setRepeatSummary] = useState(null)
  const [ratingModalOpen, setRatingModalOpen] = useState(false)
  const [ratingTarget, setRatingTarget] = useState(null)

  useEffect(() => {
    load()
  }, [id])

  async function load() {
    setLoading(true)
    setMessage('')
    try {
      const data = await fetchMyOrderDetail(id)
      setOrder(data.order || null)
      setOfflineMeta(extractScreenSnapshotMeta(data))
    } catch (error) {
      setOfflineMeta(null)
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

  async function handleRepeat() {
    if (!order?.items?.length || repeating) return
    setRepeating(true)
    setMessage('')
    try {
      const data = await repeatMyOrder(order.id)
      const requested = Number(data?.summary?.requested_items || 0)
      const added = Number(data?.summary?.added_items || 0)
      const skipped = Number(data?.summary?.skipped_items || 0)
      if (data?.cart?.id && requested > 0 && added === requested && skipped === 0) {
        navigate(`/client/cart?cart_id=${encodeURIComponent(data.cart.id)}`, {
          state: {
            repeatSummary: {
              message: data.message,
              added,
              skipped,
              requested,
            },
          },
        })
        return
      }
      setRepeatSummary(data)
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'No se pudo repetir el pedido.')
    } finally {
      setRepeating(false)
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
      {offlineMeta ? <LastLoadedNotice cachedAt={offlineMeta.cachedAt} /> : null}
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
                <p><strong>Horario operativo:</strong> {order.pickup.pickup_schedule_note || 'Segun avance de preparacion.'}</p>
                {order.pickup.selected_slot_start ? <p><strong>Horario elegido:</strong> {formatPickupWindow(order.pickup.selected_slot_start, order.pickup.selected_slot_end)}</p> : null}
                {order.pickup.pickup_window_start ? <p><strong>Ventana activa:</strong> {formatPickupWindow(order.pickup.pickup_window_start, order.pickup.pickup_window_end)}</p> : null}
                {order.pickup.pickup_grace_deadline ? <p><strong>Tolerancia:</strong> hasta {formatDate(order.pickup.pickup_grace_deadline)}</p> : null}
                {order.pickup.pickup_retention_deadline ? <p><strong>Retencion:</strong> hasta {formatDate(order.pickup.pickup_retention_deadline)}</p> : null}
                {order.pickup.state_label ? <p><strong>Estado de retiro:</strong> {order.pickup.state_label}</p> : null}
                {order.pickup.state_message ? <p>{order.pickup.state_message}</p> : null}
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
              {(order.status === 'DELIVERED' || order.status === 'PICKED_UP') && (
                <button
                  type="button"
                  onClick={() => setRatingModalOpen(true)}
                  className="px-4 py-2 rounded-lg text-white font-semibold shadow"
                  style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
                >
                  Calificar pedido
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate(`/client/orders/${order.id}/tracking`)}
                className="px-4 py-2 rounded-lg border"
                style={{ borderColor: 'var(--line)' }}
              >
                Ver tracking
              </button>
              {order.receipts?.length ? (
                <ReceiptActions
                  orderId={order.id}
                  receipts={order.receipts}
                  viewer="client"
                  compact
                  inline
                  title="Comprobante"
                />
              ) : null}
              <button
                type="button"
                onClick={handleRepeat}
                disabled={repeating}
                className="px-4 py-2 rounded-lg border disabled:opacity-50"
                style={{ borderColor: 'var(--line)' }}
              >
                {repeating ? 'Repitiendo...' : 'Repetir pedido'}
              </button>
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
      <RepeatOrderSummaryModal
        open={Boolean(repeatSummary)}
        summary={repeatSummary}
        onClose={() => setRepeatSummary(null)}
        onGoToCart={() => {
          if (!repeatSummary?.cart?.id) return
          navigate(`/client/cart?cart_id=${encodeURIComponent(repeatSummary.cart.id)}`)
          setRepeatSummary(null)
        }}
      />

      {order ? (
        <RatingSelectionModal
          open={ratingModalOpen && !ratingTarget}
          order={order}
          onClose={() => setRatingModalOpen(false)}
          onSelect={(target) => setRatingTarget(target)}
        />
      ) : null}

      {ratingTarget ? (
        <ReviewFormModal
          target={ratingTarget}
          onClose={() => setRatingTarget(null)}
          onSubmit={async (rating, comment) => {
            if (ratingTarget.type === 'chef') {
              await createChefReview(ratingTarget.id, { rating, comment })
            } else {
              await createDishReview(ratingTarget.id, { rating, comment })
            }
          }}
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

function formatPickupWindow(start, end) {
  if (!start) return '-'
  const startDate = new Date(start)
  const endDate = end ? new Date(end) : null
  const dateLabel = startDate.toLocaleDateString()
  const startLabel = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const endLabel = endDate ? endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'
  return `${dateLabel} ${startLabel} - ${endLabel}`
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

function RatingSelectionModal({ open, order, onClose, onSelect }) {
  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [open])

  if (!open) return null

  const modal = (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.58)' }}
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border shadow-xl"
        style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b p-5" style={{ borderColor: 'var(--line)' }}>
          <div>
            <h2 className="text-xl font-semibold">Calificar experiencia</h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>¿Que te gustaria calificar de este pedido?</p>
          </div>
          <button type="button" onClick={onClose} className="h-10 w-10 rounded-lg border" style={{ borderColor: 'var(--line)' }}>
            x
          </button>
        </div>
        <div className="space-y-3 overflow-y-auto p-5">
          {order.chef ? (
            <button
              onClick={() => onSelect({ type: 'chef', id: order.chef.id, name: order.chef.name })}
              className="w-full text-left p-4 rounded-xl border flex items-center justify-between"
              style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}
            >
              <div>
                <p className="font-semibold text-orange-500">🧑‍🍳 Cocinero: {order.chef.name}</p>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Valora el servicio general</p>
              </div>
              <span className="text-lg">→</span>
            </button>
          ) : null}
          {order.items.map(item => (
            <button
              key={item.dish_id}
              onClick={() => onSelect({ type: 'dish', id: item.dish_id, name: item.dish_name })}
              className="w-full text-left p-4 rounded-xl border flex items-center justify-between"
              style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}
            >
              <div>
                <p className="font-semibold text-green-500">🍲 Plato: {item.dish_name}</p>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Valora la comida</p>
              </div>
              <span className="text-lg">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
  if (typeof document === 'undefined') return modal
  return createPortal(modal, document.body)
}

function ReviewFormModal({ target, onClose, onSubmit }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSubmit(Number(rating), comment)
      alert('¡Gracias por tu calificación!')
      onClose()
    } catch (err) {
      setError(err?.response?.data?.detail || 'No se pudo guardar la reseña.')
    } finally {
      setSaving(false)
    }
  }

  const modal = (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.58)' }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border shadow-xl"
        style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b p-5" style={{ borderColor: 'var(--line)' }}>
          <h2 className="text-xl font-semibold">
            Calificar {target.type === 'chef' ? 'al cocinero' : 'plato'}: <span className="text-brand">{target.name}</span>
          </h2>
          <button type="button" onClick={onClose} className="h-10 w-10 rounded-lg border" style={{ borderColor: 'var(--line)' }}>
            x
          </button>
        </div>
        <div className="space-y-4 p-5">
          {error ? <div className="text-red-500 text-sm bg-red-500/10 p-3 rounded-lg">{error}</div> : null}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold">Calificación (1 a 5)</label>
            <select
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="border rounded-xl px-3 py-2 w-full outline-none"
              style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}
            >
              <option value="5">5 - Excelente</option>
              <option value="4">4 - Muy bueno</option>
              <option value="3">3 - Bueno</option>
              <option value="2">2 - Regular</option>
              <option value="1">1 - Malo</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold">Comentario</label>
            <textarea
              required
              minLength={4}
              maxLength={600}
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Escribe tu reseña visible para la comunidad..."
              className="border rounded-xl px-3 py-2 w-full outline-none"
              style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}
            />
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full px-4 py-3 rounded-xl text-white font-semibold disabled:opacity-60 shadow"
              style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
            >
              {saving ? 'Publicando...' : 'Publicar reseña'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
  if (typeof document === 'undefined') return modal
  return createPortal(modal, document.body)
}
