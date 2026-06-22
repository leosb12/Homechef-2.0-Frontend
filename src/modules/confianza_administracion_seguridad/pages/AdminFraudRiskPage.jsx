import { useEffect, useMemo, useState } from 'react'
import {
  fetchQualityPublications,
  fetchQualityPublicationDetail,
  performQualityAction,
  deleteQualityPublicationPermanent,
  analyzeVisualModeration,
} from '../services/admin_quality_service'
import OfflineBanner from '../components/OfflineBanner'
import { getPendingMutations } from '../services/adminOfflineRepository'
import { useConnectivity } from '../../../shared/hooks/useConnectivity'

const FILTERS = [
  { label: 'Pendientes IA', value: 'pendiente_revision_ia' },
  { label: 'Sospechosas', value: 'SOSPECHOSAS' },
  { label: 'Aprobadas', value: 'aprobada' },
  { label: 'Monitoreadas', value: 'monitoreada' },
  { label: 'Requiere Revisión', value: 'requiere_revision' },
  { label: 'Requiere Corrección', value: 'requiere_correccion' },
  { label: 'Ocultas Temp.', value: 'oculta_temporalmente' },
  { label: 'Rechazadas', value: 'rechazada' },
  { label: 'Todas', value: 'ALL' },
]

const STATUS_BADGES = {
  pendiente_revision_ia: { label: 'Pend. IA', bg: 'rgba(59, 130, 246, 0.14)', color: '#2563eb' },
  aprobada: { label: 'Aprobada', bg: 'rgba(34, 197, 94, 0.16)', color: '#166534' },
  monitoreada: { label: 'Monitoreada', bg: 'rgba(20, 184, 166, 0.14)', color: '#0f766e' },
  requiere_revision: { label: 'Req. Rev.', bg: 'rgba(249, 115, 22, 0.14)', color: '#c2410c' },
  requiere_correccion: { label: 'Corrección', bg: 'rgba(239, 68, 68, 0.14)', color: '#b91c1c' },
  oculta_temporalmente: { label: 'Oculta', bg: 'rgba(168, 85, 247, 0.14)', color: '#7e22ce' },
  rechazada: { label: 'Rechazada', bg: 'rgba(220, 38, 38, 0.16)', color: '#991b1b' },
}

