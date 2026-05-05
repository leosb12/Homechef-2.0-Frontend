import { api } from '../../../shared/services/api'

export async function fetchChefDashboard() {
  const { data } = await api.get('/chef/dashboard/')
  return data
}

export async function fetchChefProfile() {
  const { data } = await api.get('/chef/profile/')
  return data
}

export async function saveChefProfile(payload) {
  const { data } = await api.put('/chef/profile/', payload)
  return data
}

export async function saveChefLocation(payload) {
  const { data } = await api.put('/chef/profile/location/', payload)
  return data
}

export async function fetchChefAvailability() {
  const { data } = await api.get('/chef/availability/')
  return data
}

export async function saveChefAvailability(payload) {
  const { data } = await api.put('/chef/availability/', payload)
  return data
}

export async function fetchChefDishes() {
  const { data } = await api.get('/chef/dishes/')
  return data
}

export async function createChefDish(payload) {
  const { data } = await api.post('/chef/dishes/', payload)
  return data
}

export async function updateChefDish(dishId, payload) {
  const { data } = await api.put(`/chef/dishes/${dishId}/`, payload)
  return data
}

export async function deleteChefDish(dishId) {
  const { data } = await api.delete(`/chef/dishes/${dishId}/`)
  return data
}

export async function fetchChefMenu() {
  const { data } = await api.get('/chef/menu/')
  return data
}

export async function saveChefMenu(payload) {
  const { data } = await api.put('/chef/menu/', payload)
  return data
}
