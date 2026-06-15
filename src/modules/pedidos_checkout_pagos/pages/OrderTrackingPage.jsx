import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import DeliveryTrackingMap from '../components/DeliveryTrackingMap'
import { createClientOrderIncident, fetchChefOrderTracking, fetchClientOrderTracking, resolveChefOrderIncident } from '../services/tracking_service'

const INCIDENT_OPTIONS = [
  { value: 'DELAY', label: 'Retraso' },
  { value: 'WRONG_ADDRESS', label: 'Direccion incorrecta' },
  { value: 'CLIENT_ABSENT', label: 'Cliente ausente' },
  { value: 'ORDER_DAMAGED', label: 'Pedido danado' },
  { value: 'CANCELLATION_REQUEST', label: 'Solicitud de cancelacion' },
  { value: 'CANNOT_COMPLETE', label: 'No se puede completar' },
]

export default function OrderTrackingPage({ viewerRole = 'client' }) {
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const [tracking, setTracking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [incidentCode, setIncidentCode] = useState('DELAY')
  const [incidentDescription, setIncidentDescription] = useState('')
  const [submittingIncident, setSubmittingIncident] = useState(false)

  useEffect(() => {
    load()
  }, [id, viewerRole])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!id) return
      load()
    }, 15000)
    return () => window.clearInterval(timer)
  }, [id, viewerRole])

  async function load() {
    setLoading(true)
    setMessage('')
    try {
      const data = viewerRole === 'chef'
        ? await fetchChefOrderTracking(id)
        : await fetchClientOrderTracking(id)
      setTracking(data)
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'No se pudo cargar el tracking del pedido.')
    } finally {
      setLoading(false)
    }
  }

  const backUrl = useMemo(() => {
    if (viewerRole === 'chef') return `/chef/orders/${id}`
    return `/client/orders/${id}`
  }, [id, viewerRole])

  async function handleCreateIncident() {
    if (!id || viewerRole !== 'client' || submittingIncident) return
    setSubmittingIncident(true)
    setMessage('')
    try {
      await createClientOrderIncident(id, {
        code: incidentCode,
        description: incidentDescription,
      })
      setIncidentDescription('')
      await load()
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'No se pudo registrar la incidencia.')
    } finally {
      setSubmittingIncident(false)
    }
  }

  async function handleResolveIncident(incidentId) {
    if (!id || viewerRole !== 'chef') return
    const resolutionNotes = window.prompt('Notas de resolucion de la incidencia:') || ''
    setMessage('')
    try {
      await resolveChefOrderIncident(id, incidentId, { resolution_notes: resolutionNotes })
      await load()
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'No se pudo resolver la incidencia.')
    }
  }

  if (loading) {
    return <div className="rounded-xl border p-4" style={{ borderColor: 'var(--line)' }}>Cargando tracking...</div>
  }

  const isDeliveryTracking = tracking?.fulfillment_type === 'delivery'

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Seguimiento del pedido</h1>
          <p style={{ color: 'var(--muted)' }}>Tracking textual compartido hasta la entrega o retiro final.</p>
        </div>
        <button type="button" onClick={() => navigate(backUrl)} className="px-4 py-2 rounded-lg border" style={{ borderColor: 'var(--line)' }}>
          Volver
        </button>
      </div>

      {message ? <div className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--line)' }}>{message}</div> : null}
      {!tracking ? <div className="rounded-xl border p-4" style={{ borderColor: 'var(--line)' }}>No se encontro tracking para este pedido.</div> : null}

      {tracking && !isDeliveryTracking ? (
        <section className="rounded-2xl border p-5 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <div className="grid gap-3 md:grid-cols-2">
            <Info label="Pedido" value={tracking.order_id} mono />
            <Info label="Estado" value={tracking.status_label} />
            <Info label="Modalidad" value={tracking.fulfillment_label} />
            <Info label="Pago" value={tracking.payment_status_label} />
          </div>
          {tracking.pickup ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Info label="Codigo de retiro" value={tracking.pickup.pickup_code || '-'} mono />
              <Info label="Estado de retiro" value={tracking.pickup.state_label || tracking.pickup.status || '-'} />
              <Info label="Horario elegido" value={formatPickupWindow(tracking.pickup.selected_slot_start, tracking.pickup.selected_slot_end)} />
              <Info label="Ventana activa" value={formatPickupWindow(tracking.pickup.pickup_window_start, tracking.pickup.pickup_window_end)} />
              <Info label="Tolerancia" value={tracking.pickup.pickup_grace_deadline ? formatDate(tracking.pickup.pickup_grace_deadline) : '-'} />
              <Info label="Retencion" value={tracking.pickup.pickup_retention_deadline ? formatDate(tracking.pickup.pickup_retention_deadline) : '-'} />
            </div>
          ) : null}
          <div className="rounded-xl border p-4 text-sm" style={{ borderColor: 'var(--line)' }}>
            {tracking.pickup?.state_message || 'Este pedido es de retiro. El seguimiento con mapa solo aplica a pedidos con delivery.'}
          </div>
        </section>
      ) : null}

      {tracking && isDeliveryTracking ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_.9fr]">
          <section className="rounded-2xl border p-5 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
            <div className="grid gap-3 md:grid-cols-2">
              <Info label="Pedido" value={tracking.order_id} mono />
              <Info label="Estado" value={tracking.status_label} />
              <Info label="Modalidad" value={tracking.fulfillment_label} />
              <Info label="Pago" value={tracking.payment_status_label} />
            </div>

            {tracking.delivery ? (
              <div className="grid gap-3 md:grid-cols-2">
                <Info label="Estado delivery" value={tracking.delivery.status_label} />
                <Info label="Repartidor" value={tracking.delivery.delivery_user_name || 'Aun no asignado'} />
              </div>
            ) : null}

            {tracking.pickup ? (
              <div className="grid gap-3 md:grid-cols-2">
                <Info label="Codigo de retiro" value={tracking.pickup.pickup_code || '-'} mono />
                <Info label="Horario estimado" value={tracking.pickup.pickup_schedule_note || 'Segun avance de preparacion'} />
                <Info label="Instrucciones" value={tracking.pickup.pickup_instructions || 'Presenta el codigo al cocinero.'} />
                <Info label="Estado retiro" value={tracking.pickup.status || '-'} />
              </div>
            ) : null}

            {tracking.map_enabled && tracking.map ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Mapa de delivery</h2>
                  <span className="text-sm" style={{ color: 'var(--muted)' }}>
                    {tracking.gps_enabled ? 'Ubicacion en vivo activa' : 'Esperando ubicacion del repartidor'}
                  </span>
                </div>
                <DeliveryTrackingMap mapData={tracking.map} />
                {tracking.map.quality ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <Info label="Proveedor" value={tracking.map.quality.provider || '-'} />
                    <Info
                      label="Fallback"
                      value={tracking.map.quality.uses_fallback ? `Si${tracking.map.quality.fallback_reason ? ` · ${tracking.map.quality.fallback_reason}` : ''}` : 'No'}
                    />
                    <Info label="Origen usado" value={tracking.map.quality.origin_used?.label || tracking.map.quality.origin_used?.kind || '-'} />
                    <Info label="Destino usado" value={tracking.map.quality.destination_used?.label || tracking.map.quality.destination_used?.kind || '-'} />
                  </div>
                ) : null}
                {tracking.map.grouped_route ? (
                  <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--line)' }}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">Ruta consolidada del repartidor</span>
                      <span className="text-sm" style={{ color: 'var(--muted)' }}>
                        {tracking.map.grouped_route.active_assignment_count || 0} entrega(s)
                      </span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <Info label="Distancia total" value={tracking.map.grouped_route.distance_human || '-'} />
                      <Info label="ETA total" value={tracking.map.grouped_route.duration_human || '-'} />
                      <Info label="Proxima parada" value={tracking.map.grouped_route.next_stop?.status_label || '-'} />
                    </div>
                    {(tracking.map.grouped_route.stops || []).length ? (
                      <div className="space-y-2">
                        {tracking.map.grouped_route.stops.map((stop, index) => (
                          <div key={`${stop.assignment_id}-${stop.kind}-${index}`} className="rounded-xl border p-3" style={{ borderColor: 'var(--line)' }}>
                            <p className="font-semibold">{index + 1}. {stop.status_label}</p>
                            <p className="text-sm" style={{ color: 'var(--muted)' }}>
                              Pedido {stop.order_id} · {stop.label || stop.kind}
                            </p>
                            {stop.address ? <p className="text-sm">{stop.address}</p> : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {tracking.incidents?.items?.length ? (
              <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--line)' }}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">Incidencias de entrega</span>
                  <span className="text-sm" style={{ color: 'var(--muted)' }}>
                    {tracking.incidents.open_count || 0} abiertas
                  </span>
                </div>
                {tracking.incidents.items.map((incident) => (
                  <div key={incident.id} className="rounded-xl border p-3 space-y-1" style={{ borderColor: 'var(--line)' }}>
                    <p className="font-semibold">{incident.title}</p>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>
                      {incident.status_label}{incident.blocking ? ' · bloqueante' : ''}
                    </p>
                    {incident.description ? <p className="text-sm">{incident.description}</p> : null}
                    {incident.resolution_notes ? <p className="text-sm">Resolucion: {incident.resolution_notes}</p> : null}
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>{formatDate(incident.created_at)}</p>
                    {viewerRole === 'chef' && incident.can_resolve ? (
                      <button
                        type="button"
                        onClick={() => handleResolveIncident(incident.id)}
                        className="px-3 py-2 rounded-lg border text-sm"
                        style={{ borderColor: 'var(--line)' }}
                      >
                        Resolver incidencia
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {viewerRole === 'client' && tracking.fulfillment_type === 'delivery' && tracking.delivery ? (
              <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--line)' }}>
                <h2 className="text-lg font-semibold">Reportar incidencia</h2>
                <select
                  value={incidentCode}
                  onChange={(event) => setIncidentCode(event.target.value)}
                  className="w-full rounded-lg border px-3 py-2"
                  style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
                >
                  {INCIDENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <textarea
                  value={incidentDescription}
                  onChange={(event) => setIncidentDescription(event.target.value)}
                  rows={3}
                  placeholder="Describe lo ocurrido"
                  className="w-full rounded-lg border px-3 py-2"
                  style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
                />
                <button
                  type="button"
                  onClick={handleCreateIncident}
                  disabled={submittingIncident}
                  className="px-4 py-2 rounded-lg text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
                >
                  {submittingIncident ? 'Registrando...' : 'Registrar incidencia'}
                </button>
              </div>
            ) : null}

            <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: 'var(--line)' }}>
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">Progreso</span>
                <span>{tracking.progress?.percent || 0}%</span>
              </div>
              <div className="h-3 rounded-full" style={{ backgroundColor: 'rgba(148,163,184,.2)' }}>
                <div
                  className="h-3 rounded-full"
                  style={{
                    width: `${tracking.progress?.percent || 0}%`,
                    background: 'linear-gradient(90deg, var(--brand), var(--brand-2))',
                  }}
                />
              </div>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>{tracking.summary}</p>
            </div>

            <div className="grid gap-2">
              {(tracking.steps || []).map((step, index) => {
                const active = index <= (tracking.progress?.current_index ?? 0)
                return (
                  <div
                    key={`${step.status}-${index}`}
                    className="rounded-xl border p-3"
                    style={{
                      borderColor: 'var(--line)',
                      backgroundColor: active ? 'rgba(124,58,237,.08)' : 'transparent',
                    }}
                  >
                    <p className="font-semibold">{step.label}</p>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>{step.status}</p>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="rounded-2xl border p-5 space-y-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
            <div>
              <h2 className="text-xl font-semibold">Timeline</h2>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Eventos y cambios de estado del pedido.</p>
            </div>
            {(tracking.timeline || []).map((entry, index) => (
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
            ))}
          </section>
        </div>
      ) : null}
    </section>
  )
}

function Info({ label, value, mono = false }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--line)' }}>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className={mono ? 'font-mono break-all' : 'font-semibold'}>{value || '-'}</p>
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
