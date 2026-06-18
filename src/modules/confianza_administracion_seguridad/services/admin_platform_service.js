import { api } from '../../../shared/services/api';

class AdminPlatformService {
  async getUsers() {
    const response = await api.get('/trust-admin/users/');
    return response.data;
  }

  async toggleUserBlock(userId) {
    const response = await api.post(`/trust-admin/users/${userId}/toggle-block/`);
    return response.data;
  }

  async getPendingChefs() {
    const response = await api.get('/trust-admin/chefs/pending/');
    return response.data;
  }

  async validateChef(chefId, status) {
    // status should be 'approved' or 'rejected'
    const response = await api.post(`/trust-admin/chefs/${chefId}/validate/`, { status });
    return response.data;
  }

  async getPublications() {
    const response = await api.get('/trust-admin/publications/');
    return response.data;
  }

  async togglePublicationAction(dishId, action) {
    // action: 'pause', 'soft_delete', 'restore'
    const response = await api.post(`/trust-admin/publications/${dishId}/action/`, { action });
    return response.data;
  }

  async getQualityStats() {
    const response = await api.get('/trust-admin/publicaciones/calidad/');
    return response.data;
  }
}

export default new AdminPlatformService();
