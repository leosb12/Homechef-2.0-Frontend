import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PublicDishCard from '../components/PublicDishCard'
import { fetchPublicDashboard } from '../services/public_dashboard_service'

export default function PublicMarketplaceDashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [dishes, setDishes] = useState([])

  const loadDashboard = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetchPublicDashboard()
      setDishes(response.dishes || [])
      setMessage(response.message || '')
    } catch {
      setError('No se pudo cargar el dashboard publico. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const handleRestrictedAction = (action) => {
    window.alert(`Para ${action} debes iniciar sesion.`)
    navigate('/login')
  }

  if (loading) {
    return <div className="text-slate-600">Cargando dashboard publico...</div>
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-red-700">{error}</p>
        <button
          className="px-4 py-2 rounded-md bg-slate-900 text-white"
          onClick={loadDashboard}
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Platos destacados</h1>
        <p className="text-slate-600">{message}</p>
      </header>

      {dishes.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-slate-600">
          No hay productos disponibles por el momento.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dishes.map((dish) => (
            <PublicDishCard
              key={dish.id}
              dish={dish}
              onRestrictedAction={handleRestrictedAction}
              onViewDetail={() => handleRestrictedAction('ver detalle')}
            />
          ))}
        </div>
      )}
    </section>
  )
}
