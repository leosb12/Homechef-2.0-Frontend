import type {
  ImputationDetail,
  PreviewImputationResponse,
  ProductionPricingRequest,
  ProductionPricingResponse,
} from '../types/demandaPrecios.types';
import {
  loadDemandPricingDataset,
  loadOfflineIngredientCatalog,
} from '../../../shared/offline/offline_dataset_loader';
import { normalizeIngredientName, tokenSimilarity } from '../../../shared/offline/offline_text_matcher';
import { clamp, normalizeText, roundMoney } from '../../../shared/offline/offline_utils';
import type { IngredientCatalogItem } from '../../../shared/offline/offline_types';

interface IngredientCostBreakdown {
  ingredient: string;
  category: string;
  unit: string;
  unit_price_bs: number;
  quantity: number;
  quantity_per_portion: number;
  portions: number;
  cost_bs: number;
  cost_per_portion_bs: number;
  imputed: boolean;
  source: string;
}

interface PricingAnalysis {
  portions: number;
  usedUserData: string[];
  imputedData: ImputationDetail[];
  warnings: string[];
  ingredientBreakdown: IngredientCostBreakdown[];
  totalIngredientCost: number;
  costPerPortion: number;
  day: string;
  hour: number;
  dishCategory: string;
  complexity: 'simple' | 'normal' | 'elaborado';
  demandScore: number;
  demandLevel: 'baja' | 'media' | 'alta';
  demandExplanation: string;
  operationalCostPerPortion: number;
  baseMarginRate: number;
  minPrice: number;
  suggestedPrice: number;
  maxPrice: number;
  profitPerPortion: number;
  marginPercent: number;
  recommendedPlates: number;
  discountPercent: number;
  discountRecommended: boolean;
  dataQuality: string;
}

export function previewPricingOffline(request: ProductionPricingRequest): PreviewImputationResponse {
  const analysis = analyzePricingInput(request);
  return {
    completed_input: {
      ...request,
      city: request.city || 'Santa Cruz',
      portions_capacity: analysis.portions,
      day_of_week: analysis.day,
      hour_of_day: analysis.hour,
      estimated_cost_bs: roundMoney(analysis.totalIngredientCost),
      cost_per_portion_bs: roundMoney(analysis.costPerPortion),
      operational_cost_per_portion_bs: roundMoney(analysis.operationalCostPerPortion),
      suggested_price_bs: roundMoney(analysis.suggestedPrice),
    },
    used_user_data: analysis.usedUserData,
    imputed_data: analysis.imputedData,
    data_quality: analysis.dataQuality,
    warnings: analysis.warnings,
    source: 'local',
    offline_ready: true,
    mode: 'fallback',
  };
}

