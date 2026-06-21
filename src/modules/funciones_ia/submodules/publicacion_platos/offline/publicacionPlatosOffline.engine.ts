import type { PublicationAssistRequest, PublicationAssistResponse, PublicationIngredient } from '../types/publicacionPlatos.types';
import {
  loadOfflineIngredientCatalog,
  loadPublicationAssistantDataset,
} from '../../../shared/offline/offline_dataset_loader';
import { normalizeIngredientName, tokenSimilarity } from '../../../shared/offline/offline_text_matcher';
import { normalizeText, roundMoney, unique } from '../../../shared/offline/offline_utils';

export function assistPublicationOffline(request: PublicationAssistRequest, reason = 'Fallback offline'): PublicationAssistResponse {
  const catalog = loadOfflineIngredientCatalog();
  const rawIngredients = request.ingredients || [];
  const ingredients = rawIngredients.map((item) => ({
    ...item,
    name: normalizeIngredientName(item.name, catalog) || item.name,
    quantity: item.quantity || '1',
    unit: item.unit || 'unidad',
  }));
  const dishName = inferDishName(request, ingredients);
  const pattern = pickPublicationPattern(dishName, request.description_preliminary || '', ingredients.map((item) => item.name));
  const category = inferCategory(dishName, ingredients, pattern.category);
  const tags = unique([...pattern.tags, ...ingredients.map((item) => item.name.replace(/\s+/g, '_')), category.replace(/\s+/g, '_')]).slice(0, 12);
  const allergens = inferAllergens(ingredients.map((item) => item.name));
  const suggestedPrice = request.price_preliminary && request.price_preliminary > 0 ? request.price_preliminary : estimatePrice(ingredients, dishName);
  const title = pattern.title_pattern || `${capitalize(dishName)} casero listo para disfrutar`;
  const ingredientText = ingredients.length ? ingredients.map((item) => item.name).slice(0, 5).join(', ') : 'ingredientes caseros seleccionados';
  const shortDescription = pattern.short_description_pattern || `${title} preparado con ${ingredientText}.`;
  const longDescription = buildLongDescription(pattern.long_description_pattern, dishName, ingredientText, request.description_preliminary);

  return {
    success: true,
    engine_used: 'IA local',
    user_explanation: `Modo offline activo: resultado generado localmente en tu navegador. ${reason}`,
    warnings: buildWarnings(request, ingredients),
    quality: {
      overall_confidence: ingredients.length >= 3 && request.dish_name ? 0.82 : 0.68,
      fields_estimated: buildEstimatedFields(request, ingredients),
    },
    generated_publication: {
      title,
      description: longDescription,
      short_description: shortDescription,
      long_description: longDescription,
      tags,
      categories: unique([category, pattern.tone, 'casero']).slice(0, 5),
      allergens,
      keywords: unique([...pattern.keywords, ...tags]).slice(0, 16),
      improvements: pattern.improvements,
      ingredients,
      schedule: inferSchedule(category),
      suggested_price: {
        amount: roundMoney(suggestedPrice),
        currency: 'BOB',
        calculation_summary: `Precio offline estimado con catalogo local, ingredientes cargados y referencias de plato. Rango sugerido aproximado: Bs ${roundMoney(suggestedPrice * 0.9)} - ${roundMoney(suggestedPrice * 1.18)}.`,
      },
    },
    source: 'local',
    offline_ready: true,
    mode: 'fallback',
  };
}

function pickPublicationPattern(dishName: string, description: string, ingredients: string[]) {
  const dataset = loadPublicationAssistantDataset();
  const query = `${dishName} ${description} ${ingredients.join(' ')}`;
  return dataset
    .map((pattern) => ({
      pattern,
      score:
        tokenSimilarity(query, pattern.dish_name) * 6 +
        tokenSimilarity(query, pattern.keywords.join(' ')) * 4 +
        tokenSimilarity(description, `${pattern.tone} ${pattern.audience}`) * 2,
    }))
    .sort((a, b) => b.score - a.score)[0].pattern;
}

function inferDishName(request: PublicationAssistRequest, ingredients: PublicationIngredient[]): string {
  if (request.dish_name?.trim()) return capitalize(request.dish_name.trim());
  const description = normalizeText(request.description_preliminary || '');
  const known = loadPublicationAssistantDataset().find((pattern) => description.includes(normalizeText(pattern.dish_name)));
  if (known) return known.dish_name;
  if (ingredients.length >= 2) return `Plato casero de ${ingredients.slice(0, 2).map((item) => item.name).join(' y ')}`;
  return 'Plato casero especial';
}

function inferCategory(dishName: string, ingredients: PublicationIngredient[], fallback: string): string {
  const text = normalizeText(`${dishName} ${ingredients.map((item) => item.name).join(' ')}`);
  if (text.includes('sopa') || text.includes('caldo')) return 'sopa';
  if (text.includes('pan') || text.includes('sandwich')) return 'comida rapida';
  if (text.includes('avena') || text.includes('desayuno')) return 'desayuno';
  if (text.includes('lechuga') || text.includes('saludable')) return 'saludable';
  return fallback || 'almuerzo';
}

function estimatePrice(ingredients: PublicationIngredient[], dishName: string): number {
  const catalog = loadOfflineIngredientCatalog();
  const base = ingredients.reduce((sum, item) => {
    const catalogItem = catalog.find((catalogEntry) => catalogEntry.name === item.name);
    const userCost = typeof item.cost === 'number' ? item.cost : null;
    return sum + (userCost ?? (catalogItem?.price_bs || 10) * 0.14);
  }, 0);
  const premium = /carne|pescado|charque|milanesa|silpancho/i.test(dishName) ? 1.25 : 1;
  return Math.max(8, base * 1.65 * premium);
}

function buildLongDescription(pattern: string, dishName: string, ingredientText: string, preliminary?: string): string {
  const base = pattern || `${capitalize(dishName)} preparado con ${ingredientText}.`;
  if (!preliminary?.trim()) return base;
  return `${base} Mejorado desde tu idea inicial: ${preliminary.trim()}.`;
}

function inferAllergens(ingredients: string[]): string[] {
  const catalog = loadOfflineIngredientCatalog();
  const allergens = new Set<string>();
  for (const ingredient of ingredients) {
    const item = catalog.find((catalogEntry) => catalogEntry.name === ingredient);
    item?.allergens?.forEach((allergen) => allergens.add(allergen));
  }
  return Array.from(allergens);
}

function buildWarnings(request: PublicationAssistRequest, ingredients: PublicationIngredient[]): string[] {
  const warnings: string[] = [];
  if (!request.dish_name) warnings.push('Nombre del plato estimado localmente.');
  if (!ingredients.length) warnings.push('No se cargaron ingredientes; el texto usa una descripcion general.');
  if (!request.price_preliminary) warnings.push('Precio sugerido estimado con catalogo offline.');
  return warnings;
}

function buildEstimatedFields(request: PublicationAssistRequest, ingredients: PublicationIngredient[]): string[] {
  const fields = ['descripcion', 'etiquetas', 'keywords', 'mejoras'];
  if (!request.dish_name) fields.push('titulo');
  if (!request.price_preliminary) fields.push('precio');
  if (!ingredients.length) fields.push('ingredientes');
  return fields;
}

function inferSchedule(category: string): string {
  if (category === 'desayuno') return '07:00 - 10:30';
  if (category === 'cena') return '18:30 - 21:30';
  if (category === 'merienda' || category === 'comida rapida') return '16:00 - 20:00';
  return '11:00 - 15:00';
}

function capitalize(value: string): string {
  const clean = value.trim();
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : clean;
}
