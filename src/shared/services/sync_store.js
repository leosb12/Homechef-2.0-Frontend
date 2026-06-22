import { create } from 'zustand'

export function computeConnectionState(browserOnline, backendReachable, iaServiceReachable) {
  if (!browserOnline) return 'offline_browser'
  if (backendReachable === false) return 'backend_unreachable'
  if (backendReachable === true && iaServiceReachable === false) return 'degraded'
  if (backendReachable === true && iaServiceReachable === true) return 'online_ready'
  return 'checking'
}

export const useSyncStore = create((set, get) => ({
  // ── Conectividad de red (browser) ──────────────────────────────────────────
  isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,

  // ── Conectividad real (backend + IA service) ───────────────────────────────
  browserOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
  backendReachable: null,     // null = no chequeado todavía
  iaServiceReachable: null,
  /** 'online' | 'degraded' | 'offline' */
  connectivityStatus: 'online',
  /** 'offline_browser' | 'backend_unreachable' | 'online_ready' | 'degraded' | 'checking' */
  connectionState: 'checking',
  lastCheckedAt: null,
  latency_ms: { backend: null, ia_service: null },
  connectivityErrors: {},

  // ── Estado de sync ─────────────────────────────────────────────────────────
  /** 'idle' | 'syncing' | 'offline' | 'error' | 'conflict' */
  syncStatus: typeof navigator === 'undefined' || navigator.onLine ? 'idle' : 'offline',
  pendingCount: 0,
  conflictCount: 0,
  failedCount: 0,
  lastError: '',
  lastSyncAt: null,

  // ── Acciones ───────────────────────────────────────────────────────────────

  setOnline: (isOnline) => {
    const nextConnState = isOnline ? 'checking' : 'offline_browser'
    set({
      isOnline,
      browserOnline: isOnline,
      connectionState: nextConnState,
      syncStatus: isOnline ? get().syncStatus : 'offline',
    })
  },

  setConnectionState: (connectionState) => {
    set({
      connectionState,
      isOnline: connectionState === 'online_ready' || connectionState === 'degraded'
    })
  },

  applyConnectivityState: (state) => {
    const connState = state.connectionState || computeConnectionState(state.browserOnline, state.backendReachable, state.iaServiceReachable)
    const isNowOnline = connState === 'online_ready' || connState === 'degraded'
    const isNowOffline = connState === 'offline_browser' || connState === 'backend_unreachable'
    const currentSyncStatus = get().syncStatus

    // Resetear syncStatus si vuelve la conexión y estaba atascado en 'offline'
    let nextSyncStatus = currentSyncStatus
    if (isNowOnline && currentSyncStatus === 'offline') {
      nextSyncStatus = 'idle'
    } else if (isNowOffline) {
      nextSyncStatus = 'offline'
    }

    set({
      isOnline: isNowOnline,
      browserOnline: state.browserOnline,
      backendReachable: state.backendReachable,
      iaServiceReachable: state.iaServiceReachable,
      connectivityStatus: state.status || (isNowOffline ? 'offline' : 'online'),
      connectionState: connState,
      lastCheckedAt: state.lastCheckedAt,
      latency_ms: state.latency_ms,
      connectivityErrors: state.errors,
      syncStatus: nextSyncStatus,
    })
  },

  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setCounts: (counts) => set(counts),
  setLastError: (lastError) => set({ lastError }),
  setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
}))

if (typeof window !== 'undefined') {
  window.__sync_store = useSyncStore
}
