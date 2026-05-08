import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  canUseAI,
  cancel,
  changePlan,
  getAuditLog,
  getPayments,
  getPlans,
  getSubscriptionStatus,
  getSubscriptionSummary,
  renew,
  subscribe,
} from '../services/aiSubscriptionApi'
import type {
  AIAccessStatus,
  AISubscriptionAuditLog,
  AISubscriptionPayment,
  AISubscriptionPlan,
  AISubscriptionStatus,
  ApiFailure,
  CancelSubscriptionRequest,
  PaymentCheckout,
  PaymentProvider,
  SubscriptionOperation,
  SubscriptionSummary,
} from '../types/aiSubscription'

export function useAISubscription() {
  const [status, setStatus] = useState<AISubscriptionStatus | null>(null)
  const [plans, setPlans] = useState<AISubscriptionPlan[]>([])
  const [access, setAccess] = useState<AIAccessStatus | null>(null)
  const [payments, setPayments] = useState<AISubscriptionPayment[]>([])
  const [auditLog, setAuditLog] = useState<AISubscriptionAuditLog[]>([])
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<AISubscriptionPlan | null>(null)
  const [summaryOperation, setSummaryOperation] = useState<SubscriptionOperation>('subscribe')
  const [loading, setLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState('')
  const [error, setError] = useState<ApiFailure | null>(null)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string; code?: string; details?: string } | null>(null)

  const subscription = status?.subscription || status?.current_subscription || null
  const isActive = String(subscription?.status || status?.status || '').toUpperCase() === 'ACTIVE'

  const refresh = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!options.silent) setLoading(true)
    setError(null)
    try {
      const [statusResult, plansResult, accessResult, paymentsResult, auditResult] = await Promise.allSettled([
        getSubscriptionStatus(),
        getPlans(),
        canUseAI(),
        getPayments(),
        getAuditLog(),
      ])

      let nextStatus: AISubscriptionStatus | null = null
      if (statusResult.status === 'fulfilled') {
        nextStatus = statusResult.value
      } else if (isSubscriptionRequired(statusResult.reason)) {
        const failure = normalizeFailure(statusResult.reason)
        nextStatus = { status: 'EXPIRED', can_use_ai: false, reason: failure.details || failure.message }
      } else {
        throw statusResult.reason
      }
      setStatus(nextStatus)

      if (plansResult.status === 'fulfilled') {
        setPlans(plansResult.value)
      } else {
        throw plansResult.reason
      }

      if (accessResult.status === 'fulfilled') {
        setAccess(accessResult.value)
      } else if (isSubscriptionRequired(accessResult.reason)) {
        const failure = normalizeFailure(accessResult.reason)
        setAccess({ can_use_ai: false, reason: failure.details || failure.message, message: failure.message, status: nextStatus?.status || 'EXPIRED' })
      } else {
        throw accessResult.reason
      }

      setPayments(paymentsResult.status === 'fulfilled' ? paymentsResult.value : [])
      setAuditLog(auditResult.status === 'fulfilled' ? auditResult.value : [])
    } catch (err) {
      setError(normalizeFailure(err))
    } finally {
      if (!options.silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const openSummary = useCallback(async (plan: AISubscriptionPlan) => {
    const available = plan.is_available ?? plan.available ?? true
    if (!available) {
      setNotice({ type: 'error', message: 'Plan IA no disponible.' })
      void getPlans().then(setPlans).catch(() => undefined)
      return
    }

    const operation: SubscriptionOperation = isActive ? 'change_plan' : 'subscribe'
    setSelectedPlan(plan)
    setSummaryOperation(operation)
    setSummaryLoading(true)
    setNotice(null)
    try {
      const nextSummary = await getSubscriptionSummary({ plan_id: plan.id, operation })
      setSummary(nextSummary)
    } catch (err) {
      const failure = normalizeFailure(err)
      setNotice({ type: 'error', message: failure.message, code: failure.code, details: failure.details })
      setSelectedPlan(null)
      setSummary(null)
    } finally {
      setSummaryLoading(false)
    }
  }, [isActive])

  const openRenewSummary = useCallback(async () => {
    const plan = subscription?.plan || status?.plan || null
    const planId = plan?.id || subscription?.id
    if (!plan || !planId) {
      setNotice({ type: 'error', message: 'No se pudo identificar el plan actual para renovar.' })
      return
    }

    setSelectedPlan(plan)
    setSummaryOperation('renew')
    setSummaryLoading(true)
    setNotice(null)
    try {
      const nextSummary = await getSubscriptionSummary({ plan_id: planId, operation: 'renew' })
      setSummary(nextSummary)
    } catch (err) {
      const failure = normalizeFailure(err)
      setNotice({ type: 'error', message: failure.message, code: failure.code, details: failure.details })
      setSelectedPlan(null)
      setSummary(null)
    } finally {
      setSummaryLoading(false)
    }
  }, [status?.plan, subscription])

  const closeSummary = useCallback(() => {
    setSummary(null)
    setSelectedPlan(null)
  }, [])

  const confirmSelectedPlan = useCallback(async (provider: PaymentProvider) => {
    if (!selectedPlan) return
    setActionLoading('confirm-plan')
    setNotice(null)
    try {
      let checkout: PaymentCheckout
      if (summaryOperation === 'renew') {
        checkout = await renew({
          payment_provider: provider,
          payment_method_id: null,
        })
      } else if (isActive) {
        checkout = await changePlan({
          new_plan_id: selectedPlan.id,
          payment_provider: provider,
          payment_method_id: null,
        })
      } else {
        checkout = await subscribe({
          plan_id: selectedPlan.id,
          payment_provider: provider,
          payment_method_id: null,
        })
      }
      closeSummary()
      if (checkout?.payment_url) {
        setNotice({ type: 'success', message: 'Checkout creado. Redirigiendo al proveedor de pago...' })
        window.location.href = checkout.payment_url
        return
      }
      setNotice({ type: 'success', message: 'Pago pendiente de confirmacion.' })
      await refresh()
    } catch (err) {
      const failure = normalizeFailure(err)
      setNotice({
        type: 'error',
        message: failure.message,
        code: failure.code,
        details: failure.details,
      })
      await refresh().catch(() => undefined)
    } finally {
      setActionLoading('')
    }
  }, [closeSummary, isActive, refresh, selectedPlan, summaryOperation])

  const renewSubscription = useCallback(async (provider: PaymentProvider) => {
    setActionLoading('renew')
    setNotice(null)
    try {
      const checkout = await renew({ payment_provider: provider, payment_method_id: null })
      if (checkout?.payment_url) {
        setNotice({ type: 'success', message: 'Checkout creado. Redirigiendo al proveedor de pago...' })
        window.location.href = checkout.payment_url
        return
      }
      setNotice({ type: 'success', message: 'Pago pendiente de confirmacion.' })
      await refresh()
    } catch (err) {
      const failure = normalizeFailure(err)
      setNotice({
        type: 'error',
        message: failure.message,
        code: failure.code,
        details: failure.details,
      })
      await refresh().catch(() => undefined)
    } finally {
      setActionLoading('')
    }
  }, [refresh])

  const cancelSubscription = useCallback(async (payload: CancelSubscriptionRequest) => {
    setActionLoading('cancel')
    setNotice(null)
    try {
      await cancel(payload)
      setNotice({ type: 'success', message: 'Suscripcion IA cancelada correctamente.' })
      await refresh()
    } catch (err) {
      const failure = normalizeFailure(err)
      setNotice({ type: 'error', message: failure.message, code: failure.code, details: failure.details })
    } finally {
      setActionLoading('')
    }
  }, [refresh])

  return useMemo(() => ({
    access,
    actionLoading,
    auditLog,
    cancelSubscription,
    closeSummary,
    confirmSelectedPlan,
    error,
    isActive,
    loading,
    notice,
    openSummary,
    openRenewSummary,
    payments,
    plans,
    refresh,
    renewSubscription,
    selectedPlan,
    status,
    subscription,
    summary,
    summaryLoading,
    summaryOperation,
  }), [
    access,
    actionLoading,
    auditLog,
    cancelSubscription,
    closeSummary,
    confirmSelectedPlan,
    error,
    isActive,
    loading,
    notice,
    openSummary,
    openRenewSummary,
    payments,
    plans,
    refresh,
    renewSubscription,
    selectedPlan,
    status,
    subscription,
    summary,
    summaryLoading,
    summaryOperation,
  ])
}

function normalizeFailure(error: unknown): ApiFailure {
  if (error instanceof Error) return error as ApiFailure
  return new Error('No se pudo completar la operacion.') as ApiFailure
}

function isSubscriptionRequired(error: unknown) {
  const failure = normalizeFailure(error)
  return failure.status === 402 || failure.code === 'AI_SUBSCRIPTION_REQUIRED'
}
