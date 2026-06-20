export interface IngredientPriceInput {
  ingredient: string;
  price_bs: number;
  quantity: number;
  unit: string;
}

export interface ImputationDetail {
  field: string;
  source: string;
  value: any;
  confidence: string;
}

export interface ProductionPricingRequest {
  dish_name: string;
  city: string;
  ingredients: string[];
  cook_id?: string;
  zone?: string;
  known_ingredient_prices?: IngredientPriceInput[];
  available_stock?: Record<string, number>;
  portions_capacity?: number;
  cook_rating?: number;
  day_of_week?: string;
  hour_of_day?: number;
  weather_type?: string;
  expiration_risk?: string;
  stock_risk?: string;
  competitor_avg_price_bs?: number;
  historical_orders?: number;
  last_week_orders?: number;
  current_price_bs?: number;
}

export interface ProductionPricingResponse {
  dish_name: string;
  city: string;
  estimated_demand_score: number;
  recommended_portions: number;
  suggested_price_bs: number;
  dynamic_discount_percent: number;
  estimated_revenue_bs: number;
  estimated_cost_bs: number;
  estimated_profit_bs: number;
  cost_per_portion_bs: number;
  total_portions_cost_bs: number;
  ingredient_quantity_recommendations: Array<Record<string, any>>;
  confidence: string;
  explanation: string;
  model_used: string;
  prediction_method: string;
  currency: string;
  data_quality: string;
  used_user_data: string[];
  imputed_data: ImputationDetail[];
  ingredient_price_breakdown: Array<Record<string, any>>;
  missing_data_warnings: string[];
  estimated_demand: string;
  recommended_plates: number;
  cost_per_plate_bs: number;
  total_preparation_cost_bs: number;
  suggested_sale_price_bs: number;
  price_min_bs?: number;
  price_max_bs?: number;
  ingredient_total_cost_bs?: number;
  operational_cost_per_plate_bs?: number;
  profit_per_plate_bs?: number;
  margin_percent?: number;
  margin_estimated?: number;
  leftover_risk: string;
  discount_recommended: boolean;
  suggested_discount_price_bs: number;
  explanations: Record<string, string>;
  source?: 'online' | 'local';
  offline_ready?: boolean;
  mode?: 'online' | 'fallback' | 'offline';
}

export interface PreviewImputationResponse {
  completed_input: Record<string, any>;
  used_user_data: string[];
  imputed_data: ImputationDetail[];
  data_quality: string;
  warnings: string[];
  source?: 'online' | 'local';
  offline_ready?: boolean;
  mode?: 'online' | 'fallback' | 'offline';
}
