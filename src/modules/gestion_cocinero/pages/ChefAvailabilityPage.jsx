import { useEffect, useState } from 'react'
import { fetchChefAvailability, saveChefAvailability } from '../services/chef_service'

export default function ChefAvailabilityPage() {
  const [form, setForm] = useState({
    is_active: true,
    weekly_schedule: [],
    pickup_schedule: '',
    accept_delivery: true,
    accept_pickup: true,
    simultaneous_orders_limit: 10,
  })
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchChefAvailability().then(setForm).catch(() => {})
  }, [])

  const save = async (e) => {
    e.preventDefault()
    try {
      await saveChefAvailability(form)
      setMessage('Disponibilidad actualizada.')
    } catch (err) {
      setMessage(err?.response?.data?.detail || 'No se pudo guardar.')
    }
  }

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">Disponibilidad</h1>
      <form className="rounded-xl border p-4 grid gap-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }} onSubmit={save}>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />Atencion activa</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.accept_delivery} onChange={(e) => setForm({ ...form, accept_delivery: e.target.checked })} />Acepta delivery</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.accept_pickup} onChange={(e) => setForm({ ...form, accept_pickup: e.target.checked })} />Acepta retiro</label>
        <input className="border rounded-lg px-3 py-2" style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }} placeholder="Horario general (ej: Lun-Dom 11:00-21:00)" value={form.pickup_schedule || ''} onChange={(e) => setForm({ ...form, pickup_schedule: e.target.value })} />
        <input type="number" min="1" className="border rounded-lg px-3 py-2" style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }} value={form.simultaneous_orders_limit || 10} onChange={(e) => setForm({ ...form, simultaneous_orders_limit: Number(e.target.value) })} />
        <button className="px-4 py-2 rounded-lg text-white w-fit" style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}>Guardar disponibilidad</button>
      </form>
      {message && <p>{message}</p>}
    </section>
  )
}
