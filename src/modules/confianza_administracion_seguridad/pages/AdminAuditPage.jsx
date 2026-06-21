import { useEffect, useState } from 'react'
import AuditService from '../services/audit_service'

const GENERAL_FILTERS = {
  date_from: '',
  date_to: '',
  event_category: '',
  action: '',
  severity: '',
  status: '',
  actor: '',
  entity: '',
  search: '',
}

const AI_FILTERS = {
  date_from: '',
  date_to: '',
  provider_model: '',
  module: '',
  user: '',
  status: '',
  search: '',
}

export default function AdminAuditPage() {
  const [mode, setMode] = useState('general')
  const [generalFilters, setGeneralFilters] = useState(GENERAL_FILTERS)
  const [aiFilters, setAiFilters] = useState(AI_FILTERS)
  const [general, setGeneral] = useState({ items: [], pagination: { page: 1, total_pages: 1, total: 0 } })
  const [ai, setAi] = useState({ items: [], pagination: { page: 1, total_pages: 1, total: 0 }, mongo: {} })
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const activeFilters = mode === 'general' ? generalFilters : aiFilters
  const activePage = mode === 'general' ? general.pagination?.page || 1 : ai.pagination?.page || 1

  useEffect(() => {
    void loadData(1)
  }, [mode])

  useEffect(() => {
    const timer = setTimeout(() => void loadData(1), 250)
    return () => clearTimeout(timer)
  }, [generalFilters, aiFilters])

  async function loadData(page = activePage) {
    setLoading(true)
    setError('')
    try {
      if (mode === 'general') {
        const params = { ...generalFilters, page, page_size: 25 }
        const [listPayload, summaryPayload] = await Promise.all([
          AuditService.getGeneral(params),
          AuditService.getGeneralSummary(generalFilters),
        ])
        setGeneral(listPayload)
        setSummary(summaryPayload)
      } else {
        const params = { ...aiFilters, page, page_size: 25 }
        const [listPayload, summaryPayload] = await Promise.all([
          AuditService.getAI(params),
          AuditService.getAISummary(aiFilters),
        ])
        setAi(listPayload)
        setSummary(summaryPayload)
      }
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'No se pudo cargar auditoria.')
    } finally {
      setLoading(false)
    }
  }

  async function openDetail(row) {
    setDetailLoading(true)
    setDetail({ title: 'Cargando detalle...' })
    try {
      const payload = mode === 'general'
        ? await AuditService.getGeneralDetail(row.id)
        : await AuditService.getAIDetail(row.id)
      setDetail(payload)
    } catch (err) {
      setDetail({ error: err?.response?.data?.detail || err?.message || 'No se pudo cargar el detalle.' })
    } finally {
      setDetailLoading(false)
    }
  }

  async function exportCurrent(format) {
    try {
      const params = { ...activeFilters, format }
      if (mode === 'general') await AuditService.exportGeneral(params)
      else await AuditService.exportAI(params)
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'No se pudo exportar auditoria.')
    }
  }

  const currentRows = mode === 'general' ? general.items || [] : ai.items || []
  const pagination = mode === 'general' ? general.pagination || {} : ai.pagination || {}
  const mongoWarning = mode === 'ai' && ai.mongo && ai.mongo.available === false ? ai.mongo.error : ''

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">{'Auditor\u00eda'}</h1>
          <p className="mt-2 text-[15px]" style={{ color: 'var(--muted)' }}>
            Trazabilidad operativa, seguridad y uso de IA en HomeChef.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => exportCurrent('csv')} className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-orange-50" style={{ borderColor: 'rgba(249,115,22,.28)', color: '#c2410c' }}>
            Exportar CSV
          </button>
          <button type="button" onClick={() => exportCurrent('json')} className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-purple-50" style={{ borderColor: 'rgba(124,58,237,.28)', color: '#6d28d9' }}>
            Exportar JSON
          </button>
        </div>
      </div>

      <div className="inline-flex rounded-2xl border p-1" style={{ borderColor: 'rgba(148,163,184,.18)', backgroundColor: 'var(--panel)' }}>
        <TabButton active={mode === 'general'} onClick={() => setMode('general')}>Auditoria General</TabButton>
        <TabButton active={mode === 'ai'} onClick={() => setMode('ai')}>Auditoria Uso de IA</TabButton>
      </div>

      <SummaryCards mode={mode} summary={summary} loading={loading} />

      {error && <Alert tone="red">{error}</Alert>}
      {mongoWarning && <Alert tone="amber">MongoDB no esta disponible para auditoria IA: {mongoWarning}</Alert>}

      {mode === 'general' ? (
        <GeneralFilters filters={generalFilters} onChange={setGeneralFilters} />
      ) : (
        <AIFilters filters={aiFilters} onChange={setAiFilters} />
      )}

      <section className="overflow-hidden rounded-[22px] border" style={{ borderColor: 'rgba(148,163,184,.18)', backgroundColor: 'var(--panel)', boxShadow: '0 20px 50px rgba(15,23,42,.07)' }}>
        <div className="overflow-x-auto">
          {mode === 'general' ? (
            <GeneralTable rows={currentRows} loading={loading} onDetail={openDetail} />
          ) : (
            <AITable rows={currentRows} loading={loading} onDetail={openDetail} />
          )}
        </div>
        <Pagination pagination={pagination} loading={loading} onPage={(page) => loadData(page)} />
      </section>

      {detail && (
        <DetailModal
          mode={mode}
          detail={detail}
          loading={detailLoading}
          onClose={() => setDetail(null)}
        />
      )}
    </section>
  )
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl px-4 py-2 text-sm font-bold transition"
      style={{
        backgroundColor: active ? '#7c3aed' : 'transparent',
        color: active ? 'white' : 'var(--muted)',
      }}
    >
      {children}
    </button>
  )
}

