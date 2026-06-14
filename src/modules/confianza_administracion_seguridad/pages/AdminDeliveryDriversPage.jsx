import { useEffect, useMemo, useState } from 'react'
import {
  fetchDeliveryDrivers,
  updateDeliveryDriverStatus,
} from '../services/delivery_driver_admin_service'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'recien_registrado', label: 'Recien registrados' },
  { value: 'activo', label: 'Activos' },
  { value: 'suspendido', label: 'Suspendidos' },
]

const SUMMARY_META = {
  total: {
    label: 'Total',
    tone: 'rgba(109,40,217,.10)',
    color: '#6d28d9',
    icon: 'users',
  },
  recien_registrado: {
    label: 'Recien registrados',
    tone: 'rgba(34,197,94,.12)',
    color: '#16a34a',
    icon: 'userPlus',
  },
  activo: {
    label: 'Activos',
    tone: 'rgba(59,130,246,.12)',
    color: '#2563eb',
    icon: 'checkCircle',
  },
  suspendido: {
    label: 'Suspendidos',
    tone: 'rgba(249,115,22,.12)',
    color: '#ea580c',
    icon: 'pauseCircle',
  },
}

const STATUS_BADGE = {
  recien_registrado: {
    label: 'recien registrado',
    bg: 'rgba(250,204,21,.18)',
    color: '#a16207',
  },
  activo: {
    label: 'activo',
    bg: 'rgba(34,197,94,.16)',
    color: '#166534',
  },
  suspendido: {
    label: 'suspendido',
    bg: 'rgba(249,115,22,.14)',
    color: '#c2410c',
  },
}

const NEXT_ACTION = {
  recien_registrado: {
    value: 'activo',
    label: 'Activar',
    bg: 'linear-gradient(90deg, #16a34a, #22c55e)',
  },
  activo: {
    value: 'suspendido',
    label: 'Suspender',
    bg: 'linear-gradient(90deg, #ea580c, #fb923c)',
  },
  suspendido: {
    value: 'activo',
    label: 'Reactivar',
    bg: 'linear-gradient(90deg, #16a34a, #22c55e)',
  },
}

