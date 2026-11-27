# Plan técnico · 015 · mobile-responsive-experience

- Spec: `apps/pwa/specs/015-mobile-responsive-experience.md`
- Estado de spec: Aprobada
- Responsable técnico: Equipo de desarrollo PWA (aprobado por usuario solicitante, 2026-11-26)

## Diseño de solución

Mejora estrictamente visual y de usabilidad móvil en `apps/pwa` (`360px`–`760px`), preservando el diseño de escritorio, el formato de impresión (`@media print` y `.print-sheet`) y el comportamiento funcional/offline existente.

1. **Navegación inferior móvil y cierre de sesión (`AppShell.tsx`, `styles.css`, `index.html`)**:
   - Agregar `viewport-fit=cover` al `<meta name="viewport">` de `apps/pwa/index.html` para habilitar `env(safe-area-inset-*)`.
   - En `.navigation-mobile`, conservar `grid-template-columns: repeat(5, minmax(0, 1fr))` como base (compatibilidad `pwa-001` CA-04) y para 6 o más ítems (`.navigation-mobile:has(> :nth-child(6))`) usar un contenedor flex horizontal de una sola fila con `overflow-x: auto`, `scroll-snap-type: x proximity`, sin salto de línea y ancho cómodo por ítem (`flex: 0 0 max(68px, calc(100% / 5.3))`) para que la 6.ª opción asome parcialmente como señal visual de desplazamiento. Al cambiar de sección en móvil, desplazar suavemente el botón activo al centro (`scrollIntoView` protegido para SSR/jsdom).
   - Ubicar el botón compacto «Salir» (`aria-label="Cerrar sesión"`) en `.topbar` (visible solo en `<= 760px`, oculto en escritorio e impresión) y eliminar `.mobile-logout` al pie del scroll; mostrar además el nombre del usuario en `.topbar` o subtítulo sin saturar.
2. **Avisos flotantes (`styles.css`)**:
   - En `@media (max-width: 760px)`, reubicar `.sync-notices` en la parte superior (`inset-block-start: max(12px, env(safe-area-inset-top))`, `inset-block-end: auto`, centrado horizontalmente `inset-inline: 12px`) con animación descendente sutil, evitando cualquier solapamiento con la barra inferior o botones de envío.
3. **Tablas responsivas con `data-label` sin duplicar DOM (`AnimalProfileView.tsx`, `SyncStatusView.tsx`, `DiagnosisIntenseView.tsx`, `styles.css`)**:
   - Usar atributo `data-label="..."` en cada `<td>` de las tablas de historial clínico, contención química (lectura y captura) y cola de Sync, más una clase semántica (`.responsive-table`, `.restraint-edit-table`) que en `@media (max-width: 760px)` (y excluida de `@media print`) transforma cada `<tr>` en una tarjeta apilada (`display: grid` / `display: block`), oculta `<thead>` visualmente (manteniéndolo accesible para lectores de pantalla) y muestra la etiqueta de cada campo mediante `td::before { content: attr(data-label); }`.
   - Ventaja clave: cero duplicación de `<input>` en `DiagnosisIntenseView` (los `name` y `aria-label` se mantienen únicos en `<form>`), cero scroll horizontal forzado en móvil, historial expandido (`<EvaluationItem>`) que cabe en el 100 % del ancho móvil (`.profile-evaluation-row td::before { display: none }`), y tablas intactas en escritorio e impresión.
   - Reemplazar usos impropios de `.form-actions` en cabeceras/celdas por clases dedicadas: `.sync-toolbar`, `.profile-hero-actions`, `.profile-row-actions`, `.review-actions`.
