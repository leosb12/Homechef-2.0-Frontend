import { useEffect, useState } from 'react';
import { useAdminSyncStore } from '../services/adminSyncStore';
import { syncAdminNow } from '../services/offlineSyncService';
import { useAuthSession } from '../../gestion_usuarios_acceso_suscripcion/services/auth_session';
import { useConnectivity } from '../../../shared/hooks/useConnectivity';

const LABELS = {
  idle: 'Sincronizado',
  syncing: 'Sincronizando...',
  offline: 'Sin conexión',
  error: 'Error de sync',
  conflict: 'Conflictos',
};

const DOT_COLORS = {
  idle: '#22c55e',       // Green
  syncing: '#a855f7',    // Purple
  offline: '#ef4444',    // Red
  error: '#f97316',      // Amber
  conflict: '#ef4444',   // Red
};

const CONN_COLORS = {
  online: '#22c55e',     // Green
  degraded: '#eab308',   // Yellow
  offline: '#ef4444',    // Red
};

const CONN_LABELS = {
  online: 'En Línea',
  degraded: 'Degradado',
  offline: 'Sin Red',
};

const STEPS = [
  { key: 'users', label: 'Usuarios' },
  { key: 'chefs', label: 'Cocineros' },
  { key: 'riders', label: 'Repartidores' },
  { key: 'orders', label: 'Pedidos' },
  { key: 'publications', label: 'Publicaciones' },
  { key: 'fraud_risk', label: 'Control de Calidad' },
  { key: 'audit_general', label: 'Auditoría General' },
  { key: 'audit_ai', label: 'Auditoría IA' },
  { key: 'models_offline', label: 'Modelos Offline' },
];

