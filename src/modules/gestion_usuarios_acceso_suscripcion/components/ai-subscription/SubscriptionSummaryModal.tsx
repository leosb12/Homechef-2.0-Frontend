import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { AISubscriptionPlan, PaymentProvider, SubscriptionOperation, SubscriptionSummary } from '../../types/aiSubscription'
import { formatDate, formatMoney } from './formatters'
import PaymentProviderSelector, { paymentProviderButtonLabel } from './PaymentProviderSelector'

interface Props {
  loading: boolean
  actionLoading: boolean
  operation: SubscriptionOperation
  plan: AISubscriptionPlan | null
  summary: SubscriptionSummary | null
  onClose: () => void
  onConfirm: (provider: PaymentProvider) => void
}

export default function SubscriptionSummaryModal({ loading, actionLoading, operation, plan, summary, onClose, onConfirm }: Props) {
  const [provider, setProvider] = useState<PaymentProvider>('STRIPE_SANDBOX')

  useEffect(() => {
    if (!plan || typeof document === 'undefined') return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [plan])

  if (!plan) return null

  const effectivePlan = summary?.plan || plan
  const title = operation === 'change_plan' ? 'Resumen de cambio de plan' : operation === 'renew' ? 'Resumen de renovacion' : 'Resumen de contratacion'
  const conditions = Array.isArray(summary?.conditions) ? summary?.conditions : summary?.conditions ? [summary.conditions] : []
  const benefits = Array.isArray(summary?.benefits) ? summary.benefits : Array.isArray(effectivePlan.benefits) ? effectivePlan.benefits : []
  const validity = formatValidity(summary?.validity || effectivePlan.duration || effectivePlan.duration_days)

  const modal = (
    <div className="fixed inset-0 z-[1000] flex h-[100dvh] items-start justify-center overflow-hidden p-3 sm:items-center sm:p-4" style={{ backgroundColor: 'rgba(0,0,0,0.62)' }}>
      <div
        className="flex w-full max-w-[min(760px,calc(100vw-1.5rem))] max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-xl border shadow-xl sm:max-w-[min(760px,calc(100vw-2rem))] sm:max-h-[calc(100dvh-2rem)]"
        style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
      >
        <div className="flex flex-none items-start justify-between gap-3 border-b p-4 sm:p-5" style={{ borderColor: 'var(--line)' }}>
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold leading-tight">{title}</h2>
            <p className="break-words" style={{ color: 'var(--muted)' }}>{effectivePlan.name}</p>
          </div>
          <button type="button" className="h-10 w-10 flex-none rounded-lg border" style={{ borderColor: 'var(--line)' }} onClick={onClose}>x</button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5" style={{ scrollbarGutter: 'stable' }}>
          {loading ? (
            <p>Cargando resumen...</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Info label="Precio" value={formatMoney(summary?.price ?? effectivePlan.price, summary?.currency || effectivePlan.currency || 'BOB')} />
                <Info label="Vigencia" value={validity} />
                <Info label="Inicio" value={formatDate(summary?.start_date)} />
                <Info label="Fin" value={formatDate(summary?.end_date)} />
              </div>

              <div className="rounded-lg border p-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
                <p className="font-semibold mb-2">Limites y beneficios</p>
                <div className="grid sm:grid-cols-2 gap-2 text-sm break-words">
                  <span>Consultas IA: {String(effectivePlan.ai_query_limit ?? 'Ilimitado')}</span>
                  <span>Generaciones: {String(effectivePlan.ai_generation_limit ?? 'Ilimitado')}</span>
                  <span>Vision artificial: {effectivePlan.vision_enabled ? 'Incluida' : 'No incluida'}</span>
                  <span>Soporte de precios: {effectivePlan.pricing_support_enabled ? 'Incluido' : 'No incluido'}</span>
                </div>
                {benefits.length ? <ul className="mt-3 text-sm space-y-1 break-words">{benefits.map((item, index) => <li key={`${toDisplayText(item)}-${index}`}>- {toDisplayText(item)}</li>)}</ul> : null}
              </div>

              {conditions.length ? (
                <div className="rounded-lg border p-3" style={{ borderColor: 'var(--line)' }}>
                  <p className="font-semibold mb-2">Condiciones</p>
                  <ul className="text-sm space-y-1 break-words">{conditions.map((item, index) => <li key={`${toDisplayText(item)}-${index}`}>- {toDisplayText(item)}</li>)}</ul>
                </div>
              ) : null}

              <PaymentProviderSelector value={provider} onChange={setProvider} />
            </div>
          )}
        </div>

        <div className="flex flex-none flex-col-reverse gap-2 border-t p-4 sm:flex-row sm:justify-end sm:p-5" style={{ borderColor: 'var(--line)' }}>
          <button type="button" className="h-11 rounded-lg border px-4 sm:h-auto sm:py-2" style={{ borderColor: 'var(--line)' }} onClick={onClose} disabled={actionLoading}>
            Cancelar
          </button>
          <button
            type="button"
            className="h-11 rounded-lg px-4 text-white font-semibold disabled:opacity-70 sm:h-auto sm:py-2"
            style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
            onClick={() => onConfirm(provider)}
            disabled={loading || actionLoading}
          >
            {actionLoading ? 'Creando checkout...' : paymentProviderButtonLabel(provider)}
          </button>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return modal
  return createPortal(modal, document.body)
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border p-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
      <p className="text-xs" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="break-words font-semibold">{value}</p>
    </div>
  )
}

function formatValidity(value: unknown) {
  if (typeof value === 'number') return `${value} dias`
  if (typeof value === 'string' && value.trim()) return value
  if (value && typeof value === 'object') {
    const validity = value as { duration_days?: unknown; auto_renew?: unknown; cancel_policy?: unknown }
    const parts = [
      typeof validity.duration_days === 'number' ? `${validity.duration_days} dias` : null,
      typeof validity.auto_renew === 'boolean' ? `Renovacion ${validity.auto_renew ? 'automatica' : 'manual'}` : null,
      typeof validity.cancel_policy === 'string' ? validity.cancel_policy : null,
    ]
    return parts.filter(Boolean).join(' | ') || '30 dias'
  }
  return '30 dias'
}

function toDisplayText(value: unknown) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    return Object.entries(record)
      .map(([key, item]) => `${humanizeKey(key)}: ${toDisplayText(item)}`)
      .join(', ')
  }
  return String(value)
}

function humanizeKey(value: string) {
  return value.replace(/_/g, ' ')
}
