import React from 'react';
import { useConnectivity } from '../../../shared/hooks/useConnectivity';
import { useAdminSyncStore } from '../services/adminSyncStore';

export default function OfflineBanner({ moduleName }) {
  const { backendReachable } = useConnectivity();
  const { metadata, pendingCount, moduleStatus } = useAdminSyncStore();

  const isOnline = backendReachable;

  if (isOnline) return null;

  const modStatus = moduleStatus[moduleName];
  const hasCache = modStatus && modStatus.status === 'success' && (modStatus.records_count > 0 || moduleName === 'fraud_risk' || moduleName === 'audit_general' || moduleName === 'audit_ai');
  const lastSync = modStatus?.last_successful_sync_at || metadata?.synced_at;

  return (
    <div 
      className="rounded-2xl border p-4 mb-6 flex flex-col gap-2 transition-all duration-300 animate-in fade-in slide-in-from-top-2"
      style={{
        borderColor: 'rgba(245, 158, 11, 0.25)',
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        color: '#d97706',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-center gap-2.5 font-bold text-sm">
        <svg className="w-5 h-5 flex-shrink-0 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Sin conexión. Mostrando datos de la última sincronización.</span>
      </div>
      
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs mt-0.5 opacity-90">
        {lastSync ? (
          <div>
            Última sincronización: <span className="font-bold">{new Date(lastSync).toLocaleString()}</span>
          </div>
        ) : (
          <div>
            Última sincronización: <span className="font-bold">Nunca</span>
          </div>
        )}
        
        {pendingCount > 0 && (
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping" />
            <span>Hay <span className="font-bold text-indigo-600 dark:text-indigo-400">{pendingCount}</span> acciones pendientes de sincronizar en la cola.</span>
          </div>
        )}
      </div>

      {!hasCache && (
        <div className="mt-2 text-xs font-extrabold text-red-600 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl flex items-center gap-2">
          <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>No hay datos offline disponibles para esta pantalla. Por favor conéctate y realiza una sincronización inicial.</span>
        </div>
      )}
    </div>
  );
}
