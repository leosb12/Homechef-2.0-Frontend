import { useSyncStore } from '../services/sync_store'

/**
 * useConnectivity — Hook global de estado de conexión y sincronización.
 *
 * Expone estado completo: browser, backend, ia_service, modo global.
 * Backward-compatible: isOnline sigue funcionando para componentes existentes.
 */
export function useConnectivity() {
  return useSyncStore((state) => ({
    // ── Backward-compatible ────────────────────────────────────────
    isOnline: state.isOnline,
    syncStatus: state.syncStatus,
    pendingCount: state.pendingCount,
    conflictCount: state.conflictCount,
    lastError: state.lastError,

    // ── Conectividad real ──────────────────────────────────────────
    browserOnline: state.browserOnline,
    backendReachable: state.backendReachable,
    iaServiceReachable: state.iaServiceReachable,
    /** 'online' | 'degraded' | 'offline' */
    connectivityStatus: state.connectivityStatus,
    connectionState: state.connectionState,
    lastCheckedAt: state.lastCheckedAt,
    latency_ms: state.latency_ms,
    connectivityErrors: state.connectivityErrors,
    failedCount: state.failedCount || 0,
    lastSyncAt: state.lastSyncAt,
  }))
}
