export type AISubscriptionState = 'ACTIVE' | 'CANCELLED' | 'PENDING_PAYMENT' | 'EXPIRED' | 'SUSPENDED' | string
export type AIPaymentStatus = 'APPROVED' | 'REJECTED' | 'PENDING' | 'ERROR' | string
export type PaymentProvider = 'STRIPE_SANDBOX' | 'COINGATE_SANDBOX'
export type AIPaymentProvider = PaymentProvider | string
export type SubscriptionOperation = 'subscribe' | 'change_plan' | 'renew'

export interface ApiSuccessResponse<T> {
  success: true
  message: string
  data: T
}

export interface ApiErrorResponse {
  success: false
  message: string
  error?: {
    code?: string
    details?: string
  }
}

export interface ApiFailure extends Error {
  code?: string
  details?: string
  status?: number
}

export interface AISubscriptionPlan {
  id: number | string
  name: string
  description?: string
  price?: number | string
  currency?: string
  duration_days?: number
  duration?: string
  benefits?: string[]
  ai_query_limit?: number | null
  ai_generation_limit?: number | null
  vision_enabled?: boolean
  production_recommendations_enabled?: boolean
  pricing_support_enabled?: boolean
  publishing_support_enabled?: boolean
  is_available?: boolean
  available?: boolean
  payment_providers?: AIPaymentProvider[]
}

export interface ChefAISubscription {
  id?: number | string
  plan?: AISubscriptionPlan | null
  plan_name?: string
  status?: AISubscriptionState
  start_date?: string
  end_date?: string
  current_period_start?: string
  current_period_end?: string
  auto_renew?: boolean
  cancel_at_period_end?: boolean
  ai_query_limit?: number | null
  ai_generation_limit?: number | null
}

export interface AISubscriptionStatus {
  subscription?: ChefAISubscription | null
  current_subscription?: ChefAISubscription | null
  plan?: AISubscriptionPlan | null
  status?: AISubscriptionState
  can_use_ai?: boolean
  reason?: string
  message?: string
}

export interface AIAccessStatus {
  can_use_ai: boolean
  reason?: string
  message?: string
  status?: AISubscriptionState
}

export interface AISubscriptionPayment {
  id?: number | string
  created_at?: string
  date?: string
  payment_provider?: AIPaymentProvider
  provider?: AIPaymentProvider
  amount?: number | string
  currency?: string
  status?: AIPaymentStatus
  external_reference?: string
  rejection_reason?: string
}

export interface AISubscriptionAuditLog {
  id?: number | string
  created_at?: string
  date?: string
  action?: string
  description?: string
  metadata?: Record<string, unknown> | string | null
}

export interface SubscriptionSummaryRequest {
  plan_id: number | string
  operation: SubscriptionOperation
}

export interface SubscriptionSummary {
  plan?: AISubscriptionPlan
  price?: number | string
  currency?: string
  start_date?: string
  end_date?: string
  validity?: string
  conditions?: string[] | string
  limits?: Record<string, unknown>
  benefits?: string[]
}

export interface SubscribeRequest {
  plan_id: number | string
  payment_provider: PaymentProvider
  payment_method_id: string | null
}

export interface ChangePlanRequest {
  new_plan_id: number | string
  payment_provider: PaymentProvider
  payment_method_id: string | null
}

export interface RenewRequest {
  payment_provider: PaymentProvider
  payment_method_id: string | null
}

export interface PaymentCheckout {
  payment_status?: AIPaymentStatus
  provider?: PaymentProvider
  payment_url?: string
  external_reference?: string
}

export interface CancelSubscriptionRequest {
  cancel_at_period_end: boolean
  reason: string
}

export interface PaymentReturnConfirmRequest {
  provider?: PaymentProvider
  stripe_session_id?: string
  coingate_order_id?: string
  trust_provider_return?: boolean
}

export interface PaymentReturnConfirmation {
  handled?: boolean
  status?: AIPaymentStatus | string
  provider?: AIPaymentProvider
}
