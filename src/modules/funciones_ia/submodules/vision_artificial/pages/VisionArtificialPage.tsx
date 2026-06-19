import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  detectIngredients 
} from '../services/visionArtificial.service';
import { useAuthSession } from '../../../../gestion_usuarios_acceso_suscripcion/services/auth_session';

type VisionStep = 'selectImage' | 'previewImage' | 'analyzing' | 'confirmingIngredients';

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB

export default function VisionArtificialPage() {
  const navigate = useNavigate();

  // Auth context
  const { user } = useAuthSession() as any;
  const chefId = user?.supabase_user_id || user?.id || 'chef_test_001';

  // State
  const [currentStep, setCurrentStep] = useState<VisionStep>('selectImage');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Data from backend
  const [detectionObservations, setDetectionObservations] = useState('');
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [confirmedIngredients, setConfirmedIngredients] = useState<string[]>([]);

  // Input fields
  const [newIngredientText, setNewIngredientText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setImageFile(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl('');
    }
    setCurrentStep('selectImage');
    setIsLoading(false);
    setErrorMessage('');
    setDetectionObservations('');
    setFallbackUsed(false);
    setConfirmedIngredients([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('');
    const file = e.target.files?.[0];
    if (file) {
      // Validate extension
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setErrorMessage('Formato de archivo no permitido. Usa JPG, JPEG, PNG o WEBP.');
        return;
      }

      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        setErrorMessage('La imagen supera el tamaño permitido de 8MB.');
        return;
      }

      setImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setCurrentStep('previewImage');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setErrorMessage('Formato de archivo no permitido. Usa JPG, JPEG, PNG o WEBP.');
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setErrorMessage('La imagen supera el tamaño permitido de 8MB.');
        return;
      }

      setImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setCurrentStep('previewImage');
    }
  };

  const handleAnalyzeImage = async () => {
    if (!imageFile) return;

    setCurrentStep('analyzing');
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await detectIngredients(imageFile, chefId);
      if (response.success) {
        setConfirmedIngredients(response.ingredientes);
        setDetectionObservations(response.observaciones);
        setFallbackUsed(response.fallback_used);
        setCurrentStep('confirmingIngredients');
      } else {
        setErrorMessage(response.observaciones || 'No pudimos analizar la imagen de manera automática en este momento.');
        setCurrentStep('selectImage');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('No pudimos analizar la imagen de manera automática en este momento.');
      setCurrentStep('selectImage');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateDishes = () => {
    if (confirmedIngredients.length === 0) return;
    navigate('/chef/ai/assistant/use', {
      state: {
        ingredients: confirmedIngredients,
        triggerSearch: true
      }
    });
  };

  const handleAddIngredient = () => {
    const text = newIngredientText.trim().toLowerCase();
    if (text && !confirmedIngredients.includes(text)) {
      setConfirmedIngredients([...confirmedIngredients, text]);
    }
    setNewIngredientText('');
  };

  const handleRemoveIngredient = (ing: string) => {
    setConfirmedIngredients(confirmedIngredients.filter(x => x !== ing));
  };

  const navigateToManualInput = () => {
    setConfirmedIngredients([]);
    setDetectionObservations('');
    setFallbackUsed(false);
    setCurrentStep('confirmingIngredients');
  };

  return (
    <section className="space-y-6 max-w-5xl animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--line)' }}>
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <span>Analizar ingredientes con IA</span>
          </h1>
          <p style={{ color: 'var(--muted)' }} className="text-sm">
            Toma una foto de tus ingredientes para recibir recomendaciones automáticas.
          </p>
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/40 text-red-200 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </span>
          <button
            type="button"
            onClick={navigateToManualInput}
            className="text-xs px-3 py-1.5 rounded-lg font-bold bg-red-500/20 text-red-200 hover:bg-red-500/30 transition-all duration-150 whitespace-nowrap self-end sm:self-auto"
          >
            ✏️ Ingresar ingredientes manualmente
          </button>
        </div>
      )}

      {/* STEP 1: Select Image */}
      {currentStep === 'selectImage' && (
        <div className="flex flex-col items-center justify-center py-10 space-y-6">
          <div className="w-24 h-24 rounded-full flex items-center justify-center bg-[var(--panel)] border border-[var(--line)]">
            <span className="text-4xl text-[var(--brand-2)]">🔍</span>
          </div>

          <div className="text-center space-y-2 max-w-md">
            <h2 className="text-2xl font-black text-white">Reconoce tus ingredientes al instante</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              Sube una imagen de tus verduras, carnes o despensa para que la visión de HomeChef te sugiera qué preparar.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md pt-4">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="flex-1 py-4 px-6 rounded-xl font-bold text-white transition duration-200 hover:opacity-95 text-center flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
            >
              <span>📤</span> Seleccionar imagen de despensa
            </button>
          </div>

          <button
            type="button"
            onClick={navigateToManualInput}
            className="text-sm font-semibold flex items-center gap-1.5 hover:text-white transition duration-150"
            style={{ color: 'var(--brand-2)' }}
          >
            <span>⌨️</span> Ingresar ingredientes de forma manual
          </button>
        </div>
      )}

      {/* STEP 2: Preview Image */}
      {currentStep === 'previewImage' && imagePreviewUrl && (
        <div className="max-w-xl mx-auto space-y-6">
          <h3 className="text-lg font-bold text-white">Imagen seleccionada</h3>
          
          <div className="rounded-xl border overflow-hidden bg-black max-h-[350px] flex items-center justify-center" style={{ borderColor: 'var(--line)' }}>
            <img
              src={imagePreviewUrl}
              alt="Preview"
              className="w-full h-auto max-h-[350px] object-contain"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={reset}
              className="flex-1 py-3.5 rounded-xl border font-bold hover:bg-[var(--panel-soft)] transition duration-200 text-center"
              style={{ borderColor: 'var(--line)' }}
            >
              ✕ Elegir otra foto
            </button>
            <button
              type="button"
              onClick={handleAnalyzeImage}
              className="flex-1 py-3.5 rounded-xl font-bold text-white transition duration-200 hover:opacity-95 text-center flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
            >
              <span>✨</span> Analizar ingredientes
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Analyzing Loader */}
      {currentStep === 'analyzing' && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 rounded-xl border text-center p-6 bg-[var(--panel)]" style={{ borderColor: 'var(--line)' }}>
          <div className="w-12 h-12 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div>
          <div className="space-y-1">
            <h3 className="font-bold text-white text-lg">Analizando...</h3>
            <p className="text-sm px-4" style={{ color: 'var(--muted)' }}>
              Por favor, mantén la página abierta.
            </p>
          </div>
        </div>
      )}

      {/* STEP 4: Confirming Ingredients */}
      {currentStep === 'confirmingIngredients' && (
        <div className="rounded-xl border p-6 space-y-6 max-w-2xl mx-auto bg-[var(--panel)]" style={{ borderColor: 'var(--line)' }}>
          <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--line)' }}>
            <span className="text-green-400 text-xl font-bold">✓</span>
            <h3 className="text-lg font-bold text-white">Ingredientes detectados</h3>
          </div>

          {imagePreviewUrl && (
            <div className="rounded-xl overflow-hidden bg-black max-h-[220px] flex items-center justify-center border" style={{ borderColor: 'var(--line)' }}>
              <img
                src={imagePreviewUrl}
                alt="Imagen analizada"
                className="w-full h-auto max-h-[220px] object-contain"
              />
            </div>
          )}

          <p className="text-xs italic text-[var(--brand-2)] font-semibold uppercase tracking-wider">
            Revisá los ingredientes antes de generar platos.
          </p>

          {detectionObservations && (
            <div className="p-4 rounded-xl text-xs italic bg-[var(--panel-soft)] border" style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}>
              <strong className="block not-italic text-[10px] text-white uppercase tracking-wider mb-1">Nota de la IA:</strong>
              {detectionObservations}
            </div>
          )}

          {/* Add ingredient input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newIngredientText}
              onChange={(e) => setNewIngredientText(e.target.value)}
              placeholder="Ej. papa, cebolla, sal..."
              className="flex-1 rounded-lg border p-2.5 text-sm"
              style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--text)' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddIngredient();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddIngredient}
              className="px-4 py-2.5 rounded-lg bg-[var(--panel-soft)] border font-bold text-white hover:bg-[var(--line)] transition duration-200"
              style={{ borderColor: 'var(--line)' }}
            >
              Agregar
            </button>
          </div>

          {/* Chips container */}
          <div className="flex flex-wrap gap-2 py-2">
            {confirmedIngredients.length === 0 ? (
              <div className="w-full text-center py-6 border border-dashed rounded-lg" style={{ borderColor: 'var(--line)' }}>
                <p className="text-xs italic" style={{ color: 'var(--muted)' }}>
                  No hay ingredientes en la lista. Agrega algunos manualmente.
                </p>
              </div>
            ) : (
              confirmedIngredients.map((ing) => (
                <span
                  key={ing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--brand-2)]/10 text-[var(--brand-2)] border border-[var(--brand-2)]/20"
                >
                  {ing.charAt(0).toUpperCase() + ing.slice(1)}
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(ing)}
                    className="text-[var(--brand-2)] hover:text-red-400 font-bold ml-1 transition duration-150"
                  >
                    ✕
                  </button>
                </span>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 border-t pt-4" style={{ borderColor: 'var(--line)' }}>
            <button
              type="button"
              onClick={reset}
              className="flex-1 py-3 rounded-lg border font-semibold hover:bg-[var(--panel-soft)] transition duration-200"
              style={{ borderColor: 'var(--line)' }}
            >
              Volver a capturar
            </button>
            <button
              type="button"
              onClick={handleGenerateDishes}
              disabled={confirmedIngredients.length === 0 || isLoading}
              className="flex-1 py-3 rounded-lg font-bold text-white transition duration-200 hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Generando platos...</span>
                </>
              ) : (
                <span>Generar platos</span>
              )}
            </button>
          </div>
        </div>
      )}

    </section>
  );
}
