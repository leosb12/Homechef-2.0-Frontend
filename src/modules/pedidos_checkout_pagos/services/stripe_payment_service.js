import { api, invalidateApiCache } from '../../../shared/services/api'

export async function confirmStripeReturn(payload) {
  const { data } = await api.post('/orders/payments/stripe/confirm-return/', payload)
  invalidateApiCache('/orders/')
  return data
}
