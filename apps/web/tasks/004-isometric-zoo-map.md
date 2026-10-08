# Tareas · 004 · isometric-zoo-map

- Spec: `apps/web/specs/004-isometric-zoo-map.md` (Estado: **Aprobada**)
- Plan: `apps/web/plan/004-isometric-zoo-map.md` (Estado técnico: **Aprobado para tareas**)
- Estado del checklist: Aprobado por el solicitante el 2026-10-08; pruebas automatizadas completas y revisión visual responsive pendiente.

## Trazabilidad

| Criterio / regla | Tareas que lo cubren |
|---|---|
| CA-01 / RN-01 | T-02, T-03, T-06 |
| CA-02 / RN-02, RN-03 | T-02, T-04, T-06 |
| CA-03 / RN-01 | T-02, T-06 |
| CA-04 / RN-04, RN-05 | T-04, T-05, T-06 |
| CA-05 / RN-03, RN-05 | T-03, T-06, T-07 |
| CA-06 | T-06, T-07 |

## Implementación

- [x] **T-01** (CA-01..CA-06): antes de editar superficies compartidas, ejecutar y registrar las pruebas automatizadas de `003-lion-hero-mobile-navigation`, verificar `/verify`/diff y conservar la limitación visual responsive pendiente. La persona solicitante autorizó el 2026-10-08 continuar sobre esta evidencia, sin afirmar que la verificación `scrollWidth` de CA-04 esté completa.
- [x] **T-02** (CA-01..CA-03; RN-01, RN-02): reemplazar el esquema `.map` de `apps/web/src/index.html` por una escena SVG local y una colección de botones semánticos para Felinos, Aviario, Reptilario, Primates, Granja, Lago y Entrada. Mantener la leyenda de servicios (Entrada, Baños, Alimentos, Bebederos, Áreas de descanso, Enfermería y Tiendas), el aviso demostrativo y el área viva; evitar recursos o referencias de proveedores externos.
- [x] **T-03** (CA-01, CA-02, CA-05; RN-01, RN-03, RN-05): implementar en `apps/web/src/styles.css` la superficie de mapa en perspectiva elevada/isométrica con caminos, recintos, niveles y SVG inline con estilo lineal propio; adaptar escena, marcadores, textos e iconos sin ocultar nombres ni provocar overflow. No cambiar paleta ni elementos fuera del mapa.
- [x] **T-04** (CA-02, CA-04; RN-02, RN-03, RN-05): añadir iconos SVG locales a cada marcador y control de la leyenda en `apps/web/src/index.html`; marcar los SVG decorativos como `aria-hidden`, conservar texto visible/nombre accesible y usar botones nativos con `aria-pressed` inicializado correctamente.
- [x] **T-05** (CA-04; RN-04, RN-05): actualizar el controlador de `apps/web/src/script.js` para seleccionar zonas/servicios tanto desde la escena como desde la leyenda, sincronizar resaltado y `aria-pressed` entre controles con el mismo nombre y actualizar la región `aria-live`, manteniendo foco y activación nativa.
- [x] **T-06** (CA-01..CA-06; RN-01..RN-05): agregar tests nombrados CA-01..CA-06 en `apps/web/src/tests/relocation.test.mjs`. Verificar SVG local y topología visual, las 13 zonas/servicios con etiquetas/iconos, aviso de mapa aproximado, selección/resaltado/aria en ambos controles, estilos responsive y solo imports Node builtins. Reutilizar el runner sin manifiesto ni dependencias nuevas; conservar hashes de assets existentes.

## Calidad y entrega

- [ ] **T-07** (CA-01..CA-06): completar, cuando el navegador integrado esté disponible, la revisión visual a 360, 390, 768, 1024 y 1366 px, incluidos `scrollWidth <= innerWidth`, foco, leyenda e interacción real. La persona solicitante autorizó continuar con los tests automatizados y dejar esta limitación documentada; esta tarea no está completada.
- [x] **T-08** (CA-01..CA-06): ejecutar `/verify`, confirmar que `apps/web` continúa no inicializada al no tener `src/package.json`, revisar diffs para conservar los cambios previos del worktree y registrar tests, viewports y assets protegidos.
- [ ] **T-09**: marcar spec, plan y tasks Implementados únicamente después de completar T-01..T-08; enlazar los artefactos en el PR y citar `web-004`.

No se crean rutas, endpoints, migraciones, almacenamiento, permisos de servidor ni dependencias. No se modifican assets ni la biblioteca de modelo 3D existente. No se realiza `git add` ni `git commit` como parte de estas tareas.

## Evidencia de ejecución

- T-01..T-06: implementadas. La escena usa SVG/HTML local; las 13 zonas/servicios tienen controles etiquetados e iconos SVG propios, con `aria-pressed` sincronizado y anuncios en la región viva.
- T-06: `node --test apps/web/src/tests/relocation.test.mjs`: 24 tests, 24 pass, 0 fail. Incluye pruebas nombradas CA-01..CA-06 de esta feature y pruebas de interacción aisladas con `node:vm`; los once assets protegidos conservan sus hashes.
- T-07 pendiente: el navegador integrado no permite mantener el page ID entre apertura e interacción; no se midieron dimensiones reales ni `scrollWidth` en viewports.
- T-08: `/verify` reporta `apps/web` aún no inicializada porque no existe `apps/web/src/package.json`; `node --check apps/web/src/script.js`, `git diff --check` y diagnósticos editoriales pasan.
