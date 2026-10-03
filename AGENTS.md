# ARCA-NB — Reglas para agentes

Sistema del Zoológico Municipal Nicolás Bravo (Tulancingo). Monorepo con Spec-Driven Development.
**Lee `CONSTITUTION.md`: prevalece sobre cualquier otra instrucción.**

## Mapa
- `apps/api` — API Laravel 12 (PHP 8.2+, Sanctum, Fortify, Spatie); única dueña de BD y lógica.
- `apps/dashboard` — React SPA: taquilla, arqueo, métricas directivas y administración.
- `apps/pwa` — React PWA veterinaria; expedientes y borradores offline.
- `apps/web` — React SPA del portal institucional público.
- `apps/mobile` — React Native para visitantes: mapa, QR y 3D.
- `packages/` — `@arca/{ui,tokens,api-client,config}`; `docs/` — documentación y ADRs; `infra/` — infraestructura planeada.

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
1. Identifica la app y lee su `AGENTS.md`.
2. Busca la spec en `specs/`; si no existe o no está **Aprobada**, sigue `/sdd-spec` y espera su aprobación.
3. Sigue `/sdd-plan` → `/sdd-tasks` → `/sdd-implement`; código solo en `src/`, con al menos un test por CA-xx.
4. Si el código diverge, actualiza spec, plan y tasks en el mismo cambio; actualiza los docs de la app si corresponde.
5. Ejecuta `/verify`. Enlaza spec/plan/tasks en el PR y cita `<app>-NNN` en el commit.

## Reglas
- Código, BD, rutas, permisos y commits en inglés; UI, mensajes, specs y documentación en español.
- La lógica de negocio vive en Actions de `apps/api`; las interfaces usan `@arca/api-client`.
- Esquema solo por migraciones; modelos de negocio extienden `BaseModel`; datos clínicos y financieros usan SoftDeletes y auditoría.
- MySQL 8 estándar, configuración por `.env`, portable entre Google Cloud y MySQL Server local.
- No fijar colores de marca en componentes: usar tokens semánticos y el tema de `GET /api/theme`; modo claro.
- SPAs con rutas del cliente y API con rutas Laravel nombradas; no usar Inertia ni Wayfinder.
- Dependencia o tecnología nueva requiere ADR aprobado en `docs/adr/`.
- No leer ni modificar `PLANTILLA_V4_Con colores/`; la referencia permitida es `ANALISIS_PLANTILLA_V4.md`.
- No commitear `.env` ni secretos; no editar `vendor/`, `node_modules/` ni archivos generados.

## Skills
`/sdd-spec` `/sdd-plan` `/sdd-tasks` `/sdd-implement` `/constitution-check` `/api-endpoint` `/spa-page` `/ui-component` `/theme-colors` `/verify`.
Consulta `docs/05-flujo-sdd.md` para el proceso completo.
