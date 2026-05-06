import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../shared/services/supabase_client'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isValidToken, setIsValidToken] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  useEffect(() => {
    // Supabase redirige con #access_token= en el fragment
    // Verificar si hay una sesión activa (significa que el link fue válido)
    const checkSession = async () => {
      try {
        const url = new URL(window.location.href)
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''))
        const authError =
          url.searchParams.get('error_description') ||
          url.searchParams.get('error') ||
          hashParams.get('error_description') ||
          hashParams.get('error')

        if (authError) {
          setError(decodeURIComponent(authError))
          setIsCheckingSession(false)
          return
        }

        const code = url.searchParams.get('code')
        if (code) {
          const { error: codeError } = await supabase.auth.exchangeCodeForSession(code)
          if (codeError) throw codeError
          window.history.replaceState({}, document.title, '/reset-password')
        }

        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (sessionError) throw sessionError
          window.history.replaceState({}, document.title, '/reset-password')
        }

        const { data, error } = await supabase.auth.getSession()
        if (error) {
          setError('Error al verificar sesión: ' + error.message)
          setIsCheckingSession(false)
          return
        }

        if (data?.session) {
          setIsValidToken(true)
        } else {
          setError('Enlace de recuperación inválido o expirado. Solicita uno nuevo.')
        }
      } catch (err) {
        setError('Error: ' + err.message)
      } finally {
        setIsCheckingSession(false)
      }
    }

    checkSession()
  }, [])

  const handleResetPassword = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (password !== passwordConfirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setIsLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError

      setMessage('Contraseña actualizada correctamente. Redirigiendo a login...')
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err) {
      setError(err?.message || 'No se pudo actualizar la contraseña. Intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isCheckingSession) {
    return (
      <section className="max-w-md mx-auto bg-white border rounded-xl p-8 space-y-6">
        <p className="text-sm text-slate-600">Verificando enlace...</p>
      </section>
    )
  }

  if (!isValidToken && error) {
    return (
      <section className="max-w-md mx-auto bg-white border rounded-xl p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recuperar contraseña</h1>
        </div>
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>
        <button
          onClick={() => navigate('/recover-password')}
          className="w-full px-4 py-2 rounded-md bg-slate-900 text-white font-medium hover:bg-slate-800 transition"
        >
          Solicitar nuevo enlace
        </button>
      </section>
    )
  }

  return (
    <section className="max-w-md mx-auto bg-white border rounded-xl p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Cambiar contraseña</h1>
        <p className="text-sm text-slate-600 mt-2">Ingresa tu nueva contraseña</p>
      </div>

      <form className="grid gap-4" onSubmit={handleResetPassword}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nueva contraseña"
          className="border rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          required
          disabled={isLoading}
        />
        <input
          type="password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          placeholder="Confirmar contraseña"
          className="border rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          required
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 rounded-md bg-slate-900 text-white font-medium hover:bg-slate-800 disabled:bg-slate-500 disabled:cursor-not-allowed transition"
        >
          {isLoading ? 'Actualizando...' : 'Actualizar contraseña'}
        </button>
      </form>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}
      {message && <p className="text-sm text-emerald-600 bg-emerald-50 p-3 rounded-md">{message}</p>}
    </section>
  )
}
