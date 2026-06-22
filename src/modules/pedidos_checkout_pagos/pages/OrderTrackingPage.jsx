import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import LastLoadedNotice from '../../../shared/components/LastLoadedNotice'
import { extractScreenSnapshotMeta } from '../../../shared/services/screen_cache'
import DeliveryTrackingMap from '../components/DeliveryTrackingMap'
import { connectOrderTrackingSocket } from '../services/tracking_realtime_service'
import {
  createClientOrderIncident,
  fetchChefOrderTracking,
  fetchClientOrderTracking,
  resolveChefOrderIncident,
} from '../services/tracking_service'
import { useConnectivity } from '../../../shared/hooks/useConnectivity'
import ChefOfflineBanner from '../../gestion_cocinero/components/ChefOfflineBanner'

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
  const { isOnline } = useConnectivity()
  const [tracking, setTracking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [offlineMeta, setOfflineMeta] = useState(null)
  const [incidentCode, setIncidentCode] = useState('DELAY')
  const [incidentDescription, setIncidentDescription] = useState('')
  const [submittingIncident, setSubmittingIncident] = useState(false)
  const [realtimeStatus, setRealtimeStatus] = useState('connecting')
  const [activeModal, setActiveModal] = useState(null)

  useEffect(() => {
    load()
  }, [id, viewerRole, isOnline])

  useEffect(() => {
    if (!id) return undefined
    let disposed = false
    let terminal = false
    let reconnectTimer = null
    let socket = null

    const attach = () => {
      if (disposed) return
      setRealtimeStatus('connecting')
      socket = connectOrderTrackingSocket(id, {
        onOpen: () => {
          if (!disposed) setRealtimeStatus('connected')
        },
        onSnapshot: (payload) => {
          if (disposed) return
          setTracking(payload)
          setOfflineMeta(extractScreenSnapshotMeta(payload))
          setMessage('')
          setLoading(false)
          setRealtimeStatus('connected')
        },
        onUnavailable: async () => {
          if (disposed) return
          terminal = true
          setRealtimeStatus('fallback')
          await load({ preserveMessage: true })
        },
        onClose: async (event) => {
          if (disposed) return
          setRealtimeStatus('fallback')
          await load({ preserveMessage: true })
          if (terminal || [4401, 4403, 4404].includes(event?.code)) return
          reconnectTimer = window.setTimeout(attach, 2000)
        },
        onError: () => {
          if (!disposed) setRealtimeStatus('fallback')
        },
      })
    }

    attach()
    return () => {
      disposed = true
      if (reconnectTimer) window.clearTimeout(reconnectTimer)
      socket?.close()
    }
  }, [id, viewerRole])

  async function load({ preserveMessage = false } = {}) {
    setLoading(true)
    if (!preserveMessage) setMessage('')
    try {
      const data =
        viewerRole === 'chef'
          ? await fetchChefOrderTracking(id)
          : await fetchClientOrderTracking(id)
      setTracking(data)
      setOfflineMeta(extractScreenSnapshotMeta(data))
      if (realtimeStatus !== 'connected') {
        setRealtimeStatus('fallback')
      }
    } catch (error) {
      setOfflineMeta(null)
      if (!isOnline) {
        setMessage('No hay datos offline disponibles para esta pantalla. Conéctate y sincroniza cuando tengas internet.')
      } else {
        setMessage(
          error?.response?.data?.detail ||
            'No se pudo cargar el tracking del pedido.',
        )
      }
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
      setActiveModal(null)
      await load()
    } catch (error) {
      setMessage(
        error?.response?.data?.detail ||
          'No se pudo registrar la incidencia.',
      )
    } finally {
      setSubmittingIncident(false)
    }
  }

  async function handleResolveIncident(incidentId) {
    if (!id || viewerRole !== 'chef') return
    const resolutionNotes =
      window.prompt('Notas de resolucion de la incidencia:') || ''
    setMessage('')
    try {
      await resolveChefOrderIncident(id, incidentId, {
        resolution_notes: resolutionNotes,
      })
      await load()
    } catch (error) {
      setMessage(
        error?.response?.data?.detail ||
          'No se pudo resolver la incidencia.',
      )
    }
  }

  if (loading) {
    return (
      <div
        className="rounded-[28px] border px-6 py-5"
        style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
      >
        Cargando tracking...
      </div>
    )
  }

  if (!tracking) {
    return (
      <section className="space-y-4">
        <Header viewerRole={viewerRole} navigate={navigate} backUrl={backUrl} />
        {message ? <Notice message={message} /> : null}
        <div
          className="rounded-[28px] border px-6 py-5"
          style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
        >
          No se encontro tracking para este pedido.
        </div>
      </section>
    )
  }

  const isDeliveryTracking = tracking.fulfillment_type === 'delivery'
  const latestEvent = tracking.timeline?.[0] || null
  const groupedRoute = tracking.map?.grouped_route || null
  const canOpenIncidentModal =
    Boolean(tracking.incidents?.items?.length) ||
    (viewerRole === 'client' &&
      tracking.fulfillment_type === 'delivery' &&
      tracking.delivery)
  const summaryCards = [
    {
      label: 'Pedido',
      value: shortOrderId(tracking.order_id),
      icon: 'receipt',
      tone: '#6d28d9',
      bg: 'rgba(109,40,217,.10)',
    },
    {
      label: 'Estado',
      value: tracking.status_label,
      icon: 'delivery',
      tone: '#2563eb',
      bg: 'rgba(37,99,235,.10)',
    },
    {
      label: 'Pago',
      value: tracking.payment_status_label,
      icon: 'payment',
      tone: '#16a34a',
      bg: 'rgba(22,163,74,.10)',
    },
    {
      label: 'Repartidor',
      value: tracking.delivery?.delivery_user_name || 'Pendiente',
      icon: 'user',
      tone: '#7c3aed',
      bg: 'rgba(124,58,237,.10)',
    },
    {
      label: 'Modalidad',
      value: tracking.fulfillment_label,
      icon: 'bag',
      tone: '#f97316',
      bg: 'rgba(249,115,22,.10)',
    },
  ]

  return (
    <section className="space-y-5">
      {viewerRole === 'chef' && <ChefOfflineBanner />}
      <Header viewerRole={viewerRole} navigate={navigate} backUrl={backUrl} />

      {message ? <Notice message={message} /> : null}
      {offlineMeta ? <LastLoadedNotice cachedAt={offlineMeta.cachedAt} /> : null}
      {tracking && realtimeStatus !== 'connected' ? (
        <Notice message="Sin conexion en tiempo real. Mostrando el ultimo estado disponible mientras reintentamos." />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>

      {!isDeliveryTracking ? (
        <PickupTrackingPanel tracking={tracking} />
      ) : (
        <>
          <div className="grid gap-5 xl:grid-cols-[1.45fr_.95fr]">
            <section
              id="mapa"
              className="rounded-[28px] border p-5"
              style={{
                borderColor: 'rgba(148,163,184,.18)',
                backgroundColor: 'var(--panel)',
                boxShadow: '0 18px 44px rgba(15,23,42,.06)',
              }}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[28px] font-extrabold tracking-tight">
                    Mapa de delivery
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    {tracking.gps_enabled
                      ? 'Ubicacion en vivo activa'
                      : 'Esperando ubicacion del repartidor'}
                  </p>
                </div>
                <LiveBadge active={tracking.gps_enabled} />
              </div>
              {tracking.map_enabled && tracking.map ? (
                <>
                  <DeliveryTrackingMap mapData={tracking.map} />
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <MiniMetric
                      icon="route"
                      label="Distancia total"
                      value={
                        groupedRoute?.distance_human ||
                        tracking.map?.navigation?.summary?.distance_human ||
                        distanceHumanFromMap(tracking.map)
                      }
                    />
                    <MiniMetric
                      icon="clock"
                      label="ETA total"
                      value={
                        groupedRoute?.duration_human ||
                        tracking.map?.navigation?.summary?.duration_human ||
                        durationHumanFromMap(tracking.map)
                      }
                    />
                    <MiniMetric
                      icon="pin"
                      label="Proxima parada"
                      value={
                        groupedRoute?.next_stop?.status_label ||
                        tracking.current_step?.label ||
                        'Segun avance'
                      }
                    />
                    <MiniMetric
                      icon="flag"
                      label="Destino usado"
                      value={
                        groupedRoute?.next_stop?.label ||
                        tracking.participants?.client_name ||
                        'Cliente'
                      }
                    />
                  </div>
                </>
              ) : (
                <div
                  className="rounded-2xl border px-4 py-5"
                  style={{ borderColor: 'var(--line)' }}
                >
                  El mapa se habilitara cuando exista tracking delivery.
                </div>
              )}
            </section>

            <section className="space-y-5">
              <RightPanel
                title="Estado actual"
                badgeLabel={tracking.delivery?.status_label || tracking.status_label}
                badgeIcon="delivery"
                latestEvent={latestEvent}
                tracking={tracking}
                viewerRole={viewerRole}
                canOpenIncidentModal={canOpenIncidentModal}
                onOpenModal={setActiveModal}
              />

              <QuickSummary tracking={tracking} groupedRoute={groupedRoute} />
            </section>
          </div>

          <section
            className="rounded-[28px] border p-5"
            style={{
              borderColor: 'rgba(148,163,184,.18)',
              backgroundColor: 'var(--panel)',
              boxShadow: '0 18px 44px rgba(15,23,42,.06)',
            }}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[28px] font-extrabold tracking-tight">
                Progreso del pedido
              </h2>
              <span className="text-xl font-bold">
                {tracking.progress?.percent || 0}%
              </span>
            </div>
            <div
              className="h-4 rounded-full"
              style={{ backgroundColor: 'rgba(148,163,184,.18)' }}
            >
              <div
                className="h-4 rounded-full"
                style={{
                  width: `${tracking.progress?.percent || 0}%`,
                  background:
                    'linear-gradient(90deg, rgba(124,58,237,1), rgba(109,40,217,1))',
                }}
              />
            </div>
            <p className="mt-4 text-base" style={{ color: 'var(--muted)' }}>
              {tracking.summary}
            </p>
          </section>
        </>
      )}

      <TrackingModal
        open={activeModal === 'flow'}
        title="Flujo del pedido"
        onClose={() => setActiveModal(null)}
      >
        <FlowPanel tracking={tracking} />
      </TrackingModal>

      <TrackingModal
        open={activeModal === 'timeline'}
        title="Timeline completo"
        onClose={() => setActiveModal(null)}
      >
        <TimelinePanel tracking={tracking} />
      </TrackingModal>

      <TrackingModal
        open={activeModal === 'incident'}
        title={viewerRole === 'client' ? 'Reportar incidencia' : 'Incidencias de entrega'}
        onClose={() => setActiveModal(null)}
      >
        <IncidentPanel
          tracking={tracking}
          viewerRole={viewerRole}
          incidentCode={incidentCode}
          incidentDescription={incidentDescription}
          submittingIncident={submittingIncident}
          setIncidentCode={setIncidentCode}
          setIncidentDescription={setIncidentDescription}
          onCreateIncident={handleCreateIncident}
          onResolveIncident={handleResolveIncident}
        />
      </TrackingModal>

      <TrackingModal
        open={activeModal === 'technical'}
        title="Datos tecnicos"
        onClose={() => setActiveModal(null)}
      >
        <TechnicalPanel tracking={tracking} />
      </TrackingModal>
    </section>
  )
}

function Header({ viewerRole, navigate, backUrl }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight">
          Seguimiento del pedido
        </h1>
        <p className="mt-2 text-[15px]" style={{ color: 'var(--muted)' }}>
          {viewerRole === 'chef'
            ? 'Monitorea el avance operativo hasta la entrega o retiro final.'
            : 'Sigue el avance de tu pedido con una vista clara del estado y la ruta.'}
        </p>
      </div>
      <button
        type="button"
        onClick={() => navigate(backUrl)}
        className="rounded-2xl border px-5 py-3 font-semibold"
        style={{ borderColor: 'rgba(148,163,184,.18)' }}
      >
        Volver
      </button>
    </div>
  )
}

function Notice({ message }) {
  return (
    <div
      className="rounded-2xl border px-4 py-3 text-sm"
      style={{
        borderColor: 'rgba(148,163,184,.18)',
        backgroundColor: 'var(--panel)',
      }}
    >
      {message}
    </div>
  )
}

function SummaryCard({ label, value, icon, tone, bg }) {
  return (
    <article
      className="rounded-[24px] border px-5 py-5"
      style={{
        borderColor: 'rgba(148,163,184,.18)',
        backgroundColor: 'var(--panel)',
        boxShadow: '0 16px 38px rgba(15,23,42,.05)',
      }}
    >
      <div className="flex items-center gap-4">
        <div
          className="grid h-14 w-14 place-items-center rounded-full"
          style={{ backgroundColor: bg, color: tone }}
        >
          <TrackingIcon type={icon} />
        </div>
        <div className="min-w-0">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {label}
          </p>
          <p className="truncate text-xl font-bold">{value || '-'}</p>
        </div>
      </div>
    </article>
  )
}

function RightPanel({
  title,
  badgeLabel,
  badgeIcon,
  latestEvent,
  tracking,
  viewerRole,
  canOpenIncidentModal,
  onOpenModal,
}) {
  return (
    <section
      className="rounded-[28px] border p-5"
      style={{
        borderColor: 'rgba(148,163,184,.18)',
        backgroundColor: 'var(--panel)',
        boxShadow: '0 18px 44px rgba(15,23,42,.06)',
      }}
    >
      <h2 className="text-[28px] font-extrabold tracking-tight">{title}</h2>
      <div
        className="mt-4 inline-flex items-center gap-3 rounded-2xl px-4 py-3"
        style={{ backgroundColor: 'rgba(124,58,237,.10)', color: '#6d28d9' }}
      >
        <TrackingIcon type={badgeIcon} />
        <span className="text-lg font-bold">{badgeLabel}</span>
      </div>

      <div className="mt-6 flex items-start gap-4">
        <div
          className="grid h-12 w-12 place-items-center rounded-full"
          style={{ backgroundColor: 'rgba(34,197,94,.10)', color: '#16a34a' }}
        >
          <TrackingIcon type="check" />
        </div>
        <div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Ultimo evento
          </p>
          <p className="text-lg font-bold">
            {latestEvent?.event_label || tracking.current_step?.label || 'Sin eventos'}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            {formatDate(latestEvent?.occurred_at || tracking.delivery?.picked_up_at)}
          </p>
        </div>
      </div>

      <div
        className="my-6 h-px"
        style={{ backgroundColor: 'rgba(148,163,184,.18)' }}
      />

      <div className="space-y-3">
        <ActionButton
          label="Ver timeline completo"
          icon="clock"
          onClick={() => onOpenModal('timeline')}
        />
        <ActionButton
          label="Ver flujo del pedido"
          icon="route"
          onClick={() => onOpenModal('flow')}
        />
        {canOpenIncidentModal ? (
          <ActionButton
            label={
              viewerRole === 'client' ? 'Reportar incidencia' : 'Ver incidencias'
            }
            icon="alert"
            onClick={() => onOpenModal('incident')}
          />
        ) : null}
        <ActionButton
          label="Ver datos tecnicos"
          icon="code"
          onClick={() => onOpenModal('technical')}
        />
      </div>
    </section>
  )
}

function ActionButton({ label, icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3"
      style={{ borderColor: 'rgba(148,163,184,.18)' }}
    >
      <span className="flex items-center gap-3">
        <TrackingIcon type={icon} />
        <span className="font-medium">{label}</span>
      </span>
      <span style={{ color: 'var(--muted)' }}>↗</span>
    </button>
  )
}

function FlowPanel({ tracking }) {
  return (
    <div className="space-y-3">
      {(tracking.steps || []).map((step, index) => {
        const active = index <= (tracking.progress?.current_index ?? 0)
        return (
          <div
            key={`${step.status}-${index}`}
            className="flex items-center gap-4 rounded-2xl border px-4 py-4"
            style={{
              borderColor: 'rgba(148,163,184,.18)',
              backgroundColor: active ? 'rgba(124,58,237,.08)' : 'transparent',
            }}
          >
            <div
              className="grid h-11 w-11 place-items-center rounded-full"
              style={{
                backgroundColor: active
                  ? 'rgba(124,58,237,.18)'
                  : 'rgba(148,163,184,.12)',
                color: active ? '#6d28d9' : '#64748b',
              }}
            >
              {index + 1}
            </div>
            <div>
              <p className="font-semibold">{step.label}</p>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {step.status}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TimelinePanel({ tracking }) {
  return (
    <div className="space-y-3">
      {(tracking.timeline || []).map((entry, index) => (
        <div
          key={`${entry.occurred_at}-${entry.event_code}-${index}`}
          className="rounded-2xl border px-4 py-4"
          style={{ borderColor: 'rgba(148,163,184,.18)' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{entry.event_label || entry.event_code}</p>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {entry.actor_role || 'SISTEMA'}
              </p>
            </div>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {formatDate(entry.occurred_at)}
            </p>
          </div>
          {entry.from_status || entry.to_status ? (
            <p className="pt-2 text-sm">
              {entry.from_status || '-'} → {entry.to_status || '-'}
            </p>
          ) : null}
          {entry.notes ? <p className="pt-2 text-sm">{entry.notes}</p> : null}
        </div>
      ))}
    </div>
  )
}

function IncidentPanel({
  tracking,
  viewerRole,
  incidentCode,
  incidentDescription,
  submittingIncident,
  setIncidentCode,
  setIncidentDescription,
  onCreateIncident,
  onResolveIncident,
}) {
  const canReport =
    viewerRole === 'client' &&
    tracking.fulfillment_type === 'delivery' &&
    tracking.delivery

  return (
    <div className="space-y-5">
      {tracking.incidents?.items?.length ? (
        <div className="space-y-3">
          {tracking.incidents.items.map((incident) => (
            <div
              key={incident.id}
              className="rounded-2xl border px-4 py-4"
              style={{ borderColor: 'rgba(148,163,184,.18)' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{incident.title}</p>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    {incident.status_label}
                    {incident.blocking ? ' · bloqueante' : ''}
                  </p>
                </div>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  {formatDate(incident.created_at)}
                </p>
              </div>
              {incident.description ? <p className="pt-2 text-sm">{incident.description}</p> : null}
              {incident.resolution_notes ? (
                <p className="pt-2 text-sm">Resolucion: {incident.resolution_notes}</p>
              ) : null}
              {viewerRole === 'chef' && incident.can_resolve ? (
                <button
                  type="button"
                  onClick={() => onResolveIncident(incident.id)}
                  className="mt-3 rounded-xl border px-4 py-2 text-sm font-semibold"
                  style={{ borderColor: 'var(--line)' }}
                >
                  Resolver incidencia
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div
          className="rounded-2xl border px-4 py-5 text-sm"
          style={{ borderColor: 'rgba(148,163,184,.18)', color: 'var(--muted)' }}
        >
          No hay incidencias registradas para este pedido.
        </div>
      )}

      {canReport ? (
        <div className="grid gap-3">
          <select
            value={incidentCode}
            onChange={(event) => setIncidentCode(event.target.value)}
            className="w-full rounded-2xl border px-4 py-3"
            style={{
              borderColor: 'rgba(148,163,184,.18)',
              backgroundColor: 'transparent',
            }}
          >
            {INCIDENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <textarea
            value={incidentDescription}
            onChange={(event) => setIncidentDescription(event.target.value)}
            rows={4}
            placeholder="Describe lo ocurrido"
            className="w-full rounded-2xl border px-4 py-3"
            style={{
              borderColor: 'rgba(148,163,184,.18)',
              backgroundColor: 'transparent',
            }}
          />
          <button
            type="button"
            onClick={onCreateIncident}
            disabled={submittingIncident}
            className="rounded-2xl px-5 py-3 font-semibold text-white disabled:opacity-60"
            style={{
              background:
                'linear-gradient(90deg, rgba(124,58,237,1), rgba(109,40,217,1))',
            }}
          >
            {submittingIncident ? 'Registrando...' : 'Registrar incidencia'}
          </button>
        </div>
      ) : null}
    </div>
  )
}

function TechnicalPanel({ tracking }) {
  const rows = [
    ['Pedido', tracking.order_id],
    ['Estado base', tracking.status],
    ['Paso actual', tracking.current_step?.status],
    ['Timeline', `${tracking.timeline?.length || 0} evento(s)`],
    ['Asignacion delivery', tracking.delivery?.assignment_id],
    ['Proveedor mapa', tracking.map?.provider],
    ['Tipo de ruta', tracking.map?.route?.route_kind],
  ].filter(([, value]) => value)

  return (
    <div className="space-y-3">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="grid gap-1 rounded-2xl border px-4 py-4 md:grid-cols-[180px_1fr]"
          style={{ borderColor: 'rgba(148,163,184,.18)' }}
        >
          <span className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
            {label}
          </span>
          <span>{value}</span>
        </div>
      ))}
    </div>
  )
}

function TrackingModal({ open, title, onClose, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
      <div
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border"
        style={{
          borderColor: 'rgba(148,163,184,.18)',
          backgroundColor: 'var(--panel)',
          boxShadow: '0 24px 64px rgba(15,23,42,.22)',
        }}
      >
        <div
          className="flex items-center justify-between gap-3 border-b px-6 py-5"
          style={{ borderColor: 'rgba(148,163,184,.18)' }}
        >
          <h3 className="text-2xl font-extrabold tracking-tight">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: 'rgba(148,163,184,.18)' }}
          >
            Cerrar
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  )
}

function QuickSummary({ tracking, groupedRoute }) {
  return (
    <section
      className="rounded-[28px] border p-5"
      style={{
        borderColor: 'rgba(148,163,184,.18)',
        backgroundColor: 'var(--panel)',
        boxShadow: '0 18px 44px rgba(15,23,42,.06)',
      }}
    >
      <h2 className="text-[28px] font-extrabold tracking-tight">
        Resumen rapido
      </h2>
      <div className="mt-4 space-y-3 text-sm">
        <QuickSummaryRow
          icon="pin"
          label="Origen"
          value={
            groupedRoute?.origin_used?.label ||
            tracking.map?.quality?.origin_used?.label ||
            'Tu ubicacion actual'
          }
        />
        <QuickSummaryRow
          icon="flag"
          label="Destino"
          value={tracking.participants?.client_name || 'Cliente'}
        />
        <QuickSummaryRow
          icon="route"
          label="Proxima parada"
          value={
            groupedRoute?.next_stop?.status_label ||
            tracking.current_step?.label ||
            'Segun avance'
          }
        />
      </div>
    </section>
  )
}

function QuickSummaryRow({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-3">
        <TrackingIcon type={icon} />
        <span style={{ color: 'var(--muted)' }}>{label}:</span>
      </span>
      <span className="text-right font-medium">{value || '-'}</span>
    </div>
  )
}

function PickupTrackingPanel({ tracking }) {
  return (
    <>
      <SectionCard title="Resumen de retiro">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MiniMetric icon="receipt" label="Pedido" value={shortOrderId(tracking.order_id)} />
          <MiniMetric icon="delivery" label="Estado" value={tracking.status_label} />
          <MiniMetric icon="bag" label="Modalidad" value={tracking.fulfillment_label} />
          <MiniMetric icon="payment" label="Pago" value={tracking.payment_status_label} />
        </div>
      </SectionCard>

      {tracking.pickup ? (
        <SectionCard title="Datos de retiro">
          <div className="grid gap-4 md:grid-cols-2">
            <MiniMetric icon="code" label="Codigo de retiro" value={tracking.pickup.pickup_code || '-'} />
            <MiniMetric
              icon="check"
              label="Estado de retiro"
              value={tracking.pickup.state_label || tracking.pickup.status || '-'}
            />
            <MiniMetric
              icon="clock"
              label="Horario elegido"
              value={formatPickupWindow(tracking.pickup.selected_slot_start, tracking.pickup.selected_slot_end)}
            />
            <MiniMetric
              icon="clock"
              label="Ventana activa"
              value={formatPickupWindow(tracking.pickup.pickup_window_start, tracking.pickup.pickup_window_end)}
            />
          </div>
          <div
            className="mt-4 rounded-2xl border px-4 py-4 text-sm"
            style={{ borderColor: 'rgba(148,163,184,.18)' }}
          >
            {tracking.pickup.state_message ||
              'Este pedido es de retiro. El seguimiento con mapa solo aplica a pedidos con delivery.'}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Progreso del pedido">
        <div
          className="h-4 rounded-full"
          style={{ backgroundColor: 'rgba(148,163,184,.18)' }}
        >
          <div
            className="h-4 rounded-full"
            style={{
              width: `${tracking.progress?.percent || 0}%`,
              background:
                'linear-gradient(90deg, rgba(124,58,237,1), rgba(109,40,217,1))',
            }}
          />
        </div>
        <p className="mt-4 text-base" style={{ color: 'var(--muted)' }}>
          {tracking.summary}
        </p>
      </SectionCard>
    </>
  )
}

function SectionCard({ title, children, id }) {
  return (
    <section
      id={id}
      className="rounded-[28px] border p-5"
      style={{
        borderColor: 'rgba(148,163,184,.18)',
        backgroundColor: 'var(--panel)',
        boxShadow: '0 18px 44px rgba(15,23,42,.06)',
      }}
    >
      <h2 className="mb-4 text-[28px] font-extrabold tracking-tight">{title}</h2>
      {children}
    </section>
  )
}

function MiniMetric({ icon, label, value }) {
  return (
    <div
      className="rounded-2xl border px-4 py-4"
      style={{ borderColor: 'rgba(148,163,184,.18)' }}
    >
      <div className="mb-2 flex items-center gap-2" style={{ color: 'var(--muted)' }}>
        <TrackingIcon type={icon} />
        <span className="text-sm">{label}</span>
      </div>
      <p className="font-semibold">{value || '-'}</p>
    </div>
  )
}

function LiveBadge({ active }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium"
      style={{
        backgroundColor: active ? 'rgba(34,197,94,.10)' : 'rgba(148,163,184,.12)',
        color: active ? '#166534' : '#64748b',
      }}
    >
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: active ? '#22c55e' : '#94a3b8' }}
      />
      {active ? 'Ubicacion en vivo activa' : 'Sin ubicacion en vivo'}
    </span>
  )
}

function TrackingIcon({ type }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }

  switch (type) {
    case 'receipt':
      return (
        <svg {...common}>
          <path d="M7 3h10v18l-3-2-2 2-2-2-3 2V3Z" />
          <path d="M9 8h6M9 12h6" />
        </svg>
      )
    case 'delivery':
      return (
        <svg {...common}>
          <path d="M3 7h10v8H3z" />
          <path d="M13 10h4l3 3v2h-2" />
          <circle cx="7" cy="17" r="2" />
          <circle cx="17" cy="17" r="2" />
        </svg>
      )
    case 'payment':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8.5 12 2.3 2.3 4.7-5" />
        </svg>
      )
    case 'user':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5 19a7 7 0 0 1 14 0" />
        </svg>
      )
    case 'bag':
      return (
        <svg {...common}>
          <path d="M6 8h12l-1 12H7L6 8Z" />
          <path d="M9 10V7a3 3 0 1 1 6 0v3" />
        </svg>
      )
    case 'route':
      return (
        <svg {...common}>
          <circle cx="6" cy="18" r="2" />
          <circle cx="18" cy="6" r="2" />
          <path d="M8 18c4 0 3-6 8-6" />
          <path d="M10 6h5" />
        </svg>
      )
    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      )
    case 'pin':
      return (
        <svg {...common}>
          <path d="M12 21s6-4.6 6-11a6 6 0 1 0-12 0c0 6.4 6 11 6 11Z" />
          <circle cx="12" cy="10" r="2.2" />
        </svg>
      )
    case 'flag':
      return (
        <svg {...common}>
          <path d="M6 21V5" />
          <path d="M6 5c2-1 4 1 6 0s4-1 6 0v8c-2-1-4 1-6 0s-4-1-6 0" />
        </svg>
      )
    case 'check':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8.5 12 2.3 2.3 4.7-5" />
        </svg>
      )
    case 'code':
      return (
        <svg {...common}>
          <path d="m8 9-4 3 4 3" />
          <path d="m16 9 4 3-4 3" />
          <path d="m13 6-2 12" />
        </svg>
      )
    case 'alert':
      return (
        <svg {...common}>
          <path d="M12 4 4 18h16L12 4Z" />
          <path d="M12 10v3" />
          <path d="M12 16h.01" />
        </svg>
      )
    default:
      return null
  }
}

function shortOrderId(value) {
  if (!value) return '-'
  return value.length > 12 ? `${value.slice(0, 12)}...` : value
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
  const startLabel = startDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
  const endLabel = endDate
    ? endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '-'
  return `${dateLabel} ${startLabel} - ${endLabel}`
}

function distanceHumanFromMap(map) {
  const meters = map?.route?.distance_meters
  if (typeof meters !== 'number') return '-'
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`
  return `${Math.round(meters)} m`
}

function durationHumanFromMap(map) {
  const seconds = map?.route?.duration_seconds
  if (typeof seconds !== 'number') return '-'
  const minutes = Math.max(1, Math.round(seconds / 60))
  return `${minutes} min`
}
