import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { addFavorite, createChefReview, fetchChefPublicProfile, fetchFavorites, removeFavorite } from '../services/public_dashboard_service'
import { useConnectivity } from '../../../shared/hooks/useConnectivity'

export default function ChefPublicProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isOnline } = useConnectivity()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)
  const [sort, setSort] = useState('recent')
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [savingReview, setSavingReview] = useState(false)
  const [reviewMessage, setReviewMessage] = useState({ text: '', type: '' })

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [data, favorites] = await Promise.all([
        fetchChefPublicProfile(id),
        fetchFavorites().catch(() => ({ items: [] })),
      ])
      setProfile(data)
      setIsFavorite((favorites.items || []).some((item) => item.favorite_type === 'chef' && String(item.ref_id) === String(id)))
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        navigate('/login')
        return
      }
      if (!isOnline) {
        setError('No hay datos offline disponibles para esta pantalla. Conéctate y sincroniza cuando tengas internet.')
      } else {
        setError(err?.response?.data?.detail || 'No se pudo cargar el perfil del cocinero.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  const reviews = useMemo(() => {
    const items = [...(profile?.reputation?.reviews || [])]
    if (sort === 'rating_desc') items.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))
    else if (sort === 'rating_asc') items.sort((a, b) => Number(a.rating || 0) - Number(b.rating || 0))
    else items.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    return items
  }, [profile, sort])

  const onToggleFavorite = async () => {
    setMessage('')
    try {
      if (isFavorite) {
        await removeFavorite('chef', id)
        setIsFavorite(false)
        setMessage('Cocinero removido de favoritos.')
      } else {
        await addFavorite('chef', id)
        setIsFavorite(true)
        setMessage('Cocinero agregado a favoritos.')
      }
    } catch (err) {
      setMessage(err?.response?.data?.detail || 'No se pudo actualizar favoritos.')
    }
  }

  const onSubmitReview = async (event) => {
    event.preventDefault()
    setSavingReview(true)
    setReviewMessage({ text: '', type: '' })
    try {
      await createChefReview(id, { rating: Number(rating), comment })
      setComment('')
      setRating(5)
      setReviewMessage({ text: 'Reseña del cocinero publicada correctamente.', type: 'success' })
      await load()
    } catch (err) {
      setReviewMessage({ text: err?.response?.data?.detail || 'No se pudo registrar la reseña.', type: 'error' })
    } finally {
      setSavingReview(false)
    }
  }

  if (loading) return <p style={{ color: 'var(--muted)' }}>Cargando cocinero...</p>
  if (error) return <div className="rounded-xl border p-4" style={{ borderColor: 'var(--line)' }}>{error}</div>
  if (!profile) return null

  const reputation = profile.reputation || {}
  const indicators = reputation.indicators || {}
  const availability = profile.availability || {}
  const availabilitySummary = availability.summary || profile.schedule || 'No configurado'
  const modalities = [
    profile.accept_pickup ? 'Retiro' : '',
    profile.accept_delivery ? 'Delivery' : '',
  ].filter(Boolean).join(' y ')

  return (
    <section className="space-y-5">
      <button onClick={() => navigate('/client/explore')} className="text-sm" style={{ color: 'var(--brand-2)' }}>
        Volver a explorar
      </button>

      <header className="rounded-2xl border p-4 sm:p-5 flex flex-col gap-4 md:flex-row" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
        <div className="h-36 w-36 rounded-2xl border overflow-hidden shrink-0" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
          {profile.profile_image_url ? (
            <img src={profile.profile_image_url} alt={profile.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full grid place-items-center" style={{ color: 'var(--muted)' }}>Sin foto</div>
          )}
        </div>
        <div className="space-y-3 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-5xl font-bold break-words">{profile.name}</h1>
              {profile.full_name && profile.full_name !== profile.name ? <p style={{ color: 'var(--muted)' }}>{profile.full_name}</p> : null}
            </div>
            <button type="button" onClick={onToggleFavorite} className="px-4 py-2 rounded-xl border font-semibold self-start sm:self-auto" style={{ borderColor: 'var(--line)', color: isFavorite ? '#f59e0b' : 'var(--text)' }}>
              {isFavorite ? 'Favorito' : 'Guardar cocinero'}
            </button>
          </div>
          <p style={{ color: 'var(--muted)' }}>{profile.public_description || 'Cocinero de HomeChef con platos publicados para el marketplace.'}</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Calificación" value={`${Number(reputation.rating_avg || 0).toFixed(1)} / 5`} />
            <Metric label="Reseñas" value={reputation.reviews_count || 0} />
            <Metric label="Confianza" value={reputation.trust_level || 'Sin reputación'} />
            <Metric label="Modalidad" value={modalities || 'No disponible'} />
          </div>
          <div className="rounded-xl border p-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
            <p className="text-xs uppercase" style={{ color: 'var(--muted)' }}>Horario de atención</p>
            <p className="font-semibold">{availabilitySummary}</p>
          </div>
        </div>
      </header>

      {message ? <p className="rounded-xl border px-3 py-2 inline-block" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>{message}</p> : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <h2 className="text-2xl font-bold">Datos publicos</h2>
          <Info label="Especialidades" value={profile.specialties?.length ? profile.specialties.join(', ') : 'No registradas'} />
          <Info label="Horario de atención" value={availabilitySummary} />
          <Info label="Notas de retiro" value={availability.pickup_schedule || profile.pickup_schedule || 'No registrado'} />
          <Info label="Ubicación" value={profile.location?.address || 'Dirección no publicada'} />
          <Info label="Estado" value={availability.status_label || (profile.is_available ? 'Disponible' : 'No disponible temporalmente')} />
        </div>

        <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <h2 className="text-2xl font-bold">Indicadores</h2>
          <Info label="Consistencia" value={indicators.consistency || 'Sin datos'} />
          <Info label="Tiempo de atención" value={indicators.response_time || 'Sin datos'} />
          <Info label="Cancelaciones" value={indicators.cancellation_rate || 'Sin datos'} />
        </div>

        <form onSubmit={onSubmitReview} className="rounded-2xl border p-4 space-y-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <h2 className="text-2xl font-bold">Dejar reseña del cocinero</h2>
          <select value={rating} onChange={(event) => setRating(event.target.value)} className="border rounded-xl px-3 py-2 w-full" style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}>
            {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} estrellas</option>)}
          </select>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            className="border rounded-xl px-3 py-2 w-full min-h-[110px]"
            style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
            placeholder="Cuenta como fue tu experiencia"
            required
          />
          <button disabled={savingReview} className="px-4 py-2 rounded-xl text-white font-semibold disabled:opacity-60" style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}>
            {savingReview ? 'Publicando...' : 'Publicar reseña'}
          </button>
          {reviewMessage.text && (
            <div className={`mt-2 p-3 text-sm rounded-xl border ${reviewMessage.type === 'error' ? 'text-red-600 bg-red-50 border-red-200' : 'text-green-600 bg-green-50 border-green-200'}`}>
              {reviewMessage.text}
            </div>
          )}
        </form>
      </section>

      <section className="rounded-2xl border p-4 space-y-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold">Reseñas del cocinero</h2>
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="border rounded-xl px-3 py-2" style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}>
            <option value="recent">Más recientes</option>
            <option value="rating_desc">Mejor calificación</option>
            <option value="rating_asc">Menor calificación</option>
          </select>
        </div>
        {reviews.length ? (
          <div className="space-y-2">
            {reviews.map((review) => (
              <article key={review.id || `${review.author}-${review.created_at}`} className="rounded-xl border p-3" style={{ borderColor: 'var(--line)' }}>
                <p className="font-semibold">{review.author || 'Cliente'} - {review.rating} / 5</p>
                <p style={{ color: 'var(--muted)' }}>{review.comment}</p>
              </article>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--muted)' }}>Este cocinero aún no tiene reseñas visibles.</p>
        )}
      </section>

      <section className="rounded-2xl border p-4 space-y-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
        <h2 className="text-2xl font-bold">Platos publicados</h2>
        {profile.dishes?.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {profile.dishes.map((dish) => (
              <button key={dish.id} type="button" onClick={() => navigate(`/client/dishes/${dish.id}`)} className="rounded-xl border text-left overflow-hidden" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
                {dish.image_url ? <img src={dish.image_url} alt={dish.name} className="h-32 w-full object-cover" /> : <div className="h-32 grid place-items-center" style={{ color: 'var(--muted)', backgroundColor: 'var(--panel-soft)' }}>Sin foto</div>}
                <div className="p-3">
                  <p className="font-semibold">{dish.name}</p>
                  <p style={{ color: 'var(--brand-2)' }}>Bs {Number(dish.approx_price || 0).toFixed(2)}</p>
                </div>
              </button>
            ))}
          </div>
        ) : <p style={{ color: 'var(--muted)' }}>No tiene platos publicados en este momento.</p>}
      </section>
    </section>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
      <p className="text-xs uppercase" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}
