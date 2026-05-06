import { useEffect, useMemo, useState } from 'react'
import { fetchChefAvailability, saveChefAvailability } from '../services/chef_service'
import LoadingButton from '../components/LoadingButton'

const DAYS = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
]

const EMPTY_FORM = {
  is_active: true,
  weekly_schedule: [],
  pickup_schedule: '',
  accept_delivery: true,
  accept_pickup: true,
  simultaneous_orders_limit: 10,
}

export default function ChefAvailabilityPage() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchChefAvailability()
      .then((data) => setForm({ ...EMPTY_FORM, ...data, weekly_schedule: data.weekly_schedule || [] }))
      .catch(() => setMessage('No se pudo cargar tu disponibilidad actual.'))
      .finally(() => setLoading(false))
  }, [])

  const activeSlots = useMemo(
    () => (form.weekly_schedule || []).filter((slot) => slot.enabled !== false),
    [form.weekly_schedule],
  )

  const save = async (event) => {
    event.preventDefault()
    setMessage('')
    const localError = validateForm(form)
    if (localError) {
      setMessage(localError)
      return
    }

    setSaving(true)
    try {
      const updated = await saveChefAvailability(form)
      setForm({ ...EMPTY_FORM, ...updated, weekly_schedule: updated.weekly_schedule || [] })
      setMessage('Disponibilidad guardada y aplicada al marketplace.')
    } catch (err) {
      setMessage(err?.response?.data?.detail || 'No se pudo guardar la disponibilidad.')
    } finally {
      setSaving(false)
    }
  }

  const addSlot = (day) => {
    setForm((current) => ({
      ...current,
      weekly_schedule: [
        ...(current.weekly_schedule || []),
        { day, enabled: true, start_time: '09:00', end_time: '13:00', modes: enabledModes(current) },
      ],
    }))
  }

  const updateSlot = (index, patch) => {
    setForm((current) => ({
      ...current,
      weekly_schedule: current.weekly_schedule.map((slot, slotIndex) => (
        slotIndex === index ? { ...slot, ...patch } : slot
      )),
    }))
  }

  const removeSlot = (index) => {
    setForm((current) => ({
      ...current,
      weekly_schedule: current.weekly_schedule.filter((_, slotIndex) => slotIndex !== index),
    }))
  }

  const toggleMode = (index, mode) => {
    const slot = form.weekly_schedule[index]
    const modes = new Set(slot.modes || [])
    if (modes.has(mode)) modes.delete(mode)
    else modes.add(mode)
    updateSlot(index, { modes: Array.from(modes) })
  }

  const setModality = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field]: value }
      const allowed = enabledModes(next)
      return {
        ...next,
        weekly_schedule: (next.weekly_schedule || []).map((slot) => ({
          ...slot,
          modes: (slot.modes || []).filter((mode) => allowed.includes(mode)),
        })),
      }
    })
  }

  if (loading) return <p style={{ color: 'var(--muted)' }}>Cargando disponibilidad...</p>

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Disponibilidad</h1>
          <p style={{ color: 'var(--muted)' }}>
            Define cuándo puedes recibir pedidos y qué modalidad atiendes en cada franja.
          </p>
        </div>
        <StatusBadge active={form.is_active} openNow={form.is_open_now} />
      </div>

      <form className="space-y-4" onSubmit={save}>
        <section className="rounded-xl border p-4 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--line)' }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
              />
              <span>
                <span className="block font-semibold">Atención activa</span>
                <span className="text-sm" style={{ color: 'var(--muted)' }}>Permite aparecer como disponible dentro de tus horarios.</span>
              </span>
            </label>
            <label className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--line)' }}>
              <input
                type="checkbox"
                checked={form.accept_delivery}
                onChange={(event) => setModality('accept_delivery', event.target.checked)}
              />
              <span>
                <span className="block font-semibold">Delivery</span>
                <span className="text-sm" style={{ color: 'var(--muted)' }}>Recibir pedidos con entrega.</span>
              </span>
            </label>
            <label className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--line)' }}>
              <input
                type="checkbox"
                checked={form.accept_pickup}
                onChange={(event) => setModality('accept_pickup', event.target.checked)}
              />
              <span>
                <span className="block font-semibold">Retiro</span>
                <span className="text-sm" style={{ color: 'var(--muted)' }}>El cliente puede recoger el pedido.</span>
              </span>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <label className="grid gap-1">
              <span className="text-sm font-semibold">Horario visible para retiro o notas de atención</span>
              <input
                className="border rounded-lg px-3 py-2"
                style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
                placeholder="Ej: Retiro por portería, pedidos hasta 30 min antes"
                value={form.pickup_schedule || ''}
                onChange={(event) => setForm({ ...form, pickup_schedule: event.target.value })}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-semibold">Pedidos simultáneos</span>
              <input
                type="number"
                min="1"
                max="50"
                className="border rounded-lg px-3 py-2"
                style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
                value={form.simultaneous_orders_limit || 1}
                onChange={(event) => setForm({ ...form, simultaneous_orders_limit: Number(event.target.value) })}
              />
            </label>
          </div>
        </section>

        <section className="rounded-xl border p-4 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Horarios semanales</h2>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Puedes crear varias franjas por día. El sistema evita horarios incompletos o superpuestos.
              </p>
            </div>
            <p className="text-sm font-semibold">{activeSlots.length} franjas activas</p>
          </div>

          <div className="space-y-4">
            {DAYS.map((day) => {
              const slots = (form.weekly_schedule || [])
                .map((slot, index) => ({ ...slot, index }))
                .filter((slot) => slot.day === day.key)
              return (
                <div key={day.key} className="border-t pt-4 first:border-t-0 first:pt-0" style={{ borderColor: 'var(--line)' }}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-bold">{day.label}</h3>
                    <button
                      type="button"
                      onClick={() => addSlot(day.key)}
                      className="rounded-lg border px-3 py-2 text-sm"
                      style={{ borderColor: 'var(--line)', color: 'var(--brand-2)' }}
                    >
                      Agregar horario
                    </button>
                  </div>

                  {slots.length ? (
                    <div className="mt-3 grid gap-2">
                      {slots.map((slot) => (
                        <div key={slot.index} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-[80px_150px_150px_minmax(0,1fr)_auto]" style={{ borderColor: 'var(--line)' }}>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={slot.enabled !== false}
                              onChange={(event) => updateSlot(slot.index, { enabled: event.target.checked })}
                            />
                            Activo
                          </label>
                          <input
                            type="time"
                            value={slot.start_time || '09:00'}
                            onChange={(event) => updateSlot(slot.index, { start_time: event.target.value })}
                            className="border rounded-lg px-3 py-2"
                            style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
                          />
                          <input
                            type="time"
                            value={slot.end_time || '13:00'}
                            onChange={(event) => updateSlot(slot.index, { end_time: event.target.value })}
                            className="border rounded-lg px-3 py-2"
                            style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
                          />
                          <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-1">
                            <ModeToggle
                              label="Delivery"
                              disabled={!form.accept_delivery}
                              checked={(slot.modes || []).includes('delivery')}
                              onChange={() => toggleMode(slot.index, 'delivery')}
                            />
                            <ModeToggle
                              label="Retiro"
                              disabled={!form.accept_pickup}
                              checked={(slot.modes || []).includes('pickup')}
                              onChange={() => toggleMode(slot.index, 'pickup')}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSlot(slot.index)}
                            className="rounded-lg border px-3 py-2 text-sm"
                            style={{ borderColor: 'var(--line)' }}
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>Sin horarios para este día.</p>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <section className="rounded-xl border p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <div>
            <p className="font-semibold">Resumen publicado</p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{buildSummary(form.weekly_schedule)}</p>
          </div>
          <LoadingButton type="submit" loading={saving} loadingLabel="Guardando..." className="px-4 py-2 rounded-lg text-white w-fit" style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}>
            Guardar disponibilidad
          </LoadingButton>
        </section>
      </form>

      {message && <p className="rounded-xl border px-3 py-2 inline-block" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>{message}</p>}
    </section>
  )
}

function ModeToggle({ label, checked, disabled, onChange }) {
  return (
    <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${disabled ? 'opacity-50' : ''}`} style={{ borderColor: 'var(--line)' }}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} />
      {label}
    </label>
  )
}

function StatusBadge({ active, openNow }) {
  const label = active ? (openNow ? 'Disponible ahora' : 'Fuera de horario') : 'Pausado'
  return (
    <span className="rounded-full border px-4 py-2 text-sm font-semibold" style={{ borderColor: 'var(--line)', color: openNow ? '#16a34a' : 'var(--muted)' }}>
      {label}
    </span>
  )
}

function enabledModes(form) {
  return [
    form.accept_delivery ? 'delivery' : '',
    form.accept_pickup ? 'pickup' : '',
  ].filter(Boolean)
}

function validateForm(form) {
  if (!form.accept_delivery && !form.accept_pickup) return 'Debes habilitar delivery, retiro o ambas modalidades.'
  if (Number(form.simultaneous_orders_limit || 0) <= 0) return 'El límite de pedidos simultáneos debe ser mayor a cero.'
  const active = (form.weekly_schedule || []).filter((slot) => slot.enabled !== false)
  if (form.is_active && !active.length) return 'Configura al menos un horario activo antes de activar atención.'
  for (const slot of active) {
    if (!slot.start_time || !slot.end_time) return 'Completa hora de inicio y fin en todos los horarios activos.'
    if (slot.end_time <= slot.start_time) return 'La hora de fin debe ser posterior a la hora de inicio.'
    if (!(slot.modes || []).length) return 'Cada horario activo debe tener delivery, retiro o ambas modalidades.'
  }
  return ''
}

function buildSummary(slots = []) {
  const active = slots.filter((slot) => slot.enabled !== false)
  if (!active.length) return 'Sin horarios configurados'
  return active.map((slot) => {
    const day = DAYS.find((item) => item.key === slot.day)?.label || slot.day
    const modes = (slot.modes || []).map((mode) => (mode === 'pickup' ? 'retiro' : 'delivery')).join(' y ')
    return `${day} ${slot.start_time}-${slot.end_time}${modes ? ` (${modes})` : ''}`
  }).join('; ')
}
