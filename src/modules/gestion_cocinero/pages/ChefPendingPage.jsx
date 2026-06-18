import { Link, useNavigate } from 'react-router-dom'
import { logoutUser } from '../../gestion_usuarios_acceso_suscripcion/services/auth_service'
import { useAuthSession } from '../../gestion_usuarios_acceso_suscripcion/services/auth_session'
import { useEffect } from 'react'

export default function ChefPendingPage() {
  const navigate = useNavigate()
  const user = useAuthSession((state) => state.user)

  useEffect(() => {
    if (user?.chef_profile?.status === 'approved') {
      navigate('/chef/dashboard', { replace: true })
    } else if (user?.chef_profile?.status === 'rejected') {
      navigate('/chef/rejected', { replace: true })
    }
  }, [user, navigate])

  const onLogout = async () => {
    await logoutUser()
    useAuthSession.getState().clearSession()
    navigate('/login')
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-6 overflow-hidden" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      {/* Background Ornaments */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[120px]" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)' }} />
        <div className="absolute top-[60%] -right-[10%] w-[60%] h-[60%] rounded-full blur-[150px]" style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.1) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Header/Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6 shadow-2xl" style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-2))' }}>
            <span className="text-4xl text-white">👨‍🍳</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Estamos preparando tu <span style={{ color: 'var(--brand-2)' }}>cocina</span>
          </h1>
          <p className="text-lg sm:text-xl" style={{ color: 'var(--muted)' }}>
            Tu perfil está en proceso de validación.
          </p>
        </div>

        {/* Status Card */}
        <div className="rounded-[2rem] p-8 sm:p-10 border shadow-2xl backdrop-blur-xl relative overflow-hidden" style={{ backgroundColor: 'color-mix(in srgb, var(--panel) 85%, transparent)', borderColor: 'var(--line)' }}>
          <div className="absolute top-0 left-0 w-full h-1" style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }} />
          
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: 'color-mix(in srgb, var(--brand-2) 15%, transparent)' }}>
              <span className="text-5xl animate-pulse">⏳</span>
            </div>
            
            <h2 className="text-2xl font-bold mb-3">Cuenta en Revisión</h2>
            
            <p className="mb-8 text-base leading-relaxed" style={{ color: 'var(--muted)' }}>
              Nuestro equipo administrativo está revisando tus datos para asegurar la mejor calidad en <strong>HomeChef</strong>. Este proceso suele tardar menos de 24 horas.
            </p>

            <div className="w-full space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl border" style={{ backgroundColor: 'var(--panel-soft)', borderColor: 'var(--line)' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, #10b981 20%, transparent)', color: '#10b981' }}>
                  ✓
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">Registro completado</p>
                  <p className="text-xs opacity-70">Datos enviados exitosamente</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl border" style={{ backgroundColor: 'var(--panel-soft)', borderColor: 'var(--brand-2)' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center animate-spin" style={{ backgroundColor: 'color-mix(in srgb, var(--brand-2) 20%, transparent)', color: 'var(--brand-2)' }}>
                  ↻
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">Verificación en curso</p>
                  <p className="text-xs opacity-70">Revisando identidad y fotos</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 text-center">
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
            Te enviaremos un correo electrónico en cuanto tu cuenta sea aprobada.
          </p>
          <button 
            onClick={onLogout}
            className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold transition-all hover:scale-105 active:scale-95"
            style={{ backgroundColor: 'var(--panel-soft)', color: 'var(--text)', border: '1px solid var(--line)' }}
          >
            Cerrar Sesión por ahora
          </button>
        </div>
      </div>
    </div>
  )
}
