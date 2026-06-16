import { api, cachedGet, invalidateApiCache } from '../../../shared/services/api'
import { readWithScreenCache } from '../../../shared/services/screen_cache'

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
  const { data } = await api.post(`/orders/my-orders/${orderId}/incidents/`, payload)
  invalidateApiCache(`/orders/my-orders/${orderId}`)
  return data
}

export async function resolveChefOrderIncident(orderId, incidentId, payload) {
  const { data } = await api.post(`/orders/chef/orders/${orderId}/incidents/${incidentId}/resolve/`, payload)
  invalidateApiCache(`/orders/chef/orders/${orderId}`)
  return data
}
