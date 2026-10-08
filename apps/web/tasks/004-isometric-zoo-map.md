# Tareas · 004 · isometric-zoo-map

- Spec: `apps/web/specs/004-isometric-zoo-map.md` (Estado: **Implementada**)
- Plan: `apps/web/plan/004-isometric-zoo-map.md` (Estado técnico: **Implementado y verificado**)
- Estado del checklist: Incremento de zoom aprobado por el solicitante el 2026-10-08; tareas implementadas y verificadas.

## Trazabilidad

| Criterio / regla | Tareas que lo cubren |
|---|---|
| CA-01 / RN-01 | T-02, T-03, T-06 |
| CA-02 / RN-02, RN-03 | T-02, T-04, T-06 |
| CA-03 / RN-01 | T-02, T-06 |
| CA-04 / RN-04, RN-05 | T-04, T-05, T-06 |
| CA-05 / RN-03, RN-05 | T-03, T-06, T-07 |
| CA-06 | T-06, T-13, T-14, T-15 |
| CA-07 / RN-05, RN-06 | T-10, T-11, T-12, T-14, T-15 |

## Implementación

- [x] **T-01** (CA-01..CA-06): antes de editar superficies compartidas, ejecutar y registrar las pruebas automatizadas de `003-lion-hero-mobile-navigation`, verificar `/verify`/diff y conservar la limitación visual responsive pendiente. La persona solicitante autorizó el 2026-10-08 continuar sobre esta evidencia, sin afirmar que la verificación `scrollWidth` de CA-04 esté completa.
- [x] **T-02** (CA-01..CA-03; RN-01, RN-02): reemplazar el esquema `.map` de `apps/web/src/index.html` por una escena SVG local y una colección de botones semánticos para Felinos, Aviario, Reptilario, Primates, Granja, Lago y Entrada. Mantener la leyenda de servicios (Entrada, Baños, Alimentos, Bebederos, Áreas de descanso, Enfermería y Tiendas), el aviso demostrativo y el área viva; evitar recursos o referencias de proveedores externos.
- [x] **T-03** (CA-01, CA-02, CA-05; RN-01, RN-03, RN-05): implementar en `apps/web/src/styles.css` la superficie de mapa en perspectiva elevada/isométrica con caminos, recintos, niveles y SVG inline con estilo lineal propio; adaptar escena, marcadores, textos e iconos sin ocultar nombres ni provocar overflow. No cambiar paleta ni elementos fuera del mapa.
- [x] **T-04** (CA-02, CA-04; RN-02, RN-03, RN-05): añadir iconos SVG locales a cada marcador y control de la leyenda en `apps/web/src/index.html`; marcar los SVG decorativos como `aria-hidden`, conservar texto visible/nombre accesible y usar botones nativos con `aria-pressed` inicializado correctamente.
- [x] **T-05** (CA-04; RN-04, RN-05): actualizar el controlador de `apps/web/src/script.js` para seleccionar zonas/servicios tanto desde la escena como desde la leyenda, sincronizar resaltado y `aria-pressed` entre controles con el mismo nombre y actualizar la región `aria-live`, manteniendo foco y activación nativa.
- [x] **T-06** (CA-01..CA-06; RN-01..RN-05): agregar tests nombrados CA-01..CA-06 en `apps/web/src/tests/relocation.test.mjs`. Verificar SVG local y topología visual, las 13 zonas/servicios con etiquetas/iconos, aviso de mapa aproximado, selección/resaltado/aria en ambos controles, estilos responsive y solo imports Node builtins. Reutilizar el runner sin manifiesto ni dependencias nuevas; conservar hashes de assets existentes.

## Calidad y entrega

