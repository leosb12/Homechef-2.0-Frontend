import { createPortal } from 'react-dom'
import { useEffect } from 'react'

export default function RepeatOrderSummaryModal({ open, summary, onClose, onGoToCart }) {
  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  if (!open || !summary) return null

  const modal = (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.58)' }}
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-2xl max-h-[85vh] flex-col overflow-hidden rounded-2xl border shadow-xl"
        style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b p-5" style={{ borderColor: 'var(--line)' }}>
          <div>
            <h2 className="text-xl font-semibold">Repetir pedido</h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{summary.message}</p>
          </div>
          <button type="button" onClick={onClose} className="h-10 w-10 rounded-lg border" style={{ borderColor: 'var(--line)' }}>
            x
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryCard label="Solicitados" value={summary.summary?.requested_items || 0} />
            <SummaryCard label="Agregados" value={summary.summary?.added_items || 0} tone="green" />
            <SummaryCard label="Omitidos" value={summary.summary?.skipped_items || 0} tone="orange" />
          </div>

          <section className="space-y-3">
            <h3 className="font-semibold">Platos agregados</h3>
            {(summary.added_items || []).length ? (
              <div className="space-y-2">
                {summary.added_items.map((item) => (
                  <div key={item.cart_item_id || item.order_item_id} className="rounded-xl border p-3" style={{ borderColor: 'var(--line)' }}>
                    <p className="font-medium">{item.dish_name}</p>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>
                      Se solicitaron {item.requested_quantity} y el carrito queda con {item.cart_quantity}.
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyNote text="No se agrego ningun plato al carrito." />
            )}
          </section>

          <section className="space-y-3">
            <h3 className="font-semibold">Platos omitidos</h3>
            {(summary.skipped_items || []).length ? (
              <div className="space-y-2">
                {summary.skipped_items.map((item) => (
                  <div key={item.order_item_id} className="rounded-xl border p-3" style={{ borderColor: 'var(--line)' }}>
                    <p className="font-medium">{item.dish_name}</p>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>{item.reason}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyNote text="Todos los platos del pedido se pudieron repetir." />
            )}
          </section>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t p-5" style={{ borderColor: 'var(--line)' }}>
          <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2.5 font-medium" style={{ borderColor: 'var(--line)' }}>
            Cerrar
          </button>
          {summary.cart?.id ? (
            <button
              type="button"
              onClick={onGoToCart}
              className="rounded-xl px-4 py-2.5 font-semibold text-white"
              style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
            >
              Ir al carrito
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return modal
  return createPortal(modal, document.body)
}

function SummaryCard({ label, value, tone = 'purple' }) {
  const palette = {
    purple: { background: 'rgba(124,58,237,.08)', color: '#6d28d9' },
    green: { background: 'rgba(34,197,94,.08)', color: '#15803d' },
    orange: { background: 'rgba(249,115,22,.08)', color: '#c2410c' },
  }[tone]

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--line)', backgroundColor: palette.background }}>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="text-3xl font-bold" style={{ color: palette.color }}>{value}</p>
    </div>
  )
}

function EmptyNote({ text }) {
  return (
    <div className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>
      {text}
    </div>
  )
}
