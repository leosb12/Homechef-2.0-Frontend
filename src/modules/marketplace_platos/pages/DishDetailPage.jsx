import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { addCartItem } from '../../pedidos_checkout_pagos/services/cart_service'
import {
  addFavorite,
  createDishReview,
  fetchDishDetail,
  fetchFavorites,
  removeFavorite,
} from '../services/public_dashboard_service'

export default function DishDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)
  const [isChefFavorite, setIsChefFavorite] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [savingReview, setSavingReview] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [dishReviewSort, setDishReviewSort] = useState('recent')
  const [chefReviewSort, setChefReviewSort] = useState('recent')

  useEffect(() => {
    const load = async () => {
      try {
        const [data, favorites] = await Promise.all([
          fetchDishDetail(id),
          fetchFavorites().catch(() => ({ items: [] })),
        ])
        setDetail(data)
        setIsFavorite(
          (favorites.items || []).some(
            (item) => item.favorite_type === 'dish' && String(item.ref_id) === String(id),
          ),
        )
        setIsChefFavorite(
          (favorites.items || []).some(
            (item) => item.favorite_type === 'chef' && String(item.ref_id) === String(data.chef?.id),
          ),
        )
      } catch (e) {
        setError(e?.response?.data?.detail || 'Error al cargar detalle.')
      }
    }
    load()
  }, [id])

  const onAddToCart = async () => {
    setMessage('')
    try {
      const result = await addCartItem({ dishId: id, quantity: Number(quantity) })
      setMessage(result.message || 'Agregado al carrito.')
    } catch (e) {
      setMessage(e?.response?.data?.detail || 'No se pudo agregar al carrito.')
    }
  }

  const onToggleFavorite = async () => {
    setFavoriteLoading(true)
    setMessage('')
    try {
      if (isFavorite) {
        await removeFavorite('dish', id)
        setIsFavorite(false)
        setMessage('Plato removido de favoritos.')
      } else {
        await addFavorite('dish', id)
        setIsFavorite(true)
        setMessage('Plato agregado a favoritos.')
      }
    } catch (e) {
      setMessage(e?.response?.data?.detail || 'No se pudo actualizar favoritos.')
    } finally {
      setFavoriteLoading(false)
    }
  }

  const onToggleChefFavorite = async () => {
    if (!detail?.chef?.id) return
    setFavoriteLoading(true)
    setMessage('')
    try {
      if (isChefFavorite) {
        await removeFavorite('chef', detail.chef.id)
        setIsChefFavorite(false)
        setMessage('Cocinero removido de favoritos.')
      } else {
        await addFavorite('chef', detail.chef.id)
        setIsChefFavorite(true)
        setMessage('Cocinero agregado a favoritos.')
      }
    } catch (e) {
      setMessage(e?.response?.data?.detail || 'No se pudo actualizar favoritos.')
    } finally {
      setFavoriteLoading(false)
    }
  }

  const onSubmitReview = async (event) => {
    event.preventDefault()
    setMessage('')
    setSavingReview(true)
    try {
      await createDishReview(id, { rating: Number(reviewRating), comment: reviewComment })
      const fresh = await fetchDishDetail(id)
      setDetail(fresh)
      setReviewRating(5)
      setReviewComment('')
      setMessage('Reseña del plato publicada correctamente.')
    } catch (e) {
      setMessage(e?.response?.data?.detail || 'No se pudo registrar la reseña.')
    } finally {
      setSavingReview(false)
    }
  }

  if (error) return <div className="rounded-xl border p-4" style={{ borderColor: 'var(--line)' }}>{error}</div>
  if (!detail) return <p>Cargando detalle...</p>

  const chef = detail.chef || {}
  const chefAvailability = chef.availability || {}
  const chefSchedule = chefAvailability.summary || chef.schedule || detail.schedule || 'No configurado'
  const modalities = [
    chef.accept_pickup ? 'Retiro' : '',
    chef.accept_delivery ? 'Delivery' : '',
  ].filter(Boolean).join(' y ')
  const dishReviews = sortReviews(detail.dish_reviews?.reviews || [], dishReviewSort)
  const chefReviews = sortReviews((detail.chef_reputation || detail.reputation)?.reviews || [], chefReviewSort)

  return (
    <section className="space-y-4">
      <button onClick={() => navigate('/client/explore')} className="text-sm" style={{ color: 'var(--brand-2)' }}>
        Volver a explorar
      </button>

      <div className="grid lg:grid-cols-2 gap-4">
        {detail.image_url ? (
          <img
            src={detail.image_url}
            alt={detail.name}
            className="w-full h-64 sm:h-80 object-cover rounded-2xl border"
            style={{ borderColor: 'var(--line)' }}
          />
        ) : (
          <div
            className="w-full h-64 sm:h-80 rounded-2xl border grid place-items-center"
            style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
          >
            Sin foto
          </div>
        )}

        <div className="rounded-2xl border p-4 sm:p-5 space-y-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h1 className="text-4xl font-bold break-words">{detail.name}</h1>
            <button
              type="button"
              onClick={onToggleFavorite}
              disabled={favoriteLoading}
              className="px-3 py-2 rounded-lg border text-sm disabled:opacity-60"
              style={{
                borderColor: 'var(--line)',
                color: isFavorite ? '#f59e0b' : 'var(--text)',
                backgroundColor: isFavorite ? 'rgba(245,158,11,.12)' : 'transparent',
              }}
            >
              {isFavorite ? 'Favorito' : 'Agregar favorito'}
            </button>
          </div>

          <p style={{ color: 'var(--muted)' }}>{detail.description}</p>
          <p className="text-xl font-semibold" style={{ color: 'var(--brand-2)' }}>Bs {Number(detail.approx_price).toFixed(2)}</p>
          <p>Ingredientes: {detail.ingredients?.length ? detail.ingredients.join(', ') : 'No registrados'}</p>
          <p>Etiquetas: {detail.tags?.length ? detail.tags.join(', ') : 'No registradas'}</p>
          <p>Alérgenos: {detail.allergens?.length ? detail.allergens.join(', ') : 'No reportados'}</p>
          <p>Porciones disponibles: {detail.available_portions}</p>
          <p>Horario: {detail.schedule || 'No registrado'}</p>
          <p>Delivery: {detail.delivery_available ? 'Disponible' : 'No disponible'}</p>
          <p>Reseñas del plato: {Number(detail.dish_reviews?.rating_avg || 0).toFixed(1)} ({detail.dish_reviews?.reviews_count || 0} reseñas)</p>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="number"
              min="1"
              max={detail.available_portions || 1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full sm:w-24"
              style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
            />
            <button onClick={onAddToCart} className="px-4 py-2 rounded-lg text-white" style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}>
              Agregar al carrito
            </button>
          </div>
          {message && <p className="text-sm">{message}</p>}
        </div>
      </div>

      <section className="rounded-2xl border p-4 space-y-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h2 className="text-2xl font-bold">Cocinero responsable</h2>
          <button
            type="button"
            onClick={onToggleChefFavorite}
            disabled={favoriteLoading}
            className="px-3 py-2 rounded-lg border text-sm disabled:opacity-60"
            style={{
              borderColor: 'var(--line)',
              color: isChefFavorite ? '#f59e0b' : 'var(--text)',
              backgroundColor: isChefFavorite ? 'rgba(245,158,11,.12)' : 'transparent',
            }}
          >
            {isChefFavorite ? 'Cocinero favorito' : 'Agregar cocinero como Favorito'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/client/chefs/${chef.id}`)}
            className="px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: 'var(--line)', color: 'var(--brand-2)' }}
          >
            Ver perfil
          </button>
        </div>
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="h-28 w-28 rounded-xl border overflow-hidden shrink-0" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
            {chef.profile_image_url ? (
              <img src={chef.profile_image_url} alt={chef.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full grid place-items-center text-sm" style={{ color: 'var(--muted)' }}>Sin foto</div>
            )}
          </div>
          <div className="space-y-2 flex-1">
            <div>
              <p className="text-xl font-semibold">{chef.name}</p>
              {chef.full_name && chef.full_name !== chef.name ? (
                <p className="text-sm" style={{ color: 'var(--muted)' }}>{chef.full_name}</p>
              ) : null}
            </div>
            {chef.public_description ? <p style={{ color: 'var(--muted)' }}>{chef.public_description}</p> : null}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <Info label="Especialidades" value={chef.specialties?.length ? chef.specialties.join(', ') : 'No registradas'} />
              <Info label="Horario de atención" value={chefSchedule} />
              <Info label="Ubicación" value={chef.location?.address || 'Dirección no publicada'} />
              <Info label="Modalidades" value={modalities || 'No disponibles'} />
              <Info label="Notas de retiro" value={chefAvailability.pickup_schedule || chef.pickup_schedule || 'No registrado'} />
              <Info label="Estado" value={chefAvailability.status_label || (chef.is_available ? 'Disponible' : 'No disponible temporalmente')} />
            </div>
          </div>
        </div>
      </section>

      <div className="rounded-2xl border p-4 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold">Reseñas del plato</h2>
          <select value={dishReviewSort} onChange={(event) => setDishReviewSort(event.target.value)} className="border rounded-xl px-3 py-2" style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}>
            <option value="recent">Más recientes</option>
            <option value="rating_desc">Mejor calificación</option>
            <option value="rating_asc">Menor calificación</option>
          </select>
        </div>

        <form onSubmit={onSubmitReview} className="rounded-xl border p-3 grid gap-3 md:grid-cols-[160px_minmax(0,1fr)_auto]" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
          <select value={reviewRating} onChange={(event) => setReviewRating(event.target.value)} className="border rounded-xl px-3 py-2" style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}>
            {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} estrellas</option>)}
          </select>
          <input
            value={reviewComment}
            onChange={(event) => setReviewComment(event.target.value)}
            placeholder="Escribe una reseña visible sobre este plato"
            className="border rounded-xl px-3 py-2"
            style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
            required
          />
          <button
            type="submit"
            disabled={savingReview}
            className="px-4 py-2 rounded-xl text-white font-semibold disabled:opacity-60"
            style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
          >
            {savingReview ? 'Publicando...' : 'Publicar'}
          </button>
        </form>

        {dishReviews.length ? (
          <div className="space-y-2">
            {dishReviews.map((review, index) => (
              <div key={review.id || `${review.author}-${index}`} className="border rounded-lg p-3" style={{ borderColor: 'var(--line)' }}>
                <p className="font-semibold">{review.author} - {review.rating} / 5</p>
                <p style={{ color: 'var(--muted)' }}>{review.comment}</p>
              </div>
            ))}
          </div>
        ) : <p style={{ color: 'var(--muted)' }}>Aún sin reseñas del plato.</p>}
      </div>

      <div className="rounded-2xl border p-4 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Reseñas del cocinero</h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Reputación general: {Number((detail.chef_reputation || detail.reputation)?.rating_avg || 0).toFixed(1)} / 5
            </p>
          </div>
          <select value={chefReviewSort} onChange={(event) => setChefReviewSort(event.target.value)} className="border rounded-xl px-3 py-2" style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}>
            <option value="recent">Más recientes</option>
            <option value="rating_desc">Mejor calificación</option>
            <option value="rating_asc">Menor calificación</option>
          </select>
        </div>
        {chefReviews.length ? (
          <div className="space-y-2">
            {chefReviews.map((review, index) => (
              <div key={review.id || `${review.author}-${index}`} className="border rounded-lg p-3" style={{ borderColor: 'var(--line)' }}>
                <p className="font-semibold">{review.author || 'Cliente'} - {review.rating} / 5</p>
                <p style={{ color: 'var(--muted)' }}>{review.comment}</p>
              </div>
            ))}
          </div>
        ) : <p style={{ color: 'var(--muted)' }}>Aún sin reseñas del cocinero.</p>}
      </div>
    </section>
  )
}

function sortReviews(items, sort) {
  return [...items].sort((a, b) => {
    if (sort === 'rating_desc') return Number(b.rating || 0) - Number(a.rating || 0)
    if (sort === 'rating_asc') return Number(a.rating || 0) - Number(b.rating || 0)
    return new Date(b.created_at || 0) - new Date(a.created_at || 0)
  })
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: 'var(--line)' }}>
      <p className="text-xs uppercase" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}
