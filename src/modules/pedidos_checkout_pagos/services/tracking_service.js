import { api, cachedGet, invalidateApiCache } from '../../../shared/services/api'
import { readWithScreenCache } from '../../../shared/services/screen_cache'
import { getMetadata, setMetadata } from '../../../shared/services/offline_db'
import { mutateOfflineFirst } from '../../../shared/services/offline_helpers'

export async function fetchClientOrderTracking(orderId) {
  return readWithScreenCache(
    `mod5.clientTracking.${orderId}`,
    () => cachedGet(`/orders/my-orders/${orderId}/tracking/`),
  )
}

export async function fetchChefOrderTracking(orderId) {
  return readWithScreenCache(
    `mod5.chefTracking.${orderId}`,
    () => cachedGet(`/orders/chef/orders/${orderId}/tracking/`),
  )
}

export async function createClientOrderIncident(orderId, payload) {
  const localId = `incident-temp-${crypto.randomUUID()}`
  return mutateOfflineFirst(
    'client_orders',
    'REPORT_INCIDENT',
    { order_id: orderId, ...payload },
    { local_id: localId, server_id: orderId, endpoint: `/orders/my-orders/${orderId}/incidents/`, method: 'POST' },
    async () => {
      const { data } = await api.post(`/orders/my-orders/${orderId}/incidents/`, payload)
      invalidateApiCache(`/orders/my-orders/${orderId}`)
      return data
    },
    async () => {
      // Optimistically insert incident into local tracking screen snapshot
      const key = `screen_snapshot:mod5.clientTracking.${orderId}`
      const snapshot = await getMetadata(key)
      if (snapshot?.data) {
        const incidents = snapshot.data.incidents || { items: [], open_count: 0 }
        const items = Array.isArray(incidents.items) ? [...incidents.items] : []
        items.push({
          id: localId,
          title: `Incidencia (${payload.code})`,
          code: payload.code,
          description: payload.description,
          status: 'pending',
          status_label: 'Pendiente',
          blocking: false,
          created_at: new Date().toISOString(),
          __offline: true
        })
        snapshot.data.incidents = {
          ...incidents,
          items,
          open_count: (incidents.open_count || 0) + 1
        }
        await setMetadata(key, snapshot)
      }
    }
  )
}

async function updateLocalIncidentInSnapshot(orderId, incidentId, notes) {
  const key = `screen_snapshot:mod5.chefTracking.${orderId}`
  const snapshot = await getMetadata(key)
  if (snapshot?.data?.incidents?.items) {
    snapshot.data.incidents.items = snapshot.data.incidents.items.map((inc) => {
      if (String(inc.id) === String(incidentId)) {
        return {
          ...inc,
          status: 'resolved',
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolution_notes: notes,
        }
      }
      return inc
    })
    const openCount = snapshot.data.incidents.open_count || 0
    snapshot.data.incidents.open_count = Math.max(0, openCount - 1)
    await setMetadata(key, snapshot)
  }
}

export async function resolveChefOrderIncident(orderId, incidentId, payload) {
  return mutateOfflineFirst(
    'chef_orders',
    'RESOLVE_INCIDENT',
    { order_id: orderId, incident_id: incidentId, ...payload },
    {
      local_id: `${orderId}-${incidentId}`,
      server_id: `${orderId}-${incidentId}`,
      endpoint: `/orders/chef/orders/${orderId}/incidents/${incidentId}/resolve/`,
      method: 'POST',
    },
    async () => {
      const { data } = await api.post(`/orders/chef/orders/${orderId}/incidents/${incidentId}/resolve/`, payload)
      invalidateApiCache(`/orders/chef/orders/${orderId}`)
      return data
    },
    async () => {
      await updateLocalIncidentInSnapshot(orderId, incidentId, payload.resolution_notes || '')
    }
  )
}