export function recommendPricingOffline(request: ProductionPricingRequest, reason = 'Fallback offline'): ProductionPricingResponse {
  const analysis = analyzePricingInput(request);
  const estimatedRevenue = roundMoney(analysis.suggestedPrice * analysis.recommendedPlates);
  const totalRecommendedCost = roundMoney((analysis.costPerPortion + analysis.operationalCostPerPortion) * analysis.recommendedPlates);
  const estimatedProfit = roundMoney(analysis.profitPerPortion * analysis.recommendedPlates);

  return {
    dish_name: request.dish_name || 'Plato sin nombre',
    city: request.city || 'Santa Cruz',
    estimated_demand_score: roundMoney(analysis.demandScore),
    recommended_portions: analysis.recommendedPlates,
    suggested_price_bs: roundMoney(analysis.suggestedPrice),
    dynamic_discount_percent: analysis.discountPercent,
    estimated_revenue_bs: estimatedRevenue,
    estimated_cost_bs: totalRecommendedCost,
    estimated_profit_bs: estimatedProfit,
    cost_per_portion_bs: roundMoney(analysis.costPerPortion),
    total_portions_cost_bs: roundMoney(analysis.totalIngredientCost),
    ingredient_quantity_recommendations: analysis.ingredientBreakdown.map((item) => ({
      ingredient: item.ingredient,
      recommended_quantity: roundMoney(item.quantity),
      quantity_per_portion: roundMoney(item.quantity_per_portion),
      unit: item.unit,
      reason: item.imputed ? 'Cantidad/costo estimado por catalogo offline.' : 'Dato de costo ingresado por el cocinero.',
    })),
    confidence: analysis.dataQuality,
    explanation: [
      `Modo offline local activado: ${reason}`,
      `Se sumo un costo de ingredientes de Bs ${formatBs(analysis.totalIngredientCost)} para ${analysis.portions} porciones.`,
      `Costo por porcion Bs ${formatBs(analysis.costPerPortion)} + costo operativo Bs ${formatBs(analysis.operationalCostPerPortion)}.`,
      `Precio sugerido Bs ${formatBs(analysis.suggestedPrice)} con margen estimado ${analysis.marginPercent.toFixed(0)}%.`,
      analysis.demandExplanation,
      analysis.discountRecommended ? `Se recomienda descuento del ${analysis.discountPercent}% por riesgo de desperdicio, urgencia o demanda baja.` : 'No se recomienda descuento inmediato.',
    ].join(' '),
    model_used: 'browser_offline_pricing_rules_v2',
    prediction_method: 'Costeo local decimal + demanda ponderada + margen rentable minimo',
    currency: 'BOB',
    data_quality: analysis.dataQuality,
    used_user_data: analysis.usedUserData,
    imputed_data: analysis.imputedData,
    ingredient_price_breakdown: analysis.ingredientBreakdown.map((item) => ({
      ingredient: item.ingredient,
      category: item.category,
      unit: item.unit,
      unit_price_bs: roundMoney(item.unit_price_bs),
      quantity: roundMoney(item.quantity),
      quantity_per_portion: roundMoney(item.quantity_per_portion),
      cost_bs: roundMoney(item.cost_bs),
      cost_per_portion_bs: roundMoney(item.cost_per_portion_bs),
      source: item.source,
      imputed: item.imputed,
    })),
    missing_data_warnings: analysis.warnings,
    estimated_demand: analysis.demandLevel,
    recommended_plates: analysis.recommendedPlates,
    cost_per_plate_bs: roundMoney(analysis.costPerPortion),
    total_preparation_cost_bs: roundMoney(analysis.totalIngredientCost),
    suggested_sale_price_bs: roundMoney(analysis.suggestedPrice),
    price_min_bs: roundMoney(analysis.minPrice),
    price_max_bs: roundMoney(analysis.maxPrice),
    ingredient_total_cost_bs: roundMoney(analysis.totalIngredientCost),
    operational_cost_per_plate_bs: roundMoney(analysis.operationalCostPerPortion),
    profit_per_plate_bs: roundMoney(analysis.profitPerPortion),
    margin_percent: roundMoney(analysis.marginPercent),
    margin_estimated: Math.round(analysis.marginPercent),
    leftover_risk: analysis.discountRecommended ? 'alto' : analysis.demandLevel === 'alta' ? 'bajo' : 'medio',
    discount_recommended: analysis.discountRecommended,
    suggested_discount_price_bs: roundMoney(analysis.suggestedPrice * (1 - analysis.discountPercent / 100)),
    explanations: {
      costos: `Costo ingredientes total: Bs ${formatBs(analysis.totalIngredientCost)}. Costo por porcion: Bs ${formatBs(analysis.costPerPortion)}. No se redondea a entero durante el calculo.`,
      operacion: `Costo operativo estimado por porcion: Bs ${formatBs(analysis.operationalCostPerPortion)} por gas, luz, empaque y tiempo.`,
      demanda: analysis.demandExplanation,
      precios: `Rango local sugerido: minimo Bs ${formatBs(analysis.minPrice)}, sugerido Bs ${formatBs(analysis.suggestedPrice)}, maximo Bs ${formatBs(analysis.maxPrice)}.`,
      margen: `Ganancia estimada por porcion: Bs ${formatBs(analysis.profitPerPortion)}. Margen sobre precio: ${analysis.marginPercent.toFixed(0)}%.`,
      descuento: analysis.discountRecommended ? 'Aplicar descuento si queda stock alto o hay vencimiento cercano.' : 'Mantener precio sugerido y revisar stock al final del turno.',
    },
    source: 'local',
    offline_ready: true,
    mode: 'fallback',
  };
}

