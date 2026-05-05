import { useEffect, useState } from 'react'
import { fetchChefDashboard } from '../services/chef_service'

export default function ChefDashboardPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchChefDashboard().then(setData).catch(() => setError('No se pudo cargar el dashboard.'))
  }, [])

  if (error) return <p>{error}</p>
  if (!data) return <p>Cargando dashboard...</p>

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">Dashboard cocinero</h1>
      <div className="grid md:grid-cols-4 gap-3">
        <Card label="Ventas totales" value={`Bs ${data.sales_total}`} />
        <Card label="Ingresos" value={`Bs ${data.income_total}`} />
        <Card label="Comisiones" value={`Bs ${data.commissions_total}`} />
        <Card label="Platos publicados" value={`${data.dishes_published}/${data.dishes_total}`} />
      </div>
      <div className="rounded-xl border p-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
        <h2 className="text-xl font-semibold mb-2">Sugerencias</h2>
        <ul className="list-disc pl-6">
          {(data.suggestions || []).map((s) => <li key={s}>{s}</li>)}
        </ul>
      </div>
    </section>
  )
}

function Card({ label, value }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}
