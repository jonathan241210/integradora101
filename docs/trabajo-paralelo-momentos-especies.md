# Trabajo en paralelo: medios, momentos y especies

- Fecha: 2026-11-13
- Responsable: Jonathan (responsable de backend)
- Estado: planes y tasks de las 9 features **aprobados** por Jonathan el 2026-11-13, con sus preguntas abiertas resueltas. Implementación por iniciar.
- Propósito: repartir la implementación de 9 features entre 3 sesiones de Claude Code que trabajan al mismo tiempo, sin pisarse.

Este documento no sustituye a ninguna spec, plan ni tasks. Solo coordina el orden, las ramas y los puntos de sincronización. Si algo aquí contradice una spec, manda la spec.

## Features incluidas

| Feature | Qué hace | Spec (plan y tasks con el mismo nombre en `plan/` y `tasks/`) |
|---|---|---|
| `api-013` | Disco `media`: imágenes de noticias, eventos, momentos y especies en `apps/api/src/media/`, visibles en todos los equipos tras `git pull` | `apps/api/specs/013-object-storage-images.md` |
| `api-015` | Lectura pública de especies publicadas (`GET /api/v1/published-species`) | `apps/api/specs/015-public-species-read.md` |
| `api-010` | Momentos de visitantes: envío, revisión, publicación y vigencia | `apps/api/specs/010-visitor-memory-requests.md` |
| `api-012` | Lectura pública de momentos (`GET /api/v1/memories`) | `apps/api/specs/012-public-memories-read.md` |
| `api-014` | Solicitudes de especies y su publicación | `apps/api/specs/014-species-requests.md` |
| `dashboard-008` | Moderación de momentos para `zoo-admin` | `apps/dashboard/specs/008-memory-moderation.md` |
| `dashboard-010` | Gestión del contenido público (especies) | `apps/dashboard/specs/010-public-content-management.md` |
| `web-010` | Galería dinámica «Momentos para recordar» | `apps/web/specs/010-dynamic-memories.md` |
| `web-011` | TulanPedia dinámica (`#animales`) | `apps/web/specs/011-dynamic-tulanpedia.md` |

DBR-012 y DBR-013 están en «Lista para backend» y aplicadas en `arca_pruebas`. Ninguna sesión crea migraciones, DBR ni SQL.

## Reparto por sesión

| Sesión | Rama | Worktree | Orden de trabajo |
|---|---|---|---|
| **S1 · Medios y especies públicas** (sesión principal) | `feat/media-public-species` | carpeta actual del repositorio (`integradora101`) | `api-013` → `api-015` → `web-011` → `web-010` |
| **S2 · Momentos** | `feat/visitor-memories` | `../integradora101-s2` | `api-010` (Fase 1 y luego Fase 2) → `api-012` |
| **S3 · Solicitudes de especies y dashboard** | `feat/species-requests` | `../integradora101-s3` | `api-014` → `dashboard-010` → `dashboard-008` |

Las tres ramas salen de `Jona`. Cada sesión trabaja solo en su worktree y en su rama.

`web-010` y `web-011` van en la misma sesión porque las dos editan `apps/web/src/index.html` y `apps/web/src/js/api.js`. `dashboard-008` y `dashboard-010` van juntas porque comparten el menú y la navegación del dashboard.

## Cómo se comparten los cambios entre sesiones

Los worktrees son carpetas del **mismo repositorio local**. Un commit hecho en la rama de una sesión lo ven las demás al instante, sin `push`: basta `git merge <rama>` con el nombre local. Nada de esto sube a GitHub; Jonathan hace el `push` cuando quiera.

Para que las ramas no se mezclen a medias, solo hay **dos merges entre sesiones** durante el trabajo (H1 y H2). Todo lo demás se junta en la fase de integración de S1.

## Puntos de sincronización

| # | Quién avisa | Cuándo | Qué hacen las demás |
|---|---|---|---|
| H1 | S1 | Al cerrar y hacer commit de T-01, T-02 y T-04 de `api-013` (disco `media`, `config/filesystems.php`, `.env.example`) | S2 y S3 hacen `git merge feat/media-public-species`. Antes de H1, no tocan nada que guarde o lea imágenes |
| H2 | S3 | Al cerrar y hacer commit de T-07 de `api-014` (permisos `species.review` y `memories.review` en `RolesAndPermissionsSeeder`) | S2 hace `git merge feat/species-requests` y **no** vuelve a editar el seeder; reutiliza `memories.review` |

Jonathan pasa cada aviso de una sesión a otra. Mientras una dependencia no está lista, la sesión avanza en lo que no la necesita: enums, modelos, Actions sin imagen, o el frontend con respuestas simuladas.

## Reglas para trabajar en paralelo

