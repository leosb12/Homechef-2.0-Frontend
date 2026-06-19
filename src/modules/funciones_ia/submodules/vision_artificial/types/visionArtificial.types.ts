export interface ImageUploadResponse {
  id: string;
  owner: string;
  storage_bucket: string;
  file_name: string;
  file_path: string;
  public_url: string;
  mime_type: string;
  size: number;
  file_type: string;
  created_at: string;
}

export interface VisionAnalysisRequest {
  image_url: string;
  dish_name?: string;
  title?: string;
}

export interface VisionAnalysisResponse {
  success: boolean;
  image_url: string;
  dish_name: string;
  food_probability: number;
  detected_labels: string[];
  quality_score: number;
  description: string;
  presentation_quality: 'Excelente' | 'Buena' | 'Regular' | 'Mala' | string;
  suggestions: string[];
  error?: string;
}

export interface VisionIngredientDetectionResponse {
  success: boolean;
  provider_used: string;
  fallback_used: boolean;
  calidad_imagen: string;
  ingredientes: string[];
  observaciones: string;
  warnings: string[];
}

export interface SubstitutionItem {
  original: string;
  substitute: string;
  reason: string;
}

export interface RecipeSuggestionItem {
  dish_name: string;
  category: string;
  estimated_portions: number;
  preparation_time_minutes: number;
  difficulty: string;
  description: string;
  image_url?: string;
  ingredients_used: string[];
  optional_extra_ingredients: string[];
  recommended_substitutions: SubstitutionItem[];
  preparation_steps: string[];
  cooking_tips: string[];
  selling_points: string[];
  presentation_suggestion: string;
  storage_recommendation: string;
  possible_allergens: string[];
  ingredient_usage_level: string;
  homechef_sales_recommendation: string;
}

export interface RecipeSuggestionResponse {
  suggestions: RecipeSuggestionItem[];
}

