import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cancelMyOrder, fetchMyOrders } from '../services/order_service'

const ORDER_STATUS_OPTIONS = [
  { value: 'ALL', label: 'Todos' },
  { value: 'ACTIVE', label: 'Activos' },
  { value: 'DELIVERED', label: 'Entregados' },
  { value: 'PICKED_UP', label: 'Retirados' },
  { value: 'CANCELLED', label: 'Cancelados' },
  { value: 'PAYMENT_ISSUES', label: 'Con problemas de pago' },
]

const PAYMENT_STATUS_OPTIONS = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'PROCESSING', label: 'Procesando' },
  { value: 'CONFIRMED', label: 'Confirmado' },
  { value: 'FAILED', label: 'Fallido' },
  { value: 'CANCELLED', label: 'Cancelado' },
  { value: 'EXPIRED', label: 'Expirado' },
]

const FULFILLMENT_OPTIONS = [
  { value: 'ALL', label: 'Todos' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'pickup', label: 'Retiro' },
]

export default function ClientOrdersPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [busyOrderId, setBusyOrderId] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [paymentFilter, setPaymentFilter] = useState('ALL')
  const [fulfillmentFilter, setFulfillmentFilter] = useState('ALL')
  const [timelineOrder, setTimelineOrder] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setMessage('')
    try {
      const data = await fetchMyOrders()
      setItems(data.items || [])
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'No se pudieron cargar tus pedidos.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel(orderId) {
    setBusyOrderId(orderId)
    setMessage('')
    try {
      await cancelMyOrder(orderId)
      await load()
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'No se pudo cancelar el pedido.')
    } finally {
      setBusyOrderId('')
    }
  }

  function clearFilters() {
    setSearch('')
    setStatusFilter('ALL')
    setPaymentFilter('ALL')
    setFulfillmentFilter('ALL')
  }

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return items.filter((order) => {
      if (statusFilter !== 'ALL' && !matchesOrderStatus(order, statusFilter)) {
        return false
      }
      if (paymentFilter !== 'ALL' && (order.payment?.status || '') !== paymentFilter) {
        return false
      }
      if (fulfillmentFilter !== 'ALL' && order.fulfillment_type !== fulfillmentFilter) {
        return false
      }
      if (!normalizedSearch) return true

      const dishNames = (order.items || []).map((item) => item.dish_name).join(' ')
      const haystack = [order.id, order.chef?.name, order.address?.line_1, dishNames]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [items, search, statusFilter, paymentFilter, fulfillmentFilter])

  const stats = useMemo(() => {
    const active = items.filter((order) => isActiveOrder(order.status)).length
    const delivered = items.filter((order) => ['DELIVERED', 'PICKED_UP'].includes(order.status)).length
    const incidents = items.filter((order) => hasOrderAttention(order)).length
    return {
      total: items.length,
      active,
      delivered,
      incidents,
    }
  }, [items])

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-4">
          <div
            className="grid h-14 w-14 place-items-center rounded-2xl"
            style={{
              background: 'linear-gradient(180deg, rgba(124,58,237,.15), rgba(124,58,237,.08))',
              color: '#7c3aed',
            }}
          >
            <OrdersIcon />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Mis pedidos</h1>
            <p style={{ color: 'var(--muted)' }}>Aqui ves el estado real del pedido y de cada intento de pago.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 font-medium"
          style={{ borderColor: 'var(--line)' }}
        >
          <RefreshIcon />
          <span>Recargar</span>
        </button>
      </div>

      {message ? <div className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--line)' }}>{message}</div> : null}

      <section className="rounded-[28px] border p-5 space-y-5" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
        <div className="grid gap-3 xl:grid-cols-[1.3fr_repeat(3,minmax(0,1fr))]">
          <SearchField value={search} onChange={setSearch} />
          <FilterSelect label="Estado del pedido" value={statusFilter} onChange={setStatusFilter} options={ORDER_STATUS_OPTIONS} />
          <FilterSelect label="Estado del pago" value={paymentFilter} onChange={setPaymentFilter} options={PAYMENT_STATUS_OPTIONS} />
          <FilterSelect label="Modalidad" value={fulfillmentFilter} onChange={setFulfillmentFilter} options={FULFILLMENT_OPTIONS} />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 font-medium"
            style={{ borderColor: 'var(--line)' }}
          >
            <FilterOffIcon />
            <span>Limpiar filtros</span>
          </button>
          <div className="inline-flex items-center rounded-xl px-3 py-2 text-sm" style={{ backgroundColor: 'var(--panel-soft)', color: 'var(--muted)' }}>
            Mostrando {filteredItems.length} de {items.length} pedidos
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Todos" value={stats.total} helper="Pedidos totales" tone="purple" icon={<OrdersIcon />} />
          <StatCard label="Activos" value={stats.active} helper="En curso" tone="blue" icon={<ClockIcon />} />
          <StatCard label="Completados" value={stats.delivered} helper="Entregados o retirados" tone="green" icon={<CheckCircleIcon />} />
          <StatCard label="Requieren atencion" value={stats.incidents} helper="Pago o entrega con alerta" tone="orange" icon={<WarningIcon />} />
        </div>
      </section>

      {loading ? <div className="rounded-xl border p-4" style={{ borderColor: 'var(--line)' }}>Cargando pedidos...</div> : null}

      {!loading && !filteredItems.length ? (
        <div className="rounded-[28px] border p-6" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          {items.length ? 'No hay pedidos que coincidan con los filtros aplicados.' : 'Aun no tienes pedidos registrados.'}
        </div>
      ) : null}

      <div className="grid gap-5">
        {filteredItems.map((order) => {
          const progressSteps = buildOrderProgress(order)
          const paymentAction = getPaymentAction(order)
          const showTracking = order.fulfillment_type === 'delivery'

          return (
            <article key={order.id} className="rounded-[28px] border p-5 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  <div
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
                    style={{ backgroundColor: 'rgba(124,58,237,.10)', color: '#7c3aed' }}
                  >
                    <ReceiptIcon />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-2xl font-semibold">Pedido {order.id}</h2>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>
                      Cocinero: <span className="font-medium" style={{ color: 'var(--text)' }}>{order.chef?.name || 'HomeChef'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge label={`Estado: ${labelForStatus(order.status)}`} tone={statusTone(order.status)} icon={<CheckCircleIcon />} />
                  <StatusBadge label={`Pago: ${labelForPaymentStatus(order.payment?.status)}`} tone={paymentTone(order.payment?.status)} icon={<CardIcon />} />
                </div>
              </div>

              <div className="grid gap-3 xl:grid-cols-4">
                <MetricCard label="Modalidad" value={order.fulfillment_type === 'delivery' ? 'Delivery' : 'Retiro'} icon={<StoreIcon />} />
                <MetricCard label="Total" value={`Bs ${Number(order.total || 0).toFixed(2)}`} icon={<MoneyIcon />} />
                <MetricCard label="Metodo de pago" value={labelForPaymentMethod(order.payment_method)} icon={<CardIcon />} />
                <MetricCard label="Creado" value={formatDate(order.created_at)} icon={<CalendarIcon />} />
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.45fr)]">
                <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--line)' }}>
                  <p className="text-sm font-semibold">Productos</p>
                  <div className="mt-3 space-y-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 rounded-2xl border p-3" style={{ borderColor: 'var(--line)' }}>
                        <div
                          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl"
                          style={{ background: 'linear-gradient(180deg, rgba(245,158,11,.18), rgba(245,158,11,.08))' }}
                        >
                          <BowlIcon />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{item.dish_name}</p>
                          <p className="text-sm" style={{ color: 'var(--muted)' }}>
                            {item.quantity} x Bs {Number(item.unit_price || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--line)' }}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">Seguimiento del pedido</p>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      {showTracking ? 'Con tracking para delivery' : 'Retiro en punto del cocinero'}
                    </span>
                  </div>

                  <div className={`mt-5 grid gap-4 ${progressSteps.length >= 6 ? 'xl:grid-cols-6' : progressSteps.length === 5 ? 'xl:grid-cols-5' : 'md:grid-cols-4'}`}>
                    {progressSteps.map((step, index) => {
                      const active = step.active
                      const done = step.done
                      const last = index === progressSteps.length - 1
                      return (
                        <div key={`${order.id}-${step.label}`} className="relative">
                          {!last ? (
                            <div
                              className="absolute left-[calc(50%+20px)] right-[-20px] top-5 hidden xl:block h-[2px]"
                              style={{ backgroundColor: done ? '#16a34a' : 'rgba(148,163,184,.35)' }}
                            />
                          ) : null}
                          <div className="flex flex-col items-start gap-3 xl:items-center xl:text-center">
                            <div
                              className="grid h-10 w-10 place-items-center rounded-full border"
                              style={{
                                borderColor: done || active ? '#16a34a' : 'rgba(148,163,184,.35)',
                                backgroundColor: done || active ? 'rgba(34,197,94,.12)' : 'transparent',
                                color: done || active ? '#15803d' : 'var(--muted)',
                              }}
                            >
                              {done || active ? <CheckMiniIcon /> : <DotIcon />}
                            </div>
                            <div>
                              <p className="font-medium">{step.label}</p>
                              {step.date ? (
                                <p className="text-xs" style={{ color: 'var(--muted)' }}>{formatDate(step.date)}</p>
                              ) : (
                                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                                  {done ? 'Completado' : active ? 'Estado actual' : 'Pendiente'}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {order.address ? (
                <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: 'var(--line)' }}>
                  <strong>Direccion:</strong> {order.address.line_1}
                  {order.address.reference ? ` · ${order.address.reference}` : ''}
                </div>
              ) : null}

              {order.pickup ? (
                <div className="rounded-2xl border p-4 text-sm space-y-1" style={{ borderColor: 'var(--line)' }}>
                  <p><strong>Codigo de retiro:</strong> {order.pickup.pickup_code || '-'}</p>
                  <p><strong>Instrucciones:</strong> {order.pickup.pickup_instructions || 'Presenta el codigo al cocinero.'}</p>
                  <p><strong>Horario estimado:</strong> {order.pickup.pickup_schedule_note || 'Segun avance de preparacion.'}</p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2 pt-1">
                <PrimaryActionButton onClick={() => setTimelineOrder(order)} icon={<TimelineIcon />}>
                  Ver timeline
                </PrimaryActionButton>

                {showTracking ? (
                  <SecondaryActionButton onClick={() => navigate(`/client/orders/${order.id}/tracking`)} icon={<DeliveryIcon />}>
                    Ver tracking
                  </SecondaryActionButton>
                ) : null}

                {paymentAction ? (
                  <SecondaryActionButton onClick={paymentAction.onClick} icon={<CardIcon />}>
                    {paymentAction.label}
                  </SecondaryActionButton>
                ) : null}

                {order.can_cancel ? (
                  <SecondaryActionButton
                    onClick={() => handleCancel(order.id)}
                    disabled={busyOrderId === order.id}
                    icon={<CloseCircleIcon />}
                  >
                    {busyOrderId === order.id ? 'Cancelando...' : 'Cancelar pedido'}
                  </SecondaryActionButton>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>

      {timelineOrder ? <TimelineModal order={timelineOrder} onClose={() => setTimelineOrder(null)} /> : null}
    </section>
  )
}

function SearchField({ value, onChange }) {
  return (
    <label className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--line)' }}>
      <div className="flex items-center gap-3">
        <span style={{ color: 'var(--muted)' }}>
          <SearchIcon />
        </span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Buscar por ID, producto o cocinero..."
          className="w-full bg-transparent outline-none"
        />
      </div>
    </label>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--line)' }}>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>{label}</p>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full bg-transparent font-medium outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function StatCard({ label, value, helper, tone, icon }) {
  const palette = statTone(tone)
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
      <div className="flex items-center gap-4">
        <div
          className="grid h-14 w-14 place-items-center rounded-full"
          style={{ backgroundColor: palette.soft, color: palette.strong }}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{label}</p>
          <p className="text-3xl font-bold leading-none">{value}</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>{helper}</p>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, icon }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--line)' }}>
      <div className="flex items-center gap-3">
        <div
          className="grid h-11 w-11 place-items-center rounded-full"
          style={{ backgroundColor: 'rgba(124,58,237,.08)', color: '#7c3aed' }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{label}</p>
          <p className="truncate text-lg font-semibold">{value}</p>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ label, tone, icon }) {
  const palette = badgeTone(tone)
  return (
    <div
      className="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium"
      style={{
        borderColor: palette.border,
        backgroundColor: palette.background,
        color: palette.text,
      }}
    >
      {icon}
      <span>{label}</span>
    </div>
  )
}

function PrimaryActionButton({ children, onClick, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl px-4 py-3 font-semibold text-white"
      style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}

function SecondaryActionButton({ children, onClick, icon, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 font-medium disabled:opacity-50"
      style={{ borderColor: 'var(--line)' }}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}

function TimelineModal({ order, onClose }) {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const entries = Array.isArray(order?.timeline) ? order.timeline : []

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
            <h2 className="text-xl font-semibold">Timeline del pedido</h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Pedido {order.id}</p>
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
              No hay eventos disponibles en el timeline.
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return modal
  return createPortal(modal, document.body)
}

function getPaymentAction(order) {
  if (!order?.payment?.payment_url) return null
  if (!['PENDING', 'PROCESSING'].includes(order.payment?.status)) return null

  if (order.payment_method === 'qr_simulado') {
    return {
      label: 'Continuar pago QR',
      onClick: () => window.location.assign(order.payment.payment_url),
    }
  }
  if (order.payment_method === 'bitcoin_coingate') {
    return {
      label: 'Continuar pago Bitcoin',
      onClick: () => window.location.assign(order.payment.payment_url),
    }
  }
  if (order.payment_method === 'stripe_test') {
    return {
      label: 'Continuar pago Stripe',
      onClick: () => window.location.assign(order.payment.payment_url),
    }
  }
  return null
}

function buildOrderProgress(order) {
  const isDelivery = order.fulfillment_type === 'delivery'
  const steps = isDelivery
    ? [
        { key: 'AWAITING_CHEF_CONFIRMATION', label: 'Pedido recibido' },
        { key: 'ACCEPTED', label: 'Aceptado' },
        { key: 'PREPARING', label: 'Preparando' },
        { key: 'READY_FOR_DELIVERY', label: 'Listo para delivery' },
        { key: 'OUT_FOR_DELIVERY', label: 'En camino' },
        { key: 'DELIVERED', label: 'Entregado' },
      ]
    : [
        { key: 'AWAITING_CHEF_CONFIRMATION', label: 'Pedido recibido' },
        { key: 'ACCEPTED', label: 'Aceptado' },
        { key: 'PREPARING', label: 'Preparando' },
        { key: 'READY_FOR_PICKUP', label: 'Listo para retirar' },
        { key: 'PICKED_UP', label: 'Retirado' },
      ]

  const currentIndex = progressIndex(order.status, isDelivery)
  const statusDates = buildStatusDateMap(order)

  return steps.map((step, index) => ({
    ...step,
    done: index < currentIndex || isCompletedStatus(order.status, step.key, isDelivery),
    active: index === currentIndex,
    date: statusDates[step.key] || '',
  }))
}

function buildStatusDateMap(order) {
  const timeline = Array.isArray(order?.timeline) ? [...order.timeline] : []
  timeline.sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at))

  const map = {
    AWAITING_CHEF_CONFIRMATION: order.created_at,
  }

  for (const entry of timeline) {
    const toStatus = entry.to_status || inferStatusFromTimelineEntry(entry)
    if (!toStatus || map[toStatus]) continue
    map[toStatus] = entry.occurred_at
  }

  return map
}

function inferStatusFromTimelineEntry(entry) {
  const eventCode = entry?.event_code || ''
  const metadataStatus = entry?.metadata?.to_status
  if (metadataStatus) return metadataStatus
  const map = {
    ORDER_ACCEPTED: 'ACCEPTED',
    ORDER_REJECTED: 'REJECTED',
    ORDER_PREPARING: 'PREPARING',
    ORDER_READY_FOR_PICKUP: 'READY_FOR_PICKUP',
    ORDER_READY_FOR_DELIVERY: 'READY_FOR_DELIVERY',
    DELIVERY_STARTED: 'OUT_FOR_DELIVERY',
    ORDER_DELIVERED: 'DELIVERED',
    PICKUP_CONFIRMED: 'PICKED_UP',
    ORDER_CANCELLED: 'CANCELLED',
  }
  return map[eventCode] || ''
}

function progressIndex(status, isDelivery) {
  if (['CANCELLED', 'EXPIRED', 'PAYMENT_FAILED'].includes(status)) return 0
  const deliveryMap = {
    PAYMENT_VALIDATING: 0,
    AWAITING_CHEF_CONFIRMATION: 0,
    ACCEPTED: 1,
    PREPARING: 2,
    READY_FOR_DELIVERY: 3,
    OUT_FOR_DELIVERY: 4,
    DELIVERED: 5,
  }
  const pickupMap = {
    PAYMENT_VALIDATING: 0,
    AWAITING_CHEF_CONFIRMATION: 0,
    ACCEPTED: 1,
    PREPARING: 2,
    READY_FOR_PICKUP: 3,
    PICKED_UP: 4,
  }
  return (isDelivery ? deliveryMap : pickupMap)[status] ?? 0
}

function isCompletedStatus(status, stepKey, isDelivery) {
  if (isDelivery) {
    if (stepKey === 'AWAITING_CHEF_CONFIRMATION') return status !== 'PAYMENT_VALIDATING'
    if (stepKey === 'ACCEPTED') return ['ACCEPTED', 'PREPARING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(status)
    if (stepKey === 'PREPARING') return ['PREPARING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(status)
    if (stepKey === 'READY_FOR_DELIVERY') return ['READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(status)
    if (stepKey === 'OUT_FOR_DELIVERY') return ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(status)
    if (stepKey === 'DELIVERED') return status === 'DELIVERED'
    return false
  }
  if (stepKey === 'AWAITING_CHEF_CONFIRMATION') return status !== 'PAYMENT_VALIDATING'
  if (stepKey === 'ACCEPTED') return ['ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP'].includes(status)
  if (stepKey === 'PREPARING') return ['PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP'].includes(status)
  if (stepKey === 'READY_FOR_PICKUP') return ['READY_FOR_PICKUP', 'PICKED_UP'].includes(status)
  if (stepKey === 'PICKED_UP') return status === 'PICKED_UP'
  return false
}

function matchesOrderStatus(order, filter) {
  if (filter === 'ACTIVE') return isActiveOrder(order.status)
  if (filter === 'PAYMENT_ISSUES') return ['FAILED', 'EXPIRED', 'CANCELLED'].includes(order.payment?.status)
  return order.status === filter
}

function isActiveOrder(status) {
  return [
    'PAYMENT_VALIDATING',
    'AWAITING_CHEF_CONFIRMATION',
    'ACCEPTED',
    'PREPARING',
    'READY_FOR_PICKUP',
    'READY_FOR_DELIVERY',
    'OUT_FOR_DELIVERY',
  ].includes(status)
}

function hasOrderAttention(order) {
  return ['FAILED', 'EXPIRED'].includes(order.payment?.status) || ['CANCELLED'].includes(order.status)
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

function statusTone(status) {
  if (['DELIVERED', 'PICKED_UP'].includes(status)) return 'green'
  if (status === 'CANCELLED') return 'red'
  if (status === 'EXPIRED' || status === 'PAYMENT_FAILED') return 'orange'
  return 'purple'
}

function paymentTone(status) {
  if (status === 'CONFIRMED') return 'green'
  if (status === 'FAILED' || status === 'EXPIRED') return 'orange'
  if (status === 'CANCELLED') return 'red'
  return 'purple'
}

function statTone(tone) {
  const palette = {
    purple: { soft: 'rgba(124,58,237,.12)', strong: '#7c3aed' },
    blue: { soft: 'rgba(37,99,235,.12)', strong: '#2563eb' },
    green: { soft: 'rgba(34,197,94,.12)', strong: '#16a34a' },
    orange: { soft: 'rgba(249,115,22,.12)', strong: '#f97316' },
  }
  return palette[tone] || palette.purple
}

function badgeTone(tone) {
  const palette = {
    purple: {
      background: 'rgba(124,58,237,.08)',
      border: 'rgba(124,58,237,.16)',
      text: '#6d28d9',
    },
    green: {
      background: 'rgba(34,197,94,.08)',
      border: 'rgba(34,197,94,.16)',
      text: '#15803d',
    },
    orange: {
      background: 'rgba(249,115,22,.08)',
      border: 'rgba(249,115,22,.16)',
      text: '#c2410c',
    },
    red: {
      background: 'rgba(239,68,68,.08)',
      border: 'rgba(239,68,68,.16)',
      text: '#b91c1c',
    },
  }
  return palette[tone] || palette.purple
}

function OrdersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 7V6a4 4 0 1 1 8 0v1" />
      <path d="M5 8h14l-1 11a2 2 0 0 1-2 1H8a2 2 0 0 1-2-1Z" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function FilterOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h16" />
      <path d="M6 12h12" />
      <path d="M10 19h4" />
      <path d="m5 5 14 14" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5l3 2" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4 3.8 18.2A1.2 1.2 0 0 0 4.9 20h14.2a1.2 1.2 0 0 0 1-1.8Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}

function ReceiptIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3h10v18l-2-1.3L13 21l-2-1.3L9 21l-2-1.3L5 21V5a2 2 0 0 1 2-2Z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  )
}

function TimelineIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h11" />
      <path d="M8 12h11" />
      <path d="M8 18h11" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  )
}

function StoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9h16" />
      <path d="M5 9 6.5 4h11L19 9" />
      <path d="M6 10v8h12v-8" />
    </svg>
  )
}

function MoneyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8" />
      <path d="M15 10.5c0-1.1-1.3-2-3-2s-3 .9-3 2 1.3 2 3 2 3 .9 3 2-1.3 2-3 2-3-.9-3-2" />
    </svg>
  )
}

function CardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  )
}

function BowlIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 13a8 8 0 0 0 16 0Z" />
      <path d="M8 9h8" />
      <path d="M12 5v2" />
    </svg>
  )
}

function DeliveryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7h11v9H3Z" />
      <path d="M14 10h3l3 3v3h-6" />
      <circle cx="7.5" cy="18" r="1.5" />
      <circle cx="17.5" cy="18" r="1.5" />
    </svg>
  )
}

function CloseCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </svg>
  )
}

function CheckMiniIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 4 4 10-10" />
    </svg>
  )
}

function DotIcon() {
  return <span className="block h-2.5 w-2.5 rounded-full bg-current" />
}
