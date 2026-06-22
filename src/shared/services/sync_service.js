import { api, invalidateApiCache } from './api'
import {
  OPERATION_STATUS,
  getConflicts,
  getDeviceId,
  getLastSync,
  getPendingOperations,
  isFailedOperation,
  isPendingOperation,
  removeSyncedOperations,
  replaceOperationIdForRetry,
  saveConflict,
  saveServerMapping,
  setLastSync,
} from './offline_queue'
import {
  getLocalEntities,
  markLocalEntityDeleted,
  putInStore,
  saveLocalEntities,
  saveLocalEntity,
  reconcileLocalEntityId,
  STORES,
} from './offline_db'
import { useSyncStore } from './sync_store'
import {
  checkConnectivity,
  getConnectivityState,
  initConnectivityService,
  subscribeConnectivity,
} from './connectivityService'
import { uploadFile } from './uploads'
import { logDebug } from './debug_logger'

const SYNC_ENDPOINT = '/sync/'
const AUTO_SYNC_COOLDOWN_MS = 5000

const SYNCABLE_ENTITIES = [
  'dishes',
  'chef_profiles',
  'chef_availability',
  'daily_menus',
  'favorites',
  'preferences',
  'reviews',
  'chef_inventory',
  'chef_orders',
  'chef_notifications',
  'client_profiles',
  'cart',
  'client_orders',
  'rider_profile',
  'rider_status',
  'rider_availability',
  'rider_assigned_orders',
  'rider_available_orders',
  'rider_order_details',
  'rider_tracking',
  'rider_delivery_history',
  'rider_notifications',
  'rider_incidents',
]

let syncPromise = null
let _connectivityUnsubscribe = null
let _started = false
let _lastBackendReachable = null
let _lastAutoSyncAt = 0

export function startConnectivitySync() {
  if (typeof window === 'undefined') return
  if (_started) return
  _started = true

  initConnectivityService()

  if (_connectivityUnsubscribe) _connectivityUnsubscribe()
  _connectivityUnsubscribe = subscribeConnectivity((connectivityState) => {
    useSyncStore.getState().applyConnectivityState(connectivityState)

    const backendJustReturned =
      connectivityState.backendReachable === true && _lastBackendReachable !== true
    _lastBackendReachable = connectivityState.backendReachable

    if (backendJustReturned) {
      logSync('backend status', {
        backendReachable: true,
        trigger: 'backend-reconnected',
      })
      void maybeAutoSync('backend-reconnected')
    }
  })

  window.addEventListener('online', () => {
    logDebug('DEBUG_CONNECTIVITY', '[Connectivity] browser online')
    useSyncStore.getState().setOnline(true)
    void checkConnectivity().then(() => maybeAutoSync('browser-online'))
  })

  window.addEventListener('offline', () => {
    logDebug('DEBUG_CONNECTIVITY', '[Connectivity] browser offline')
    useSyncStore.getState().setOnline(false)
    useSyncStore.getState().setSyncStatus('offline')
  })

  window.addEventListener('homechef:offline-queue-changed', refreshSyncCounts)
  window.addEventListener('homechef:offline-conflicts-changed', refreshSyncCounts)

  window.addEventListener('focus', () => {
    void checkConnectivity().then(() => maybeAutoSync('focus'))
  })

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void checkConnectivity().then(() => maybeAutoSync('visibility'))
    }
  })

  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'homechef:sync-request') {
        void maybeAutoSync('service-worker')
      }
    })
  }

  window.setInterval(() => {
    void maybeAutoSync('interval')
  }, 30000)

  void refreshSyncCounts()
  void checkConnectivity().then(() => maybeAutoSync('startup'))
}

export async function syncNow(manual = false, options = {}) {
  if (syncPromise) {
    logSync('started', { reusedExistingRun: true, manual, trigger: options.trigger })
    return syncPromise
  }

  syncPromise = runSync(manual, options).finally(() => {
    syncPromise = null
  })

  return syncPromise
}

export async function pushPendingOperations() {
  const result = createSyncResult('push-only')
  await prepareQueueForPush(result)
  return result
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
  const [operations, conflicts] = await Promise.all([getPendingOperations(), getConflicts()])
  const pendingCount = operations.filter(isPendingOperation).length
  const failedCount = operations.filter(isFailedOperation).length
  useSyncStore.getState().setCounts({
    pendingCount,
    failedCount,
    conflictCount: conflicts.length,
  })
  logDebug('DEBUG_SYNC', '[OfflineQueue] pending count', {
    pendingCount,
    failedCount,
    conflictCount: conflicts.length,
    ids: operations.filter(isPendingOperation).map((op) => op.operation_id),
  })
}

