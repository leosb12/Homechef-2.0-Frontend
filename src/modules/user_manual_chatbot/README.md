# User Manual Chatbot Web

Widget global del manual inteligente de HomeChef para React + Vite.

## Ubicacion

- `components/ChatbotWidget.tsx`: boton flotante y panel de chat.
- `services/userManualChatbot.service.ts`: online-first hacia `homechef-ia-service`.
- `offline/frontendManualDataset.ts`: dataset local empaquetado con Vite.
- `offline/frontendManualSearch.ts`: tokenizacion, ranking y scoring local.
- `offline/frontendManualEngine.ts`: respuesta local del navegador.

## Flujo

1. El usuario escribe en el widget.
2. La web llama a `VITE_IA_SERVICE_URL/api/v1/ai/user-manual-chatbot/chat`.
3. Si responde el IA service, usa `groq`, `deepseek` o `service_local_model`.
4. Si hay timeout, red caida o servicio apagado, usa `frontend_local`.
5. En fallback local muestra: "Modo offline activo: respuesta generada localmente en tu navegador.".

## Integracion visual

El widget se monta en:

- `src/app/layouts/PublicLayout.jsx` para paginas publicas no auth.
- `src/app/layouts/RoleLayout.jsx` para cliente, cocinero, admin y delivery.

No toca CU-20, CU-21, CU-22 ni CU-23.

