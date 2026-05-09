import { useEffect } from 'react'
import { useConnectivity } from '../hooks/useConnectivity'
import { syncNow } from '../services/sync_service'

const LABELS = {
  idle: 'Sincronizado',
  syncing: 'Sincronizando',
  offline: 'Sin conexion',
  error: 'Error de sync',
  conflict: 'Conflictos',
}

export default function SyncStatusBadge() {
  const { isOnline, syncStatus, pendingCount, conflictCount, lastError } = useConnectivity()

  useEffect(() => {
    if (isOnline && pendingCount > 0) void syncNow()
  }, [isOnline, pendingCount])

  const status = isOnline ? syncStatus : 'offline'
  const countText = conflictCount ? `${conflictCount} conflicto${conflictCount === 1 ? '' : 's'}` : `${pendingCount} pendiente${pendingCount === 1 ? '' : 's'}`
  const showCount = pendingCount > 0 || conflictCount > 0

  return (
    <button
      type="button"
      onClick={() => void syncNow()}
      className="rounded-full border px-3 py-2 text-xs font-semibold"
      style={{
        borderColor: conflictCount ? '#f97316' : 'var(--line)',
        color: status === 'offline' || status === 'error' ? '#f97316' : 'var(--text)',
        backgroundColor: 'var(--panel-soft)',
      }}
      title={lastError || 'Estado de sincronizacion offline-first'}
    >
      {LABELS[status] || LABELS.idle}{showCount ? ` - ${countText}` : ''}
    </button>
  )
}
