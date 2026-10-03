# PWA veterinaria — reglas de la app

Lee `../../CONSTITUTION.md`, `../../AGENTS.md` y `../../docs/05-flujo-sdd.md` antes de trabajar.

## Carpetas
- `specs/`: alcance veterinario, CA-xx y RN-xx.
- `plan/`: solución técnica y reglas de sincronización.
- `tasks/`: pasos T-xx relacionados con CA-xx.
- `docs/`: manuales y referencia local de la PWA.
- `src/`: único lugar de código de esta app.
Usa el mismo `NNN-slug.md` en specs, plan y tasks; implementa solo una feature aprobada.

## Reglas de interfaz y dominio
- SPA/PWA con React 19, TypeScript, Vite 7 y Tailwind CSS 4; UI en español.
- Usa alias `@/`, `@arca/ui` y hooks de `@arca/api-client`.
- No pongas reglas clínicas ni lógica de negocio en componentes.
- El alcance incluye expedientes, vacunas, dietas, tratamientos y captura de campo según spec.
- La API conserva la autoridad de datos y valida cada registro sincronizado.
- Offline solo se guardan borradores sujetos a confirmación por el servidor.
- IndexedDB, `idb` y `vite-plugin-pwa` son propuestas del ADR 0003; no instalarlos sin aprobación.
- La spec debe definir retención local, reintentos, conflictos y confirmación de sincronización.
- Evalúa exposición de datos en dispositivos compartidos y medidas de privacidad antes de persistir.
- Usa permisos de API, tokens semánticos y componentes accesibles.
- Maneja explícitamente conectividad, errores y reanudación de borradores.
- No usar Inertia ni Wayfinder; prueba cada CA-xx con cobertura automatizada.
- Actualiza los docs locales cuando cambie un flujo operativo establecido.
- No inicializar `package.json` ni agregar dependencias sin SDD y aprobación del ADR requerido.
