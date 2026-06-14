import { api, invalidateApiCache } from '../../../shared/services/api'

export async function previewCheckout(payload) {
  const { data } = await api.post('/orders/checkout/preview/', payload)
  return data
}

export async function previewCheckoutRoute(payload) {
  const { data } = await api.post('/orders/checkout/route-preview/', payload)
  return data
}

export async function confirmCheckout(payload) {
  const { data } = await api.post('/orders/checkout/confirm/', payload)
  invalidateApiCache('/orders/cart/')
  invalidateApiCache('/orders/')
  return data
}
