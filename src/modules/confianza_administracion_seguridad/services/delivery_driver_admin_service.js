import { api } from '../../../shared/services/api'

const BASE_PATH = '/trust-admin/delivery-drivers/'

export async function fetchDeliveryDrivers(params = {}) {
  const { data } = await api.get(BASE_PATH, { params })
  return data
}

export async function updateDeliveryDriverStatus(userId, approvalStatus) {
  const { data } = await api.post(`${BASE_PATH}${userId}/status/`, {
    approval_status: approvalStatus,
  })
  return data
}
