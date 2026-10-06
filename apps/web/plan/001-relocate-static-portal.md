# Plan técnico · 001 · relocate-static-portal

- Spec: `apps/web/specs/001-relocate-static-portal.md`
- Estado de spec: Implementada
- Responsable técnico: `<por identificar>`
- Fecha del plan: 2026-10-06

## Diseño de solución

Reubicación mecánica del portal institucional desde `portal-web/` hacia `apps/web/src/`, preservando la estructura interna, nombres de archivo y contenido byte a byte. Para evitar pérdida, primero se copia el contenido, se verifica y solo entonces se elimina el origen. El `index.php` de la raíz se copia a `apps/web/src/index.php` y se modifica **únicamente** en la URL de redirección para apuntar a `./index.html` (ruta relativa al nuevo directorio); el original se elimina después de verificar. Se elimina `apps/web/src/.gitkeep` porque `src/` dejará de estar vacío. Se suprimen los artefactos Docker prematuros de la raíz (`Dockerfile`, `docker-compose.yml` y `.dockerignore`).

El cambio es estrictamente estructural: no se convierte el portal a React/TypeScript, no se inicializa Vite, no se modifica diseño, contenido, imágenes, modelo 3D ni comportamiento del portal.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| `apps/web/src/` | `index.html`, `styles.css`, `script.js`, `assets/*` (11 archivos) | Reubicar el portal estático en la carpeta estándar de la app. |
| `apps/web/src/index.php` | `index.php` raíz movido | Punto de entrada PHP que redirige a `./index.html`. |
| `apps/web/src/tests/` | `relocation.test.mjs` | Prueba estructural persistente CA-01..CA-07 con el runner integrado de Node 22, sin package ni dependencias. |
| `apps/web/src/.gitkeep` | Eliminar | `src/` ya no estará vacío tras el traslado. |
| Raíz del repo | `portal-web/`, `index.php`, `Dockerfile`, `docker-compose.yml`, `.dockerignore` | Eliminar origen y archivos Docker tras verificación. |
| `apps/web/specs/` / `plan/` / `tasks/` | `001-relocate-static-portal.md` | Mantener alineación de artefactos SDD. |

## Contrato y datos

- **Endpoints / API:** no aplica. No se crean ni modifican endpoints, controladores, rutas Laravel ni contratos de API.
- **Validación / Form Requests / Actions / Resources / Policies:** no aplica.
- **Migraciones / `BaseModel` / auditoría / SoftDeletes:** no aplica. No se toca base de datos.
- **Errores y compatibilidad:** las referencias locales del HTML (`assets/...`, `styles.css`, `script.js`) permanecen resolvibles dentro de `apps/web/src/` gracias a que se conservan las rutas relativas.

## Seguridad, offline y operación