function analyzePricingInput(request: ProductionPricingRequest): PricingAnalysis {
  const catalog = loadOfflineIngredientCatalog();
  const portions = resolvePortions(request);
  const dishCategory = inferDishCategory(request);
  const complexity = inferComplexity(request, dishCategory);
  const warnings: string[] = [];
  const usedUserData: string[] = [];
  const imputedData: ImputationDetail[] = [];

  if (!request.portions_capacity || Number(request.portions_capacity) <= 0) {
    warnings.push(`No se ingresaron porciones validas; se uso ${portions} como default local.`);
    imputedData.push({ field: 'porciones', source: 'regla_offline_por_categoria', value: portions, confidence: 'media' });
  }

  const ingredients = request.ingredients?.length ? request.ingredients : inferIngredientsFromDishName(request.dish_name);
  if (!request.ingredients?.length) {
    warnings.push('No se ingresaron ingredientes; se infirieron ingredientes base desde el nombre del plato.');
  }

  const breakdown = ingredients.map((raw) => estimateIngredientCost(raw, portions, request, catalog, usedUserData, imputedData, warnings));
  let totalIngredientCost = breakdown.reduce((sum, item) => sum + item.cost_bs, 0);

  if (totalIngredientCost <= 0 && ingredients.length > 0) {
    totalIngredientCost = ingredients.length * portions * 0.75;
    warnings.push('El costo local resulto insuficiente; se aplico un minimo tecnico por ingrediente para evitar precio cero.');
  }

  const costPerPortion = safeDivide(totalIngredientCost, portions);
  const { demandScore, demandLevel, demandExplanation } = estimateDemand(request, dishCategory, costPerPortion);
  const operationalCostPerPortion = estimateOperationalCost(dishCategory, complexity, portions);
  const baseMarginRate = estimateMarginRate(request, dishCategory, complexity, demandLevel);
  const demandFactor = demandLevel === 'alta' ? 1.14 : demandLevel === 'media' ? 1.03 : 0.94;
  const localMinimum = minimumPreparedPrice(dishCategory, ingredients, complexity);
  const profitableMinimum = costPerPortion + operationalCostPerPortion + Math.max(1, costPerPortion * 0.35);
  const formulaPrice = (costPerPortion * (1 + baseMarginRate) + operationalCostPerPortion) * demandFactor;
  let suggestedPrice = Math.max(formulaPrice, localMinimum, profitableMinimum);
  let minPrice = Math.max(localMinimum * 0.9, costPerPortion + operationalCostPerPortion + Math.max(0.6, costPerPortion * 0.25));
  let maxPrice = Math.max(suggestedPrice * 1.18, suggestedPrice + 2, costPerPortion + operationalCostPerPortion + Math.max(2, costPerPortion * 0.8));

  if (suggestedPrice < costPerPortion + operationalCostPerPortion) {
    warnings.push('El precio sugerido no cubria costos; se ajusto al minimo rentable.');
    suggestedPrice = costPerPortion + operationalCostPerPortion + Math.max(1, costPerPortion * 0.35);
  }

  minPrice = Math.min(minPrice, suggestedPrice);
  maxPrice = Math.max(maxPrice, suggestedPrice);
  const profitPerPortion = suggestedPrice - costPerPortion - operationalCostPerPortion;
  const marginPercent = suggestedPrice > 0 ? Math.max(0, (profitPerPortion / suggestedPrice) * 100) : baseMarginRate * 100;
  const recommendedPlates = estimateRecommendedPlates(request, demandLevel, portions, complexity);
  const discountRecommended = shouldDiscount(request, demandLevel);
  const discountPercent = discountRecommended ? (demandLevel === 'baja' ? 12 : 10) : 0;
  const dataQuality = resolveDataQuality(request, breakdown);

  if (!request.known_ingredient_prices?.length) {
    warnings.push('No se ingresaron costos conocidos; se usaron costos locales estimados.');
  }

  return {
    portions,
    usedUserData,
    imputedData,
    warnings,
    ingredientBreakdown: breakdown,
    totalIngredientCost,
    costPerPortion,
    day: request.day_of_week || currentDay(),
    hour: request.hour_of_day ?? new Date().getHours(),
    dishCategory,
    complexity,
    demandScore,
    demandLevel,
    demandExplanation,
    operationalCostPerPortion,
    baseMarginRate,
    minPrice,
    suggestedPrice,
    maxPrice,
    profitPerPortion,
    marginPercent,
    recommendedPlates,
    discountPercent,
    discountRecommended,
    dataQuality,
  };
}

