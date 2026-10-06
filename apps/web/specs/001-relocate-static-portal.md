# 001 · relocate-static-portal

- App dueña: `web`
- Apps/paquetes afectados: `apps/web`, raíz del repositorio
- Estado: Implementada
- Solicitante / responsable funcional: Jonathan
- Aprobación funcional: Jonathan, 2026-10-06

## Problema y contexto

El portal institucional se agregó en `portal-web/`, fuera de la estructura establecida para el monorepo. También se añadieron archivos Docker en la raíz aunque Docker todavía no se utilizará. Esto deja código de la app fuera de `apps/web/src/` y configuración de infraestructura prematura.

## Objetivos

- Reubicar íntegramente el portal estático y el `index.php` raíz en `apps/web/src/`.
- Conservar la estructura interna, recursos y comportamiento actual; ajustar `index.php` para redirigir a `./index.html` en su nueva ubicación.
- Eliminar `portal-web/` y el `index.php` raíz después de verificar que todo su contenido fue trasladado.
- Eliminar `Dockerfile`, `docker-compose.yml` y `.dockerignore` de la raíz.
- Dejar `apps/web` organizado de acuerdo con las reglas actuales del repositorio.
- Conservar una prueba estructural ejecutable con el runner integrado de Node 22, sin manifiesto ni dependencias, que nombre y cubra CA-01..CA-07 conforme a Constitución IV y al feedback del hook.

## Fuera de alcance

- Convertir HTML, CSS o JavaScript a React/TypeScript.
- Inicializar Vite, React, Tailwind o un `package.json`.
- Modificar diseño, contenido, imágenes, modelo 3D o comportamiento del portal.
- Implementar API, autenticación, pagos o Docker; tampoco se inicializa un framework de tests ni se crean tests funcionales/UI. Se agrega únicamente la prueba estructural persistente con el runner integrado de Node 22 exigida por Constitución IV y el hook.
- Mover recursos del portal a `packages/assets`; esa clasificación requiere una revisión posterior de origen y licencias.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Equipo de desarrollo | Encontrar el portal en la ubicación estándar | Acceso al repositorio |
| Visitante | Conservar el comportamiento visible del portal | Ninguno; contenido público |

## Historias de usuario

Como integrante del equipo, quiero que el portal esté dentro de `apps/web/src/` para trabajar con una estructura uniforme y localizar claramente el código de la aplicación.

## Criterios de aceptación

- **CA-01:** Dado el contenido actual de `portal-web/`, cuando termine la reorganización, entonces cada archivo estará presente bajo `apps/web/src/` con la misma ruta relativa y contenido.
- **CA-02:** Dado el `index.php` raíz que redirige a `/portal-web/`, cuando termine la reorganización, entonces estará en `apps/web/src/index.php` y redirigirá a `./index.html`.
- **CA-03:** Dado que el traslado fue verificado, cuando termine el cambio, entonces `portal-web/` y el `index.php` raíz ya no existirán.
- **CA-04:** Dado que Docker no se utilizará todavía, cuando termine el cambio, entonces `Dockerfile`, `docker-compose.yml` y `.dockerignore` no existirán en la raíz.
- **CA-05:** Dado el portal reubicado, cuando se comprueben las referencias locales de `index.html`, entonces sus hojas de estilo, scripts, imágenes y modelo 3D resolverán dentro de `apps/web/src/`.
- **CA-06:** Dado que esta tarea es solo estructural, cuando se revise el diff, entonces no habrá conversión a React ni cambios intencionales al diseño o comportamiento.
- **CA-07:** Dada la exigencia de Constitución IV y el feedback del hook, cuando se ejecute `node --test apps/web/src/tests/relocation.test.mjs`, entonces una prueba persistente y sin dependencias nombrará y cubrirá CA-01..CA-06, se nombrará a sí misma como CA-07 y pasará.

## Reglas de negocio

- **RN-01:** El portal institucional pertenece a `apps/web` y su código vive en `apps/web/src/`.
- **RN-02:** La eliminación de la carpeta de origen ocurre únicamente después de verificar que todos sus archivos llegaron al destino.
- **RN-03:** La migración futura a React/Vite requiere una spec independiente.
- **RN-04:** Los archivos Docker no se recrean hasta que una spec de infraestructura sea aprobada.

## Datos, privacidad y auditoría

No se crean ni modifican datos personales, clínicos o financieros. Los assets existentes se trasladan sin alterar su contenido; su origen y licencia deberán revisarse antes de publicación productiva.

## Flujos y errores

1. Inventariar origen, destino y archivos Docker.
2. Confirmar que `apps/web/src/` no contiene archivos con nombres conflictivos, salvo `.gitkeep`.
3. Trasladar el contenido preservando rutas relativas y mover `index.php` a `apps/web/src/`.
4. Cambiar únicamente la redirección de `index.php` a `./index.html`.
5. Eliminar `.gitkeep` del directorio `src/`, porque dejará de estar vacío.
6. Comparar el inventario del destino con el origen.
7. Verificar referencias locales de `index.html`, la redirección de `index.php` y la ausencia de los orígenes.
8. Eliminar los tres archivos Docker y comprobar el estado de Git.

Si aparece una colisión o una referencia fuera de la carpeta, se detiene el traslado y se informa antes de sobrescribir o perder contenido.

## Dependencias, riesgos y preguntas

- Dependencias/ADR: no agrega dependencias ni cambia ADRs.
- Riesgos: enlaces rotos por rutas mal conservadas; assets sin licencia confirmada; el portal seguirá siendo estático y todavía no cumplirá la arquitectura React objetivo.
- Preguntas pendientes: ninguna; se aprobó conservar el portal estático, mover `index.php` ajustando su redirección y eliminar los tres archivos Docker.

## Revisión

- Aprobadores y fecha: Jonathan, 2026-10-06.
- Evidencia/enlaces: implementación `web-001` verificada en `apps/web/tasks/001-relocate-static-portal.md`: inventario de 14 archivos, 14/14 SHA-256 conservados, 10 referencias HTML y 8 referencias CSS locales resueltas sin fallos, redirección PHP validada y orígenes autorizados ausentes. La ampliación por Constitución IV/hook agregó `apps/web/src/tests/relocation.test.mjs`; `node --test apps/web/src/tests/relocation.test.mjs` finalizó con 7 tests, 7 pass, 0 fail. También se ejecutaron `git diff --check` y `git status`. Artefactos relacionados: [spec](../specs/001-relocate-static-portal.md), [plan](../plan/001-relocate-static-portal.md) y [tasks](../tasks/001-relocate-static-portal.md).
