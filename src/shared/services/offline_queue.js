import {
  STORES,
  bulkDelete,
  getAllFromStore,
  getMetadata,
  putInStore,
  setMetadata,
} from './offline_db'

const DEVICE_ID_KEY = 'device_id'
const LAST_SYNC_KEY = 'last_sync'

export async function enqueueOperation(entity, action, payload, options = {}) {
  const now = new Date().toISOString()
  const local_id = String(options.local_id || payload?.local_id || payload?._id || payload?.id || `local-${crypto.randomUUID()}`)
  const operation = {
    operation_id: options.operation_id || crypto.randomUUID(),
    entity,
    action,
    local_id,
    server_id: options.server_id ?? payload?.server_id ?? payload?.id ?? null,
    payload,
    version: options.version ?? payload?.version ?? null,
    created_at: now,
  }

  await putInStore(STORES.operations, operation)
  window.dispatchEvent(new CustomEvent('homechef:offline-queue-changed'))
  return operation
}

export async function getPendingOperations() {
  const operations = await getAllFromStore(STORES.operations)
  return operations.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
}

export async function removeSyncedOperations(operationIds = []) {
  await bulkDelete(STORES.operations, operationIds)
  window.dispatchEvent(new CustomEvent('homechef:offline-queue-changed'))
}

export async function saveConflict(conflict) {
  const operation_id = conflict.operation_id || crypto.randomUUID()
  await putInStore(STORES.conflicts, { ...conflict, operation_id, saved_at: new Date().toISOString() })
  window.dispatchEvent(new CustomEvent('homechef:offline-conflicts-changed'))
}

export async function getConflicts() {
  return getAllFromStore(STORES.conflicts)
}

export async function getLastSync() {
  return getMetadata(LAST_SYNC_KEY)
}

export async function setLastSync(serverTime) {
  if (!serverTime) return
  await setMetadata(LAST_SYNC_KEY, serverTime)
}

export async function getDeviceId() {
  const existing = await getMetadata(DEVICE_ID_KEY)
  if (existing) return existing

  const generated = crypto.randomUUID()
  await setMetadata(DEVICE_ID_KEY, generated)
  return generated
}

export async function saveServerMapping(local_id, server_id, entity) {
  if (!local_id || server_id === undefined || server_id === null) return
  await putInStore(STORES.mappings, {
    local_id: String(local_id),
    server_id,
    entity,
    mapped_at: new Date().toISOString(),
  })
}
