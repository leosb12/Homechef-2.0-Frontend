import { api } from '../../../shared/services/api'
import {
  getLocalEntities,
  getLocalEntity,
  saveLocalEntities,
  saveLocalEntity,
  getMetadata,
  setMetadata,
} from '../../../shared/services/offline_db'
import { enqueueOperation, getPendingOperations, enqueueOrUpdateLocationPing } from '../../../shared/services/offline_queue'
import { isBackendReachable } from '../../../shared/services/connectivityService'
import { syncNow } from '../../../shared/services/sync_service'

// Helpers
export async function getCachedRiderModule(moduleName) {
  return getLocalEntities(moduleName)
}

export async function saveCachedRiderModule(moduleName, records) {
  return saveLocalEntities(moduleName, records)
}

export async function updateCachedRiderEntity(moduleName, entityId, patch) {
  const existing = await getLocalEntity(moduleName, entityId)
  if (existing) {
    return saveLocalEntity(moduleName, { ...existing, ...patch }, entityId)
  }
}

export async function queueRiderMutation(mutation) {
  return enqueueOperation(mutation.entity, mutation.action, mutation.payload, mutation.options)
}

export async function getPendingRiderMutations() {
  const ops = await getPendingOperations()
  return ops.filter(op => op.entity.startsWith('rider_') || op.entity === 'rider_orders')
}

export async function processRiderMutationQueue() {
  return syncNow()
}

export async function getRiderSyncMetadata() {
  return getMetadata('rider_sync_metadata')
}

export async function saveRiderSyncMetadata(meta) {
  return setMetadata('rider_sync_metadata', meta)
}

// Check network error
function isNetworkError(error) {
  return !error?.response || error?.code === 'ERR_NETWORK' || error?.message === 'Network Error'
}

// Service APIs

export async function fetchAssignedDeliveries() {
  if (isBackendReachable()) {
    try {
      const { data } = await api.get('/delivery/assigned/')
      await saveLocalEntities('rider_assigned_orders', data)
      return data
    } catch (err) {
      if (!isNetworkError(err)) throw err
    }
  }
  return getLocalEntities('rider_assigned_orders')
}

export async function fetchActiveDeliveries() {
  if (isBackendReachable()) {
    try {
      const { data } = await api.get('/delivery/active/')
      await saveLocalEntities('rider_assigned_orders', data)
      return data
    } catch (err) {
      if (!isNetworkError(err)) throw err
    }
  }
  const cached = await getLocalEntities('rider_assigned_orders')
  return cached.filter(o => ['ASSIGNED', 'EN_ROUTE_TO_CHEF', 'AT_CHEF', 'PICKED_UP', 'EN_ROUTE_TO_CLIENT'].includes(o.status))
}

export async function fetchAvailability() {
  if (isBackendReachable()) {
    try {
      const { data } = await api.get('/delivery/availability/')
      await saveLocalEntity('rider_availability', data, 'status')
      return data
    } catch (err) {
      if (!isNetworkError(err)) throw err
    }
  }
  return getLocalEntity('rider_availability', 'status')
}

export async function updateAvailability(manualStatus) {
  const online = isBackendReachable()
  if (online) {
    try {
      const { data } = await api.post('/delivery/availability/', { manual_status: manualStatus })
      await saveLocalEntity('rider_availability', data, 'status')
      return data
    } catch (err) {
      if (!isNetworkError(err)) throw err
    }
  }
  
  const operation = await enqueueOperation('rider_availability', 'UPDATE', { manual_status: manualStatus }, {
    local_id: 'rider-availability-status',
    server_id: 'status',
    endpoint: '/delivery/availability/',
    method: 'POST',
  })
  const updated = {
    manual_status: manualStatus,
    effective_status: manualStatus === 'DISPONIBLE' ? 'DISPONIBLE' : 'FUERA_DE_SERVICIO',
    active_assignments_count: 0,
    __offline: true,
  }
  await saveLocalEntity('rider_availability', updated, 'status')
  void syncNow()
  return updated
}

export async function fetchAvailableOffers() {
  if (isBackendReachable()) {
    try {
      const { data } = await api.get('/delivery/open-board/')
      await saveLocalEntities('rider_available_orders', data)
      return data
    } catch (err) {
      if (!isNetworkError(err)) throw err
    }
  }
  return getLocalEntities('rider_available_orders')
}

export async function fetchDeliveryDetail(assignmentId) {
  if (isBackendReachable()) {
    try {
      const { data } = await api.get(`/delivery/${assignmentId}/`)
      await saveLocalEntity('rider_order_details', data, assignmentId)
      return data
    } catch (err) {
      if (!isNetworkError(err)) throw err
    }
  }
  return getLocalEntity('rider_order_details', assignmentId)
}

