import { api, cachedGet, invalidateApiCache } from '../../../shared/services/api'

export async function fetchMyOrders() {
  return cachedGet('/orders/my-orders/')
}

export async function fetchMyOrderDetail(orderId) {
  return cachedGet(`/orders/my-orders/${orderId}/`)
}

export async function cancelMyOrder(orderId) {
  const { data } = await api.post(`/orders/${orderId}/cancel/`)
  invalidateApiCache('/orders/')
  return data
}

export async function fetchChefOrders() {
  return cachedGet('/orders/chef/orders/')
}

export async function fetchChefOrderDetail(orderId) {
  return cachedGet(`/orders/chef/orders/${orderId}/`)
}

export async function chefAcceptOrder(orderId) {
  const { data } = await api.post(`/orders/chef/orders/${orderId}/accept/`)
  invalidateApiCache('/orders/')
  return data
}

export async function chefRejectOrder(orderId) {
  const { data } = await api.post(`/orders/chef/orders/${orderId}/reject/`)
  invalidateApiCache('/orders/')
  return data
}

export async function chefMarkPreparing(orderId) {
  const { data } = await api.post(`/orders/chef/orders/${orderId}/preparing/`)
  invalidateApiCache('/orders/')
  return data
}

export async function chefMarkReady(orderId) {
  const { data } = await api.post(`/orders/chef/orders/${orderId}/ready/`)
  invalidateApiCache('/orders/')
  return data
}

export async function chefConfirmPickup(orderId, pickupCode) {
  const { data } = await api.post(`/orders/chef/orders/${orderId}/pickup/confirm/`, {
    pickup_code: pickupCode,
  })
  invalidateApiCache('/orders/')
  return data
}
