import { api, cachedGet, invalidateApiCache } from '../../../shared/services/api'
import { readWithScreenCache, saveScreenSnapshot } from '../../../shared/services/screen_cache'
import { saveLocalEntities, saveLocalEntity, getLocalEntities, getLocalEntity, getMetadata, setMetadata } from '../../../shared/services/offline_db'
import { isNetworkError, mutateOfflineFirst } from '../../../shared/services/offline_helpers'

export async function fetchMyOrders() {
  return readWithScreenCache('mod5.clientOrders', () => cachedGet('/orders/my-orders/'))
}

export async function fetchMyOrderDetail(orderId) {
  return readWithScreenCache(`mod5.clientOrder.${orderId}`, () => cachedGet(`/orders/my-orders/${orderId}/`))
}

export async function cancelMyOrder(orderId) {
  return mutateOfflineFirst(
    'client_orders',
    'CANCEL',
    { order_id: orderId },
    { local_id: orderId, server_id: orderId, endpoint: `/orders/${orderId}/cancel/`, method: 'POST' },
    async () => {
      const { data } = await api.post(`/orders/${orderId}/cancel/`)
      invalidateApiCache('/orders/')
      return data
    },
    async () => {
      // Optimistically update order status in snapshots to CANCELLED
      const detailKey = `screen_snapshot:mod5.clientOrder.${orderId}`
      const detailSnapshot = await getMetadata(detailKey)
      if (detailSnapshot?.data) {
        if (detailSnapshot.data.order) detailSnapshot.data.order.status = 'CANCELLED'
        else detailSnapshot.data.status = 'CANCELLED'
        await setMetadata(detailKey, detailSnapshot)
      }

      const listKey = 'screen_snapshot:mod5.clientOrders'
      const listSnapshot = await getMetadata(listKey)
      if (listSnapshot?.data?.items) {
        listSnapshot.data.items = listSnapshot.data.items.map((item) => {
          if (String(item.id) === String(orderId)) {
            return { ...item, status: 'CANCELLED' }
          }
          return item
        })
        await setMetadata(listKey, listSnapshot)
      }
    }
  )
}

export async function repeatMyOrder(orderId) {
  const { data } = await api.post(`/orders/my-orders/${orderId}/repeat/`)
  invalidateApiCache('/orders/')
  invalidateApiCache('/orders/cart/')
  return data
}

export async function fetchChefOrders() {
  try {
    const data = await cachedGet('/orders/chef/orders/')
    if (data?.items) {
      await saveLocalEntities('chef_orders', data.items)
    }
    await saveScreenSnapshot('mod5.chefOrders', data)
    return data
  } catch (error) {
    if (!isNetworkError(error)) throw error
    const items = await getLocalEntities('chef_orders')
    if (items && items.length > 0) {
      return { items, __offline: true }
    }
    return readWithScreenCache('mod5.chefOrders', () => Promise.reject(error))
  }
}

export async function fetchChefOrderDetail(orderId) {
  try {
    const data = await cachedGet(`/orders/chef/orders/${orderId}/`)
    if (data?.order) {
      await saveLocalEntity('chef_orders', data.order, orderId)
    }
    await saveScreenSnapshot(`mod5.chefOrder.${orderId}`, data)
    return data
  } catch (error) {
    if (!isNetworkError(error)) throw error
    const order = await getLocalEntity('chef_orders', orderId)
    if (order) {
      return { order, __offline: true }
    }
    return readWithScreenCache(`mod5.chefOrder.${orderId}`, () => Promise.reject(error))
  }
}

async function updateLocalOrderStateInSnapshot(orderId, nextStatus, options = {}) {
  const orderEntity = await getLocalEntity('chef_orders', orderId)
  if (orderEntity) {
    if (nextStatus) orderEntity.status = nextStatus
    if (options.noShow) {
      if (!orderEntity.pickup) orderEntity.pickup = {}
      orderEntity.pickup.pickup_no_show_flag = true
    }
    if (options.extendRetention) {
      if (!orderEntity.pickup) orderEntity.pickup = {}
      orderEntity.pickup.retention_extension_count = (orderEntity.pickup.retention_extension_count || 0) + 1
    }
    orderEntity.synced = false
    await saveLocalEntity('chef_orders', orderEntity, orderId)
  }

  const detailKey = `screen_snapshot:mod5.chefOrder.${orderId}`
  const detailSnapshot = await getMetadata(detailKey)
  if (detailSnapshot?.data?.order) {
    const o = detailSnapshot.data.order
    if (nextStatus) o.status = nextStatus
    if (options.noShow) {
      if (!o.pickup) o.pickup = {}
      o.pickup.pickup_no_show_flag = true
    }
    if (options.extendRetention) {
      if (!o.pickup) o.pickup = {}
      o.pickup.retention_extension_count = (o.pickup.retention_extension_count || 0) + 1
    }
    o.synced = false
    await setMetadata(detailKey, detailSnapshot)
  }

  const listKey = 'screen_snapshot:mod5.chefOrders'
  const listSnapshot = await getMetadata(listKey)
  if (listSnapshot?.data?.items) {
    listSnapshot.data.items = listSnapshot.data.items.map((item) => {
      if (String(item.id) === String(orderId)) {
        const nextItem = { ...item }
        if (nextStatus) nextItem.status = nextStatus
        if (options.noShow) {
          if (!nextItem.pickup) nextItem.pickup = {}
          nextItem.pickup.pickup_no_show_flag = true
        }
        if (options.extendRetention) {
          if (!nextItem.pickup) nextItem.pickup = {}
          nextItem.pickup.retention_extension_count = (nextItem.pickup.retention_extension_count || 0) + 1
        }
        nextItem.synced = false
        return nextItem
      }
      return item
    })
    await setMetadata(listKey, listSnapshot)
  }
}

