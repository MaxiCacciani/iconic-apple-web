# Instrucciones del proyecto

App de gestión para Iconic (venta de iPhones). Documentación en [docs/](docs/) y [README.md](README.md).

## Herramientas de testing

- **agent-browser** (`~/.npm-global/bin/agent-browser`): cuando el usuario pida "probar", "testear", "QA" o "verificar" la app en el navegador, usar agent-browser contra el dev server local (`npm run dev`, luego `agent-browser open http://localhost:5173`). Permite login real, clicks, formularios y screenshots. Solo funciona contra localhost (DNS externo bloqueado en este entorno).
- El `.env` local apunta a la base de **desarrollo** (proyecto Supabase `iconic-dev`) — se pueden probar flujos destructivos sin riesgo. Producción solo se toca vía merge de `dev` a `master`.

## Flujo de trabajo

- Trabajar siempre en la rama `dev`. `master` es solo para releases (dispara deploy en Vercel).
- Todos los montos del negocio van en USD; los pesos son equivalencias con el TC del día (ver [docs/explicacion.md](docs/explicacion.md)).
