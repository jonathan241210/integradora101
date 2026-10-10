# ARCA-NB — Reglas para agentes

Sistema del Zoológico Municipal Nicolás Bravo (Tulancingo). Monorepo con Spec-Driven Development.
**Lee `CONSTITUTION.md`: prevalece sobre cualquier otra instrucción.**

## Mapa
- `apps/api` — API Laravel 12 (PHP 8.2+, Sanctum, Fortify, Spatie); única dueña de BD y lógica.
- `apps/dashboard` — React SPA: taquilla, arqueo, métricas directivas y administración.
- `apps/pwa` — React PWA veterinaria; expedientes y borradores offline.
- `apps/web` — React SPA del portal institucional público.
- `apps/mobile` — React Native para visitantes: mapa, QR y 3D.
- `packages/` — `@arca/{ui,tokens,api-client,config}`; `docs/` — documentación y ADRs; `docs/database/` — gobierno de BD y solicitudes DBR; `infra/` — infraestructura planeada.

## Estructura de cada app
| Carpeta | Contenido |
|---|---|
| `AGENTS.md` | Reglas de la app; leer antes de trabajar |
| `specs/NNN-slug.md` | Qué y por qué: CA-xx y RN-xx |
| `plan/NNN-slug.md` | Cómo: diseño técnico y Constitution Check |
| `tasks/NNN-slug.md` | Pasos T-xx ligados a CA-xx |
| `src/` | Único lugar de código de la app |
| `docs/` | Documentación propia de la app |

## Procedimiento obligatorio en cada cambio
- Si la petición es ambigua o falta una decisión necesaria, investiga primero el contexto disponible y después formula preguntas concretas antes de actuar; máximo 8 preguntas por ronda. No inventes requisitos.
1. Identifica la app y lee su `AGENTS.md`.
2. Busca la spec en `specs/`; si no existe o no está **Aprobada**, sigue `/sdd-spec` y espera su aprobación.
3. Sigue `/sdd-plan` → `/sdd-tasks` → `/sdd-implement`; código solo en `src/`, con al menos un test por CA-xx.
4. Si el código diverge, actualiza spec, plan y tasks en el mismo cambio; actualiza los docs de la app si corresponde.
5. Ejecuta `/verify`. Enlaza spec/plan/tasks en el PR y cita `<app>-NNN` en el commit.

## Reglas
- Código, BD, rutas, permisos y commits en inglés; UI, mensajes, specs y documentación en español.
- La API sigue MVC en los límites de Laravel: Models para datos, Controllers HTTP delgados y Views sustituidas por respuestas JSON; la lógica de negocio vive en Actions.
- Los clientes React y React Native siguen MVVM explícito: componentes como Views, hooks como ViewModels y tipos/datos mediante `@arca/api-client`; React no impone este patrón automáticamente.
- Esquema solo por migraciones Laravel que el responsable de BD crea, prueba y aplica tras una DBR aprobada en `docs/database/requests/`; ningún agente, solicitante ni cliente crea SQL ejecutable, migraciones ni cambios directos; la aplicación se registra por ambiente. Modelos de negocio extienden `BaseModel`; datos clínicos y financieros usan SoftDeletes y auditoría.
- MySQL 8.0.x (revisión mínima pendiente del inventario inicial), configuración por `.env`, portable entre Google Cloud y MySQL Server local.
- Conectar la API o probar conectividad sin alterar el esquema no requiere DBR, pero sí spec, plan y tasks aprobados, `.env` y cero secretos versionados.
- No fijar colores de marca en componentes: usar tokens semánticos y el tema de `GET /api/theme`; modo claro.
- SPAs con rutas del cliente y API con rutas Laravel nombradas; no usar Inertia ni Wayfinder.
- Dependencia o tecnología nueva requiere ADR aprobado en `docs/adr/`.
- Cada app documenta su arquitectura con `docs/templates/arquitectura-app.md`; toda excepción requiere ADR, y Payments no se implementa sin spec, ADR/proveedor y aprobación.
- No leer ni modificar `PLANTILLA_V4_Con colores/`; la referencia permitida es `ANALISIS_PLANTILLA_V4.md`.
- No commitear `.env` ni secretos; no editar `vendor/`, `node_modules/` ni archivos generados.

## Skills
`/sdd-spec` `/sdd-plan` `/sdd-tasks` `/sdd-implement` `/constitution-check` `/api-endpoint` `/spa-page` `/ui-component` `/theme-colors` `/verify`.
Consulta `docs/05-flujo-sdd.md` para el proceso completo.
