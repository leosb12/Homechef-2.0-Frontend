import { useState } from 'react'
import { requestPasswordRecovery } from '../services/auth_service'

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleRequest = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsLoading(true)
    try {
      await requestPasswordRecovery({ email })
      setMessage('Solicitud enviada. Revisa tu correo para continuar con el cambio de contraseña.')
      setEmail('')
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'No se pudo procesar la solicitud.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="max-w-md mx-auto bg-white border rounded-xl p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Recuperar contraseña</h1>
        <p className="text-sm text-slate-600 mt-2">Ingresa tu correo para recibir un enlace de recuperación</p>
      </div>

      <form className="grid gap-4" onSubmit={handleRequest}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Correo registrado"
          className="border rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          required
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 rounded-md bg-slate-900 text-white font-medium hover:bg-slate-800 disabled:bg-slate-500 disabled:cursor-not-allowed transition"
        >
          {isLoading ? 'Enviando...' : 'Enviar solicitud'}
        </button>
      </form>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}
      {message && <p className="text-sm text-emerald-600 bg-emerald-50 p-3 rounded-md">{message}</p>}
    </section>
  )
}
