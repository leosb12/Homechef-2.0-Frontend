import { api } from '../../../shared/services/api';
import { useAuthSession } from '../../gestion_usuarios_acceso_suscripcion/services/auth_session';
import { useAdminSyncStore } from './adminSyncStore';
import {
  saveSyncMetadata,
  saveEntities,
  getPendingMutations,
  removeMutation,
  updateMutationStatus,
  clearAllEntities,
  saveAdminReportSnapshot,
  // FASE 1 Staging
  saveModuleToStaging,
  commitModuleStaging,
  discardModuleStaging,
  getModuleMetadata,
  saveModuleMetadata,
  getEntities
} from './adminOfflineRepository';
import { isBackendReachable, subscribeConnectivity } from '../../../shared/services/connectivityService';

const PUSH_ENDPOINT = '/admin/sync/push';

let syncPromise = null;

export function startAdminSync() {
  if (typeof window === 'undefined') return () => {};

  const refresh = (state) => {
    const reachable = state ? state.backendReachable : isBackendReachable();
    const status = state ? state.status : (reachable ? 'online' : 'offline');
    useAdminSyncStore.getState().setConnectivity(reachable, status);
  };

  const unsubscribe = subscribeConnectivity((state) => {
    refresh(state);
    if (state.backendReachable) {
      const token = localStorage.getItem('homechef_access_token');
      const role = localStorage.getItem('homechef_role');
      if (token && (role === 'ADMINISTRADOR' || role === 'ADMIN')) {
        void syncAdminNow();
      }
    }
  });

  window.addEventListener('admin-offline-queue-changed', () => {
    const role = localStorage.getItem('homechef_role');
    if (role === 'ADMINISTRADOR' || role === 'ADMIN') {
      void useAdminSyncStore.getState().refreshCounts();
    }
  });

  refresh();
  
  // Initial auto sync if backend reachable and authenticated
  const token = localStorage.getItem('homechef_access_token');
  const role = localStorage.getItem('homechef_role');
  if (isBackendReachable() && token && (role === 'ADMINISTRADOR' || role === 'ADMIN')) {
    void syncAdminNow();
  }

  return unsubscribe;
}

