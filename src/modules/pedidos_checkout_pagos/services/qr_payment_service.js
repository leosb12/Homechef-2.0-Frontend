import { api, invalidateApiCache } from '../../../shared/services/api'

export async function fetchQrSession(sessionCode) {
  const { data } = await api.get(`/orders/payments/qr-sessions/${sessionCode}/`)
  return data
}

export async function startQrSession(sessionCode) {
  const { data } = await api.post(`/orders/payments/qr-sessions/${sessionCode}/start/`)
  invalidateApiCache('/orders/')
  return data
}

export async function confirmQrSession(sessionCode) {
  const { data } = await api.post(`/orders/payments/qr-sessions/${sessionCode}/confirm/`)
  invalidateApiCache('/orders/')
  return data
}

export async function cancelQrSession(sessionCode) {
  const { data } = await api.post(`/orders/payments/qr-sessions/${sessionCode}/cancel/`)
  invalidateApiCache('/orders/')
  return data
}
