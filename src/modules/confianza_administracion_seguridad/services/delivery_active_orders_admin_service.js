import { api } from '../../../shared/services/api'

const BASE_PATH = '/trust-admin/delivery-orders/active/'

export async function fetchActiveDeliveryOrders() {
  const { data } = await api.get(BASE_PATH)
  return data
}

export async function fetchActiveDeliveryOrderDetail(orderId) {
  const { data } = await api.get(`${BASE_PATH}${orderId}/`)
  return data
}
