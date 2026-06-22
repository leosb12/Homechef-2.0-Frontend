import { api, cachedGet, invalidateApiCache } from '../../../shared/services/api'
import { readWithScreenCache } from '../../../shared/services/screen_cache'
import { getMetadata, setMetadata } from '../../../shared/services/offline_db'
import { mutateOfflineFirst } from '../../../shared/services/offline_helpers'

const BASE_PATH = '/trust-admin/notifications/'

export function fetchOperationalNotifications({ unreadOnly = false, limit = 50 } = {}) {
  return readWithScreenCache('mod7.operationalNotifications', () =>
    cachedGet(BASE_PATH, {
      params: {
        unread_only: unreadOnly ? 'true' : '',
        limit,
      },
    })
  )
}

async function updateLocalNotificationStateInSnapshot(notificationId, all = false) {
  const key = 'screen_snapshot:mod7.operationalNotifications'
  const snapshot = await getMetadata(key)
  if (snapshot?.data) {
    if (all) {
      if (Array.isArray(snapshot.data.items)) {
        snapshot.data.items = snapshot.data.items.map((item) => ({ ...item, is_read: true }))
      }
      if (snapshot.data.summary) {
        snapshot.data.summary.unread_count = 0
      }
    } else if (notificationId) {
      let markedCount = 0
      if (Array.isArray(snapshot.data.items)) {
        snapshot.data.items = snapshot.data.items.map((item) => {
          if (String(item.id) === String(notificationId) && !item.is_read) {
            markedCount++
            return { ...item, is_read: true }
          }
          return item
        })
      }
      if (snapshot.data.summary) {
        snapshot.data.summary.unread_count = Math.max(0, (snapshot.data.summary.unread_count || 0) - markedCount)
      }
    }
    await setMetadata(key, snapshot)
  }
}

export async function markOperationalNotificationRead(notificationId) {
  return mutateOfflineFirst(
    'chef_notifications',
    'MARK_READ',
    { notification_id: notificationId },
    {
      local_id: String(notificationId),
      server_id: notificationId,
      endpoint: `${BASE_PATH}${notificationId}/read/`,
      method: 'POST',
    },
    async () => {
      const { data } = await api.post(`${BASE_PATH}${notificationId}/read/`, {})
      invalidateApiCache(BASE_PATH)
      return data
    },
    async () => {
      await updateLocalNotificationStateInSnapshot(notificationId)
    }
  )
}

export async function markAllOperationalNotificationsRead() {
  return mutateOfflineFirst(
    'chef_notifications',
    'MARK_ALL_READ',
    {},
    { local_id: 'read-all', server_id: 'read-all', endpoint: `${BASE_PATH}read-all/`, method: 'POST' },
    async () => {
      const { data } = await api.post(`${BASE_PATH}read-all/`, {})
      invalidateApiCache(BASE_PATH)
      return data
    },
    async () => {
      await updateLocalNotificationStateInSnapshot(null, true)
    }
  )
}