export async function acceptDelivery(assignmentId) {
  return handleOrderMutation(assignmentId, 'ACCEPT', `/delivery/${assignmentId}/accept/`)
}

export async function claimDelivery(assignmentId) {
  return handleOrderMutation(assignmentId, 'CLAIM', `/delivery/${assignmentId}/claim/`)
}

export async function rejectDelivery(assignmentId) {
  return handleOrderMutation(assignmentId, 'REJECT', `/delivery/${assignmentId}/reject/`)
}

export async function cancelDelivery(assignmentId) {
  return handleOrderMutation(assignmentId, 'CANCEL', `/delivery/${assignmentId}/cancel/`)
}

export async function confirmArrivedChef(assignmentId) {
  return handleOrderMutation(assignmentId, 'ARRIVED_CHEF', `/delivery/${assignmentId}/arrived-chef/`)
}

export async function confirmPickedUp(assignmentId) {
  return handleOrderMutation(assignmentId, 'PICKED_UP', `/delivery/${assignmentId}/picked-up/`)
}

export async function confirmDelivered(assignmentId) {
  return handleOrderMutation(assignmentId, 'DELIVERED', `/delivery/${assignmentId}/delivered/`)
}

async function handleOrderMutation(assignmentId, action, url) {
  const online = isBackendReachable()
  if (online) {
    try {
      const { data } = await api.post(url)
      await saveLocalEntity('rider_order_details', data, assignmentId)
      return data
    } catch (err) {
      if (!isNetworkError(err)) throw err
    }
  }

  const payload = { assignment_id: assignmentId }
  const op = await enqueueOperation('rider_orders', action, payload, {
    local_id: String(assignmentId),
    server_id: assignmentId,
    endpoint: url,
    method: 'POST',
  })
  
  const detail = await getLocalEntity('rider_order_details', assignmentId)
  if (detail) {
    const nextStatus = getNextStatusForAction(action)
    const updatedDetail = {
      ...detail,
      status: nextStatus,
      __offline: true,
      __operation_id: op.operation_id,
    }
    await saveLocalEntity('rider_order_details', updatedDetail, assignmentId)
    const assigned = await getLocalEntities('rider_assigned_orders')
    const updatedAssigned = assigned.map(o => o.id === assignmentId ? { ...o, status: nextStatus, __offline: true } : o)
    await saveLocalEntities('rider_assigned_orders', updatedAssigned)
  }
  void syncNow()
  return { id: assignmentId, status: getNextStatusForAction(action), __offline: true }
}

function getNextStatusForAction(action) {
  const map = {
    ACCEPT: 'ASSIGNED',
    CLAIM: 'ASSIGNED',
    REJECT: 'CANCELLED',
    CANCEL: 'CANCELLED',
    ARRIVED_CHEF: 'AT_CHEF',
    PICKED_UP: 'PICKED_UP',
    DELIVERED: 'DELIVERED',
  }
  return map[action] || 'ASSIGNED'
}

export async function fetchIncidents(assignmentId) {
  if (isBackendReachable()) {
    try {
      const { data } = await api.get(`/delivery/${assignmentId}/incidents/`)
      await saveLocalEntities(`rider_incidents_${assignmentId}`, data)
      return data
    } catch (err) {
      if (!isNetworkError(err)) throw err
    }
  }
  return getLocalEntities(`rider_incidents_${assignmentId}`)
}

export async function reportIncident(assignmentId, code, description) {
  const online = isBackendReachable()
  if (online) {
    try {
      const { data } = await api.post(`/delivery/${assignmentId}/incidents/`, { code, description })
      return data
    } catch (err) {
      if (!isNetworkError(err)) throw err
    }
  }

  const payload = { assignment_id: assignmentId, code, description }
  const op = await enqueueOperation('rider_incidents', 'REPORT', payload, {
    local_id: `incident-${assignmentId}-${Date.now()}`,
    server_id: assignmentId,
    endpoint: `/delivery/${assignmentId}/incidents/`,
    method: 'POST',
  })
  
  const newIncident = {
    id: op.operation_id,
    assignment_id: assignmentId,
    code,
    description,
    status: 'OPEN',
    reported_by_role: 'REPARTIDOR',
    created_at: new Date().toISOString(),
    __offline: true,
  }
  
  const currentIncidents = await getLocalEntities(`rider_incidents_${assignmentId}`)
  await saveLocalEntities(`rider_incidents_${assignmentId}`, [newIncident, ...currentIncidents])
  void syncNow()
  return newIncident
}

