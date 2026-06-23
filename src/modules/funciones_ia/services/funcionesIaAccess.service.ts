import axios, { AxiosError } from 'axios';
import type { UsarFuncionIARequest, UsarFuncionIAResponse } from '../types/funcionesIa.types';
import { isNetworkLikeError } from '../shared/offline/offline_utils';

const IA_API_BASE_URL =
  runtimeConfig().VITE_API_BASE_URL ||
  runtimeConfig().API_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  apiOriginFrom(import.meta.env.VITE_API_URL) ||
  'https://proyecto.leonardoserrate.xyz';

const iaAccessApi = axios.create({
  baseURL: IA_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 5000,
});

iaAccessApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('homechef_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function usarFuncionIA(funcion: UsarFuncionIARequest['funcion']): Promise<UsarFuncionIAResponse> {
  try {
    const { data } = await iaAccessApi.post<UsarFuncionIAResponse>('/api/ia/usar-funcion', { funcion });
    if (data && data.permitido) {
      localStorage.setItem(`homechef_ia_permission_${funcion}`, JSON.stringify(data));
    }
    return data;
  } catch (error) {
    if (isNetworkLikeError(error)) {
      const token = localStorage.getItem('homechef_access_token');
      const cached = localStorage.getItem(`homechef_ia_permission_${funcion}`);
      if (token && cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.permitido) {
            return {
              ...parsed,
              mensaje: 'Backend no disponible. Usando último acceso IA validado.',
              offlineCachedAccess: true,
            };
          }
        } catch (e) {
          console.warn('[funcionesIaAccess.service] Error parsing cached permission:', e);
        }
      }
    }

    const axiosError = error as AxiosError<Partial<UsarFuncionIAResponse>>;
    if (axiosError.response?.data?.codigo) {
      return normalizeIAResponse(axiosError.response.data);
    }
    if (axiosError.response?.status === 401) {
      return {
        permitido: false,
        codigo: 'USUARIO_NO_AUTENTICADO',
        mensaje: 'Debes iniciar sesión para utilizar funciones IA.',
      };
    }
    throw error;
  }
}

function normalizeIAResponse(data: Partial<UsarFuncionIAResponse>): UsarFuncionIAResponse {
  return {
    permitido: Boolean(data.permitido),
    codigo: data.codigo || 'IA_NO_IMPLEMENTADA',
    mensaje: data.mensaje || 'No se pudo validar el acceso a la función IA.',
  };
}

function apiOriginFrom(apiUrl?: string) {
  if (!apiUrl) return '';
  return apiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
}

function runtimeConfig() {
  return typeof globalThis !== 'undefined' ? ((globalThis as any).__HOMECHEF_RUNTIME_CONFIG || {}) : {};
}
