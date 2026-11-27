# 015 · mobile-responsive-experience

- App dueña: `pwa`
- Apps/paquetes afectados: `apps/pwa`
- Estado: En progreso
- Solicitante / responsable funcional: Usuario solicitante (confirmado en conversación)
- Aprobación funcional: Aprobada por usuario solicitante, 2026-11-26

## Problema y contexto

La PWA veterinaria (`apps/pwa`) incorporó múltiples módulos después de `pwa-001` (sincronización offline `pwa-009`, listado y foto de perfil `pwa-010`, carga/avisos `pwa-011`, seguridad offline `pwa-012`, estatus de estancia/visitas `pwa-013` y `pwa-014`, y solicitudes de especies `pwa-005`). Varias de estas pantallas y controles quedaron diseñados para escritorio o presentan conflictos de layout en pantallas móviles (360–520 px y hasta 760 px):

1. **Barra de navegación inferior (`AppShell`)**: para el rol `veterinarian` existen 7 secciones (`Inicio`, `Lista`, `Alta`, `Diagnóstico`, `Revisión`, `Sync`, `Especies`), pero `.navigation-mobile` solo contempla hasta 6 columnas, haciendo que el 7.º ítem salte a una segunda fila, tape contenido y comprima etiquetas. Además, «Cerrar sesión» queda al final del scroll de la página.
2. **Avisos de sincronización (`ToastCenter`)**: `.sync-notices` se fija en la parte inferior derecha y en móvil se superpone directamente sobre la barra de navegación inferior.
3. **Tablas anchas sin vista móvil**:
   - **Perfil del animal (`AnimalProfileView`)**: la tabla de historial clínico (7 columnas) y la tabla de contención química (5 columnas) obligan a scroll horizontal; además, al pulsar «Ver» una evaluación se expande dentro de un `<td colSpan={7}>` ancho. Las acciones de la tabla y del encabezado usan `.form-actions` con borde superior y rejilla de 2 columnas que rompen la alineación en móvil.
   - **Sincronización (`SyncStatusView`)**: la cabecera usa `.form-actions` con estilo en línea y la cola es una tabla de 6 columnas con scroll horizontal.
4. **Formularios clínicos y áreas táctiles**:
   - **Diagnóstico intenso (`DiagnosisIntenseView`)**: la tabla editable de contención química (`min-width: 640px`) tiene celdas con inputs de `32px` y exige scroll horizontal en móvil; la barra de acciones con 3 botones («Siguiente/Anterior», «Guardar diagnóstico», «Descargar PDF») queda desbalanceada en una rejilla `1fr 1fr` en `<= 520px`.
   - **Diagnóstico rápido (`DiagnosisQuickView`)**: la línea de firma usa guiones bajos fijos (`______________________`) que pueden causar desbordamiento en 360 px; las casillas y radios en `.check-group` carecen de área táctil cómoda (`>= 44px`).
   - **Registrar revisión (`ReviewFormView`)**: usa `.form-actions` como único bloque de la tarjeta, mostrando borde superior innecesario y botones comprimidos en móvil.
   - **Registrar animal (`AnimalFormView`)**: el botón para eliminar foto (`.clear-image-btn`) mide `28×28 px`.
5. **Directorio, solicitudes y diálogos**:
   - **Animales (`AnimalsView`)**: la regla móvil de `.animal-row` queda anulada por una regla posterior en `styles.css`, `.animal-row-button` no tiene adaptación para pantallas de 360 px y la paginación no aplica el layout móvil que sí usa `OwnSpeciesRequestsView`.
   - **Solicitar especie (`SpeciesRequestView`)**: el selector segmentado (`.segmented`) queda angosto y con `34px` de alto en móvil.
   - **Diálogos modales (`Dialog`)**: en `<= 520px`, el padding fijo y `.form-actions` en 2 columnas comprimen etiquetas largas («Cerrar sesión y borrar», «Confirmar guardado»).
   - **Áreas seguras (`index.html`)**: falta `viewport-fit=cover` para aprovechar `env(safe-area-inset-*)` en teléfonos con barra gestual o notch.

## Objetivos

- Adaptar a vista móvil (`360px`, `390px`, `520px` y hasta `760px`) todas las pantallas, tablas, controles, avisos y diálogos vigentes de `apps/pwa` que aún presentan problemas de usabilidad o desbordamiento.
- Garantizar navegación móvil en una sola fila sin solapamientos con el contenido ni con los avisos flotantes (`ToastCenter`).
- Sustituir en móvil las tablas anchas (historial clínico, contención química de lectura y captura, y cola de sincronización) por presentaciones apiladas legibles sin scroll horizontal forzado, preservando el layout de escritorio y la impresión/exportación PDF (`@media print` y `.print-sheet`).
- Asegurar controles táctiles cómodos (`>= 44px` en acciones principales, selects, pestañas segmentadas, casillas y cierre de foto) y foco visible accesible en teclado y móvil.

## Fuera de alcance