- **Archivos que solo toca una sesión:** `apps/api/src/config/filesystems.php`, `apps/api/src/.env.example` y la carpeta nueva `apps/api/src/media/` (todavía no existe; la crea `api-013`) (S1); `RolesAndPermissionsSeeder.php` (S3); `apps/web/` (S1); `apps/dashboard/` (S3). Si otra sesión necesita cambiarlos, pide el cambio a la dueña.
- **Archivo compartido: `apps/api/src/routes/api.php`.** Cada sesión añade sus rutas en un bloque propio con un comentario de la feature (`// api-010`, `// api-014`, `// api-015`). Así los merges no chocan.
- **`packages/api-client`:** los tipos los añade S3 (dashboard). Si S1 o S2 necesitan un tipo, lo coordinan con S3.
- **Pruebas durante el trabajo:** cada sesión escribe el test de cada CA (Constitución IV) y corre **solo sus tests** (`php artisan test --filter=...`, o los tests de su app). No corre la suite completa ni pruebas reales entre features: eso lo hace S1 en la integración. Las tres usan `arca_pruebas` con `DatabaseTransactions`.
- **Subagentes por rol:** `backend` para `apps/api`, `frontend` para dashboard y web.
- **Evidencia:** ninguna casilla T-xx se marca sin evidencia (su test en verde o la salida del comando). Las T-xx que exigen verificación real entre features se dejan sin marcar con la nota «pendiente de integración (S1)».
- **Commits:** locales, en la rama de la sesión, en inglés y citando la feature (`api-013`, `dashboard-008`, etc.). `/verify` de la app tocada antes de cada commit. Ninguna sesión hace `push`.

## Fase de integración (solo S1)

Cuando S2 y S3 avisan «lista para integración» (todas sus T-xx hechas o marcadas como pendientes de integración, con commit hecho), S1:

1. Crea la rama `integration/memories-species` desde `Jona` y fusiona, en este orden: `feat/media-public-species`, `feat/species-requests` y `feat/visitor-memories`. Resuelve los conflictos (sobre todo `routes/api.php`).
2. Corre la suite completa de la API, los tests del dashboard y del portal, y `/verify`.
3. Hace las verificaciones reales entre features: `dashboard-008` y `dashboard-010` contra la API; `web-010` contra `api-012`; `web-011` contra `api-015`. Marca las T-xx que quedaron «pendiente de integración».
4. Pide a una persona con rol `admin` o `zoo-admin` volver a subir las imágenes de noticias y eventos (D-04 de `api-013`).
5. Revisa el diff completo con `quality-reviewer` y `security-reviewer` y corrige lo que encuentren.
6. Actualiza el estado de specs, plan y tasks y Neuromapa, y prepara los commits y la descripción de los PR para que Jonathan haga el `push`.

## Decisiones resueltas (2026-11-13, Jonathan)

Jonathan pidió adoptar las recomendaciones de los planes para empezar de lleno. Cada plan registra la decisión concreta de sus preguntas. Las que bloqueaban tareas:

| Decisión | Resolución |
|---|---|
| Excepción de la Constitución V: imágenes de momentos versionadas en git (ADR 0026, D-M1) | Aceptada por Jonathan solo para datos de prueba en `arca_pruebas`; se revisa antes de producción |
| Brecha de `BaseModel` (P5 de `api-014`; también `api-010`, `api-012` y `api-015`) | En el código no existe la clase `BaseModel`: todos los modelos extienden `Model` con `SoftDeletes`. Los modelos nuevos siguen ese patrón, como excepción aceptada por Jonathan; no se crea `BaseModel` en estas features |
| Unidad de «100 MB» (pregunta 5 del plan de `api-013`) | 104 857 600 bytes, contando solo `.jpg`, `.jpeg`, `.png` y `.webp` de `apps/api/src/media/`, por tamaño en disco |
| Versión de términos de momentos (`api-010`) | `MEMORIES_TERMS_VERSION=v1` por defecto, configurable por `.env` |
| Tope de `page` en `api-012` | Sin tope; una página fuera de rango devuelve la lista vacía |
| CA cruzados de `dashboard-010` | Tests automatizados (PHPUnit en `api-014` y Vitest con respuestas simuladas); la prueba contra la API real se hace en la integración |
| Volver a subir las imágenes de noticias y eventos (D-04 de `api-013`) | Se hace en la fase de integración, paso 4 |

## Preparación de los worktrees

Se ejecuta una sola vez, después del commit de estos documentos en `Jona`, desde la carpeta del repositorio:

```bash
git worktree add -b feat/visitor-memories ../integradora101-s2 Jona
git worktree add -b feat/species-requests ../integradora101-s3 Jona
cp apps/api/src/.env ../integradora101-s2/apps/api/src/.env
cp apps/api/src/.env ../integradora101-s3/apps/api/src/.env
git switch -c feat/media-public-species
```

