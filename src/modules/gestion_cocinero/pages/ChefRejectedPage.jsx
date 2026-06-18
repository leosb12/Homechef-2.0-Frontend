import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { logoutUser } from '../../gestion_usuarios_acceso_suscripcion/services/auth_service'
import { useAuthSession } from '../../gestion_usuarios_acceso_suscripcion/services/auth_session'
import { api } from '../../../shared/services/api'
import DragDropImageUploader from '../../../shared/components/DragDropImageUploader'

export default function ChefRejectedPage() {
  const navigate = useNavigate()
  const user = useAuthSession((state) => state.user)
  const [photos, setPhotos] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user?.chef_profile?.status === 'approved') {
      navigate('/chef/dashboard', { replace: true })
    } else if (user?.chef_profile?.status === 'pending_validation') {
      navigate('/chef/pending', { replace: true })
    }
  }, [user, navigate])

  const onLogout = async () => {
    await logoutUser()
    useAuthSession.getState().clearSession()
    navigate('/login')
  }

  const onFilesChange = (e) => {
    if (e.error) {
      setError(e.error)
      return
    }
    const files = Array.from(e.target.files)
    setError('')
    setPhotos(files)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (photos.length === 0) {
      setError('Debes subir al menos 1 foto nueva de tu cocina.')
      return
    }
    setLoading(true)
    setError('')
    
    try {
      const payload = new FormData()
      photos.forEach(f => payload.append('kitchen_photos', f))
      
      await api.post('/auth/chef/resubmit/', payload)
      
      setSuccess('Solicitud re-enviada. Serás redirigido...')
      
      // Update session locally to reflect pending state
      const session = useAuthSession.getState()
      if (session.user) {
        session.setSession({
          ...session,
          user: {
            ...session.user,
            chef_profile: {
              ...session.user.chef_profile,
              status: 'pending_validation'
            }
          }
        })
      }

      setTimeout(() => navigate('/chef/pending', { replace: true }), 2000)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Error al enviar la solicitud.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-6 overflow-hidden" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      {/* Background Ornaments */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full blur-[120px]" style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full blur-[150px]" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Header/Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-4 shadow-xl border" style={{ backgroundColor: 'var(--panel)', borderColor: 'rgba(239,68,68,0.3)' }}>
            <span className="text-4xl">⚠️</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Tu solicitud necesita <span className="text-red-500">atención</span>
          </h1>
          <p className="text-lg sm:text-xl" style={{ color: 'var(--muted)' }}>
            Lamentablemente, tu perfil no cumplió con los requisitos iniciales.
          </p>
        </div>

        {/* Status Card */}
        <div className="rounded-[2rem] p-8 sm:p-10 border shadow-2xl backdrop-blur-xl relative overflow-hidden" style={{ backgroundColor: 'color-mix(in srgb, var(--panel) 85%, transparent)', borderColor: 'var(--line)' }}>
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
          
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <span className="text-red-500">❌</span> Solicitud Rechazada
            </h2>
            
            <div className="p-5 rounded-2xl mb-8 border" style={{ backgroundColor: 'color-mix(in srgb, rgba(239,68,68,0.1) 100%, transparent)', borderColor: 'rgba(239,68,68,0.2)' }}>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
                <strong>Motivo común:</strong> Las fotos de la cocina no son lo suficientemente claras, están borrosas o no muestran adecuadamente el espacio de trabajo.
              </p>
              <p className="text-sm leading-relaxed mt-2" style={{ color: 'var(--text)' }}>
                Por favor, vuelve a tomar fotografías claras y con buena iluminación de tu cocina y envíalas para una nueva revisión.
              </p>
            </div>

            <form onSubmit={onSubmit} className="flex flex-col gap-6">
              <div>
                <label className="block text-sm mb-3 font-bold" style={{ color: 'var(--text)' }}>
                  Sube nuevas fotos de tu cocina (1 a 3 fotos)
                </label>
                <div className="p-1 rounded-2xl border bg-white/5 dark:bg-black/20" style={{ borderColor: 'var(--line)' }}>
                  <DragDropImageUploader 
                    value={photos} 
                    onFilesChange={onFilesChange} 
                    maxFiles={3} 
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-sm font-medium">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-sm font-medium">
                  {success}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full py-4 text-white font-bold rounded-xl text-lg hover:opacity-90 disabled:opacity-60 transition-all active:scale-[0.98] shadow-lg shadow-red-500/20" 
                style={{ backgroundColor: 'var(--brand)' }}
              >
                {loading ? 'Procesando envío...' : 'Re-enviar Solicitud'}
              </button>
            </form>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 text-center">
          <button 
            onClick={onLogout}
            className="inline-flex items-center justify-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: 'var(--muted)' }}
          >
            Cerrar Sesión y volver más tarde
          </button>
        </div>
      </div>
    </div>
  )
}
