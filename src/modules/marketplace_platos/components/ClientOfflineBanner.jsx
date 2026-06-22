import { useConnectivity } from '../../../shared/hooks/useConnectivity'
import { syncNow } from '../../../shared/services/sync_service'

export default function ClientOfflineBanner() {
  const { isOnline, syncStatus, pendingCount, conflictCount } = useConnectivity()

  if (isOnline && pendingCount === 0 && conflictCount === 0) {
    return null
  }

  return (
    <div
      className="mb-4 rounded-2xl border p-4 text-sm font-semibold tracking-wide shadow-sm animate-in fade-in duration-200"
      style={{
        borderColor: !isOnline ? 'rgba(139, 92, 246, 0.25)' : conflictCount ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)',
        backgroundColor: !isOnline ? 'rgba(139, 92, 246, 0.05)' : conflictCount ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)',
        color: 'var(--text)',
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{!isOnline ? '📡' : conflictCount ? '⚠️' : '🔄'}</span>
          <div>
            <p className="font-extrabold" style={{ color: !isOnline ? '#a78bfa' : conflictCount ? '#f87171' : '#34d399' }}>
              {!isOnline
                ? 'Sin conexión. Mostrando datos de tu última sincronización.'
                : conflictCount
                ? 'Se detectaron conflictos al sincronizar'
                : 'Sincronización en curso...'}
            </p>
            {pendingCount > 0 && (
              <p className="text-xs font-normal mt-0.5" style={{ color: 'var(--muted)' }}>
                Tienes {pendingCount} acción{pendingCount === 1 ? '' : 'es'} pendiente{pendingCount === 1 ? '' : 's'} de sincronizar.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOnline && (pendingCount > 0 || conflictCount > 0) && (
            <button
              type="button"
              onClick={() => void syncNow()}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition hover:opacity-90"
              style={{
                background: 'linear-gradient(90deg, #7c3aed, #4f46e5)',
              }}
            >
              {syncStatus === 'syncing' ? 'Sincronizando...' : 'Sincronizar ahora'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
