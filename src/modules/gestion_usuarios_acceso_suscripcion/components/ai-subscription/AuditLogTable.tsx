import type { AISubscriptionAuditLog } from '../../types/aiSubscription'
import { formatDate, labelize } from './formatters'

interface Props {
  items: AISubscriptionAuditLog[]
}

export default function AuditLogTable({ items }: Props) {
  if (!items.length) {
    return <div className="rounded-xl border p-6 text-center" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>Aun no hay eventos en la bitacora.</div>
  }

  return (
    <div className="overflow-auto rounded-xl border" style={{ borderColor: 'var(--line)' }}>
      <table className="min-w-[720px] w-full text-sm">
        <thead style={{ backgroundColor: 'var(--panel-soft)' }}>
          <tr className="text-left">
            <Th>Fecha</Th>
            <Th>Accion</Th>
            <Th>Descripcion</Th>
            <Th>Metadata</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id || index} className="border-t" style={{ borderColor: 'var(--line)' }}>
              <Td>{formatDate(item.created_at || item.date)}</Td>
              <Td>{labelize(item.action)}</Td>
              <Td>{item.description || '-'}</Td>
              <Td><code className="text-xs break-words">{formatMetadata(item.metadata)}</code></Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatMetadata(metadata: AISubscriptionAuditLog['metadata']) {
  if (!metadata) return '-'
  if (typeof metadata === 'string') return metadata
  return JSON.stringify(metadata)
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-3 font-semibold">{children}</th>
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-3 align-top">{children}</td>
}
