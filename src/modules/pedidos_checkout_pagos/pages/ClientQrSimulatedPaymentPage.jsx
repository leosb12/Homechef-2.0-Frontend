import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { cancelQrSession, confirmQrSession, fetchQrSession, startQrSession } from '../services/qr_payment_service'

export default function ClientQrSimulatedPaymentPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const sessionCode = params.get('session_code') || ''
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    load()
  }, [sessionCode])

  async function load() {
    if (!sessionCode) {
      setMessage('No se encontro una sesion QR valida.')
      setLoading(false)
      return
    }
    setLoading(true)
    setMessage('')
    try {
      const data = await fetchQrSession(sessionCode)
      setSession(data)
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'No se pudo cargar la sesion QR simulada.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePay() {
    if (!sessionCode) return
    setProcessing(true)
    setMessage('')
    try {
      await startQrSession(sessionCode)
      const data = await confirmQrSession(sessionCode)
      setSuccess(data)
      setSession(data.session || null)
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'No se pudo confirmar el pago QR simulado.')
    } finally {
      setProcessing(false)
    }
  }

  async function handleCancel() {
    if (!sessionCode) return
    setProcessing(true)
    setMessage('')
    try {
      await cancelQrSession(sessionCode)
      navigate('/client/orders')
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'No se pudo cancelar la sesion QR simulada.')
    } finally {
      setProcessing(false)
    }
  }

  const canPay = session && ['PENDING', 'PROCESSING'].includes(session.status)
  const expiresLabel = useMemo(() => {
    if (!session?.expires_at) return '-'
    return new Date(session.expires_at).toLocaleString()
  }, [session?.expires_at])

  if (loading) {
    return <div className="rounded-xl border p-4" style={{ borderColor: 'var(--line)' }}>Cargando banco simulado...</div>
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border p-6 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--brand-2)' }}>Banco simulado</p>
          <h1 className="text-3xl font-bold">Pago QR HomeChef</h1>
          <p style={{ color: 'var(--muted)' }}>Este flujo valida el pago QR simulado y deja el pedido listo para el cocinero.</p>
        </div>

        {message ? <div className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--line)' }}>{message}</div> : null}

        {session ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Box label="Sesion" value={session.session_code} mono />
            <Box label="Estado" value={labelForSession(session.status)} />
            <Box label="Banco" value={session.bank_name} />
            <Box label="Cuenta" value={session.bank_account_label} />
            <Box label="Monto" value={`${session.currency} ${Number(session.amount || 0).toFixed(2)}`} />
            <Box label="Expira" value={expiresLabel} />
          </div>
        ) : null}

        {success ? (
          <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--line)' }}>
            <p className="font-semibold">Pago QR confirmado</p>
            <p>Pedido: <span className="font-mono">{success.order_id}</span></p>
            <p>Estado del pedido: {success.order_status}</p>
            <p>Estado del pago: {success.payment_status}</p>
            <button
              type="button"
              onClick={() => navigate('/client/orders')}
              className="px-4 py-2 rounded-lg text-white"
              style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
            >
              Ir a mis pedidos
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePay}
              disabled={!canPay || processing}
              className="px-4 py-2 rounded-lg text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
            >
              {processing ? 'Validando pago durante 3 segundos...' : 'Pagar QR simulado'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={processing || !canPay}
              className="px-4 py-2 rounded-lg border disabled:opacity-50"
              style={{ borderColor: 'var(--line)' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={load}
              disabled={processing}
              className="px-4 py-2 rounded-lg border disabled:opacity-50"
              style={{ borderColor: 'var(--line)' }}
            >
              Recargar
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

function Box({ label, value, mono = false }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--line)' }}>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className={mono ? 'font-mono break-all' : ''}>{value}</p>
    </div>
  )
}

function labelForSession(status) {
  const map = {
    PENDING: 'Pendiente',
    PROCESSING: 'Procesando',
    CONFIRMED: 'Confirmado',
    CANCELLED: 'Cancelado',
    EXPIRED: 'Expirado',
    INVALIDATED: 'Invalidado',
  }
  return map[status] || status
}
