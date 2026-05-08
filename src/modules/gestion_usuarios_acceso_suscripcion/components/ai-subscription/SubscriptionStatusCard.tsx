import type { AIAccessStatus, AISubscriptionStatus, ChefAISubscription } from '../../types/aiSubscription'
import { formatDate, labelize, statusColor } from './formatters'

interface Props {
  status: AISubscriptionStatus | null
  subscription: ChefAISubscription | null
  access: AIAccessStatus | null
  onRenew: () => void
  onCancel: () => void
  renewing: boolean
}

export default function SubscriptionStatusCard({ status, subscription, access, onRenew, onCancel, renewing }: Props) {
  const currentStatus = subscription?.status || status?.status || 'SIN_SUSCRIPCION'
  const planName = subscription?.plan?.name || subscription?.plan_name || status?.plan?.name || 'Sin plan activo'
  const startDate = subscription?.start_date || subscription?.current_period_start
  const endDate = subscription?.end_date || subscription?.current_period_end
  const canUse = Boolean(access?.can_use_ai || status?.can_use_ai)
  const normalizedStatus = String(currentStatus || '').toUpperCase()
  const renewLabel = normalizedStatus === 'PENDING_PAYMENT' ? 'Reintentar pago' : 'Renovar'

  return (
    <article className="rounded-xl border p-4 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Estado actual</p>
          <h2 className="text-2xl font-bold">{planName}</h2>
          <p className="font-semibold" style={{ color: statusColor(currentStatus) }}>{labelize(currentStatus)}</p>
        </div>
        <span className="rounded-lg border px-3 py-2 text-sm font-semibold" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
          IA {canUse ? 'habilitada' : 'bloqueada'}
        </span>
      </div>

      <dl className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Info label="Inicio" value={formatDate(startDate)} />
        <Info label="Fin" value={formatDate(endDate)} />
        <Info label="Renovacion automatica" value={subscription?.auto_renew ? 'Activa' : 'Inactiva'} />
        <Info label="Acceso IA" value={canUse ? 'Disponible' : access?.reason || status?.reason || 'No disponible'} />
      </dl>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="px-4 py-2 rounded-lg border font-semibold"
          style={{ borderColor: 'var(--line)' }}
          onClick={onRenew}
          disabled={renewing}
        >
          {renewing ? 'Procesando...' : renewLabel}
        </button>
        {subscription ? (
          <button
            type="button"
            className="px-4 py-2 rounded-lg border font-semibold"
            style={{ borderColor: 'rgba(239,68,68,0.55)', color: '#ef4444' }}
            onClick={onCancel}
          >
            Cancelar suscripcion
          </button>
        ) : null}
      </div>
    </article>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
      <dt className="text-xs" style={{ color: 'var(--muted)' }}>{label}</dt>
      <dd className="font-semibold break-words">{value}</dd>
    </div>
  )
}