export async function getLocalList(entity) {
  return getLocalEntities(entity)
}

async function maybeAutoSync(trigger) {
  if (syncPromise || !hasAuthSession()) return

  await refreshSyncCounts()
  const state = useSyncStore.getState()
  if (state.pendingCount <= 0 || state.syncStatus === 'syncing') return
  if (Date.now() - _lastAutoSyncAt < AUTO_SYNC_COOLDOWN_MS) return

  let connectivity = getConnectivityState()
  if (connectivity.backendReachable !== true) {
    connectivity = await checkConnectivity()
    useSyncStore.getState().applyConnectivityState(connectivity)
  }

  logSync('backend status', {
    trigger,
    backendReachable: connectivity.backendReachable,
    connectionState: connectivity.connectionState,
    pendingCount: state.pendingCount,
  })

  if (connectivity.backendReachable !== true) return

  _lastAutoSyncAt = Date.now()
  void syncNow(false, { trigger })
}

async function runSync(manual, options) {
  const result = createSyncResult(options.trigger || (manual ? 'manual' : 'auto'))
  let shouldNotifyManual = manual

  try {
    await refreshSyncCounts()
    const beforeOperations = await getPendingOperations()
    result.totalBefore = beforeOperations.filter(isPendingOperation).length
    result.failedBefore = beforeOperations.filter(isFailedOperation).length

    logSync('started', {
      manual,
      trigger: result.trigger,
      totalBefore: result.totalBefore,
      failedBefore: result.failedBefore,
      ids: beforeOperations.filter(isPendingOperation).map((op) => op.operation_id),
    })

    if (!hasAuthSession()) {
      result.status = 'auth_invalid'
      result.errors.push('Sesion requerida para sincronizar. La cola local se conserva.')
      useSyncStore.getState().setSyncStatus('idle')
      useSyncStore.getState().setLastError(result.errors[0])
      return result
    }

    const connectivity = await checkConnectivity()
    result.backendStatus = {
      browserOnline: connectivity.browserOnline,
      backendReachable: connectivity.backendReachable,
      connectionState: connectivity.connectionState,
      errors: connectivity.errors,
    }
    useSyncStore.getState().applyConnectivityState(connectivity)

    logSync('backend status', result.backendStatus)

    if (connectivity.backendReachable !== true) {
      result.status = 'offline'
      result.remaining = result.totalBefore
      result.errors.push(connectivity.errors?.backend || 'Backend no disponible.')
      useSyncStore.getState().setSyncStatus('offline')
      useSyncStore.getState().setLastError(result.errors[0])
      return result
    }

    await revalidateAuthSession()
    if (!hasRealAuthSession()) {
      result.status = 'auth_invalid'
      result.remaining = result.totalBefore
      result.errors.push('Sesion invalida o vencida. Inicia sesion para sincronizar; la cola no fue borrada.')
      useSyncStore.getState().setSyncStatus('idle')
      useSyncStore.getState().setLastError(result.errors[0])
      return result
    }

    if (manual) {
      result.retried = await resetFailedOperationsForManualRetry()
    }

    useSyncStore.getState().setSyncStatus('syncing')
    useSyncStore.getState().setLastError('')

    const pullSince = await getLastSync()
    const pushResult = await prepareQueueForPush(result)
    Object.assign(result, pushResult)

    if (result.status !== 'auth_invalid' && result.status !== 'offline') {
      try {
        await pullChanges(pullSince)
      } catch (pullError) {
        const message = extractHttpErrorMessage(pullError) || 'No se pudieron descargar cambios del servidor.'
        result.errors.push(message)
        result.pullFailed = true
        logSync('failed', {
          phase: 'pull',
          error: message,
        })
      }
    }

    await refreshSyncCounts()
    const postState = useSyncStore.getState()
    result.remaining = postState.pendingCount
    result.failedTotal = postState.failedCount

    const conflicts = await getConflicts()
    if (result.status === 'auth_invalid') {
      useSyncStore.getState().setSyncStatus('idle')
    } else if (result.failed > 0 || result.pullFailed) {
      useSyncStore.getState().setSyncStatus('error')
    } else if (conflicts.length > 0 || result.conflicts > 0) {
      useSyncStore.getState().setSyncStatus('conflict')
    } else if (result.remaining > 0) {
      useSyncStore.getState().setSyncStatus('error')
    } else {
      useSyncStore.getState().setSyncStatus('idle')
    }

    if (result.errors.length > 0) {
      useSyncStore.getState().setLastError(result.errors[0])
    }
    useSyncStore.getState().setLastSyncAt(new Date().toISOString())
    return result
  } catch (error) {
    const message = extractHttpErrorMessage(error) || 'No se pudo sincronizar.'
    result.status = error?.response?.status === 401 || error?.response?.status === 403 ? 'auth_invalid' : 'error'
    result.errors.push(message)
    useSyncStore.getState().setLastError(message)
    useSyncStore.getState().setSyncStatus(result.status === 'auth_invalid' ? 'idle' : 'error')
    logSync('failed', {
      phase: 'sync',
      error: message,
    })
    return result
  } finally {
    await refreshSyncCounts()
    result.remaining = useSyncStore.getState().pendingCount
    result.failedTotal = useSyncStore.getState().failedCount
    logSync('finished', result)
    if (shouldNotifyManual && typeof window !== 'undefined') {
      alert(formatManualResult(result))
    }
  }
}