export async function resolveIncident(assignmentId, incidentId, resolutionNotes) {
  const online = isBackendReachable()
  if (online) {
    try {
      const { data } = await api.post(`/delivery/${assignmentId}/incidents/${incidentId}/resolve/`, { resolution_notes: resolutionNotes })
      return data
    } catch (err) {
      if (!isNetworkError(err)) throw err
    }
  }

  const payload = { assignment_id: assignmentId, incident_id: incidentId, resolution_notes: resolutionNotes }
  await enqueueOperation('rider_incidents', 'RESOLVE', payload, {
    local_id: `${assignmentId}-${incidentId}`,
    server_id: incidentId,
    endpoint: `/delivery/${assignmentId}/incidents/${incidentId}/resolve/`,
    method: 'POST',
  })
  
  const currentIncidents = await getLocalEntities(`rider_incidents_${assignmentId}`)
  const updated = currentIncidents.map(inc => inc.id === incidentId ? { ...inc, status: 'RESOLVED', resolution_notes: resolutionNotes, resolved_at: new Date().toISOString(), __offline: true } : inc)
  await saveLocalEntities(`rider_incidents_${assignmentId}`, updated)
  void syncNow()
  return { id: incidentId, status: 'RESOLVED', __offline: true }
}

export async function sendLocationPing(assignmentId, location) {
  const online = isBackendReachable()
  if (online) {
    try {
      const { data } = await api.post(`/delivery/${assignmentId}/location-pings/`, location)
      return data
    } catch (err) {
      if (!isNetworkError(err)) throw err
    }
  }
  
  await saveLocalEntity('rider_tracking', { assignment_id: assignmentId, ...location }, 'last_location')
  await enqueueOrUpdateLocationPing(assignmentId, location)
}

export async function fetchRouteSnapshot(assignmentId) {
  if (isBackendReachable()) {
    try {
      const { data } = await api.get(`/delivery/${assignmentId}/route/`)
      await saveLocalEntity('rider_tracking', data, `route_${assignmentId}`)
      return data
    } catch (err) {
      if (!isNetworkError(err)) throw err
    }
  }
  return getLocalEntity('rider_tracking', `route_${assignmentId}`)
}

// FASE 6 Required functions and wrappers
export async function fetchRiderProfile() {
  if (isBackendReachable()) {
    try {
      const { data } = await api.get('/auth/profile/')
      await saveLocalEntities('rider_profile', [data])
      return data
    } catch (err) {
      if (!isNetworkError(err)) throw err
    }
  }
  const cached = await getLocalEntities('rider_profile')
  return cached[0] || null
}

export async function updateRiderProfile(payload) {
  const online = isBackendReachable()
  if (online) {
    try {
      const { data } = await api.patch('/auth/profile/', payload)
      await saveLocalEntities('rider_profile', [data])
      return data
    } catch (err) {
      if (!isNetworkError(err)) throw err
    }
  }
  const op = await enqueueOperation('rider_profile', 'UPDATE', payload, {
    local_id: 'rider-profile-me',
    server_id: 'me',
    endpoint: '/auth/profile/',
    method: 'PATCH',
  })
  const cached = await getLocalEntities('rider_profile')
  const updated = { ...cached[0], ...payload, __offline: true, __operation_id: op.operation_id }
  await saveLocalEntities('rider_profile', [updated])
  void syncNow()
  return updated
}

export async function fetchRiderAvailability() {
  return fetchAvailability()
}

export async function updateRiderAvailability(manualStatus) {
  return updateAvailability(manualStatus)
}

export async function fetchRiderAssignedOrders() {
  return fetchAssignedDeliveries()
}

export async function fetchRiderActiveDelivery() {
  return fetchActiveDeliveries()
}

export async function fetchRiderAvailableOrders() {
  return fetchAvailableOffers()
}

export async function fetchRiderHistory() {
  return getLocalEntities('rider_delivery_history')
}

export async function fetchRiderIncidents(assignmentId) {
  return fetchIncidents(assignmentId)
}

export async function reportRiderIncident(assignmentId, code, description) {
  return reportIncident(assignmentId, code, description)
}

export async function markPickedUp(assignmentId) {
  return confirmPickedUp(assignmentId)
}

export async function markOnTheWay(assignmentId) {
  return confirmArrivedChef(assignmentId)
}

export async function markDelivered(assignmentId) {
  return confirmDelivered(assignmentId)
}

export async function markFailedDelivery(assignmentId) {
  return cancelDelivery(assignmentId)
}

export async function updateRiderLocation(assignmentId, location) {
  return sendLocationPing(assignmentId, location)
}
