import {
  buildCookingAssistantDataset,
  buildDemandPricingDataset,
  buildPublicationAssistantDataset,
  COMMON_INGREDIENT_CATALOG,
  OFFLINE_DATASET_COUNTS,
} from '../datasets/offlineDatasets';

export function loadOfflineIngredientCatalog() {
  return COMMON_INGREDIENT_CATALOG;
}

export function loadCookingAssistantDataset() {
  return buildCookingAssistantDataset();
}

export function loadDemandPricingDataset() {
  return buildDemandPricingDataset();
}

export function loadPublicationAssistantDataset() {
  return buildPublicationAssistantDataset();
}

export { OFFLINE_DATASET_COUNTS };
