import type { PaymentProvider } from '../../types/aiSubscription'

const PROVIDERS: Array<{ value: PaymentProvider; label: string; description: string; buttonLabel: string }> = [
  {
    value: 'STRIPE_SANDBOX',
    label: 'Stripe Sandbox',
    description: 'Checkout seguro de Stripe en entorno sandbox.',
    buttonLabel: 'Pagar con Stripe',
  },
  {
    value: 'COINGATE_SANDBOX',
    label: 'CoinGate Sandbox',
    description: 'Orden de pago cripto en entorno sandbox de CoinGate.',
    buttonLabel: 'Pagar con CoinGate',
  },
]

interface Props {
  value: PaymentProvider
  onChange: (value: PaymentProvider) => void
}

export default function PaymentProviderSelector({ value, onChange }: Props) {
  return (
    <section className="rounded-lg border p-3 space-y-3" style={{ borderColor: 'rgba(245,158,11,0.5)', backgroundColor: 'rgba(245,158,11,0.10)' }}>
      <div>
        <p className="font-semibold">Proveedor de pago sandbox</p>
        <p className="text-sm break-words" style={{ color: 'var(--muted)' }}>La tarjeta o cripto se gestiona fuera de HomeChef. No guardamos datos sensibles.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {PROVIDERS.map((item) => (
          <button
            key={item.value}
            type="button"
            className="min-w-0 rounded-lg border p-3 text-left"
            style={{
              borderColor: value === item.value ? 'var(--brand)' : 'var(--line)',
              backgroundColor: value === item.value ? 'var(--panel)' : 'transparent',
            }}
            onClick={() => onChange(item.value)}
          >
            <span className="block break-words font-semibold">{item.label}</span>
            <span className="block break-words text-xs" style={{ color: 'var(--muted)' }}>{item.description}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

export function paymentProviderButtonLabel(provider: PaymentProvider) {
  return PROVIDERS.find((item) => item.value === provider)?.buttonLabel || 'Pagar'
}

export function paymentProviderLabel(provider?: string) {
  return PROVIDERS.find((item) => item.value === provider)?.label || provider || 'Proveedor'
}