- [x] **T-07** (CA-01..CA-06): revisar en navegador integrado la escena a 360, 390, 768, 1024 y 1366 px, confirmar `scrollWidth <= innerWidth`, foco, leyenda e interacción.
- [x] **T-08** (CA-01..CA-06): ejecutar `/verify`, confirmar que `apps/web` continúa no inicializada al no tener `src/package.json`, revisar diffs para conservar los cambios previos del worktree y registrar tests, viewports y assets protegidos.
- [x] **T-09**: marcar spec, plan y tasks Implementados tras completar T-01..T-08; los artefactos quedan enlazados en esta checklist para el PR `web-004`.
- [x] **T-10** (CA-07; RN-05, RN-06): en `apps/web/src/index.html`, agrupar el SVG y todos los marcadores en una escena transformable; agregar botones semánticos de acercar, alejar y restablecer, con controles fuera de la escena y estado accesible.
- [x] **T-11** (CA-01, CA-05, CA-07; RN-01, RN-05, RN-06): refinar en `apps/web/src/styles.css` las capas, sombras y profundidad ilustrativa; definir escala visual responsive sin mover los controles ni generar desbordamiento.
- [x] **T-12** (CA-04, CA-07; RN-04..RN-06): en `apps/web/src/script.js`, implementar pasos de escala de 10 % dentro del rango 100–150 %, deshabilitar los botones direccionales al llegar al límite, anunciar la escala y restablecerla a 100 % sin cambiar la selección ni perder foco.
- [x] **T-13** (CA-01, CA-05, CA-06; RN-01, RN-03, RN-05): añadir/actualizar tests nombrados que comprueben profundidad local, escena agrupada y estilos responsive; conservar la cobertura actual de estructura, regiones y dependencias.
- [x] **T-14** (CA-07, CA-06; RN-05, RN-06): añadir un test aislado con `node:vm` para zoom hacia ambos límites, estado deshabilitado, cambio de escala, restablecimiento, anuncio, preservación de selección y foco.
- [x] **T-15** (CA-01, CA-05, CA-07): revisar en navegador 360, 390, 768, 1024 y 1366 px; confirmar zoom por teclado/puntero, interacción con marcadores, regreso a escala inicial y `scrollWidth <= innerWidth`.
- [x] **T-16** (CA-01..CA-07): ejecutar suite enfocada y completa, `git diff --check` y `/verify`; registrar los fallos preexistentes ajenos sin ocultarlos.
- [x] **T-17**: marcar spec, plan y tasks Implementados solo tras completar las verificaciones y preservar el historial de validación inicial.

No se crean rutas, endpoints, migraciones, almacenamiento, permisos de servidor ni dependencias. No se modifican assets ni la biblioteca de modelo 3D existente. No se realiza `git add` ni `git commit` como parte de estas tareas.

## Evidencia de ejecución

- T-01..T-06: implementadas. La escena usa SVG/HTML local; las 13 zonas/servicios tienen controles etiquetados e iconos SVG propios, con `aria-pressed` sincronizado y anuncios en la región viva.
- Evidencia histórica de T-06 (implementación inicial): `node --test apps/web/src/tests/relocation.test.mjs`: 24 tests, 24 pass, 0 fail; los once assets protegidos conservan sus hashes.
- La limitación original de revisión visual quedó resuelta en T-07/T-15 con la validación actual en navegador documentada abajo.
- T-08: `/verify` reporta `apps/web` aún no inicializada porque no existe `apps/web/src/package.json`; `node --check apps/web/src/script.js`, `git diff --check` y diagnósticos editoriales pasan.
- T-07/T-15: revisión en navegador a 360, 390, 768, 1024 y 1366 px; en todos los anchos `documentElement.scrollWidth` coincidió con `clientWidth`, los controles permanecieron dentro de la tarjeta y los tres iconos de visita conservaron centrado y `margin-top: 8px`.
- T-10..T-14: escena agrupada con escala 100–150 % en saltos de 10 %, iconos SVG locales con símbolos internos, profundidad CSS, botones accesibles y estado vivo. La prueba de reset confirma que la selección y el foco sobreviven; el control Reset queda habilitado para no perder foco al volver a 100 %.
- T-16: `node --test apps/web/src/tests/relocation.test.mjs`: 29 tests, 29 pass, 0 fail; `node --check apps/web/src/script.js` y `git diff --check` pasan. En navegador se comprobó además el límite 150 %, estado deshabilitado del zoom de acercamiento y restablecimiento.
- T-16: `/verify` identifica `apps/web` aún no inicializada por falta de `apps/web/src/package.json`; no hay scripts npm de formato, lint, tipos o test que ejecutar. El favicon local responde HTTP 200 `image/jpeg`.
- No se creó PR ni commit en esta tarea; los tres artefactos `web-004` quedan identificados aquí para enlazarlos cuando se abra el PR.
