import { useEffect, useMemo, useState } from 'react'
import LastLoadedNotice from '../../../shared/components/LastLoadedNotice'
import { extractScreenSnapshotMeta } from '../../../shared/services/screen_cache'
import {
  fetchActiveDeliveryOrderDetail,
  fetchActiveDeliveryOrders,
  updateOrderDeliveryStatus,
  reassignOrderRider,
  registerOrderIncident,
  registerOrderObservation,
} from '../services/delivery_active_orders_admin_service'
import OfflineBanner from '../components/OfflineBanner'
import { getPendingMutations } from '../services/adminOfflineRepository'

const STATUS_FILTERS = [
  { value: 'ALL', label: 'Todos' },
  { value: 'READY_FOR_DELIVERY', label: 'Listos para delivery' },
  { value: 'OUT_FOR_DELIVERY', label: 'En camino' },
]

const SUMMARY_META = {
  total: { label: 'Activos', color: '#6d28d9', tone: 'rgba(109,40,217,.10)' },
  ready_for_delivery: {
    label: 'Pendientes de recogida',
    color: '#2563eb',
    tone: 'rgba(37,99,235,.11)',
  },
  out_for_delivery: {
    label: 'En ruta',
    color: '#16a34a',
    tone: 'rgba(22,163,74,.11)',
  },
  unassigned: {
    label: 'Sin repartidor',
    color: '#ea580c',
    tone: 'rgba(234,88,12,.11)',
  },
}

