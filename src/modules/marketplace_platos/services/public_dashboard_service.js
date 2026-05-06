import { api, cachedGet, invalidateApiCache } from '../../../shared/services/api'

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
  const { data } = await api.post(`/marketplace/client/chefs/${chefId}/reviews/`, payload)
  invalidateApiCache(`/marketplace/client/chefs/${chefId}/`)
  invalidateApiCache('/marketplace/client/explore/')
  return data
}

export async function createDishReview(dishId, payload) {
  const { data } = await api.post(`/marketplace/client/dishes/${dishId}/reviews/`, payload)
  invalidateApiCache(`/marketplace/client/dishes/${dishId}/detail/`)
  invalidateApiCache('/marketplace/client/explore/')
  return data
}

export async function addDishToCart(dishId, quantity) {
  const { data } = await api.post(`/marketplace/client/dishes/${dishId}/add-to-cart/`, { quantity })
  return data
}

export async function fetchFavorites() {
  return cachedGet('/marketplace/client/favorites/')
}

export async function addFavorite(favorite_type, ref_id) {
  const { data } = await api.post('/marketplace/client/favorites/', { favorite_type, ref_id })
  invalidateApiCache('/marketplace/client/favorites/')
  invalidateApiCache('/marketplace/client/explore/')
  if (favorite_type === 'dish') invalidateApiCache(`/marketplace/client/dishes/${ref_id}/detail/`)
  if (favorite_type === 'chef') invalidateApiCache('/marketplace/client/dishes/')
  return data
}

export async function removeFavorite(favorite_type, ref_id) {
  const { data } = await api.delete(`/marketplace/client/favorites/${favorite_type}/${ref_id}/`)
  invalidateApiCache('/marketplace/client/favorites/')
  invalidateApiCache('/marketplace/client/explore/')
  if (favorite_type === 'dish') invalidateApiCache(`/marketplace/client/dishes/${ref_id}/detail/`)
  if (favorite_type === 'chef') invalidateApiCache('/marketplace/client/dishes/')
  return data
}

export async function fetchPreferences() {
  return cachedGet('/marketplace/client/preferences/')
}

export async function savePreferences(payload) {
  const { data } = await api.put('/marketplace/client/preferences/', payload)
  invalidateApiCache('/marketplace/client/preferences/')
  invalidateApiCache('/marketplace/client/explore/')
  return data
}
