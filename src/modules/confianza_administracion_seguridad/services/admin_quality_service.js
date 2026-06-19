import { api } from '../../../shared/services/api'

export async function fetchQualityPublications(filter) {
  let path = '/admin/publicaciones/calidad/'
  if (filter === 'SOSPECHOSAS') {
    path = '/admin/publicaciones/calidad/sospechosas/'
  }
  const { data } = await api.get(path)
  return data
}

export async function fetchQualityPublicationDetail(dishId) {
  const { data } = await api.get(`/admin/publicaciones/calidad/${dishId}/`)
  return data
}

export async function performQualityAction(dishId, action, comment) {
  const payload = comment ? { comment } : {}
  const { data } = await api.post(`/admin/publicaciones/calidad/${dishId}/${action}/`, payload)
  return data
}

export async function deleteQualityPublicationPermanent(dishId) {
  const { data } = await api.delete(`/admin/publicaciones/calidad/${dishId}/eliminar-definitivo/`)
  return data
}

/**
 * Dispara el análisis de moderación visual real con IA (Groq Vision) para la imagen de un plato.
 * El backend llama al microservicio FastAPI y guarda el resultado en la base de datos.
 * Siempre retorna, incluso si hay error (error_controlado=true en ese caso).
 */
export async function analyzeVisualModeration(dishId) {
  const { data } = await api.post(`/admin/publicaciones/calidad/${dishId}/analizar-imagen-ia/`)
  return data
}

