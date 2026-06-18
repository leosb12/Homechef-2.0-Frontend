import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminPlatformService from '../services/admin_platform_service'

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState({
    revision: 0,
    critical: 0,
    reported: 0,
    monitored: 0,
  })

  useEffect(() => {
    void loadStats()
  }, [])

  async function loadStats() {
    setLoading(true)
    setError('')
    try {
      const response = await AdminPlatformService.getQualityStats()
      // response could be { data: [...] } or just an array [...] depending on backend.
      const list = response?.data || response || []
      
      let revision = 0
      let critical = 0
      let reported = 0
      let monitored = 0

      for (const item of list) {
        const status = item.revision_status || ''
        const riskScore = item.ia_risk_score || 0
        const reportCount = item.reported_count || 0

        if (status === 'pendiente_revision_ia' || status === 'requiere_revision') {
          revision++
        }
        if (riskScore >= 80) {
          critical++
        }
        if (reportCount > 0) {
          reported++
        }
        if (status === 'monitoreada') {
          monitored++
        }
      }

      setStats({ revision, critical, reported, monitored })
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Error al cargar métricas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight">Panel de Administrador</h1>
        <p className="mt-2 text-[15px]" style={{ color: 'var(--muted)' }}>
          Gestiona la confianza, seguridad y operación de HomeChef de manera integral.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border px-4 py-3 text-sm text-red-600 bg-red-50 border-red-200 flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Metrics Section */}
      <section>
        <h2 className="text-xl font-bold mb-4">Resumen de Calidad</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="En revisión" 
            value={loading ? '...' : stats.revision} 
            color="rgb(59, 130, 246)" 
            bgColor="rgba(59, 130, 246, 0.1)"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />}
          />
          <StatCard 
            title="Críticas (Riesgo ≥ 80)" 
            value={loading ? '...' : stats.critical} 
            color="rgb(239, 68, 68)" 
            bgColor="rgba(239, 68, 68, 0.1)"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />}
          />
          <StatCard 
            title="Reportes de usuarios" 
            value={loading ? '...' : stats.reported} 
            color="rgb(249, 115, 22)" 
            bgColor="rgba(249, 115, 22, 0.1)"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />}
          />
          <StatCard 
            title="Monitoreadas" 
            value={loading ? '...' : stats.monitored} 
            color="rgb(20, 184, 166)" 
            bgColor="rgba(20, 184, 166, 0.1)"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />}
          />
        </div>
      </section>

      {/* Modules Grid */}
      <section>
        <h2 className="text-xl font-bold mb-4">Módulos de Gestión</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <ModuleCard
            to="/admin/fraud"
            title="Control de calidad"
            description="Revisar publicaciones reportadas o sospechosas y tomar medidas de mitigación."
            color="rgb(21, 128, 61)"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />}
          />
          <ModuleCard
            to="/admin/users"
            title="Usuarios"
            description="Buscar, examinar perfiles, y bloquear o desbloquear usuarios en la plataforma."
            color="rgb(126, 34, 206)"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />}
          />
          <ModuleCard
            to="/admin/chefs"
            title="Validar cocineros"
            description="Revisar y aprobar solicitudes de inscripción de nuevos cocineros."
            color="rgb(67, 56, 202)"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />}
          />
          <ModuleCard
            to="/admin/publications"
            title="Publicaciones"
            description="Administrar y moderar todas las publicaciones (platos) de la plataforma."
            color="rgb(14, 116, 144)"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H14" />}
          />
          <ModuleCard
            to="/admin/delivery-drivers"
            title="Repartidores"
            description="Gestionar el estado, altas y bajas de los repartidores (drivers) activos."
            color="rgb(194, 65, 12)"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />}
          />
          <ModuleCard
            to="/admin/delivery-orders"
            title="Pedidos Delivery Activos"
            description="Monitorear el estado de los pedidos en curso e incidencias en la ruta."
            color="rgb(29, 78, 216)"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 9h4.5a2 2 0 011.83 1.17L21 14h-8v-5z M3 6h10v10H3V6z" />}
          />
          <ModuleCard
            to="/admin/fraud"
            title="Seguridad y fraude"
            description="Analizar patrones, detectar actividad sospechosa y resolver fraudes."
            color="rgb(194, 65, 12)"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />}
          />
          <ModuleCard
            to="/admin/reports"
            title="Reportes"
            description="Consultar métricas generales de crecimiento, desempeño y ventas."
            color="rgb(15, 118, 110)"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />}
          />
          <ModuleCard
            to="/admin/settings"
            title="Configuración"
            description="Administrar variables maestras del sistema y ajustes globales."
            color="rgb(51, 65, 85)"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />}
          />
        </div>
      </section>
    </div>
  )
}

function StatCard({ title, value, color, bgColor, icon }) {
  return (
    <div 
      className="p-5 rounded-2xl border" 
      style={{ 
        borderColor: 'rgba(148, 163, 184, 0.18)', 
        backgroundColor: 'var(--panel)', 
        boxShadow: '0 8px 30px rgba(15, 23, 42, 0.04)' 
      }}
    >
      <div className="flex items-center gap-4">
        <div 
          className="w-12 h-12 flex items-center justify-center rounded-full"
          style={{ backgroundColor: bgColor, color }}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {icon}
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>{title}</p>
          <h3 className="text-2xl font-extrabold tracking-tight mt-0.5">{value}</h3>
        </div>
      </div>
    </div>
  )
}

function ModuleCard({ to, title, description, color, icon }) {
  return (
    <Link 
      to={to}
      className="group p-5 rounded-[22px] border transition-all hover:-translate-y-1"
      style={{ 
        borderColor: 'rgba(148, 163, 184, 0.18)', 
        backgroundColor: 'var(--panel)', 
        boxShadow: '0 8px 30px rgba(15, 23, 42, 0.04)' 
      }}
    >
      <div className="flex items-start gap-4">
        <div 
          className="w-12 h-12 shrink-0 flex items-center justify-center rounded-full transition-transform group-hover:scale-110"
          style={{ backgroundColor: color + '1A', color }} // 1A is ~10% opacity in hex
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {icon}
          </svg>
        </div>
        <div>
          <h3 className="text-[17px] font-bold group-hover:text-[color:var(--brand)] transition-colors">
            {title}
          </h3>
          <p className="text-[13px] leading-relaxed mt-1" style={{ color: 'var(--muted)' }}>
            {description}
          </p>
        </div>
      </div>
    </Link>
  )
}