- Cambios en `apps/api`, contratos HTTP, permisos Spatie, lógica clínica o reglas de sincronización offline.
- Cambios en `packages/ui` que afecten a `apps/dashboard` u otras apps del monorepo (las adaptaciones viven en `apps/pwa`).
- Rediseño de marca, modo oscuro o modificación de tokens de color (se conservan los tokens semánticos y el tema de `GET /api/theme`).
- Alteración del formato impreso o PDF de diagnósticos y perfil (`@media print` y `PrintSheets.tsx`).
- Nuevas funcionalidades de negocio o nuevos campos en formularios.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Personal veterinario (`veterinarian`) | Operar con comodidad todas las vistas de la PWA desde teléfono o tablet en campo | Los vigentes en sesión Sanctum y permisos de API (sin cambios) |
| Otro personal autorizado con acceso a PWA | Consultar y usar las vistas habilitadas según su rol sin problemas de layout móvil | Los vigentes (sin cambios) |

## Historias de usuario

- Como personal veterinario en campo con teléfono móvil, quiero navegar entre todas las secciones sin que el menú inferior se divida en dos filas ni quede tapado por avisos, para moverme rápido entre expedientes y formularios.
- Como personal veterinario en móvil, quiero consultar el perfil de un animal, su historial clínico y la cola de sincronización en tarjetas legibles en lugar de tablas anchas, para revisar información sin hacer scroll horizontal incómodo.
- Como personal veterinario en móvil, quiero llenar formularios de alta, diagnósticos, contención química, solicitud de especies y diálogos de confirmación con botones y controles de tamaño táctil adecuado, para reducir errores al capturar datos.

## Criterios de aceptación

- **CA-01 (Navegación móvil y cierre de sesión):** Dada la PWA abierta en anchos de `360px`, `390px` y `760px`, con 6 o 7 secciones (incluyendo el rol `veterinarian`), cuando se muestra la barra de navegación móvil, entonces todos los ítems permanecen en una sola fila legible y operable sin envolverse a una segunda fila, el contenido inferior reserva espacio suficiente para no quedar cubierto, y la acción «Cerrar sesión» sigue disponible y accesible en móvil sin romper el diseño de escritorio ni las etiquetas accesibles existentes.
- **CA-02 (Avisos flotantes sin solapamiento):** Dado un aviso activo en `ToastCenter` en vista móvil (`<= 760px`), cuando se visualiza en pantalla, entonces no se superpone sobre la barra de navegación inferior y conserva su botón de cierre táctil (`>= 44px`) y anuncio accesible.
- **CA-03 (Perfil del animal e historial clínico en móvil):** Dada la vista `AnimalProfileView` en móvil (`<= 760px`), cuando se muestra el encabezado, acciones, historial clínico y detalle expandido de una evaluación (incluyendo contención química), entonces las acciones se adaptan sin bordes ni rejillas rotas, cada evaluación del historial y sus tablas clínicas se muestran en un formato apilado legible sin scroll horizontal forzado, y al expandir una evaluación su contenido cabe dentro del ancho móvil; en escritorio e impresión se preserva el formato tabular vigente.
- **CA-04 (Cola de sincronización en móvil):** Dada la vista `SyncStatusView` en móvil (`<= 760px`), cuando existen registros en la cola de sincronización, entonces la cabecera de estado/botón «Sincronizar ahora» y cada registro se presentan en un diseño apilado legible sin scroll horizontal forzado ni estilos rotos de `.form-actions`; en escritorio se mantiene la tabla.
- **CA-05 (Formularios clínicos y controles táctiles en móvil):** Dadas las vistas `DiagnosisIntenseView`, `DiagnosisQuickView`, `ReviewFormView` y `AnimalFormView` en móvil (`<= 760px` y `<= 520px`), cuando se capturan datos, entonces:
  - La captura de contención química en diagnóstico intenso se presenta como bloques/tarjetas apilados por fila en móvil (conservando tabla en escritorio/impresión y los mismos `name`/`aria-label`).
  - Las barras de acciones con 2 o 3 botones (`PrintActions`, formularios, `ReviewFormView`) se apilan o distribuyen limpiamente sin botones comprimidos ni texto truncado.
  - La línea de firma en diagnóstico rápido no provoca desbordamiento horizontal en `360px`.
  - Las casillas/radios (`.check-group`) y el botón de quitar foto (`.clear-image-btn`) cuentan con áreas táctiles cómodas (`>= 44px` o mínimo `40px` en controles secundarios sin romper la vista previa).
- **CA-06 (Listado de animales, solicitud de especies y diálogos en móvil):** Dadas las vistas `AnimalsView`, `SpeciesRequestView` (`SpeciesRequestFormPresenter` y `OwnSpeciesRequestsView`) y los diálogos modales (`LogoutConfirmDialog`, confirmación de seguimiento y edición de estado) en `360px–520px`, entonces:
  - Las filas de animales (`.animal-row-button`), el selector de orden y la paginación se adaptan sin reglas CSS sobrescritas ni recortes en `360px`.
  - El control segmentado (`.segmented`) ocupa el ancho disponible con altura táctil cómoda (`>= 44px`), y los chips de ficha mantienen legibilidad y área táctil adecuada.
  - Los diálogos modales ajustan su padding y apilan sus botones en móvil estrecho (`<= 520px`) para evitar etiquetas apretadas.