function estimateIngredientCost(
  raw: string,
  portions: number,
  request: ProductionPricingRequest,
  catalog: IngredientCatalogItem[],
  usedUserData: string[],
  imputedData: ImputationDetail[],
  warnings: string[],
): IngredientCostBreakdown {
  const ingredient = normalizeIngredientName(raw, catalog);
  const known = request.known_ingredient_prices?.find((item) => normalizeIngredientName(item.ingredient, catalog) === ingredient);
  const catalogItem = catalog.find((item) => item.name === ingredient) || estimateCatalogByCategory(ingredient);
  const category = catalogItem.category;

  if (!catalog.some((item) => item.name === ingredient)) {
    warnings.push(`No se encontro costo exacto para ${raw}; se uso estimacion por categoria ${category}.`);
    imputedData.push({ field: `categoria_${ingredient}`, source: 'estimacion_por_categoria', value: category, confidence: 'baja' });
  }

  if (known && Number(known.price_bs) > 0) {
    const quantity = Math.max(1, Number(known.quantity || 1));
    const unitPrice = Number(known.price_bs);
    const cost = unitPrice * quantity;
    usedUserData.push(`costo_${ingredient}`);
    return {
      ingredient,
      category,
      unit: known.unit || catalogItem.unit,
      unit_price_bs: unitPrice,
      quantity,
      quantity_per_portion: safeDivide(quantity, portions),
      portions,
      cost_bs: cost,
      cost_per_portion_bs: safeDivide(cost, portions),
      imputed: false,
      source: 'usuario',
    };
  }

  const quantityPerPortion = standardQuantityPerPortion(catalogItem);
  const quantity = quantityPerPortion * portions;
  const cost = catalogItem.price_bs * quantity;
  imputedData.push({
    field: `costo_${ingredient}`,
    source: 'catalogo_offline_bolivia',
    value: roundMoney(cost),
    confidence: catalog.some((item) => item.name === ingredient) ? 'media' : 'baja',
  });
  warnings.push(`Costo de ${ingredient} estimado localmente con ${roundMoney(quantity)} ${catalogItem.unit}.`);
  return {
    ingredient,
    category,
    unit: catalogItem.unit,
    unit_price_bs: catalogItem.price_bs,
    quantity,
    quantity_per_portion: quantityPerPortion,
    portions,
    cost_bs: cost,
    cost_per_portion_bs: safeDivide(cost, portions),
    imputed: true,
    source: 'catalogo_offline_bolivia',
  };
}

function resolvePortions(request: ProductionPricingRequest): number {
  const explicit = Number(request.portions_capacity);
  if (Number.isFinite(explicit) && explicit > 0) return Math.max(1, explicit);
  const category = inferDishCategory(request);
  if (category === 'bebida') return 4;
  if (category === 'acompanamiento' || category === 'desayuno') return 3;
  return 4;
}

function inferDishCategory(request: ProductionPricingRequest): string {
  const text = normalizeText(`${request.dish_name} ${(request.ingredients || []).join(' ')}`);
  if (/limonada|jugo|refresco|bebida|agua/.test(text)) return 'bebida';
  if (/sandwich|hamburguesa|empanada|saltena|snack|pan/.test(text)) return 'comida rapida';
  if (/sopa|caldo|locro/.test(text)) return 'sopa';
  if (/desayuno|avena|tortilla|huevo/.test(text)) return 'desayuno';
  if (/ensalada|saludable|lechuga/.test(text)) return 'saludable';
  if (/arroz|papa|yuca|queso|choclo/.test(text) && !/pollo|carne|cerdo|pescado/.test(text)) return 'acompanamiento';
  return 'plato completo';
}

function inferComplexity(request: ProductionPricingRequest, category: string): 'simple' | 'normal' | 'elaborado' {
  const text = normalizeText(`${request.dish_name} ${(request.ingredients || []).join(' ')}`);
  if (category === 'bebida' || category === 'desayuno' || /simple|rapido|limonada/.test(text)) return 'simple';
  if (/milanesa|silpancho|pique|charque|horneado|relleno/.test(text)) return 'elaborado';
  return 'normal';
}

function standardQuantityPerPortion(item: IngredientCatalogItem): number {
  if (item.name === 'limon') return 0.5;
  if (item.name === 'agua') return 0.25;
  if (item.name === 'azucar') return 0.025;
  if (item.name === 'huevo') return 1;
  if (item.name === 'pan') return 1;
  if (item.name === 'atun') return 0.5;
  if (item.unit === 'unidad') {
    if (item.category === 'verdura') return 0.25;
    return 1;
  }
  if (item.unit === 'litro') {
    if (item.category === 'grasa') return 0.025;
    if (item.category === 'lacteo') return 0.08;
    if (item.category === 'bebida') return 0.25;
    return 0.06;
  }
  if (item.category === 'proteina') return 0.18;
  if (item.category === 'lacteo') return 0.045;
  if (item.category === 'grano' || item.category === 'cereal') return 0.09;
  if (item.category === 'legumbre') return 0.08;
  if (item.category === 'tuberculo') return 0.16;
  if (item.category === 'verdura' || item.category === 'fruta') return 0.07;
  if (item.category === 'condimento') return 0.006;
  if (item.category === 'endulzante') return 0.025;
  return 0.08;
}

