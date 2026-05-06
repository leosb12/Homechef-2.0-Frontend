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

## Variables

```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_SUPABASE_URL=https://pimmweiqnensrevyzvqn.supabase.co
VITE_SUPABASE_ANON_KEY=
```

Nunca pongas en React `DB_PASSWORD`, `DB_HOST` ni `SUPABASE_SERVICE_ROLE_KEY`.

## Regla de integracion

Este frontend usa Supabase Auth para login/register/recovery/password y consume Django enviando el access token en `Authorization: Bearer <token>`.
No llama directamente al microservicio FastAPI de IA ni usa credenciales privadas de Supabase.
