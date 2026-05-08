import { useState } from 'react'
import type { CancelSubscriptionRequest } from '../../types/aiSubscription'

interface Props {
  open: boolean
  loading: boolean
  onClose: () => void
  onConfirm: (payload: CancelSubscriptionRequest) => void
}

export default function CancelSubscriptionDialog({ open, loading, onClose, onConfirm }: Props) {
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false)
  const [reason, setReason] = useState('El cocinero decidio cancelar el plan')
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
      <div className="w-full max-w-lg rounded-xl border p-5 space-y-4 shadow-xl" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
        <div>
          <h2 className="text-2xl font-bold">Cancelar suscripcion IA</h2>
          <p style={{ color: 'var(--muted)' }}>Confirma como deseas cancelar el acceso premium.</p>
        </div>
        <div className="space-y-2">
          <label className="flex gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--line)' }}>
            <input type="radio" checked={cancelAtPeriodEnd} onChange={() => setCancelAtPeriodEnd(true)} />
            <span>Cancelar al final del periodo</span>
          </label>
          <label className="flex gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--line)' }}>
            <input type="radio" checked={!cancelAtPeriodEnd} onChange={() => setCancelAtPeriodEnd(false)} />
            <span>Cancelar inmediatamente</span>
          </label>
        </div>
        <label className="block">
          <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>Razon</p>
          <textarea
            className="w-full min-h-24 rounded-lg border px-3 py-2"
            style={{ borderColor: 'var(--line)', backgroundColor: 'transparent' }}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className="px-4 py-2 rounded-lg border" style={{ borderColor: 'var(--line)' }} onClick={onClose} disabled={loading}>Volver</button>
          <button
            type="button"
            className="px-4 py-2 rounded-lg text-white font-semibold disabled:opacity-70"
            style={{ backgroundColor: '#dc2626' }}
            onClick={() => onConfirm({ cancel_at_period_end: cancelAtPeriodEnd, reason: reason.trim() || 'Cancelacion solicitada por el cocinero' })}
            disabled={loading}
          >
            {loading ? 'Cancelando...' : 'Confirmar cancelacion'}
          </button>
        </div>
      </div>
    </div>
  )
}
