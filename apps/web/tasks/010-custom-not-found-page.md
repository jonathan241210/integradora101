# Tareas · 010 · custom-not-found-page

- Spec: `apps/web/specs/010-custom-not-found-page.md` (Estado: **Implementada**)
- Plan: `apps/web/plan/010-custom-not-found-page.md` (Estado técnico: **Implementado y verificado, 2026-11-10**)
- Estado del checklist: Implementado y verificado, 2026-11-10

## Trazabilidad

| Criterio / regla | Tareas que lo cubren |
|---|---|
| CA-01 / RN-02, RN-04 | T-01, T-04, T-08 |
| CA-02 / RN-03 | T-01, T-04, T-08 |
| CA-03 / RN-02, RN-04 | T-01, T-04, T-08 |
| CA-04 / RN-01, RN-03, RN-05 | T-02, T-05, T-06, T-08 |
| CA-05 / RN-01, RN-05 | T-03, T-07, T-08 |
| CA-06 / RN-04 | T-01, T-02, T-03, T-08 |

## Base de datos

No aplica. La feature no crea ni modifica datos, esquemas, funciones, procedimientos, migraciones o conexiones; no requiere DBR.

## Pruebas primero

- [x] **T-01** (CA-01, CA-02, CA-03, CA-06; RN-02..RN-04): crear `apps/web/src/tests/not-found.test.mjs` únicamente con módulos integrados de Node. Añadir pruebas nombradas por criterio que verifiquen identidad institucional, mensaje español, recurso CSS local, tres enlaces y destinos existentes, semántica/accesibilidad, foco visible, ausencia de recursos remotos y ausencia de un manifiesto nuevo. Ejecutarlas y registrar el fallo esperado antes de implementar la página.
- [x] **T-02** (CA-04, CA-06; RN-01, RN-03, RN-05): añadir en la misma suite una prueba de integración que reserve un puerto efímero, inicie `php -S` con `router.php`, espere disponibilidad, compruebe `404`, `Content-Type`, cuerpo y ausencia de redirección para una URL inexistente, confirme `200` para archivos existentes y termine el proceso en limpieza. Registrar el fallo esperado antes de implementar el router.
- [x] **T-03** (CA-05, CA-06; RN-01, RN-05): añadir una prueba nombrada que valide en `infra/README.md` el documento de error, la conservación del estado HTTP `404`, la comprobación `200` de páginas válidas y que no se declare un proveedor de producción. Registrar el fallo esperado antes de actualizar la documentación.

## Implementación

- [x] **T-04** (CA-01, CA-02, CA-03; RN-02..RN-04): crear `apps/web/src/404.html` con cabecera y pie institucionales reducidos, un solo `h1`, código `404`, explicación en español y enlaces visibles «Volver al inicio», «Ver noticias» y «Ver eventos» hacia `/index.html`, `/noticias.html` y `/eventos.html`. Añadir a `styles.css` selectores `not-found-*` adaptables que usen tokens existentes, con foco visible y sin alterar las páginas actuales. No cargar JavaScript, API, formularios ni recursos remotos.
- [x] **T-05** (CA-04; RN-01, RN-03, RN-05): crear `apps/web/src/router.php`. Separar la ruta de la query, decodificarla de forma segura, resolver recursos con `realpath`, comprobar que permanezcan dentro del document root y devolver `false` solo para recursos existentes permitidos. Para recursos inexistentes, responder `404` con `text/html; charset=UTF-8` y `404.html`; si la página no puede leerse, conservar el estado con un cuerpo mínimo en español sin traza ni rutas internas.
- [x] **T-06** (CA-04; RN-01, RN-03): actualizar `apps/web/README.md` con el comando `php -S localhost:8080 -t apps/web/src apps/web/src/router.php`, conservar la advertencia de CORS y añadir comandos `curl` para demostrar `404` en una URL inválida y `200` en las páginas existentes.
- [x] **T-07** (CA-05; RN-01, RN-05): añadir a `infra/README.md` un checklist «Portal público: página no encontrada» que exija configurar `404.html` como documento de error del futuro servidor, conservar el código HTTP `404`, comprobar páginas válidas en `200` y guardar evidencia. Indicar expresamente que la sintaxis específica se define cuando se elija hosting.

## Calidad y entrega

- [x] **T-08** (CA-01..CA-06; RN-01..RN-05): ejecutar `node --test apps/web/src/tests/not-found.test.mjs`, `node --test apps/web/src/tests/relocation.test.mjs` y `node --test apps/web/src/tests/news-events.test.mjs`; realizar las comprobaciones HTTP documentadas; ejecutar `git diff --check` y `/verify`. Revisar visualmente `404.html` a 360, 768 y 1366 px, navegación por teclado, foco visible, ausencia de desbordamiento y carga sin JavaScript. Registrar por separado cualquier fallo preexistente.
- [x] **T-09** (CA-01..CA-06): ejecutar `/constitution-check`, confirmar que no hay dependencias, secretos, datos, DBR ni configuración propietaria, y enlazar spec, plan y tasks en la entrega. Marcar la spec como Implementada y cerrar este checklist únicamente cuando todas las tareas y pruebas estén verificadas.

No se agregan dependencias, manifiestos, endpoints, permisos, migraciones ni cambios de base de datos. No se configura un proveedor de producción y no se realiza `git add`, commit, push o despliegue dentro de estas tareas.

## Evidencia de ejecución

- Prueba inicial antes de implementar: CA-01..CA-05 fallaron por faltar `404.html`, `router.php` y el checklist; CA-06 pasó al conservar la suite sin dependencias.
- Suite enfocada final: `node --test apps/web/src/tests/not-found.test.mjs` — 6 tests, 6 aprobados, 0 fallidos. Incluye HTTP `404` real, `Content-Type`, ausencia de redirección, páginas válidas en `200` y bloqueo de una ruta traversal codificada.
- Regresión de noticias y eventos: 18 tests, 18 aprobados, 0 fallidos.
- Suite estructural histórica: 45 tests, 39 aprobados y 6 fallidos. Los seis fallos son preexistentes y ajenos a `web-010`: navegación móvil (`$` no definido en el harness), selección/zoom del mapa (`mapSection` no definido en el harness), margen histórico de `.info-icon`, capa de animales del header y resumen cognitivo ausente.
- Sintaxis: `php -l apps/web/src/router.php` sin errores; `git diff --check` sin errores.
- Revisión visual: 360, 768 y 1366 px; sin desbordamiento horizontal, los tres enlaces visibles, diseño adaptable y foco por teclado con contorno sólido de 3 px.
- `/verify`: `apps/web` se reporta aún no inicializada porque no existe `apps/web/src/package.json`; por ello no hay scripts npm de formato, lint, tipos o test. Se ejecutaron directamente las suites Node persistentes del portal.
- `/constitution-check`: principios I–VI cumplen; no hay dependencia, lógica de negocio, datos, DBR, secretos, colores de marca nuevos fijados directamente ni configuración propietaria de producción.
