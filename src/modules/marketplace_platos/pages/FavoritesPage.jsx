import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchFavorites,
  fetchPreferences,
  removeFavorite,
  savePreferences,
} from '../services/public_dashboard_service'

const CUISINE_OPTIONS = [
  'tradicional',
  'fusion',
  'internacional',
  'veg',
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

const DIET_OPTIONS = ['regular', 'vegetariano', 'vegano', 'sin_gluten']

const LABELS = {
  tradicional: 'Tradicional',
  fusion: 'Fusion',
  internacional: 'Internacional',
  veg: 'Veg',
  italiana: 'Italiana',
  mexicana: 'Mexicana',
  asiatica: 'Asiatica',
  mediterranea: 'Mediterranea',
  japonesa: 'Japonesa',
  vegetariana: 'Vegetariana',
  arabe: 'Arabe',
  tailandesa: 'Tailandesa',
  otra: 'Otra',
  regular: 'Regular',
  vegetariano: 'Vegetariano',
  vegano: 'Vegano',
  sin_gluten: 'Sin gluten',
}

export default function FavoritesPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [prefs, setPrefs] = useState({ cuisine_types: [], diet_types: [], price_range: {} })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [fav, pr] = await Promise.all([fetchFavorites(), fetchPreferences()])
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

  const dishItems = useMemo(() => (items || []).filter((item) => item.favorite_type === 'dish'), [items])
  const chefItems = useMemo(() => (items || []).filter((item) => item.favorite_type === 'chef'), [items])

  const onRemove = async (item) => {
    try {
      await removeFavorite(item.favorite_type, item.ref_id)
      setItems((prev) => prev.filter((x) => x._id !== item._id))
      setMessage('Favorito eliminado correctamente.')
    } catch {
      setMessage('No se pudo eliminar el favorito.')
    }
  }

  const toggleArrayValue = (field, value) => {
    const current = new Set(prefs[field] || [])
    if (current.has(value)) current.delete(value)
    else current.add(value)
    setPrefs((prev) => ({ ...prev, [field]: Array.from(current) }))
  }

  const setPrice = (field, value) => {
    setPrefs((prev) => ({
      ...prev,
      price_range: {
        ...(prev.price_range || {}),
        [field]: value === '' ? '' : Number(value),
      },
    }))
  }

  const onSavePrefs = async () => {
    try {
      await savePreferences({
        cuisine_types: prefs.cuisine_types || [],
        diet_types: prefs.diet_types || [],
        price_range: cleanPriceRange(prefs.price_range || {}),
      })
      setMessage('Preferencias guardadas correctamente.')
    } catch (err) {
      setMessage(err?.response?.data?.detail || 'No se pudieron guardar las preferencias.')
    }
  }

  return (
    <section className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-5xl font-bold">Favoritos y preferencias</h1>
        <p className="text-2xl" style={{ color: 'var(--muted)' }}>
          Guarda platos o cocineros favoritos y ajusta tus preferencias para personalizar el marketplace.
        </p>
        {message && (
          <p className="text-sm rounded-xl border px-3 py-2 inline-block" style={{ borderColor: 'var(--line)', color: 'var(--brand-2)', backgroundColor: 'var(--panel-soft)' }}>
            {message}
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 items-start">
        <article className="lg:col-span-2 rounded-2xl border p-4 md:p-5 space-y-5" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold">Favoritos</h2>
              <p style={{ color: 'var(--muted)' }}>Tus platos y cocineros guardados.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/client/explore')}
              className="px-4 py-2 rounded-xl border text-lg font-semibold self-start sm:self-auto"
              style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--brand-2)' }}
            >
              Explorar
            </button>
          </div>

          {loading ? <p style={{ color: 'var(--muted)' }}>Cargando favoritos...</p> : null}

          {!loading && !items.length ? (
            <div className="rounded-2xl border border-dashed p-10 text-center space-y-2" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>
              <h3 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>Aún no tienes favoritos</h3>
              <p>Agrega platos o cocineros desde el dashboard o desde el detalle del plato.</p>
            </div>
          ) : null}

          {!loading && dishItems.length > 0 ? (
            <FavoriteSection title="Platos favoritos">
              {dishItems.map((item) => (
                <FavoriteCard key={item._id} item={item} onRemove={onRemove} onOpen={() => navigate(`/client/dishes/${item.ref_id}`)} />
              ))}
            </FavoriteSection>
          ) : null}

          {!loading && chefItems.length > 0 ? (
            <FavoriteSection title="Cocineros favoritos">
              {chefItems.map((item) => (
                <FavoriteCard key={item._id} item={item} onRemove={onRemove} />
              ))}
            </FavoriteSection>
          ) : null}
        </article>

        <aside className="rounded-2xl border p-4 md:p-5 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <div>
            <h2 className="text-3xl font-bold">Preferencias</h2>
            <p style={{ color: 'var(--muted)' }}>Tipos de comida, restricciones y rango de precio.</p>
          </div>

          <PreferenceButtons
            title="Tipos de cocina"
            options={CUISINE_OPTIONS}
            selected={prefs.cuisine_types || []}
            onToggle={(value) => toggleArrayValue('cuisine_types', value)}
          />

          <PreferenceButtons
            title="Restricciones alimentarias"
            options={DIET_OPTIONS}
            selected={prefs.diet_types || []}
            onToggle={(value) => toggleArrayValue('diet_types', value)}
          />

          <div className="space-y-2">
            <p className="font-semibold text-xl">Rango de precio</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="0"
                value={prefs.price_range?.min ?? ''}
                onChange={(event) => setPrice('min', event.target.value)}
                placeholder="Min Bs"
                className="border rounded-xl px-3 py-2"
                style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
              />
              <input
                type="number"
                min="0"
                value={prefs.price_range?.max ?? ''}
                onChange={(event) => setPrice('max', event.target.value)}
                placeholder="Max Bs"
                className="border rounded-xl px-3 py-2"
                style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onSavePrefs}
            className="w-full px-4 py-3 rounded-xl text-white text-xl font-bold"
            style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
          >
            Guardar preferencias
          </button>
        </aside>
      </div>
    </section>
  )
}

