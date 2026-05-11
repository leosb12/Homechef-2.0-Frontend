import axios, { AxiosError } from 'axios'
import type { UsarFuncionIARequest, UsarFuncionIAResponse } from '../types/iaAccess'

const IA_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  apiOriginFrom(import.meta.env.VITE_API_URL) ||
  'https://homechef-2-0-backend.onrender.com'

const iaAccessApi = axios.create({
  baseURL: IA_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

iaAccessApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('homechef_access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export async function usarFuncionIA(funcion: UsarFuncionIARequest['funcion']): Promise<UsarFuncionIAResponse> {
  try {
    const { data } = await iaAccessApi.post<UsarFuncionIAResponse>('/api/ia/usar-funcion', { funcion })
    return data
  } catch (error) {
    const axiosError = error as AxiosError<Partial<UsarFuncionIAResponse>>
    if (axiosError.response?.data?.codigo) {
      return normalizeIAResponse(axiosError.response.data)
    }
    if (axiosError.response?.status === 401) {
      return {
        permitido: false,
        codigo: 'USUARIO_NO_AUTENTICADO',
        mensaje: 'Debes iniciar sesión para utilizar funciones IA.',
      }
    }
    throw error
  }
}

function normalizeIAResponse(data: Partial<UsarFuncionIAResponse>): UsarFuncionIAResponse {
  return {
    permitido: Boolean(data.permitido),
    codigo: data.codigo || 'IA_NO_IMPLEMENTADA',
    mensaje: data.mensaje || 'No se pudo validar el acceso a la funcion IA.',
  }
}

function apiOriginFrom(apiUrl?: string) {
  if (!apiUrl) return ''
  return apiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')
}
