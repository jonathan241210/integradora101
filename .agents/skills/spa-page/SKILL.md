---
name: spa-page
description: Crear o modificar una página SPA React para dashboard, PWA o portal institucional
argument-hint: "<dashboard|pwa|web> <NNN-slug> <página>"
allowed-tools:
  - read
  - edit
  - grep
  - glob
  - exec
---

Implementa UI de una SPA conforme a una feature aprobada; no crees lógica de negocio.

1. Lee Constitution, AGENTS raíz y de la app, spec Aprobada, plan y tasks del mismo NNN-slug.
2. Trabaja solo en `apps/<app>/src/`; conserva alias `@/`, usa componentes de `@arca/ui` y llama la API mediante hooks de `@arca/api-client`.
3. No uses `fetch`/`axios` desde páginas/componentes, Inertia, Wayfinder ni reglas de dominio en cliente.
4. Usa tokens semánticos, contenido de UI en español, estados de carga/error/vacío, teclado, foco y diseño adaptable.
5. Aplica permisos del servidor; una ruta privada del frontend no sustituye Policy/API. No expongas datos de otra audiencia.
6. No asumas React Router hasta que el ADR 0002 y la dependencia estén aprobados.
7. Implementa pruebas automatizadas para CA-xx visuales y de flujo; actualiza tareas al terminar.
8. Ejecuta `/verify` para la app y reporta resultados; si no está inicializada, dilo explícitamente.
