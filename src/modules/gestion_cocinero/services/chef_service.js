import { api, cachedGet, invalidateApiCache } from '../../../shared/services/api'

export async function fetchChefDashboard() {
  return cachedGet('/chef/dashboard/')
}

export async function fetchChefProfile() {
  return cachedGet('/chef/profile/')
}

export async function saveChefProfile(payload) {
  const { data } = await api.put('/chef/profile/', payload)
  invalidateApiCache('/chef/profile/')
  invalidateApiCache('/marketplace/')
  return data
}

export async function saveChefLocation(payload) {
  const { data } = await api.put('/chef/profile/location/', payload)
  invalidateApiCache('/chef/profile/')
  invalidateApiCache('/marketplace/')
  return data
}

export async function fetchChefAvailability() {
  return cachedGet('/chef/availability/')
}

export async function saveChefAvailability(payload) {
  const { data } = await api.put('/chef/availability/', payload)
  invalidateApiCache('/chef/availability/')
  invalidateApiCache('/chef/dashboard/')
  invalidateApiCache('/marketplace/')
  return data
}

export async function fetchChefDishes() {
  return cachedGet('/chef/dishes/')
}

export async function createChefDish(payload) {
  const { data } = await api.post('/chef/dishes/', payload)
  invalidateChefKitchenCache()
  return data
}

export async function updateChefDish(dishId, payload) {
  const { data } = await api.put(`/chef/dishes/${dishId}/`, payload)
  invalidateChefKitchenCache()
  invalidateApiCache(`/marketplace/client/dishes/${dishId}/detail/`)
  return data
}

export async function deleteChefDish(dishId) {
  const { data } = await api.delete(`/chef/dishes/${dishId}/`)
  invalidateChefKitchenCache()
  invalidateApiCache(`/marketplace/client/dishes/${dishId}/detail/`)
  return data
}

export async function fetchChefMenu() {
  return cachedGet('/chef/menu/')
}

export async function saveChefMenu(payload) {
  const { data } = await api.put('/chef/menu/', payload)
  invalidateChefKitchenCache()
  return data
}

function invalidateChefKitchenCache() {
  invalidateApiCache('/chef/dashboard/')
  invalidateApiCache('/chef/dishes/')
  invalidateApiCache('/chef/menu/')
  invalidateApiCache('/marketplace/')
}