function FavoriteSection({ title, children }) {
  return (
    <section className="space-y-3">
      <h3 className="text-2xl font-bold">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function FavoriteCard({ item, onRemove, onOpen }) {
  const target = item.target || {}
  const isDish = item.favorite_type === 'dish'
  const image = target.image_url || target.profile_image_url

  return (
    <div className="rounded-2xl border p-3 md:p-4 flex flex-col gap-3 sm:flex-row sm:items-center" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
      <div className="h-24 w-24 rounded-2xl overflow-hidden border grid place-items-center shrink-0" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
        {image ? <img src={image} alt={target.name || 'Favorito'} className="h-full w-full object-cover" /> : <span style={{ color: 'var(--muted)' }}>Sin foto</span>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-2xl font-bold truncate">{target.name || (isDish ? 'Plato favorito' : 'Cocinero favorito')}</h3>
          <span className="text-sm px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--panel-soft)', color: 'var(--brand-2)' }}>
            {isDish ? 'Plato' : 'Cocinero'}
          </span>
        </div>
        {isDish ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {target.chef_name || 'Cocinero'} {target.approx_price ? `- Bs ${Number(target.approx_price).toFixed(2)}` : ''}
          </p>
        ) : (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {target.specialties?.length ? target.specialties.join(', ') : target.public_description || 'Sin especialidades registradas'}
          </p>
        )}
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Guardado el {item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
        </p>
      </div>
      <div className="flex w-full flex-row gap-2 sm:w-auto sm:flex-col">
        {onOpen ? (
          <button type="button" onClick={onOpen} className="px-3 py-2 rounded-xl border font-semibold" style={{ borderColor: 'var(--line)' }}>
            Ver
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onRemove(item)}
          className="px-3 py-2 rounded-xl border text-red-600 font-semibold"
          style={{ borderColor: '#fecaca', backgroundColor: '#fff1f2' }}
        >
          Quitar
        </button>
      </div>
    </div>
  )
}

function PreferenceButtons({ title, options, selected, onToggle }) {
  return (
    <div className="space-y-2">
      <p className="font-semibold text-xl">{title}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option)
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className="px-3 py-2 rounded-xl border text-base transition"
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
              {LABELS[option] || option} {active ? '✓' : ''}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function cleanPriceRange(priceRange) {
  const result = {}
  if (priceRange.min !== '' && priceRange.min !== undefined) result.min = Number(priceRange.min)
  if (priceRange.max !== '' && priceRange.max !== undefined) result.max = Number(priceRange.max)
  return result
}