export async function syncAdminNow(options = {}) {
  const role = localStorage.getItem('homechef_role');
  if (role !== 'ADMINISTRADOR' && role !== 'ADMIN') {
    console.log('[offlineSyncService] Ignorando syncAdminNow porque el rol no es ADMINISTRADOR:', role);
    return;
  }

  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    const token = localStorage.getItem('homechef_access_token');
    if (!token) {
      useAdminSyncStore.getState().setSyncStatus('idle');
      return;
    }

    if (!isBackendReachable()) {
      useAdminSyncStore.getState().setSyncStatus('offline');
      return;
    }

    useAdminSyncStore.getState().resetSyncState();
    useAdminSyncStore.getState().setSyncStatus('syncing');
    useAdminSyncStore.getState().setLastError('');

    try {
      // 1. Push any pending actions
      try {
        await pushAdminMutations();
      } catch (err) {
        console.warn("Error pushing pending actions before sync:", err);
      }

      // 2. Define modules to sync
      const syncSequence = [
        { key: 'users', label: 'users', path: '/admin/sync/module/users' },
        { key: 'chefs', label: 'chefs', path: '/admin/sync/module/chefs' },
        { key: 'riders', label: 'riders', path: '/admin/sync/module/riders' },
        { key: 'orders', label: 'orders', path: '/admin/sync/module/orders' },
        { key: 'publications', label: 'publications', path: '/admin/sync/module/publications' },
        { key: 'fraud_risk', label: 'fraud_risk', path: '/admin/sync/module/fraud_risk' },
        { key: 'audit_general', label: 'audit_general', path: '/admin/sync/module/audit_general' },
        { key: 'audit_ai', label: 'audit_ai', path: '/admin/sync/module/audit_ai' }
      ];

      // NO clearAllEntities() here. The staging pattern handles atomic replacement.

      const recordCounts = {};
      let totalRecords = 0;
      const syncErrors = {};

      for (const step of syncSequence) {
        const prevMeta = await getModuleMetadata(step.key);
        const isFailed = prevMeta?.status === 'failed' || !!useAdminSyncStore.getState().syncErrors[step.key];
        const shouldSync = !options.retryFailedOnly || isFailed;

        if (!shouldSync) {
          if (prevMeta) {
            recordCounts[step.key] = prevMeta.records_count;
            if (step.key === 'audit_ai') {
              recordCounts['cache_ai_audit_timeline'] = prevMeta.records_count;
              recordCounts['audit_ai'] = prevMeta.records_count;
            }
          }
          continue;
        }

        useAdminSyncStore.getState().setSyncProgress(step.key, 'syncing');
        const attemptTime = new Date().toISOString();

        try {
          const { data } = await api.get(step.path, { timeout: 15000 });
          const payload = data?.data;
          
          if (step.key === 'audit_ai') {
            const timeline = payload?.timeline || [];
            await saveModuleToStaging('cache_ai_audit_timeline', timeline);
            await saveModuleToStaging('audit_ai', timeline);
            
            const collections = payload?.collections || {};
            const colKeys = [];
            for (const [colName, colItems] of Object.entries(collections)) {
              if (Array.isArray(colItems)) {
                await saveModuleToStaging(`cache_${colName}`, colItems);
                colKeys.push({ key: `cache_${colName}`, count: colItems.length });
              }
            }

            // Commit all AI collections to live cache
            await commitModuleStaging('cache_ai_audit_timeline');
            await commitModuleStaging('audit_ai');
            for (const col of colKeys) {
              await commitModuleStaging(col.key);
              recordCounts[col.key] = col.count;
            }
            
            recordCounts['cache_ai_audit_timeline'] = timeline.length;
            recordCounts['audit_ai'] = timeline.length;
            totalRecords += timeline.length;
          } else {
            const items = Array.isArray(payload) ? payload : [];
            await saveModuleToStaging(step.key, items);
            await commitModuleStaging(step.key);
            recordCounts[step.key] = items.length;
            totalRecords += items.length;
          }
          
          const moduleMeta = {
            module: step.key,
            status: 'success',
            records_count: recordCounts[step.key] || 0,
            last_successful_sync_at: new Date().toISOString(),
            last_attempt_at: attemptTime,
            last_error: null
          };
          await saveModuleMetadata(step.key, moduleMeta);
          useAdminSyncStore.getState().setModuleStatus(step.key, moduleMeta);
          useAdminSyncStore.getState().setSyncProgress(step.key, 'success');
        } catch (err) {
          console.error(`Sync failed for module ${step.key}:`, err);
          const errMsg = err?.response?.data?.detail || err?.message || 'Error de red';
          
          // Discard staging to preserve last valid live cache
          if (step.key === 'audit_ai') {
            await discardModuleStaging('cache_ai_audit_timeline');
            await discardModuleStaging('audit_ai');
            try {
              // Discard any dynamic collection that might have been staged
              const collections = ['user_manual_chatbot_conversations', 'ai_inference_audit', 'ai_model_status', 'ai_offline_test_results', 'ai_requests', 'ai_training_reports', 'publication_quality_reviews', 'ai_dataset_metadata'];
              for (const colName of collections) {
                await discardModuleStaging(`cache_${colName}`);
              }
            } catch (discardErr) {
              console.warn("Error clearing dynamic AI staging on failure:", discardErr);
            }
          } else {
            await discardModuleStaging(step.key);
          }

          const moduleMeta = {
            module: step.key,
            status: 'failed',
            records_count: prevMeta?.records_count || 0,
            last_successful_sync_at: prevMeta?.last_successful_sync_at || null,
            last_attempt_at: attemptTime,
            last_error: errMsg
          };
          await saveModuleMetadata(step.key, moduleMeta);
          useAdminSyncStore.getState().setModuleStatus(step.key, moduleMeta);
          
          useAdminSyncStore.getState().setSyncProgress(step.key, 'failed');
          useAdminSyncStore.getState().setSyncError(step.key, errMsg);
          syncErrors[step.key] = errMsg;
        }
      }

      // 3. Models / snapshot generation step
      useAdminSyncStore.getState().setSyncProgress('models_offline', 'syncing');
      try {
        // Retrieve cached data (including previously valid data for failed modules)
        const snapshotData = {
          users: await getEntities('users'),
          chefs: await getEntities('chefs'),
          riders: await getEntities('riders'),
          orders: await getEntities('orders'),
          publications: await getEntities('publications'),
          fraud_risk: await getEntities('fraud_risk'),
          audit_general: await getEntities('audit_general'),
          audit_ai: await getEntities('audit_ai'),
          user_manual_chatbot_conversations: await getEntities('cache_user_manual_chatbot_conversations'),
          ai_inference_audit: await getEntities('cache_ai_inference_audit'),
          ai_model_status: await getEntities('cache_ai_model_status'),
          ai_offline_test_results: await getEntities('cache_ai_offline_test_results'),
          ai_requests: await getEntities('cache_ai_requests'),
          ai_training_reports: await getEntities('cache_ai_training_reports'),
          publication_quality_reviews: await getEntities('cache_publication_quality_reviews'),
          ai_dataset_metadata: await getEntities('cache_ai_dataset_metadata'),
        };

        const user = useAuthSession.getState().user;
        const adminUserId = user ? user.id || user.supabase_user_id || '' : '';

        const countsByModule = {};
        Object.entries(snapshotData).forEach(([mod, items]) => {
          countsByModule[mod] = items.length;
        });

        const snapshot = {
          metadata: {
            generated_at: new Date().toISOString(),
            modules_included: Object.keys(snapshotData),
            counts_by_module: countsByModule,
            date_range: {
              start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              end: new Date().toISOString()
            },
            schema_version: '1.0.0',
            admin_user_id: String(adminUserId),
            source: 'online_sync'
          },
          data: snapshotData
        };

        await saveAdminReportSnapshot(snapshot);
        useAdminSyncStore.getState().setSyncProgress('models_offline', 'success');
      } catch (err) {
        console.error("Error creating report snapshot:", err);
        useAdminSyncStore.getState().setSyncProgress('models_offline', 'failed');
        useAdminSyncStore.getState().setSyncError('models_offline', err.message);
        syncErrors['models_offline'] = err.message;
      }

      // Save overall sync metadata
      const user = useAuthSession.getState().user;
      const adminActor = user ? `${user.first_name} ${user.last_name || ''}`.trim() || user.email : 'Admin';
      const adminUserId = user ? String(user.id || user.supabase_user_id || '') : '';
      
      const hasErrors = Object.keys(syncErrors).length > 0;
      
      const syncMeta = {
        synced_at: new Date().toISOString(),
        admin_user: adminActor,
        admin_user_id: adminUserId,
        schema_version: '1.0.0',
        record_counts: recordCounts,
        total_records: totalRecords,
        status: hasErrors ? 'failed' : 'success',
        error: hasErrors ? 'Algunos módulos fallaron al sincronizarse.' : null,
        errors: syncErrors
      };
      
      await saveSyncMetadata(syncMeta);
      await useAdminSyncStore.getState().refreshCounts();
      
      if (hasErrors) {
        const failedLabels = [];
        if (syncErrors.users) failedLabels.push('Usuarios');
        if (syncErrors.chefs) failedLabels.push('Cocineros');
        if (syncErrors.riders) failedLabels.push('Repartidores');
        if (syncErrors.orders) failedLabels.push('Pedidos');
        if (syncErrors.publications) failedLabels.push('Publicaciones');
        if (syncErrors.audit_general) failedLabels.push('Auditoría general');
        if (syncErrors.audit_ai) failedLabels.push('Auditoría IA');
        if (syncErrors.models_offline) failedLabels.push('Modelos offline');

        const labelStr = failedLabels.join(', ');
        const errorText = `${failedLabels.includes('Auditoría IA') && failedLabels.length === 1 ? 'Auditoría IA no pudo sincronizarse, pero los demás módulos sí.' : `Los siguientes módulos no pudieron sincronizarse: ${labelStr}.`}`;
        
        useAdminSyncStore.getState().setLastError(errorText);
        useAdminSyncStore.getState().setSyncStatus('error');
      } else {
        const conflictCount = useAdminSyncStore.getState().conflictCount;
        useAdminSyncStore.getState().setSyncStatus(conflictCount > 0 ? 'conflict' : 'idle');
      }
    } catch (error) {
      console.error('Admin sync failed:', error);
      const errMsg = error?.message || 'No se pudo sincronizar el Admin.';
      useAdminSyncStore.getState().setLastError(errMsg);
      useAdminSyncStore.getState().setSyncStatus('error');
      
      const existingMeta = useAdminSyncStore.getState().metadata || {};
      await saveSyncMetadata({
        ...existingMeta,
        status: 'failed',
        error: errMsg
      });
      await useAdminSyncStore.getState().refreshCounts();
    } finally {
      syncPromise = null;
    }
  })();

  return syncPromise;
}

