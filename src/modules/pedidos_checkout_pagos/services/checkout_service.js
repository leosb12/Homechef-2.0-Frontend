import { api, invalidateApiCache } from '../../../shared/services/api'
import { readWithScreenCache } from '../../../shared/services/screen_cache'

export async function previewCheckout(payload) {
  return readWithScreenCache(
    `mod5.checkout.preview.${payload?.cart_id || 'unknown'}`,
    async () => {
      const { data } = await api.post('/orders/checkout/preview/', payload)
      return data
    },
  )
}

export async function previewCheckoutRoute(payload) {
  return readWithScreenCache(
    `mod5.checkout.route.${payload?.cart_id || 'unknown'}`,
    async () => {
      const { data } = await api.post('/orders/checkout/route-preview/', payload)
      return data
    },
  )
}

export async function confirmCheckout(payload) {
  const { data } = await api.post('/orders/checkout/confirm/', payload)
  invalidateApiCache('/orders/cart/')
  invalidateApiCache('/orders/')
  return data
}
