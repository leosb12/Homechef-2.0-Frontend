import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import IAAccessNotice from '../components/IAAccessNotice';
import { IA_FUNCTIONS } from '../constants/iaFunctions';
import { usarFuncionIA } from '../services/funcionesIaAccess.service';
import type { UsarFuncionIAResponse } from '../types/funcionesIa.types';
import { canBypassIAAccessForOfflineDev } from '../shared/offline/offline_utils';

// Import submodules pages
import AsistenteIaPage from '../submodules/asistente_ia/pages/AsistenteIaPage';
import VisionArtificialPage from '../submodules/vision_artificial/pages/VisionArtificialPage';
import DemandaPreciosPage from '../submodules/demanda_precios/pages/DemandaPreciosPage';
import PublicacionPlatosPage from '../submodules/publicacion_platos/pages/PublicacionPlatosPage';
import ChefOfflineBanner from '../../gestion_cocinero/components/ChefOfflineBanner';

const SLUG_TO_CODE: Record<string, string> = {
  assistant: 'asistente_ia',
  vision: 'vision_artificial',
  pricing: 'demanda_precios',
  publishing: 'publicacion_platos',
};

export default function ChefIAFunctionPage() {
  const { feature } = useParams<{ feature: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const functionCode = feature ? SLUG_TO_CODE[feature] : undefined;
  const iaFunction = useMemo(() => IA_FUNCTIONS.find((item) => item.code === functionCode), [functionCode]);
  
  const [status, setStatus] = useState<'checking' | 'authorized' | 'blocked'>(() => {
    const locState = location.state as { authorized?: boolean; functionCode?: string } | null;
    return locState?.authorized && locState?.functionCode === functionCode ? 'authorized' : 'checking';
  });
  
  const [accessResponse, setAccessResponse] = useState<UsarFuncionIAResponse | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let ignore = false;

    async function validateAccess() {
      if (!functionCode) {
        setStatus('blocked');
        setAccessResponse({
          permitido: false,
          codigo: 'FUNCION_IA_NO_EXISTE',
          mensaje: 'La función IA solicitada no existe.',
        });
        return;
      }

      const locState = location.state as { authorized?: boolean; functionCode?: string } | null;
      if (locState?.authorized && locState?.functionCode === functionCode) {
        setStatus('authorized');
        return;
      }

      setStatus('checking');
      setError('');
      try {
        const response = await usarFuncionIA(functionCode);
        if (ignore) return;
        if (response.codigo === 'ACCESO_AUTORIZADO' && response.permitido) {
          setStatus('authorized');
          return;
        }
        setAccessResponse(response);
        setStatus('blocked');
      } catch {
        if (!ignore) {
          if (canBypassIAAccessForOfflineDev(functionCode)) {
            setAccessResponse({
              permitido: true,
              codigo: 'ACCESO_AUTORIZADO',
              mensaje: 'Modo desarrollo/local: backend no disponible, se habilita solo el motor offline del navegador.',
            });
            setStatus('authorized');
            return;
          }
          setError('No se pudo validar el acceso a la función IA.');
          setStatus('blocked');
        }
      }
    }

    validateAccess();
    return () => {
      ignore = true;
    };
  }, [functionCode, location.state]);

  if (status === 'checking') {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="w-10 h-10 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div>
        <p style={{ color: 'var(--muted)' }}>Validando acceso a la función IA...</p>
      </div>
    );
  }

  if (error) {
    return (
      <section className="space-y-4 max-w-xl p-6 border rounded-xl" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
        <p className="text-red-300 font-semibold">{error}</p>
        <button
          type="button"
          className="px-4 py-2 rounded-lg border hover:bg-[var(--panel-soft)] transition"
          style={{ borderColor: 'var(--line)' }}
          onClick={() => navigate('/chef/dashboard')}
        >
          Volver al dashboard
        </button>
      </section>
    );
  }

  if (status === 'blocked') {
    return (
      <section className="space-y-4">
        <IAAccessNotice response={accessResponse} variant="inline" />
      </section>
    );
  }

  // Render specific submodule screen if authorized
  const renderSubmodule = () => {
    if (functionCode === 'asistente_ia') {
      return <AsistenteIaPage />;
    }
    if (functionCode === 'vision_artificial') {
      return <VisionArtificialPage />;
    }
    if (functionCode === 'demanda_precios') {
      return <DemandaPreciosPage />;
    }
    if (functionCode === 'publicacion_platos') {
      return <PublicacionPlatosPage />;
    }
    return (
      <div className="rounded-xl border p-6 space-y-3" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
        <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--brand-2)' }}>Acceso authorized</p>
        <h1 className="text-3xl font-bold">{iaFunction?.title || 'Función IA'}</h1>
        <p style={{ color: 'var(--muted)' }}>
          Esta función IA fue autorizada por el backend, pero el componente de interfaz no fue localizado.
        </p>
      </div>
    );
  };

  return (
    <section className="space-y-4">
      <ChefOfflineBanner />
      {renderSubmodule()}
    </section>
  );
}
