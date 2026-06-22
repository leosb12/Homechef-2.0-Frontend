import { getFromStore, putInStore, deleteFromStore, getAllFromStore, clearStore, STORES } from './indexedDbAdapter';

export const METADATA_KEY = 'sync_metadata';

// ─── Metadata ───────────────────────────────────────────────────────────────────

export async function getSyncMetadata() {
  const record = await getFromStore(STORES.metadata, METADATA_KEY);
  return record ? record.value : null;
}

export async function saveSyncMetadata(value) {
  await putInStore(STORES.metadata, { key: METADATA_KEY, value });
}

// ─── Entidades (cache activo) ───────────────────────────────────────────────────

/**
 * Guarda un array de items en el cache activo de un módulo.
 * NOTA: En vez de llamar a clearAllEntities() + saveEntities(), usar el patrón
 * staging (saveEntitiesStaging → commitStagingToLive) para no perder datos.
 */
export async function saveEntities(moduleName, items = []) {
  for (const item of items) {
    const id = String(item._id ?? item.id ?? item.user_id ?? item.order_id ?? crypto.randomUUID());
    const key = `${moduleName}:${id}`;
    await putInStore(STORES.entities, {
      key,
      module: moduleName,
      id,
      data: item,
      updated_at: new Date().toISOString(),
    });
  }
}

export async function getEntities(moduleName) {
  const allRecords = await getAllFromStore(STORES.entities);
  return allRecords
    .filter((record) => record.module === moduleName)
    .map((record) => record.data);
}

export async function getEntity(moduleName, id) {
  const key = `${moduleName}:${id}`;
  const record = await getFromStore(STORES.entities, key);
  return record ? record.data : null;
}

export async function saveEntityDirect(moduleName, id, data) {
  const key = `${moduleName}:${id}`;
  await putInStore(STORES.entities, {
    key,
    module: moduleName,
    id: String(id),
    data,
    updated_at: new Date().toISOString(),
  });
}

/**
 * Elimina TODAS las entidades del cache activo.
 * ⚠️ PELIGROSO: solo llamar si se garantiza que se va a repoblar inmediatamente.
 * Preferir el patrón staging para no dejar el cache vacío en caso de fallo.
 */
export async function clearAllEntities() {
  await clearStore(STORES.entities);
}

// ─── Patrón staging (fix R05) ───────────────────────────────────────────────────
//
// Flujo correcto de sync:
//   1. saveEntitiesStaging(moduleName, items)   → guarda en module="moduleName_staging"
//   2. Validar que items.length > 0 (o umbral mínimo)
//   3. commitStagingToLive(moduleName)           → borra activo, copia staging → activo
//   4. clearStaging(moduleName)                 → limpia staging
//
// Si el paso 1 falla: el cache activo NO se toca.
// Si el paso 3 falla: el staging se limpia; el activo queda intacto.

const stagingSuffix = '_staging';

/**
 * Guarda items en la zona staging (separada del cache activo).
 */
export async function saveEntitiesStaging(moduleName, items = []) {
  const stagingModule = `${moduleName}${stagingSuffix}`;
  // Limpiar staging anterior antes de escribir
  await clearModuleEntities(stagingModule);
  for (const item of items) {
    const id = String(item._id ?? item.id ?? item.user_id ?? item.order_id ?? crypto.randomUUID());
    const key = `${stagingModule}:${id}`;
    await putInStore(STORES.entities, {
      key,
      module: stagingModule,
      id,
      data: item,
      updated_at: new Date().toISOString(),
    });
  }
}

/**
 * Promueve el staging al cache activo de forma atómica:
 * borra el módulo activo y copia staging.
 * Si staging está vacío, NO reemplaza el activo (preserva datos anteriores).
 */
export async function commitStagingToLive(moduleName) {
  const stagingModule = `${moduleName}${stagingSuffix}`;
  const stagingItems = await getEntities(stagingModule);

  if (stagingItems.length === 0) {
    // No hay nada útil en staging — mantener cache activo sin cambios
    console.warn(`[adminOfflineRepo] commitStagingToLive: staging de '${moduleName}' está vacío. Cache activo preservado.`);
    return false;
  }

  // Borrar módulo activo
  await clearModuleEntities(moduleName);

  // Copiar staging al módulo activo
  for (const item of stagingItems) {
    const id = String(item._id ?? item.id ?? item.user_id ?? item.order_id ?? crypto.randomUUID());
    const key = `${moduleName}:${id}`;
    await putInStore(STORES.entities, {
      key,
      module: moduleName,
      id,
      data: item,
      updated_at: new Date().toISOString(),
    });
  }

  // Limpiar staging
  await clearModuleEntities(stagingModule);
  return true;
}

/**
 * Limpia el staging de un módulo sin tocar el cache activo.
 */
export async function clearStaging(moduleName) {
  await clearModuleEntities(`${moduleName}${stagingSuffix}`);
}

/**
 * Elimina todas las entidades de un módulo específico (activo o staging).
 */
export async function clearModuleEntities(moduleName) {
  const allRecords = await getAllFromStore(STORES.entities);
  const toDelete = allRecords.filter((r) => r.module === moduleName);
  for (const record of toDelete) {
    await deleteFromStore(STORES.entities, record.key);
  }
}

