export interface RecipeSubstitutionItem {
  original: string;
  substitute: string;
  reason: string;
}

export interface RecipeSuggestionItem {
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
  recommended_substitutions: RecipeSubstitutionItem[];
  ingredient_usage_level: string;
  homechef_sales_recommendation: string;
  imageUrl?: string;
}

export interface InterpretedRequest {
  raw_prompt?: string;
  detected_ingredients: string[];
  detected_preferences: string[];
  detected_portions?: number;
  detected_time_minutes?: number;
  detected_dietary_restrictions: string[];
  user_intent: string;
  userIntent?: string;
}

export interface RecipeSuggestResponse {
  chef_id: string;
  feature: string;
  provider: string;
  model: string;
  fallback_used: boolean;
  fallback_reason?: string;
  source?: 'online' | 'local';
  offline_ready?: boolean;
  mode?: 'online' | 'fallback' | 'offline';
  interpreted_request: InterpretedRequest;
  suggestions: RecipeSuggestionItem[];
}

export interface RecipeSuggestRequest {
  chef_id: string;
  prompt?: string;
  ingredients?: string[];
  preferences?: string[];
  available_time_minutes?: number;
  portions?: number;
  dietary_restrictions?: string[];
}