function SummaryCards({ mode, summary, loading }) {
  const cards = mode === 'general'
    ? [
      ['Total eventos', summary.total_events],
      ['Criticos', summary.critical_events],
      ['Fallidos', summary.failed_events],
      ['Eventos hoy', summary.today_events],
      ['Usuarios auditados', summary.audited_active_users],
    ]
    : [
      ['Consultas IA', summary.total_ai_queries],
      ['Exitosas', summary.successful_queries],
      ['Fallidas', summary.failed_queries],
      ['Proveedor top', summary.most_used_provider || '-'],
      ['Latencia prom.', summary.average_latency_ms ? `${summary.average_latency_ms} ms` : '-'],
    ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map(([label, value], index) => (
        <div key={label} className="rounded-[20px] border p-4" style={{ borderColor: 'rgba(148,163,184,.18)', backgroundColor: 'var(--panel)', boxShadow: '0 10px 30px rgba(15,23,42,.05)' }}>
          <div className="mb-3 h-1.5 w-12 rounded-full" style={{ backgroundColor: index % 2 ? '#f97316' : '#7c3aed' }} />
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>{label}</p>
          <p className="mt-1 text-2xl font-extrabold">{loading ? '...' : value ?? 0}</p>
        </div>
      ))}
    </div>
  )
}

function GeneralFilters({ filters, onChange }) {
  return (
    <FilterPanel>
      <DateInput label="Desde" value={filters.date_from} onChange={(date_from) => onChange((prev) => ({ ...prev, date_from }))} />
      <DateInput label="Hasta" value={filters.date_to} onChange={(date_to) => onChange((prev) => ({ ...prev, date_to }))} />
      <SelectInput label="Categoria" value={filters.event_category} onChange={(event_category) => onChange((prev) => ({ ...prev, event_category }))} options={['users', 'chefs', 'riders', 'orders', 'publications', 'payments', 'security', 'admin', 'notifications', 'system']} />
      <SelectInput label="Accion" value={filters.action} onChange={(action) => onChange((prev) => ({ ...prev, action }))} options={['created', 'updated', 'deleted', 'login', 'logout', 'approved', 'rejected', 'blocked', 'unblocked', 'assigned', 'cancelled', 'delivered', 'exported', 'viewed', 'failed']} />
      <SelectInput label="Severidad" value={filters.severity} onChange={(severity) => onChange((prev) => ({ ...prev, severity }))} options={['info', 'warning', 'critical']} />
      <SelectInput label="Estado" value={filters.status} onChange={(status) => onChange((prev) => ({ ...prev, status }))} options={['success', 'failed']} />
      <TextInput label="Actor" value={filters.actor} onChange={(actor) => onChange((prev) => ({ ...prev, actor }))} placeholder="Usuario, nombre o rol" />
      <TextInput label="Entidad" value={filters.entity} onChange={(entity) => onChange((prev) => ({ ...prev, entity }))} placeholder="Tipo o ID" />
      <TextInput label="Busqueda" value={filters.search} onChange={(search) => onChange((prev) => ({ ...prev, search }))} placeholder="Descripcion, evento..." wide />
    </FilterPanel>
  )
}

function AIFilters({ filters, onChange }) {
  return (
    <FilterPanel>
      <DateInput label="Desde" value={filters.date_from} onChange={(date_from) => onChange((prev) => ({ ...prev, date_from }))} />
      <DateInput label="Hasta" value={filters.date_to} onChange={(date_to) => onChange((prev) => ({ ...prev, date_to }))} />
      <TextInput label="Proveedor/modelo" value={filters.provider_model} onChange={(provider_model) => onChange((prev) => ({ ...prev, provider_model }))} placeholder="Groq, Gemini, local..." />
      <TextInput label="Modulo" value={filters.module} onChange={(module) => onChange((prev) => ({ ...prev, module }))} placeholder="CU-23, chatbot..." />
      <TextInput label="Usuario" value={filters.user} onChange={(user) => onChange((prev) => ({ ...prev, user }))} placeholder="ID usuario" />
      <SelectInput label="Estado" value={filters.status} onChange={(status) => onChange((prev) => ({ ...prev, status }))} options={['success', 'failed']} />
      <TextInput label="Busqueda" value={filters.search} onChange={(search) => onChange((prev) => ({ ...prev, search }))} placeholder="Prompt, respuesta, error..." wide />
    </FilterPanel>
  )
}

