import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import LastLoadedNotice from '../../../shared/components/LastLoadedNotice'
import { extractScreenSnapshotMeta } from '../../../shared/services/screen_cache'
import ReceiptActions from '../components/ReceiptActions'
import {
  chefAcceptOrder,
  chefClosePickupRetention,
  chefConfirmPickup,
  chefExtendPickupRetention,
  chefMarkPreparing,
  chefMarkPickupNoShow,
  chefMarkReady,
  chefRejectOrder,
  fetchChefOrderDetail,
} from '../services/order_service'
import { useConnectivity } from '../../../shared/hooks/useConnectivity'
import ChefOfflineBanner from '../../gestion_cocinero/components/ChefOfflineBanner'

const actionLabels = {
  accept: 'Aceptar',
  reject: 'Rechazar',
  preparing: 'Pasar a preparacion',
  ready: 'Marcar listo',
  confirm_pickup: 'Confirmar retiro',
  mark_pickup_no_show: 'Registrar no presentacion',
  extend_pickup_retention: 'Extender retencion',
  close_pickup_retention: 'Cerrar retencion',
}

export default function ChefOrderDetailPage() {
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { isOnline } = useConnectivity()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState('')
  const [message, setMessage] = useState('')
  const [offlineMeta, setOfflineMeta] = useState(null)
  const [pickupCode, setPickupCode] = useState('')
  const [timelineOpen, setTimelineOpen] = useState(false)

  useEffect(() => {
    load()
  }, [id, isOnline])

  async function load() {
    setLoading(true)
    setMessage('')
    try {
      const data = await fetchChefOrderDetail(id)
      setOrder(data.order || null)
      setPickupCode(data.order?.pickup?.pickup_code || '')
      setOfflineMeta(extractScreenSnapshotMeta(data))
    } catch (error) {
      setOfflineMeta(null)
      if (!isOnline) {
        setMessage('No hay datos offline disponibles para esta pantalla. Conéctate y sincroniza cuando tengas internet.')
      } else {
        setMessage(error?.response?.data?.detail || 'No se pudo cargar el detalle del pedido.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function runAction(action) {
    if (!order) return
    setBusyAction(action)
    setMessage('')
    try {
      if (action === 'accept') await chefAcceptOrder(order.id)
      if (action === 'reject') await chefRejectOrder(order.id)
      if (action === 'preparing') await chefMarkPreparing(order.id)
      if (action === 'ready') await chefMarkReady(order.id)
      if (action === 'confirm_pickup') {
        if (!pickupCode.trim()) {
          setMessage('Debes ingresar el codigo de retiro antes de confirmar.')
          return
        }
        await chefConfirmPickup(order.id, pickupCode.trim())
      }
      if (action === 'mark_pickup_no_show') await chefMarkPickupNoShow(order.id)
      if (action === 'extend_pickup_retention') await chefExtendPickupRetention(order.id)
      if (action === 'close_pickup_retention') await chefClosePickupRetention(order.id)
      await load()
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'No se pudo ejecutar la accion del pedido.')
    } finally {
      setBusyAction('')
    }
  }

  if (loading) {
    return <div className="rounded-xl border p-4" style={{ borderColor: 'var(--line)' }}>Cargando detalle del pedido...</div>
  }

  return (
    <section className="space-y-4">
      <ChefOfflineBanner />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Detalle del pedido</h1>
          <p style={{ color: 'var(--muted)' }}>Opera el pedido del cliente y revisa su historial completo.</p>
        </div>
        <button type="button" onClick={() => navigate('/chef/orders')} className="px-4 py-2 rounded-lg border" style={{ borderColor: 'var(--line)' }}>
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
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Cliente: {order.client?.name || 'Cliente HomeChef'}</p>
              </div>
              <div className="text-sm text-right space-y-1">
                <p>Estado: <strong>{labelForStatus(order.status)}</strong></p>
                <p>Pago: <strong>{labelForPaymentStatus(order.payment?.status)}</strong></p>
                {order.synced === false && (
                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 border border-amber-500/30">
                    Pendiente de sincronizar
                  </span>
                )}
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <Info label="Modalidad" value={order.fulfillment_type === 'delivery' ? 'Delivery' : 'Retiro'} />
              <Info label="Total" value={`Bs ${Number(order.total || 0).toFixed(2)}`} />
              <Info label="Metodo" value={labelForPaymentMethod(order.payment_method)} />
              <Info label="Creado" value={formatDate(order.created_at)} />
            </div>

            {order.address ? (
              <div className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--line)' }}>
                <strong>Direccion delivery:</strong> {order.address.line_1}
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
              <div className="rounded-xl border p-3 text-sm space-y-2" style={{ borderColor: 'var(--line)' }}>
                <p><strong>Codigo de retiro:</strong> {order.pickup.pickup_code || '-'}</p>
                <p><strong>Instrucciones:</strong> {order.pickup.pickup_instructions || 'Presenta el codigo al retirar.'}</p>
                <p><strong>Horario operativo:</strong> {order.pickup.pickup_schedule_note || 'Segun avance de preparacion.'}</p>
                {order.pickup.selected_slot_start ? <p><strong>Horario elegido por cliente:</strong> {formatPickupWindow(order.pickup.selected_slot_start, order.pickup.selected_slot_end)}</p> : null}
                {order.pickup.pickup_window_start ? <p><strong>Ventana activa:</strong> {formatPickupWindow(order.pickup.pickup_window_start, order.pickup.pickup_window_end)}</p> : null}
                {order.pickup.pickup_grace_deadline ? <p><strong>Tolerancia:</strong> hasta {formatDate(order.pickup.pickup_grace_deadline)}</p> : null}
                {order.pickup.pickup_retention_deadline ? <p><strong>Retencion:</strong> hasta {formatDate(order.pickup.pickup_retention_deadline)}</p> : null}
                {typeof order.pickup.retention_extension_count === 'number' ? (
                  <p><strong>Extensiones usadas:</strong> {order.pickup.retention_extension_count} / {order.pickup.policy?.retention_max_extensions ?? 0}</p>
                ) : null}
                {order.pickup.state_label ? <p><strong>Estado de retiro:</strong> {order.pickup.state_label}</p> : null}
                {order.pickup.state_message ? <p>{order.pickup.state_message}</p> : null}
                {order.pickup.operational_flags ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {order.pickup.operational_flags.pickup_waiting_client ? <StatusChip tone="blue">Esperando cliente</StatusChip> : null}
                    {order.pickup.operational_flags.pickup_client_no_show ? <StatusChip tone="orange">No presentado</StatusChip> : null}
                    {order.pickup.operational_flags.pickup_retention_active ? <StatusChip tone="purple">Retencion activa</StatusChip> : null}
                    {order.pickup.operational_flags.pickup_retention_expired ? <StatusChip tone="red">Retencion vencida</StatusChip> : null}
                  </div>
                ) : null}
                {order.pickup.confirmed_at ? (
                  <p><strong>Confirmado:</strong> {formatDate(order.pickup.confirmed_at)}</p>
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

            <ReceiptActions orderId={order.id} receipts={order.receipts} viewer="chef" />

            {order.available_actions?.length ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTimelineOpen(true)}
                  className="px-4 py-2 rounded-lg border"
                  style={{ borderColor: 'var(--line)', color: 'inherit' }}
                >
                  Ver timeline
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/chef/orders/${order.id}/tracking`)}
                  className="px-4 py-2 rounded-lg border"
                  style={{ borderColor: 'var(--line)', color: 'inherit' }}
                >
                  Ver tracking
                </button>
                {order.available_actions.map((action) => action === 'confirm_pickup' ? (
                  <div key={action} className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={pickupCode}
                      onChange={(event) => setPickupCode(event.target.value)}
                      placeholder="Codigo de retiro"
                      className="px-3 py-2 rounded-lg border"
                      style={{ borderColor: 'var(--line)', minWidth: 180 }}
                    />
                    <button
                      type="button"
                      onClick={() => runAction(action)}
                      disabled={busyAction !== ''}
                      className="px-4 py-2 rounded-lg text-white disabled:opacity-50"
                      style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
                    >
                      {busyAction === action ? 'Procesando...' : actionLabels[action] || action}
                    </button>
                  </div>
                ) : (
                  <button
                    key={action}
                    type="button"
                    onClick={() => runAction(action)}
                    disabled={busyAction !== ''}
                    className="px-4 py-2 rounded-lg text-white disabled:opacity-50"
                    style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
                  >
                    {busyAction === action ? 'Procesando...' : actionLabels[action] || action}
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--line)' }}>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setTimelineOpen(true)}
                    className="px-4 py-2 rounded-lg border"
                    style={{ borderColor: 'var(--line)' }}
                  >
                    Ver timeline
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/chef/orders/${order.id}/tracking`)}
                    className="px-4 py-2 rounded-lg border"
                    style={{ borderColor: 'var(--line)' }}
                  >
                    Ver tracking
                  </button>
                </div>
              </div>
            )}
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

function StatusChip({ children, tone = 'purple' }) {
  const palette = {
    purple: { bg: 'rgba(124,58,237,.08)', border: 'rgba(124,58,237,.18)', text: '#6d28d9' },
    blue: { bg: 'rgba(37,99,235,.08)', border: 'rgba(37,99,235,.18)', text: '#1d4ed8' },
    orange: { bg: 'rgba(249,115,22,.08)', border: 'rgba(249,115,22,.18)', text: '#c2410c' },
    red: { bg: 'rgba(239,68,68,.08)', border: 'rgba(239,68,68,.18)', text: '#b91c1c' },
  }[tone]
  return (
    <span
      className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
      style={{ backgroundColor: palette.bg, borderColor: palette.border, color: palette.text }}
    >
      {children}
    </span>
  )
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