export default function AdminFraudRiskPage() {
  const { backendReachable } = useConnectivity()
  const isOnline = backendReachable
  const [view, setView] = useState('hub')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [publications, setPublications] = useState([])
  const [selectedFilter, setSelectedFilter] = useState('pendiente_revision_ia')
  const [search, setSearch] = useState('')
  const [pendingOps, setPendingOps] = useState([])

  const loadPendingOps = async () => {
    try {
      const queue = await getPendingMutations()
      setPendingOps(queue || [])
    } catch (e) {
      console.warn("Could not load pending mutations:", e)
    }
  }

  useEffect(() => {
    void loadPendingOps()
    window.addEventListener('admin-offline-queue-changed', loadPendingOps)
    return () => window.removeEventListener('admin-offline-queue-changed', loadPendingOps)
  }, [])

  // Detail Modal States
  const [detailDishId, setDetailDishId] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailDish, setDetailDish] = useState(null)

  // Action Comments Modal State
  const [actionType, setActionType] = useState(null) // 'corregir', 'rechazar'
  const [commentText, setCommentText] = useState('')
  const [commentError, setCommentError] = useState('')
  const [busyAction, setBusyAction] = useState(false)

  // Visual AI Moderation State
  const [visualAnalyzing, setVisualAnalyzing] = useState(false)
  const [visualAnalysisError, setVisualAnalysisError] = useState('')

  useEffect(() => {
    if (view === 'quality') {
      void loadPublications(selectedFilter)
    }
  }, [selectedFilter, view])

  async function loadPublications(filter) {
    setLoading(true)
    setError('')
    try {
      const data = await fetchQualityPublications(filter)
      setPublications(data || [])
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        err?.message ||
        'Error al cargar las publicaciones de control de calidad.',
      )
    } finally {
      setLoading(false)
    }
  }

  // Reload single item detail or full list
  async function openDetail(dishId) {
    setDetailDishId(dishId)
    setDetailLoading(true)
    setDetailDish(null)
    setError('')
    try {
      const data = await fetchQualityPublicationDetail(dishId)
      setDetailDish(data)
      
      // Automatic trigger of visual AI analysis
      if (data && data.image_url) {
        const hasAnalisis = data.analisis_visual
        const needsAnalysis = !hasAnalisis || hasAnalisis.estado === 'ERROR' || !hasAnalisis.estado
        if (needsAnalysis && isOnline) {
          setTimeout(() => {
            void runAutomaticVisualAnalysis(dishId)
          }, 200)
        }
      }
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        err?.message ||
        'No se pudieron cargar los detalles de la publicación.',
      )
      setDetailDishId(null)
    } finally {
      setDetailLoading(false)
    }
  }

  function closeDetail() {
    setDetailDishId(null)
    setDetailDish(null)
    setActionType(null)
    setCommentText('')
    setCommentError('')
  }

  function handleBackToHub() {
    setView('hub')
    setPublications([])
    setSearch('')
    setError('')
    setSuccessMsg('')
  }

  // Handle direct actions: approve, hide
  async function handleDirectAction(action) {
    if (!detailDish) return
    setBusyAction(true)
    setError('')
    try {
      const updated = await performQualityAction(detailDish.id, action)
      setDetailDish(updated)
      setSuccessMsg(`Publicación moderada con éxito (${action}).`)
      setTimeout(() => setSuccessMsg(''), 4000)
      void loadPublications(selectedFilter)
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        err?.message ||
        'Error al registrar la acción del administrador.',
      )
    } finally {
      setBusyAction(false)
    }
  }

  // Handle comment actions: corrigiendo, rechazando
  async function submitCommentAction() {
    if (!commentText.trim()) {
      setCommentError('El comentario o justificación es obligatorio.')
      return
    }
    setBusyAction(true)
    setCommentError('')
    try {
      const updated = await performQualityAction(
        detailDish.id,
        actionType,
        commentText.trim()
      )
      setDetailDish(updated)
      setSuccessMsg(`Publicación moderada con éxito (${actionType}).`)
      setTimeout(() => setSuccessMsg(''), 4000)
      setActionType(null)
      setCommentText('')
      void loadPublications(selectedFilter)
    } catch (err) {
      setCommentError(
        err?.response?.data?.detail ||
        err?.message ||
        'Error al registrar la decisión.',
      )
    } finally {
      setBusyAction(false)
    }
  }

  // Permanent Delete
  async function handleDeletePermanent() {
    if (!detailDish) return
    if (
      !window.confirm(
        '¿Estás seguro de que deseas eliminar definitivamente esta publicación del sistema? Esta acción no se puede deshacer.'
      )
    ) {
      return
    }
    setBusyAction(true)
    setError('')
    try {
      const resp = await deleteQualityPublicationPermanent(detailDish.id)
      setSuccessMsg(resp.message || 'Publicación eliminada definitivamente.')
      setTimeout(() => setSuccessMsg(''), 4000)
      closeDetail()
      void loadPublications(selectedFilter)
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        err?.message ||
        'Error al eliminar la publicación.',
      )
    } finally {
      setBusyAction(false)
    }
  }

  // Visual AI Moderation
  async function handleAnalyzeVisual() {
    if (!detailDish) return
    if (!isOnline) {
      setVisualAnalysisError('El análisis visual no está disponible sin conexión.')
      return
    }
    setVisualAnalyzing(true)
    setVisualAnalysisError('')
    try {
      const updated = await analyzeVisualModeration(detailDish.id)
      setDetailDish(updated)
      void loadPublications(selectedFilter)
    } catch (err) {
      setVisualAnalysisError(
        err?.response?.data?.detail ||
        err?.message ||
        'No se pudo contactar el servicio de análisis visual. El microservicio puede no estar en ejecución.'
      )
    } finally {
      setVisualAnalyzing(false)
    }
  }

  async function runAutomaticVisualAnalysis(dishId) {
    if (!isOnline) {
      setVisualAnalysisError('El análisis visual automático no está disponible sin conexión.')
      return
    }
    setVisualAnalyzing(true)
    setVisualAnalysisError('')
    try {
      const updated = await analyzeVisualModeration(dishId)
      setDetailDish((prev) => {
        if (prev && prev.id === dishId) {
          return updated
        }
        return prev
      })
      void loadPublications(selectedFilter)
    } catch (err) {
      setVisualAnalysisError(
        err?.response?.data?.detail ||
        err?.message ||
        'No se pudo completar el análisis visual automático.'
      )
    } finally {
      setVisualAnalyzing(false)
    }
  }

  // Metrics calculation based on loaded list
  const metrics = useMemo(() => {
    const total = publications.length
    const highRisk = publications.filter((p) => (p.ia_risk_score ?? 0) >= 61).length
    const denounced = publications.filter((p) => (p.reported_count ?? 0) > 0).length
    return { total, highRisk, denounced }
  }, [publications])

  // Filter & search locally
  const filteredPublications = useMemo(() => {
    // 1. Filter by status (selectedFilter) first
    let result = publications
    if (selectedFilter !== 'ALL' && selectedFilter !== 'SOSPECHOSAS') {
      result = result.filter((p) => p.revision_status === selectedFilter)
    }

    // 2. Filter by search query (needle)
    const needle = search.trim().toLowerCase()
    if (!needle) return result
    return result.filter((p) => {
      const name = p.name || ''
      const chef = p.chef_name || ''
      return (
        name.toLowerCase().includes(needle) ||
        chef.toLowerCase().includes(needle)
      )
    })
  }, [publications, selectedFilter, search])

  // Helpers for risk color and progress visual representation
  function getRiskColor(score) {
    if (score == null) return '#94a3b8' // grey
    if (score <= 30) return '#16a34a' // green
    if (score <= 60) return '#eab308' // yellow
    if (score <= 80) return '#f97316' // orange
    return '#dc2626' // red
  }

  function getRiskLabel(score) {
    if (score == null) return 'N/A'
    if (score <= 30) return `Bajo (${score}%)`
    if (score <= 60) return `Medio (${score}%)`
    if (score <= 80) return `Alto (${score}%)`
    return `Crítico (${score}%)`
  }

  function getRiskTextLong(score) {
    if (score == null) return 'N/A'
    if (score <= 30) return `BAJO RIESGO (${score}%)`
    if (score <= 60) return `RIESGO MODERADO / MONITOREAR (${score}%)`
    if (score <= 80) return `RIESGO ALTO / REVISIÓN REQUERIDA (${score}%)`
    return `RIESGO CRÍTICO / OCULTO (${score}%)`
  }

  if (view === 'hub') {
    return (
      <section className="space-y-6 animate-in fade-in duration-300">
        <OfflineBanner moduleName="fraud_risk" />
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-extrabold tracking-tight">Fraude y riesgo</h1>
          <p style={{ color: 'var(--muted)' }} className="text-sm">
            Monitorea el estado de seguridad de la plataforma, audita la calidad de las publicaciones y gestiona alertas de riesgo.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pt-4">
          {/* Card llamativa - Control de Calidad */}
          <article
            onClick={() => setView('quality')}
            className="group relative overflow-hidden rounded-[32px] border p-8 cursor-pointer transition-all duration-300 hover:-translate-y-2 lg:col-span-2 md:col-span-2 col-span-1 animate-pulse-subtle"
            style={{
              borderColor: 'rgba(167, 139, 250, 0.45)',
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 40%, #2563eb 100%)',
              boxShadow: '0 20px 40px rgba(124, 58, 237, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.25)',
            }}
          >
            {/* Glossy decorative light effects */}
            <div className="absolute -right-8 -top-8 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-all duration-700" />
            <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl group-hover:scale-125 transition-all duration-700" />

            <div className="relative space-y-6">
              <div className="flex justify-between items-start">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-white shadow-inner">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/25 px-3 py-1.5 text-xs font-bold text-emerald-300 border border-emerald-400/30 shadow-sm animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                  IA ACTIVA & EXCLUSIVO
                </span>
              </div>

              <div className="space-y-3">
                <h3 className="text-3xl font-black text-white leading-tight group-hover:underline">
                  Entrar a la Sección de Control de Calidad de Publicaciones
                </h3>
                <p className="text-base text-purple-100/90 leading-relaxed font-medium">
                  Accede a la auditoría inteligente de platos. Evalúa los riesgos detectados por la Inteligencia Artificial, visualiza denuncias de usuarios y gestiona publicaciones sospechosas en tiempo real.
                </p>
              </div>
            </div>

            <div className="relative mt-10 pt-5 border-t border-white/20 flex items-center justify-between text-white font-bold text-sm uppercase tracking-widest">
              <span>Ingresar a la Sección Exclusiva</span>
              <span className="text-xl transition-transform duration-300 group-hover:translate-x-2">🚀 →</span>
            </div>
          </article>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <OfflineBanner moduleName="fraud_risk" />
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-4xl font-extrabold tracking-tight">Fraude y riesgo</h1>
          <p style={{ color: 'var(--muted)' }} className="text-sm">
            Control de Calidad de Publicaciones
          </p>
        </div>
        <button
          type="button"
          onClick={handleBackToHub}
          className="rounded-2xl border px-5 py-3 font-semibold text-white hover:bg-[var(--panel-soft)] transition-all"
          style={{ borderColor: 'var(--line)' }}
        >
          ← Volver al Hub
        </button>
      </div>

      {/* Main card Container: Control y Calidad */}
      <div
        className="rounded-[24px] border p-6 space-y-6"
        style={{
          borderColor: 'rgba(148, 163, 184, 0.18)',
          backgroundColor: 'var(--panel)',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div className="flex items-center gap-3 border-b pb-4" style={{ borderColor: 'var(--line)' }}>
          <span className="text-2xl">🛡️</span>
          <h2 className="text-2xl font-bold text-white">Control de Calidad</h2>
        </div>

        {/* Action success message */}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-200 text-sm animate-in fade-in">
            ✅ {successMsg}
          </div>
        )}

        {/* Global Errors */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/40 text-red-200 text-sm animate-in fade-in">
            ⚠️ {error}
          </div>
        )}

        {/* Metrics Cards Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <div
            className="rounded-2xl border p-5 flex items-center gap-4 transition-all duration-300 hover:-translate-y-0.5"
            style={{
              borderColor: 'rgba(148, 163, 184, 0.14)',
              backgroundColor: 'var(--panel-soft)',
            }}
          >
            <div className="grid h-12 w-12 place-items-center rounded-full bg-blue-500/10 text-blue-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Bajo Revisión
              </p>
              <p className="text-2xl font-extrabold text-white mt-0.5">{metrics.total}</p>
            </div>
          </div>

          <div
            className="rounded-2xl border p-5 flex items-center gap-4 transition-all duration-300 hover:-translate-y-0.5"
            style={{
              borderColor: 'rgba(148, 163, 184, 0.14)',
              backgroundColor: 'var(--panel-soft)',
            }}
          >
            <div className="grid h-12 w-12 place-items-center rounded-full bg-amber-500/10 text-amber-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Riesgo Alto
              </p>
              <p className="text-2xl font-extrabold text-white mt-0.5">{metrics.highRisk}</p>
            </div>
          </div>

          <div
            className="rounded-2xl border p-5 flex items-center gap-4 transition-all duration-300 hover:-translate-y-0.5"
            style={{
              borderColor: 'rgba(148, 163, 184, 0.14)',
              backgroundColor: 'var(--panel-soft)',
            }}
          >
            <div className="grid h-12 w-12 place-items-center rounded-full bg-red-500/10 text-red-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Denunciados
              </p>
              <p className="text-2xl font-extrabold text-white mt-0.5">{metrics.denounced}</p>
            </div>
          </div>
        </div>

        {/* Filter Chips list */}
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-2 border-b" style={{ borderColor: 'var(--line)' }}>
          {FILTERS.map((f) => {
            const active = selectedFilter === f.value
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setSelectedFilter(f.value)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${active
                    ? 'text-white'
                    : 'border hover:bg-[var(--panel-soft)]'
                  }`}
                style={{
                  background: active ? 'linear-gradient(90deg, var(--brand), var(--brand-2))' : 'transparent',
                  borderColor: active ? 'transparent' : 'var(--line)',
                  color: active ? '#ffffff' : 'var(--text)',
                }}
              >
                {f.label}
              </button>
            )
          })}
        </div>

        {/* Search Input Bar */}
        <div
          className="flex items-center gap-3 rounded-2xl border px-4 py-3 max-w-md"
          style={{
            borderColor: 'rgba(148, 163, 184, 0.18)',
            backgroundColor: 'var(--panel-soft)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--muted)' }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent outline-none text-sm text-white"
            placeholder="Buscar por plato o cocinero..."
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-xs text-red-400 hover:text-red-300 font-bold"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Publications Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-10 h-10 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>Cargando publicaciones bajo revisión...</p>
          </div>
        ) : filteredPublications.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-2xl" style={{ borderColor: 'var(--line)' }}>
            <span className="text-4xl block mb-3">🍽️</span>
            <p className="text-lg font-bold text-white">No hay publicaciones encontradas</p>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
              No existen platos bajo el filtro o búsqueda seleccionada en este momento.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPublications.map((pub) => {
              const riskColor = getRiskColor(pub.ia_risk_score)
              const riskLabel = getRiskLabel(pub.ia_risk_score)
              const badge = STATUS_BADGES[pub.revision_status] || { label: pub.revision_status, bg: 'var(--line)', color: '#ffffff' }
              const reported = pub.reported_count ?? 0

              return (
                <article
                  key={pub.id}
                  onClick={() => openDetail(pub.id)}
                  className="group rounded-2xl border p-4 cursor-pointer flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                  style={{
                    borderColor: 'rgba(148, 163, 184, 0.12)',
                    backgroundColor: 'var(--panel-soft)',
                  }}
                >
                  <div className="space-y-4">
                    {/* Image or placeholder */}
                    <div className="relative h-44 w-full rounded-xl overflow-hidden bg-[var(--panel)] border" style={{ borderColor: 'var(--line)' }}>
                      {pub.image_url ? (
                        <img
                          src={pub.image_url}
                          alt={pub.name}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="h-full w-full grid place-items-center text-sm italic" style={{ color: 'var(--muted)' }}>
                          Sin foto
                        </div>
                      )}

                      {/* Denounce Flag Badge */}
                      {reported > 0 && (
                        <div className="absolute top-2 right-2 bg-red-650/90 border border-red-500/50 text-white rounded-lg px-2 py-1 flex items-center gap-1.5 text-xs font-bold shadow-md">
                          🚩 {reported} {reported === 1 ? 'Denuncia' : 'Denuncias'}
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-lg text-white truncate group-hover:text-[var(--brand-2)] transition-colors">
                          {pub.name || 'Plato sin nombre'}
                        </h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className="px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase inline-block whitespace-nowrap"
                            style={{ backgroundColor: badge.bg, color: badge.color }}
                          >
                            {badge.label}
                          </span>
                          {isPending && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 text-[9px] font-bold border border-amber-500/30 animate-pulse whitespace-nowrap">
                              Pendiente
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>
                        Cocinero: <span className="text-white font-medium">{pub.chef_name}</span>
                      </p>
                    </div>
                  </div>

                  {/* IA risk indicator */}
                  <div className="mt-4 pt-3 border-t space-y-2" style={{ borderColor: 'var(--line)' }}>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-white">Riesgo IA:</span>
                      <span className="font-bold" style={{ color: riskColor }}>
                        {riskLabel}
                      </span>
                    </div>
                    <div className="w-full bg-[var(--panel)] rounded-full h-2 overflow-hidden border" style={{ borderColor: 'var(--line)' }}>
                      <div
                        className="rounded-full h-2 transition-all duration-500"
                        style={{
                          width: `${pub.ia_risk_score ?? 0}%`,
                          backgroundColor: riskColor,
                        }}
                      />
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {/* Moderation Review Detail Dialog Overlay */}
      {detailDishId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border text-sm animate-in zoom-in-95 duration-200"
            style={{
              borderColor: 'rgba(148,163,184,.18)',
              backgroundColor: 'var(--panel)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b px-6 py-5" style={{ borderColor: 'var(--line)' }}>
              <div className="min-w-0">
                <h3 className="text-2xl font-extrabold tracking-tight text-white truncate">
                  {detailLoading ? 'Cargando...' : detailDish?.name || 'Detalles de Publicación'}
                </h3>
                {!detailLoading && detailDish && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                    Cocinero: {detailDish.chef_name} ({detailDish.chef_email})
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="rounded-full border px-4 py-2 text-xs font-semibold hover:bg-[var(--panel-soft)] transition text-white"
                style={{ borderColor: 'var(--line)' }}
              >
                Cerrar
              </button>
            </div>

            {/* Content body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {detailLoading || !detailDish ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <div className="w-10 h-10 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>Cargando datos detallados de la publicación...</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Left Column: General Info and Reports */}
                  <div className="space-y-6">
                    {/* Image section */}
                    <div className="h-56 w-full rounded-2xl overflow-hidden border bg-[var(--panel-soft)]" style={{ borderColor: 'var(--line)' }}>
                      {detailDish.image_url ? (
                        <img
                          src={detailDish.image_url}
                          alt={detailDish.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full grid place-items-center text-sm italic" style={{ color: 'var(--muted)' }}>
                          Sin foto adjunta
                        </div>
                      )}
                    </div>

                    {/* Details Box */}
                    <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
                      <h4 className="font-bold text-white border-b pb-1.5" style={{ borderColor: 'var(--line)' }}>
                        Información Comercial
                      </h4>
                      <div className="grid grid-cols-3 gap-1.5 text-xs text-white">
                        <span className="font-semibold" style={{ color: 'var(--muted)' }}>Precio:</span>
                        <span className="col-span-2 font-bold">{detailDish.price?.toFixed(2)} Bs</span>

                        <span className="font-semibold" style={{ color: 'var(--muted)' }}>Porciones:</span>
                        <span className="col-span-2">{detailDish.portions} porciones</span>

                        <span className="font-semibold" style={{ color: 'var(--muted)' }}>Horario:</span>
                        <span className="col-span-2">{detailDish.schedule || 'Sin especificar'}</span>
                      </div>
                      <div className="text-xs pt-1">
                        <p className="font-semibold text-white mb-1">Descripción:</p>
                        <p style={{ color: 'var(--text-soft)', borderColor: 'var(--line)' }} className="bg-[var(--panel)] p-2.5 rounded-lg border">
                          {detailDish.description || 'Sin descripción ingresada.'}
                        </p>
                      </div>
                      <div className="text-xs pt-1">
                        <p className="font-semibold text-white mb-1">Ingredientes:</p>
                        <p style={{ color: 'var(--text-soft)' }}>
                          {Array.isArray(detailDish.ingredients)
                            ? detailDish.ingredients.map(i => typeof i === 'string' ? i : i.name).join(', ')
                            : 'Ninguno especificado.'}
                        </p>
                      </div>
                    </div>

                    {/* Client Denounce reports */}
                    <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
                      <h4 className="font-bold text-white border-b pb-1.5 flex justify-between" style={{ borderColor: 'var(--line)' }}>
                        <span>Denuncias de Clientes</span>
                        <span className="text-red-400 font-extrabold">{detailDish.reports?.length ?? 0}</span>
                      </h4>
                      {(!detailDish.reports || detailDish.reports.length === 0) ? (
                        <p className="text-xs italic" style={{ color: 'var(--muted)' }}>No hay denuncias registradas para este plato.</p>
                      ) : (
                        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                          {detailDish.reports.map((rep) => (
                            <div key={rep.id} className="p-3 rounded-lg bg-[var(--panel)] border text-xs space-y-1" style={{ borderColor: 'var(--line)' }}>
                              <div className="flex justify-between items-center text-white">
                                <span className="font-bold text-red-400">Motivo: {rep.reason}</span>
                                <span style={{ color: 'var(--muted)' }} className="text-[10px]">
                                  {rep.created_at ? rep.created_at.split('T')[0] : ''}
                                </span>
                              </div>
                              <p style={{ color: 'var(--muted)' }}>Denunciante: {rep.user_email}</p>
                              {rep.comment && <p className="italic text-white bg-[var(--panel-soft)] p-1.5 rounded mt-1">"{rep.comment}"</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: IA Analysis, Validation checklist, Moderation History */}
                  <div className="space-y-6">
                    {/* IA Analysis Panel */}
                    <div
                      className="rounded-2xl border p-5 space-y-4"
                      style={{
                        borderColor: `${getRiskColor(detailDish.ia_risk_score)}44`,
                        backgroundColor: `${getRiskColor(detailDish.ia_risk_score)}0a`,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🤖</span>
                        <h4 className="font-bold tracking-wide text-xs uppercase" style={{ color: getRiskColor(detailDish.ia_risk_score) }}>
                          Análisis de Calidad IA
                        </h4>
                      </div>

                      <div className="space-y-2">
                        <p className="text-lg font-black" style={{ color: getRiskColor(detailDish.ia_risk_score) }}>
                          {getRiskTextLong(detailDish.ia_risk_score)}
                        </p>
                        <div className="w-full bg-[var(--panel)] rounded-full h-2.5 overflow-hidden border" style={{ borderColor: 'var(--line)' }}>
                          <div
                            className="rounded-full h-2.5"
                            style={{
                              width: `${detailDish.ia_risk_score ?? 0}%`,
                              backgroundColor: getRiskColor(detailDish.ia_risk_score),
                            }}
                          />
                        </div>
                      </div>

                      {detailDish.ia_quality_reasons?.length > 0 && (
                        <div className="text-xs space-y-1">
                          <p className="font-bold text-white">Motivos de sospecha:</p>
                          <ul className="list-disc pl-4 space-y-1 text-white">
                            {detailDish.ia_quality_reasons.map((reason, idx) => (
                              <li key={idx}>{reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {detailDish.ia_quality_recommendation && (
                        <div className="text-xs space-y-1">
                          <p className="font-bold text-white">Recomendación IA:</p>
                          <p style={{ color: 'var(--text-soft)' }} className="bg-[var(--panel)] p-2.5 rounded-lg border border-[rgba(255,255,255,0.05)]">
                            {detailDish.ia_quality_recommendation}
                          </p>
                        </div>
                      )}

                      <p className="text-[10px]" style={{ color: 'var(--muted)' }}>
                        Último análisis: {detailDish.last_quality_analysis_at ? new Date(detailDish.last_quality_analysis_at).toLocaleString() : 'N/A'}
                      </p>
                    </div>

                    {/* Visual AI Moderation Card */}
                    {(() => {
                      const av = detailDish.analisis_visual
                      const estadoColors = {
                        VALIDO: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.3)', color: '#22c55e', label: '✅ VÁLIDO' },
                        SOSPECHOSO: { bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.3)', color: '#f97316', label: '⚠️ SOSPECHOSO' },
                        RECHAZADO: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)', color: '#ef4444', label: '🚫 RECHAZADO' },
                        ERROR: { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.25)', color: '#64748b', label: '⚠️ ERROR' },
                      }
                      const accionColors = {
                        APROBAR: '#22c55e', REVISAR: '#f97316', OCULTAR: '#a855f7', RECHAZAR: '#ef4444'
                      }
                      const theme = av ? (estadoColors[av.estado] || estadoColors.ERROR) : { bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.2)', color: '#3b82f6', label: '' }
                      const boolIcon = (val) => val === true ? '✅' : val === false ? '❌' : '—'

                      return (
                        <div
                          className="rounded-2xl border p-4 space-y-4"
                          style={{ borderColor: theme.border, backgroundColor: theme.bg }}
                        >
                          {/* Header */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-base">🔭</span>
                              <h4 className="font-bold tracking-wide text-xs uppercase" style={{ color: theme.color }}>
                                Moderación Visual con IA
                              </h4>
                            </div>
                            {av && av.estado !== 'ERROR' && (
                              <span
                                className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full tracking-wider"
                                style={{ backgroundColor: `${theme.color}22`, color: theme.color, border: `1px solid ${theme.color}44` }}
                              >
                                {theme.label}
                              </span>
                            )}
                          </div>

                          {/* Main content */}
                          {!av ? (
                            // Not analyzed yet state
                            <div className="text-center space-y-3 py-3">
                              <div className="text-3xl">🔍</div>
                              <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
                                Esta publicación aún no ha sido analizada visualmente con IA.
                              </p>
                              <p className="text-[10px]" style={{ color: 'var(--muted)' }}>
                                El análisis detecta: comida real, coincidencia con el plato, imágenes de IA generada, imágenes de stock y contenido sospechoso.
                              </p>
                            </div>
                          ) : av.error_controlado ? (
                            // Error state
                            <div className="space-y-2">
                              <div className="bg-[var(--panel)] rounded-xl p-3 border" style={{ borderColor: 'var(--line)' }}>
                                <p className="text-xs font-bold text-amber-400 mb-1">⚠️ Análisis no disponible</p>
                                <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
                                  {av.detalle_error || 'Error durante el análisis visual. El sistema sigue funcionando normalmente.'}
                                </p>
                              </div>
                              <p className="text-[10px] italic" style={{ color: 'var(--muted)' }}>
                                Los botones de moderación (Aprobar, Ocultar, etc.) funcionan con normalidad.
                              </p>
                            </div>
                          ) : (
                            // Full analysis results
                            <div className="space-y-3">
                              {/* Risk bar */}
                              <div className="space-y-1">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-semibold text-white">Riesgo visual:</span>
                                  <span className="font-extrabold" style={{ color: theme.color }}>{av.riesgo}% — {av.nivel_riesgo}</span>
                                </div>
                                <div className="w-full bg-[var(--panel)] rounded-full h-2 overflow-hidden border" style={{ borderColor: 'var(--line)' }}>
                                  <div
                                    className="rounded-full h-2 transition-all duration-700"
                                    style={{ width: `${av.riesgo}%`, backgroundColor: theme.color }}
                                  />
                                </div>
                              </div>

                              {/* Detection checklist */}
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                                <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>¿Contiene comida?</span><span className="font-bold text-white">{boolIcon(av.es_comida)}</span></div>
                                <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>¿Coincide con el plato?</span><span className="font-bold text-white">{boolIcon(av.coincide_con_plato)}</span></div>
                                <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>Coincidencia:</span><span className="font-bold text-white">{av.coincidencia != null ? `${av.coincidencia}%` : '—'}</span></div>
                                <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>¿Generada por IA?</span><span className="font-bold text-white">{boolIcon(av.parece_generada_por_ia)}</span></div>
                                <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>Probabilidad IA:</span><span className="font-bold text-white">{av.probabilidad_ia != null ? `${av.probabilidad_ia}%` : '—'}</span></div>
                                <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>¿Imagen de stock?</span><span className="font-bold text-white">{boolIcon(av.imagen_generica_o_stock)}</span></div>
                                <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>¿Baja calidad?</span><span className="font-bold text-white">{boolIcon(av.imagen_borrosa_o_baja_calidad)}</span></div>
                                <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>¿Contenido no apto?</span><span className="font-bold text-white">{boolIcon(av.contenido_no_apto)}</span></div>
                              </div>

                              {/* Detected objects */}
                              {av.objetos_detectados?.length > 0 && (
                                <div className="text-[11px]">
                                  <p className="font-bold text-white mb-1">Objetos detectados:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {av.objetos_detectados.map((obj, i) => (
                                      <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: 'rgba(59,130,246,0.14)', color: '#60a5fa' }}>
                                        {obj}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Motives */}
                              {(av.motivos?.length > 0 || av.motivos_ia?.length > 0) && (
                                <div className="text-[11px] space-y-1">
                                  <p className="font-bold text-white">Motivos detectados:</p>
                                  <ul className="list-disc pl-4 space-y-0.5" style={{ color: 'var(--text-soft)' }}>
                                    {[...av.motivos, ...(av.motivos_ia?.map(m => `[IA] ${m}`) || [])].map((m, i) => (
                                      <li key={i}>{m}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Recommendation */}
                              {av.recomendacion && (
                                <div className="text-[11px]">
                                  <p className="font-bold text-white mb-1">Recomendación IA:</p>
                                  <p className="bg-[var(--panel)] p-2 rounded-lg border italic" style={{ borderColor: 'var(--line)', color: 'var(--text-soft)' }}>
                                    {av.recomendacion}
                                  </p>
                                </div>
                              )}

                              {/* Action suggested badge */}
                              {av.accion_sugerida && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px]" style={{ color: 'var(--muted)' }}>Acción sugerida:</span>
                                  <span
                                    className="text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full tracking-wider"
                                    style={{
                                      backgroundColor: `${accionColors[av.accion_sugerida] || '#64748b'}22`,
                                      color: accionColors[av.accion_sugerida] || '#64748b',
                                      border: `1px solid ${accionColors[av.accion_sugerida] || '#64748b'}44`
                                    }}
                                  >
                                    {av.accion_sugerida}
                                  </span>
                                </div>
                              )}

                              {/* Providers & date */}
                              <div className="text-[10px] pt-1 border-t space-y-0.5" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>
                                <p>Proveedor visión: <span className="font-semibold text-white">{av.proveedor_vision}</span></p>
                                {av.analizado_en && <p>Analizado: {new Date(av.analizado_en).toLocaleString()}</p>}
                              </div>
                            </div>
                          )}

                          {/* Visual analysis error from frontend request */}
                          {visualAnalysisError && (
                            <p className="text-[11px] text-red-400 font-semibold bg-red-950/30 rounded-lg p-2.5 border border-red-500/20">
                              {visualAnalysisError}
                            </p>
                          )}

                          {/* Analyze / Re-analyze button */}
                          {detailDish.image_url && (
                            <button
                              type="button"
                              id="btn-analizar-imagen-ia"
                              onClick={handleAnalyzeVisual}
                              disabled={visualAnalyzing || !isOnline}
                              title={!isOnline ? "El análisis visual no está disponible sin conexión." : ""}
                              className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-60"
                              style={{
                                backgroundColor: av ? 'rgba(99,102,241,0.15)' : 'rgba(59,130,246,0.18)',
                                color: av ? '#818cf8' : '#60a5fa',
                                border: `1px solid ${av ? 'rgba(99,102,241,0.3)' : 'rgba(59,130,246,0.3)'}`,
                              }}
                            >
                              {visualAnalyzing ? (
                                <><div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Analizando imagen...</>
                              ) : (
                                <>{av ? '🔄 Reanalizar imagen con IA' : '🔍 Analizar imagen con IA'}</>
                              )}
                            </button>
                          )}
                        </div>
                      )
                    })()}

                    {/* Moderation manual logs history */}
                    <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
                      <h4 className="font-bold text-white border-b pb-1.5" style={{ borderColor: 'var(--line)' }}>
                        Moderación Manual de Auditoría
                      </h4>
                      <div className="text-xs space-y-2">
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--text-soft)' }}>Estado de auditoría:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white uppercase">{detailDish.revision_status}</span>
                            {pendingOps.some(op => op.entity === 'quality_publications' && String(op.server_id) === String(detailDish.id) && op.status === 'pending') && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 text-[10px] font-bold border border-amber-500/30 animate-pulse whitespace-nowrap">
                                Pendiente
                              </span>
                            )}
                          </div>
                        </div>
                        {detailDish.admin_review_comment ? (
                          <div className="space-y-1">
                            <p style={{ color: 'var(--text-soft)' }}>Última justificación:</p>
                            <p className="bg-[var(--panel)] p-2.5 rounded border italic" style={{ color: 'var(--text-soft)', borderColor: 'var(--line)' }}>
                              "{detailDish.admin_review_comment}"
                            </p>
                          </div>
                        ) : (
                          <p className="italic" style={{ color: 'var(--muted)' }}>Sin comentarios previos de moderadores.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom action panel bar */}
            {!detailLoading && detailDish && (
              <div className="border-t p-5 bg-[var(--panel-soft)] flex flex-col gap-3" style={{ borderColor: 'var(--line)' }}>
                {actionType ? (
                  /* Comment Submission Section */
                  <div className="space-y-3 animate-in slide-in-from-bottom duration-200">
                    <p className="font-bold text-white text-xs">
                      Justificación requerida para {actionType === 'corregir' ? 'Solicitar Corrección' : 'Rechazar'}:
                    </p>
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows="3"
                      className="w-full rounded-xl border p-2.5 text-xs bg-[var(--panel)] text-white outline-none focus:border-[var(--brand)]"
                      style={{ borderColor: 'var(--line)' }}
                      placeholder="Escribe el motivo..."
                    />
                    {commentError && <p className="text-red-400 text-xs font-semibold">⚠️ {commentError}</p>}
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setActionType(null)
                          setCommentText('')
                          setCommentError('')
                        }}
                        className="px-4 py-2 border rounded-xl text-xs hover:bg-[var(--panel)] text-white"
                        style={{ borderColor: 'var(--line)' }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={submitCommentAction}
                        disabled={busyAction}
                        className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:opacity-90 disabled:opacity-50"
                      >
                        {busyAction ? 'Procesando...' : 'Enviar Acción'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Main Action Buttons Layout */
                  <div className="flex flex-wrap gap-2 justify-between items-center">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busyAction}
                        onClick={() => handleDirectAction('aprobar')}
                        className="px-4 py-2 bg-emerald-600 hover:opacity-90 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                      >
                        Aprobar
                      </button>
                      <button
                        type="button"
                        disabled={busyAction}
                        onClick={() => handleDirectAction('ocultar')}
                        className="px-4 py-2 bg-purple-600 hover:opacity-90 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                      >
                        Ocultar
                      </button>
                      <button
                        type="button"
                        disabled={busyAction}
                        onClick={() => setActionType('corregir')}
                        className="px-4 py-2 bg-amber-600 hover:opacity-90 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                      >
                        Corregir
                      </button>
                      <button
                        type="button"
                        disabled={busyAction}
                        onClick={() => setActionType('rechazar')}
                        className="px-4 py-2 bg-red-650 hover:opacity-90 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                      >
                        Rechazar
                      </button>
                    </div>

                    {detailDish.revision_status === 'rechazada' && (
                      <button
                        type="button"
                        disabled={busyAction}
                        onClick={handleDeletePermanent}
                        className="px-4 py-2 bg-slate-900 border hover:bg-slate-950 text-red-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                        style={{ borderColor: 'var(--line)' }}
                      >
                        🗑️ Eliminar Definitivo
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
