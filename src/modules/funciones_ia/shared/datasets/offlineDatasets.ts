import type {
  DemandScenarioRecord,
  IngredientCatalogItem,
  PublicationPatternRecord,
  RecipeDatasetRecord,
} from '../offline/offline_types';

export const COMMON_INGREDIENT_CATALOG: IngredientCatalogItem[] = [
  { name: 'pollo', aliases: ['pechuga', 'muslo', 'alita', 'gallina'], category: 'proteina', unit: 'kg', price_bs: 18, perishable: true },
  { name: 'carne de res', aliases: ['carne', 'res', 'bistec', 'molida', 'lomo'], category: 'proteina', unit: 'kg', price_bs: 38, perishable: true },
  { name: 'cerdo', aliases: ['chancho', 'costilla', 'panceta'], category: 'proteina', unit: 'kg', price_bs: 32, perishable: true },
  { name: 'pescado', aliases: ['surubi', 'trucha', 'pacumutu', 'filete'], category: 'proteina', unit: 'kg', price_bs: 42, perishable: true },
  { name: 'charque', aliases: ['charqui', 'charquekan'], category: 'proteina', unit: 'kg', price_bs: 90, perishable: true },
  { name: 'huevo', aliases: ['huevos'], category: 'proteina', unit: 'unidad', price_bs: 0.85, perishable: true, allergens: ['huevo'] },
  { name: 'queso', aliases: ['queso fresco', 'quesillo', 'queso criollo'], category: 'lacteo', unit: 'kg', price_bs: 32, perishable: true, allergens: ['lacteos'] },
  { name: 'leche', aliases: ['lacteo', 'leche entera'], category: 'lacteo', unit: 'litro', price_bs: 7, perishable: true, allergens: ['lacteos'] },
  { name: 'arroz', aliases: ['arroz grano largo', 'arroz popular'], category: 'grano', unit: 'kg', price_bs: 8, perishable: false },
  { name: 'fideo', aliases: ['fideos', 'pasta', 'tallarin', 'macarron'], category: 'grano', unit: 'kg', price_bs: 12, perishable: false, allergens: ['gluten'] },
  { name: 'quinua', aliases: ['quinoa'], category: 'grano', unit: 'kg', price_bs: 22, perishable: false },
  { name: 'lenteja', aliases: ['lentejas'], category: 'legumbre', unit: 'kg', price_bs: 14, perishable: false },
  { name: 'mani', aliases: ['maní', 'cacahuate'], category: 'legumbre', unit: 'kg', price_bs: 24, perishable: false, allergens: ['mani'] },
  { name: 'papa', aliases: ['papas', 'papa imilla'], category: 'tuberculo', unit: 'kg', price_bs: 6, perishable: true },
  { name: 'yuca', aliases: ['mandioca'], category: 'tuberculo', unit: 'kg', price_bs: 7, perishable: true },
  { name: 'camote', aliases: ['batata'], category: 'tuberculo', unit: 'kg', price_bs: 8, perishable: true },
  { name: 'tomate', aliases: ['tomates'], category: 'verdura', unit: 'kg', price_bs: 8, perishable: true },
  { name: 'cebolla', aliases: ['cebolla roja', 'cebolla blanca'], category: 'verdura', unit: 'kg', price_bs: 7, perishable: true },
  { name: 'zanahoria', aliases: ['zanahorias'], category: 'verdura', unit: 'kg', price_bs: 6, perishable: true },
  { name: 'lechuga', aliases: ['hojas verdes'], category: 'verdura', unit: 'unidad', price_bs: 4, perishable: true },
  { name: 'pepino', aliases: ['pepinos'], category: 'verdura', unit: 'kg', price_bs: 7, perishable: true },
  { name: 'pimenton', aliases: ['pimiento', 'morrón', 'morron'], category: 'verdura', unit: 'kg', price_bs: 14, perishable: true },
  { name: 'locoto', aliases: ['aji picante'], category: 'condimento', unit: 'unidad', price_bs: 1, perishable: true },
  { name: 'aji amarillo', aliases: ['aji', 'aji amarillo molido'], category: 'condimento', unit: 'kg', price_bs: 45, perishable: false },
  { name: 'ajo', aliases: ['diente de ajo'], category: 'condimento', unit: 'kg', price_bs: 20, perishable: true },
  { name: 'perejil', aliases: ['hierba fresca'], category: 'hierba', unit: 'ramo', price_bs: 2, perishable: true },
  { name: 'cilantro', aliases: ['culantro'], category: 'hierba', unit: 'ramo', price_bs: 2, perishable: true },
  { name: 'oregano', aliases: ['oregano seco'], category: 'condimento', unit: 'kg', price_bs: 60, perishable: false },
  { name: 'comino', aliases: ['comino molido'], category: 'condimento', unit: 'kg', price_bs: 70, perishable: false },
  { name: 'pan', aliases: ['pan de batalla', 'marraqueta'], category: 'cereal', unit: 'unidad', price_bs: 0.7, perishable: true, allergens: ['gluten'] },
  { name: 'maiz', aliases: ['choclo', 'mote', 'maiz mote'], category: 'grano', unit: 'kg', price_bs: 8, perishable: true },
  { name: 'platano', aliases: ['platano de freir', 'banana'], category: 'fruta', unit: 'unidad', price_bs: 1.2, perishable: true },
  { name: 'aceite', aliases: ['aceite vegetal', 'aceite de cocina'], category: 'grasa', unit: 'litro', price_bs: 13.5, perishable: false },
  { name: 'sal', aliases: ['sal yodada'], category: 'condimento', unit: 'kg', price_bs: 3, perishable: false },
  { name: 'azucar', aliases: ['azúcar', 'azucar blanca'], category: 'endulzante', unit: 'kg', price_bs: 7, perishable: false },
  { name: 'harina', aliases: ['harina de trigo'], category: 'cereal', unit: 'kg', price_bs: 8, perishable: false, allergens: ['gluten'] },
  { name: 'pan molido', aliases: ['pan rallado', 'apanado'], category: 'cereal', unit: 'kg', price_bs: 14, perishable: false, allergens: ['gluten'] },
  { name: 'mantequilla', aliases: ['manteca', 'mantequilla sin sal'], category: 'lacteo', unit: 'kg', price_bs: 45, perishable: true, allergens: ['lacteos'] },
  { name: 'agua', aliases: ['agua potable'], category: 'bebida', unit: 'litro', price_bs: 1, perishable: false },
  { name: 'condimentos', aliases: ['condimento', 'sazonador', 'sazonadores'], category: 'condimento', unit: 'kg', price_bs: 55, perishable: false },
  { name: 'pimienta', aliases: ['pimienta negra'], category: 'condimento', unit: 'kg', price_bs: 80, perishable: false },
  { name: 'limon', aliases: ['lima'], category: 'fruta', unit: 'unidad', price_bs: 0.8, perishable: true },
  { name: 'avena', aliases: ['hojuelas de avena'], category: 'cereal', unit: 'kg', price_bs: 12, perishable: false },
  { name: 'atun', aliases: ['atun en lata'], category: 'proteina', unit: 'lata', price_bs: 10, perishable: false },
];

