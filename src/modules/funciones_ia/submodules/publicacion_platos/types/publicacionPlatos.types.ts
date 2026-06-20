export interface PublicationIngredient {
  name: string;
  quantity: string;
  unit: string;
  cost?: number | null;
}

export interface PublicationAssistRequest {
  chef_id: string;
  dish_name?: string;
  description_preliminary?: string;
  portions?: number;
  price_preliminary?: number | null;
  ingredients?: PublicationIngredient[];
}

export interface GeneratedPublication {
  title: string;
  description: string;
  short_description?: string;
  long_description?: string;
  tags: string[];
  categories: string[];
  allergens?: string[];
  keywords?: string[];
  improvements?: string[];
  ingredients?: PublicationIngredient[];
  schedule?: string;
  suggested_price: {
    amount: number;
    currency: string;
    calculation_summary: string;
  };
}

export interface PublicationAssistResponse {
  success: boolean;
  engine_used: string;
  user_explanation: string;
  warnings: string[];
  quality: {
    overall_confidence: number;
    fields_estimated: string[];
  };
  generated_publication: GeneratedPublication;
  source?: 'online' | 'local';
  offline_ready?: boolean;
  mode?: 'online' | 'fallback' | 'offline';
}
