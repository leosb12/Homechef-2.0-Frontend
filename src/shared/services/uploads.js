import { api } from './api'

export async function uploadFile(file, type = 'general') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', type)
  const { data } = await api.post('/uploads/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}
