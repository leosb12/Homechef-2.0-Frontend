import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LastLoadedNotice from '../../../shared/components/LastLoadedNotice'
import { extractScreenSnapshotMeta } from '../../../shared/services/screen_cache'
import {
  chefAcceptOrder,
  chefClosePickupRetention,
  chefExtendPickupRetention,
  chefMarkPreparing,
  chefMarkPickupNoShow,
  chefMarkReady,
  chefRejectOrder,
  fetchChefOrders,
} from '../services/order_service'

const actionLabels = {
  accept: 'Aceptar',
  reject: 'Rechazar',
  preparing: 'Preparar',
  ready: 'Marcar listo',
  confirm_pickup: 'Cerrar retiro',
  mark_pickup_no_show: 'No presentado',
  extend_pickup_retention: 'Extender retencion',
  close_pickup_retention: 'Cerrar retencion',
}

const STATUS_TABS = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'accepted', label: 'Aceptados' },
  { value: 'preparing', label: 'Preparando' },
  { value: 'ready', label: 'Listos' },
  { value: 'closed', label: 'Cerrados' },
]

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Filtrar por estado' },
  { value: 'AWAITING_CHEF_CONFIRMATION', label: 'Esperando confirmacion' },
  { value: 'ACCEPTED', label: 'Aceptado' },
  { value: 'PREPARING', label: 'En preparacion' },
  { value: 'READY_FOR_PICKUP', label: 'Listo para retiro' },
  { value: 'READY_FOR_DELIVERY', label: 'Listo para delivery' },
  { value: 'PICKED_UP', label: 'Retirado' },
  { value: 'DELIVERED', label: 'Entregado' },
  { value: 'REJECTED', label: 'Rechazado' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

const PAYMENT_OPTIONS = [
  { value: 'ALL', label: 'Filtrar por pago' },
  { value: 'PENDING', label: 'Pendiente de cobro' },
  { value: 'PROCESSING', label: 'Procesando pago' },
  { value: 'CONFIRMED', label: 'Cobro confirmado' },
  { value: 'FAILED', label: 'Pago fallido' },
  { value: 'CANCELLED', label: 'Pago cancelado' },
  { value: 'EXPIRED', label: 'Pago expirado' },
]

export default function ChefOrdersPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [offlineMeta, setOfflineMeta] = useState(null)
  const [busyOrderId, setBusyOrderId] = useState('')
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [paymentFilter, setPaymentFilter] = useState('ALL')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setMessage('')
    try {
      const data = await fetchChefOrders()
      setItems(data.items || [])
      setOfflineMeta(extractScreenSnapshotMeta(data))
    } catch (error) {
      setOfflineMeta(null)
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
      if (action === 'mark_pickup_no_show') await chefMarkPickupNoShow(orderId)
      if (action === 'extend_pickup_retention') await chefExtendPickupRetention(orderId)
      if (action === 'close_pickup_retention') await chefClosePickupRetention(orderId)
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

  function clearFilters() {
    setSearch('')
    setStatusFilter('ALL')
    setPaymentFilter('ALL')
    setTab('all')
  }

  const filteredItems = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    return items.filter((order) => {
      if (!matchesTab(order, tab)) return false
      if (statusFilter !== 'ALL' && order.status !== statusFilter) return false
      if (paymentFilter !== 'ALL' && (order.payment?.status || '') !== paymentFilter) return false
      if (!normalized) return true

      const productNames = (order.items || []).map((item) => item.dish_name).join(' ')
      const haystack = [
        order.id,
        order.client?.name,
        order.fulfillment_type,
        productNames,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(normalized)
    })
  }, [items, paymentFilter, search, statusFilter, tab])

  const stats = useMemo(() => buildStats(items), [items])

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Pedidos recibidos</h1>
          <p style={{ color: 'var(--muted)' }}>
            Gestiona aceptacion, rechazo, preparacion y cierre hasta READY con lectura clara del flujo operativo.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 rounded-2xl border px-5 py-3 font-semibold"
          style={{ borderColor: 'rgba(124,58,237,.26)', color: 'var(--brand)' }}
        >
          <RefreshIcon />
          Recargar
        </button>
      </div>

      <section className="rounded-[30px] border p-5 space-y-5" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
        <div className="flex flex-wrap gap-2 rounded-2xl border p-2" style={{ borderColor: 'var(--line)' }}>
          {STATUS_TABS.map((entry) => (
            <button
              key={entry.value}
              type="button"
              onClick={() => setTab(entry.value)}
              className="rounded-xl px-5 py-3 font-medium transition"
              style={{
                background: tab === entry.value ? 'linear-gradient(180deg, rgba(124,58,237,.14), rgba(124,58,237,.08))' : 'transparent',
                color: tab === entry.value ? 'var(--brand)' : 'inherit',
              }}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Todos" value={stats.total} helper="Pedidos totales" tone="purple" icon={<ClipboardIcon />} />
          <StatCard label="Pendientes" value={stats.pending} helper="Esperando respuesta" tone="blue" icon={<ClockIcon />} />
          <StatCard label="Preparando" value={stats.preparing} helper="Cocina en curso" tone="orange" icon={<ChefHatIcon />} />
          <StatCard label="Listos" value={stats.ready} helper="Retiro o delivery listos" tone="green" icon={<BagIcon />} />
        </div>
      </section>

      <section className="rounded-[30px] border p-5 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
        <div className="grid gap-3 xl:grid-cols-[1.5fr_repeat(2,minmax(0,1fr))_auto]">
          <label className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--line)' }}>
            <div className="flex items-center gap-3">
              <span style={{ color: 'var(--muted)' }}><SearchIcon /></span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por ID, cliente o producto..."
                className="w-full bg-transparent outline-none"
              />
            </div>
          </label>
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
          <FilterSelect value={paymentFilter} onChange={setPaymentFilter} options={PAYMENT_OPTIONS} />
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 font-medium"
            style={{ borderColor: 'var(--line)' }}
          >
            <FilterOffIcon />
            Limpiar filtros
          </button>
        </div>

        {message ? (
          <div className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--line)' }}>
            {message}
          </div>
        ) : null}
        {offlineMeta ? <LastLoadedNotice cachedAt={offlineMeta.cachedAt} /> : null}
      </section>

      {loading ? <div className="rounded-xl border p-4" style={{ borderColor: 'var(--line)' }}>Cargando pedidos...</div> : null}

      {!loading && !filteredItems.length ? (
        <div className="rounded-[30px] border p-6" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          No tienes pedidos en este filtro.
        </div>
      ) : null}

      {!loading && filteredItems.length ? (
        <section className="rounded-[30px] border overflow-hidden" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <div
            className="hidden xl:grid gap-4 px-5 py-4 text-sm font-semibold"
            style={{
              gridTemplateColumns: '1.4fr .88fr .7fr 1.08fr .62fr .78fr .9fr 2.05fr .82fr 1.08fr',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <div>Pedido</div>
            <div>Cliente</div>
            <div>Modalidad</div>
            <div>Producto</div>
            <div>Total</div>
            <div>Estado</div>
            <div>Pago</div>
            <div>Etapa</div>
            <div>Creado</div>
            <div>Acciones</div>
          </div>

          <div className="divide-y" style={{ '--tw-divide-opacity': 1, borderColor: 'var(--line)' }}>
            {filteredItems.map((order) => (
              <div key={order.id} className="px-5 py-5">
                <div
                  className="hidden xl:grid gap-4 items-start"
                  style={{ gridTemplateColumns: '1.4fr .88fr .7fr 1.08fr .62fr .78fr .9fr 2.05fr .82fr 1.08fr' }}
                >
                  <div>
                    <p className="font-medium break-all">{order.id}</p>
                  </div>
                  <div>
                    <p>{order.client?.name || 'Cliente HomeChef'}</p>
                  </div>
                  <div>{order.fulfillment_type === 'delivery' ? 'Delivery' : 'Retiro'}</div>
                  <div>
                    <p className="font-medium">{primaryItemLabel(order)}</p>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>{secondaryItemLabel(order)}</p>
                  </div>
                  <div>Bs {Number(order.total || 0).toFixed(2)}</div>
                  <div>
                    <Badge tone={statusTone(order.status)}>{labelForStatus(order.status)}</Badge>
                  </div>
                  <div>
                    <Badge tone={paymentTone(order.payment?.status)}>{labelForPaymentStatus(order.payment?.status)}</Badge>
                  </div>
                  <div>
                    <OrderStageProgress order={order} />
                  </div>
                  <div>{compactDate(order.created_at)}</div>
                  <div className="flex flex-col gap-2">
                    <SecondaryButton onClick={() => navigate(`/chef/orders/${order.id}`)} icon={<EyeIcon />}>
                      Ver detalle
                    </SecondaryButton>
                    <SecondaryButton onClick={() => navigate(`/chef/orders/${order.id}/tracking`)} icon={<TrackingIcon />}>
                      Tracking
                    </SecondaryButton>
                    {order.available_actions?.map((action) => (
                      <PrimaryButton
                        key={action}
                        onClick={() => runAction(order.id, action)}
                        disabled={busyOrderId === order.id}
                      >
                        {busyOrderId === order.id ? 'Procesando...' : actionLabels[action] || action}
                      </PrimaryButton>
                    ))}
                  </div>
                </div>

                <article className="xl:hidden rounded-2xl border p-4 space-y-4" style={{ borderColor: 'var(--line)' }}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold break-all">Pedido {order.id}</h2>
                      <p className="text-sm" style={{ color: 'var(--muted)' }}>Cliente: {order.client?.name || 'Cliente HomeChef'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={statusTone(order.status)}>{labelForStatus(order.status)}</Badge>
                      <Badge tone={paymentTone(order.payment?.status)}>{labelForPaymentStatus(order.payment?.status)}</Badge>
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-4">
                    <InfoTile label="Modalidad" value={order.fulfillment_type === 'delivery' ? 'Delivery' : 'Retiro'} />
                    <InfoTile label="Producto" value={primaryItemLabel(order)} />
                    <InfoTile label="Total" value={`Bs ${Number(order.total || 0).toFixed(2)}`} />
                    <InfoTile label="Creado" value={compactDate(order.created_at)} />
                  </div>

                  <OrderStageProgress order={order} />

                  <div className="flex flex-wrap gap-2">
                    <SecondaryButton onClick={() => navigate(`/chef/orders/${order.id}`)} icon={<EyeIcon />}>
                      Ver detalle
                    </SecondaryButton>
                    <SecondaryButton onClick={() => navigate(`/chef/orders/${order.id}/tracking`)} icon={<TrackingIcon />}>
                      Tracking
                    </SecondaryButton>
                    {order.available_actions?.map((action) => (
                      <PrimaryButton
                        key={action}
                        onClick={() => runAction(order.id, action)}
                        disabled={busyOrderId === order.id}
                      >
                        {busyOrderId === order.id ? 'Procesando...' : actionLabels[action] || action}
                      </PrimaryButton>
                    ))}
                  </div>
                </article>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5 border-t" style={{ borderColor: 'var(--line)' }}>
            <p style={{ color: 'var(--muted)' }}>Mostrando {filteredItems.length} de {items.length} pedidos</p>
            <div className="rounded-xl border px-4 py-2 text-sm" style={{ borderColor: 'var(--line)' }}>
              Filas por pagina <strong>10</strong>
            </div>
          </div>
        </section>
      ) : null}
    </section>
  )
}

function buildStats(items) {
  return {
    total: items.length,
    pending: items.filter((order) => order.status === 'AWAITING_CHEF_CONFIRMATION').length,
    preparing: items.filter((order) => order.status === 'PREPARING').length,
    ready: items.filter((order) => ['READY_FOR_PICKUP', 'READY_FOR_DELIVERY'].includes(order.status)).length,
  }
}

function matchesTab(order, tab) {
  if (tab === 'pending') return order.status === 'AWAITING_CHEF_CONFIRMATION'
  if (tab === 'accepted') return order.status === 'ACCEPTED'
  if (tab === 'preparing') return order.status === 'PREPARING'
  if (tab === 'ready') return ['READY_FOR_PICKUP', 'READY_FOR_DELIVERY'].includes(order.status)
  if (tab === 'closed') return ['REJECTED', 'PICKED_UP', 'DELIVERED', 'CANCELLED', 'EXPIRED'].includes(order.status)
  return true
}

function primaryItemLabel(order) {
  return order.items?.[0]?.dish_name || 'Sin detalle'
}

function secondaryItemLabel(order) {
  if (!order.items?.length) return '-'
  if (order.items.length === 1) {
    return `${order.items[0].quantity} x Bs ${Number(order.items[0].unit_price || 0).toFixed(2)}`
  }
  return `+${order.items.length - 1} producto(s)`
}

function labelForStatus(status) {
  const map = {
    AWAITING_CHEF_CONFIRMATION: 'Pendiente',
    ACCEPTED: 'Aceptado',
    REJECTED: 'Rechazado',
    PREPARING: 'Preparando',
    READY_FOR_PICKUP: 'Listo para retiro',
    READY_FOR_DELIVERY: 'Listo para delivery',
    PICKED_UP: 'Retirado',
    DELIVERED: 'Entregado',
    CANCELLED: 'Cancelado',
    EXPIRED: 'Expirado',
  }
  return map[status] || status
}

function labelForPaymentStatus(status) {
  const map = {
    PENDING: 'Pendiente',
    PROCESSING: 'Procesando',
    CONFIRMED: 'Cobro confirmado',
    CANCELLED: 'Pago cancelado',
    FAILED: 'Pago fallido',
    EXPIRED: 'Pago expirado',
  }
  return map[status] || status || '-'
}

function statusTone(status) {
  if (['PICKED_UP', 'DELIVERED'].includes(status)) return 'purple'
  if (status === 'REJECTED' || status === 'CANCELLED' || status === 'EXPIRED') return 'red'
  if (status === 'PREPARING') return 'orange'
  if (['READY_FOR_PICKUP', 'READY_FOR_DELIVERY'].includes(status)) return 'green'
  return 'blue'
}

function paymentTone(status) {
  if (status === 'CONFIRMED') return 'green'
  if (status === 'PENDING' || status === 'PROCESSING') return 'blue'
  if (status === 'FAILED' || status === 'EXPIRED') return 'orange'
  if (status === 'CANCELLED') return 'red'
  return 'purple'
}

function compactDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

function buildChefStageSteps(order) {
  const isPickup = order.fulfillment_type === 'pickup'
  const steps = [
    { key: 'AWAITING_CHEF_CONFIRMATION', label: 'Recibido' },
    { key: 'ACCEPTED', label: 'Aceptado' },
    { key: 'PREPARING', label: 'Preparando' },
    { key: isPickup ? 'READY_FOR_PICKUP' : 'READY_FOR_DELIVERY', label: 'Listo' },
    { key: isPickup ? 'PICKED_UP' : 'DELIVERED', label: isPickup ? 'Retirado' : 'Entregado' },
  ]
  const currentIndex = chefProgressIndex(order.status, isPickup)
  const statusDates = buildChefStatusDateMap(order)

  return steps.map((step, index) => ({
    ...step,
    done: index < currentIndex || chefStepCompleted(order.status, step.key, isPickup),
    active: index === currentIndex,
    date: statusDates[step.key] || '',
  }))
}

function OrderStageProgress({ order }) {
  const steps = buildChefStageSteps(order)
  return (
    <div className="rounded-2xl border px-3 py-3" style={{ borderColor: 'var(--line)', backgroundColor: 'rgba(124,58,237,.02)' }}>
      <div className={`grid gap-3 ${steps.length >= 5 ? 'grid-cols-5' : 'grid-cols-4'}`}>
        {steps.map((step, index) => {
          const active = step.active
          const done = step.done
          const last = index === steps.length - 1
          return (
            <div key={`${order.id}-${step.key}`} className="relative min-w-0">
              {!last ? (
                <div
                  className="absolute left-[calc(50%+18px)] right-[-14px] top-4 h-[2px]"
                  style={{ backgroundColor: done ? '#16a34a' : 'rgba(148,163,184,.35)' }}
                />
              ) : null}
              <div className="flex flex-col items-center gap-2 text-center">
                <div
                  className="grid h-8 w-8 place-items-center rounded-full border"
                  style={{
                    borderColor: done || active ? '#16a34a' : 'rgba(148,163,184,.35)',
                    backgroundColor: done || active ? 'rgba(34,197,94,.12)' : 'white',
                    color: done || active ? '#15803d' : '#94a3b8',
                  }}
                >
                  {done || active ? <CheckMiniIcon /> : <DotIcon />}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold leading-tight">{step.label}</p>
                  <p className="mt-1 text-[10px] leading-tight" style={{ color: 'var(--muted)' }}>
                    {step.date
                      ? compactDate(step.date)
                      : done
                        ? 'Completado'
                        : active
                          ? 'Actual'
                          : 'Pendiente'}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function buildChefStatusDateMap(order) {
  const timeline = Array.isArray(order?.timeline) ? [...order.timeline] : []
  timeline.sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at))

  const map = {
    AWAITING_CHEF_CONFIRMATION: order.created_at,
  }

  for (const entry of timeline) {
    const toStatus = entry.to_status || inferChefStatusFromTimelineEntry(entry)
    if (!toStatus || map[toStatus]) continue
    map[toStatus] = entry.occurred_at
  }

  return map
}

function inferChefStatusFromTimelineEntry(entry) {
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

function chefProgressIndex(status, isPickup) {
  if (['REJECTED', 'CANCELLED', 'EXPIRED'].includes(status)) return 0
  const deliveryMap = {
    PAYMENT_VALIDATING: 0,
    AWAITING_CHEF_CONFIRMATION: 0,
    ACCEPTED: 1,
    PREPARING: 2,
    READY_FOR_DELIVERY: 3,
    OUT_FOR_DELIVERY: 3,
    DELIVERED: 4,
  }
  const pickupMap = {
    PAYMENT_VALIDATING: 0,
    AWAITING_CHEF_CONFIRMATION: 0,
    ACCEPTED: 1,
    PREPARING: 2,
    READY_FOR_PICKUP: 3,
    PICKED_UP: 4,
  }
  const map = isPickup ? pickupMap : deliveryMap
  return typeof map[status] === 'number' ? map[status] : 0
}

function chefStepCompleted(status, stepKey, isPickup) {
  const steps = isPickup
    ? ['AWAITING_CHEF_CONFIRMATION', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP']
    : ['AWAITING_CHEF_CONFIRMATION', 'ACCEPTED', 'PREPARING', 'READY_FOR_DELIVERY', 'DELIVERED']
  return steps.indexOf(status) > steps.indexOf(stepKey)
}

function FilterSelect({ value, onChange, options }) {
  return (
    <label className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--line)' }}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-transparent font-medium outline-none"
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
  const palette = {
    purple: { soft: 'rgba(124,58,237,.12)', strong: '#7c3aed' },
    blue: { soft: 'rgba(37,99,235,.12)', strong: '#2563eb' },
    orange: { soft: 'rgba(249,115,22,.12)', strong: '#f59e0b' },
    green: { soft: 'rgba(34,197,94,.12)', strong: '#16a34a' },
  }[tone]

  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--line)' }}>
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-2xl" style={{ backgroundColor: palette.soft, color: palette.strong }}>
          {icon}
        </div>
        <div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{label}</p>
          <p className="text-4xl font-bold leading-none" style={{ color: palette.strong }}>{value}</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>{helper}</p>
        </div>
      </div>
    </div>
  )
}

function Badge({ children, tone = 'purple' }) {
  const palette = {
    purple: { background: 'rgba(124,58,237,.08)', border: 'rgba(124,58,237,.16)', text: '#6d28d9' },
    blue: { background: 'rgba(37,99,235,.08)', border: 'rgba(37,99,235,.16)', text: '#1d4ed8' },
    orange: { background: 'rgba(249,115,22,.08)', border: 'rgba(249,115,22,.16)', text: '#c2410c' },
    green: { background: 'rgba(34,197,94,.08)', border: 'rgba(34,197,94,.16)', text: '#15803d' },
    red: { background: 'rgba(239,68,68,.08)', border: 'rgba(239,68,68,.16)', text: '#b91c1c' },
  }[tone]

  return (
    <span
      className="inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium"
      style={{ backgroundColor: palette.background, borderColor: palette.border, color: palette.text }}
    >
      {children}
    </span>
  )
}

function SecondaryButton({ children, onClick, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium"
      style={{ borderColor: 'var(--line)' }}
    >
      {icon}
      {children}
    </button>
  )
}

function PrimaryButton({ children, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
    >
      {children}
    </button>
  )
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--line)' }}>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
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

function ClipboardIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="3" width="8" height="4" rx="1.5" />
      <path d="M9 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5l3 2" />
    </svg>
  )
}

function ChefHatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 11a4 4 0 1 1 10 0 3 3 0 0 1 2 2.8V15H5v-1.2A3 3 0 0 1 7 11Z" />
      <path d="M7 15v3a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3" />
    </svg>
  )
}

function BagIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8h12l-1 10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2Z" />
      <path d="M9 8V7a3 3 0 0 1 6 0v1" />
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

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  )
}

function TrackingIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7h11v9H3Z" />
      <path d="M14 10h3l3 3v3h-6" />
      <circle cx="7.5" cy="18" r="1.5" />
      <circle cx="17.5" cy="18" r="1.5" />
    </svg>
  )
}
