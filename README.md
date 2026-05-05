# HomeChef Web

Frontend web React + Vite + Tailwind con estructura modular alineada a 7 modulos funcionales.

## Ejecutar
```bash
npm install
npm run dev
```

## Rutas por rol
- Publico: `/`, `/login`, `/register`, `/recover-password`
- Cliente: `/client/*`
- Cocinero: `/chef/*`
- Admin: `/admin/*`
- Delivery: `/delivery/*`

## Regla de integracion
Este frontend consume solo `VITE_API_URL` (Django). No llama directamente al microservicio FastAPI de IA.
