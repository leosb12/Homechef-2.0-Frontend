import type { AISubscriptionPlan } from '../../types/aiSubscription'

export const aiFeatureItems = [
  {
    id: 'assistant',
    label: 'Asistente IA textual',
    included: (plan: AISubscriptionPlan) => Number(plan.ai_query_limit ?? 0) > 0,
  },
  {
    id: 'vision',
    label: 'Visión artificial',
    included: (plan: AISubscriptionPlan) => Boolean(plan.vision_enabled),
  },
  {
    id: 'production',
    label: 'Recomendaciones de producción',
    included: (plan: AISubscriptionPlan) => Boolean(plan.production_recommendations_enabled),
  },
  {
    id: 'pricing',
    label: 'Soporte de precios',
    included: (plan: AISubscriptionPlan) => Boolean(plan.pricing_support_enabled),
  },
  {
    id: 'publishing',
    label: 'Soporte de publicación',
    included: (plan: AISubscriptionPlan) => Boolean(plan.publishing_support_enabled),
  },
] as const
