import { enqueueOperation } from './offline_queue'
import { getLocalEntities, markLocalEntityDeleted, saveLocalEntities, saveLocalEntity } from './offline_db'
import { syncNow } from './sync_service'

export function isNetworkError(error) {
  return !error?.response || error?.code === 'ERR_NETWORK' || error?.message === 'Network Error'
}

export async function readListWithOfflineFallback(entity, onlineFetch, toItems = defaultItems) {
  try {
    const data = await onlineFetch()
    const items = toItems(data)
    if (Array.isArray(items)) await saveLocalEntities(entity, items)
    return data
  } catch (error) {
    if (!isNetworkError(error)) throw error
    const items = await getLocalEntities(entity)
    return { items, __offline: true }
  }
}

export async function readEntityWithOfflineFallback(entity, id, onlineFetch) {
  try {
    const data = await onlineFetch()
    await saveLocalEntity(entity, data, id)
    return data
  } catch (error) {
    if (!isNetworkError(error)) throw error
    const items = await getLocalEntities(entity)
    const found = items.find((item) => String(item._id ?? item.id) === String(id))
    if (found) return { ...found, __offline: true }
    throw error
  }
}

export async function mutateOfflineFirst(entity, action, payload, options, onlineMutation, applyLocal) {
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const data = await onlineMutation()
      if (applyLocal) await applyLocal(data)
      return data
    } catch (error) {
      if (!isNetworkError(error)) throw error
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
