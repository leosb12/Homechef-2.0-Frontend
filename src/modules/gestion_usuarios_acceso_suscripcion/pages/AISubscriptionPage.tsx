import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AIAccessBanner from '../components/ai-subscription/AIAccessBanner'
import AIPlanCard from '../components/ai-subscription/AIPlanCard'
import AuditLogTable from '../components/ai-subscription/AuditLogTable'
import CancelSubscriptionDialog from '../components/ai-subscription/CancelSubscriptionDialog'
import PaymentHistoryTable from '../components/ai-subscription/PaymentHistoryTable'
import SubscriptionStatusCard from '../components/ai-subscription/SubscriptionStatusCard'
import SubscriptionSummaryModal from '../components/ai-subscription/SubscriptionSummaryModal'
import { useAISubscription } from '../hooks/useAISubscription'
import { useAuthSession } from '../services/auth_session'

type Tab = 'status' | 'payments' | 'audit'

export default function AISubscriptionPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const accessToken = useAuthSession((state) => state.accessToken)
  const role = useAuthSession((state) => state.role)
  const [activeTab, setActiveTab] = useState<Tab>('status')
  const [cancelOpen, setCancelOpen] = useState(false)
  const subscriptionState = useAISubscription()
  const paymentReturn = searchParams.get('payment') || ''

  useEffect(() => {
    if (!accessToken) navigate('/login', { replace: true })
    if (role && role !== 'COCINERO') navigate('/', { replace: true })
  }, [accessToken, navigate, role])

  const {
    access,
    actionLoading,
    auditLog,
    cancelSubscription,
    closeSummary,
    confirmSelectedPlan,
    error,
    loading,
    notice,
    openSummary,
    openRenewSummary,
    payments,
    plans,
    refresh,
    selectedPlan,
    status,
    subscription,
    summary,
    summaryLoading,
    summaryOperation,
  } = subscriptionState

  useEffect(() => {
    const isPaymentReturn = paymentReturn === 'stripe_success' || paymentReturn === 'coingate_success'
    if (!isPaymentReturn || access?.can_use_ai) return undefined

    let attempts = 0
    const timer = window.setInterval(() => {
      attempts += 1
      void refresh({ silent: true })
      if (attempts >= 24) window.clearInterval(timer)
    }, 4000)

    return () => window.clearInterval(timer)
  }, [access?.can_use_ai, paymentReturn, refresh])

  if (loading) {
    return (
      <section className="space-y-4">
        <PageHeader />
        <div className="rounded-xl border p-8" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          Cargando suscripcion IA...
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="space-y-4">
        <PageHeader />
        <ErrorState error={error} onRetry={refresh} />
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <PageHeader />

      {notice ? (
        <div
          className="rounded-xl border p-4"
          style={{
            borderColor: notice.type === 'success' ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)',
            backgroundColor: notice.type === 'success' ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)',
          }}
        >
          <p className="font-semibold">{notice.message}</p>
          {notice.code ? <p className="text-sm">Codigo: {notice.code}</p> : null}
          {notice.details ? <p className="text-sm" style={{ color: 'var(--muted)' }}>{notice.details}</p> : null}
        </div>
      ) : null}

      {(paymentReturn === 'stripe_success' || paymentReturn === 'coingate_success') && !access?.can_use_ai ? (
        <div className="rounded-xl border p-4" style={{ borderColor: 'rgba(245,158,11,0.5)', backgroundColor: 'rgba(245,158,11,0.10)' }}>
          <p className="font-semibold">Pago recibido. Estamos confirmando la activacion de tu suscripcion.</p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>La activacion depende del webhook/callback del proveedor. Esta pantalla se actualiza automaticamente.</p>
        </div>
      ) : null}

      <AIAccessBanner access={access} />

      <div className="flex flex-wrap gap-2">
        <TabButton active={activeTab === 'status'} onClick={() => setActiveTab('status')}>Estado y planes</TabButton>
        <TabButton active={activeTab === 'payments'} onClick={() => setActiveTab('payments')}>Pagos</TabButton>
        <TabButton active={activeTab === 'audit'} onClick={() => setActiveTab('audit')}>Bitacora</TabButton>
      </div>

      {activeTab === 'status' ? (
        <div className="space-y-4">
          <SubscriptionStatusCard
            status={status}
            subscription={subscription}
            access={access}
            onRenew={openRenewSummary}
            onCancel={() => setCancelOpen(true)}
            renewing={summaryLoading || actionLoading === 'renew'}
          />

          <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-bold">Planes IA disponibles</h2>
                <button type="button" className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--line)' }} onClick={refresh}>
                  Refrescar
                </button>
              </div>
              {plans.length ? (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {plans.map((plan) => (
                    <AIPlanCard key={plan.id} plan={plan} selected={selectedPlan?.id === plan.id} onSelect={openSummary} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border p-6 text-center" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>
                  No hay planes IA disponibles en este momento.
                </div>
              )}
            </section>

            <aside className="space-y-3">
              <AIFeatureLock canUseAI={Boolean(access?.can_use_ai)} reason={access?.reason || access?.message} />
            </aside>
          </div>
        </div>
      ) : null}

      {activeTab === 'payments' ? <PaymentHistoryTable items={payments} /> : null}
      {activeTab === 'audit' ? <AuditLogTable items={auditLog} /> : null}

      <SubscriptionSummaryModal
        loading={summaryLoading}
        actionLoading={actionLoading === 'confirm-plan'}
        operation={summaryOperation}
        plan={selectedPlan}
        summary={summary}
        onClose={closeSummary}
        onConfirm={confirmSelectedPlan}
      />

      <CancelSubscriptionDialog
        open={cancelOpen}
        loading={actionLoading === 'cancel'}
        onClose={() => setCancelOpen(false)}
        onConfirm={async (payload) => {
          await cancelSubscription(payload)
          setCancelOpen(false)
        }}
      />
    </section>
  )
}