const DISH_BLUEPRINTS = [
  ['Arroz con pollo familiar', ['arroz', 'pollo', 'cebolla', 'tomate'], 'almuerzo', 'Bolivia', 35, 'Facil', 18, ['familiar', 'economico']],
  ['Majadito batido', ['arroz', 'pollo', 'huevo', 'platano', 'cebolla'], 'almuerzo', 'Santa Cruz', 40, 'Media', 22, ['boliviano', 'oriente']],
  ['Silpancho cochabambino', ['carne de res', 'arroz', 'papa', 'huevo', 'tomate', 'cebolla'], 'almuerzo', 'Cochabamba', 45, 'Media', 24, ['tradicional', 'contundente']],
  ['Sopa de mani', ['mani', 'papa', 'carne de res', 'fideo'], 'sopa', 'Bolivia', 55, 'Media', 16, ['tradicional', 'caliente']],
  ['Fideo tostado con pollo', ['fideo', 'pollo', 'cebolla', 'tomate'], 'almuerzo', 'Bolivia', 30, 'Facil', 17, ['rapido', 'economico']],
  ['Tortilla de huevo y queso', ['huevo', 'queso', 'cebolla'], 'desayuno', 'Bolivia', 15, 'Muy facil', 10, ['rapido', 'desayuno']],
  ['Sandwich caliente casero', ['pan', 'queso', 'huevo', 'tomate'], 'merienda', 'Bolivia', 12, 'Muy facil', 9, ['rapido', 'snack']],
  ['Milanesa de pollo', ['pollo', 'huevo', 'pan', 'papa'], 'almuerzo', 'Bolivia', 35, 'Media', 20, ['popular', 'crujiente']],
  ['Guiso de lentejas', ['lenteja', 'papa', 'zanahoria', 'cebolla'], 'almuerzo', 'Bolivia', 45, 'Facil', 14, ['economico', 'saludable']],
  ['Ensalada fresca con pollo', ['pollo', 'lechuga', 'tomate', 'limon'], 'cena', 'Bolivia', 20, 'Facil', 18, ['saludable', 'ligero']],
  ['Pique macho sencillo', ['carne de res', 'papa', 'cebolla', 'locoto'], 'cena', 'Cochabamba', 45, 'Media', 30, ['picante', 'compartir']],
  ['Charquekan casero', ['charque', 'maiz', 'papa', 'huevo', 'queso'], 'almuerzo', 'Oruro', 50, 'Media', 34, ['tradicional', 'boliviano']],
  ['Arroz chaufa casero', ['arroz', 'huevo', 'pollo', 'cebolla'], 'cena', 'Bolivia', 25, 'Facil', 18, ['aprovechamiento', 'rapido']],
  ['Pure de papa con carne', ['papa', 'carne de res', 'leche', 'queso'], 'almuerzo', 'Bolivia', 35, 'Facil', 19, ['familiar', 'suave']],
  ['Hamburguesa casera', ['pan', 'carne de res', 'lechuga', 'tomate', 'queso'], 'comida rapida', 'Bolivia', 25, 'Facil', 20, ['venta', 'rapido']],
  ['Pastel de fideo', ['fideo', 'queso', 'huevo', 'leche'], 'almuerzo', 'Bolivia', 40, 'Media', 16, ['horneado', 'familiar']],
  ['Tacu tacu simple', ['arroz', 'lenteja', 'huevo', 'cebolla'], 'almuerzo', 'Bolivia', 25, 'Facil', 13, ['aprovechamiento', 'economico']],
  ['Salteado de verduras', ['zanahoria', 'cebolla', 'tomate', 'ajo'], 'cena', 'Bolivia', 18, 'Muy facil', 12, ['vegetariano', 'saludable']],
  ['Pollo al limon', ['pollo', 'limon', 'ajo', 'arroz'], 'almuerzo', 'Bolivia', 30, 'Facil', 19, ['aromatico', 'venta']],
  ['Arroz con queso', ['arroz', 'queso', 'leche', 'cebolla'], 'almuerzo', 'Bolivia', 25, 'Muy facil', 14, ['economico', 'cremoso']],
  ['Tallarines con carne', ['fideo', 'carne de res', 'tomate', 'cebolla'], 'almuerzo', 'Bolivia', 35, 'Facil', 20, ['popular', 'familiar']],
  ['Locro de gallina', ['pollo', 'arroz', 'papa', 'cebolla'], 'sopa', 'Santa Cruz', 50, 'Media', 22, ['tradicional', 'caliente']],
  ['Sonso de yuca', ['yuca', 'queso', 'huevo'], 'merienda', 'Santa Cruz', 35, 'Media', 12, ['tradicional', 'snack']],
  ['Revuelto de huevo con pan', ['huevo', 'pan', 'cebolla', 'tomate'], 'desayuno', 'Bolivia', 12, 'Muy facil', 9, ['rapido', 'economico']],
  ['Atun con arroz', ['atun', 'arroz', 'tomate', 'cebolla'], 'almuerzo', 'Bolivia', 15, 'Muy facil', 15, ['rapido', 'despensa']],
  ['Quinua salteada', ['quinua', 'zanahoria', 'huevo', 'cebolla'], 'cena', 'Bolivia', 25, 'Facil', 17, ['saludable', 'andino']],
  ['Cerdo con yuca', ['cerdo', 'yuca', 'cebolla', 'limon'], 'almuerzo', 'Bolivia', 45, 'Media', 24, ['familiar', 'tradicional']],
  ['Pescado a la plancha', ['pescado', 'limon', 'arroz', 'lechuga'], 'almuerzo', 'Bolivia', 25, 'Facil', 26, ['saludable', 'premium']],
  ['Avena con leche', ['avena', 'leche', 'platano'], 'desayuno', 'Bolivia', 10, 'Muy facil', 8, ['desayuno', 'saludable']],
  ['Camote horneado con queso', ['camote', 'queso', 'oregano'], 'cena', 'Bolivia', 30, 'Facil', 13, ['vegetariano', 'horneado']],
  ['Choclo con queso', ['maiz', 'queso'], 'merienda', 'Bolivia', 20, 'Muy facil', 10, ['tradicional', 'snack']],
  ['Bowl economico de arroz', ['arroz', 'huevo', 'zanahoria', 'cebolla'], 'almuerzo', 'Bolivia', 20, 'Muy facil', 12, ['economico', 'rendidor']],
] as const;

