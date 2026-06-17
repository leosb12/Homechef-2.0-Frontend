import { api, invalidateApiCache } from '../../../shared/services/api'

export async function confirmCoinGateReturn(payload) {
  const { data } = await api.post('/orders/payments/bitcoin-coingate/confirm-return/', payload)
  invalidateApiCache('/orders/')
  return data
}
