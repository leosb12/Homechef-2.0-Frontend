import { api, cachedGet, invalidateApiCache } from '../../../shared/services/api'
import { supabase } from '../../../shared/services/supabase_client'

export async function registerUser(payload) {
  const metadata = {
    first_name: payload.first_name,
    last_name: payload.last_name,
    full_name: `${payload.first_name || ''} ${payload.last_name || ''}`.trim(),
    phone: payload.phone,
    role: payload.role,
    accept_terms: payload.accept_terms,
    chef_specialties: payload.chef_specialties,
    chef_latitude: payload.chef_latitude,
    chef_longitude: payload.chef_longitude,
    chef_schedule: payload.chef_schedule,
  }

  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: { data: metadata },
  })
  if (error) throw error

  const supabaseUserId = data.user?.id
  if (!supabaseUserId) {
    throw new Error('Supabase no devolvio el identificador del usuario.')
  }

  const access = data.session?.access_token
  if (access) {
    localStorage.setItem('homechef_access_token', access)
  }

  await api.post('/auth/register/', {
    ...withoutPasswords(payload),
    supabase_user_id: supabaseUserId,
  })

  if (access) {
    await supabase.auth.signOut()
    localStorage.removeItem('homechef_access_token')
  }

  return {
    message: access
      ? 'Registro realizado correctamente.'
      : 'Registro iniciado. Revisa tu correo para confirmar la cuenta.',
  }
}

export async function loginUser(payload) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  })
  if (error) throw error

  const access = data.session?.access_token
  const refresh = data.session?.refresh_token
  if (!access) throw new Error('Supabase no devolvio access token.')

  invalidateApiCache()
  localStorage.setItem('homechef_access_token', access)
  const { data: sessionData } = await api.get('/auth/session/')

  const supabaseUser = data.user || {}
  const metadata = supabaseUser.user_metadata || supabaseUser.raw_user_meta_data || {}
  const backendUser = sessionData?.user || null
  const rawRole = sessionData?.role || metadata.role || supabaseUser.app_metadata?.role || supabaseUser.raw_app_meta_data?.role || 'CLIENTE'
  const role = normalizeRole(rawRole)
  const user = backendUser || buildUserFromAuthUser(supabaseUser)
  const redirect_path = sessionData?.redirect_path || defaultRedirectForRole(role)

  return {
    access,
    refresh,
    role,
    redirect_path,
    user,
  }
}

export async function requestPasswordRecovery(payload) {
  const redirectTo = `${window.location.origin}/reset-password`
  const { error } = await supabase.auth.resetPasswordForEmail(payload.email, {
    redirectTo,
  })
  if (error) throw error
  return { message: 'Solicitud enviada. Revisa tu correo para continuar.' }
}

export async function confirmPasswordRecovery(payload) {
  if (payload.password !== payload.password_confirm) {
    throw new Error('La confirmacion no coincide.')
  }
  if (payload.token) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: payload.token,
      type: 'recovery',
    })
    if (verifyError) throw verifyError
  }
  const { error } = await supabase.auth.updateUser({ password: payload.password })
  if (error) throw error
  return { message: 'Contrasena actualizada correctamente.' }
}

export async function fetchProfile() {
  return cachedGet('/auth/profile/')
}

export async function updateProfile(payload) {
  const { data } = await api.put('/auth/profile/', payload)
  invalidateApiCache('/auth/profile/')
  return data
}

export async function changePassword(payload) {
  if (payload.new_password !== payload.new_password_confirm) {
    throw new Error('La confirmacion no coincide.')
  }

  const { data: currentSession } = await supabase.auth.getSession()
  const email = currentSession.session?.user?.email
  if (!email) throw new Error('Sesion de Supabase no disponible.')

  const { data: reauthData, error: reauthError } = await supabase.auth.signInWithPassword({
    email,
    password: payload.current_password,
  })
  if (reauthError) throw reauthError
  if (reauthData.session?.access_token) {
    localStorage.setItem('homechef_access_token', reauthData.session.access_token)
  }

  const { error } = await supabase.auth.updateUser({ password: payload.new_password })
  if (error) throw error
  return { message: 'Contrasena actualizada correctamente.' }
}

export async function logoutUser(accessToken = '') {
  const token = String(accessToken || localStorage.getItem('homechef_access_token') || '').trim()
  try {
    if (token) {
      await api.post('/auth/logout/', {}, { headers: { Authorization: `Bearer ${token}` } })
    }
  } finally {
    await supabase.auth.signOut()
    invalidateApiCache()
  }
  return { message: 'Sesion finalizada correctamente.' }
}

function withoutPasswords(payload) {
  const { password, password_confirm, ...safePayload } = payload
  return safePayload
}

function normalizeRole(role) {
  const value = String(role || '').trim().toUpperCase()
  if (!value || value === 'CLIENT') return 'CLIENTE'
  return value
}

function defaultRedirectForRole(role) {
  const redirects = {
    CLIENTE: '/client/explore',
    COCINERO: '/chef/dashboard',
    ADMINISTRADOR: '/admin/dashboard',
    REPARTIDOR: '/delivery/assigned',
  }
  return redirects[normalizeRole(role)] || '/'
}

function buildUserFromAuthUser(authUser) {
  const metadata = authUser.user_metadata || authUser.raw_user_meta_data || {}
  return {
    id: authUser.id,
    email: authUser.email || metadata.email || '',
    first_name: metadata.first_name || '',
    last_name: metadata.last_name || '',
    full_name: metadata.full_name || metadata.name || '',
  }
}
