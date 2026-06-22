import React, { useEffect, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useConnectivity } from '../../../shared/hooks/useConnectivity'
import RiderOfflineBanner from '../components/RiderOfflineBanner'
import { fetchIncidents, reportIncident, resolveIncident } from '../services/deliveryRiderService'

export default function RiderIncidentsPage() {
  const { isOnline } = useConnectivity()
  const location = useLocation()
  const [assignmentId, setAssignmentId] = useState(location.state?.assignmentId || null)
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [code, setCode] = useState('DELAY')
  const [description, setDescription] = useState('')
  const [reporting, setReporting] = useState(false)
  const [resolvingId, setResolvingId] = useState('')

  useEffect(() => {
    void loadIncidents()
  }, [assignmentId, isOnline])

  async function loadIncidents() {
    if (!assignmentId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setErrorMsg('')
    try {
      const data = await fetchIncidents(assignmentId)
      setIncidents(data || [])
    } catch (err) {
      console.error('Error fetching incidents:', err)
      if (!isOnline) {
        setErrorMsg('Sin conexión. Mostrando datos de tu última sincronización.')
      } else {
        setErrorMsg(err?.response?.data?.detail || 'No se pudieron cargar las incidencias.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!description.trim()) return
    setReporting(true)
    try {
      const newInc = await reportIncident(assignmentId, code, description)
      setIncidents(prev => [newInc, ...prev])
      setDescription('')
    } catch (err) {
      alert(err?.response?.data?.detail || 'No se pudo registrar la incidencia.')
    } finally {
      setReporting(false)
    }
  }

  async function handleResolve(incidentId) {
    const notes = prompt('Escribe las notas de resolución para esta incidencia:')
    if (notes === null || !notes.trim()) return
    
    setResolvingId(incidentId)
    try {
      const updated = await resolveIncident(assignmentId, incidentId, notes)
      setIncidents(prev => prev.map(inc => inc.id === incidentId ? { ...inc, status: 'RESOLVED', resolution_notes: notes, resolved_at: new Date().toISOString(), __offline: updated.__offline } : inc))
    } catch (err) {
      alert(err?.response?.data?.detail || 'No se pudo resolver la incidencia.')
    } finally {
      setResolvingId('')
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border p-6 text-center" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
        Cargando incidencias de la entrega...
      </div>
    )
  }

  if (!assignmentId) {
    return (
      <div className="rounded-2xl border p-6 text-center space-y-4" style={{ borderColor: 'var(--line)' }}>
        <p className="font-semibold text-lg">No has seleccionado ninguna entrega para revisar incidencias.</p>
        <Link
          to="/delivery/assigned"
          className="inline-block px-5 py-2.5 rounded-xl font-semibold text-white transition"
          style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
        >
          Volver al Dashboard
        </Link>
      </div>
    )
  }

  return (
    <section className="space-y-6">
      <RiderOfflineBanner />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Incidencias de Entrega</h1>
          <p style={{ color: 'var(--muted)' }}>Reporta retrasos, problemas en la entrega o resuelve bloqueos operativos.</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/delivery/active"
            state={{ assignmentId }}
            className="px-4 py-2 rounded-xl border font-semibold transition"
            style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
          >
            Volver
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border p-3 text-sm text-yellow-600 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-900/30">
          {errorMsg}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Formulario de reporte */}
        <div className="rounded-2xl border p-6 space-y-4 h-fit" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <h2 className="text-xl font-bold">Reportar Nueva Incidencia</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>Tipo de Incidencia</label>
              <select
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-xl border p-3"
                style={{ borderColor: 'var(--line)', backgroundColor: 'var(--input)' }}
              >
                <option value="DELAY">Retraso en ruta</option>
                <option value="WRONG_ADDRESS">Dirección incorrecta</option>
                <option value="CLIENT_ABSENT">Cliente ausente</option>
                <option value="ORDER_DAMAGED">Pedido dañado/derramado</option>
                <option value="CANCELLATION_REQUEST">Solicitud de cancelación</option>
                <option value="CANNOT_COMPLETE">No se puede completar entrega</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>Descripción detallada</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Indica detalladamente lo ocurrido..."
                rows={4}
                className="w-full rounded-xl border p-3"
                style={{ borderColor: 'var(--line)', backgroundColor: 'var(--input)' }}
                required
              />
            </div>

            <button
              type="submit"
              disabled={reporting}
              className="w-full py-3 rounded-xl font-semibold text-white transition disabled:opacity-50"
              style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
            >
              {reporting ? 'Enviando...' : 'Reportar Incidencia'}
            </button>
          </form>
        </div>

        {/* Listado de incidencias */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Incidencias Reportadas ({incidents.length})</h2>
          
          {!incidents.length ? (
            <div className="rounded-2xl border p-5 text-center" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
              <p style={{ color: 'var(--muted)' }}>No se han reportado incidencias en este pedido.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {incidents.map((inc) => (
                <article
                  key={inc.id}
                  className="rounded-2xl border p-5 space-y-3"
                  style={{
                    borderColor: 'var(--line)',
                    backgroundColor: inc.status === 'RESOLVED' ? 'var(--panel-soft)' : 'var(--panel)'
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs px-2.5 py-1 rounded-full text-white font-bold" style={{
                      background: inc.status === 'RESOLVED'
                        ? 'linear-gradient(90deg, #10b981, #059669)'
                        : 'linear-gradient(90deg, #f59e0b, #d97706)'
                    }}>
                      {inc.status === 'RESOLVED' ? 'Resuelta' : 'Abierta'}
                    </span>
                    {(inc.__offline || inc.id.startsWith('local-')) && (
                      <span className="text-xs text-orange-500 font-semibold animate-pulse">Pendiente de sincronizar</span>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="font-bold">{inc.code === 'DELAY' ? 'Retraso en ruta' : inc.code}</h3>
                    <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{inc.description}</p>
                    <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>Reportado: {new Date(inc.created_at).toLocaleString()}</p>
                  </div>

                  {inc.status === 'RESOLVED' && inc.resolution_notes && (
                    <div className="p-3 rounded-xl border mt-2 text-sm" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
                      <p className="font-semibold text-xs" style={{ color: 'var(--muted)' }}>Notas de resolución:</p>
                      <p className="mt-0.5">{inc.resolution_notes}</p>
                    </div>
                  )}

                  {inc.status === 'OPEN' && (
                    <button
                      onClick={() => handleResolve(inc.id)}
                      disabled={resolvingId === inc.id}
                      className="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                      style={{ borderColor: 'var(--line)', color: 'var(--text)' }}
                    >
                      {resolvingId === inc.id ? 'Resolviendo...' : 'Resolver'}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
