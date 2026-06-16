import { api } from '../../../shared/services/api'
import { readWithScreenCache } from '../../../shared/services/screen_cache'

const BASE_PATH = '/trust-admin/delivery-orders/active/'

export async function fetchActiveDeliveryOrders() {
  return readWithScreenCache('mod6.adminDeliveryOrders', async () => {
    const { data } = await api.get(BASE_PATH)
    return data
  })
}

export async function fetchActiveDeliveryOrderDetail(orderId) {
  return readWithScreenCache(`mod6.adminDeliveryOrder.${orderId}`, async () => {
    const { data } = await api.get(`${BASE_PATH}${orderId}/`)
    return data
  })
}
