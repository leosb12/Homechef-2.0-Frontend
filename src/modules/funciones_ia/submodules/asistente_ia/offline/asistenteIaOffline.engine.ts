import type { RecipeSuggestRequest, RecipeSuggestResponse, RecipeSuggestionItem } from '../types/asistenteIa.types';
import { loadCookingAssistantDataset, loadOfflineIngredientCatalog } from '../../../shared/offline/offline_dataset_loader';
import { detectIngredientsFromText, normalizeIngredientList, tokenSimilarity, weightedIngredientScore } from '../../../shared/offline/offline_text_matcher';
import { normalizeText, unique } from '../../../shared/offline/offline_utils';

export function suggestRecipesOffline(request: RecipeSuggestRequest, reason = 'Fallback offline'): RecipeSuggestResponse {
  const catalog = loadOfflineIngredientCatalog();
  const promptIngredients = detectIngredientsFromText(request.prompt || '', catalog);
  const inputIngredients = normalizeIngredientList([...(request.ingredients || []), ...promptIngredients], catalog);
  const preferences = [...(request.preferences || []), ...detectPreferences(request.prompt || '')];
  const desiredTime = request.available_time_minutes || extractMinutes(request.prompt || '');
  const dataset = loadCookingAssistantDataset();

  if (!inputIngredients.length && !normalizeText(request.prompt)) {
    return {
      chef_id: request.chef_id,
      feature: 'recipe_suggestion',
      provider: 'IA local navegador',
      model: 'browser_offline_cooking_rules_v1',
      fallback_used: true,
      fallback_reason: reason,
      source: 'local',
      offline_ready: true,
      mode: 'fallback',
      interpreted_request: {
        raw_prompt: request.prompt,
        detected_ingredients: [],
        detected_preferences: preferences,
        detected_portions: request.portions,
        detected_time_minutes: desiredTime,
        detected_dietary_restrictions: request.dietary_restrictions || [],
        user_intent: 'ayuda',
        userIntent: 'ayuda',
      },
      suggestions: [buildHelpSuggestion()],
    };
  }

  const prompt = normalizeText([request.prompt || '', preferences.join(' ')].join(' '));
  const scored = dataset
    .map((recipe) => {
      const ingredientScore = weightedIngredientScore(inputIngredients, recipe.ingredients_used);
      const textScore = tokenSimilarity(prompt, `${recipe.description} ${recipe.tags.join(' ')} ${recipe.context}`);
      const timeScore = desiredTime ? Math.max(0, 1 - Math.max(0, recipe.preparation_time_minutes - desiredTime) / 60) * 4 : 0;
      const preferenceScore = preferences.reduce((acc, pref) => acc + (recipe.tags.some((tag) => normalizeText(tag).includes(pref)) ? 3 : 0), 0);
      return { recipe, score: ingredientScore + textScore * 8 + timeScore + preferenceScore };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const suggestions: RecipeSuggestionItem[] = (scored.length ? scored : buildFallbackScored(inputIngredients)).map(({ recipe }) => {
    const matched = recipe.ingredients_used.filter((ingredient) =>
      inputIngredients.some((input) => ingredient === input || ingredient.includes(input) || input.includes(ingredient)),
    );
    return {
      dish_name: recipe.dish_name,
      description: recipe.description,
      ingredients_used: matched.length ? matched : recipe.ingredients_used.slice(0, Math.max(1, inputIngredients.length || 2)),
      optional_extra_ingredients: recipe.optional_extra_ingredients,
      estimated_portions: request.portions || recipe.estimated_portions,
      preparation_time_minutes: desiredTime ? Math.min(recipe.preparation_time_minutes, Math.max(desiredTime + 10, recipe.preparation_time_minutes)) : recipe.preparation_time_minutes,
      difficulty: recipe.difficulty,
      category: recipe.category,
      tags: recipe.tags,
      selling_points: recipe.selling_points,
      preparation_steps: recipe.preparation_steps,
      cooking_tips: recipe.cooking_tips,
      presentation_suggestion: recipe.presentation_suggestion,
      storage_recommendation: recipe.storage_recommendation,
      possible_allergens: recipe.possible_allergens,
      recommended_substitutions: buildSubstitutions(recipe.ingredients_used, inputIngredients),
      ingredient_usage_level: recipe.ingredient_usage_level,
      homechef_sales_recommendation: recipe.homechef_sales_recommendation,
      imageUrl: undefined,
    };
  });

  return {
    chef_id: request.chef_id,
    feature: 'recipe_suggestion',
    provider: 'IA local navegador',
    model: 'browser_offline_cooking_rules_v1',
    fallback_used: true,
    fallback_reason: reason,
    source: 'local',
    offline_ready: true,
    mode: 'fallback',
    interpreted_request: {
      raw_prompt: request.prompt,
      detected_ingredients: inputIngredients,
      detected_preferences: preferences,
      detected_portions: request.portions,
      detected_time_minutes: desiredTime,
      detected_dietary_restrictions: request.dietary_restrictions || [],
      user_intent: inferIntent(prompt, preferences),
      userIntent: inferIntent(prompt, preferences),
    },
    suggestions,
  };
}

function detectPreferences(prompt: string): string[] {
  const text = normalizeText(prompt);
  const prefs = ['rapido', 'economico', 'barato', 'familiar', 'saludable', 'boliviano', 'desayuno', 'almuerzo', 'cena', 'sobras', 'venta'];
  return prefs.filter((pref) => text.includes(pref));
}

function extractMinutes(prompt: string): number | undefined {
  const match = normalizeText(prompt).match(/(\d+)\s*(min|minutos)/);
  return match ? Number(match[1]) : undefined;
}

function inferIntent(prompt: string, preferences: string[]): string {
  if (preferences.includes('venta')) return 'vender';
  if (preferences.includes('sobras')) return 'aprovechar sobras';
  if (preferences.includes('rapido')) return 'receta rapida';
  if (preferences.includes('economico') || preferences.includes('barato')) return 'receta economica';
  if (preferences.includes('saludable')) return 'receta saludable';
  return prompt ? 'recomendacion culinaria' : 'recomendacion por ingredientes';
}

function buildSubstitutions(recipeIngredients: string[], inputIngredients: string[]) {
  const missing = recipeIngredients.filter((ingredient) => !inputIngredients.includes(ingredient)).slice(0, 3);
  return missing.map((ingredient) => ({
    original: ingredient,
    substitute: inferSubstitute(ingredient, inputIngredients),
    reason: 'Sustitucion local estimada segun categoria y disponibilidad ingresada.',
  }));
}

function inferSubstitute(ingredient: string, inputIngredients: string[]): string {
  const proteins = ['pollo', 'carne de res', 'cerdo', 'huevo', 'atun'];
  const grains = ['arroz', 'fideo', 'quinua', 'pan'];
  if (proteins.includes(ingredient)) return inputIngredients.find((item) => proteins.includes(item)) || 'huevo';
  if (grains.includes(ingredient)) return inputIngredients.find((item) => grains.includes(item)) || 'arroz';
  return inputIngredients[0] || 'ingrediente disponible';
}

function buildFallbackScored(inputIngredients: string[]) {
  const dataset = loadCookingAssistantDataset();
  const tokens = unique(inputIngredients);
  return dataset
    .filter((recipe) => tokens.some((ingredient) => recipe.description.includes(ingredient) || recipe.tags.includes(ingredient)))
    .slice(0, 3)
    .map((recipe) => ({ recipe, score: 1 }));
}

function buildHelpSuggestion(): RecipeSuggestionItem {
  return {
    dish_name: 'Ingresa ingredientes para activar el asistente local',
    description: 'Escribe algo como: tengo arroz, pollo y cebolla; quiero un almuerzo rapido y economico.',
    ingredients_used: [],
    optional_extra_ingredients: [],
    estimated_portions: 1,
    preparation_time_minutes: 5,
    difficulty: 'Muy facil',
    category: 'Ayuda',
    tags: ['offline', 'ayuda'],
    selling_points: ['Funciona sin internet con reglas locales.'],
    preparation_steps: ['Escribe ingredientes o selecciona chips de la lista.', 'Vuelve a generar recomendaciones.'],
    cooking_tips: ['Mientras mas ingredientes ingreses, mejores seran los resultados.'],
    presentation_suggestion: 'Completa el formulario para ver propuestas.',
    storage_recommendation: 'No aplica.',
    possible_allergens: [],
    recommended_substitutions: [],
    ingredient_usage_level: 'Sin datos',
    homechef_sales_recommendation: 'Agrega ingredientes para sugerir platos vendibles.',
  };
}
