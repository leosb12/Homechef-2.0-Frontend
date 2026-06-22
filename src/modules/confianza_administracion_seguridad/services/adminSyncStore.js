import { create } from 'zustand';
import { getSyncMetadata, getPendingMutations, getModuleMetadata } from './adminOfflineRepository';

export const useAdminSyncStore = create((set, get) => ({
  isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
  syncStatus: typeof navigator === 'undefined' || navigator.onLine ? 'idle' : 'offline',
  metadata: null,
  pendingCount: 0,
  conflictCount: 0,
  lastError: '',
  syncProgress: {},
  syncErrors: {},

  // ── Novedades FASE 1 ──────────────────────────────────────────────────────────
  moduleStatus: {},
  lastSyncAt: null,
  isSyncing: false,
  pendingMutationsCount: 0,
  connectivityStatus: 'online', // 'online' | 'degraded' | 'offline'

  setOnline: (isOnline) => {
    set({ isOnline, syncStatus: isOnline ? 'idle' : 'offline' });
    void get().refreshCounts();
  },

  setConnectivity: (reachable, status) => {
    set({
      isOnline: status !== 'offline',
      connectivityStatus: status,
      syncStatus: status === 'offline' ? 'offline' : (get().syncStatus === 'offline' ? 'idle' : get().syncStatus)
    });
    void get().refreshCounts();
  },
  
  setSyncStatus: (syncStatus) => set({ syncStatus, isSyncing: syncStatus === 'syncing' }),
  setLastError: (lastError) => set({ lastError }),
  setMetadata: (metadata) => set({ metadata, lastSyncAt: metadata?.synced_at || null }),

  setSyncProgress: (module, status) => set((state) => ({
    syncProgress: { ...state.syncProgress, [module]: status }
  })),

  setSyncError: (module, error) => set((state) => ({
    syncErrors: { ...state.syncErrors, [module]: error }
  })),

  setModuleStatus: (module, statusMeta) => set((state) => ({
    moduleStatus: { ...state.moduleStatus, [module]: statusMeta }
  })),

  resetSyncState: () => set({ syncProgress: {}, syncErrors: {} }),
  
  refreshCounts: async () => {
    const [meta, queue] = await Promise.all([
      getSyncMetadata(),
      getPendingMutations()
    ]);
    
    const pending = queue.filter(q => q.status === 'pending' || q.status === 'failed');
    const conflicts = queue.filter(q => q.status === 'conflict');
    
    // Cargar metadatos de sincronización por módulo
    const modules = ['users', 'chefs', 'riders', 'orders', 'publications', 'fraud_risk', 'audit_general', 'audit_ai'];
    const mStatus = {};
    for (const m of modules) {
      const statusMeta = await getModuleMetadata(m);
      if (statusMeta) {
        mStatus[m] = statusMeta;
      }
    }
    
    set({
      metadata: meta,
      lastSyncAt: meta?.synced_at || null,
      pendingCount: pending.length,
      pendingMutationsCount: pending.length,
      conflictCount: conflicts.length,
      lastError: meta?.error || '',
      moduleStatus: mStatus
    });
  }
}));
