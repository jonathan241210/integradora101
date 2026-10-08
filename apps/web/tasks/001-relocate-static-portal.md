# Tareas · 001 · relocate-static-portal

- Spec: `apps/web/specs/001-relocate-static-portal.md` (Estado: **Implementada**)
- Plan: `apps/web/plan/001-relocate-static-portal.md` (Estado técnico: **Aprobado para implementar**)
- Estado del checklist: **Aprobado** por Jonathan el 2026-10-06. No se realiza `git add` ni `git commit` como parte de estas tareas.
- Nota operativa: las verificaciones históricas usaron comandos temporales de shell (`find`, `sha256sum`, `grep`, `test`, `git diff`/`git status`). **No se crean scripts auxiliares permanentes**, salvo la prueba aprobada `apps/web/src/tests/relocation.test.mjs` exigida por Constitución IV y el hook; `verify-references.sh` mencionado en el plan se ejecutó como verificación puntual y se descartó.

## Trazabilidad

| Criterio / regla | Tareas que lo cubren |
|---|---|
| CA-01 (contenido trasladado) | T-01, T-03, T-06 (verificación explícita) |
| CA-02 (index.php reubicado y redirige a `./index.html`) | T-04, T-06 (verificación explícita) |
| CA-03 (origen eliminado) | T-07, T-09 (verificación explícita) |
| CA-04 (archivos Docker eliminados) | T-08, T-09 (verificación explícita) |
| CA-05 (referencias locales resuelven) | T-06 (verificación explícita), T-09 |
| CA-06 (cambio estrictamente estructural) | T-09 (verificación explícita), T-10 |
| CA-07 (prueba persistente sin dependencias) | T-10, T-11 |
| RN-01 (código del portal en `apps/web/src/`) | T-03, T-04 |
| RN-02 (eliminar origen solo tras verificar) | T-06 → T-07 (orden obligatorio) |
| RN-03 (sin migración a React/Vite en este cambio) | T-09 (verificación de ausencia de `*.ts`/`*.tsx`/`*.jsx`, build y dependencias) |
| RN-04 (no recrear archivos Docker) | T-08, T-09 |

## Implementación

- [x] **T-01** (CA-01, preparación de CA-02/CA-04): inventariar el estado inicial con comandos temporales. Listar recursivamente los **14 archivos** de `portal-web/` (`index.html`, `styles.css`, `script.js` y 11 archivos en `assets/`: `dog.jpg`, `fox.jpg`, `giraffe.jpg`, `greenery.jpg`, `lion.jpg`, `macaw.jpg`, `model-viewer.min.js`, `nyilonelycompany-nature-51.glb`, `savanna.jpg`, `TransformandoTulancingo-2024-300x261.png`, `turtle.jpg`) y registrar el SHA-256 de cada uno (`find portal-web -type f | sort` + `sha256sum`). Registrar también `index.php`, `Dockerfile`, `docker-compose.yml` y `.dockerignore` de la raíz. Guardar el inventario como referencia para T-06.
- [x] **T-02** (RN-02, seguridad del traslado): verificar que el destino `apps/web/src/` contiene **únicamente `.gitkeep`** y que ninguno de los 14 nombres de archivo ni `index.php` colisiona. Si existe cualquier colisión o contenido inesperado, detenerse e informar antes de continuar (flujo de error de la spec).
- [x] **T-03** (CA-01, RN-01): copiar los 14 archivos de `portal-web/` a `apps/web/src/` preservando rutas relativas y contenido byte a byte (`apps/web/src/index.html`, `apps/web/src/styles.css`, `apps/web/src/script.js`, `apps/web/src/assets/*`). No modificar el contenido ni eliminar todavía el origen.
- [x] **T-04** (CA-02, RN-01): copiar `index.php` de la raíz a `apps/web/src/index.php` y editar **únicamente** la línea `Location`: cambiar `header('Location: /portal-web/', true, 302);` por `header('Location: ./index.html', true, 302);`. Ningún otro cambio en el archivo.
- [x] **T-05** (limpieza estructural): eliminar `apps/web/src/.gitkeep`, porque `src/` deja de estar vacío.
- [x] **T-06** (verificación explícita de **CA-01**, **CA-02** y **CA-05**, gate de RN-02): con el origen todavía intacto, comprobar:
  - **CA-01:** los mismos 14 paths del inventario de T-01 existen bajo `apps/web/src/` y cada SHA-256 coincide archivo por archivo.
  - **CA-02:** `grep -E "^header\('Location: \./index\.html', true, 302\);$" apps/web/src/index.php` retorna exactamente una línea y el archivo no tiene otros cambios respecto al original salvo `Location`.
  - **CA-05:** verificación temporal que parsea `src`/`href` de `apps/web/src/index.html` (excluyendo `http://`, `https://`, `//` y `#`) y confirma que cada ruta relativa resuelve a un archivo existente bajo `apps/web/src/`; además inspeccionar con `grep` las referencias `url(...)` de `styles.css` y confirmar que apuntan a `assets/`.
  - Si alguna verificación falla, detenerse y corregir el traslado; **no** pasar a T-07.