export async function chefAcceptOrder(orderId) {
  return mutateOfflineFirst(
    'chef_orders',
    'ACCEPT',
    { order_id: orderId },
    { local_id: orderId, server_id: orderId, endpoint: `/orders/chef/orders/${orderId}/accept/`, method: 'POST' },
    async () => {
      const { data } = await api.post(`/orders/chef/orders/${orderId}/accept/`)
      invalidateApiCache('/orders/')
      return data
    },
    async () => {
      await updateLocalOrderStateInSnapshot(orderId, 'ACCEPTED')
    }
  )
}

export async function chefRejectOrder(orderId) {
  return mutateOfflineFirst(
    'chef_orders',
    'REJECT',
    { order_id: orderId },
    { local_id: orderId, server_id: orderId, endpoint: `/orders/chef/orders/${orderId}/reject/`, method: 'POST' },
    async () => {
      const { data } = await api.post(`/orders/chef/orders/${orderId}/reject/`)
      invalidateApiCache('/orders/')
      return data
    },
    async () => {
      await updateLocalOrderStateInSnapshot(orderId, 'REJECTED')
    }
  )
}

export async function chefMarkPreparing(orderId) {
  return mutateOfflineFirst(
    'chef_orders',
    'PREPARING',
    { order_id: orderId },
    { local_id: orderId, server_id: orderId, endpoint: `/orders/chef/orders/${orderId}/preparing/`, method: 'POST' },
    async () => {
      const { data } = await api.post(`/orders/chef/orders/${orderId}/preparing/`)
      invalidateApiCache('/orders/')
      return data
    },
    async () => {
      await updateLocalOrderStateInSnapshot(orderId, 'PREPARING')
    }
  )
}

export async function chefMarkReady(orderId) {
  return mutateOfflineFirst(
    'chef_orders',
    'READY',
    { order_id: orderId },
    { local_id: orderId, server_id: orderId, endpoint: `/orders/chef/orders/${orderId}/ready/`, method: 'POST' },
    async () => {
      const { data } = await api.post(`/orders/chef/orders/${orderId}/ready/`)
      invalidateApiCache('/orders/')
      return data
    },
    async () => {
      const detail = await getLocalEntity('chef_orders', orderId)
      const targetStatus = detail?.fulfillment_type === 'delivery' ? 'READY_FOR_DELIVERY' : 'READY_FOR_PICKUP'
      await updateLocalOrderStateInSnapshot(orderId, targetStatus)
    }
  )
}

export async function chefConfirmPickup(orderId, pickupCode) {
  return mutateOfflineFirst(
    'chef_orders',
    'CONFIRM_PICKUP',
    { order_id: orderId, pickup_code: pickupCode },
    { local_id: orderId, server_id: orderId, endpoint: `/orders/chef/orders/${orderId}/pickup/confirm/`, method: 'POST' },
    async () => {
      const { data } = await api.post(`/orders/chef/orders/${orderId}/pickup/confirm/`, {
        pickup_code: pickupCode,
      })
      invalidateApiCache('/orders/')
      return data
    },
    async () => {
      await updateLocalOrderStateInSnapshot(orderId, 'PICKED_UP')
    }
  )
}

export async function chefMarkPickupNoShow(orderId) {
  return mutateOfflineFirst(
    'chef_orders',
    'PICKUP_NO_SHOW',
    { order_id: orderId },
    { local_id: orderId, server_id: orderId, endpoint: `/orders/chef/orders/${orderId}/pickup/no-show/`, method: 'POST' },
    async () => {
      const { data } = await api.post(`/orders/chef/orders/${orderId}/pickup/no-show/`)
      invalidateApiCache('/orders/')
      return data
    },
    async () => {
      await updateLocalOrderStateInSnapshot(orderId, null, { noShow: true })
    }
  )
}

export async function chefExtendPickupRetention(orderId) {
  return mutateOfflineFirst(
    'chef_orders',
    'EXTEND_RETENTION',
    { order_id: orderId },
    { local_id: orderId, server_id: orderId, endpoint: `/orders/chef/orders/${orderId}/pickup/extend-retention/`, method: 'POST' },
    async () => {
      const { data } = await api.post(`/orders/chef/orders/${orderId}/pickup/extend-retention/`)
      invalidateApiCache('/orders/')
      return data
    },
    async () => {
      await updateLocalOrderStateInSnapshot(orderId, null, { extendRetention: true })
    }
  )
}

export async function chefClosePickupRetention(orderId) {
  return mutateOfflineFirst(
    'chef_orders',
    'CLOSE_RETENTION',
    { order_id: orderId },
    { local_id: orderId, server_id: orderId, endpoint: `/orders/chef/orders/${orderId}/pickup/close-retention/`, method: 'POST' },
    async () => {
      const { data } = await api.post(`/orders/chef/orders/${orderId}/pickup/close-retention/`)
      invalidateApiCache('/orders/')
      return data
    },
    async () => {
      await updateLocalOrderStateInSnapshot(orderId, 'CANCELLED')
    }
  )
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
