import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchClientExplore,
  fetchFavorites,
  fetchPreferences,
  removeFavorite,
  savePreferences,
} from '../services/public_dashboard_service'

const CUISINE_OPTIONS = [
  'tradicional',
  'fusion',
  'italiana',
  'mexicana',
  'asiatica',
  'mediterranea',
  'japonesa',
  'vegetariana',
  'arabe',
  'tailandesa',
  'otra',
]

function cuisineLabel(value) {
  const map = {
    tradicional: 'Tradicional',
    fusion: 'Fusión',
    italiana: 'Italiana',
    mexicana: 'Mexicana',
    asiatica: 'Asiática',
    mediterranea: 'Mediterránea',
    japonesa: 'Japonesa',
    vegetariana: 'Vegetariana',
    arabe: 'Árabe',
    tailandesa: 'Tailandesa',
    otra: 'Otra',
  }
  return map[value] || value
}

export default function FavoritesPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [prefs, setPrefs] = useState({ cuisine_types: [], diet_types: [], price_range: {} })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [dishesIndex, setDishesIndex] = useState({})

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [fav, pr, explore] = await Promise.all([
        fetchFavorites(),
        fetchPreferences(),
        fetchClientExplore({}),
      ])

      const map = {}
      for (const dish of (explore?.dishes || [])) {
        map[String(dish.id)] = dish
      }

      setDishesIndex(map)
      setItems(fav.items || [])
      setPrefs({
        cuisine_types: pr?.cuisine_types || [],
        diet_types: pr?.diet_types || [],
        price_range: pr?.price_range || {},
      })
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        navigate('/login')
        return
      }
      setError('No se pudo cargar favoritos y preferencias.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(''), 3500)
    return () => clearTimeout(timer)
  }, [message])

  const favoriteDishItems = useMemo(
    () => (items || []).filter((item) => item.favorite_type === 'dish'),
    [items],
  )

  const onRemove = async (item) => {
    try {
      await removeFavorite(item.favorite_type, item.ref_id)
      setItems((prev) => prev.filter((x) => x._id !== item._id))
      setMessage('Favorito eliminado correctamente.')
    } catch {
      setMessage('No se pudo eliminar el favorito.')
    }
  }

  const toggleCuisine = (value) => {
    const current = new Set(prefs.cuisine_types || [])
    if (current.has(value)) current.delete(value)
    else current.add(value)
    setPrefs((prev) => ({ ...prev, cuisine_types: Array.from(current) }))
  }

  const onSavePrefs = async () => {
    try {
      await savePreferences(prefs)
      setMessage('Preferencias guardadas correctamente.')
    } catch {
      setMessage('No se pudieron guardar las preferencias.')
    }
  }

  return (
    <section className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-5xl font-bold flex items-center gap-3">
          <span className="h-12 w-12 rounded-2xl grid place-items-center text-3xl" style={{ backgroundColor: 'var(--panel-soft)', color: 'var(--brand-2)' }}>
            ♡
          </span>
          Favoritos y preferencias
        </h1>
        <p className="text-2xl" style={{ color: 'var(--muted)' }}>
          Administra tus platos favoritos y personaliza tus preferencias para mejores recomendaciones.
        </p>
        {message && (
          <p className="text-sm rounded-xl border px-3 py-2 inline-block" style={{ borderColor: 'var(--line)', color: 'var(--brand-2)', backgroundColor: 'var(--panel-soft)' }}>
            {message}
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 items-start">
        <article className="lg:col-span-2 rounded-2xl border p-4 md:p-5 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="h-14 w-14 rounded-2xl grid place-items-center text-3xl" style={{ backgroundColor: 'var(--panel-soft)', color: 'var(--brand-2)' }}>🔖</span>
              <div>
                <h2 className="text-3xl font-bold">Favoritos</h2>
                <p style={{ color: 'var(--muted)' }}>Tus platos favoritos guardados.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/client/explore')}
              className="px-4 py-2 rounded-xl border text-lg font-semibold"
              style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--brand-2)' }}
            >
              + Agregar favorito
            </button>
          </div>

          {loading ? <p style={{ color: 'var(--muted)' }}>Cargando favoritos...</p> : null}

          {!loading && favoriteDishItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center space-y-2" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>
              <p className="text-4xl">➕</p>
              <h3 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>Aún no tienes más favoritos</h3>
              <p>Agrega platos que te encanten para ver mejores recomendaciones.</p>
            </div>
          ) : null}

          {!loading && favoriteDishItems.length > 0 ? (
            <div className="space-y-3">
              {favoriteDishItems.map((item) => {
                const dish = dishesIndex[String(item.ref_id)] || null
                return (
                  <div key={item._id} className="rounded-2xl border p-3 md:p-4 flex gap-3 items-center" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
                    <img
                      src={dish?.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=80&auto=format&fit=crop'}
                      alt={dish?.name || 'Plato favorito'}
                      className="h-24 w-24 rounded-2xl object-cover border"
                      style={{ borderColor: 'var(--line)' }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-2xl font-bold truncate">{dish?.name || 'Plato favorito'}</h3>
                        <span className="text-sm px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--panel-soft)', color: 'var(--brand-2)' }}>Dish</span>
                      </div>
                      <p className="text-sm" style={{ color: 'var(--muted)' }}>ID: {item.ref_id}</p>
                      <p className="text-sm" style={{ color: 'var(--muted)' }}>
                        Guardado el {item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(item)}
                      className="px-3 py-2 rounded-xl border text-red-600 font-semibold"
                      style={{ borderColor: '#fecaca', backgroundColor: '#fff1f2' }}
                    >
                      🗑 Quitar
                    </button>
                  </div>
                )
              })}
            </div>
          ) : null}

          <div className="rounded-2xl border p-4 flex items-center justify-between" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
            <div>
              <h3 className="text-2xl font-bold">Descubre más</h3>
              <p style={{ color: 'var(--muted)' }}>Agrega más platos a tus favoritos y recibe recomendaciones personalizadas.</p>
            </div>
            <span className="text-3xl" style={{ color: 'var(--brand-2)' }}>›</span>
          </div>
        </article>

        <aside className="rounded-2xl border p-4 md:p-5 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <div className="flex items-center gap-3">
            <span className="h-14 w-14 rounded-2xl grid place-items-center text-3xl" style={{ backgroundColor: 'var(--panel-soft)', color: 'var(--brand-2)' }}>🍽️</span>
            <div>
              <h2 className="text-3xl font-bold">Preferencias</h2>
              <p style={{ color: 'var(--muted)' }}>Selecciona los tipos de cocina que más te gustan.</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-semibold text-xl">Tipos de cocina</p>
            <div className="flex flex-wrap gap-2">
              {CUISINE_OPTIONS.map((option) => {
                const active = (prefs.cuisine_types || []).includes(option)
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleCuisine(option)}
                    className="px-3 py-2 rounded-xl border text-lg transition"
                    style={
                      active
                        ? {
                          borderColor: 'transparent',
                          color: '#fff',
                          background: 'linear-gradient(90deg, var(--brand), var(--brand-2))',
                        }
                        : {
                          borderColor: 'var(--line)',
                          color: 'var(--text)',
                          backgroundColor: 'var(--panel)',
                        }
                    }
                  >
                    {cuisineLabel(option)} {active ? '✓' : ''}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border p-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
            <h3 className="text-xl font-bold">Mejores recomendaciones</h3>
            <p style={{ color: 'var(--muted)' }}>
              Cuantos más tipos de cocina selecciones, mejores serán nuestras sugerencias para ti.
            </p>
          </div>

          <button
            type="button"
            onClick={onSavePrefs}
            className="w-full px-4 py-3 rounded-xl text-white text-xl font-bold"
            style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
          >
            💾 Guardar preferencias
          </button>
        </aside>
      </div>
    </section>
  )
}