4. **Formularios clínicos, directorio, solicitud de especies y diálogos (`styles.css`, `DiagnosisQuickView.tsx`, `DiagnosisPrint.tsx`, `AnimalFormView.tsx`, `AnimalsView.tsx`, `SpeciesRequestView.tsx`)**:
   - En `DiagnosisQuickView.tsx`, estilizar `.print-signature` con una línea CSS flexible (`.signature-line`) o ajuste seguro en móvil para evitar desbordamiento por guiones bajos fijos.
   - En `<= 520px`, apilar `.form-actions` a `1fr` (ancho completo, `min-height: 44px`, fuente legible `14px`) en formularios, `PrintActions` y diálogos, manteniendo el orden de `pwa-005` (`.species-request-form .form-actions [type="submit"] { order: -1; }`).
   - Aumentar áreas táctiles en móvil: `.check-group label` (`min-height: 44px`), `.table-input` (`min-height: 44px`), `.clear-image-btn` (`40px × 40px` en móvil), `.segmented` (`width: 100%`, 2 columnas iguales, `min-height: 44px`), `.ficha-chip` (`min-height: 44px`).
   - En `AnimalsView`, limpiar la regla sobrescrita de `.animal-row` en `<= 520px`, adaptar `.animal-row-button`, `.animals-results-toolbar` / `.animals-sort` (sin romper posición relativa exigida por `pwa-011` CA-03) y aplicar a `.animals-card .pagination-bar` el patrón móvil de `OwnSpeciesRequestsView`.
   - Ajustar `.arca-dialog` en móvil (`<= 520px`) dentro de `apps/pwa/src/styles.css` (padding compacto `18px`, botones apilados a `1fr`).

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| API / datos | Ninguno | Sin cambios de backend, contratos ni BD |
| Cliente (`apps/pwa`) | `apps/pwa/index.html` | Añadir `viewport-fit=cover` para áreas seguras móviles |
| Cliente (`apps/pwa`) | `apps/pwa/src/styles.css` | Estilos móviles para barra horizontal, toasts arriba, tablas-tarjeta, acciones, áreas táctiles, paginación y diálogos |
| Cliente (`apps/pwa`) | `apps/pwa/src/views/AppShell.tsx` | Botón compacto «Salir» en `.topbar` en móvil y desplazamiento al ítem activo |
| Cliente (`apps/pwa`) | `apps/pwa/src/views/AnimalProfileView.tsx` | Atributos `data-label`, clases de acciones limpias y evaluación expandida adaptable |
| Cliente (`apps/pwa`) | `apps/pwa/src/views/SyncStatusView.tsx` | Cabecera `.sync-toolbar` y atributos `data-label` en cola de sincronización |
| Cliente (`apps/pwa`) | `apps/pwa/src/views/DiagnosisIntenseView.tsx` | Atributos `data-label` y clase `.restraint-edit-table` en tabla editable de contención química |
| Cliente (`apps/pwa`) | `apps/pwa/src/views/DiagnosisQuickView.tsx` | Línea de firma adaptable sin desbordamiento en 360 px |
| Cliente (`apps/pwa`) | `apps/pwa/src/views/ReviewFormView.tsx` | Clase `.review-actions` en lugar de `.form-actions` |
| Cliente (`apps/pwa`) | `apps/pwa/src/components/Icon.tsx`, `AppShell.tsx`, `HomeView.tsx` | Rediseñar los iconos `animals`/`paw` (huella animal clara) y `species` (catálogo abierto) para diferenciarlos de inmediato |
| Pruebas (`apps/pwa`) | `apps/pwa/src/tests/mobile-responsive-experience.test.tsx` | Pruebas automatizadas Vitest cubriendo `CA-01` a `CA-08` |

## Contrato y datos

- Endpoints con rutas nombradas, autenticación y permisos: sin cambios.
- Validación/Form Requests, Actions, Resources y Policies: sin cambios.
- DBR relacionada: no aplica (cambio puramente visual/UI en `apps/pwa`).
- Errores y compatibilidad: se preservan todos los atributos `name`, `aria-label`, `aria-current`, `role`, clases probadas y reglas de `pwa-001`, `pwa-005`, `pwa-011` y `pwa-014`.

## Seguridad, offline y operación