export default function AdminActiveDeliveryOrdersPage() {
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')
  const [offlineMeta, setOfflineMeta] = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [items, setItems] = useState([])
  const [summary, setSummary] = useState({})
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [riders, setRiders] = useState([])
  const [incidentText, setIncidentText] = useState('')
  const [observationText, setObservationText] = useState('')
  const [pendingOps, setPendingOps] = useState([])

  const loadPendingOps = async () => {
    try {
      const queue = await getPendingMutations()
      setPendingOps(queue || [])
    } catch (e) {
      console.warn("Could not load pending mutations:", e)
    }
  }

  const loadRiders = async () => {
    try {
      const { fetchDeliveryDrivers } = await import('../services/delivery_driver_admin_service')
      const data = await fetchDeliveryDrivers()
      setRiders(data?.items || [])
    } catch (e) {
      console.warn("Could not load riders:", e)
    }
  }

  useEffect(() => {
    void loadPendingOps()
    void loadRiders()
    window.addEventListener('admin-offline-queue-changed', loadPendingOps)
    return () => window.removeEventListener('admin-offline-queue-changed', loadPendingOps)
  }, [])

  useEffect(() => {
    void loadOrders()
  }, [])

  async function loadOrders() {
    setLoading(true)
    setError('')
    try {
      const payload = await fetchActiveDeliveryOrders()
      setItems(payload.items || [])
      setSummary(payload.summary || {})
      setOfflineMeta(extractScreenSnapshotMeta(payload))
      if (selectedOrderId) {
        await loadDetail(selectedOrderId)
      }
    } catch (err) {
      setOfflineMeta(null)
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          'No se pudieron cargar los pedidos delivery activos.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadDetail(orderId) {
    setSelectedOrderId(orderId)
    setDetailLoading(true)
    setError('')
    try {
      const payload = await fetchActiveDeliveryOrderDetail(orderId)
      setSelectedOrder(payload.order || null)
      if (payload?.__offline) {
        setOfflineMeta(extractScreenSnapshotMeta(payload))
      }
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          'No se pudo cargar el detalle del pedido delivery.',
      )
    } finally {
      setDetailLoading(false)
    }
  }

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return items.filter((item) => {
      if (statusFilter !== 'ALL' && item.order_status !== statusFilter) {
        return false
      }
      if (!needle) {
        return true
      }
      return [
        item.order_id,
        item.client_name,
        item.chef_name,
        item.delivery_assignment.delivery_user?.name,
        item.delivery_assignment.status_label,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    })
  }, [items, search, statusFilter])

  const cards = useMemo(
    () => [
      { key: 'total', value: summary.total ?? 0 },
      { key: 'ready_for_delivery', value: summary.ready_for_delivery ?? 0 },
      { key: 'out_for_delivery', value: summary.out_for_delivery ?? 0 },
      { key: 'unassigned', value: summary.unassigned ?? 0 },
    ],
    [summary],
  )

  return (
    <section className="space-y-6">
      <OfflineBanner moduleName="orders" />
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            Delivery activo
          </h1>
          <p className="mt-2 text-[15px]" style={{ color: 'var(--muted)' }}>
            Supervisa pedidos listos o en ruta, el repartidor asignado y el
            flujo de oferta, aceptacion y tablero abierto.
          </p>
        </div>
        <button
          type="button"
          className="rounded-2xl border px-5 py-3 font-semibold"
          style={{
            borderColor: 'rgba(124,58,237,.18)',
            color: '#6d28d9',
            backgroundColor: 'var(--panel)',
          }}
          onClick={() => void loadOrders()}
        >
          Recargar
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {cards.map((card) => {
          const meta = SUMMARY_META[card.key]
          return (
            <article
              key={card.key}
              className="rounded-[24px] border px-6 py-5"
              style={{
                borderColor: 'rgba(148, 163, 184, 0.18)',
                backgroundColor: 'var(--panel)',
                boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)',
              }}
            >
              <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
                {meta.label}
              </p>
              <div className="mt-4 flex items-end justify-between gap-3">
                <p className="text-4xl font-extrabold leading-none">
                  {card.value}
                </p>
                <span
                  className="inline-flex rounded-full px-3 py-2 text-xs font-semibold"
                  style={{ backgroundColor: meta.tone, color: meta.color }}
                >
                  {meta.label}
                </span>
              </div>
            </article>
          )
        })}
      </div>

      <div className="grid gap-4 rounded-[26px] border p-5 xl:grid-cols-[1.2fr_.8fr]"
        style={{
          borderColor: 'rgba(148, 163, 184, 0.18)',
          backgroundColor: 'var(--panel)',
          boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)',
        }}
      >
        <label className="flex items-center gap-3 rounded-2xl border px-4 py-3"
          style={{ borderColor: 'rgba(148,163,184,.18)' }}
        >
          <SearchIcon />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full bg-transparent outline-none"
            placeholder="Buscar por pedido, cliente, cocinero o repartidor..."
          />
        </label>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-2xl border px-4 py-3 outline-none"
          style={{ borderColor: 'rgba(148,163,184,.18)', backgroundColor: 'var(--panel)' }}
        >
          {STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div
          className="rounded-2xl border px-4 py-3 text-sm"
          style={{
            borderColor: 'rgba(248,113,113,.28)',
            backgroundColor: 'rgba(254,242,242,.9)',
            color: '#b91c1c',
          }}
        >
          {error}
        </div>
      ) : null}
      {offlineMeta ? <LastLoadedNotice cachedAt={offlineMeta.cachedAt} /> : null}

      <div className="grid gap-6 xl:grid-cols-[1.45fr_.95fr]">
        <section
          className="overflow-hidden rounded-[26px] border"
          style={{
            borderColor: 'rgba(148, 163, 184, 0.18)',
            backgroundColor: 'var(--panel)',
            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.07)',
          }}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead style={{ backgroundColor: 'rgba(248,250,252,.65)' }}>
                <tr>
                  <th className="px-5 py-4 text-left font-semibold">Pedido</th>
                  <th className="px-5 py-4 text-left font-semibold">Cliente</th>
                  <th className="px-5 py-4 text-left font-semibold">Cocinero</th>
                  <th className="px-5 py-4 text-left font-semibold">Repartidor</th>
                  <th className="px-5 py-4 text-left font-semibold">Pedido</th>
                  <th className="px-5 py-4 text-left font-semibold">Delivery</th>
                  <th className="px-5 py-4 text-left font-semibold">Distancia</th>
                  <th className="px-5 py-4 text-left font-semibold">Actualizado</th>
                  <th className="px-5 py-4 text-left font-semibold">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-5 py-10" colSpan="9">
                      Cargando pedidos delivery...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td className="px-5 py-10 text-center" colSpan="9">
                      No hay pedidos delivery activos con ese criterio.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isPending = pendingOps.some(op => op.entity === 'orders' && String(op.server_id) === String(item.order_id) && op.status === 'pending');
                    return (
                      <tr
                        key={item.order_id}
                        className="border-t"
                        style={{ borderColor: 'rgba(148,163,184,.14)' }}
                      >
                        <td className="px-5 py-5 align-top font-semibold flex items-center gap-1.5">
                          <span>{shortId(item.order_id)}</span>
                          {isPending && (
                            <span className="inline-flex rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-500/30 animate-pulse shrink-0">
                              Pendiente
                            </span>
                          )}
                        </td>
                      <td className="px-5 py-5 align-top">{item.client_name}</td>
                      <td className="px-5 py-5 align-top">{item.chef_name}</td>
                      <td className="px-5 py-5 align-top">
                        {item.delivery_assignment.delivery_user?.name || (
                          <span style={{ color: '#ea580c' }}>Sin asignar</span>
                        )}
                      </td>
                      <td className="px-5 py-5 align-top">
                        <StatusBadge
                          label={item.order_status_label}
                          tone={item.order_status === 'OUT_FOR_DELIVERY' ? 'green' : 'blue'}
                        />
                      </td>
                      <td className="px-5 py-5 align-top">
                        <StatusBadge
                          label={item.delivery_assignment.status_label || 'Sin asignar'}
                          tone={item.delivery_assignment.delivery_user ? 'violet' : 'orange'}
                        />
                        <div className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>
                          {flowStateLabel(
                            item.delivery_assignment.flow_state,
                            item.delivery_assignment.open_board_enabled,
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-5 align-top">
                        {item.delivery_assignment.estimated_distance_human || '-'}
                      </td>
                      <td className="px-5 py-5 align-top">{formatDate(item.last_updated_at)}</td>
                      <td className="px-5 py-5 align-top">
                        <button
                          type="button"
                          className="rounded-xl border px-3 py-2 font-semibold"
                          style={{ borderColor: 'rgba(124,58,237,.18)', color: '#6d28d9' }}
                          onClick={() => void loadDetail(item.order_id)}
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside
          className="rounded-[26px] border p-5"
          style={{
            borderColor: 'rgba(148, 163, 184, 0.18)',
            backgroundColor: 'var(--panel)',
            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.07)',
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Detalle operativo</h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
                Cola operativa y bitacora del pedido seleccionado.
              </p>
            </div>
            {detailLoading ? <span className="text-sm">Cargando...</span> : null}
          </div>

          {!selectedOrder ? (
            <div className="mt-6 rounded-2xl border px-4 py-5 text-sm"
              style={{ borderColor: 'rgba(148,163,184,.18)' }}
            >
              Selecciona un pedido de la tabla para revisar su asignacion.
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {/* Acciones de Administrador */}
              <div className="rounded-2xl border p-4 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
                <h3 className="text-xs font-bold uppercase tracking-[.18em]" style={{ color: 'var(--muted)' }}>
                  Acciones de Administrador
                </h3>
                
                {/* 1. Cambiar Estado */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>Cambiar Estado:</label>
                  <select
                    value={selectedOrder.status || selectedOrder.order_status || ''}
                    onChange={async (e) => {
                      const newStatus = e.target.value;
                      if (!newStatus) return;
                      try {
                        await updateOrderDeliveryStatus(selectedOrder.id, newStatus);
                        await loadOrders();
                        // reload detail as well
                        await loadDetail(selectedOrder.id);
                      } catch (err) {
                        alert(err.message || 'Error al actualizar estado');
                      }
                    }}
                    className="w-full text-xs rounded-xl border p-2 bg-transparent outline-none"
                    style={{ borderColor: 'var(--line)', color: 'var(--text)' }}
                  >
                    <option value="" style={{ color: '#000' }}>Seleccionar estado...</option>
                    <option value="READY_FOR_DELIVERY" style={{ color: '#000' }}>Listo para delivery</option>
                    <option value="OUT_FOR_DELIVERY" style={{ color: '#000' }}>En camino</option>
                    <option value="DELIVERED" style={{ color: '#000' }}>Entregado</option>
                    <option value="CANCELLED" style={{ color: '#000' }}>Cancelado</option>
                  </select>
                </div>

                {/* 2. Reasignar Repartidor */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>Reasignar Repartidor:</label>
                  <select
                    value={selectedOrder.delivery_assignment?.delivery_user?.id || ''}
                    onChange={async (e) => {
                      const newRiderId = e.target.value;
                      if (!newRiderId) return;
                      try {
                        await reassignOrderRider(selectedOrder.id, newRiderId);
                        await loadOrders();
                        await loadDetail(selectedOrder.id);
                      } catch (err) {
                        alert(err.message || 'Error al reasignar repartidor');
                      }
                    }}
                    className="w-full text-xs rounded-xl border p-2 bg-transparent outline-none"
                    style={{ borderColor: 'var(--line)', color: 'var(--text)' }}
                  >
                    <option value="" style={{ color: '#000' }}>Seleccionar repartidor...</option>
                    {riders.map(r => (
                      <option key={r.user_id} value={r.user_id} style={{ color: '#000' }}>
                        {r.first_name} {r.last_name} ({r.approval_status})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Reportar Incidencia */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>Reportar Incidencia:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Describir incidencia..."
                      value={incidentText}
                      onChange={(e) => setIncidentText(e.target.value)}
                      className="flex-1 text-xs rounded-xl border p-2 bg-transparent outline-none"
                      style={{ borderColor: 'var(--line)' }}
                    />
                    <button
                      onClick={async () => {
                        if (!incidentText.trim()) return;
                        try {
                          await registerOrderIncident(selectedOrder.id, incidentText);
                          setIncidentText('');
                          await loadOrders();
                          await loadDetail(selectedOrder.id);
                        } catch (err) {
                          alert(err.message || 'Error al registrar incidencia');
                        }
                      }}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold whitespace-nowrap"
                    >
                      Reportar
                    </button>
                  </div>
                </div>

                {/* 4. Registrar Observación */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>Registrar Observación:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nota de administración..."
                      value={observationText}
                      onChange={(e) => setObservationText(e.target.value)}
                      className="flex-1 text-xs rounded-xl border p-2 bg-transparent outline-none"
                      style={{ borderColor: 'var(--line)' }}
                    />
                    <button
                      onClick={async () => {
                        if (!observationText.trim()) return;
                        try {
                          await registerOrderObservation(selectedOrder.id, observationText);
                          setObservationText('');
                          await loadOrders();
                          await loadDetail(selectedOrder.id);
                        } catch (err) {
                          alert(err.message || 'Error al registrar observación');
                        }
                      }}
                      className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold whitespace-nowrap"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              </div>

              <DetailBlock
                title={`Pedido ${shortId(selectedOrder.id)}`}
                rows={[
                  ['Cliente', selectedOrder.client?.name || '-'],
                  ['Cocinero', selectedOrder.chef?.name || '-'],
                  ['Estado pedido', selectedOrder.status_label],
                  ['Estado delivery', selectedOrder.delivery_assignment?.status_label || 'Sin asignar'],
                  ['Flujo actual', flowStateLabel(
                    selectedOrder.delivery_assignment?.operational_context?.flow_state,
                    selectedOrder.delivery_assignment?.operational_context?.open_board_enabled,
                  )],
                  ['Repartidor', selectedOrder.delivery_assignment?.delivery_user?.name || 'Sin asignar'],
                  ['Intentos', String(selectedOrder.delivery_assignment?.operational_context?.attempt_count || 0)],
                  ['Distancia', selectedOrder.delivery_assignment?.operational_context?.estimated_distance_human || '-'],
                  ['Ultimo intento', formatDate(selectedOrder.delivery_assignment?.operational_context?.last_attempt_at)],
                  ['Oferta pendiente', selectedOrder.delivery_assignment?.operational_context?.pending_delivery_name || '-'],
                  ['Expira oferta', formatDate(selectedOrder.delivery_assignment?.operational_context?.pending_expires_at)],
                  ['Tablero abierto', selectedOrder.delivery_assignment?.operational_context?.open_board_enabled ? 'Si' : 'No'],
                  ['Motivo apertura', selectedOrder.delivery_assignment?.operational_context?.open_board_reason || '-'],
                ]}
              />

              <DetailBlock
                title="Items"
                rows={(selectedOrder.items || []).map((item) => [
                  item.dish_name,
                  `${item.quantity} x Bs ${Number(item.unit_price || 0).toFixed(2)}`,
                ])}
              />

              <DetailList
                title="Cola de candidatos"
                items={selectedOrder.delivery_assignment?.operational_context?.candidate_snapshot || []}
                renderItem={(item) => (
                  <div className="rounded-2xl border px-4 py-3"
                    style={{ borderColor: 'rgba(148,163,184,.18)' }}
                  >
                    <p className="font-semibold">{item.delivery_name}</p>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>
                      {item.distance_human} · {item.location_source} · {item.active_assignments} entregas activas
                    </p>
                  </div>
                )}
              />

              <DetailList
                title="Bitacora del flujo"
                items={(selectedOrder.delivery_assignment?.operational_context?.flow_audit || []).map((item) => ({
                  ...item,
                  reason: item.delivery_name || item.reason || item.event_code,
                  distance_human: item.distance_human || item.label || item.event_code,
                  at: item.occurred_at,
                }))}
                renderItem={(item) => (
                  <div className="rounded-2xl border px-4 py-3"
                    style={{ borderColor: 'rgba(148,163,184,.18)' }}
                  >
                    <p className="font-semibold">{item.label || item.event_code}</p>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>
                      {item.reason} · {item.distance_human || '-'} · {formatDate(item.at)}
                    </p>
                  </div>
                )}
              />

              <DetailList
                title="Bitacora delivery"
                items={selectedOrder.delivery_assignment?.history || []}
                renderItem={(item) => (
                  <div className="rounded-2xl border px-4 py-3"
                    style={{ borderColor: 'rgba(148,163,184,.18)' }}
                  >
                    <p className="font-semibold">
                      {item.from_status || '-'}
                      {' -> '}
                      {item.to_status}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>
                      {item.actor_role || 'SISTEMA'} · {formatDate(item.occurred_at)}
                    </p>
                    {item.notes ? <p className="mt-1 text-sm">{item.notes}</p> : null}
                  </div>
                )}
              />
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}

function DetailBlock({ title, rows }) {
  return (
    <section className="rounded-[22px] border p-4"
      style={{ borderColor: 'rgba(148,163,184,.18)' }}
    >
      <h3 className="text-sm font-bold uppercase tracking-[.18em]" style={{ color: 'var(--muted)' }}>
        {title}
      </h3>
      <div className="mt-4 space-y-3">
        {rows.map(([label, value]) => (
          <div key={`${title}-${label}`} className="flex items-start justify-between gap-4 text-sm">
            <span style={{ color: 'var(--muted)' }}>{label}</span>
            <span className="text-right font-medium">{value || '-'}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function DetailList({ title, items, renderItem }) {
  return (
    <section>
      <h3 className="text-sm font-bold uppercase tracking-[.18em]" style={{ color: 'var(--muted)' }}>
        {title}
      </h3>
      <div className="mt-3 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border px-4 py-3 text-sm"
            style={{ borderColor: 'rgba(148,163,184,.18)', color: 'var(--muted)' }}
          >
            Sin registros.
          </div>
        ) : (
          items.map((item, index) => <div key={`${title}-${index}`}>{renderItem(item)}</div>)
        )}
      </div>
    </section>
  )
}

function StatusBadge({ label, tone }) {
  const palette = {
    violet: { bg: 'rgba(109,40,217,.12)', color: '#6d28d9' },
    green: { bg: 'rgba(22,163,74,.12)', color: '#166534' },
    blue: { bg: 'rgba(37,99,235,.12)', color: '#1d4ed8' },
    orange: { bg: 'rgba(234,88,12,.12)', color: '#c2410c' },
  }
  const colors = palette[tone] || palette.violet
  return (
    <span
      className="inline-flex rounded-full px-3 py-2 text-xs font-semibold"
      style={{ backgroundColor: colors.bg, color: colors.color }}
    >
      {label}
    </span>
  )
}

function flowStateLabel(value, openBoardEnabled) {
  if (openBoardEnabled) return 'Tablero abierto'
  const labels = {
    IDLE: 'Sin iniciar',
    OFFER_PENDING: 'Oferta pendiente',
    WAITING_ROUND_2: 'Esperando segunda ronda',
    OPEN_BOARD: 'Tablero abierto',
    ASSIGNED: 'Asignada',
  }
  return labels[value] || '-'
}

function shortId(value) {
  if (!value) return '-'
  return value.length > 12 ? `${value.slice(0, 12)}...` : value
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('es-BO')
}

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  )
}