function estimateCatalogByCategory(ingredient: string): IngredientCatalogItem {
  const text = normalizeText(ingredient);
  if (/pollo|carne|res|cerdo|pescado|proteina/.test(text)) {
    return { name: ingredient, aliases: [], category: 'proteina', unit: 'kg', price_bs: 28, perishable: true };
  }
  if (/queso|leche|crema|yogur|lacteo/.test(text)) {
    return { name: ingredient, aliases: [], category: 'lacteo', unit: 'kg', price_bs: 24, perishable: true };
  }
  if (/arroz|fideo|pasta|harina|pan|avena|cereal/.test(text)) {
    return { name: ingredient, aliases: [], category: 'cereal', unit: 'kg', price_bs: 10, perishable: false };
  }
  if (/papa|yuca|camote/.test(text)) {
    return { name: ingredient, aliases: [], category: 'tuberculo', unit: 'kg', price_bs: 7, perishable: true };
  }
  if (/tomate|cebolla|lechuga|verdura|zanahoria|pepino/.test(text)) {
    return { name: ingredient, aliases: [], category: 'verdura', unit: 'kg', price_bs: 8, perishable: true };
  }
  if (/sal|aji|condimento|pimienta|oregano|comino/.test(text)) {
    return { name: ingredient, aliases: [], category: 'condimento', unit: 'kg', price_bs: 40, perishable: false };
  }
  return { name: ingredient, aliases: [], category: 'otro', unit: 'kg', price_bs: 12, perishable: false };
}

function estimateDemand(request: ProductionPricingRequest, dishCategory: string, costPerPortion: number) {
  const scenario = pickScenario(request);
  const day = normalizeText(request.day_of_week || currentDay());
  const hour = request.hour_of_day ?? new Date().getHours();
  const weather = normalizeText(request.weather_type || '');
  let score = scenario?.demand_score ?? 0.5;
  const reasons: string[] = [];

  if (hour >= 11 && hour <= 14) {
    score += 0.15;
    reasons.push('horario de almuerzo');
  } else if (hour >= 18 && hour <= 21) {
    score += 0.1;
    reasons.push('horario de cena');
  } else if (dishCategory === 'bebida' && hour >= 10 && hour <= 18) {
    score += 0.08;
    reasons.push('bebida vendible durante el dia');
  }

  if (day === 'sabado' || day === 'domingo' || day === 'viernes') {
    score += 0.08;
    reasons.push('dia con mayor movimiento');
  }
  if (['plato completo', 'comida rapida'].includes(dishCategory)) score += 0.05;
  if (dishCategory === 'bebida' && /caluroso|despejado/.test(weather)) {
    score += 0.12;
    reasons.push('clima favorable para bebidas');
  }
  if (/lluvia|lluvioso/.test(weather) && dishCategory === 'bebida') score -= 0.08;
  if ((request.historical_orders || 0) > 40) {
    score += 0.08;
    reasons.push('buen historial de pedidos');
  }
  if ((request.last_week_orders || 0) > 15) {
    score += 0.06;
    reasons.push('ventas recientes positivas');
  }
  if (costPerPortion > 18) score -= 0.04;

  score = clamp(score, 0.15, 0.95);
  const demandLevel = score >= 0.68 ? 'alta' : score >= 0.45 ? 'media' : 'baja';
  const explanation = `Demanda ${demandLevel} (${score.toFixed(2)}) porque considera ${reasons.length ? reasons.join(', ') : 'tipo de plato, ciudad, horario y precio local'}.`;
  return { demandScore: score, demandLevel, demandExplanation: explanation };
}