export default function AdminSyncBadge() {
  const {
    syncStatus,
    metadata,
    pendingCount,
    lastError,
    syncProgress,
    syncErrors,
    moduleStatus,
  } = useAdminSyncStore();

  const {
    connectivityStatus,
    backendReachable,
    iaServiceReachable,
    latency_ms,
    browserOnline,
  } = useConnectivity();

  const [isOpen, setIsOpen] = useState(false);
  const [mutations, setMutations] = useState([]);
  const user = useAuthSession(state => state.user);

  const loadMutations = async () => {
    const { getPendingMutations } = await import('../services/adminOfflineRepository');
    const queue = await getPendingMutations();
    setMutations(queue);
  };

  useEffect(() => {
    // Run an initial counts load
    void useAdminSyncStore.getState().refreshCounts();
    void loadMutations();

    const handleQueueChange = () => {
      void loadMutations();
    };
    window.addEventListener('admin-offline-queue-changed', handleQueueChange);
    return () => {
      window.removeEventListener('admin-offline-queue-changed', handleQueueChange);
    };
  }, []);

  const handleRetryMutation = async (id, e) => {
    e.stopPropagation();
    const { updateMutationStatus } = await import('../services/adminOfflineRepository');
    await updateMutationStatus(id, { status: 'pending', attempts: 0, last_error: null });
    await useAdminSyncStore.getState().refreshCounts();
  };

  const handleCancelMutation = async (id, e) => {
    e.stopPropagation();
    const { cancelMutation } = await import('../services/adminOfflineRepository');
    await cancelMutation(id);
    await useAdminSyncStore.getState().refreshCounts();
  };

  const handleProcessQueue = async (e) => {
    e.stopPropagation();
    if (!isOnline) return;
    const { processAdminMutationQueue } = await import('../services/adminOfflineRepository');
    try {
      await processAdminMutationQueue();
    } catch (err) {
      console.error("Manual queue push failed:", err);
    }
  };

  useEffect(() => {
    const checkCacheOwnership = async () => {
      const { getSyncMetadata, clearAllEntities, saveSyncMetadata } = await import('../services/adminOfflineRepository');
      const meta = await getSyncMetadata();
      
      if (meta) {
        if (!user) {
          console.log("No authenticated user. Clearing admin offline cache...");
          await clearAllEntities();
          await saveSyncMetadata(null);
          await useAdminSyncStore.getState().refreshCounts();
        } else {
          const currentUserId = user.id || user.supabase_user_id || '';
          if (meta.admin_user_id && String(meta.admin_user_id) !== String(currentUserId)) {
            console.log("Admin user changed. Clearing mismatching offline cache...");
            await clearAllEntities();
            await saveSyncMetadata(null);
            await useAdminSyncStore.getState().refreshCounts();
          }
        }
      }
    };
    
    checkCacheOwnership();
  }, [user]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e) => {
      const popover = document.getElementById('sync-badge-popover');
      const trigger = document.getElementById('sync-badge-trigger');
      if (
        popover &&
        !popover.contains(e.target) &&
        trigger &&
        !trigger.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isOpen]);

  const hasFailedModules = Object.values(moduleStatus).some(m => m.status === 'failed') || Object.keys(syncErrors).length > 0;
  const isOnline = backendReachable;
  const currentStatus = isOnline ? syncStatus : 'offline';
  const showPopover = isOpen;
  
  const handleSyncClick = async (e) => {
    e.stopPropagation();
    if (!isOnline) return;
    await syncAdminNow();
  };

  const handleRetryFailedClick = async (e) => {
    e.stopPropagation();
    if (!isOnline) return;
    await syncAdminNow({ retryFailedOnly: true });
  };

  const formattedDate = () => {
    if (!metadata?.synced_at) return 'Nunca';
    const date = new Date(metadata.synced_at);
    return date.toLocaleString();
  };

  const renderProgressStep = (step) => {
    const status = syncProgress[step.key];
    const error = syncErrors[step.key];

    let icon = (
      <span className="h-2 w-2 rounded-full bg-slate-400" />
    );
    let textColor = 'text-slate-400';

    if (status === 'syncing') {
      icon = (
        <svg className="animate-spin h-3.5 w-3.5 text-purple-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      );
      textColor = 'text-purple-300 font-semibold';
    } else if (status === 'success') {
      icon = (
        <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      );
      textColor = 'text-green-400';
    } else if (status === 'failed') {
      icon = (
        <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
      textColor = 'text-red-400 font-semibold';
    }

    return (
      <div key={step.key} className="flex items-center justify-between text-[11px] py-0.5">
        <div className="flex items-center gap-2">
          {icon}
          <span className={textColor}>{step.label}</span>
        </div>
        {error && (
          <span className="text-[9px] text-red-400 max-w-[120px] truncate" title={error}>
            {error}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="relative flex items-center gap-2.5">
      {/* Estado Global Conectividad */}
      <div 
        id="sync-badge-trigger"
        className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold select-none transition-all duration-300 cursor-pointer"
        style={{
          borderColor: 'rgba(148, 163, 184, 0.16)',
          backgroundColor: 'var(--panel-soft)',
          color: 'var(--text)',
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span 
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: CONN_COLORS[connectivityStatus] }}
        />
        <span>{CONN_LABELS[connectivityStatus]}</span>
        
        {pendingCount > 0 && (
          <span className="ml-1 rounded-full bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-bold text-indigo-400" title="Acciones pendientes">
            {pendingCount}
          </span>
        )}
      </div>

      {/* Sincronizar Button */}
      <button
        type="button"
        disabled={syncStatus === 'syncing' || !isOnline}
        onClick={handleSyncClick}
        className="relative overflow-hidden rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all duration-300 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
        style={{
          background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
          boxShadow: '0 8px 20px rgba(109, 40, 217, 0.25)',
        }}
      >
        <span className="flex items-center gap-1.5">
          {syncStatus === 'syncing' ? (
            <svg className="h-3.5 w-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          )}
          <span className="hidden md:inline">Sincronizar</span>
        </span>
      </button>

      {/* Reintentar Fallidos Button */}
      {hasFailedModules && (
        <button
          type="button"
          disabled={syncStatus === 'syncing' || !isOnline}
          onClick={handleRetryFailedClick}
          className="relative overflow-hidden rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all duration-300 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            boxShadow: '0 8px 20px rgba(234, 88, 12, 0.25)',
          }}
          title="Reintentar sólo los módulos con error"
        >
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 4v6h6M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
            <span className="hidden md:inline">Reintentar Fallidos</span>
          </span>
        </button>
      )}

      {/* Popover/Tooltip Details on Sync & Connectivity */}
      {showPopover && (
        <div 
          id="sync-badge-popover"
          className="fixed inset-x-4 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-10 z-[100] sm:w-80 rounded-2xl border p-4 text-xs shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            borderColor: 'rgba(148, 163, 184, 0.18)',
            backgroundColor: 'var(--panel)',
            boxShadow: '0 15px 30px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div className="space-y-3.5 text-white">
            <h5 className="font-bold border-b pb-1.5 flex justify-between items-center" style={{ borderColor: 'var(--line)' }}>
              <span className="flex items-center gap-1.5">
                <span>Infraestructura Offline / Red</span>
                {syncStatus === 'syncing' && (
                  <span className="text-[10px] text-purple-300 font-normal animate-pulse">
                    (Progreso...)
                  </span>
                )}
              </span>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="text-slate-400 hover:text-white transition-colors p-1"
                aria-label="Cerrar panel"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </h5>
            
            {/* Reachability stats */}
            <div className="space-y-1 text-[11px] pb-1.5 border-b" style={{ borderColor: 'var(--line)' }}>
              <div className="flex justify-between">
                <span style={{ color: 'var(--muted)' }}>Browser Online:</span>
                <span className="font-semibold">{browserOnline ? 'Sí' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--muted)' }}>Backend Reachable:</span>
                <span className="font-semibold flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${backendReachable ? 'bg-green-500' : 'bg-red-500'}`} />
                  {backendReachable ? `Sí (${latency_ms.backend}ms)` : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--muted)' }}>IA Service Reachable:</span>
                <span className="font-semibold flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${iaServiceReachable ? 'bg-green-500' : 'bg-red-500'}`} />
                  {iaServiceReachable ? `Sí (${latency_ms.ia_service}ms)` : 'No'}
                </span>
              </div>
            </div>

            {syncStatus === 'syncing' ? (
              <div className="space-y-1 py-1">
                {STEPS.map(renderProgressStep)}
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--muted)' }}>Última sync global:</span>
                    <span className="font-semibold">{formattedDate()}</span>
                  </div>
                  {metadata?.admin_user && (
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--muted)' }}>Operador:</span>
                      <span className="font-semibold">{metadata.admin_user}</span>
                    </div>
                  )}
                </div>

                {/* Module Sync Status */}
                <div className="pt-2 border-t space-y-1" style={{ borderColor: 'var(--line)' }}>
                  <p className="font-bold text-[10px] uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Estado por Módulo:</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                    {STEPS.map((step) => {
                      const modMeta = moduleStatus[step.key];
                      const errorMsg = syncErrors[step.key] || modMeta?.last_error;
                      
                      let statusText = 'Pendiente';
                      let statusColor = 'text-slate-400';
                      
                      if (modMeta) {
                        if (modMeta.status === 'success') {
                          statusText = `OK (${modMeta.records_count} reg)`;
                          statusColor = 'text-green-400';
                        } else if (modMeta.status === 'failed') {
                          statusText = 'Fallo';
                          statusColor = 'text-red-400 font-semibold';
                        }
                      }
                      
                      return (
                        <div key={step.key} className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-300">{step.label}:</span>
                          <span className={`${statusColor} flex items-center gap-1`} title={errorMsg}>
                            {statusText}
                            {errorMsg && (
                              <svg className="h-3 w-3 text-red-400 cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Cola de Operaciones Offline */}
            <div className="pt-2.5 border-t space-y-2" style={{ borderColor: 'var(--line)' }}>
              <div className="flex justify-between items-center">
                <span className="font-bold text-[10px] uppercase tracking-wide text-slate-400">
                  Cola de Acciones ({mutations.length}):
                </span>
                {mutations.filter(m => m.status === 'pending' || m.status === 'failed').length > 0 && isOnline && (
                  <button
                    type="button"
                    onClick={handleProcessQueue}
                    className="px-2 py-0.5 bg-indigo-500 hover:bg-indigo-600 rounded text-[9px] font-bold text-white transition-colors"
                  >
                    Procesar Todo
                  </button>
                )}
              </div>

              {mutations.length === 0 ? (
                <p className="text-[10px] text-slate-500">No hay acciones en la cola.</p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {mutations.map((m) => {
                    const statusColors = {
                      pending: 'text-yellow-400',
                      syncing: 'text-purple-400 animate-pulse',
                      synced: 'text-green-400',
                      failed: 'text-red-400',
                      conflict: 'text-orange-400',
                      cancelled: 'text-slate-500 line-through'
                    };
                    const statusLabel = {
                      pending: 'Pendiente',
                      syncing: 'Enviando...',
                      synced: 'Listo',
                      failed: 'Error',
                      conflict: 'Conflicto detectado',
                      cancelled: 'Cancelado'
                    };

                    return (
                      <div key={m.id} className="flex flex-col gap-1.5 bg-white/5 p-2 rounded-lg border border-white/5 text-[10px]">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col gap-0.5 max-w-[170px]">
                            <span className="font-semibold text-slate-200 capitalize truncate">
                              {m.module} - {m.action.replace('_', ' ')}
                            </span>
                            {m.last_error && (
                              <span className="text-[8px] text-red-300 truncate" title={m.last_error}>
                                {m.last_error}
                              </span>
                            )}
                            {m.status === 'conflict' && (
                              <span className="text-[8px] text-orange-300 font-medium">
                                Conflicto: El registro cambió en servidor.
                              </span>
                            )}
                          </div>
                          
                          <span className={`font-bold shrink-0 ${statusColors[m.status] || 'text-slate-300'}`}>
                            {statusLabel[m.status] || m.status}
                          </span>
                        </div>
                        
                        {(m.status === 'failed' || m.status === 'conflict' || m.status === 'pending') && (
                          <div className="flex justify-end gap-2 border-t border-white/5 pt-1.5 mt-0.5">
                            {(m.status === 'failed' || m.status === 'conflict') && (
                              <button
                                type="button"
                                onClick={(e) => handleRetryMutation(m.id, e)}
                                className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded text-[9px] font-bold transition-all"
                                title="Reintentar acción"
                              >
                                Reintentar
                              </button>
                            )}
                            
                            {(m.status === 'pending' || m.status === 'failed' || m.status === 'conflict') && (
                              <button
                                type="button"
                                onClick={(e) => handleCancelMutation(m.id, e)}
                                className="px-2 py-0.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-[9px] font-bold transition-all"
                                title="Descartar cambio local"
                              >
                                Descartar cambio local
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {lastError && (
              <div className="pt-2 border-t text-[11px] text-red-400 font-medium whitespace-pre-wrap max-h-24 overflow-y-auto" style={{ borderColor: 'var(--line)' }}>
                Error general: {lastError}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
