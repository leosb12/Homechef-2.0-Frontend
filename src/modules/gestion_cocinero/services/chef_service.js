import { api, cachedGet, invalidateApiCache } from '../../../shared/services/api'
import {
  mutateOfflineFirst,
  readListWithOfflineFallback,
  saveLocalDelete,
  saveLocalUpsert,
} from '../../../shared/services/offline_helpers'

export async function fetchChefDashboard() {
  return cachedGet('/chef/dashboard/')
}

export async function fetchChefProfile() {
  try {
    const data = await cachedGet('/chef/profile/')
    await saveLocalUpsert('chef_profiles', data, 'me')
    return data
  } catch (error) {
    return readListWithOfflineFallback('chef_profiles', () => Promise.reject(error), (data) => data?.items || [])
      .then((data) => data.items?.[0] || {})
  }
}

export async function saveChefProfile(payload) {
  return mutateOfflineFirst(
    'chef_profiles',
    'UPDATE',
    payload,
    { local_id: 'chef-profile-me', server_id: 'me' },
    async () => {
      const { data } = await api.put('/chef/profile/', payload)
      invalidateApiCache('/chef/profile/')
      invalidateApiCache('/marketplace/')
      return data
    },
    (data) => saveLocalUpsert('chef_profiles', data, 'me'),
  )
}

export async function saveChefLocation(payload) {
  return mutateOfflineFirst(
    'chef_profiles',
    'UPDATE',
    payload,
    { local_id: 'chef-profile-location-me', server_id: 'me' },
    async () => {
      const { data } = await api.put('/chef/profile/location/', payload)
      invalidateApiCache('/chef/profile/')
      invalidateApiCache('/marketplace/')
      return data
    },
    (data) => saveLocalUpsert('chef_profiles', { location: data }, 'me'),
  )
}

export async function fetchChefAvailability() {
  try {
    const data = await cachedGet('/chef/availability/')
    await saveLocalUpsert('chef_availability', data, 'me')
    return data
  } catch (error) {
    return readListWithOfflineFallback('chef_availability', () => Promise.reject(error))
      .then((data) => data.items?.[0] || {})
  }
}

export async function saveChefAvailability(payload) {
  return mutateOfflineFirst(
    'chef_availability',
    'UPDATE',
    payload,
    { local_id: 'chef-availability-me', server_id: payload.id || payload._id || 'me', version: payload.version },
    async () => {
      const { data } = await api.put('/chef/availability/', payload)
      invalidateApiCache('/chef/availability/')
      invalidateApiCache('/chef/dashboard/')
      invalidateApiCache('/marketplace/')
      return data
    },
    (data) => saveLocalUpsert('chef_availability', data, 'me'),
  )
}

export async function fetchChefDishes() {
  return readListWithOfflineFallback('dishes', () => cachedGet('/chef/dishes/'))
}

export async function createChefDish(payload) {
  const localId = `temp-dish-${crypto.randomUUID()}`
  return mutateOfflineFirst(
    'dishes',
    'CREATE',
    payload,
    { local_id: localId, server_id: null, version: payload.version },
    async () => {
      const { data } = await api.post('/chef/dishes/', payload)
      invalidateChefKitchenCache()
      return data
    },
    (data) => saveLocalUpsert('dishes', data, data._id || data.id || localId),
  )
}

export async function updateChefDish(dishId, payload) {
  return mutateOfflineFirst(
    'dishes',
    'UPDATE',
    payload,
    { local_id: String(dishId), server_id: dishId, version: payload.version },
    async () => {
      const { data } = await api.put(`/chef/dishes/${dishId}/`, payload)
      invalidateChefKitchenCache()
      invalidateApiCache(`/marketplace/client/dishes/${dishId}/detail/`)
      return data
    },
    (data) => saveLocalUpsert('dishes', data, dishId),
  )
}

export async function deleteChefDish(dishId) {
  return mutateOfflineFirst(
    'dishes',
    'DELETE',
    { id: dishId },
    { local_id: String(dishId), server_id: dishId },
    async () => {
      const { data } = await api.delete(`/chef/dishes/${dishId}/`)
      invalidateChefKitchenCache()
      invalidateApiCache(`/marketplace/client/dishes/${dishId}/detail/`)
      return data
    },
    () => saveLocalDelete('dishes', dishId),
  )
}

export async function fetchChefMenu() {
  try {
    const data = await cachedGet('/chef/menu/')
    await saveLocalUpsert('daily_menus', data, 'current')
    return data
  } catch (error) {
    return readListWithOfflineFallback('daily_menus', () => Promise.reject(error))
      .then((data) => data.items?.[0] || { items: [] })
  }
}

export async function saveChefMenu(payload) {
  return mutateOfflineFirst(
    'daily_menus',
    'UPDATE',
    payload,
    { local_id: 'daily-menu-current', server_id: 'current', version: payload.version },
    async () => {
      const { data } = await api.put('/chef/menu/', payload)
      invalidateChefKitchenCache()
      return data
    },
    (data) => saveLocalUpsert('daily_menus', data, 'current'),
  )
}

function invalidateChefKitchenCache() {
  invalidateApiCache('/chef/dashboard/')
  invalidateApiCache('/chef/dishes/')
  invalidateApiCache('/chef/menu/')
  invalidateApiCache('/marketplace/')
}
