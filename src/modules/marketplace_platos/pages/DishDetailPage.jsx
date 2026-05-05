import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { addDishToCart, fetchDishDetail } from '../services/public_dashboard_service'

export default function DishDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchDishDetail(id)
        setDetail(data)
      } catch (e) {
        setError(e?.response?.data?.detail || 'Error al cargar detalle.')
      }
    }
    load()
  }, [id])

  const onAddToCart = async () => {
    setMessage('')
    try {
      const result = await addDishToCart(id, Number(quantity))
      setMessage(result.message || 'Agregado al carrito.')
    } catch (e) {
      setMessage(e?.response?.data?.detail || 'No se pudo agregar al carrito.')
    }
  }

  if (error) return <div className="rounded-xl border p-4" style={{ borderColor: 'var(--line)' }}>{error}</div>
  if (!detail) return <p>Cargando detalle...</p>

  return (
    <section className="space-y-4">
      <button onClick={() => navigate('/client/explore')} className="text-sm" style={{ color: 'var(--brand-2)' }}>← Volver a explorar</button>
      <div className="grid lg:grid-cols-2 gap-4">
        <img src={detail.image_url} alt={detail.name} className="w-full h-80 object-cover rounded-2xl border" style={{ borderColor: 'var(--line)' }} />
        <div className="rounded-2xl border p-5 space-y-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <h1 className="text-4xl font-bold">{detail.name}</h1>
          <p style={{ color: 'var(--muted)' }}>{detail.description}</p>
          <p className="text-xl font-semibold" style={{ color: 'var(--brand-2)' }}>Bs {Number(detail.approx_price).toFixed(2)}</p>
          <p>Ingredientes: {detail.ingredients?.join(', ')}</p>
          <p>Etiquetas: {detail.tags?.join(', ')}</p>
          <p>Alergenos: {detail.allergens?.length ? detail.allergens.join(', ') : 'No reportados'}</p>
          <p>Porciones disponibles: {detail.available_portions}</p>
          <p>Horario: {detail.schedule}</p>
          <p>Cocinero: {detail.chef?.name}</p>
          <p>Reputacion: {detail.reputation?.rating_avg} ({detail.reputation?.reviews_count} reseñas)</p>
          <div className="flex items-center gap-2">
            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="border rounded-lg px-3 py-2 w-24" style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }} />
            <button onClick={onAddToCart} className="px-4 py-2 rounded-lg text-white" style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}>
              Agregar al carrito
            </button>
          </div>
          {message && <p className="text-sm">{message}</p>}
        </div>
      </div>
      <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
        <h2 className="text-2xl font-bold mb-2">Reseñas</h2>
        {detail.reputation?.reviews?.length ? (
          <div className="space-y-2">
            {detail.reputation.reviews.map((r, i) => (
              <div key={`${r.author}-${i}`} className="border rounded-lg p-3" style={{ borderColor: 'var(--line)' }}>
                <p className="font-semibold">{r.author} · {r.rating}⭐</p>
                <p style={{ color: 'var(--muted)' }}>{r.comment}</p>
              </div>
            ))}
          </div>
        ) : <p style={{ color: 'var(--muted)' }}>Aún sin reseñas disponibles.</p>}
      </div>
    </section>
  )
}
