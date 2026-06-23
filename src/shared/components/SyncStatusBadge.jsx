import { useState } from 'react'
import { useConnectivity } from '../hooks/useConnectivity'
import { syncNow } from '../services/sync_service'
import { useAuthSession } from '../../modules/gestion_usuarios_acceso_suscripcion/services/auth_session'

export default function SyncStatusBadge() {
  const {
    syncStatus,
    pendingCount,
    failedCount,
    conflictCount,
    connectionState,
    lastError,
  } = useConnectivity()

  const authStatus = useAuthSession((state) => state.authStatus)
  const [isDiagnosing, setIsDiagnosing] = useState(false)

  let label = 'Online'
  let color = 'var(--text)'
  let borderColor = 'var(--line)'
  let backgroundColor = 'var(--panel-soft)'

  if (connectionState === 'offline_browser') {
    label = 'Offline'
    color = '#f97316'
    borderColor = 'rgba(249, 115, 22, 0.3)'
    backgroundColor = 'rgba(249, 115, 22, 0.05)'
  } else if (connectionState === 'backend_unreachable') {
    label = 'Backend no disponible'
    color = '#ef4444'
    borderColor = 'rgba(239, 68, 68, 0.3)'
    backgroundColor = 'rgba(239, 68, 68, 0.05)'
  } else if (authStatus === 'offline-authenticated') {
    label = 'Sesion offline'
    color = '#3b82f6'
    borderColor = 'rgba(59, 130, 246, 0.3)'
    backgroundColor = 'rgba(59, 130, 246, 0.05)'
  } else if (connectionState === 'checking') {
    label = 'Comprobando...'
    color = 'var(--muted)'
  } else if (syncStatus === 'syncing' || isDiagnosing) {
    label = 'Sincronizando...'
    color = '#3b82f6'
    borderColor = 'rgba(59, 130, 246, 0.4)'
    backgroundColor = 'rgba(59, 130, 246, 0.08)'
  } else if (pendingCount > 0) {
    label = `${pendingCount} pendiente${pendingCount === 1 ? '' : 's'}`
    if (failedCount > 0) {
      label += ` (${failedCount} error${failedCount === 1 ? '' : 'es'})`
    }
    color = '#f59e0b'
    borderColor = 'rgba(245, 158, 11, 0.4)'
    backgroundColor = 'rgba(245, 158, 11, 0.08)'
  } else if (failedCount > 0) {
    label = `Error de sincronizacion (${failedCount} error${failedCount === 1 ? '' : 'es'})`
    color = '#ef4444'
    borderColor = 'rgba(239, 68, 68, 0.5)'
    backgroundColor = 'rgba(239, 68, 68, 0.08)'
  } else if (conflictCount > 0) {
    label = `Conflicto (${conflictCount})`
    color = '#ef4444'
    borderColor = 'rgba(239, 68, 68, 0.5)'
    backgroundColor = 'rgba(239, 68, 68, 0.08)'
  } else {
    label = 'Sincronizado'
    color = '#10b981'
    borderColor = 'rgba(16, 185, 129, 0.3)'
    backgroundColor = 'rgba(16, 185, 129, 0.05)'
  }

  const handleSyncDiagnostic = async () => {
    if (isDiagnosing) return
    setIsDiagnosing(true)

    try {
      await syncNow(true, { trigger: 'badge-click' })
    } catch (err) {
      console.error('Error during manual sync click:', err)
      const message = err.message || 'Error de red.'
      const { useSyncStore } = await import('../services/sync_store')
      useSyncStore.getState().setLastError(message)
      useSyncStore.getState().setSyncStatus('error')
    } finally {
      setIsDiagnosing(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleSyncDiagnostic}
      className="rounded-full border px-3 py-2 text-xs font-semibold transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-1.5"
      style={{
        borderColor,
        color,
        backgroundColor,
      }}
      title={lastError || 'Estado de sincronizacion offline-first. Haz clic para diagnosticar.'}
    >
      {(syncStatus === 'syncing' || isDiagnosing) && (
        <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping inline-block" />
      )}
      <span>{label}</span>
    </button>
  )
}