function FilterPanel({ children }) {
  return (
    <div className="grid gap-3 rounded-[22px] border p-4 sm:grid-cols-2 xl:grid-cols-5" style={{ borderColor: 'rgba(148,163,184,.18)', backgroundColor: 'var(--panel)' }}>
      {children}
    </div>
  )
}

function TextInput({ label, value, onChange, placeholder, wide }) {
  return (
    <label className={wide ? 'xl:col-span-2' : ''}>
      <span className="mb-1 block text-xs font-bold uppercase" style={{ color: 'var(--muted)' }}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border px-3 py-2 text-sm outline-none" style={{ borderColor: 'rgba(148,163,184,.22)', backgroundColor: 'var(--panel)' }} />
    </label>
  )
}

function DateInput({ label, value, onChange }) {
  return (
    <label>
      <span className="mb-1 block text-xs font-bold uppercase" style={{ color: 'var(--muted)' }}>{label}</span>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm outline-none" style={{ borderColor: 'rgba(148,163,184,.22)', backgroundColor: 'var(--panel)' }} />
    </label>
  )
}

function SelectInput({ label, value, onChange, options }) {
  return (
    <label>
      <span className="mb-1 block text-xs font-bold uppercase" style={{ color: 'var(--muted)' }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm outline-none" style={{ borderColor: 'rgba(148,163,184,.22)', backgroundColor: 'var(--panel)' }}>
        <option value="">Todos</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

function GeneralTable({ rows, loading, onDetail }) {
  return (
    <table className="min-w-full text-sm">
      <TableHead columns={['Fecha', 'Categoria', 'Accion', 'Actor', 'Entidad', 'Descripcion', 'Severidad', 'Estado', '']} />
      <tbody>
        {loading ? <EmptyRow colSpan={9} text="Cargando eventos..." /> : rows.length === 0 ? <EmptyRow colSpan={9} text="No hay eventos con esos filtros." /> : rows.map((row) => (
          <tr key={row.id} className="border-t" style={{ borderColor: 'rgba(148,163,184,.14)' }}>
            <Cell>{formatDate(row.created_at)}</Cell>
            <Cell><Badge>{row.event_category}</Badge></Cell>
            <Cell>{row.action}</Cell>
            <Cell>{row.actor_name || row.actor_user_id || '-'}</Cell>
            <Cell>{row.entity_type}<span className="block max-w-[140px] truncate text-xs text-gray-400">{row.entity_id}</span></Cell>
            <Cell className="max-w-[360px]">{row.description}</Cell>
            <Cell><Severity value={row.severity} /></Cell>
            <Cell><StatusBadge value={row.status} /></Cell>
            <Cell><DetailButton onClick={() => onDetail(row)} /></Cell>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function AITable({ rows, loading, onDetail }) {
  return (
    <table className="min-w-full text-sm">
      <TableHead columns={['Fecha', 'Usuario', 'Modulo', 'Proveedor/modelo', 'Prompt/resumen', 'Estado', 'Latencia', '']} />
      <tbody>
        {loading ? <EmptyRow colSpan={8} text="Cargando auditoria IA..." /> : rows.length === 0 ? <EmptyRow colSpan={8} text="No hay eventos IA con esos filtros." /> : rows.map((row) => (
          <tr key={row.id} className="border-t" style={{ borderColor: 'rgba(148,163,184,.14)' }}>
            <Cell>{formatDate(row.created_at)}</Cell>
            <Cell>{row.user_id || '-'}<span className="block text-xs text-gray-400">{row.user_role}</span></Cell>
            <Cell><Badge>{row.module || row.collection}</Badge></Cell>
            <Cell>{row.provider || '-'}<span className="block text-xs text-gray-400">{row.model}</span></Cell>
            <Cell className="max-w-[420px]">{truncate(row.prompt || row.response || '-', 120)}</Cell>
            <Cell><StatusBadge value={row.status} /></Cell>
            <Cell>{row.latency_ms ? `${row.latency_ms} ms` : '-'}</Cell>
            <Cell><DetailButton onClick={() => onDetail(row)} /></Cell>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TableHead({ columns }) {
  return (
    <thead style={{ backgroundColor: 'rgba(248,250,252,.75)' }}>
      <tr>{columns.map((column) => <th key={column} className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wide">{column}</th>)}</tr>
    </thead>
  )
}

function Cell({ children, className = '' }) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>
}

function EmptyRow({ colSpan, text }) {
  return <tr><td colSpan={colSpan} className="px-5 py-12 text-center" style={{ color: 'var(--muted)' }}>{text}</td></tr>
}

function Badge({ children }) {
  return <span className="rounded-lg bg-purple-50 px-2 py-1 text-xs font-bold text-purple-700">{children}</span>
}

function Severity({ value }) {
  const classes = value === 'critical' ? 'bg-red-100 text-red-700' : value === 'warning' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'
  return <span className={`rounded-lg px-2 py-1 text-xs font-bold ${classes}`}>{value || 'info'}</span>
}

function StatusBadge({ value }) {
  const ok = value !== 'failed'
  return <span className={`rounded-lg px-2 py-1 text-xs font-bold ${ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{value || 'success'}</span>
}

function DetailButton({ onClick }) {
  return <button type="button" onClick={onClick} className="rounded-xl border px-3 py-2 text-xs font-bold hover:bg-purple-50" style={{ borderColor: 'rgba(124,58,237,.24)', color: '#6d28d9' }}>Detalle</button>
}

function Pagination({ pagination, loading, onPage }) {
  const page = pagination.page || 1
  const totalPages = pagination.total_pages || 1
  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'rgba(148,163,184,.14)' }}>
      <span className="text-sm" style={{ color: 'var(--muted)' }}>{pagination.total || 0} eventos encontrados</span>
      <div className="flex items-center gap-2">
        <button disabled={loading || page <= 1} onClick={() => onPage(page - 1)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Anterior</button>
        <span className="text-sm font-semibold">Pagina {page} de {totalPages}</span>
        <button disabled={loading || page >= totalPages} onClick={() => onPage(page + 1)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Siguiente</button>
      </div>
    </div>
  )
}

function DetailModal({ mode, detail, loading, onClose }) {
  const title = mode === 'general'
    ? `${detail.event_type || 'Evento'} #${detail.id || ''}`
    : `${detail.module || detail.collection || 'Evento IA'}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[22px] border bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase text-purple-600">Detalle de auditoria</p>
            <h2 className="text-xl font-extrabold">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border px-3 py-2 text-sm font-bold">Cerrar</button>
        </div>
        <div className="max-h-[72vh] overflow-y-auto p-5">
          {loading ? (
            <p>Cargando detalle...</p>
          ) : detail.error ? (
            <Alert tone="red">{detail.error}</Alert>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <DetailBlock title="Resumen" data={summaryDetail(detail, mode)} />
              <DetailBlock title={mode === 'general' ? 'Old values' : 'Prompt completo'} data={mode === 'general' ? detail.old_values : detail.prompt} />
              <DetailBlock title={mode === 'general' ? 'New values' : 'Respuesta completa'} data={mode === 'general' ? detail.new_values : detail.response} />
              <DetailBlock title="Metadata" data={detail.metadata} />
              {mode === 'ai' && detail.error ? <DetailBlock title="Error" data={detail.error} /> : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailBlock({ title, data }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: 'rgba(148,163,184,.18)', backgroundColor: 'rgba(248,250,252,.65)' }}>
      <h3 className="mb-2 text-sm font-extrabold">{title}</h3>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed">{formatValue(data)}</pre>
    </div>
  )
}

function Alert({ tone, children }) {
  const classes = tone === 'amber' ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-red-200 bg-red-50 text-red-700'
  return <div className={`rounded-2xl border px-4 py-3 text-sm ${classes}`}>{children}</div>
}

function summaryDetail(detail, mode) {
  if (mode === 'general') {
    return {
      fecha: detail.created_at,
      actor: detail.actor_name || detail.actor_user_id,
      entidad: `${detail.entity_type}:${detail.entity_id}`,
      ip: detail.ip_address,
      user_agent: detail.user_agent,
      request_id: detail.request_id,
      severidad: detail.severity,
      estado: detail.status,
      descripcion: detail.description,
    }
  }
  return {
    fecha: detail.created_at,
    usuario: detail.user_id,
    rol: detail.user_role,
    modulo: detail.module,
    proveedor: detail.provider,
    modelo: detail.model,
    estado: detail.status,
    latencia_ms: detail.latency_ms,
    request_id: detail.request_id,
    session_id: detail.session_id,
  }
}

function formatValue(value) {
  if (value === undefined || value === null || value === '') return '-'
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

function formatDate(value) {
  if (!value) return '-'
  try {
    return new Intl.DateTimeFormat('es-BO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  } catch {
    return value
  }
}

function truncate(value, max) {
  const text = String(value || '')
  return text.length > max ? `${text.slice(0, max)}...` : text
}