- No altera almacenamiento local (`IndexedDB`), sincronización (`outbox`/`sync-manager`) ni confirmación de cierre con pendientes (`LogoutConfirmDialog`, `pwa-012`).
- El botón móvil «Salir» en `.topbar` invoca el mismo callback `onLogout` que respeta el flujo de confirmación de pendientes.
- No afecta conectividad ni configuración de despliegue.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | Verifica fila única horizontal en `.navigation-mobile` para 6–7 ítems, `aria-label` completos, botón móvil de cerrar sesión en `.topbar` y sin `.mobile-logout` al pie | `apps/pwa/src/tests/mobile-responsive-experience.test.tsx` |
| CA-02 | Verifica posicionamiento superior de `.sync-notices` en `@media (max-width: 760px)` y conservación de cierre accesible en `ToastCenter` | `apps/pwa/src/tests/mobile-responsive-experience.test.tsx` |
| CA-03 | Verifica `data-label` y clases responsivas en historial clínico, contención química y acciones de `AnimalProfileView` sin `.form-actions` en celdas ni hero | `apps/pwa/src/tests/mobile-responsive-experience.test.tsx` |
| CA-04 | Verifica `.sync-toolbar` y `data-label` en la tabla de `SyncStatusView` y reglas móviles en `styles.css` | `apps/pwa/src/tests/mobile-responsive-experience.test.tsx` |
| CA-05 | Verifica `data-label` y `.restraint-edit-table` en `DiagnosisIntenseView` (inputs únicos), firma adaptable en `DiagnosisQuickView`, `.review-actions` en `ReviewFormView` y áreas táctiles (`>= 40px`/`44px`) en `styles.css` | `apps/pwa/src/tests/mobile-responsive-experience.test.tsx` |
| CA-06 | Verifica reglas móviles de `.animal-row-button`, `.animals-card .pagination-bar`, `.segmented` ancho completo (`>= 44px`) y `.arca-dialog` en `styles.css` | `apps/pwa/src/tests/mobile-responsive-experience.test.tsx` |
| CA-07 | Verifica `viewport-fit=cover` en `index.html`, ausencia de `overflow-x: hidden/clip` en `html`/`body`/`#root` y suite completa verde (`npm test`, `npm run build`) | `apps/pwa/src/tests/mobile-responsive-experience.test.tsx` + `responsive.test.tsx` |
| CA-08 | Verifica el rediseño de `animals`/`paw` (huella con 4 dedos y almohadilla) y el icono diferenciado `species` en `AppShell` y `HomeView` | `apps/pwa/src/tests/mobile-responsive-experience.test.tsx` |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Solo React 19, TypeScript, CSS estándar y Vite 7; cero dependencias nuevas |
| II. La spec manda | Sí | `specs/015-mobile-responsive-experience.md` aprobada + `plan/` y `tasks/` con mismo slug |
| III. Lógica separada de la interfaz | Sí | Cero lógica de negocio ni `fetch` en vistas; solo presentación responsiva |
| IV. Un test por criterio | Sí | `mobile-responsive-experience.test.tsx` nombra y verifica `CA-01` a `CA-07` |
| V. Una sola fuente de verdad para los datos | Sí | Sin cambios de BD, migraciones ni almacenamiento offline |
| VI. Código en inglés, personas en español | Sí | Clases/identificadores CSS y TS en inglés; etiquetas y textos visibles en español |

## Riesgos y decisiones

- ADR requerido/aprobado: ninguno (usa el stack vigente de ADR 0002).
- Alternativas y mitigaciones:
  - Se evita duplicar nodos `<input>` para la tabla editable de contención química usando CSS responsivo con `data-label`, lo que garantiza envío íntegro de `FormData` y compatibilidad con `diagnosis.test.tsx`.
  - Se conserva `grid-template-columns: repeat(5, minmax(0, 1fr))` en `.navigation-mobile` base para mantener compatibilidad con `responsive.test.tsx` (`pwa-001`), activando la fila horizontal deslizable cuando existen 6 o más ítems.
  - Todas las reglas de tabla-tarjeta quedan dentro de `@media screen and (max-width: 760px)` para nunca interferir con `@media print` ni con la captura PDF de `.print-sheet`.

## Orden y aprobación

1. Actualizar `index.html` y `AppShell.tsx` + estilos de navegación móvil, encabezado y toasts (`CA-01`, `CA-02`, `CA-07`).
2. Adaptar `AnimalProfileView.tsx` y `SyncStatusView.tsx` + estilos de tablas-tarjeta y acciones (`CA-03`, `CA-04`).
3. Adaptar `DiagnosisIntenseView.tsx`, `DiagnosisQuickView.tsx`, `ReviewFormView.tsx`, `AnimalFormView.tsx`, `AnimalsView.tsx`, `SpeciesRequestView.tsx` y diálogos en `styles.css` (`CA-05`, `CA-06`).
4. Agregar `apps/pwa/src/tests/mobile-responsive-experience.test.tsx`, correr `npm test` y `npm run build` (`CA-07`) y verificar visualmente en móvil (`360px` / `390px`).
- Aprobación funcional y autorización para plan/tareas/implementación: Usuario solicitante, 2026-11-26.
