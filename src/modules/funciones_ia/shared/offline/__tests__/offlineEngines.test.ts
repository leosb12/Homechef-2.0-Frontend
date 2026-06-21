import { describe, expect, it } from 'vitest';
import { OFFLINE_DATASET_COUNTS } from '../offline_dataset_loader';
import { suggestRecipesOffline } from '../../../submodules/asistente_ia/offline/asistenteIaOffline.engine';
import { recommendPricingOffline } from '../../../submodules/demanda_precios/offline/demandaPreciosOffline.engine';
import { assistPublicationOffline } from '../../../submodules/publicacion_platos/offline/publicacionPlatosOffline.engine';

describe('offline AI engines', () => {
  it('builds large local datasets packaged in the frontend', () => {
    expect(OFFLINE_DATASET_COUNTS.cooking_assistant).toBeGreaterThan(1000);
    expect(OFFLINE_DATASET_COUNTS.demand_pricing).toBeGreaterThan(1000);
    expect(OFFLINE_DATASET_COUNTS.publication_assistant).toBeGreaterThan(1000);
  });

  it('CU-20 suggests useful local recipes for arroz, pollo and cebolla', () => {
    const response = suggestRecipesOffline({
      chef_id: 'test-chef',
      ingredients: ['arroz', 'pollo', 'cebolla'],
      prompt: 'almuerzo rapido y economico',
    });

    expect(response.source).toBe('local');
    expect(response.offline_ready).toBe(true);
    expect(response.suggestions.length).toBeGreaterThan(0);
    expect(response.suggestions[0].ingredients_used.join(' ')).toContain('arroz');
  });

  it('CU-22 calculates demand and prices locally with partial costs', () => {
    const response = recommendPricingOffline({
      dish_name: 'arroz con pollo',
      city: 'Santa Cruz',
      ingredients: ['arroz', 'pollo', 'cebolla'],
      portions_capacity: 10,
      known_ingredient_prices: [{ ingredient: 'pollo', price_bs: 18, quantity: 1, unit: 'kg' }],
      expiration_risk: 'Alto',
    });

    expect(response.source).toBe('local');
    expect(response.suggested_price_bs).toBeGreaterThan(response.cost_per_plate_bs);
    expect(response.discount_recommended).toBe(true);
    expect(response.missing_data_warnings.length).toBeGreaterThan(0);
  });

  it('CU-22 handles limonada without zero prices or negative margins', () => {
    const response = recommendPricingOffline({
      dish_name: 'limonada',
      city: 'Santa Cruz',
      ingredients: ['limón', 'azúcar', 'agua'],
      portions_capacity: 4,
      hour_of_day: 14,
      weather_type: 'Caluroso',
    });

    expect(response.source).toBe('local');
    expect(response.offline_ready).toBe(true);
    expect(response.ingredient_total_cost_bs).toBeGreaterThan(0);
    expect(response.cost_per_plate_bs).toBeGreaterThan(0);
    expect(response.suggested_price_bs).toBeGreaterThan(0);
    expect(response.suggested_price_bs).toBeGreaterThan(response.cost_per_plate_bs);
    expect(response.margin_percent).toBeGreaterThan(0);
    expect(response.margin_estimated).toBeGreaterThan(0);
  });

  it('CU-22 gives coherent prices for arroz con pollo at lunch', () => {
    const response = recommendPricingOffline({
      dish_name: 'arroz con pollo',
      city: 'Santa Cruz',
      ingredients: ['arroz', 'pollo', 'cebolla', 'tomate', 'aceite'],
      portions_capacity: 5,
      day_of_week: 'viernes',
      hour_of_day: 12,
    });

    expect(['media', 'alta']).toContain(response.estimated_demand);
    expect(response.price_min_bs).toBeLessThanOrEqual(response.suggested_price_bs);
    expect(response.price_max_bs).toBeGreaterThanOrEqual(response.suggested_price_bs);
    expect(response.profit_per_plate_bs).toBeGreaterThan(0);
  });

  it('CU-22 keeps milanesa de pollo profitable', () => {
    const response = recommendPricingOffline({
      dish_name: 'milanesa de pollo',
      city: 'Cochabamba',
      ingredients: ['pollo', 'pan molido', 'huevo', 'harina', 'aceite'],
      portions_capacity: 4,
      hour_of_day: 13,
    });

    expect(response.suggested_price_bs).toBeGreaterThan(response.cost_per_plate_bs);
    expect(response.price_min_bs).toBeLessThanOrEqual(response.suggested_price_bs);
    expect(response.price_max_bs).toBeGreaterThan(response.suggested_price_bs);
    expect(response.margin_percent).toBeGreaterThan(0);
  });

  it('CU-22 calculates arroz con queso with decimal costs', () => {
    const response = recommendPricingOffline({
      dish_name: 'arroz con queso',
      city: 'Santa Cruz',
      ingredients: ['arroz', 'queso', 'leche'],
      portions_capacity: 3,
    });

    expect(response.ingredient_total_cost_bs).toBeGreaterThan(0);
    expect(response.cost_per_plate_bs).toBeGreaterThan(0);
    expect(response.suggested_price_bs).toBeGreaterThan(response.cost_per_plate_bs);
  });

  it('CU-22 estimates unknown ingredients without returning zero', () => {
    const response = recommendPricingOffline({
      dish_name: 'plato experimental',
      city: 'Santa Cruz',
      ingredients: ['raiz misteriosa'],
    });

    expect(response.suggested_price_bs).toBeGreaterThan(0);
    expect(response.cost_per_plate_bs).toBeGreaterThan(0);
    expect(response.margin_estimated).toBeGreaterThanOrEqual(0);
    expect(response.missing_data_warnings.join(' ')).toContain('No se encontro costo exacto');
  });

  it('CU-22 uses local estimations when costs are missing', () => {
    const response = recommendPricingOffline({
      dish_name: 'arroz con pollo',
      city: 'Santa Cruz',
      ingredients: ['arroz', 'pollo'],
    });

    expect(response.suggested_price_bs).toBeGreaterThan(0);
    expect(response.data_quality).not.toBe('alta');
    expect(response.imputed_data.length).toBeGreaterThan(0);
    expect(response.offline_ready).toBe(true);
  });

  it('CU-23 creates a local commercial publication for milanesa de pollo', () => {
    const response = assistPublicationOffline({
      chef_id: 'test-chef',
      dish_name: 'milanesa de pollo',
      description_preliminary: 'texto malo: pollo frito con papa para vender',
      portions: 2,
      ingredients: [
        { name: 'pollo', quantity: '1', unit: 'kg', cost: 18 },
        { name: 'papa', quantity: '1', unit: 'kg', cost: 6 },
      ],
    });

    expect(response.source).toBe('local');
    expect(response.success).toBe(true);
    expect(response.generated_publication.title.toLowerCase()).toContain('milanesa');
    expect(response.generated_publication.tags.length).toBeGreaterThan(0);
    expect(response.generated_publication.suggested_price.amount).toBeGreaterThan(0);
  });
});