export default function AdminDeliveryDriversPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [items, setItems] = useState([])
  const [summary, setSummary] = useState({})
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [busyUserId, setBusyUserId] = useState('')

  useEffect(() => {
    void loadData(statusFilter)
  }, [statusFilter])

  async function loadData(filter) {
    setLoading(true)
    setError('')
    try {
      const payload = await fetchDeliveryDrivers(
        filter ? { approval_status: filter } : {},
      )
      setItems(payload.items || [])
      setSummary(payload.summary || {})
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          'No se pudo cargar la administracion de repartidores.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(userId, approvalStatus) {
    setBusyUserId(userId)
    setError('')
    try {
      const payload = await updateDeliveryDriverStatus(userId, approvalStatus)
      const nextItem = payload.item
      setItems((current) =>
        current.map((item) => (item.user_id === userId ? nextItem : item)),
      )
      await loadData(statusFilter)
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          'No se pudo actualizar el estado del repartidor.',
      )
    } finally {
      setBusyUserId('')
    }
  }

  const cards = useMemo(
    () => [
      { key: 'total', value: summary.total ?? 0 },
      { key: 'recien_registrado', value: summary.recien_registrado ?? 0 },
      { key: 'activo', value: summary.activo ?? 0 },
      { key: 'suspendido', value: summary.suspendido ?? 0 },
    ],
    [summary],
  )

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return items
    return items.filter((item) => {
      const fullName =
        item.full_name ||
        `${item.first_name || ''} ${item.last_name || ''}`.trim()
      return [
        fullName,
        item.email,
        item.phone,
        item.vehicle_plate,
        item.vehicle_brand,
        item.vehicle_model,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    })
  }, [items, search])

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            Administrar repartidores
          </h1>
          <p className="mt-2 text-[15px]" style={{ color: 'var(--muted)' }}>
            Revisa solicitudes nuevas y cambia el estado operativo de los
            repartidores.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
            Filtrar por estado
          </span>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="min-w-44 rounded-2xl border px-4 py-3 outline-none"
              style={{
                borderColor: 'var(--line)',
                backgroundColor: 'var(--panel)',
                boxShadow: '0 10px 24px rgba(15, 23, 42, 0.04)',
              }}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="grid h-12 w-12 place-items-center rounded-2xl text-white"
              style={{
                background:
                  'linear-gradient(180deg, rgba(124,58,237,1), rgba(109,40,217,1))',
                boxShadow: '0 12px 24px rgba(109, 40, 217, 0.22)',
              }}
              onClick={() => void loadData(statusFilter)}
              title="Aplicar filtro"
            >
              <UiIcon type="filter" stroke="white" />
            </button>
          </div>
        </div>
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
              <div className="flex items-center gap-4">
                <div
                  className="grid h-16 w-16 place-items-center rounded-full"
                  style={{ backgroundColor: meta.tone, color: meta.color }}
                >
                  <UiIcon type={meta.icon} stroke={meta.color} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
                    {meta.label}
                  </p>
                  <p className="mt-1 text-4xl font-extrabold leading-none">
                    {card.value}
                  </p>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div
          className="flex items-center gap-3 rounded-2xl border px-4 py-3 xl:w-[470px]"
          style={{
            borderColor: 'rgba(148, 163, 184, 0.18)',
            backgroundColor: 'var(--panel)',
            boxShadow: '0 14px 30px rgba(15, 23, 42, 0.04)',
          }}
        >
          <span style={{ color: 'var(--muted)' }}>
            <UiIcon type="search" />
          </span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full bg-transparent outline-none"
            placeholder="Buscar repartidor por nombre, email o placa..."
          />
          {search ? (
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-full border text-sm"
              style={{ borderColor: 'var(--line)' }}
              onClick={() => setSearch('')}
            >
              X
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-2 rounded-2xl border px-5 py-3 font-semibold"
            style={{
              borderColor: 'rgba(148, 163, 184, 0.18)',
              backgroundColor: 'var(--panel)',
              boxShadow: '0 10px 22px rgba(15, 23, 42, 0.04)',
            }}
            onClick={() => window.print()}
          >
            <UiIcon type="download" />
            Exportar
          </button>
          <button
            type="button"
            className="rounded-2xl px-5 py-3 font-semibold text-white"
            style={{
              background:
                'linear-gradient(90deg, rgba(124,58,237,1), rgba(109,40,217,1))',
              boxShadow: '0 12px 26px rgba(109, 40, 217, 0.24)',
            }}
            onClick={() => void loadData(statusFilter)}
          >
            + Nuevo repartidor
          </button>
        </div>
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
                <th className="px-6 py-5 text-left font-semibold">Repartidor</th>
                <th className="px-6 py-5 text-left font-semibold">Vehiculo</th>
                <th className="px-6 py-5 text-left font-semibold">Placa</th>
                <th className="px-6 py-5 text-left font-semibold">Estado</th>
                <th className="px-6 py-5 text-left font-semibold">Fotos</th>
                <th className="px-6 py-5 text-left font-semibold">Accion</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-6 py-10" colSpan="6">
                    Cargando repartidores...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td className="px-6 py-12" colSpan="6">
                    <div className="text-center">
                      <p className="text-lg font-semibold">
                        No encontramos repartidores con ese criterio.
                      </p>
                      <p className="mt-2" style={{ color: 'var(--muted)' }}>
                        Ajusta el filtro o la busqueda para volver a intentarlo.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const fullName =
                    item.full_name ||
                    `${item.first_name || ''} ${item.last_name || ''}`.trim()
                  const badge =
                    STATUS_BADGE[item.approval_status] ||
                    STATUS_BADGE.recien_registrado
                  const nextAction = NEXT_ACTION[item.approval_status]
                  return (
                    <tr
                      key={item.user_id}
                      className="border-t"
                      style={{ borderColor: 'rgba(148, 163, 184, 0.14)' }}
                    >
                      <td className="px-6 py-6 align-top">
                        <div className="flex items-center gap-4">
                          <div
                            className="grid h-14 w-14 place-items-center rounded-full text-lg font-bold"
                            style={{
                              background:
                                'linear-gradient(180deg, rgba(124,58,237,.12), rgba(196,181,253,.28))',
                              color: '#6d28d9',
                            }}
                          >
                            {initials(fullName)}
                          </div>
                          <div>
                            <p className="text-[15px] font-semibold">{fullName}</p>
                            <div
                              className="mt-1 flex flex-col gap-1 text-[13px]"
                              style={{ color: 'var(--muted)' }}
                            >
                              <span>{item.email}</span>
                              <span>{item.phone || 'Sin telefono registrado'}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 align-top">
                        <div className="flex items-center gap-3">
                          <div
                            className="grid h-12 w-12 place-items-center rounded-2xl"
                            style={{
                              background:
                                'linear-gradient(180deg, rgba(124,58,237,.10), rgba(196,181,253,.25))',
                            }}
                          >
                            <UiIcon type={item.vehicle_type === 'motocicleta' ? 'motorbike' : 'car'} />
                          </div>
                          <div>
                            <p className="font-semibold capitalize">
                              {item.vehicle_type}
                            </p>
                            <p style={{ color: 'var(--muted)' }}>
                              {item.vehicle_brand} {item.vehicle_model}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 align-top">
                        <span
                          className="inline-flex rounded-xl border px-3 py-2 font-semibold"
                          style={{ borderColor: 'rgba(148, 163, 184, 0.18)' }}
                        >
                          {item.vehicle_plate}
                        </span>
                      </td>
                      <td className="px-6 py-6 align-top">
                        <span
                          className="inline-flex rounded-full px-4 py-2 text-xs font-semibold capitalize"
                          style={{ backgroundColor: badge.bg, color: badge.color }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-6 align-top">
                        <div className="flex flex-col gap-2">
                          <PhotoLink
                            href={item.vehicle_front_image_url}
                            label="Foto delantera"
                          />
                          <PhotoLink
                            href={item.vehicle_rear_image_url}
                            label="Foto trasera"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-6 align-top">
                        {nextAction ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="rounded-2xl px-5 py-3 font-semibold text-white disabled:opacity-60"
                              style={{
                                background: nextAction.bg,
                                boxShadow: '0 10px 20px rgba(15,23,42,.10)',
                              }}
                              disabled={busyUserId === item.user_id}
                              onClick={() =>
                                handleStatusChange(item.user_id, nextAction.value)
                              }
                            >
                              {busyUserId === item.user_id
                                ? 'Procesando...'
                                : nextAction.label}
                            </button>
                            <button
                              type="button"
                              className="grid h-12 w-12 place-items-center rounded-2xl border"
                              style={{
                                borderColor: 'rgba(148, 163, 184, 0.18)',
                                backgroundColor: 'var(--panel)',
                              }}
                              title="Opciones"
                            >
                              <UiIcon type="chevronDown" />
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--muted)' }}>Sin accion</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div
          className="flex flex-col gap-4 border-t px-6 py-4 text-sm md:flex-row md:items-center md:justify-between"
          style={{ borderColor: 'rgba(148, 163, 184, 0.14)' }}
        >
          <p style={{ color: 'var(--muted)' }}>
            Mostrando {filteredItems.length} de {items.length} repartidores
          </p>
          <div className="flex items-center gap-3" style={{ color: 'var(--muted)' }}>
            <span>Filas por pagina</span>
            <span
              className="rounded-xl border px-3 py-2"
              style={{ borderColor: 'rgba(148, 163, 184, 0.18)' }}
            >
              10
            </span>
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full border"
            >
              <UiIcon type="chevronLeft" />
            </button>
            <span
              className="grid h-9 w-9 place-items-center rounded-full font-semibold text-white"
              style={{
                background:
                  'linear-gradient(180deg, rgba(124,58,237,1), rgba(109,40,217,1))',
              }}
            >
              1
            </span>
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full border"
            >
              <UiIcon type="chevronRight" />
            </button>
          </div>
        </div>
      </section>
    </section>
  )
}

function PhotoLink({ href, label }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex w-fit items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium"
      style={{
        borderColor: 'rgba(124,58,237,.15)',
        color: '#6d28d9',
        backgroundColor: 'rgba(245,243,255,.8)',
      }}
    >
      <UiIcon type="camera" stroke="#6d28d9" />
      <span>{label}</span>
    </a>
  )
}

function initials(value) {
  return (
    String(value || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'RP'
  )
}

function UiIcon({ type, stroke = 'currentColor' }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    stroke,
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }

  switch (type) {
    case 'filter':
      return (
        <svg {...common}>
          <path d="M4 6h16l-6 7v5l-4-2v-3Z" />
        </svg>
      )
    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
      )
    case 'download':
      return (
        <svg {...common}>
          <path d="M12 4v10" />
          <path d="m8.5 10.5 3.5 3.5 3.5-3.5" />
          <path d="M5 19h14" />
        </svg>
      )
    case 'users':
      return (
        <svg {...common}>
          <path d="M9 11a3 3 0 1 0 0-6a3 3 0 0 0 0 6Z" />
          <path d="M17 12a2.5 2.5 0 1 0 0-5" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
          <path d="M15 19a4 4 0 0 1 5-3.9" />
        </svg>
      )
    case 'userPlus':
      return (
        <svg {...common}>
          <path d="M9 11a3 3 0 1 0 0-6a3 3 0 0 0 0 6Z" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
          <path d="M18 8h4" />
          <path d="M20 6v4" />
        </svg>
      )
    case 'checkCircle':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8.5 12 2.3 2.3 4.7-5" />
        </svg>
      )
    case 'pauseCircle':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M10 9v6M14 9v6" />
        </svg>
      )
    case 'motorbike':
      return (
        <svg {...common}>
          <circle cx="7" cy="17" r="2" />
          <circle cx="17" cy="17" r="2" />
          <path d="M7 17h5l2-5h3" />
          <path d="m11 9 2 3h3" />
          <path d="M9 10H6" />
        </svg>
      )
    case 'car':
      return (
        <svg {...common}>
          <path d="M5 16l1.5-5h11L19 16Z" />
          <path d="M7 11l2-3h6l2 3" />
          <circle cx="8" cy="17" r="1.8" />
          <circle cx="16" cy="17" r="1.8" />
        </svg>
      )
    case 'camera':
      return (
        <svg {...common}>
          <path d="M4 8h3l1.5-2h7L17 8h3v10H4z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
      )
    case 'chevronDown':
      return (
        <svg {...common}>
          <path d="m7 10 5 5 5-5" />
        </svg>
      )
    case 'chevronLeft':
      return (
        <svg {...common}>
          <path d="m14 7-5 5 5 5" />
        </svg>
      )
    case 'chevronRight':
      return (
        <svg {...common}>
          <path d="m10 7 5 5-5 5" />
        </svg>
      )
    default:
      return null
  }
}
