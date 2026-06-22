import { api } from '../../../shared/services/api';
import { isBackendReachable } from '../../../shared/services/connectivityService';
import { readListWithFallback, mutateOfflineFirst, isNetworkError } from './adminOfflineHelpers';
import { getEntity, saveEntityDirect, getEntities } from './adminOfflineRepository';

class AdminPlatformService {
  async getUsers() {
    return readListWithFallback('users', async () => {
      const response = await api.get('/trust-admin/users/');
      return response.data;
    });
  }

  async toggleUserBlock(userId) {
    // Determine new state locally if possible
    let targetIsActive = false;
    try {
      const user = await getEntity('users', userId);
      if (user) {
        targetIsActive = !user.is_active;
        // Update local entity immediately so UI changes without waiting
        await saveEntityDirect('users', userId, { ...user, is_active: targetIsActive });
      }
    } catch (e) {
      console.warn('Could not update user state locally:', e);
    }

    return mutateOfflineFirst(
      'users',
      'toggle_block',
      { is_active: targetIsActive },
      userId,
      async () => {
        const response = await api.post(`/trust-admin/users/${userId}/toggle-block/`);
        return response.data;
      }
    );
  }

  async getPendingChefs() {
    return readListWithFallback('chefs', async () => {
      const response = await api.get('/trust-admin/chefs/pending/');
      return response.data;
    });
  }

  async validateChef(chefId, status) {
    try {
      const chef = await getEntity('chefs', chefId);
      if (chef) {
        // Remove validated chef from pending list locally
        await saveEntityDirect('chefs', chefId, { ...chef, status, deleted_at: new Date().toISOString() });
      }
    } catch (e) {
      console.warn('Could not update chef state locally:', e);
    }

    return mutateOfflineFirst(
      'chefs',
      'validate',
      { status },
      chefId,
      async () => {
        const response = await api.post(`/trust-admin/chefs/${chefId}/validate/`, { status });
        return response.data;
      }
    );
  }

  async getPublications() {
    return readListWithFallback('publications', async () => {
      const response = await api.get('/trust-admin/publications/');
      return response.data;
    });
  }

  async togglePublicationAction(dishId, action) {
    let targetStatus = 'published';
    let targetDeleted = null;

    if (action === 'pause') {
      targetStatus = 'paused';
    } else if (action === 'soft_delete') {
      targetStatus = 'paused';
      targetDeleted = new Date().toISOString();
    } else if (action === 'restore') {
      targetStatus = 'draft';
      targetDeleted = null;
    }

    try {
      const dish = await getEntity('publications', dishId);
      if (dish) {
        await saveEntityDirect('publications', dishId, {
          ...dish,
          status: targetStatus,
          deleted_at: targetDeleted
        });
      }
    } catch (e) {
      console.warn('Could not update publication state locally:', e);
    }

    return mutateOfflineFirst(
      'publications',
      'action',
      { action, status: targetStatus, deleted_at: targetDeleted },
      dishId,
      async () => {
        const response = await api.post(`/trust-admin/publications/${dishId}/action/`, { action });
        return response.data;
      }
    );
  }

  async getQualityStats() {
    // Quality stats endpoint is not standard list but we fallback to a cached dictionary if offline
    const online = isBackendReachable() || (typeof navigator !== 'undefined' && navigator.onLine);
    if (online) {
      try {
        const response = await api.get('/trust-admin/publicaciones/calidad/');
        return response.data;
      } catch (error) {
        if (!isNetworkError(error)) throw error;
      }
    }
    // Fallback: calculate from cached fraud_risk publications
    const cached = await getEntities('fraud_risk');
    return cached;
  }
}

export default new AdminPlatformService();
