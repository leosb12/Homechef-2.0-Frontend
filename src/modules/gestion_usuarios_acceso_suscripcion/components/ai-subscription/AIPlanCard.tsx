import type { AISubscriptionPlan } from '../../types/aiSubscription'
import { formatMoney } from './formatters'
import { aiFeatureItems } from './aiPlanFeatures'

interface Props {
  plan: AISubscriptionPlan
  selected?: boolean
  onSelect: (plan: AISubscriptionPlan) => void
}

export default function AIPlanCard({ plan, selected = false, onSelect }: Props) {
  const available = plan.is_available ?? plan.available ?? true
  const benefits = Array.isArray(plan.benefits) ? plan.benefits : []

  return (
    <article
      className="rounded-xl border p-4 flex flex-col gap-4"
      style={{
        borderColor: selected ? 'var(--brand)' : 'var(--line)',
        backgroundColor: available ? 'var(--panel)' : 'var(--panel-soft)',
        opacity: available ? 1 : 0.68,
      }}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-xl font-bold">{plan.name}</h3>
          {!available ? <span className="text-xs font-semibold text-red-500">No disponible</span> : null}
        </div>
        <p className="text-sm min-h-10" style={{ color: 'var(--muted)' }}>{plan.description || 'Plan IA para funciones premium de HomeChef.'}</p>
      </div>

      <div>
        <p className="text-2xl font-bold">{formatMoney(plan.price, plan.currency || 'BOB')}</p>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>{plan.duration || `${plan.duration_days || 30} dias`}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <Metric label="Consultas IA" value={limitText(plan.ai_query_limit)} />
        <Metric label="Generaciones" value={limitText(plan.ai_generation_limit)} />
      </div>

      <div className="space-y-2 text-sm">
        <p className="font-semibold">Funciones IA incluidas</p>
        {aiFeatureItems.map((feature) => {
          const included = feature.included(plan)
          return (
            <div key={feature.id} className="flex items-start gap-2">
              <span aria-hidden="true" className={included ? 'text-emerald-500' : 'text-slate-400'}>
                {included ? '✓' : '—'}
              </span>
              <span style={{ color: included ? 'var(--text)' : 'var(--muted)' }}>{feature.label}</span>
            </div>
          )
        })}
      </div>

      {benefits.length ? (
        <ul className="space-y-1 text-sm">
          {benefits.slice(0, 5).map((benefit) => <li key={benefit}>- {benefit}</li>)}
        </ul>
      ) : null}

      <button
        type="button"
        className="mt-auto h-11 rounded-lg text-white font-semibold disabled:cursor-not-allowed"
        style={{ background: available ? 'linear-gradient(90deg, var(--brand), var(--brand-2))' : 'var(--muted)' }}
        onClick={() => onSelect(plan)}
        disabled={!available}
      >
        {available ? 'Seleccionar plan' : 'Plan IA no disponible'}
      </button>
    </article>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
      <p className="text-xs" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  )
}

function limitText(value?: number | null) {
  if (value === null || value === undefined) return 'Ilimitado'
  return String(value)
}
