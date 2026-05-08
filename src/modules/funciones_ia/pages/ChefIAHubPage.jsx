import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import IAAccessNotice from '../components/IAAccessNotice'
import { IA_FUNCTIONS } from '../constants/iaFunctions'
import { usarFuncionIA } from '../services/iaAccessService'

export default function ChefIAHubPage() {
  const navigate = useNavigate()
  const [accessResponse, setAccessResponse] = useState(null)
  const [loadingCode, setLoadingCode] = useState('')
  const [error, setError] = useState('')

  const handleUseIAFunction = async (iaFunction) => {
    setLoadingCode(iaFunction.code)
    setError('')
    setAccessResponse(null)
    try {
      const response = await usarFuncionIA(iaFunction.code)
      if (response.codigo === 'ACCESO_AUTORIZADO' && response.permitido) {
        navigate(iaFunction.path, { state: { authorized: true, functionCode: iaFunction.code } })
        return
      }
      setAccessResponse(response)
    } catch {
      setError('No se pudo validar el acceso a la función IA.')
    } finally {
      setLoadingCode('')
    }
  }

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Asistente IA</h1>
        <p className="max-w-3xl" style={{ color: 'var(--muted)' }}>
          Selecciona una función IA. El backend valida el acceso antes de abrir cada experiencia.
        </p>
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {IA_FUNCTIONS.map((iaFunction) => (
          <IAFunctionCard
            key={iaFunction.code}
            iaFunction={iaFunction}
            loading={loadingCode === iaFunction.code}
            onClick={() => handleUseIAFunction(iaFunction)}
          />
        ))}
      </div>

      {accessResponse ? <IAAccessNotice response={accessResponse} onClose={() => setAccessResponse(null)} /> : null}
    </section>
  )
}

function IAFunctionCard({ iaFunction, loading, onClick }) {
  return (
    <button
      type="button"
      className="group text-left rounded-xl border p-5 min-h-[190px] flex flex-col gap-4 transition disabled:cursor-wait"
      style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}
      onClick={onClick}
      disabled={loading}
    >
      <span className="h-11 w-11 rounded-lg grid place-items-center text-white font-bold" style={{ backgroundColor: iaFunction.accent }}>
        {iaFunction.shortLabel}
      </span>
      <span className="text-xl font-semibold leading-tight">{iaFunction.title}</span>
      <span className="text-sm flex-1" style={{ color: 'var(--muted)' }}>{iaFunction.description}</span>
      <span className="text-sm font-semibold" style={{ color: 'var(--brand-2)' }}>
        {loading ? 'Validando...' : 'Abrir función'}
      </span>
    </button>
  )
}
