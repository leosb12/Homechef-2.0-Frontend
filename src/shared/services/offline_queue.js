import {
  STORES,
  bulkDelete,
  deleteFromStore,
  getAllFromStore,
  getMetadata,
  putInStore,
  setMetadata,
} from './offline_db'
import { logDebug } from './debug_logger'

const DEVICE_ID_KEY = 'device_id'
const LAST_SYNC_KEY = 'last_sync'

export const OPERATION_STATUS = Object.freeze({
  PENDING: 'pending',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  FAILED: 'failed',
  FAILED_PERMISSION: 'failed_permission',
  CONFLICT: 'conflict',
  SUPERSEDED: 'superseded',
})

export function isPendingOperation(op) {
  return op?.status === OPERATION_STATUS.PENDING || op?.status === OPERATION_STATUS.SYNCING
}

export function isFailedOperation(op) {
  return op?.status === OPERATION_STATUS.FAILED || op?.status === OPERATION_STATUS.FAILED_PERMISSION
}

export function isRetryableOperation(op) {
  return isPendingOperation(op) || isFailedOperation(op)
}

function dispatchQueueChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('homechef:offline-queue-changed'))
  }
}

function logQueue(message, extra = {}) {
  logDebug('DEBUG_SYNC', `[OfflineQueue] ${message}`, extra)
}

export async function enqueueOperation(entity, action, payload, options = {}) {
  const now = new Date().toISOString()
  const local_id = String(options.local_id || payload?.local_id || payload?._id || payload?.id || `local-${crypto.randomUUID()}`)

  // Check if we should merge with a pending operation for the same local_id
  const pendingOps = await getPendingOperations()
  const existingOp = pendingOps.find(
    op => op.entity === entity && op.local_id === local_id && op.status !== OPERATION_STATUS.SYNCED
  )

  if (existingOp) {
    if (existingOp.action === 'CREATE' && action === 'UPDATE') {
      // Merge update payload into the CREATE payload
      existingOp.payload = { ...existingOp.payload, ...payload }
      existingOp.updated_at = now
      existingOp.status = OPERATION_STATUS.PENDING
      existingOp.last_error = ''
      await putInStore(STORES.operations, existingOp)
      logQueue('action added', {
        merged: true,
        id: existingOp.operation_id,
        entity,
        action,
        endpoint: existingOp.endpoint,
        status: existingOp.status,
      })
      dispatchQueueChanged()
      return existingOp
    } else if (existingOp.action === 'UPDATE' && action === 'UPDATE') {
      // Merge update payload into the existing UPDATE payload
      existingOp.payload = { ...existingOp.payload, ...payload }
      existingOp.updated_at = now
      existingOp.status = OPERATION_STATUS.PENDING
      existingOp.last_error = ''
      await putInStore(STORES.operations, existingOp)
      logQueue('action added', {
        merged: true,
        id: existingOp.operation_id,
        entity,
        action,
        endpoint: existingOp.endpoint,
        status: existingOp.status,
      })
      dispatchQueueChanged()
      return existingOp
    }
  }

  const operation_id = options.operation_id || crypto.randomUUID()
  const client_mutation_id = options.client_mutation_id || operation_id
  const user_role = localStorage.getItem('homechef_role') || 'CLIENTE'
  const method = options.method || (action === 'CREATE' ? 'POST' : action === 'DELETE' ? 'DELETE' : 'PUT')

  let endpoint = options.endpoint
  if (!endpoint) {
    if (entity === 'dishes') {
      endpoint = action === 'CREATE' ? '/chef/dishes/' : `/chef/dishes/${options.server_id || local_id}/`
    } else {
      endpoint = `/${entity}/${options.server_id || ''}`
    }
  }

  const operation = {
    operation_id,
    entity,
    action,
    local_id,
    server_id: options.server_id ?? payload?.server_id ?? payload?.id ?? null,
    payload,
    version: options.version ?? payload?.version ?? null,
    created_at: now,
    updated_at: now,
    retry_count: 0,
    status: OPERATION_STATUS.PENDING,
    last_error: '',
    endpoint,
    method,
    client_mutation_id,
    user_role,
    error: '',
  }

  await putInStore(STORES.operations, operation)
  logQueue('action added', {
    id: operation.operation_id,
    entity: operation.entity,
    action: operation.action,
    endpoint: operation.endpoint,
    method: operation.method,
    status: operation.status,
  })
  dispatchQueueChanged()
  return operation
}

export async function getPendingOperations() {
  const operations = await getAllFromStore(STORES.operations)
  const sorted = operations.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
  logQueue('queue loaded', {
    total: sorted.length,
    ids: sorted.map((op) => op.operation_id),
    pendingCount: sorted.filter(isPendingOperation).length,
    statuses: sorted.map((op) => ({
      id: op.operation_id,
      entity: op.entity,
      action: op.action,
      endpoint: op.endpoint,
      status: op.status,
    })),
  })
  return sorted
}

export async function removeSyncedOperations(operationIds = []) {
  await bulkDelete(STORES.operations, operationIds)
  logQueue('pending count', { removedSynced: operationIds, count: operationIds.length })
  dispatchQueueChanged()
}

export async function updateOperation(operation) {
  await putInStore(STORES.operations, operation)
  dispatchQueueChanged()
  return operation
}

export async function replaceOperationIdForRetry(operation) {
  if (!operation?.operation_id) return operation
  const previousId = operation.operation_id
  const nextOperation = {
    ...operation,
    operation_id: crypto.randomUUID(),
    client_mutation_id: operation.client_mutation_id || previousId,
    status: OPERATION_STATUS.PENDING,
    last_error: '',
    error: '',
    updated_at: new Date().toISOString(),
  }

  await deleteFromStore(STORES.operations, previousId)
  await putInStore(STORES.operations, nextOperation)
  logQueue('action added', {
    retry: true,
    previousId,
    id: nextOperation.operation_id,
    entity: nextOperation.entity,
    action: nextOperation.action,
    endpoint: nextOperation.endpoint,
    status: nextOperation.status,
  })
  dispatchQueueChanged()
  return nextOperation
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

export async function retryOperationByLocalId(entity, localId) {
  const operations = await getAllFromStore(STORES.operations)
  const op = operations.find(o => o.entity === entity && String(o.local_id) === String(localId))
  if (op) {
    await replaceOperationIdForRetry(op)
    return true
  }
  return false
}

export async function enqueueOrUpdateLocationPing(assignmentId, location) {
  const operations = await getPendingOperations()
  const existing = operations.find(
    (op) =>
      op.entity === 'rider_orders' &&
      op.action === 'LOCATION_PING' &&
      String(op.server_id) === String(assignmentId)
  )

  if (existing) {
    existing.payload = { assignment_id: assignmentId, ...location }
    existing.created_at = new Date().toISOString()
    await putInStore(STORES.operations, existing)
    logQueue('action added', {
      merged: true,
      id: existing.operation_id,
      entity: existing.entity,
      action: existing.action,
      endpoint: existing.endpoint,
      status: existing.status,
    })
    dispatchQueueChanged()
    return existing
  }

  return enqueueOperation(
    'rider_orders',
    'LOCATION_PING',
    { assignment_id: assignmentId, ...location },
    {
      local_id: `location-${assignmentId}`,
      server_id: assignmentId,
      endpoint: `/delivery/${assignmentId}/location-pings/`,
      method: 'POST',
    }
  )
}