const COOKING_CONTEXTS = ['almuerzo', 'cena', 'desayuno', 'merienda', 'familiar', 'venta', 'sobras', 'saludable'];
const STYLE_PROFILES = ['casero', 'economico', 'rapido', 'boliviano', 'familiar', 'saludable', 'rendidor', 'premium'];
const SPEED_PROFILES = [
  { label: 'express', minutes: -10 },
  { label: 'normal', minutes: 0 },
  { label: 'preparacion amplia', minutes: 15 },
];

const CITIES = ['Santa Cruz', 'Cochabamba', 'La Paz', 'Sucre', 'Tarija', 'Oruro', 'Potosi', 'Beni', 'Pando'];
const DAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const HOUR_SEGMENTS = ['desayuno', 'almuerzo', 'tarde', 'cena'];
const TONES = ['comercial', 'familiar', 'economico', 'premium', 'saludable', 'tradicional', 'rapido', 'casero'];
const FORMATS = ['corto', 'detallado', 'emocional', 'directo', 'menu del dia', 'redes sociales'];
const AUDIENCES = ['oficinistas', 'familias', 'estudiantes', 'clientes premium'];

export const OFFLINE_DATASET_COUNTS = {
  cooking_assistant: DISH_BLUEPRINTS.length * COOKING_CONTEXTS.length * STYLE_PROFILES.length * SPEED_PROFILES.length,
  demand_pricing: DISH_BLUEPRINTS.length * CITIES.length * DAYS.length * HOUR_SEGMENTS.length,
  publication_assistant: DISH_BLUEPRINTS.length * TONES.length * FORMATS.length * AUDIENCES.length,
};

