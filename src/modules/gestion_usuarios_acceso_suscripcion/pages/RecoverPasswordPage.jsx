import { useState } from 'react'
import { confirmPasswordRecovery, requestPasswordRecovery } from '../services/auth_service'

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleRequest = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    try {
      const response = await requestPasswordRecovery({ email })
      setToken(response.recovery_token_stub || '')
      setMessage('Solicitud enviada. Revisa tu correo (en bootstrap se muestra token de prueba).')
    } catch (err) {
      setError(err?.response?.data?.detail || 'No se pudo procesar la solicitud.')
    }
  }

  const handleConfirm = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    try {
      await confirmPasswordRecovery({ token, password, password_confirm: passwordConfirm })
      setMessage('Contrasena actualizada correctamente. Ya puedes iniciar sesion.')
    } catch (err) {
      setError(err?.response?.data?.detail || 'No se pudo actualizar la contrasena.')
    }
  }

  return (
    <section className="max-w-xl mx-auto bg-white border rounded-xl p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Recuperar contrasena</h1>

      <form className="grid gap-3" onSubmit={handleRequest}>
        <h2 className="font-semibold text-slate-800">1) Solicitar recuperacion</h2>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo registrado" className="border rounded-md px-3 py-2" required />
        <button className="px-4 py-2 rounded-md bg-slate-900 text-white">Enviar solicitud</button>
      </form>

      <form className="grid gap-3" onSubmit={handleConfirm}>
        <h2 className="font-semibold text-slate-800">2) Confirmar nueva contrasena</h2>
        <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Token de recuperacion" className="border rounded-md px-3 py-2" required />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nueva contrasena" className="border rounded-md px-3 py-2" required />
        <input type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} placeholder="Confirmar nueva contrasena" className="border rounded-md px-3 py-2" required />
        <button className="px-4 py-2 rounded-md bg-slate-900 text-white">Actualizar contrasena</button>
      </form>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {token && <p className="text-xs text-slate-500">Token de prueba: {token}</p>}
    </section>
  )
}