export async function pushAdminMutations() {
  const pending = await getPendingMutations();
  // Only push pending or failed mutations, leave conflicts alone
  const toPush = pending.filter(m => m.status === 'pending' || m.status === 'failed');
  if (toPush.length === 0) return;

  // Set them to syncing state
  for (const m of toPush) {
    await updateMutationStatus(m.id, { status: 'syncing' });
  }

  try {
    const meta = useAdminSyncStore.getState().metadata;
    const { data } = await api.post(PUSH_ENDPOINT, {
      device_id: 'admin-browser',
      last_sync: meta?.synced_at || null,
      operations: toPush.map(m => ({
        operation_id: m.id,
        entity: m.entity,
        action: m.action,
        local_id: m.local_id || m.id,
        server_id: m.server_id,
        payload: m.payload,
        updated_at: m.created_at
      }))
    });

    // Handle synced
    if (Array.isArray(data?.synced)) {
      for (const item of data.synced) {
        await removeMutation(item.operation_id);
      }
    }

    // Handle conflicts
    if (Array.isArray(data?.conflicts)) {
      for (const conflict of data.conflicts) {
        await updateMutationStatus(conflict.operation_id, {
          status: 'conflict',
          server_data: conflict.server_data,
          reason: conflict.reason || 'SERVER_VERSION_NEWER'
        });
      }
    }

    // Handle failed/errors
    if (Array.isArray(data?.errors)) {
      for (const err of data.errors) {
        const matching = toPush.find(m => m.id === err.operation_id);
        const attempts = (matching?.attempts || 0) + 1;
        await updateMutationStatus(err.operation_id, {
          status: 'failed',
          attempts,
          last_error: err.error || 'Error desconocido'
        });
      }
    }
  } catch (error) {
    // If push API failed, revert all 'syncing' back to 'failed'
    for (const m of toPush) {
      const attempts = (m.attempts || 0) + 1;
      await updateMutationStatus(m.id, {
        status: 'failed',
        attempts,
        last_error: error?.message || 'Error de red en push'
      });
    }
    throw error;
  }
}
