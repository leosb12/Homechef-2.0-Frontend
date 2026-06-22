import { api } from '../../../shared/services/api';
import { readListWithFallback, readDetailWithFallback, mutateOfflineFirst, isNetworkError } from './adminOfflineHelpers';
import { getEntity, saveEntityDirect, getEntities, saveEntities } from './adminOfflineRepository';

export async function fetchQualityPublications(filter) {
  if (navigator.onLine) {
    try {
      let path = '/admin/publicaciones/calidad/';
      if (filter === 'SOSPECHOSAS') {
        path = '/admin/publicaciones/calidad/sospechosas/';
      } else if (filter && filter !== 'ALL') {
        path = `/admin/publicaciones/calidad/?status=${filter}`;
      }
      const { data } = await api.get(path);
      // Update local cache
      const items = Array.isArray(data) ? data : data?.items || [];
      await saveEntities('fraud_risk', items);
      return data;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
    }
  }

  // Offline fallback
  const cached = await getEntities('fraud_risk');
  
  if (filter === 'SOSPECHOSAS') {
    return cached.filter((p) => 
      (p.ia_risk_score ?? 0) >= 60 ||
      (p.reported_count ?? 0) > 0 ||
      ['requiere_revision', 'oculta_temporalmente', 'requiere_correccion', 'rechazada'].includes(p.revision_status)
    );
  }
  
  if (filter && filter !== 'ALL') {
    return cached.filter((p) => p.revision_status === filter);
  }
  
  return cached;
}

export async function fetchQualityPublicationDetail(dishId) {
  return readDetailWithFallback('fraud_risk', dishId, async () => {
    const { data } = await api.get(`/admin/publicaciones/calidad/${dishId}/`);
    return data;
  });
}

export async function performQualityAction(dishId, action, comment) {
  // Update local entity immediately
  try {
    const dish = await getEntity('fraud_risk', dishId);
    if (dish) {
      let mappedStatus = dish.revision_status;
      if (action === 'aprobar' || action === 'approve') mappedStatus = 'aprobada';
      else if (action === 'rechazar' || action === 'reject') mappedStatus = 'rechazada';
      else if (action === 'ocultar' || action === 'hide') mappedStatus = 'oculta_temporalmente';
      else if (action === 'solicitar-correccion' || action === 'corregir') mappedStatus = 'requiere_correccion';
      
      await saveEntityDirect('fraud_risk', dishId, {
        ...dish,
        revision_status: mappedStatus,
        admin_review_comment: comment,
        admin_reviewed_at: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn('Could not update quality status locally:', e);
  }

  const payload = comment ? { action_type: action, comment } : { action_type: action };
  return mutateOfflineFirst(
    'quality_publications',
    'action',
    payload,
    dishId,
    async () => {
      const payloadApi = comment ? { comment } : {};
      const { data } = await api.post(`/admin/publicaciones/calidad/${dishId}/${action}/`, payloadApi);
      return data;
    }
  );
}

export async function deleteQualityPublicationPermanent(dishId) {
  try {
    const dish = await getEntity('fraud_risk', dishId);
    if (dish) {
      await saveEntityDirect('fraud_risk', dishId, {
        ...dish,
        deleted_at: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn('Could not mark quality publication deleted locally:', e);
  }

  return mutateOfflineFirst(
    'quality_publications',
    'delete_permanent',
    {},
    dishId,
    async () => {
      const { data } = await api.delete(`/admin/publicaciones/calidad/${dishId}/eliminar-definitivo/`);
      return data;
    }
  );
}

export async function analyzeVisualModeration(dishId) {
  if (!navigator.onLine) {
    throw new Error('El análisis de moderación visual con IA no está disponible sin conexión.');
  }
  const { data } = await api.post(`/admin/publicaciones/calidad/${dishId}/analizar-imagen-ia/`);
  return data;
}