- [x] **T-07** (CA-03, RN-02): solo tras pasar T-06, eliminar `portal-web/` completo y el `index.php` de la raíz.
- [x] **T-08** (CA-04, RN-04): eliminar `Dockerfile`, `docker-compose.yml` y `.dockerignore` de la raíz. No recrearlos.
- [x] **T-09** (verificación explícita de **CA-03**, **CA-04**, **CA-05** y **CA-06**): comprobar en la raíz del repo:
  - **CA-03:** `test ! -d portal-web && test ! -f index.php`.
  - **CA-04:** `test ! -f Dockerfile && test ! -f docker-compose.yml && test ! -f .dockerignore`.
  - **CA-05:** reejecutar la resolución de referencias de `index.html` y `url()` de `styles.css` en la ubicación final.
  - **CA-06 / RN-03:** `git diff --stat` muestra solo renombrados/adiciones/eliminaciones sin modificación de contenido; `find apps/web/src -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.jsx' \)` retorna vacío; no hay `package.json`, `vite.config.*`, `node_modules` ni archivos de build nuevos.
  - Revisar `git status` y `git diff` finales; registrar el resultado como evidencia.

## Calidad y entrega

- [x] **T-10** (CA-01..CA-07, Constitución IV; requisito constitucional aprobado): crear `apps/web/src/tests/relocation.test.mjs` solo con módulos builtin autorizados y ejecutar `node --test apps/web/src/tests/relocation.test.mjs` hasta que pasen sus siete tests nombrados. Mantener además la evidencia previa de las verificaciones temporales.
- [x] **T-11**: actualizar el estado de la spec a **Implementada** al cumplir la definición de terminado y resolver la cobertura automatizada exigida por la Constitución; ejecutar `git diff --check` y revisar `git status`; enlazar spec, plan y tasks en el PR citando `web-001`. No realizar `git add` ni `git commit` como parte de estas tareas.

## Evidencia de ejecución

- **T-01/T-02:** inventario confirmado: 14 archivos en `portal-web/` (3 raíz + 11 en `assets/`); `apps/web/src/` contenía únicamente `.gitkeep`. Orígenes raíz presentes: `index.php`, `Dockerfile`, `docker-compose.yml` y `.dockerignore`.
- **T-03..T-06:** 14/14 rutas copiadas y 14/14 SHA-256 idénticos antes de eliminar el origen. SHA-256: `dog.jpg` `b385db55…4c5`, `fox.jpg` `6a376ff6…d2f`, `giraffe.jpg` `f4d6d123…da8b`, `greenery.jpg` `485c73ae…55d`, `lion.jpg` `e4e0935b…14eb`, `macaw.jpg` `7b436a17…087`, `model-viewer.min.js` `2dd52b72…0af7`, `nyilonelycompany-nature-51.glb` `dcf01e6d…2fed`, `savanna.jpg` `14eb1c03…f47e`, `TransformandoTulancingo-2024-300x261.png` `ab2ddf98…c8b3`, `turtle.jpg` `c65d5b67…db8`, `index.html` `2711040d…e4b`, `script.js` `222b3dda…54f`, `styles.css` `f5546b91…265e`.
- **CA-02:** `apps/web/src/index.php` coincide byte a byte con el original salvo el único reemplazo `/portal-web/` → `./index.html`; la línea `Location` esperada aparece exactamente una vez.
- **CA-05:** 10 referencias locales `src`/`href` y 8 referencias `url()` CSS comprobadas; 0 rotas.
- **T-07..T-09:** ausentes `portal-web/`, `index.php`, `Dockerfile`, `docker-compose.yml` y `.dockerignore` en raíz. Permanecen 14/14 hashes esperados en destino; 0 archivos `*.ts`, `*.tsx` o `*.jsx`; sin `package.json`, `vite.config.*`, `node_modules`, `dist` ni `build` nuevos en `apps/web/src/`.
- **Git:** se revisaron `git diff --stat`, `git diff --summary` y `git status --short`; no se ejecutaron `git add` ni `git commit`. Git muestra los orígenes como eliminados y los destinos/artefactos SDD como no rastreados hasta que el responsable prepare el PR. No quedan archivos temporales de verificación.
- **T-10 / CA-01..CA-07 / Constitución IV:** `node --test apps/web/src/tests/relocation.test.mjs` ejecutó la prueba persistente sin dependencias con resultado final exacto: **7 tests, 7 pass, 0 fail, 0 skipped, 0 todo**.

## Fuera de alcance (recordatorio)

- No convertir a React/TypeScript ni inicializar Vite/Tailwind/`package.json` (RN-03).
- No modificar diseño, contenido, imágenes, modelo 3D ni comportamiento del portal.
- No recrear archivos Docker (RN-04).
- No crear scripts auxiliares permanentes, salvo `apps/web/src/tests/relocation.test.mjs` exigido por Constitución IV y el hook.

## Enmienda aprobada por `002-brand-color-refresh`

La feature `002-brand-color-refresh` autorizó cambios de paleta en `apps/web/src/styles.css`; `003-lion-hero-mobile-navigation` autorizó cambios limitados al menú en `index.html`/`script.js` y al degradado/responsive en `styles.css`; `004-isometric-zoo-map` autoriza cambios limitados de la sección del mapa en esos mismos archivos. La evidencia de T-03..T-06 y la verificación de 14/14 hashes de esta tarea son históricas y corresponden al momento de la reubicación. La prueba persistente conserva los hashes de los 11 assets fuera del alcance y verifica las referencias estructurales, el tema, la navegación y el mapa mediante tests de las specs aprobadas.
