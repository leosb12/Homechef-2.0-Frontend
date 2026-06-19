import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FunctionCard from '../components/FunctionCard';
import IAAccessNotice from '../components/IAAccessNotice';
import { IA_FUNCTIONS } from '../constants/iaFunctions';
import { usarFuncionIA } from '../services/funcionesIaAccess.service';
import type { UsarFuncionIAResponse, IAFunctionMetadata } from '../types/funcionesIa.types';

export default function FuncionesIaPage() {
  const navigate = useNavigate();
  const [accessResponse, setAccessResponse] = useState<UsarFuncionIAResponse | null>(null);
  const [loadingCode, setLoadingCode] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleUseIAFunction = async (iaFunction: IAFunctionMetadata) => {
    setLoadingCode(iaFunction.code);
    setError('');
    setAccessResponse(null);
    try {
      const response = await usarFuncionIA(iaFunction.code);
      if (response.codigo === 'ACCESO_AUTORIZADO' && response.permitido) {
        navigate(iaFunction.path, { state: { authorized: true, functionCode: iaFunction.code } });
        return;
      }
      setAccessResponse(response);
    } catch {
      setError('No se pudo validar el acceso a la función IA.');
    } finally {
      setLoadingCode('');
    }
  };

  return (
    <section className="space-y-5 animate-in fade-in duration-300">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Asistente IA</h1>
        <p className="max-w-3xl" style={{ color: 'var(--muted)' }}>
          Selecciona una función IA. El backend valida el acceso antes de abrir cada experiencia.
        </p>
      </div>

      {error ? (
        <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/50 text-red-200 text-sm">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {IA_FUNCTIONS.map((iaFunction) => (
          <FunctionCard
            key={iaFunction.code}
            iaFunction={iaFunction}
            loading={loadingCode === iaFunction.code}
            onClick={() => handleUseIAFunction(iaFunction)}
          />
        ))}
      </div>

      {accessResponse ? (
        <IAAccessNotice response={accessResponse} onClose={() => setAccessResponse(null)} />
      ) : null}
    </section>
  );
}