/**
 * Verifica si hay datos cacheados para un módulo.
 */
export async function hasModuleData(moduleName) {
  const items = await getEntities(moduleName);
  return items.length > 0;
}

// ─── Cola de mutaciones ─────────────────────────────────────────────────────────

export async function enqueueMutation(mutation) {
  const id = mutation.id || crypto.randomUUID();
  const record = {
    id,
    status: 'pending', // pending, syncing, synced, failed, conflict
    attempts: 0,
    last_error: null,
    created_at: new Date().toISOString(),
    ...mutation,
  };
  await putInStore(STORES.mutationQueue, record);
  // Dispatch an event to update badges/UI
  window.dispatchEvent(new CustomEvent('admin-offline-queue-changed'));
  return record;
}

export async function getPendingMutations() {
  const queue = await getAllFromStore(STORES.mutationQueue);
  return queue.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
}

export async function removeMutation(id) {
  await deleteFromStore(STORES.mutationQueue, id);
  window.dispatchEvent(new CustomEvent('admin-offline-queue-changed'));
}

export async function updateMutationStatus(id, updates) {
  const existing = await getFromStore(STORES.mutationQueue, id);
  if (existing) {
    const updated = { ...existing, ...updates };
    await putInStore(STORES.mutationQueue, updated);
    window.dispatchEvent(new CustomEvent('admin-offline-queue-changed'));
  }
}

// ─── Snapshot de reportes ───────────────────────────────────────────────────────

export async function saveAdminReportSnapshot(snapshot) {
  await putInStore(STORES.metadata, { key: 'admin_report_snapshot', value: snapshot });
}

export async function getAdminReportSnapshot() {
  const record = await getFromStore(STORES.metadata, 'admin_report_snapshot');
  return record ? record.value : null;
}

// ─── Metadata por módulo ────────────────────────────────────────────────────────

/**
 * Guarda metadata de sincronización por módulo.
 * Útil para saber "última sync de orders fue hace 10 min, tuvo 243 registros".
 */
export async function saveModuleSyncMeta(moduleName, meta) {
  const key = `module_sync_meta:${moduleName}`;
  await putInStore(STORES.metadata, { key, value: meta });
}

export async function getModuleSyncMeta(moduleName) {
  const key = `module_sync_meta:${moduleName}`;
  const record = await getFromStore(STORES.metadata, key);
  return record ? record.value : null;
}

// ─── Wrappers para Patrón Staging ──────────────────────────────────────────────

export async function saveModuleToStaging(moduleName, records = []) {
  return saveEntitiesStaging(moduleName, records);
}

export async function commitModuleStaging(moduleName) {
  return commitStagingToLive(moduleName);
}

export async function discardModuleStaging(moduleName) {
  return clearStaging(moduleName);
}

export async function replaceModuleAtomically(moduleName, records = []) {
  try {
    await saveEntitiesStaging(moduleName, records);
    const ok = await commitStagingToLive(moduleName);
    return ok;
  } catch (error) {
    console.error(`[adminOfflineRepo] replaceModuleAtomically error for ${moduleName}:`, error);
    await clearStaging(moduleName);
    return false;
  }
}

export async function getModuleMetadata(moduleName) {
  return getModuleSyncMeta(moduleName);
}

export async function saveModuleMetadata(moduleName, metadata) {
  return saveModuleSyncMeta(moduleName, metadata);
}

// ─── Helpers FASE 3 ─────────────────────────────────────────────────────────────

export async function getCachedModule(moduleName) {
  return getEntities(moduleName);
}

export async function saveCachedModule(moduleName, records = []) {
  return saveEntities(moduleName, records);
}

export async function updateCachedEntity(moduleName, entityId, patch) {
  const key = `${moduleName}:${entityId}`;
  const record = await getFromStore(STORES.entities, key);
  if (record) {
    record.data = { ...record.data, ...patch };
    record.updated_at = new Date().toISOString();
    await putInStore(STORES.entities, record);
    window.dispatchEvent(new CustomEvent('admin-offline-entities-changed', {
      detail: { module: moduleName, id: entityId, data: record.data }
    }));
  } else {
    console.warn(`[adminOfflineRepo] updateCachedEntity: Entity ${key} not found for patch.`);
  }
}

export async function hasOfflineData(moduleName) {
  return hasModuleData(moduleName);
}

export async function queueAdminMutation(mutation) {
  return enqueueMutation(mutation);
}

export async function getPendingAdminMutations() {
  return getPendingMutations();
}

export async function processAdminMutationQueue() {
  const { pushAdminMutations } = await import('./offlineSyncService');
  await pushAdminMutations();
}

export async function markMutationSynced(id) {
  await updateMutationStatus(id, { status: 'synced' });
}

export async function markMutationFailed(id, error) {
  await updateMutationStatus(id, { status: 'failed', last_error: error });
}

export async function markMutationConflict(id, conflict) {
  await updateMutationStatus(id, {
    status: 'conflict',
    server_data: conflict?.server_data,
    reason: conflict?.reason || 'SERVER_VERSION_NEWER'
  });
}

export async function cancelMutation(id) {
  await updateMutationStatus(id, { status: 'cancelled' });
}

