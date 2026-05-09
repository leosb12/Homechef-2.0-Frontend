import { api, invalidateApiCache } from './api'
import {
  getConflicts,
  getDeviceId,
  getLastSync,
  getPendingOperations,
  removeSyncedOperations,
  saveConflict,
  saveServerMapping,
  setLastSync,
} from './offline_queue'
import { getLocalEntities, markLocalEntityDeleted, saveLocalEntities, saveLocalEntity } from './offline_db'
import { useSyncStore } from './sync_store'

const SYNC_ENDPOINT = '/sync/'
const SYNCABLE_ENTITIES = [
  'dishes',
  'chef_profiles',
  'chef_availability',
  'daily_menus',
  'favorites',
  'preferences',
  'reviews',
]

let syncPromise = null

export function startConnectivitySync() {
  if (typeof window === 'undefined') return

  const refresh = () => {
    useSyncStore.getState().setOnline(navigator.onLine)
    void refreshSyncCounts()
  }

  window.addEventListener('online', () => {
    refresh()
    void syncNow()
  })
  window.addEventListener('offline', refresh)
  window.addEventListener('homechef:offline-queue-changed', refreshSyncCounts)
  window.addEventListener('homechef:offline-conflicts-changed', refreshSyncCounts)

  refresh()
  if (navigator.onLine) void syncNow()
}

export async function syncNow() {
  if (syncPromise) return syncPromise

  syncPromise = (async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      useSyncStore.getState().setSyncStatus('offline')
      return
    }

    useSyncStore.getState().setSyncStatus('syncing')
    useSyncStore.getState().setLastError('')

    try {
      await pushPendingOperations()
      await pullChanges(await getLastSync())
      await refreshSyncCounts()

      const conflicts = await getConflicts()
      const lastError = useSyncStore.getState().lastError
      useSyncStore.getState().setSyncStatus(lastError ? 'error' : conflicts.length ? 'conflict' : 'idle')
    } catch (error) {
      useSyncStore.getState().setLastError(error?.response?.data?.detail || error?.message || 'No se pudo sincronizar.')
      useSyncStore.getState().setSyncStatus('error')
    } finally {
      syncPromise = null
    }
  })()

  return syncPromise
}

export async function pushPendingOperations() {
  const operations = await getPendingOperations()
  if (!operations.length) return null

  const device_id = await getDeviceId()
  const last_sync = await getLastSync()
  const { data } = await api.post(SYNC_ENDPOINT, { device_id, last_sync, operations })

  const syncedIds = normalizeSyncedIds(data?.synced)
  const syncedItems = Array.isArray(data?.synced) ? data.synced : []
  await removeSyncedOperations(syncedIds)

  for (const item of syncedItems) {
    const local_id = item.local_id || item.operation?.local_id
    const server_id = item.server_id || item.id || item.operation?.server_id
    const entity = item.entity || item.operation?.entity
    await saveServerMapping(local_id, server_id, entity)
  }

  for (const conflict of data?.conflicts || []) {
    await saveConflict({
      operation_id: conflict.operation_id,
      entity: conflict.entity,
      server_id: conflict.server_id,
      reason: conflict.reason || 'conflict',
      server_data: conflict.server_data || conflict.server || null,
      client_data: conflict.client_data || conflict.client || null,
    })
  }

  if (Array.isArray(data?.errors) && data.errors.length) {
    useSyncStore.getState().setLastError(`${data.errors.length} operacion(es) no se pudieron sincronizar.`)
    useSyncStore.getState().setSyncStatus('error')
  }

  if (data?.server_time) await setLastSync(data.server_time)
  invalidateApiCache()
  return data
}

export async function pullChanges(lastSync = null) {
  const config = lastSync ? { params: { lastSync } } : {}
  const { data } = await api.get(SYNC_ENDPOINT, config)

  await applyServerChanges(data)
  if (data?.server_time) await setLastSync(data.server_time)
  invalidateApiCache()
  return data
}

export async function refreshSyncCounts() {
  const [pending, conflicts] = await Promise.all([getPendingOperations(), getConflicts()])
  useSyncStore.getState().setCounts({
    pendingCount: pending.length,
    conflictCount: conflicts.length,
  })
}

export async function getLocalList(entity) {
  return getLocalEntities(entity)
}

async function applyServerChanges(data) {
  for (const entity of SYNCABLE_ENTITIES) {
    const changes = data?.[entity]
    if (!Array.isArray(changes)) continue

    for (const item of changes) {
      const id = item._id ?? item.id ?? item.server_id ?? item.local_id
      if (!id) continue
      if (item.deleted_at) await markLocalEntityDeleted(entity, id)
      else await saveLocalEntity(entity, item, id)
    }
  }

  if (Array.isArray(data?.changes)) {
    for (const change of data.changes) {
      const entity = change.entity
      const payload = change.payload || change.data || change
      const id = payload._id ?? payload.id ?? change.server_id ?? change.local_id
      if (!entity || !id) continue
      if (payload.deleted_at || change.deleted_at) await markLocalEntityDeleted(entity, id)
      else await saveLocalEntity(entity, payload, id)
    }
  }

  for (const entity of SYNCABLE_ENTITIES) {
    const items = data?.entities?.[entity]
    if (Array.isArray(items)) await saveLocalEntities(entity, items)
  }
}

function normalizeSyncedIds(synced = []) {
  if (!Array.isArray(synced)) return []
  return synced
    .map((item) => (typeof item === 'string' ? item : item.operation_id || item.id))
    .filter(Boolean)
}
