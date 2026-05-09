import { useSyncStore } from '../services/sync_store'

export function useConnectivity() {
  return useSyncStore((state) => ({
    isOnline: state.isOnline,
    syncStatus: state.syncStatus,
    pendingCount: state.pendingCount,
    conflictCount: state.conflictCount,
    lastError: state.lastError,
  }))
}
