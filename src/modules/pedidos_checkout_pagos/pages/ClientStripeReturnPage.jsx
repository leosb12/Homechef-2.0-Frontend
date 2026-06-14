import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { confirmStripeReturn } from '../services/stripe_payment_service'

export default function ClientStripeReturnPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const provider = params.get('provider') || 'STRIPE_SANDBOX'
  const payment = params.get('payment') || ''
  const stripeSessionId = params.get('session_id') || ''
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    void handleConfirm()
  }, [provider, stripeSessionId])

  async function handleConfirm() {
    if (!stripeSessionId) {
      setMessage('No llego una referencia valida desde Stripe test.')
      setLoading(false)
      return
    }
    setLoading(true)
    setMessage('')
    try {
      const data = await confirmStripeReturn({
        provider,
        stripe_session_id: stripeSessionId,
      })
      setResult(data)
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'No se pudo verificar el pago Stripe test.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border p-6 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--brand-2)' }}>Stripe Test</p>
          <h1 className="text-3xl font-bold">Verificando pago</h1>
          <p style={{ color: 'var(--muted)' }}>
            {payment === 'stripe_cancel'
              ? 'Stripe reporto una cancelacion. Verificamos el estado real del pedido.'
              : 'Consultamos el estado del checkout Stripe test antes de liberar el pedido al cocinero.'}
          </p>
        </div>

        {loading ? <div className="rounded-xl border p-3" style={{ borderColor: 'var(--line)' }}>Consultando Stripe...</div> : null}
        {message ? <div className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--line)' }}>{message}</div> : null}

        {result ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Box label="Pedido" value={result.order_id} mono />
            <Box label="Referencia" value={result.external_reference} mono />
            <Box label="Estado del pago" value={labelForPaymentStatus(result.payment_status)} />
            <Box label="Estado del pedido" value={labelForOrderStatus(result.order_status)} />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg border disabled:opacity-50"
            style={{ borderColor: 'var(--line)' }}
          >
            Reintentar verificacion
          </button>
          <button
            type="button"
            onClick={() => navigate('/client/orders')}
            className="px-4 py-2 rounded-lg text-white"
            style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
          >
            Ir a mis pedidos
          </button>
        </div>
      </div>
    </section>
  )
}

function Box({ label, value, mono = false }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--line)' }}>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className={mono ? 'font-mono break-all' : ''}>{value || '-'}</p>
    </div>
  )
}

function labelForPaymentStatus(status) {
  const map = {
    PENDING: 'Pendiente en Stripe',
    PROCESSING: 'Procesando pago',
    CONFIRMED: 'Pago confirmado',
    FAILED: 'Pago fallido',
    CANCELLED: 'Pago cancelado',
    EXPIRED: 'Pago expirado',
  }
  return map[status] || status || '-'
}

function labelForOrderStatus(status) {
  const map = {
    PAYMENT_VALIDATING: 'Validando pago',
    PAYMENT_FAILED: 'Pago fallido',
    EXPIRED: 'Pedido expirado',
    CANCELLED: 'Pedido cancelado',
    AWAITING_CHEF_CONFIRMATION: 'Esperando al cocinero',
  }
  return map[status] || status || '-'
}
