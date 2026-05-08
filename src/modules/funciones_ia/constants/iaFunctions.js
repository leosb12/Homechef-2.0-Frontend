export const IA_FUNCTIONS = [
  {
    code: 'asistente_ia',
    title: 'Asistente IA',
    description: 'Apoyo para ideas, descripciones y mejoras operativas del menú.',
    path: '/chef/ai/assistant/use',
    accent: '#14b8a6',
    shortLabel: 'IA',
  },
  {
    code: 'vision_artificial',
    title: 'Visión artificial',
    description: 'Análisis visual de platos e imágenes para publicaciones futuras.',
    path: '/chef/ai/vision',
    accent: '#f59e0b',
    shortLabel: 'VI',
  },
  {
    code: 'demanda_precios',
    title: 'Demanda y precios',
    description: 'Soporte para estimar demanda y ajustar precios con datos.',
    path: '/chef/ai/pricing',
    accent: '#22c55e',
    shortLabel: 'DP',
  },
  {
    code: 'publicacion_platos',
    title: 'Publicación de platos',
    description: 'Ayuda para preparar textos y contenido de nuevas publicaciones.',
    path: '/chef/ai/publishing',
    accent: '#ec4899',
    shortLabel: 'PB',
  },
]

export const IA_FUNCTION_BY_CODE = IA_FUNCTIONS.reduce((acc, item) => {
  acc[item.code] = item
  return acc
}, {})
