import { useState, useEffect } from 'react';
import { useAuthSession } from '../../../../gestion_usuarios_acceso_suscripcion/services/auth_session';
import { getPricingRecommendation, getPreviewImputation } from '../services/demandaPrecios.service';
import type { ProductionPricingResponse, PreviewImputationResponse, IngredientPriceInput } from '../types/demandaPrecios.types';
import { fetchChefDishes } from '../../../../gestion_cocinero/services/chef_service';

const CITIES = [
  'Santa Cruz', 'Cochabamba', 'La Paz', 'Sucre', 'Tarija', 
  'Oruro', 'Potosí', 'Beni', 'Pando'
];

const WEATHER_TYPES = ['Despejado', 'Nublado', 'Lluvia', 'Caluroso', 'Frío'];
const RISK_LEVELS = ['Bajo', 'Medio', 'Alto'];
const DAYS_OF_WEEK = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

export default function DemandaPreciosPage() {
  const user = useAuthSession((state) => state.user);
  const chefId = user?.id || user?.supabase_user_id || 'anonymous_chef';

  // Form State
  const [dishName, setDishName] = useState('');
  const [city, setCity] = useState('Santa Cruz');
  const [zone, setZone] = useState('');
  const [portionsCapacity, setPortionsCapacity] = useState<number | ''>('');
  
  // Ingredients List
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [knownPrices, setKnownPrices] = useState<IngredientPriceInput[]>([]);
  
  // Ingredient item form
  const [newIngName, setNewIngName] = useState('');
  const [newIngPrice, setNewIngPrice] = useState<number | ''>('');
  const [newIngQty, setNewIngQty] = useState<number | ''>('');
  const [newIngUnit, setNewIngUnit] = useState('unidad');

  // Advanced Options Toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced Options State
  const [competitorAvgPriceBs, setCompetitorAvgPriceBs] = useState<number | ''>('');
  const [historicalOrders, setHistoricalOrders] = useState<number | ''>('');
  const [lastWeekOrders, setLastWeekOrders] = useState<number | ''>('');
  const [cookRating, setCookRating] = useState<number | ''>('');
  const [dayOfWeek, setDayOfWeek] = useState('');
  const [hourOfDay, setHourOfDay] = useState<number | ''>('');
  const [weatherType, setWeatherType] = useState('');
  const [expirationRisk, setExpirationRisk] = useState('');
  const [stockRisk, setStockRisk] = useState('');
  const [currentPriceBs, setCurrentPriceBs] = useState<number | ''>('');

  // Published dishes state
  const [publishedDishes, setPublishedDishes] = useState<any[]>([]);
  const [loadingDishes, setLoadingDishes] = useState(false);
  const [selectedDishId, setSelectedDishId] = useState<string>('');

  useEffect(() => {
    async function loadDishes() {
      setLoadingDishes(true);
      try {
        const res = await fetchChefDishes();
        const items = res?.items || [];
        const active = items.filter((d: any) => {
          const status = (d.status || '').toLowerCase();
          return status === 'published' || status === 'activo' || status === 'active';
        });
        setPublishedDishes(active);
      } catch (err) {
        console.error('Error fetching chef dishes:', err);
      } finally {
        setLoadingDishes(false);
      }
    }
    loadDishes();
  }, []);

  const handleSelectDish = (dish: any) => {
    if (selectedDishId === dish._id) {
      // Deselect
      setSelectedDishId('');
      setDishName('');
      setPortionsCapacity('');
      setCurrentPriceBs('');
      setIngredients([]);
      setKnownPrices([]);
      return;
    }
    
    setSelectedDishId(dish._id || '');
    setDishName(dish.name || '');
    setPortionsCapacity(dish.portions || '');
    setCurrentPriceBs(dish.price || '');
    
    // Process ingredients
    const mappedIngredients: string[] = [];
    if (Array.isArray(dish.ingredients)) {
      dish.ingredients.forEach((ing: any) => {
        const name = (typeof ing === 'string' ? ing : ing.name || '').trim().toLowerCase();
        if (name && !mappedIngredients.includes(name)) {
          mappedIngredients.push(name);
        }
      });
    }
    setIngredients(mappedIngredients);
    setKnownPrices([]);
  };

  // Status & Responses
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [recommendation, setRecommendation] = useState<ProductionPricingResponse | null>(null);
  const [preview, setPreview] = useState<PreviewImputationResponse | null>(null);

  const handleAddIngredient = () => {
    if (!newIngName.trim()) return;
    const nameLower = newIngName.trim().toLowerCase();
    
    // Add to ingredients list if not present
    if (!ingredients.includes(nameLower)) {
      setIngredients([...ingredients, nameLower]);
    }

    // Add to price details if cost is set
    if (newIngPrice !== '' && newIngQty !== '') {
      // Remove any existing price for this ingredient
      const filtered = knownPrices.filter((x) => x.ingredient.toLowerCase() !== nameLower);
      setKnownPrices([
        ...filtered,
        {
          ingredient: nameLower,
          price_bs: Number(newIngPrice),
          quantity: Number(newIngQty),
          unit: newIngUnit
        }
      ]);
    }

    // Reset item form
    setNewIngName('');
    setNewIngPrice('');
    setNewIngQty('');
    setNewIngUnit('unidad');
  };

  const handleRemoveIngredient = (ingName: string) => {
    setIngredients(ingredients.filter((x) => x !== ingName));
    setKnownPrices(knownPrices.filter((x) => x.ingredient !== ingName));
  };

  const buildRequestPayload = () => {
    return {
      dish_name: dishName.trim(),
      city,
      ingredients,
      cook_id: chefId,
      zone: zone.trim() || undefined,
      portions_capacity: portionsCapacity !== '' ? Number(portionsCapacity) : undefined,
      known_ingredient_prices: knownPrices.length > 0 ? knownPrices : undefined,
      competitor_avg_price_bs: competitorAvgPriceBs !== '' ? Number(competitorAvgPriceBs) : undefined,
      historical_orders: historicalOrders !== '' ? Number(historicalOrders) : undefined,
      last_week_orders: lastWeekOrders !== '' ? Number(lastWeekOrders) : undefined,
      cook_rating: cookRating !== '' ? Number(cookRating) : undefined,
      day_of_week: dayOfWeek || undefined,
      hour_of_day: hourOfDay !== '' ? Number(hourOfDay) : undefined,
      weather_type: weatherType || undefined,
      expiration_risk: expirationRisk || undefined,
      stock_risk: stockRisk || undefined,
      current_price_bs: currentPriceBs !== '' ? Number(currentPriceBs) : undefined,
    };
  };

  const handlePreview = async () => {
    if (!dishName.trim()) {
      setError('Por favor, ingresa el nombre del plato.');
      return;
    }
    if (ingredients.length === 0) {
      setError('Por favor, ingresa al menos un ingrediente.');
      return;
    }

    setIsLoading(true);
    setError('');
    setPreview(null);

    try {
      const payload = buildRequestPayload();
      const res = await getPreviewImputation(payload);
      setPreview(res);
    } catch (err: any) {
      console.error(err);
      setError('No se pudo previsualizar la imputación de datos. Intente de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecommend = async () => {
    if (!dishName.trim()) {
      setError('Por favor, ingresa el nombre del plato.');
      return;
    }
    if (ingredients.length === 0) {
      setError('Por favor, ingresa al menos un ingrediente.');
      return;
    }

    setIsLoading(true);
    setError('');
    setRecommendation(null);
    setPreview(null);

    try {
      const payload = buildRequestPayload();
      const res = await getPricingRecommendation(payload);
      setRecommendation(res);
    } catch (err: any) {
      console.error(err);
      setError('No se pudo calcular la recomendación. Revisa los datos de entrada.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setDishName('');
    setCity('Santa Cruz');
    setZone('');
    setPortionsCapacity('');
    setIngredients([]);
    setKnownPrices([]);
    setNewIngName('');
    setNewIngPrice('');
    setNewIngQty('');
    setNewIngUnit('unidad');
    setCompetitorAvgPriceBs('');
    setHistoricalOrders('');
    setLastWeekOrders('');
    setCookRating('');
    setDayOfWeek('');
    setHourOfDay('');
    setWeatherType('');
    setExpirationRisk('');
    setStockRisk('');
    setCurrentPriceBs('');
    setRecommendation(null);
    setPreview(null);
    setError('');
    setSelectedDishId('');
  };

  return (
    <section className="space-y-6 max-w-5xl animate-in fade-in duration-300">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[var(--brand-2)]">
          <span className="text-2xl">📊</span>
          <h1 className="text-3xl font-bold text-white">Demanda y Precios IA</h1>
        </div>
        <p style={{ color: 'var(--muted)' }}>
          Ingresa la información técnica de tu plato y la IA calculará la demanda estimada, cantidad recomendada y precio de venta óptimo.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/40 text-red-200 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Main Layout */}
      {!isLoading && !recommendation && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Inputs Form */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Published Dishes List */}
            {publishedDishes.length > 0 && (
              <div className="rounded-xl border p-6 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  <h2 className="text-lg font-bold text-white">Tus platos publicados</h2>
                </div>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Selecciona uno de tus platos para pre-llenar sus ingredientes y evaluar ajustes de precio.
                </p>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700">
                  {publishedDishes.map((dish) => {
                    const isSelected = selectedDishId === dish._id;
                    return (
                      <div
                        key={dish._id}
                        onClick={() => handleSelectDish(dish)}
                        className={`flex gap-3 p-3 rounded-xl border cursor-pointer shrink-0 transition-all duration-200 select-none ${
                          isSelected ? 'scale-[1.02]' : 'hover:scale-[1.01]'
                        }`}
                        style={{
                          width: '240px',
                          borderColor: isSelected ? 'var(--brand)' : 'var(--line)',
                          backgroundColor: isSelected ? 'var(--panel-soft)' : 'var(--panel)',
                          boxShadow: isSelected ? '0 0 12px var(--brand)' : 'none'
                        }}
                      >
                        <div className="h-14 w-14 rounded-lg overflow-hidden border shrink-0 bg-[var(--panel-soft)] animate-in fade-in duration-300" style={{ borderColor: 'var(--line)' }}>
                          {dish.image_url ? (
                            <img src={dish.image_url} alt={dish.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full grid place-items-center text-xl">🍽️</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 flex flex-col justify-between">
                          <div className="flex items-start justify-between gap-1">
                            <p className="font-semibold text-sm truncate text-white" title={dish.name}>{dish.name}</p>
                            {isSelected && (
                              <span className="text-xs text-[var(--brand-2)] shrink-0 font-bold">✓</span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-green-400">Bs {Number(dish.price || 0).toFixed(2)}</p>
                          <p className="text-[10px]" style={{ color: 'var(--muted)' }}>
                            🍳 {dish.portions || 0} porciones
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-xl border p-6 space-y-5" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
              <h2 className="text-lg font-bold text-white border-b pb-2" style={{ borderColor: 'var(--line)' }}>Datos del Plato</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white">Nombre del plato *</label>
                  <input
                    type="text"
                    required
                    className="w-full rounded-lg border p-2.5 text-sm"
                    style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--text)' }}
                    placeholder="Ej. Majadito batido de pato"
                    value={dishName}
                    onChange={(e) => setDishName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white">Ciudad de venta *</label>
                  <select
                    className="w-full rounded-lg border p-2.5 text-sm"
                    style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--text)' }}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  >
                    {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white">Zona / Barrio (Opcional)</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border p-2.5 text-sm"
                    style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--text)' }}
                    placeholder="Ej. Equipetrol"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white">Capacidad máxima porciones (Opcional)</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-lg border p-2.5 text-sm"
                    style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--text)' }}
                    placeholder="Ej. 20"
                    value={portionsCapacity}
                    onChange={(e) => setPortionsCapacity(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* Ingredients Selection */}
            <div className="rounded-xl border p-6 space-y-5" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
              <h2 className="text-lg font-bold text-white border-b pb-2" style={{ borderColor: 'var(--line)' }}>Ingredientes y Costos</h2>

              {/* Add Ingredient form */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end bg-[var(--panel-soft)] p-4 rounded-lg border" style={{ borderColor: 'var(--line)' }}>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-white">Nombre ingrediente</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border p-2 text-xs"
                    style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)', color: 'var(--text)' }}
                    placeholder="Ej. arroz"
                    value={newIngName}
                    onChange={(e) => setNewIngName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white">Costo (Bs)</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-lg border p-2 text-xs"
                    style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)', color: 'var(--text)' }}
                    placeholder="Ej. 12"
                    value={newIngPrice}
                    onChange={(e) => setNewIngPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white">Cantidad</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-lg border p-2 text-xs"
                    style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)', color: 'var(--text)' }}
                    placeholder="Ej. 1"
                    value={newIngQty}
                    onChange={(e) => setNewIngQty(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white">Unidad</label>
                  <select
                    className="w-full rounded-lg border p-2 text-xs"
                    style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)', color: 'var(--text)' }}
                    value={newIngUnit}
                    onChange={(e) => setNewIngUnit(e.target.value)}
                  >
                    <option value="unidad">unidad</option>
                    <option value="kilo">kilo</option>
                    <option value="litro">litro</option>
                    <option value="gramo">gramo</option>
                    <option value="ml">ml</option>
                  </select>
                </div>
                <div className="sm:col-span-4 pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    className="px-4 py-1.5 rounded bg-[var(--brand)] hover:opacity-90 text-xs font-bold text-white"
                  >
                    + Añadir ingrediente
                  </button>
                </div>
              </div>

              {/* Added list */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-white">Ingredientes cargados ({ingredients.length}):</label>
                {ingredients.length === 0 ? (
                  <p className="text-xs italic" style={{ color: 'var(--muted)' }}>No has cargado ingredientes aún.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {ingredients.map((ing) => {
                      const costDetail = knownPrices.find((x) => x.ingredient === ing);
                      const costLabel = costDetail ? ` (${costDetail.price_bs} Bs)` : '';
                      return (
                        <span
                          key={ing}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border bg-[var(--panel-soft)] text-white"
                          style={{ borderColor: 'var(--line)' }}
                        >
                          {ing}{costLabel}
                          <button
                            type="button"
                            onClick={() => handleRemoveIngredient(ing)}
                            className="text-red-400 hover:text-red-300 font-bold ml-1"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Advanced Configuration Toggle */}
            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm font-semibold hover:underline"
                style={{ color: 'var(--brand-2)' }}
              >
                {showAdvanced ? '« Ocultar configuración avanzada' : '» Mostrar configuración avanzada (Opcional)'}
              </button>
            </div>

            {/* Advanced form */}
            {showAdvanced && (
              <div className="rounded-xl border p-6 space-y-5 animate-in slide-in-from-top-4 duration-300" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
                <h2 className="text-lg font-bold text-white border-b pb-2" style={{ borderColor: 'var(--line)' }}>Configuración de Contexto (Opcional)</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-white">Precio promedio competencia (Bs)</label>
                    <input
                      type="number"
                      className="w-full rounded-lg border p-2 text-xs"
                      style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--text)' }}
                      placeholder="Ej. 22"
                      value={competitorAvgPriceBs}
                      onChange={(e) => setCompetitorAvgPriceBs(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="font-semibold text-white">Pedidos históricos (cant.)</label>
                    <input
                      type="number"
                      className="w-full rounded-lg border p-2 text-xs"
                      style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--text)' }}
                      placeholder="Ej. 150"
                      value={historicalOrders}
                      onChange={(e) => setHistoricalOrders(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-white">Pedidos semana pasada (cant.)</label>
                    <input
                      type="number"
                      className="w-full rounded-lg border p-2 text-xs"
                      style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--text)' }}
                      placeholder="Ej. 25"
                      value={lastWeekOrders}
                      onChange={(e) => setLastWeekOrders(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-white">Calificación cocinero (1.0 - 5.0)</label>
                    <input
                      type="number"
                      step={0.1}
                      min={1}
                      max={5}
                      className="w-full rounded-lg border p-2 text-xs"
                      style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--text)' }}
                      placeholder="Ej. 4.7"
                      value={cookRating}
                      onChange={(e) => setCookRating(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-white">Día de la semana</label>
                    <select
                      className="w-full rounded-lg border p-2 text-xs"
                      style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--text)' }}
                      value={dayOfWeek}
                      onChange={(e) => setDayOfWeek(e.target.value)}
                    >
                      <option value="">(Imputar automáticamente)</option>
                      {DAYS_OF_WEEK.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-white">Hora del día</label>
                    <input
                      type="number"
                      min={0}
                      max={23}
                      className="w-full rounded-lg border p-2 text-xs"
                      style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--text)' }}
                      placeholder="Ej. 12"
                      value={hourOfDay}
                      onChange={(e) => setHourOfDay(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-white">Clima</label>
                    <select
                      className="w-full rounded-lg border p-2 text-xs"
                      style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--text)' }}
                      value={weatherType}
                      onChange={(e) => setWeatherType(e.target.value)}
                    >
                      <option value="">(Imputar automáticamente)</option>
                      {WEATHER_TYPES.map((w) => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-white">Riesgo vencimiento ingrediente</label>
                    <select
                      className="w-full rounded-lg border p-2 text-xs"
                      style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--text)' }}
                      value={expirationRisk}
                      onChange={(e) => setExpirationRisk(e.target.value)}
                    >
                      <option value="">(Imputar automáticamente)</option>
                      {RISK_LEVELS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-white">Riesgo rotura de stock</label>
                    <select
                      className="w-full rounded-lg border p-2 text-xs"
                      style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--text)' }}
                      value={stockRisk}
                      onChange={(e) => setStockRisk(e.target.value)}
                    >
                      <option value="">(Imputar automáticamente)</option>
                      {RISK_LEVELS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-white">Precio de venta actual (Bs)</label>
                    <input
                      type="number"
                      className="w-full rounded-lg border p-2 text-xs"
                      style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)', color: 'var(--text)' }}
                      placeholder="Ej. 25"
                      value={currentPriceBs}
                      onChange={(e) => setCurrentPriceBs(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons & Quick Preview */}
          <div className="space-y-4">
            <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
              <h3 className="font-bold text-white border-b pb-2" style={{ borderColor: 'var(--line)' }}>Acciones</h3>
              
              <button
                type="button"
                onClick={handlePreview}
                className="w-full py-2.5 rounded-lg border text-sm font-semibold hover:bg-[var(--panel-soft)] transition duration-200"
                style={{ borderColor: 'var(--line)' }}
              >
                🔍 Previsualizar Imputación
              </button>

              <button
                type="button"
                onClick={handleRecommend}
                className="w-full py-3 rounded-lg font-bold text-white transition duration-200 hover:opacity-90"
                style={{ background: 'linear-gradient(90deg, var(--brand), var(--brand-2))' }}
              >
                ⚡ Recomendar Producción
              </button>
            </div>

            {/* Preview Imputed list if available */}
            {preview && (
              <div className="rounded-xl border p-5 space-y-3 animate-in fade-in" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[var(--brand-2)] uppercase">Imputaciones sugeridas</h4>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-green-500/10 text-green-300">
                    Calidad: {preview.data_quality}
                  </span>
                </div>
                <div className="space-y-1 text-xs" style={{ color: 'var(--muted)' }}>
                  {preview.imputed_data.length === 0 ? (
                    <p className="italic">No se requirió imputar datos adicionales.</p>
                  ) : (
                    <div className="space-y-2">
                      {preview.imputed_data.map((item, i) => (
                        <div key={i} className="border-b border-[var(--line)] pb-1.5">
                          <p className="font-bold text-white">{item.field}</p>
                          <p>Valor: {String(item.value)} | Confianza: {item.confidence}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 rounded-xl border" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <div className="w-12 h-12 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div>
          <p className="font-bold text-white">Calculando proyecciones con el motor RandomForest...</p>
        </div>
      )}

      {/* Recommendations Output */}
      {!isLoading && recommendation && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Demand Score */}
            <div className="rounded-xl border p-5 space-y-2" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Demanda Estimada</p>
              <h3 className="text-2xl font-bold text-white">{recommendation.estimated_demand}</h3>
              <div className="w-full bg-[var(--panel-soft)] rounded-full h-2">
                <div
                  className="rounded-full h-2"
                  style={{
                    width: `${recommendation.estimated_demand_score * 100}%`,
                    backgroundColor: recommendation.estimated_demand_score > 0.6 ? '#10b981' : '#f59e0b'
                  }}
                />
              </div>
            </div>

            {/* 2. Recommended Plates */}
            <div className="rounded-xl border p-5 space-y-1" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Cantidad recomendada</p>
              <h3 className="text-2xl font-bold text-[var(--brand-2)]">{recommendation.recommended_plates} platos</h3>
              <p className="text-[10px]" style={{ color: 'var(--muted)' }}>Para evitar desperdicios y maximizar ganancia.</p>
            </div>

            {/* 3. Suggested Price */}
            <div className="rounded-xl border p-5 space-y-1" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Precio sugerido</p>
              <h3 className="text-2xl font-bold text-green-400">{recommendation.suggested_price_bs} Bs</h3>
              <p className="text-[10px]" style={{ color: 'var(--muted)' }}>Costo por plato: {recommendation.cost_per_plate_bs} Bs</p>
            </div>

            {/* 4. Estimated Profit */}
            <div className="rounded-xl border p-5 space-y-1" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Margen de ganancia neto</p>
              <h3 className="text-2xl font-bold text-white">{recommendation.estimated_profit_bs.toFixed(1)} Bs</h3>
              <p className="text-[10px]" style={{ color: 'var(--muted)' }}>Ingreso total proyectado: {recommendation.estimated_revenue_bs} Bs</p>
            </div>
          </div>

          {/* Dynamic discount notice */}
          {recommendation.discount_recommended && (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-1">
              <h4 className="text-sm font-bold text-amber-300">💡 Descuento dinámico recomendado</h4>
              <p className="text-xs text-white">
                Se aconseja aplicar un descuento del <strong>{recommendation.dynamic_discount_percent}%</strong> (Precio oferta: <strong>{recommendation.suggested_discount_price_bs} Bs</strong>) si el stock se mantiene alto pasado el horario pico de venta o si el riesgo de vencimiento aumenta ({recommendation.leftover_risk}).
              </p>
            </div>
          )}

          {/* Detail panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {/* Detailed explanations */}
              <div className="rounded-xl border p-6 space-y-4" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
                <h3 className="text-md font-bold text-white border-b pb-2" style={{ borderColor: 'var(--line)' }}>Análisis explicativo</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{recommendation.explanation}</p>
                
                <div className="space-y-3 pt-3">
                  <h4 className="text-xs font-bold text-[var(--brand-2)] uppercase">Factores considerados:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {Object.entries(recommendation.explanations).map(([key, val]) => (
                      <div key={key} className="bg-[var(--panel-soft)] p-3 rounded-lg border" style={{ borderColor: 'var(--line)' }}>
                        <span className="font-semibold text-white block mb-1 uppercase tracking-wide text-[10px]">{key.replace(/_/g, ' ')}</span>
                        {val}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Quality score and models used */}
              <div className="rounded-xl border p-5 space-y-3 text-xs" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
                <h3 className="text-sm font-bold text-white border-b pb-2" style={{ borderColor: 'var(--line)' }}>Auditoría del modelo</h3>
                <p><span className="font-semibold text-white">Método:</span> {recommendation.prediction_method}</p>
                <p><span className="font-semibold text-white">Modelo predictivo:</span> {recommendation.model_used}</p>
                <p><span className="font-semibold text-white">Confianza:</span> {recommendation.confidence}</p>
                <p><span className="font-semibold text-white">Calidad del dato:</span> {recommendation.data_quality}</p>
                {recommendation.missing_data_warnings.length > 0 && (
                  <div className="pt-2">
                    <span className="font-semibold text-amber-300 block mb-1">Advertencias:</span>
                    <ul className="list-disc pl-4 space-y-1 text-amber-200">
                      {recommendation.missing_data_warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              {recommendation.ingredient_price_breakdown.length > 0 && (
                <div className="rounded-xl border p-5 space-y-3 text-xs" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
                  <h3 className="text-sm font-bold text-white border-b pb-2" style={{ borderColor: 'var(--line)' }}>Desglose de Costos</h3>
                  <div className="space-y-2">
                    {recommendation.ingredient_price_breakdown.map((item, i) => (
                      <div key={i} className="flex justify-between border-b pb-1" style={{ borderColor: 'var(--line)' }}>
                        <span className="capitalize">{item.ingredient}</span>
                        <span className="font-semibold text-white">{item.cost_bs} Bs</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-1 font-bold text-white">
                      <span>Costo Ingredientes Total:</span>
                      <span>{recommendation.total_preparation_cost_bs} Bs</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-2.5 rounded-lg border font-semibold hover:bg-[var(--panel-soft)] transition duration-200"
              style={{ borderColor: 'var(--line)' }}
            >
              ← Calcular nuevo plato
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
