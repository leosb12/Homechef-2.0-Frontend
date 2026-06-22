import { getEntities, getEntity, saveEntities, saveEntityDirect, enqueueMutation } from './adminOfflineRepository';
import { isBackendReachable } from '../../../shared/services/connectivityService';

export function isNetworkError(error) {
  return !error?.response || error?.code === 'ERR_NETWORK' || error?.message === 'Network Error';
}

/**
 * Lee desde el backend si hay conectividad real.
 * Fallback a cache IndexedDB si no hay conexión.
 */
export async function readListWithFallback(moduleName, onlineCall) {
  // Usar conectividad real en vez de solo navigator.onLine
  const online = isBackendReachable() || (typeof navigator !== 'undefined' && navigator.onLine);

  if (online) {
    try {
      const data = await onlineCall();
      const items = Array.isArray(data) ? data : data?.items || [];
      await saveEntities(moduleName, items);
      return data;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      // Red falló aunque parecía online — caer a cache
    }
  }

  // Offline fallback
  const cached = await getEntities(moduleName);
  if (moduleName === 'riders' || moduleName === 'orders') {
    return { items: cached, __offline: true };
  }
  return cached;
}

export async function readDetailWithFallback(moduleName, id, onlineCall) {
  const online = isBackendReachable() || (typeof navigator !== 'undefined' && navigator.onLine);

  if (online) {
    try {
      const data = await onlineCall();
      const detail = data?.order || data?.publication || data || null;
      if (detail) {
        await saveEntityDirect(moduleName, id, detail);
      }
      return data;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
    }
  }

  // Offline fallback
  const cached = await getEntity(moduleName, id);
  if (!cached) {
    throw new Error('Estás sin conexión y este elemento no está en el cache.');
  }
  if (moduleName === 'orders') {
    return { order: cached, __offline: true };
  }
  return cached;
}

export async function mutateOfflineFirst(entity, action, payload, serverId, onlineCall) {
  const online = isBackendReachable() || (typeof navigator !== 'undefined' && navigator.onLine);

  if (online) {
    try {
      const data = await onlineCall();
      return data;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
    }
  }

  const record = await enqueueMutation({
    entity,
    action,
    server_id: serverId,
    payload,
  });

  return { ...payload, id: serverId, __offline: true, __operation_id: record.id };
}
