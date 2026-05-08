import type { AISubscriptionPayment } from '../../types/aiSubscription'
import { formatDate, formatMoney, labelize, statusColor } from './formatters'
import { paymentProviderLabel } from './PaymentProviderSelector'

interface Props {
  items: AISubscriptionPayment[]
}

export default function PaymentHistoryTable({ items }: Props) {
  if (!items.length) return <Empty text="Aun no hay pagos registrados." />

  return (
    <div className="overflow-auto rounded-xl border" style={{ borderColor: 'var(--line)' }}>
      <table className="min-w-[780px] w-full text-sm">
        <thead style={{ backgroundColor: 'var(--panel-soft)' }}>
          <tr className="text-left">
            <Th>Fecha</Th>
            <Th>Proveedor</Th>
            <Th>Monto</Th>
            <Th>Estado</Th>
            <Th>Referencia</Th>
            <Th>Motivo rechazo</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const status = item.status || 'PENDING'
            return (
              <tr key={item.id || index} className="border-t" style={{ borderColor: 'var(--line)' }}>
                <Td>{formatDate(item.created_at || item.date)}</Td>
                <Td>{paymentProviderLabel(item.payment_provider || item.provider)}</Td>
                <Td>{formatMoney(item.amount, item.currency || 'BOB')}</Td>
                <Td><span style={{ color: statusColor(status) }} className="font-semibold">{labelize(status)}</span></Td>
                <Td>{item.external_reference || '-'}</Td>
                <Td>{item.rejection_reason || '-'}</Td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-3 font-semibold">{children}</th>
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-3 align-top">{children}</td>
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border p-6 text-center" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>{text}</div>
}
