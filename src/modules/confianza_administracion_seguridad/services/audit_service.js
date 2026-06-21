import { api } from '../../../shared/services/api'

function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  )
}

async function download(endpoint, params, filename) {
  const response = await api.get(endpoint, {
    params: cleanParams(params),
    responseType: 'blob',
  })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

class AuditService {
  getGeneral(params) {
    return api.get('/trust-admin/audit/general/', { params: cleanParams(params) }).then((res) => res.data)
  }

  getGeneralSummary(params) {
    return api.get('/trust-admin/audit/general/summary/', { params: cleanParams(params) }).then((res) => res.data)
  }

  getGeneralDetail(id) {
    return api.get(`/trust-admin/audit/general/${id}/`).then((res) => res.data)
  }

  exportGeneral(params) {
    return download('/trust-admin/audit/general/export/', params, `homechef-auditoria-general.${params.format || 'csv'}`)
  }

  getAI(params) {
    return api.get('/trust-admin/audit/ai/', { params: cleanParams(params) }).then((res) => res.data)
  }

  getAISummary(params) {
    return api.get('/trust-admin/audit/ai/summary/', { params: cleanParams(params) }).then((res) => res.data)
  }

  getAIDetail(id) {
    return api.get(`/trust-admin/audit/ai/${encodeURIComponent(id)}/`).then((res) => res.data)
  }

  exportAI(params) {
    return download('/trust-admin/audit/ai/export/', params, `homechef-auditoria-ia.${params.format || 'csv'}`)
  }
}

export default new AuditService()
