import axios, { AxiosError } from 'axios'
import { invalidateApiCache } from '../../../shared/services/api'
import type {
  AIAccessStatus,
  AISubscriptionAuditLog,
  AISubscriptionPayment,
  AISubscriptionPlan,
  AISubscriptionStatus,
  ApiErrorResponse,
  ApiFailure,
  CancelSubscriptionRequest,
  ChangePlanRequest,
  PaymentCheckout,
  PaymentReturnConfirmation,
  PaymentReturnConfirmRequest,
  RenewRequest,
  SubscribeRequest,
  SubscriptionSummary,
  SubscriptionSummaryRequest,
} from '../types/aiSubscription'

const IA_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || apiOriginFrom(import.meta.env.VITE_API_URL) || 'http://localhost:8000'

const iaApi = axios.create({
  baseURL: IA_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

iaApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('homechef_access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

iaApi.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const status = error.response?.status
    if ((status === 401 || status === 403) && typeof window !== 'undefined') {
      localStorage.removeItem('homechef_access_token')
      localStorage.removeItem('homechef_role')
      localStorage.removeItem('homechef_user')
      invalidateApiCache()
      if (!window.location.pathname.startsWith('/login')) window.location.replace('/login')
    }
    return Promise.reject(toApiFailure(error))
  },
)

export async function getSubscriptionStatus(): Promise<AISubscriptionStatus> {
  return requestData<AISubscriptionStatus>(() => iaApi.get('/api/ia/subscription/status/'))
}

export async function getPlans(): Promise<AISubscriptionPlan[]> {
  const data = await requestData<AISubscriptionPlan[] | { items?: AISubscriptionPlan[]; plans?: AISubscriptionPlan[] }>(() =>
    iaApi.get('/api/ia/plans/'),
  )
  if (Array.isArray(data)) return data
  return data.items || data.plans || []
}

export async function getSubscriptionSummary(payload: SubscriptionSummaryRequest): Promise<SubscriptionSummary> {
  return requestData<SubscriptionSummary>(() => iaApi.post('/api/ia/subscription/summary/', payload))
}

export async function subscribe(payload: SubscribeRequest): Promise<PaymentCheckout> {
  return requestData<PaymentCheckout>(() => iaApi.post('/api/ia/subscription/subscribe/', payload))
}

export async function changePlan(payload: ChangePlanRequest): Promise<PaymentCheckout> {
  return requestData<PaymentCheckout>(() => iaApi.post('/api/ia/subscription/change-plan/', payload))
}

export async function renew(payload: RenewRequest): Promise<PaymentCheckout> {
  return requestData<PaymentCheckout>(() => iaApi.post('/api/ia/subscription/renew/', payload))
}

export async function cancel(payload: CancelSubscriptionRequest): Promise<unknown> {
  return requestData<unknown>(() => iaApi.post('/api/ia/subscription/cancel/', payload))
}

export async function confirmPaymentReturn(payload: PaymentReturnConfirmRequest): Promise<PaymentReturnConfirmation> {
  return requestData<PaymentReturnConfirmation>(() => iaApi.post('/api/ia/subscription/payments/confirm-return/', payload))
}

export async function getPayments(): Promise<AISubscriptionPayment[]> {
  const data = await requestData<AISubscriptionPayment[] | { items?: AISubscriptionPayment[]; payments?: AISubscriptionPayment[] }>(() =>
    iaApi.get('/api/ia/subscription/payments/'),
  )
  if (Array.isArray(data)) return data
  return data.items || data.payments || []
}

export async function getAuditLog(): Promise<AISubscriptionAuditLog[]> {
  const data = await requestData<AISubscriptionAuditLog[] | { items?: AISubscriptionAuditLog[]; logs?: AISubscriptionAuditLog[] }>(() =>
    iaApi.get('/api/ia/subscription/audit-log/'),
  )
  if (Array.isArray(data)) return data
  return data.items || data.logs || []
}

export async function canUseAI(): Promise<AIAccessStatus> {
  return requestData<AIAccessStatus>(() => iaApi.get('/api/ia/subscription/can-use-ai/'))
}

async function requestData<T>(request: () => Promise<{ data: unknown }>): Promise<T> {
  const response = await request()
  const body = response.data as { success?: boolean; message?: string; data?: T; error?: ApiErrorResponse['error'] }
  if (body?.success === false) throw buildFailure(body.message || 'No se pudo completar la operacion.', body.error)
  if (Object.prototype.hasOwnProperty.call(body || {}, 'data')) return body.data as T
  return response.data as T
}

function toApiFailure(error: AxiosError<ApiErrorResponse>): ApiFailure {
  if (error.response?.data) {
    return buildFailure(error.response.data.message || 'No se pudo completar la operacion.', error.response.data.error, error.response.status)
  }
  if (error.request) return buildFailure('No se pudo conectar con el servidor de suscripcion IA.')
  return buildFailure(error.message || 'Ocurrio un error inesperado.')
}

function buildFailure(message: string, error?: ApiErrorResponse['error'], status?: number): ApiFailure {
  const failure = new Error(message) as ApiFailure
  failure.code = error?.code
  failure.details = error?.details
  failure.status = status
  return failure
}

function apiOriginFrom(apiUrl?: string) {
  if (!apiUrl) return ''
  return apiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')
}
