import { enqueueOperation, getPendingOperations } from './offline_queue'
import { getLocalEntities, markLocalEntityDeleted, saveLocalEntities, saveLocalEntity } from './offline_db'
import { syncNow } from './sync_service'
import { checkConnectivity, getConnectivityState, isBackendReachable } from './connectivityService'
import { logDebug } from './debug_logger'

export function isNetworkError(error) {
  const status = error?.response?.status
  return (
    !error?.response ||
    error?.code === 'ERR_NETWORK' ||
    error?.message === 'Network Error' ||
    status === 408 ||
    status === 429 ||
    status >= 500
  )
}

export async function readListWithOfflineFallback(entity, onlineFetch, toItems = defaultItems) {
  let remoteData = null
  let error = null
  try {
    remoteData = await onlineFetch()
    const items = toItems(remoteData)
    if (Array.isArray(items)) await saveLocalEntities(entity, items)
  } catch (err) {
    if (!isNetworkError(err)) throw err
    error = err
  }

  // Load from local IndexedDB
  const localItems = await getLocalEntities(entity)
  const operations = await getPendingOperations()
  const entityOps = operations.filter(op => op.entity === entity)

  let mergedItems = [...localItems]

  for (const op of entityOps) {
    if (op.action === 'CREATE' || op.action === 'ADD') {
      const itemData = buildLocalData(op.payload, op)
      // Check if itemData already exists in list (using id or local_id)
      mergedItems = mergedItems.filter(item => String(item._id ?? item.id) !== String(itemData._id))
      mergedItems.unshift(itemData)
    } else if (op.action === 'UPDATE' || op.action === 'EDIT') {
      const id = op.server_id || op.local_id
      mergedItems = mergedItems.map(item => {
        if (String(item._id ?? item.id) === String(id)) {
          return {
            ...item,
            ...op.payload,
            synced: false,
            __operation_id: op.operation_id,
            __op_status: op.status,
            __op_error: op.last_error,
          }
        }
        return item
      })
    } else if (op.action === 'DELETE' || op.action === 'REMOVE') {
      const id = op.server_id || op.local_id
      mergedItems = mergedItems.map(item => {
        if (String(item._id ?? item.id) === String(id)) {
          return {
            ...item,
            _deleted_pending: true,
            synced: false,
            __operation_id: op.operation_id,
            __op_status: op.status,
            __op_error: op.last_error,
          }
        }
        return item
      })
    }
  }

  if (remoteData) {
    if (Array.isArray(remoteData)) {
      return mergedItems
    }
    return {
      ...remoteData,
      items: mergedItems
    }
  }

  return {
    items: mergedItems,
    __offline: true,
    __error: error?.message || '',
  }
}

export async function readEntityWithOfflineFallback(entity, id, onlineFetch) {
  let remoteData = null
  let error = null
  try {
    remoteData = await onlineFetch()
    await saveLocalEntity(entity, remoteData, id)
  } catch (err) {
    if (!isNetworkError(err)) throw err
    error = err
  }

  const localItems = await getLocalEntities(entity)
  const found = localItems.find((item) => String(item._id ?? item.id) === String(id))
  
  const operations = await getPendingOperations()
  const entityOps = operations.filter(
    (op) => op.entity === entity && String(op.server_id || op.local_id) === String(id)
  )

  if (found || entityOps.length > 0) {
    let merged = found ? { ...found } : null
    for (const op of entityOps) {
      if (op.action === 'CREATE' || op.action === 'ADD') {
        merged = buildLocalData(op.payload, op)
      } else if (op.action === 'UPDATE' || op.action === 'EDIT') {
        merged = {
          ...merged,
          ...op.payload,
          synced: false,
          __operation_id: op.operation_id,
          __op_status: op.status,
          __op_error: op.last_error,
        }
      } else if (op.action === 'DELETE' || op.action === 'REMOVE') {
        if (merged) {
          merged._deleted_pending = true
          merged.synced = false
          merged.__operation_id = op.operation_id
          merged.__op_status = op.status
          merged.__op_error = op.last_error
        }
      }
    }

    if (merged) {
      if (remoteData) return merged
      return { ...merged, __offline: true }
    }
  }

  if (error) throw error
  throw new Error(`Entity not found: ${entity}:${id}`)
}

export async function mutateOfflineFirst(entity, action, payload, options, onlineMutation, applyLocal) {
  const online = await canUseBackend()
  if (online) {
    try {
      const data = await onlineMutation()
      if (applyLocal) await applyLocal(data)
      return data
    } catch (error) {
      if (!isNetworkError(error)) throw error
      logDebug('DEBUG_SYNC', '[OfflineQueue] online mutation failed, queued locally', {
        entity,
        action,
        endpoint: options?.endpoint,
        error: error?.message || 'Network error',
      })
    }
  }

  const operation = await enqueueOperation(entity, action, payload, options)
  const localData = buildLocalData(payload, operation)
  if (applyLocal) await applyLocal(localData, operation)
  void syncNow()
  return { ...localData, __offline: true, __operation_id: operation.operation_id }
}

export async function saveLocalUpsert(entity, data, id) {
  return saveLocalEntity(entity, data, id)
}

export async function saveLocalDelete(entity, id) {
  return markLocalEntityDeleted(entity, id)
}

function defaultItems(data) {
  if (Array.isArray(data)) return data
  return data?.items || []
}

function buildLocalData(payload, operation) {
  const id = operation.server_id || operation.local_id
  return {
    ...payload,
    _id: String(id),
    local_id: operation.local_id,
    server_id: operation.server_id,
    synced: false,
    created_at: payload?.created_at || operation.created_at,
    updated_at: operation.created_at,
  }
}

async function canUseBackend() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false
  if (isBackendReachable()) return true

  const state = getConnectivityState()
  if (state.backendReachable === true) return true

  try {
    const connectivity = await checkConnectivity()
    return connectivity.backendReachable === true
  } catch {
    return false
  }
}
