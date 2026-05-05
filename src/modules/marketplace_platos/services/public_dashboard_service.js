import { api } from '../../../shared/services/api'

export async function fetchPublicDashboard() {
  const { data } = await api.get('/marketplace/public-dashboard/')
  return data
}

export async function fetchClientExplore(params = {}) {
  const { data } = await api.get('/marketplace/client/explore/', { params })
  return data
}

export async function fetchDishDetail(dishId) {
  const { data } = await api.get(`/marketplace/client/dishes/${dishId}/detail/`)
  return data
}

export async function addDishToCart(dishId, quantity) {
  const { data } = await api.post(`/marketplace/client/dishes/${dishId}/add-to-cart/`, { quantity })
  return data
}

export async function fetchFavorites() {
  const { data } = await api.get('/marketplace/client/favorites/')
  return data
}

export async function addFavorite(favorite_type, ref_id) {
  const { data } = await api.post('/marketplace/client/favorites/', { favorite_type, ref_id })
  return data
}

export async function removeFavorite(favorite_type, ref_id) {
  const { data } = await api.delete(`/marketplace/client/favorites/${favorite_type}/${ref_id}/`)
  return data
}

export async function fetchPreferences() {
  const { data } = await api.get('/marketplace/client/preferences/')
  return data
}

export async function savePreferences(payload) {
  const { data } = await api.put('/marketplace/client/preferences/', payload)
  return data
}
