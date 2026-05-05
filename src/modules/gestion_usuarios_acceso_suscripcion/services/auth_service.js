import { api } from '../../../shared/services/api'

export async function registerUser(payload) {
  const { data } = await api.post('/auth/register/', payload)
  return data
}

export async function loginUser(payload) {
  const { data } = await api.post('/auth/login/', payload)
  return data
}

export async function requestPasswordRecovery(payload) {
  const { data } = await api.post('/auth/recover-password/request/', payload)
  return data
}

export async function confirmPasswordRecovery(payload) {
  const { data } = await api.post('/auth/recover-password/confirm/', payload)
  return data
}

export async function fetchProfile() {
  const { data } = await api.get('/auth/profile/')
  return data
}

export async function updateProfile(payload) {
  const { data } = await api.put('/auth/profile/', payload)
  return data
}

export async function changePassword(payload) {
  const { data } = await api.put('/auth/profile/change-password/', payload)
  return data
}

export async function logoutUser() {
  const { data } = await api.post('/auth/logout/', {})
  return data
}
