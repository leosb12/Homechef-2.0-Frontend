import axios from 'axios';
import { api } from '../../../../../shared/services/api';
import type { 
  ImageUploadResponse, 
  VisionAnalysisRequest, 
  VisionAnalysisResponse,
  VisionIngredientDetectionResponse,
  RecipeSuggestionResponse
} from '../types/visionArtificial.types';

const IA_MICROSERVICE_URL = import.meta.env.VITE_IA_SERVICE_URL || 'http://localhost:8001';

export async function uploadImage(file: File): Promise<ImageUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', 'dish');

  const { data } = await api.post<ImageUploadResponse>('/uploads/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
}

export async function analyzeImage(request: VisionAnalysisRequest): Promise<VisionAnalysisResponse> {
  const { data } = await api.post<VisionAnalysisResponse>('/ai/analyze-image/', request);
  return data;
}

export async function detectIngredients(file: File, chefId: string): Promise<VisionIngredientDetectionResponse> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('include_recommendations', 'false');
  formData.append('chef_id', chefId);

  const { data } = await axios.post<VisionIngredientDetectionResponse>(
    `${IA_MICROSERVICE_URL}/api/v1/vision-ingredientes/detectar`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return data;
}

export async function recommendRecipes(ingredients: string[], chefId: string): Promise<RecipeSuggestionResponse> {
  const { data } = await axios.post<RecipeSuggestionResponse>(
    `${IA_MICROSERVICE_URL}/api/v1/vision-ingredientes/recomendar`,
    {
      ingredientes: ingredients,
      chef_id: chefId,
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  return data;
}

