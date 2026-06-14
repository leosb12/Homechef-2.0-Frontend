import { api, cachedGet, invalidateApiCache } from '../../../shared/services/api'

const BASE_PATH = '/trust-admin/notifications/'

export function fetchOperationalNotifications({ unreadOnly = false, limit = 50 } = {}) {
  return cachedGet(BASE_PATH, {
    params: {
      unread_only: unreadOnly ? 'true' : '',
      limit,
    },
  })
}

export async function markOperationalNotificationRead(notificationId) {
  const { data } = await api.post(`${BASE_PATH}${notificationId}/read/`, {})
  invalidateApiCache(BASE_PATH)
  return data
}

export async function markAllOperationalNotificationsRead() {
  const { data } = await api.post(`${BASE_PATH}read-all/`, {})
  invalidateApiCache(BASE_PATH)
  return data
}