function PageHeader() {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-3xl font-bold">Suscripcion IA</h1>
      <p style={{ color: 'var(--muted)' }}>Gestiona acceso, plan, pagos y bitacora de funciones IA premium.</p>
    </header>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="px-4 py-2 rounded-lg border font-semibold"
      style={{
        borderColor: active ? 'var(--brand)' : 'var(--line)',
        backgroundColor: active ? 'var(--panel-soft)' : 'transparent',
        color: active ? 'var(--brand-2)' : 'var(--text)',
      }}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function ErrorState({ error, onRetry }: { error: Error & { code?: string; details?: string }; onRetry: () => void }) {
  return (
    <div className="rounded-xl border p-6 space-y-3" style={{ borderColor: 'rgba(239,68,68,0.5)', backgroundColor: 'rgba(239,68,68,0.10)' }}>
      <h2 className="text-xl font-bold">No se pudo cargar la suscripcion IA</h2>
      <p>{error.message}</p>
      {error.code ? <p className="text-sm">Codigo: {error.code}</p> : null}
      {error.details ? <p className="text-sm" style={{ color: 'var(--muted)' }}>{error.details}</p> : null}
      <button type="button" className="px-4 py-2 rounded-lg border font-semibold" style={{ borderColor: 'var(--line)' }} onClick={onRetry}>
        Reintentar
      </button>
    </div>
  )
}

function AIFeatureLock({ canUseAI, reason }: { canUseAI: boolean; reason?: string }) {
  const items = ['Asistente IA', 'Vision artificial', 'Recomendaciones de produccion', 'Soporte de precios', 'Soporte de publicacion']
  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
      <h2 className="text-xl font-bold">Funciones IA</h2>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="flex items-center justify-between rounded-lg border p-2" style={{ borderColor: 'var(--line)', backgroundColor: canUseAI ? 'transparent' : 'var(--panel-soft)' }}>
            <span>{item}</span>
            <span className="text-sm font-semibold" style={{ color: canUseAI ? '#10b981' : '#ef4444' }}>{canUseAI ? 'Habilitada' : 'Bloqueada'}</span>
          </div>
        ))}
      </div>
      {!canUseAI ? <p className="text-sm" style={{ color: 'var(--muted)' }}>{reason || 'Se requiere una suscripcion activa.'}</p> : null}
    </div>
  )
}
