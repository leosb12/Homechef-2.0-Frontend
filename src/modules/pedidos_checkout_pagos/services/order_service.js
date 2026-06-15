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

export async function repeatMyOrder(orderId) {
  const { data } = await api.post(`/orders/my-orders/${orderId}/repeat/`)
  invalidateApiCache('/orders/')
  invalidateApiCache('/orders/cart/')
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

export async function chefMarkPickupNoShow(orderId) {
  const { data } = await api.post(`/orders/chef/orders/${orderId}/pickup/no-show/`)
  invalidateApiCache('/orders/')
  return data
}

export async function chefExtendPickupRetention(orderId) {
  const { data } = await api.post(`/orders/chef/orders/${orderId}/pickup/extend-retention/`)
  invalidateApiCache('/orders/')
  return data
}

export async function chefClosePickupRetention(orderId) {
  const { data } = await api.post(`/orders/chef/orders/${orderId}/pickup/close-retention/`)
  invalidateApiCache('/orders/')
  return data
}

export async function fetchMyOrderReceipts(orderId) {
  return cachedGet(`/orders/my-orders/${orderId}/receipts/`)
}

export async function fetchChefOrderReceipts(orderId) {
  return cachedGet(`/orders/chef/orders/${orderId}/receipts/`)
}

export async function downloadMyOrderReceipt(orderId, receiptId, fileFormat = 'pdf') {
  return downloadReceipt(`/orders/my-orders/${orderId}/receipts/${receiptId}/download/`, fileFormat)
}

export async function downloadChefOrderReceipt(orderId, receiptId, fileFormat = 'pdf') {
  return downloadReceipt(`/orders/chef/orders/${orderId}/receipts/${receiptId}/download/`, fileFormat)
}

async function downloadReceipt(url, fileFormat) {
  const response = await api.get(url, {
    params: { file_format: fileFormat },
    responseType: 'blob',
  })
  const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' })
  const downloadUrl = window.URL.createObjectURL(blob)
  const fileName = extractFileName(response.headers['content-disposition']) || `comprobante.${fileFormat}`
  const anchor = document.createElement('a')
  anchor.href = downloadUrl
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.URL.revokeObjectURL(downloadUrl)
  return { fileName }
}

function extractFileName(contentDisposition = '') {
  const match = /filename=\"?([^"]+)\"?/i.exec(contentDisposition)
  return match?.[1] || ''
}