let cookingCache: RecipeDatasetRecord[] | null = null;
let demandCache: DemandScenarioRecord[] | null = null;
let publicationCache: PublicationPatternRecord[] | null = null;

export function buildCookingAssistantDataset(): RecipeDatasetRecord[] {
  if (cookingCache) return cookingCache;
  const rows: RecipeDatasetRecord[] = [];
  for (const [dish, ingredients, category, region, baseTime, difficulty, price, tags] of DISH_BLUEPRINTS) {
    for (const context of COOKING_CONTEXTS) {
      for (const style of STYLE_PROFILES) {
        for (const speed of SPEED_PROFILES) {
          const minutes = Math.max(8, Number(baseTime) + speed.minutes);
          rows.push({
            id: `${dish}-${context}-${style}-${speed.label}`.replace(/\s+/g, '-').toLowerCase(),
            dish_name: `${dish} ${style === 'casero' ? 'casero' : style}`,
            description: `${dish} adaptado para ${context}, con enfoque ${style}. Usa ingredientes conocidos y tecnicas simples para un resultado vendible.`,
            ingredients_used: [...ingredients],
            optional_extra_ingredients: ['aceite', 'sal', 'pimienta', 'ajo'].filter((item) => !ingredients.includes(item)),
            estimated_portions: context === 'familiar' || style === 'rendidor' ? 4 : 2,
            preparation_time_minutes: minutes,
            difficulty: speed.label === 'express' ? 'Facil' : String(difficulty),
            category: String(category),
            tags: [...tags, context, style, String(region).toLowerCase()],
            selling_points: [
              `Opcion ${style} para ${context}.`,
              `Costo referencial desde Bs ${price} por porcion.`,
              `Buena salida para cocina casera en ${region}.`,
            ],
            preparation_steps: [
              `Preparar y ordenar: ${ingredients.join(', ')}.`,
              'Sofreir base de cebolla, ajo o condimentos segun corresponda.',
              'Cocinar el ingrediente principal y ajustar sal al final.',
              'Servir caliente con una presentacion limpia y porcion consistente.',
            ],
            cooking_tips: [
              style === 'economico' ? 'Aumenta rendimiento con arroz, papa o fideo.' : 'Mantiene una mise en place lista antes de empezar.',
              context === 'sobras' ? 'Reutiliza arroz, papa o pollo cocido del dia anterior si estan en buen estado.' : 'Prueba el punto de sal antes de publicar el plato.',
            ],
            presentation_suggestion: `Servir en envase limpio, con el componente principal visible y guarnicion ordenada.`,
            storage_recommendation: 'Refrigerar si no se vende en el dia. Recalentar solo una vez.',
            possible_allergens: inferAllergens(ingredients),
            ingredient_usage_level: ingredients.length >= 4 ? 'Alto' : 'Medio',
            homechef_sales_recommendation: `Publicar como ${context} ${style}, destacando sabor casero, porcion clara y tiempo estimado de entrega.`,
            context,
          });
        }
      }
    }
  }
  cookingCache = rows;
  return rows;
}

