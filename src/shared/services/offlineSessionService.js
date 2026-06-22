import { getMetadata, setMetadata } from './offline_db';
import { api } from './api';
import { useAuthSession } from '../../modules/gestion_usuarios_acceso_suscripcion/services/auth_session';

/**
 * Guarda la última sesión válida para acceso sin conexión.
 * No almacena contraseñas, secretos, tokens de pago ni llaves sensibles.
 * Almacena tanto en localStorage (lectura síncrona en el arranque) como en IndexedDB (resistencia).
 */
export const OFFLINE_SESSION_TTL_DAYS = 7;

export async function saveLastValidSession(user) {
  if (!user) return;
  
  const now = new Date();
  const expires = new Date();
  expires.setDate(expires.getDate() + OFFLINE_SESSION_TTL_DAYS);

  const currentUserId = String(user.id || user.user_id || user.supabase_user_id || '');
  const currentRole = String(user.role || localStorage.getItem('homechef_role') || '');

  // Cache isolation check
  try {
    const previous = await getLastValidSession();
    if (previous) {
      const prevUserId = String(previous.user_id || previous.cache_owner_user_id || '');
      const prevRole = String(previous.role || previous.cache_owner_role || '');
      
      if ((prevUserId && prevUserId !== currentUserId) || (prevRole && prevRole !== currentRole)) {
        console.log('[offlineSession] Cache ownership changed. Clearing IndexedDB entities cache and metadata...');
        const { clearAllEntities, saveSyncMetadata } = await import('../../modules/confianza_administracion_seguridad/services/adminOfflineRepository');
        await clearAllEntities();
        await saveSyncMetadata(null);
        
        const { clearAllLocalData } = await import('./offline_db');
        await clearAllLocalData();
      }
    }
  } catch (e) {
    console.warn('[offlineSession] Error checking cache ownership:', e);
  }

  const sessionData = {
    user_id: currentUserId,
    role: currentRole,
    name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || '',
    email: user.email || '',
    permissions: user.permissions || [],
    last_online_login_at: now.toISOString(),
    last_validated_at: now.toISOString(),
    expires_at: expires.toISOString(),
    offline_enabled: true,
    cache_owner_user_id: currentUserId,
    cache_owner_role: currentRole
  };

  // Guardar en IndexedDB
  await setMetadata('last_offline_session', sessionData);
  
  // Guardar en localStorage para disponibilidad síncrona en bootstrap
  localStorage.setItem('homechef_offline_session', JSON.stringify(sessionData));
}

/**
 * Obtiene la sesión offline guardada.
 */
export async function getLastValidSession() {
  const local = localStorage.getItem('homechef_offline_session');
  if (local) {
    try {
      return JSON.parse(local);
    } catch (e) {
      console.error('[offlineSessionService] Error parseando localStorage session:', e);
    }
  }
  return await getMetadata('last_offline_session');
}

/**
 * Verifica si hay una sesión offline válida y no expirada.
 */
export async function hasValidOfflineSession() {
  const session = await getLastValidSession();
  if (!session || !session.offline_enabled) return false;
  
  const expires = new Date(session.expires_at);
  if (expires <= new Date()) return false;

  // Verificar que la sesión coincida con la caché (dueño de la caché)
  try {
    const { getSyncMetadata } = await import('../../modules/confianza_administracion_seguridad/services/adminOfflineRepository');
    const meta = await getSyncMetadata();
    if (meta && meta.admin_user_id) {
      if (String(meta.admin_user_id) !== String(session.user_id)) {
        console.warn('[offlineSessionService] La sesión offline no coincide con el dueño de la caché.');
        return false;
      }
    }
  } catch (e) {
    console.warn('[offlineSessionService] Error verificando coincidencia con caché:', e);
  }

  return true;
}

/**
 * Limpia la sesión offline.
 */
export async function clearOfflineSession() {
  localStorage.removeItem('homechef_offline_session');
  await setMetadata('last_offline_session', null);
}

/**
 * Compara el rol de la sesión offline contra un rol esperado.
 */
export async function validateOfflineSessionForRole(role) {
  const session = await getLastValidSession();
  if (!session) return false;
  return String(session.role).toUpperCase() === String(role).toUpperCase();
}

/**
 * Actualiza la sesión offline desde datos online recientes.
 */
export async function refreshOfflineSessionFromOnline(user) {
  await saveLastValidSession(user);
}

export async function revalidateSession() {
  let token = localStorage.getItem('homechef_access_token');

  if (!token || token === 'offline_placeholder_token') {
    try {
      const { supabase } = await import('./supabase_client');
      const { data: { session }, error: refreshErr } = await supabase.auth.getSession();
      if (!refreshErr && session?.access_token) {
        token = session.access_token;
        localStorage.setItem('homechef_access_token', token);
      }
    } catch (e) {
      console.warn('[offlineSessionService] Error recuperando sesión de Supabase:', e);
    }
  }

  if (!token || token === 'offline_placeholder_token') {
    console.log('[offlineSessionService] Sin token real de sesión para revalidar.');
    return;
  }

  try {
    const { data: sessionData } = await api.get('/auth/session/', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (sessionData && sessionData.user) {
      const role = sessionData.role || localStorage.getItem('homechef_role') || 'CLIENTE';
      await refreshOfflineSessionFromOnline({
        ...sessionData.user,
        role
      });
      
      // Actualizar el estado de autenticación en Zustand para volver a 'authenticated'
      useAuthSession.getState().setSession({
        access: token,
        role,
        user: sessionData.user
      });
      
      console.log('[offlineSessionService] Sesión revalidada con éxito y store actualizado.');
    }
  } catch (error) {
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      console.warn('[offlineSessionService] Sesión rechazada por el backend. Limpiando credenciales.');
      await clearOfflineSession();
      useAuthSession.getState().clearSession();
      // Disparar evento para forzar redirección
      window.dispatchEvent(new CustomEvent('homechef:auth-rejected'));
    } else {
      console.warn('[offlineSessionService] Revalidación fallida temporalmente por error de red/servidor. Preservando sesión offline.', error);
    }
  }
}
