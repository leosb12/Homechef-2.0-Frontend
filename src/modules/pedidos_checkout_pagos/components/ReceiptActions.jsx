import { useEffect, useMemo, useState } from 'react'
import { downloadChefOrderReceipt, downloadMyOrderReceipt } from '../services/order_service'

export default function ReceiptActions({
  orderId,
  receipts = [],
  viewer = 'client',
  compact = false,
  inline = false,
  title = 'Comprobantes',
  subtitle = 'Disponibles para pago confirmado o cobranza cerrada.',
}) {
  const visibleReceipts = useMemo(() => Array.isArray(receipts) ? receipts : [], [receipts])
  const [selectedFormats, setSelectedFormats] = useState({})
  const [busyReceiptId, setBusyReceiptId] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    setSelectedFormats((current) => {
      const next = { ...current }
      for (const receipt of visibleReceipts) {
        if (!next[receipt.id]) next[receipt.id] = 'pdf'
      }
      return next
    })
  }, [visibleReceipts])

  if (!visibleReceipts.length) return null

  if (inline) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {visibleReceipts.map((receipt) => (
          <div
            key={receipt.id}
            className="inline-flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2"
            style={{ borderColor: 'var(--line)' }}
          >
            <span className="text-sm font-medium">
              {title}: {receipt.receipt_number}
            </span>
            <select
              value={selectedFormats[receipt.id] || 'pdf'}
              onChange={(event) => setSelectedFormats((current) => ({ ...current, [receipt.id]: event.target.value }))}
              className="rounded-lg border px-2 py-1 bg-transparent text-sm"
              style={{ borderColor: 'var(--line)' }}
            >
              <option value="pdf">PDF</option>
              <option value="html">HTML</option>
              <option value="docx">DOCX</option>
            </select>
            <button
              type="button"
              onClick={() => handleDownload(receipt)}
              disabled={busyReceiptId !== ''}
              className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
              style={{ borderColor: 'var(--line)' }}
            >
              {busyReceiptId === receipt.id ? 'Descargando...' : 'Descargar comprobante'}
            </button>
          </div>
        ))}
        {message ? <span className="text-sm" style={{ color: 'var(--muted)' }}>{message}</span> : null}
      </div>
    )
  }

  async function handleDownload(receipt) {
    const fileFormat = selectedFormats[receipt.id] || 'pdf'
    setBusyReceiptId(receipt.id)
    setMessage('')
    try {
      if (viewer === 'chef') {
        await downloadChefOrderReceipt(orderId, receipt.id, fileFormat)
      } else {
        await downloadMyOrderReceipt(orderId, receipt.id, fileFormat)
      }
      setMessage(`Comprobante ${receipt.receipt_number} descargado.`)
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'No se pudo descargar el comprobante.')
    } finally {
      setBusyReceiptId('')
    }
  }

  return (
    <div className="rounded-xl border p-3 space-y-3" style={{ borderColor: 'var(--line)' }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{subtitle}</p>
        </div>
        {message ? <p className="text-sm" style={{ color: 'var(--muted)' }}>{message}</p> : null}
      </div>

      <div className="grid gap-3">
        {visibleReceipts.map((receipt) => (
          <div key={receipt.id} className={`rounded-xl border p-3 ${compact ? 'space-y-2' : 'space-y-3'}`} style={{ borderColor: 'var(--line)' }}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{receipt.receipt_number}</p>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  {labelForPaymentMethod(receipt.payment_method)} · {labelForPaymentStatus(receipt.payment_status)} · {Number(receipt.total || 0).toFixed(2)} {receipt.currency || 'BOB'}
                </p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Emitido: {formatDate(receipt.issued_at)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedFormats[receipt.id] || 'pdf'}
                  onChange={(event) => setSelectedFormats((current) => ({ ...current, [receipt.id]: event.target.value }))}
                  className="rounded-lg border px-3 py-2 bg-transparent"
                  style={{ borderColor: 'var(--line)' }}
                >
                  <option value="pdf">PDF</option>
                  <option value="html">HTML</option>
                  <option value="docx">DOCX</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleDownload(receipt)}
                  disabled={busyReceiptId !== ''}
                  className="rounded-lg border px-4 py-2 disabled:opacity-50"
                  style={{ borderColor: 'var(--line)' }}
                >
                  {busyReceiptId === receipt.id ? 'Descargando...' : 'Descargar'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function labelForPaymentMethod(method) {
  const map = {
    cash: 'Efectivo',
    stripe_test: 'Stripe test',
    qr_simulado: 'QR simulado',
    bitcoin_coingate: 'Bitcoin CoinGate',
  }
  return map[method] || method || '-'
}

function labelForPaymentStatus(status) {
  const map = {
    CONFIRMED: 'Confirmado',
    PENDING: 'Pendiente',
    PROCESSING: 'Procesando',
    FAILED: 'Fallido',
    CANCELLED: 'Cancelado',
    EXPIRED: 'Expirado',
  }
  return map[status] || status || '-'
}
