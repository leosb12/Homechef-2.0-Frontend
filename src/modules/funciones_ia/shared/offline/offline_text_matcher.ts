import type { IngredientCatalogItem } from './offline_types';
import { normalizeText, tokenize, unique } from './offline_utils';

export function detectIngredientsFromText(text: string, catalog: IngredientCatalogItem[]): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const detected: string[] = [];
  for (const item of catalog) {
    const terms = [item.name, ...item.aliases].map(normalizeText);
    if (terms.some((term) => term && normalized.includes(term))) detected.push(item.name);
  }
  return unique(detected);
}

export function normalizeIngredientList(values: Array<string | undefined>, catalog: IngredientCatalogItem[]): string[] {
  const normalized = values
    .map((value) => normalizeIngredientName(value || '', catalog))
    .filter(Boolean);
  return unique(normalized);
}

export function normalizeIngredientName(value: string, catalog: IngredientCatalogItem[]): string {
  const clean = normalizeText(value);
  if (!clean) return '';
  for (const item of catalog) {
    const terms = [item.name, ...item.aliases].map(normalizeText);
    if (terms.includes(clean) || terms.some((term) => clean.includes(term) || term.includes(clean))) {
      return item.name;
    }
  }
  return clean;
}

export function tokenSimilarity(left: string, right: string): number {
  const a = new Set(tokenize(left));
  const b = new Set(tokenize(right));
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection++;
  return intersection / Math.sqrt(a.size * b.size);
}

export function weightedIngredientScore(inputIngredients: string[], recipeIngredients: string[]): number {
  if (!inputIngredients.length || !recipeIngredients.length) return 0;
  let score = 0;
  for (const input of inputIngredients) {
    if (recipeIngredients.some((ingredient) => ingredient === input || ingredient.includes(input) || input.includes(ingredient))) {
      score += 1;
    }
  }
  const coverage = score / recipeIngredients.length;
  const usefulness = score / inputIngredients.length;
  return score * 8 + coverage * 4 + usefulness * 6;
}
