import { api } from '../../../shared/services/api';
import { getEntities, getEntity, saveEntities } from './adminOfflineRepository';
import { isNetworkError } from './adminOfflineHelpers';

function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
}

async function download(endpoint, params, filename) {
  if (!navigator.onLine) {
    alert('La exportación de reportes no está disponible sin conexión.');
    return;
  }
  const response = await api.get(endpoint, {
    params: cleanParams(params),
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

class AuditService {
  async getGeneral(params = {}) {
    if (navigator.onLine) {
      try {
        const data = await api.get('/trust-admin/audit/general/', { params: cleanParams(params) }).then((res) => res.data);
        const items = Array.isArray(data?.items) ? data.items : [];
        if (items.length > 0) {
          await saveEntities('audit_general', items);
        }
        return data;
      } catch (error) {
        if (!isNetworkError(error)) throw error;
      }
    }

    // Offline fallback
    const cached = await getEntities('audit_general');
    // Local filter implementation
    let filtered = cached;
    const search = params.search || params.q;
    if (search) {
      const needle = String(search).toLowerCase();
      filtered = filtered.filter(e => 
        String(e.event).toLowerCase().includes(needle) || 
        JSON.stringify(e.details || {}).toLowerCase().includes(needle)
      );
    }
    
    return {
      items: filtered,
      pagination: {
        page: 1,
        page_size: filtered.length,
        limit: filtered.length,
        total: filtered.length,
        total_pages: 1,
      },
      __offline: true,
    };
  }

  async getGeneralSummary(params = {}) {
    if (navigator.onLine) {
      try {
        return await api.get('/trust-admin/audit/general/summary/', { params: cleanParams(params) }).then((res) => res.data);
      } catch (error) {
        if (!isNetworkError(error)) throw error;
      }
    }

    // Offline fallback
    const cached = await getEntities('audit_general');
    const byType = {};
    for (const e of cached) {
      byType[e.event] = (byType[e.event] || 0) + 1;
    }

    return {
      total_events: cached.length,
      by_type: byType,
      __offline: true,
    };
  }

  async getGeneralDetail(id) {
    if (navigator.onLine) {
      try {
        return await api.get(`/trust-admin/audit/general/${id}/`).then((res) => res.data);
      } catch (error) {
        if (!isNetworkError(error)) throw error;
      }
    }

    // Offline fallback
    const all = await getEntities('audit_general');
    const found = all.find(e => String(e.id) === String(id));
    if (!found) {
      throw new Error('Evento de auditoría no encontrado en el cache offline.');
    }
    return { ...found, __offline: true };
  }

  exportGeneral(params) {
    return download('/trust-admin/audit/general/export/', params, `homechef-auditoria-general.${params.format || 'csv'}`);
  }

  async getAI(params = {}) {
    if (navigator.onLine) {
      try {
        const data = await api.get('/trust-admin/audit/ai/events/', { params: cleanParams(params) }).then((res) => res.data);
        const items = Array.isArray(data?.items) ? data.items : [];
        if (items.length > 0) {
          await saveEntities('audit_ai', items);
        }
        return data;
      } catch (error) {
        if (!isNetworkError(error)) throw error;
      }
    }

    // Offline fallback
    let cached = [];
    if (params.collection) {
      cached = await getEntities(`cache_${params.collection}`);
    } else {
      cached = await getEntities('audit_ai');
    }
    let filtered = cached;
    const search = params.search || params.q;
    if (search) {
      const needle = String(search).toLowerCase();
      filtered = filtered.filter(e => 
        String(e.prompt || e.details || '').toLowerCase().includes(needle) || 
        String(e.response || e.error || '').toLowerCase().includes(needle) ||
        String(e.model || '').toLowerCase().includes(needle) ||
        String(e.provider || '').toLowerCase().includes(needle)
      );
    }
    const auditType = params.audit_type || params.collection;
    if (auditType && auditType !== 'todo' && !params.collection) {
      filtered = filtered.filter(e => String(e.audit_type).toLowerCase() === String(auditType).toLowerCase() || String(e.collection) === String(auditType));
    }

    return {
      items: filtered,
      pagination: {
        page: 1,
        page_size: filtered.length,
        limit: filtered.length,
        total: filtered.length,
        total_pages: 1,
      },
      __offline: true,
    };
  }

  async getAISummary(params = {}) {
    if (navigator.onLine) {
      try {
        return await api.get('/trust-admin/audit/ai/summary/', { params: cleanParams(params) }).then((res) => res.data);
      } catch (error) {
        if (!isNetworkError(error)) throw error;
      }
    }

    // Offline fallback
    const cached = await getEntities('audit_ai');
    const success = cached.filter(e => e.status === 'success').length;
    const failed = cached.filter(e => e.status === 'failed').length;
    const latencies = cached.map(e => Number(e.latency_ms)).filter(val => !isNaN(val));
    const byProvider = {};
    const byModule = {};
    const byAuditType = {};

    for (const e of cached) {
      if (e.provider) byProvider[e.provider] = (byProvider[e.provider] || 0) + 1;
      if (e.module) byModule[e.module] = (byModule[e.module] || 0) + 1;
      if (e.audit_type) byAuditType[e.audit_type] = (byAuditType[e.audit_type] || 0) + 1;
    }

    return {
      total_ai_queries: cached.length,
      successful_queries: success,
      failed_queries: failed,
      average_latency_ms: latencies.length ? round(latencies.reduce((a,b)=>a+b, 0) / latencies.length, 2) : null,
      by_provider: byProvider,
      by_module: byModule,
      by_audit_type: byAuditType,
      __offline: true,
    };
  }

  async getAICollections() {
    if (navigator.onLine) {
      try {
        return await api.get('/trust-admin/audit/ai/collections/').then((res) => res.data);
      } catch (error) {
        if (!isNetworkError(error)) throw error;
      }
    }
    // Offline collections structure
    return {
      items: [
        { collection: "user_manual_chatbot_conversations", audit_type: "Manual / Chatbot", label: "Manual / Chatbot", exists: true },
        { collection: "ai_inference_audit", audit_type: "Inferencias IA", label: "Inferencias IA", exists: true },
        { collection: "ai_requests", audit_type: "Requests IA", label: "Requests IA", exists: true },
        { collection: "ai_model_status", audit_type: "Estado de Modelos", label: "Estado de Modelos", exists: true },
        { collection: "ai_offline_test_results", audit_type: "Pruebas Offline", label: "Pruebas Offline", exists: true },
        { collection: "ai_training_reports", audit_type: "Entrenamientos", label: "Entrenamientos", exists: true },
        { collection: "ai_dataset_metadata", audit_type: "Datasets", label: "Datasets", exists: true },
        { collection: "publication_quality_reviews", audit_type: "Calidad Publicaciones", label: "Calidad Publicaciones", exists: true },
      ],
      __offline: true,
    };
  }

  async getAIDetail(id) {
    if (navigator.onLine) {
      try {
        return await api.get(`/trust-admin/audit/ai/events/${encodeURIComponent(id)}/`).then((res) => res.data);
      } catch (error) {
        if (!isNetworkError(error)) throw error;
      }
    }

    // Offline fallback
    const all = await getEntities('audit_ai');
    const found = all.find(e => String(e.id) === String(id) || String(e.mongo_id) === String(id));
    if (!found) {
      throw new Error('Detalle de auditoría IA no encontrado en cache offline.');
    }
    return { ...found, __offline: true };
  }

  exportAI(params) {
    return download('/trust-admin/audit/ai/export/', params, `homechef-auditoria-ia.${params.format || 'csv'}`);
  }
}

function round(val, precision = 2) {
  const mult = Math.pow(10, precision);
  return Math.round(val * mult) / mult;
}

export default new AuditService();
