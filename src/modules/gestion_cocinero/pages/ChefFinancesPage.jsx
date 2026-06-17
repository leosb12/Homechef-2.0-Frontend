import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchChefFinancesSummary } from '../services/chef_service'

export default function ChefFinancesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [finances, setFinances] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const startDate = searchParams.get('start_date') || ''
  const endDate = searchParams.get('end_date') || ''

  useEffect(() => {
    setLoading(true)
    setError('')
    fetchChefFinancesSummary(startDate, endDate)
      .then(setFinances)
      .catch((err) => {
        const errMsg = err?.response?.data?.detail || err.message || 'Error desconocido al cargar las finanzas'
        setError(`No se pudieron cargar los ingresos: ${errMsg}`)
      })
      .finally(() => setLoading(false))
  }, [startDate, endDate])

  const handleFilter = (e) => {
    e.preventDefault()
    const form = new FormData(e.target)
    const sDate = form.get('start_date')
    const eDate = form.get('end_date')
    
    const params = {}
    if (sDate) params.start_date = sDate
    if (eDate) params.end_date = eDate
    setSearchParams(params)
  }

  return (
    <section className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Mis Ingresos</h1>
      </div>

      <div className="rounded-xl border p-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
        <form onSubmit={handleFilter} className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Fecha inicio</label>
            <input 
              name="start_date" 
              type="date" 
              defaultValue={startDate}
              className="px-3 py-2 border rounded-md" 
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fecha fin</label>
            <input 
              name="end_date" 
              type="date" 
              defaultValue={endDate}
              className="px-3 py-2 border rounded-md" 
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)' }}
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
            Filtrar
          </button>
        </form>
      </div>

      {loading && <p>Cargando información financiera...</p>}
      
      {error && (
        <div className="p-4 rounded-md bg-red-50 text-red-600 border border-red-200">
          <p className="font-semibold">Ha ocurrido un error:</p>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && finances && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Mostrando resultados desde <strong>{new Date(finances.period.start_date).toLocaleDateString()}</strong> hasta <strong>{new Date(finances.period.end_date).toLocaleDateString()}</strong>
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-6 rounded-xl border" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <h3 className="text-xl font-bold">Ingresos Consolidados</h3>
              </div>
              <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>Órdenes entregadas o retiradas. Dinero asegurado.</p>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Ventas Brutas:</span>
                  <span className="font-medium">Bs {finances.ingresos_consolidados.ventas_brutas.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-500">
                  <span>Comisiones (-):</span>
                  <span>Bs {finances.ingresos_consolidados.comisiones_plataforma.toFixed(2)}</span>
                </div>
                <hr style={{ borderColor: 'var(--line)' }} className="my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Ganancia Neta:</span>
                  <span className="text-emerald-600">Bs {finances.ingresos_consolidados.ganancia_neta.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl border" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <h3 className="text-xl font-bold">Ingresos Pendientes</h3>
              </div>
              <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>Órdenes pagadas pero aún no despachadas (riesgo de cancelación).</p>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Ventas Brutas:</span>
                  <span className="font-medium">Bs {finances.ingresos_pendientes.ventas_brutas.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-500">
                  <span>Comisiones (-):</span>
                  <span>Bs {finances.ingresos_pendientes.comisiones_plataforma.toFixed(2)}</span>
                </div>
                <hr style={{ borderColor: 'var(--line)' }} className="my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Ganancia Neta:</span>
                  <span className="text-amber-600">Bs {finances.ingresos_pendientes.ganancia_neta.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