export function buildDemandPricingDataset(): DemandScenarioRecord[] {
  if (demandCache) return demandCache;
  const rows: DemandScenarioRecord[] = [];
  for (const [dish, , category, , , , price, tags] of DISH_BLUEPRINTS) {
    for (const city of CITIES) {
      for (const day of DAYS) {
        for (const segment of HOUR_SEGMENTS) {
          const weekend = day === 'sabado' || day === 'domingo';
          const peak = segment === 'almuerzo' || segment === 'cena';
          const popular = tags.includes('popular') || tags.includes('tradicional') || tags.includes('boliviano');
          const score = Math.min(0.95, 0.38 + (weekend ? 0.12 : 0) + (peak ? 0.18 : 0) + (popular ? 0.12 : 0) + Number(price) / 180);
          const demand_level = score >= 0.68 ? 'alta' : score >= 0.48 ? 'media' : 'baja';
          rows.push({
            id: `${dish}-${city}-${day}-${segment}`.replace(/\s+/g, '-').toLowerCase(),
            dish_name: String(dish),
            city,
            day_of_week: day,
            hour_segment: segment,
            category: String(category),
            demand_level,
            demand_score: Number(score.toFixed(2)),
            recommended_margin: demand_level === 'alta' ? 1.65 : demand_level === 'media' ? 1.5 : 1.35,
            min_price_factor: 1.25,
            max_price_factor: demand_level === 'alta' ? 1.9 : 1.65,
            discount_percent: demand_level === 'baja' ? 12 : 0,
            explanation_hint: `${city} en ${day} para ${segment}: demanda ${demand_level} por horario, tipo de plato y popularidad local.`,
          });
        }
      }
    }
  }
  demandCache = rows;
  return rows;
}

export function buildPublicationAssistantDataset(): PublicationPatternRecord[] {
  if (publicationCache) return publicationCache;
  const rows: PublicationPatternRecord[] = [];
  for (const [dish, ingredients, category, region, , , , tags] of DISH_BLUEPRINTS) {
    for (const tone of TONES) {
      for (const format of FORMATS) {
        for (const audience of AUDIENCES) {
          rows.push({
            id: `${dish}-${tone}-${format}-${audience}`.replace(/\s+/g, '-').toLowerCase(),
            dish_name: String(dish),
            tone,
            audience,
            category: String(category),
            title_pattern: titleForTone(String(dish), tone),
            short_description_pattern: `${dish} preparado con ${ingredients.slice(0, 4).join(', ')}. Ideal para ${audience}.`,
            long_description_pattern: `${dish} con sabor ${tone}, porcion cuidada y preparacion casera inspirada en ${region}. Una opcion pensada para ${audience}, con ingredientes como ${ingredients.join(', ')} y presentacion lista para publicar.`,
            tags: [...tags, tone, format, audience.replace(/\s+/g, '_'), String(category).replace(/\s+/g, '_')],
            keywords: [...ingredients, String(dish), String(region), String(category), tone],
            improvements: [
              'Mencionar porcion y horario disponible.',
              'Destacar ingredientes principales sin exagerar.',
              'Agregar una foto clara del plato terminado.',
            ],
          });
        }
      }
    }
  }
  publicationCache = rows;
  return rows;
}

function inferAllergens(ingredients: readonly string[]): string[] {
  const allergens = new Set<string>();
  for (const ingredient of ingredients) {
    const item = COMMON_INGREDIENT_CATALOG.find((catalog) => catalog.name === ingredient);
    item?.allergens?.forEach((allergen) => allergens.add(allergen));
  }
  return Array.from(allergens);
}

function titleForTone(dish: string, tone: string): string {
  const title = dish.trim();
  if (tone === 'premium') return `${title} especial de la casa`;
  if (tone === 'economico') return `${title} casero y rendidor`;
  if (tone === 'saludable') return `${title} fresco y balanceado`;
  if (tone === 'tradicional') return `${title} tradicional con sabor boliviano`;
  if (tone === 'rapido') return `${title} listo para tu antojo`;
  return `${title} casero listo para disfrutar`;
}
