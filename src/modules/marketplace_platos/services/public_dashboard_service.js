import { api, cachedGet, invalidateApiCache } from '../../../shared/services/api'
import {
  mutateOfflineFirst,
  readListWithOfflineFallback,
  saveLocalDelete,
  saveLocalUpsert,
} from '../../../shared/services/offline_helpers'
import { getLocalEntities } from '../../../shared/services/offline_db'

export async function fetchPublicDashboard() {
  return cachedGet('/marketplace/public-dashboard/')
}

export async function fetchClientExplore(params = {}) {
  return cachedGet('/marketplace/client/explore/', { params })
}

export async function fetchDishDetail(dishId) {
  return cachedGet(`/marketplace/client/dishes/${dishId}/detail/`)
}

export async function fetchChefPublicProfile(chefId) {
  return cachedGet(`/marketplace/client/chefs/${chefId}/profile/`)
}

export async function fetchChefReputation(chefId) {
  return cachedGet(`/marketplace/client/chefs/${chefId}/reputation/`)
}

export async function createChefReview(chefId, payload) {
  const localId = `review-temp-${crypto.randomUUID()}`
  return mutateOfflineFirst(
    'reviews',
    'CREATE',
    { ...payload, chef_id: chefId, review_type: 'chef' },
    { local_id: localId, server_id: null, version: payload.version },
    async () => {
      const { data } = await api.post(`/marketplace/client/chefs/${chefId}/reviews/`, payload)
      invalidateApiCache(`/marketplace/client/chefs/${chefId}/`)
      invalidateApiCache('/marketplace/client/explore/')
      return data
    },
    (data) => saveLocalUpsert('reviews', data, data._id || data.id || localId),
  )
}

export async function createDishReview(dishId, payload) {
  const localId = `review-temp-${crypto.randomUUID()}`
  return mutateOfflineFirst(
    'reviews',
    'CREATE',
    { ...payload, dish_id: dishId },
    { local_id: localId, server_id: null, version: payload.version },
    async () => {
      const { data } = await api.post(`/marketplace/client/dishes/${dishId}/reviews/`, payload)
      invalidateApiCache(`/marketplace/client/dishes/${dishId}/detail/`)
      invalidateApiCache('/marketplace/client/explore/')
      return data
    },
    (data) => saveLocalUpsert('reviews', data, data._id || data.id || localId),
  )
}

export async function addDishToCart(dishId, quantity) {
  const { data } = await api.post(`/marketplace/client/dishes/${dishId}/add-to-cart/`, { quantity })
  return data
}

export async function fetchFavorites() {
  return readListWithOfflineFallback('favorites', () => cachedGet('/marketplace/client/favorites/'))
}

export async function addFavorite(favorite_type, ref_id) {
  const payload = { favorite_type, ref_id }
  const localId = `favorite-temp-${crypto.randomUUID()}`
  return mutateOfflineFirst(
    'favorites',
    'CREATE',
    payload,
    { local_id: localId, server_id: null },
    async () => {
      const { data } = await api.post('/marketplace/client/favorites/', payload)
      invalidateFavoriteCache(favorite_type, ref_id)
      return data
    },
    (data) => saveLocalUpsert('favorites', data, data._id || data.id || localId),
  )
}

export async function removeFavorite(favorite_type, ref_id) {
  const localId = `${favorite_type}-${ref_id}`
  return mutateOfflineFirst(
    'favorites',
    'DELETE',
    { favorite_type, ref_id },
    { local_id: localId, server_id: localId },
    async () => {
      const { data } = await api.delete(`/marketplace/client/favorites/${favorite_type}/${ref_id}/`)
      invalidateFavoriteCache(favorite_type, ref_id)
      return data
    },
    () => deleteLocalFavorite(favorite_type, ref_id, localId),
  )
}

export async function fetchPreferences() {
  try {
    const data = await cachedGet('/marketplace/client/preferences/')
    await saveLocalUpsert('preferences', data, 'me')
    return data
  } catch (error) {
    return readListWithOfflineFallback('preferences', () => Promise.reject(error))
      .then((data) => data.items?.[0] || {})
  }
}

export async function savePreferences(payload) {
  return mutateOfflineFirst(
    'preferences',
    'UPDATE',
    payload,
    { local_id: 'preferences-me', server_id: 'me', version: payload.version },
    async () => {
      const { data } = await api.put('/marketplace/client/preferences/', payload)
      invalidateApiCache('/marketplace/client/preferences/')
      invalidateApiCache('/marketplace/client/explore/')
      return data
    },
    (data) => saveLocalUpsert('preferences', data, 'me'),
  )
}

function invalidateFavoriteCache(favorite_type, ref_id) {
  invalidateApiCache('/marketplace/client/favorites/')
  invalidateApiCache('/marketplace/client/explore/')
  if (favorite_type === 'dish') invalidateApiCache(`/marketplace/client/dishes/${ref_id}/detail/`)
  if (favorite_type === 'chef') invalidateApiCache('/marketplace/client/dishes/')
}

async function deleteLocalFavorite(favorite_type, ref_id, fallbackId) {
  const items = await getLocalEntities('favorites')
  const found = items.find((item) => item.favorite_type === favorite_type && String(item.ref_id) === String(ref_id))
  await saveLocalDelete('favorites', found?._id || found?.id || fallbackId)
}