async function prepareQueueForPush(baseResult) {
  const result = { ...baseResult }
  const operations = await getPendingOperations()

  if (!operations.length) {
    result.status = 'idle'
    result.remaining = 0
    return result
  }

  await prepareFileUploads(operations, result)

  const currentOps = await getPendingOperations()
  const readyOps = currentOps.filter(isPendingOperation)
  result.totalBefore = result.totalBefore || readyOps.length

  if (!readyOps.length) {
    result.status = 'idle'
    result.remaining = 0
    return result
  }

  for (const op of readyOps) {
    op.status = OPERATION_STATUS.SYNCING
    op.updated_at = new Date().toISOString()
    await putInStore(STORES.operations, op)
  }
  notifyQueueChanged()

  const device_id = await getDeviceId()
  const last_sync = await getLastSync()

  for (const op of readyOps) {
    result.attempted += 1
    logSync('processing action', {
      id: op.operation_id,
      entity: op.entity,
      action: op.action,
      endpoint: op.endpoint,
      status: op.status,
    })

    try {
      const { data } = await api.post(SYNC_ENDPOINT, {
        device_id,
        last_sync,
        operations: [op],
      })
      await applyOperationSyncResponse(op, data, result)
      if (data?.server_time) await setLastSync(data.server_time)
    } catch (error) {
      const stop = await handleOperationHttpError(op, error, result)
      if (stop) break
    }
  }

  invalidateApiCache()
  notifyQueueChanged()
  const remainingOperations = await getPendingOperations()
  result.remaining = remainingOperations.filter(isPendingOperation).length
  if (result.status !== 'auth_invalid' && result.status !== 'offline') {
    result.status = result.errors.length > 0 || result.failed > 0 ? 'error' : 'idle'
  }
  return result
}

async function prepareFileUploads(operations, result) {
  for (const op of operations) {
    if (!op.payload?.image_file) continue

    const imageFile = op.payload.image_file
    const isFile =
      (typeof File !== 'undefined' && imageFile instanceof File) ||
      (typeof Blob !== 'undefined' && imageFile instanceof Blob)

    if (!isFile) {
      delete op.payload.image_file
      op.status = OPERATION_STATUS.PENDING
      op.last_error = 'Imagen local no disponible tras recargar; se sincronizara sin foto.'
      op.updated_at = new Date().toISOString()
      await putInStore(STORES.operations, op)
      logSync('failed', {
        phase: 'image-upload',
        id: op.operation_id,
        entity: op.entity,
        endpoint: op.endpoint,
        error: op.last_error,
      })
      continue
    }

    try {
      op.status = OPERATION_STATUS.SYNCING
      op.updated_at = new Date().toISOString()
      await putInStore(STORES.operations, op)

      const uploaded = await uploadFile(imageFile, op.entity === 'dishes' ? 'dish' : 'general')
      op.payload.image_url = uploaded.public_url || uploaded.file_path
      delete op.payload.image_file
      op.status = OPERATION_STATUS.PENDING
      op.updated_at = new Date().toISOString()
      await putInStore(STORES.operations, op)
    } catch (error) {
      delete op.payload.image_file
      op.status = OPERATION_STATUS.PENDING
      op.last_error = `Imagen no pudo subirse: ${error?.message || 'Error desconocido'}.`
      op.updated_at = new Date().toISOString()
      result.errors.push(op.last_error)
      await putInStore(STORES.operations, op)
      logSync('failed', {
        phase: 'image-upload',
        id: op.operation_id,
        entity: op.entity,
        endpoint: op.endpoint,
        error: op.last_error,
      })
    }
  }
}

