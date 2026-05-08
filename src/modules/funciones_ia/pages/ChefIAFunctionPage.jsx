import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import IAAccessNotice from '../components/IAAccessNotice'
import { IA_FUNCTIONS } from '../constants/iaFunctions'
import { usarFuncionIA } from '../services/iaAccessService'

const SLUG_TO_CODE = {
  assistant: 'asistente_ia',
  vision: 'vision_artificial',
  pricing: 'demanda_precios',
  publishing: 'publicacion_platos',
}

export default function ChefIAFunctionPage() {
  const { feature } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [status, setStatus] = useState(() => (location.state?.authorized ? 'authorized' : 'checking'))
  const [accessResponse, setAccessResponse] = useState(null)
  const [error, setError] = useState('')

  const functionCode = SLUG_TO_CODE[feature]
  const iaFunction = useMemo(() => IA_FUNCTIONS.find((item) => item.code === functionCode), [functionCode])

  useEffect(() => {
    let ignore = false

    async function validateAccess() {
      if (!functionCode) {
        setStatus('blocked')
        setAccessResponse({
          permitido: false,
          codigo: 'FUNCION_IA_NO_EXISTE',
          mensaje: 'La función IA solicitada no existe.',
        })
        return
      }

      if (location.state?.authorized && location.state?.functionCode === functionCode) {
        setStatus('authorized')
        return
      }

      setStatus('checking')
      setError('')
      try {
        const response = await usarFuncionIA(functionCode)
        if (ignore) return
        if (response.codigo === 'ACCESO_AUTORIZADO' && response.permitido) {
          setStatus('authorized')
          return
        }
        setAccessResponse(response)
        setStatus('blocked')
      } catch {
        if (!ignore) {
          setError('No se pudo validar el acceso a la función IA.')
          setStatus('blocked')
        }
      }
    }

    validateAccess()
    return () => {
      ignore = true
    }
  }, [functionCode, location.state])

  if (status === 'checking') return <p>Validando acceso a funciones IA...</p>

  if (error) {
    return (
      <section className="space-y-4">
        <p>{error}</p>
        <button type="button" className="px-4 py-2 rounded-lg border" style={{ borderColor: 'var(--line)' }} onClick={() => navigate('/chef/dashboard')}>
          Volver al dashboard
        </button>
      </section>
    )
  }

  if (status === 'blocked') {
    return (
      <section className="space-y-4">
        <IAAccessNotice response={accessResponse} variant="inline" />
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border p-6 space-y-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
        <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--brand-2)' }}>Acceso autorizado</p>
        <h1 className="text-3xl font-bold">{iaFunction?.title || 'Función IA'}</h1>
        <p style={{ color: 'var(--muted)' }}>
          Esta función IA fue autorizada por el backend. La experiencia real se conectará aquí cuando el microservicio IA esté disponible.
        </p>
      </div>
    </section>
  )
}
