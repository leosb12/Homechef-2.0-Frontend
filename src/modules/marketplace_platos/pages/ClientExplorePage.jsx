import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PublicDishCard from '../components/PublicDishCard'
import { addFavorite, fetchClientExplore, fetchFavorites, removeFavorite } from '../services/public_dashboard_service'
import { useThemeSession } from '../../../shared/services/theme_session'
import dashboardClaro from '../../../shared/assets/dashboard-claro.png'
import dashboardOscuro from '../../../shared/assets/dashboard-oscuro.png'
import { useConnectivity } from '../../../shared/hooks/useConnectivity'

export default function ClientExplorePage() {
  const navigate = useNavigate()
  const theme = useThemeSession((state) => state.theme)
  const { isOnline } = useConnectivity()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [dishes, setDishes] = useState([])
  const [q, setQ] = useState('')
  const [featured, setFeatured] = useState('')
  const [sort, setSort] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [availability, setAvailability] = useState('')
  const [cuisineType, setCuisineType] = useState('')
  const [dietType, setDietType] = useState('')
  const [locationAvailable, setLocationAvailable] = useState('true')
  const [maxDistanceKm, setMaxDistanceKm] = useState('')
  const [clientLocation, setClientLocation] = useState(null)
  const [isTypingSearch, setIsTypingSearch] = useState(false)
  const [favoriteDishIds, setFavoriteDishIds] = useState(new Set())
  const [favoriteConfirm, setFavoriteConfirm] = useState(null)
  const [searchReady, setSearchReady] = useState(false)
  const searchEffectInitialized = useRef(false)

  const loadExplore = async (filters = {}, favoriteIdsOverride = null) => {
    setLoading(true)
    setError('')
    try {
      const response = await fetchClientExplore(filters)
      const rawDishes = response.dishes || []
      const favoriteSet = favoriteIdsOverride || favoriteDishIds
      const withFavorites = applyDistanceFilter(rawDishes, filters.max_distance_km, filters.sort).map((dish) => ({
        ...dish,
        is_favorite: favoriteSet.has(String(dish.id)),
      }))
      setDishes(withFavorites)
      setMessage(response.message || '')
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        navigate('/login')
        return
      }
      if (!isOnline) {
        setError('No hay datos offline disponibles para esta pantalla. Conéctate y sincroniza cuando tengas internet.')
      } else {
        setError('No se pudo cargar la exploracion de platos. Intenta nuevamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const bootstrap = async () => {
      let blockedByAuth = false
      try {
        const fav = await fetchFavorites()
        const ids = new Set((fav.items || [])
          .filter((item) => item.favorite_type === 'dish')
          .map((item) => String(item.ref_id)))
        setFavoriteDishIds(ids)
        const location = await resolveClientLocation()
        setClientLocation(location)
        await loadExplore(withLocationParams({}, location), ids)
      } catch (err) {
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          blockedByAuth = true
          navigate('/login')
          return
        }
        // Si falla favoritos, continuamos con explore normal.
        await loadExplore(withLocationParams({}, null))
      } finally {
        if (blockedByAuth) return
        setSearchReady(true)
      }
    }
    bootstrap()
  }, [])

  const onApplyFilters = (event) => {
    event.preventDefault()
    loadExplore({
      ...currentFilters(),
      ...locationParams(clientLocation),
    })
  }

  useEffect(() => {
    if (!searchReady) return
    if (!searchEffectInitialized.current) {
      searchEffectInitialized.current = true
      return
    }

    const timer = setTimeout(() => {
      setIsTypingSearch(true)
      loadExplore({
        ...currentFilters(),
        ...locationParams(clientLocation),
      }).finally(() => setIsTypingSearch(false))
    }, 350)
    return () => clearTimeout(timer)
    // Solo escucha busqueda en vivo por texto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, searchReady])

  useEffect(() => {
    setDishes((prev) =>
      prev.map((dish) => ({
        ...dish,
        is_favorite: favoriteDishIds.has(String(dish.id)),
      })),
    )
  }, [favoriteDishIds])

  const onClearFilters = () => {
    setQ('')
    setFeatured('')
    setSort('')
    setMinPrice('')
    setMaxPrice('')
    setAvailability('')
    setCuisineType('')
    setDietType('')
    setLocationAvailable('true')
    setMaxDistanceKm('')
    loadExplore(withLocationParams({}, clientLocation))
  }

  const onRestrictedAction = (action) => {
    window.alert(`La accion "${action}" se habilitara en CU-24/CU-10.`)
  }

  const onViewDetail = (dishId) => {
    navigate(`/client/dishes/${dishId}`)
  }

  const onToggleFavorite = async (dishId) => {
    const normalizedId = String(dishId)
    const currentlyFavorite = favoriteDishIds.has(normalizedId)
    const dish = dishes.find((d) => String(d.id) === normalizedId)
    setFavoriteConfirm({
      dishId: normalizedId,
      currentlyFavorite,
      title: currentlyFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos',
      message: currentlyFavorite
        ? `¿Seguro que quieres quitar "${dish?.name || 'este plato'}" de favoritos?`
        : `¿Seguro que quieres añadir "${dish?.name || 'este plato'}" a favoritos?`,
    })
  }

  const onConfirmToggleFavorite = async () => {
    if (!favoriteConfirm) return
    const { dishId, currentlyFavorite } = favoriteConfirm
    const nextIds = new Set(favoriteDishIds)
    if (currentlyFavorite) nextIds.delete(dishId)
    else nextIds.add(dishId)

    setFavoriteDishIds(nextIds)
    setDishes((prev) => prev.map((d) => (d.id === dishId ? { ...d, is_favorite: !currentlyFavorite } : d)))

    try {
      if (currentlyFavorite) {
        await removeFavorite('dish', dishId)
      } else {
        await addFavorite('dish', dishId)
      }
      setFavoriteConfirm(null)
    } catch {
      setFavoriteDishIds(favoriteDishIds)
      setDishes((prev) => prev.map((d) => (d.id === dishId ? { ...d, is_favorite: currentlyFavorite } : d)))
      window.alert('No se pudo actualizar favoritos.')
      setFavoriteConfirm(null)
    }
  }

  const heroImage = theme === 'dark' ? dashboardOscuro : dashboardClaro

  const currentFilters = () => ({
    q,
    featured,
    sort,
    min_price: minPrice,
    max_price: maxPrice,
    availability,
    cuisine_type: cuisineType,
    diet_type: dietType,
    location_available: clientLocation ? locationAvailable : 'false',
    max_distance_km: clientLocation && locationAvailable === 'true' ? maxDistanceKm : '',
  })

  return (
    <section className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border p-4 sm:p-6 lg:p-8 min-h-[180px] sm:min-h-[220px]" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 h-[190px] w-[42%] hidden lg:block pointer-events-none">
          <img
            src={heroImage}
            alt="Dashboard visual HomeChef"
            className="h-full w-full object-contain object-right"
          />
        </div>
        <div className="relative max-w-3xl space-y-2">
          <p className="text-lg" style={{ color: 'var(--muted)' }}>¡Buenas noches! 👋</p>
          <h1 className="text-5xl font-bold leading-tight">
            Descubre platos <span style={{ color: 'var(--brand-2)' }}>increíbles</span>
          </h1>
          <p className="text-2xl" style={{ color: 'var(--muted)' }}>
            Explora, filtra y encuentra tu próximo favorito.
          </p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {isTypingSearch ? 'Buscando...' : message}
          </p>
        </div>
      </header>

      <form
        onSubmit={onApplyFilters}
        className="border rounded-2xl p-4 lg:p-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 shadow-sm"
        style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
      >
        <div className="sm:col-span-2 lg:col-span-2 border rounded-xl px-3 py-2 flex items-center gap-2 min-w-0" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
          <span style={{ color: 'var(--muted)' }}>🔍</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar un plato delicioso..."
            className="w-full min-w-0 bg-transparent outline-none"
          />
        </div>
        <select value={featured} onChange={(e) => setFeatured(e.target.value)} className="filter-select border rounded-xl px-3 py-2" style={{ borderColor: 'var(--line)' }}>
          <option value="">Todos</option>
          <option value="true">Solo destacados</option>
          <option value="false">No destacados</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="filter-select border rounded-xl px-3 py-2" style={{ borderColor: 'var(--line)' }}>
          <option value="">Orden por relevancia</option>
          <option value="price_asc">Precio menor a mayor</option>
          <option value="price_desc">Precio mayor a menor</option>
          <option value="popular_desc">Popularidad</option>
          <option value="distance_asc" disabled={!clientLocation}>Mas cercanos</option>
          <option value="rating_desc">Calificación</option>
        </select>
        <input
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          type="number"
          min="0"
          placeholder="Precio min"
          className="border rounded-xl px-3 py-2"
          style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
        />
        <input
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          type="number"
          min="0"
          placeholder="Precio max"
          className="border rounded-xl px-3 py-2"
          style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
        />
        <select value={availability} onChange={(e) => setAvailability(e.target.value)} className="filter-select border rounded-xl px-3 py-2" style={{ borderColor: 'var(--line)' }}>
          <option value="">Disponibilidad: todos</option>
          <option value="available">Disponibles</option>
          <option value="unavailable">No disponibles</option>
        </select>
        <select value={cuisineType} onChange={(e) => setCuisineType(e.target.value)} className="filter-select border rounded-xl px-3 py-2" style={{ borderColor: 'var(--line)' }}>
          <option value="">Tipo cocina: todos</option>
          <option value="tradicional">Tradicional</option>
          <option value="fusion">Fusion</option>
        </select>
        <select value={dietType} onChange={(e) => setDietType(e.target.value)} className="filter-select border rounded-xl px-3 py-2" style={{ borderColor: 'var(--line)' }}>
          <option value="">Dieta: todos</option>
          <option value="regular">Regular</option>
          <option value="vegetariano">Vegetariano</option>
        </select>
        <select
          value={locationAvailable}
          onChange={(e) => {
            setLocationAvailable(e.target.value)
            if (e.target.value === 'false') setMaxDistanceKm('')
          }}
          className="filter-select border rounded-xl px-3 py-2"
          style={{ borderColor: 'var(--line)' }}
        >
          <option value="true">Ubicación disponible</option>
          <option value="false">Sin ubicacion</option>
        </select>
        <select
          value={maxDistanceKm}
          onChange={(e) => {
            setMaxDistanceKm(e.target.value)
            if (e.target.value) setLocationAvailable('true')
          }}
          disabled={locationAvailable === 'false'}
          className="filter-select border rounded-xl px-3 py-2 disabled:opacity-60"
          style={{ borderColor: 'var(--line)' }}
        >
          <option value="">Cercania: cualquier distancia</option>
          <option value="1">Hasta 1 km</option>
          <option value="3">Hasta 3 km</option>
          <option value="5">Hasta 5 km</option>
          <option value="10">Hasta 10 km</option>
          <option value="20">Hasta 20 km</option>
        </select>
        <button className="px-4 py-2 rounded-xl text-white font-semibold" style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}>
          Aplicar filtros
        </button>
        <button type="button" className="px-4 py-2 rounded-xl border font-medium" style={{ borderColor: 'var(--line)', color: 'var(--brand-2)' }} onClick={onClearFilters}>
          Limpiar
        </button>
      </form>

      {loading && <p className="text-slate-600">Cargando platos...</p>}
      {error && <p className="text-red-700">{error}</p>}

      {!loading && !error && dishes.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-slate-600">
          No hay platos para los filtros seleccionados.
        </div>
      )}

      {!loading && !error && dishes.length > 0 && (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-4xl font-bold">⭐ Platos destacados</h2>
              <p style={{ color: 'var(--muted)' }}>Seleccionados especialmente para ti</p>
            </div>
            <button className="text-lg font-semibold" style={{ color: 'var(--brand-2)' }}>Ver todos →</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dishes.map((dish) => (
              <PublicDishCard
                key={dish.id}
                dish={dish}
                onRestrictedAction={onRestrictedAction}
                onViewDetail={onViewDetail}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
          <div className="grid gap-3 lg:grid-cols-4">
            {[
              ['🕒', 'Siempre fresco', 'Ingredientes de la mejor calidad'],
              ['🛵', 'Entrega rápida', 'En tu puerta en el menor tiempo'],
              ['🛡️', 'Pago seguro', 'Tus pagos están 100% protegidos'],
              ['🎧', 'Soporte 24/7', 'Estamos aquí para ayudarte siempre'],
            ].map((item) => (
              <div key={item[1]} className="rounded-2xl border p-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
                <p className="text-2xl mb-1">{item[0]}</p>
                <p className="font-semibold">{item[1]}</p>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>{item[2]}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {favoriteConfirm && (
        <div className="fixed inset-0 z-[70] grid place-items-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <div className="w-full max-w-md rounded-2xl border p-5 space-y-4 shadow-xl" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
            <h3 className="text-xl font-bold">{favoriteConfirm.title}</h3>
            <p style={{ color: 'var(--muted)' }}>{favoriteConfirm.message}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg border"
                style={{ borderColor: 'var(--line)' }}
                onClick={() => setFavoriteConfirm(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-white font-semibold"
                style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
                onClick={onConfirmToggleFavorite}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function applyDistanceFilter(dishes, maxDistanceKm, sort) {
  const maxDistance = Number(maxDistanceKm)
  let items = [...dishes]

  if (Number.isFinite(maxDistance) && maxDistance > 0) {
    items = items.filter((dish) => {
      const distance = Number(dish.distance_km)
      return Number.isFinite(distance) && distance <= maxDistance
    })
  }

  if (sort === 'distance_asc') {
    items.sort((a, b) => {
      const distanceA = Number(a.distance_km)
      const distanceB = Number(b.distance_km)
      const safeDistanceA = Number.isFinite(distanceA) ? distanceA : Number.POSITIVE_INFINITY
      const safeDistanceB = Number.isFinite(distanceB) ? distanceB : Number.POSITIVE_INFINITY
      return safeDistanceA - safeDistanceB
    })
  }

  return items
}

function withLocationParams(filters, location) {
  return {
    ...filters,
    ...locationParams(location),
    location_available: location ? filters.location_available || 'true' : 'false',
  }
}

function locationParams(location) {
  if (!location) return {}
  return {
    latitude: location.latitude,
    longitude: location.longitude,
  }
}

function resolveClientLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        })
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
    )
  })
}