async function applyOperationSyncResponse(op, responseData, result) {
  const syncedItem = findResponseItem(responseData?.synced, op.operation_id)
  if (syncedItem) {
    await removeSyncedOperations([op.operation_id])

    const item = typeof syncedItem === 'string' ? {} : syncedItem
    const local_id = item.local_id || item.operation?.local_id || op.local_id
    const server_id = item.server_id || item.id || item.operation?.server_id || op.server_id
    const entity = item.entity || item.operation?.entity || op.entity

    await saveServerMapping(local_id, server_id, entity)
    await reconcileLocalEntityId(entity, local_id, server_id)

    result.synced += 1
    result.syncedIds.push(op.operation_id)
    logSync('success', {
      id: op.operation_id,
      entity: op.entity,
      endpoint: op.endpoint,
      server_id,
    })
    return
  }

  const conflict = findResponseItem(responseData?.conflicts, op.operation_id)
  if (conflict) {
    const message = conflict.reason || 'Conflicto con datos del servidor.'
    op.status = OPERATION_STATUS.CONFLICT
    op.last_error = message
    op.error = message
    op.updated_at = new Date().toISOString()
    await putInStore(STORES.operations, op)
    await saveConflict({
      operation_id: conflict.operation_id || op.operation_id,
      entity: conflict.entity || op.entity,
      server_id: conflict.server_id || op.server_id,
      reason: message,
      server_data: conflict.server_data || conflict.server || null,
      client_data: conflict.client_data || conflict.client || op.payload || null,
    })
    result.conflicts += 1
    result.conflictIds.push(op.operation_id)
    result.errors.push(message)
    logSync('failed', {
      id: op.operation_id,
      entity: op.entity,
      endpoint: op.endpoint,
      status: op.status,
      error: message,
    })
    return
  }

  const failed = findResponseItem(responseData?.errors, op.operation_id)
  if (failed) {
    const message = failed.error || failed.message || 'Error en el servidor.'
    await markOperationFailed(op, message, result)
    return
  }

  await markOperationFailed(op, 'Backend no confirmo el resultado de esta accion.', result)
}

async function handleOperationHttpError(op, error, result) {
  const status = error?.response?.status
  const message = extractHttpErrorMessage(error) || 'Error de red.'

  if (status === 401 || status === 403) {
    op.status = OPERATION_STATUS.PENDING
    op.last_error = 'Sesion invalida o vencida. Re-login requerido.'
    op.error = op.last_error
    op.updated_at = new Date().toISOString()
    await putInStore(STORES.operations, op)
    result.status = 'auth_invalid'
    result.errors.push(op.last_error)
    logSync('failed', {
      id: op.operation_id,
      entity: op.entity,
      endpoint: op.endpoint,
      status: op.status,
      error: op.last_error,
    })
    return true
  }

  if (!error?.response || error?.code === 'ERR_NETWORK' || error?.name === 'AbortError') {
    op.status = OPERATION_STATUS.PENDING
    op.retry_count = (op.retry_count || 0) + 1
    op.last_error = message
    op.error = message
    op.updated_at = new Date().toISOString()
    await putInStore(STORES.operations, op)
    result.status = 'offline'
    result.errors.push(message)
    useSyncStore.getState().setSyncStatus('offline')
    logSync('failed', {
      id: op.operation_id,
      entity: op.entity,
      endpoint: op.endpoint,
      status: op.status,
      error: message,
    })
    return true
  }

  await markOperationFailed(op, message, result)
  return false
}

async function markOperationFailed(op, message, result) {
  const lower = String(message || '').toLowerCase()
  const isPermission =
    lower.includes('permiso') ||
    lower.includes('autorizado') ||
    lower.includes('pertenece') ||
    lower.includes('forbidden') ||
    lower.includes('403')

  op.status = isPermission ? OPERATION_STATUS.FAILED_PERMISSION : OPERATION_STATUS.FAILED
  op.last_error = message
  op.error = message
  op.retry_count = (op.retry_count || 0) + 1
  op.updated_at = new Date().toISOString()
  await putInStore(STORES.operations, op)

  result.failed += 1
  result.failedIds.push(op.operation_id)
  result.errors.push(message)
  logSync('failed', {
    id: op.operation_id,
    entity: op.entity,
    action: op.action,
    endpoint: op.endpoint,
    status: op.status,
    error: message,
  })
}