Cada sesión instala sus dependencias en su worktree (`composer install` en `apps/api/src` y `npm install`) antes de correr tests. El `.env` copiado no se versiona.

## Prompts de arranque

Se abren en terminales nuevas, cada una dentro de su worktree (`cd ../integradora101-s2` o `cd ../integradora101-s3`, y luego `claude`).

### S2 · Momentos

```text
Eres la sesión S2 de docs/trabajo-paralelo-momentos-especies.md. Léelo completo antes de empezar,
junto con AGENTS.md, CONSTITUTION.md y apps/api/AGENTS.md.

Tu trabajo: implementar completas, en este orden, api-010 (Fase 1 y luego Fase 2) y api-012,
con /sdd-implement. Spec, plan y tasks: apps/api/specs/010-visitor-memory-requests.md y
apps/api/specs/012-public-memories-read.md, con plan/ y tasks/ del mismo nombre. Todo está
aprobado y las preguntas abiertas ya están resueltas en los planes: no vuelvas a preguntarlas.

Reglas:
- Trabaja solo en la rama feat/visitor-memories, en esta carpeta (worktree). Si falta, instala
  dependencias (composer install en apps/api/src). El .env ya está copiado.
- Antes del aviso H1 (disco media de api-013) no toques nada que guarde o lea imágenes; avanza
  enums, modelos y Actions sin imagen. Cuando te avise, haz git merge feat/media-public-species.
- No edites RolesAndPermissionsSeeder: el permiso memories.review lo añade S3. Cuando te avise
  H2, haz git merge feat/species-requests.
- Tus rutas van en un bloque propio de routes/api.php con el comentario // api-010 o // api-012.
- Delega el código al subagente backend.
- Escribe el test de cada CA y corre solo tus tests (--filter). No corras la suite completa ni
  pruebas reales con otras apps: eso lo hace la sesión principal S1 en la integración.
- No marques ninguna T-xx sin evidencia; las que exijan verificación con otras features déjalas
  con la nota «pendiente de integración (S1)».
- /verify antes de cada commit; commits locales en inglés citando api-010 o api-012; no hagas push.
- Al terminar, avísame con «S2 lista para integración» y un resumen de lo hecho y lo pendiente.
- Solo detente a preguntar si algo bloquea de verdad y no está resuelto en spec, plan o tasks.
```

### S3 · Solicitudes de especies y dashboard

```text
Eres la sesión S3 de docs/trabajo-paralelo-momentos-especies.md. Léelo completo antes de empezar,
junto con AGENTS.md, CONSTITUTION.md, apps/api/AGENTS.md y apps/dashboard/AGENTS.md.

Tu trabajo: implementar completas, en este orden, api-014, dashboard-010 y dashboard-008,
con /sdd-implement. Specs: apps/api/specs/014-species-requests.md,
apps/dashboard/specs/010-public-content-management.md y
apps/dashboard/specs/008-memory-moderation.md, con plan/ y tasks/ del mismo nombre. Todo está
aprobado y las preguntas abiertas ya están resueltas en los planes: no vuelvas a preguntarlas.

Reglas:
- Trabaja solo en la rama feat/species-requests, en esta carpeta (worktree). Si falta, instala
  dependencias (composer install en apps/api/src y npm install en la raíz). El .env ya está copiado.
- Haz primero T-07 de api-014 (permisos species.review y memories.review en
  RolesAndPermissionsSeeder), haz commit y avísame con «H2 lista»: S2 depende de él.
- Antes del aviso H1 (disco media de api-013) no toques nada que guarde o lea imágenes.
  Cuando te avise, haz git merge feat/media-public-species.
- Tus rutas van en un bloque propio de routes/api.php con el comentario // api-014.
- Eres la dueña de apps/dashboard y de los tipos de packages/api-client para estas features.
- dashboard-010 y dashboard-008 se hacen con respuestas simuladas; la integración con la API real
  la hace la sesión principal S1.
- Delega el código Laravel al subagente backend y el de React al subagente frontend.
- Escribe el test de cada CA y corre solo tus tests. No corras la suite completa ni pruebas
  reales con otras apps.
- No marques ninguna T-xx sin evidencia; las que exijan verificación con otras features déjalas
  con la nota «pendiente de integración (S1)».
- /verify antes de cada commit; commits locales en inglés citando api-014, dashboard-010 o
  dashboard-008; no hagas push.
- Al terminar, avísame con «S3 lista para integración» y un resumen de lo hecho y lo pendiente.
- Solo detente a preguntar si algo bloquea de verdad y no está resuelto en spec, plan o tasks.
```

### S1 · Medios y especies públicas (sesión principal)

Implementa `api-013`, `api-015`, `web-011` y `web-010`, en ese orden, con las mismas reglas. Avisa H1 en cuanto el disco `media` tenga commit. Después dirige la fase de integración.
