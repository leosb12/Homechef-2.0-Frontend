export type OfflineSource = 'online' | 'local';
export type OfflineMode = 'online' | 'fallback' | 'offline';

export interface OfflineResponseMeta {
  source: OfflineSource;
  offline_ready: boolean;
  mode: OfflineMode;
  fallback_reason?: string;
}

export interface IngredientCatalogItem {
  name: string;
  aliases: string[];
  category: string;
  unit: string;
  price_bs: number;
  perishable: boolean;
  allergens?: string[];
}

export interface RecipeDatasetRecord {
  id: string;
  dish_name: string;
  description: string;
  ingredients_used: string[];
  optional_extra_ingredients: string[];
  estimated_portions: number;
  preparation_time_minutes: number;
  difficulty: string;
  category: string;
  tags: string[];
  selling_points: string[];
  preparation_steps: string[];
  cooking_tips: string[];
  presentation_suggestion: string;
  storage_recommendation: string;
  possible_allergens: string[];
  ingredient_usage_level: string;
  homechef_sales_recommendation: string;
  context: string;
}

export interface DemandScenarioRecord {
  id: string;
  dish_name: string;
  city: string;
  day_of_week: string;
  hour_segment: string;
  category: string;
  demand_level: 'baja' | 'media' | 'alta';
  demand_score: number;
  recommended_margin: number;
  min_price_factor: number;
  max_price_factor: number;
  discount_percent: number;
  explanation_hint: string;
}

export interface PublicationPatternRecord {
  id: string;
  dish_name: string;
  tone: string;
  audience: string;
  category: string;
  title_pattern: string;
  short_description_pattern: string;
  long_description_pattern: string;
  tags: string[];
  keywords: string[];
  improvements: string[];
}