async function resetFailedOperationsForManualRetry() {
  const operations = await getPendingOperations()
  const failed = operations.filter(isFailedOperation)

  for (const op of failed) {
    await replaceOperationIdForRetry(op)
  }

  return failed.length
}

async function revalidateAuthSession() {
  try {
    const { revalidateSession } = await import('./offlineSessionService')
    await revalidateSession()
  } catch (error) {
    logSync('failed', {
      phase: 'auth-revalidate',
      error: error?.message || 'No se pudo revalidar sesion.',
    })
  }
}

async function applyServerChanges(data) {
  for (const entity of SYNCABLE_ENTITIES) {
    const changes = data?.[entity]
    if (!Array.isArray(changes)) continue

    for (const item of changes) {
      await applyServerEntityChange(entity, item)
    }
  }

  if (data?.changes && !Array.isArray(data.changes) && typeof data.changes === 'object') {
    for (const [entity, items] of Object.entries(data.changes)) {
      if (!Array.isArray(items)) continue
      for (const item of items) {
        await applyServerEntityChange(entity, item)
      }
    }
  }

  if (Array.isArray(data?.changes)) {
    for (const change of data.changes) {
      const entity = change.entity
      const payload = change.payload || change.data || change
      if (!entity) continue
      await applyServerEntityChange(entity, payload, change)
    }
  }

  for (const entity of SYNCABLE_ENTITIES) {
    const items = data?.entities?.[entity]
    if (Array.isArray(items)) await saveLocalEntities(entity, items)
  }
}

async function applyServerEntityChange(entity, payload, envelope = {}) {
  const id = payload?._id ?? payload?.id ?? envelope.server_id ?? envelope.local_id
  if (!entity || !id) return
  if (payload?.deleted_at || envelope.deleted_at) await markLocalEntityDeleted(entity, id)
  else await saveLocalEntity(entity, payload, id)
}

function hasAuthSession() {
  if (typeof window === 'undefined') return false
  return Boolean(localStorage.getItem('homechef_access_token'))
}

function hasRealAuthSession() {
  if (typeof window === 'undefined') return false
  const token = localStorage.getItem('homechef_access_token')
  return Boolean(token && token !== 'offline_placeholder_token')
}

function createSyncResult(trigger) {
  return {
    trigger,
    status: 'idle',
    totalBefore: 0,
    failedBefore: 0,
    attempted: 0,
    synced: 0,
    failed: 0,
    conflicts: 0,
    remaining: 0,
    retried: 0,
    failedTotal: 0,
    pullFailed: false,
    syncedIds: [],
    failedIds: [],
    conflictIds: [],
    errors: [],
    backendStatus: null,
  }
}

function findResponseItem(items = [], operationId) {
  if (!Array.isArray(items)) return null
  return items.find((item) => {
    const id = typeof item === 'string' ? item : item?.operation_id || item?.id
    return String(id) === String(operationId)
  }) || null
}

function extractHttpErrorMessage(error) {
  const data = error?.response?.data
  if (!data) return error?.message || ''
  if (typeof data === 'string') return data
  if (typeof data.detail === 'string') return data.detail
  if (Array.isArray(data.detail)) return data.detail.join(', ')
  try {
    return JSON.stringify(data)
  } catch {
    return error?.message || ''
  }
}

function notifyQueueChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('homechef:offline-queue-changed'))
  }
}

function formatManualResult(result) {
  if (result.totalBefore === 0 && result.failedBefore === 0 && result.attempted === 0) {
    return 'No hay acciones pendientes para sincronizar.'
  }

  if (result.status === 'offline') {
    return `No se pudo sincronizar: backend no disponible.\n${result.synced} sincronizada(s), ${result.remaining} restante(s).\nMotivo: ${result.errors[0] || 'Sin respuesta del servidor.'}`
  }

  if (result.status === 'auth_invalid') {
    return `No se pudo sincronizar: sesion invalida o vencida.\n${result.synced} sincronizada(s), ${result.remaining} restante(s).\nLa cola pendiente se conserva.`
  }

  const base = `Sincronizacion finalizada.\n${result.synced} sincronizada(s), ${result.failed} fallida(s), ${result.conflicts} conflicto(s), ${result.remaining} restante(s).`
  if (result.errors.length > 0) {
    return `${base}\nMotivo: ${result.errors[0]}`
  }
  if (result.totalBefore > 0 && result.synced === 0 && result.remaining > 0) {
    return `${base}\nMotivo: el backend no confirmo ninguna accion.`
  }
  return base
}

function logSync(message, extra = {}) {
  logDebug('DEBUG_SYNC', `[Sync] ${message}`, extra)
}