function pickScenario(request: ProductionPricingRequest) {
  const dataset = loadDemandPricingDataset();
  const dish = normalizeText(request.dish_name);
  const city = normalizeText(request.city || 'Santa Cruz');
  const day = normalizeText(request.day_of_week || '');
  const hour = request.hour_of_day ?? new Date().getHours();
  const segment = hour < 10 ? 'desayuno' : hour < 16 ? 'almuerzo' : hour < 19 ? 'tarde' : 'cena';
  return dataset
    .map((scenario) => ({
      scenario,
      score:
        tokenSimilarity(dish, scenario.dish_name) * 6 +
        (normalizeText(scenario.city) === city ? 2 : 0) +
        (day && normalizeText(scenario.day_of_week) === day ? 1 : 0) +
        (scenario.hour_segment === segment ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score)[0]?.scenario;
}

function estimateOperationalCost(category: string, complexity: string, portions: number): number {
  const baseByCategory: Record<string, number> = {
    bebida: 1.1,
    acompanamiento: 1.4,
    desayuno: 1.3,
    saludable: 1.8,
    sopa: 2.2,
    'comida rapida': 2,
    'plato completo': 2.8,
  };
  const complexityExtra = complexity === 'elaborado' ? 1.2 : complexity === 'normal' ? 0.6 : 0;
  const scaleDiscount = portions >= 8 ? -0.4 : portions >= 4 ? -0.2 : 0;
  return Math.max(1, (baseByCategory[category] || 2) + complexityExtra + scaleDiscount);
}

function estimateMarginRate(request: ProductionPricingRequest, category: string, complexity: string, demand: string): number {
  let rate = category === 'bebida' || category === 'acompanamiento' ? 0.42 : category === 'comida rapida' ? 0.6 : 0.55;
  if (complexity === 'elaborado') rate += 0.2;
  if (demand === 'alta') rate += 0.15;
  if (demand === 'baja') rate -= 0.08;
  if (request.competitor_avg_price_bs && request.current_price_bs && request.current_price_bs < request.competitor_avg_price_bs) rate += 0.05;
  return clamp(rate, 0.35, 1.0);
}

function minimumPreparedPrice(category: string, ingredients: string[], complexity: string): number {
  const hasProtein = ingredients.some((ingredient) => /pollo|carne|res|cerdo|pescado|charque/.test(normalizeText(ingredient)));
  if (category === 'bebida') return 3;
  if (category === 'acompanamiento' || category === 'desayuno') return 5;
  if (hasProtein) return complexity === 'elaborado' ? 18 : 15;
  if (category === 'plato completo') return 12;
  return 8;
}

function estimateRecommendedPlates(request: ProductionPricingRequest, demand: string, portions: number, complexity: string): number {
  const targetByDemand = demand === 'alta' ? 14 : demand === 'media' ? 8 : 4;
  const historicalBoost = (request.historical_orders || 0) > 40 ? 2 : 0;
  const recentBoost = (request.last_week_orders || 0) > 15 ? 2 : 0;
  const complexityPenalty = complexity === 'elaborado' ? -2 : 0;
  const expirationBoost = normalizeText(request.expiration_risk || '') === 'alto' ? 2 : 0;
  const recommended = Math.round(targetByDemand + historicalBoost + recentBoost + complexityPenalty + expirationBoost);
  const upperBound = portions > 0 ? Math.max(portions, demand === 'alta' ? 20 : demand === 'media' ? 12 : 6) : 20;
  return Math.max(1, Math.min(upperBound, recommended));
}

function resolveDataQuality(request: ProductionPricingRequest, breakdown: IngredientCostBreakdown[]): string {
  if (!breakdown.length) return 'baja';
  const knownCount = breakdown.filter((item) => !item.imputed).length;
  const ratio = knownCount / breakdown.length;
  if (ratio >= 0.7) return 'alta';
  if (ratio > 0 || breakdown.every((item) => item.source === 'catalogo_offline_bolivia')) return 'media';
  return 'baja';
}

function inferIngredientsFromDishName(dishName: string): string[] {
  const text = normalizeText(dishName);
  if (text.includes('limonada')) return ['limon', 'azucar', 'agua'];
  if (text.includes('arroz con pollo')) return ['arroz', 'pollo', 'cebolla', 'tomate', 'aceite'];
  if (text.includes('milanesa')) return ['pollo', 'pan molido', 'huevo', 'harina', 'aceite'];
  if (text.includes('arroz con queso')) return ['arroz', 'queso', 'leche'];
  return ['ingrediente base'];
}

function shouldDiscount(request: ProductionPricingRequest, estimatedDemand: string): boolean {
  const expiration = normalizeText(request.expiration_risk || '');
  const stock = normalizeText(request.stock_risk || '');
  return estimatedDemand === 'baja' || expiration === 'alto' || stock === 'alto';
}

function safeDivide(value: number, divisor: number): number {
  return divisor > 0 ? value / divisor : value;
}

function currentDay(): string {
  return ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][new Date().getDay()];
}

function formatBs(value: number): string {
  return roundMoney(value).toFixed(2);
}