- **CA-07 (Sin desbordamiento, áreas seguras y cobertura de pruebas):** Dado el código de `apps/pwa`, cuando se ejecuta la suite automatizada de Vitest (`npm test`) y compilación (`npm run build`), entonces `index.html` declara `viewport-fit=cover`, no se introduce `overflow-x: hidden` en `html`/`body`/`#root` (regla de `pwa-001`), se preservan todas las pruebas existentes en verde y existen pruebas automatizadas que nombran y verifican `CA-01` a `CA-08`.
- **CA-08 (Iconografía reconocible de Animales y Especies):** Dadas la barra de navegación (`AppShell`) y los accesos directos (`HomeView`), cuando se muestran los iconos de **Animales** (`animals`), la marca/bienvenida (`paw`) y **Especies** (`species`), entonces **Animales** y la marca usan una huella animal reconocible (4 almohadillas superiores + almohadilla central) y **Especies** usa un icono diferenciado de catálogo abierto (`species`) para distinguir ambas secciones de un vistazo en móvil y escritorio.

## Reglas de negocio

- **RN-01:** El cambio es estrictamente de presentación y usabilidad móvil dentro de `apps/pwa`; no modifica lógica clínica, permisos, contratos API ni reglas de sincronización offline.
- **RN-02:** Todo texto visible y etiqueta accesible permanece en español y utiliza únicamente tokens semánticos del tema vigente, sin fijar colores de marca en componentes.
- **RN-03:** El formato de impresión (`@media print`) y exportación PDF (`PrintSheets.tsx` y hojas de perfil) se mantiene intacto.
- **RN-04:** Se conservan los nombres de campos (`name`), etiquetas accesibles (`aria-label`, `aria-current`, `role`) y orden de flujo definidos por specs previas (`pwa-001`, `pwa-005`, `pwa-011`, `pwa-014`), incluyendo la posición del selector «Orden» en `AnimalsView` (CA-03 de `pwa-011`).

## Datos, privacidad y auditoría

No se crean, consultan ni almacenan nuevos datos. No se tocan tablas, migraciones, DBR, ni almacenamiento local (`IndexedDB`). Los controles existentes mantienen el mismo aislamiento por sesión y confirmación de cierre con pendientes (`pwa-012`).

## Flujos y errores

1. **Navegación móvil**: la persona recorre las 6 o 7 secciones desde un teléfono (`360px`–`430px`) en una sola fila; los avisos de sincronización no tapan el menú.
2. **Consulta de perfil y Sync en móvil**: abre un animal desde el listado, consulta datos, expande evaluaciones del historial clínico o revisa la cola de Sync en tarjetas legibles; al rotar o abrir en escritorio ve las tablas completas.
3. **Captura en campo**: completa alta de animal, diagnóstico intenso (pasos 1 y 2, incluida contención química), diagnóstico rápido o solicitud de especie; confirma en los diálogos modales con botones claros y sin desbordamiento.
4. **Conectividad y estados de carga/error**: se preservan todos los mensajes de carga (`Spinner`), error, reintento y colas offline existentes.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR**: Ninguna dependencia nueva; se mantiene el stack de ADR 0002 (React 19, TypeScript, Vite 7, Tailwind CSS 4) y `@arca/ui`.
- **Riesgos**:
  - Cambiar la estructura HTML de tablas/navegación podría romper selectores de pruebas existentes (`responsive.test.tsx`, `screens.test.tsx`, `diagnosis.test.tsx`, `loading-notices-and-animal-view.test.tsx`); se mitiga preservando la semántica/atributos y corriendo toda la suite.
  - Duplicar markup para móvil y escritorio en tablas editables (contención química) duplicaría inputs con el mismo `name` en el `<form>`; **por ello en contención química debe usarse CSS responsivo sobre la misma tabla/inputs** (sin duplicar `<input>` en el DOM).
- **Decisiones cerradas (2026-11-26, usuario solicitante)**:
  1. **Menú inferior móvil (6–7 ítems)**: una sola fila con desplazamiento horizontal suave (`scroll-snap`, acceso directo en 1 toque a todas las secciones).
  2. **Ubicación de «Cerrar sesión» en móvil**: botón compacto en el encabezado superior (`.topbar`), siempre visible sin hacer scroll.
  3. **Ubicación de avisos (`ToastCenter`) en móvil**: arriba de la pantalla (debajo del borde superior seguro), sin tapar la barra de navegación ni botones de guardado.

## Revisión

- Aprobadores y fecha: Usuario solicitante, 2026-11-26
- Evidencia/enlaces: Auditoría de `apps/pwa/src/styles.css`, `apps/pwa/src/views/*.tsx`, `apps/pwa/src/viewmodels/pwaDemo.ts` y `apps/pwa/index.html`.