- **Datos sensibles:** no se crean ni modifican datos personales, clínicos o financieros.
- **Assets:** se trasladan sin alterar; su origen/licencia quedará para revisión posterior según la spec.
- **Secretos:** no se añaden ni eliminan secretos ni archivos `.env`.
- **Infraestructura:** se elimina configuración Docker prematura; no se recrea hasta spec de infraestructura aprobada (RN-04).
- **Observabilidad:** el resultado se verifica con comandos temporales de listado, checksum y `git diff` antes de eliminar el origen. No se añaden scripts auxiliares permanentes, salvo `apps/web/src/tests/relocation.test.mjs`, requerido por Constitución IV y el hook.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| **CA-01** | `node --test apps/web/src/tests/relocation.test.mjs`: comprueba los 14 paths y sus SHA-256 completos contra el contenido de `HEAD:portal-web/`. | `apps/web/src/tests/relocation.test.mjs` |
| **CA-02** | El mismo comando valida el contenido exacto de `apps/web/src/index.php` y su redirección a `./index.html`. | `apps/web/src/tests/relocation.test.mjs` |
| **CA-03** | El mismo comando comprueba que `portal-web/` e `index.php` raíz estén ausentes. | `apps/web/src/tests/relocation.test.mjs` |
| **CA-04** | El mismo comando comprueba la ausencia raíz de `Dockerfile`, `docker-compose.yml` y `.dockerignore`. | `apps/web/src/tests/relocation.test.mjs` |
| **CA-05** | El mismo comando resuelve referencias locales `src`/`href` de HTML y `url()` de CSS, ignorando `http:`, `https:`, `//`, `#` y `data:`. | `apps/web/src/tests/relocation.test.mjs` |
| **CA-06** | El mismo comando rechaza TS/TSX/JSX, manifiesto, configuración Vite y directorios de build/dependencias, y vuelve a comprobar los 14 hashes de `HEAD`. | `apps/web/src/tests/relocation.test.mjs` |
| **CA-07** | El mismo comando confirma que la prueba existe, importa solo builtins autorizados y no requiere `package.json`. | `apps/web/src/tests/relocation.test.mjs` |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| **I. Stack mínimo y portable** | Parcial / excepción aprobada | No se agregan dependencias ni servicios propietarios; se elimina Docker prematuro. El portal sigue siendo HTML/CSS/JS estático, aunque `apps/web` targetea React 19 + TypeScript + Vite; la spec aprobada establece explícitamente que **no** se convierte en este cambio (RN-03, "Fuera de alcance"). |
| **II. La spec manda** | Sí | La implementación parte de la aprobación funcional registrada y `apps/web/specs/001-relocate-static-portal.md` queda con `Estado: Implementada`. El plan limita el alcance exactamente a lo aprobado. |
| **III. Lógica separada de la interfaz** | Sí | No hay lógica de negocio en el portal estático ni se toca `apps/api`. El cambio es puramente de ubicación de assets y presentación. |
| **IV. Un test por criterio** | Sí | `node --test apps/web/src/tests/relocation.test.mjs` ejecuta tests nombrados CA-01..CA-07 con Node 22 integrado, sin manifiesto ni dependencias; la ampliación responde al feedback del hook. |
| **V. Una sola fuente de verdad para los datos** | Sí | No se crean ni modifican tablas, modelos, migraciones ni datos. No hay impacto en MySQL. |
| **VI. Código en inglés, personas en español** | Sí | Nombres de archivos e identificadores en inglés (`index.html`, `styles.css`, `script.js`, `assets/`). Contenido visible del portal y documentación en español. |

Ninguna excepción se implementa sin revisión y acuerdo requeridos. La excepción del stack queda documentada y aprobada por la spec.

## Riesgos y decisiones

- **ADR requerido/aprobado:** ninguno. No se introducen tecnologías nuevas ni se modifican ADRs existentes.
- **Alternativas y mitigaciones:**
  - *Riesgo:* conteo incorrecto de archivos o pérdida de contenido. *Mitigación:* verificación por checksum `sha256sum` y listado recursivo antes de eliminar `portal-web/`.
  - *Riesgo:* referencias locales rotas tras el traslado. *Mitigación:* script que resuelva cada `src`/`href` relativo contra `apps/web/src/`.
  - *Riesgo:* referencias en `styles.css` a imágenes de fondo no detectadas por el parser de `index.html`. *Mitigación:* inspección manual/grep de `url(` en `styles.css` y confirmación de que las rutas apuntan a `assets/`.
  - *Decisión:* conservar el portal estático tal cual; la futura migración a React/Vite requiere una spec independiente (RN-03).

## Orden y aprobación

1. **Aprobación técnica de este plan** antes de cualquier implementación.
2. **Preparar `tasks/001-relocate-static-portal.md`** con pasos T-xx atómicos (T-01 inventariar, T-02 mover, T-03 ajustar `index.php`, T-04 eliminar `.gitkeep`, T-05 verificar, T-06 eliminar origen, T-07 eliminar Docker, T-08 `git status`).
3. **Ejecutar tareas** en orden; no eliminar `portal-web/` ni el `index.php` raíz hasta que las verificaciones CA-01, CA-02 y CA-05 pasen.
4. **Revisión técnica** con `git diff`, `git status` y los scripts de verificación.
5. **Aprobador funcional:** Jonathan (2026-10-06). **Aprobación técnica:** Jonathan (2026-10-06).

**Estado técnico:** Aprobado para implementar.

> No se realiza `git add` ni `git commit` como parte de este plan.
