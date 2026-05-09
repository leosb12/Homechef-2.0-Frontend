import { create } from 'zustand'

export const useSyncStore = create((set) => ({
  isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
  syncStatus: typeof navigator === 'undefined' || navigator.onLine ? 'idle' : 'offline',
  pendingCount: 0,
  conflictCount: 0,
  lastError: '',
  setOnline: (isOnline) => set({ isOnline, syncStatus: isOnline ? 'idle' : 'offline' }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setCounts: (counts) => set(counts),
  setLastError: (lastError) => set({ lastError }),
}))
