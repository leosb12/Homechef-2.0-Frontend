export default function PublicDishCard({ dish, onRestrictedAction, onViewDetail, onToggleFavorite }) {
  return (
    <article className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
      <div className="relative">
        {dish.image_url ? (
          <img
            src={dish.image_url}
            alt={dish.name}
            className="h-40 w-full object-cover"
          />
        ) : (
          <div className="h-40 w-full grid place-items-center text-sm" style={{ backgroundColor: 'var(--panel-soft)', color: 'var(--muted)' }}>
            Sin foto
          </div>
        )}
        <button
          type="button"
          onClick={() => (onToggleFavorite ? onToggleFavorite(dish.id) : onRestrictedAction('guardar en favoritos'))}
          aria-label={dish.is_favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
          className="absolute top-3 right-3 h-9 w-9 rounded-full border grid place-items-center"
          style={{
            borderColor: 'var(--line)',
            backgroundColor: 'rgba(255,255,255,0.9)',
            color: dish.is_favorite ? '#f59e0b' : '#64748b',
          }}
        >
          <StarIcon filled={Boolean(dish.is_favorite)} />
        </button>
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <button className="min-w-0 font-semibold text-3xl leading-tight text-left break-words" onClick={() => onViewDetail?.(dish.id)}>{dish.name}</button>
          {dish.is_featured && (
            <span className="shrink-0 text-xs px-2 py-1 rounded-md" style={{ backgroundColor: '#fde68a', color: '#1f2937' }}>
              Destacado
            </span>
          )}
        </div>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>{dish.chef_name}</p>
        {typeof dish.distance_km === 'number' && (
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Distancia aprox: {Number(dish.distance_km).toFixed(1)} km · Rating: {Number(dish.rating || 0).toFixed(1)}
          </p>
        )}
        {dish.is_available === false && (
          <p className="text-xs font-medium text-amber-700">No disponible temporalmente</p>
        )}
        {typeof dish.available_portions === 'number' && (
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Porciones disponibles: {dish.available_portions}
          </p>
        )}
        <p className="text-xl font-semibold" style={{ color: 'var(--brand-2)' }}>
          Precio aprox: Bs {Number(dish.approx_price).toFixed(2)}
        </p>
        <div className="flex gap-2 pt-2">
          <button
            className="px-3 py-2 text-sm rounded-lg text-white"
            style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
            onClick={() => onViewDetail?.(dish.id)}
          >
            Ver detalle
          </button>
        </div>
      </div>
    </article>
  )
}

function StarIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 2.7 5.47 6.03.88-4.36 4.25 1.03 6.01L12 16.77 6.6 19.6l1.03-6.01L3.27 9.35l6.03-.88L12 3z" />
    </svg>
  )
}
