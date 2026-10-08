# Plan técnico · 003 · lion-hero-mobile-navigation

- Spec: `apps/web/specs/003-lion-hero-mobile-navigation.md`
- Estado de spec: Aprobada
- Responsable técnico: Por identificar
- Estado técnico: En progreso
- Fecha del plan: 2026-10-08

## Diseño de solución

Mantener el portal HTML/CSS/JavaScript estático. Actualizar el fondo del selector `.hero` para recuperar exactamente el degradado verde anterior sobre `assets/lion.jpg`, sin modificar tokens ni superficies fuera del hero.

En `index.html`, asignar un `id` estable al `<nav>` e insertar un botón de menú con `type="button"`, nombre accesible, `aria-controls` y `aria-expanded`. El botón estará oculto por defecto y los enlaces seguirán visibles en el HTML inicial. En `script.js`, inicializar el control cuando estén disponibles el botón y la navegación; si la inicialización tiene éxito, ocultar el botón en escritorio y colapsar los enlaces únicamente hasta 820 px. Sin JavaScript, los enlaces permanecen accesibles. Mantener sincronizados `hidden` y `aria-expanded` al abrir/cerrar, responder a Escape restaurando el foco al botón y cerrar el menú al activar un enlace. Al cambiar de lado del breakpoint, restaurar el estado apropiado de escritorio o móvil.

Refinar las reglas existentes de cabecera y secciones para que el menú abierto, buscador, compra de boletos, hero y controles quepan en el ancho disponible. No cambiar textos, destinos, recursos ni lógica ajena a navegación. Mantener `prefers-reduced-motion`, `:focus-visible` y el comportamiento del encabezado sticky.

Ampliar la prueba persistente de Node con los contratos estáticos de color, marcado accesible, ausencia de JavaScript de negocio adicional y reglas responsive. La ejecución del navegador integrado comprobará interacción real, foco y `document.documentElement.scrollWidth <= window.innerWidth` a 360, 390, 768, 1024 y 1366 px. No hay framework E2E preexistente ni paquete de pruebas en `apps/web`; no agregar una dependencia solo para esta página.

La prueba de reubicación conserva hashes de los recursos inmutables. Para permitir este alcance aprobado retirará `index.html` y `script.js` de la lista de hashes estrictos; sus nuevos contratos se comprobarán con pruebas CA específicas. Mantendrá las comprobaciones de todos los assets restantes, `index.php`, referencias locales, estructura y CSS. Actualizar los artefactos 001 ya modificados en este worktree para registrar que la spec 003 autoriza únicamente los cambios de navegación en HTML/JavaScript y el ajuste de CSS, sin cambiar sus evidencias históricas de traslado.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Portal estático | `apps/web/src/index.html` | Asociar el botón accesible de menú con la navegación existente sin cambiar enlaces. |
| Portal estático | `apps/web/src/script.js` | Gestionar el estado móvil, Escape, foco, cierre por enlace y cambio de breakpoint. |
| Portal estático | `apps/web/src/styles.css` | Recuperar el degradado verde solo para el hero y adaptar cabecera/secciones a los viewports aprobados. |
| Pruebas | `apps/web/src/tests/relocation.test.mjs` | Añadir tests nombrados CA-01..CA-05 sin dependencias; continuar protegiendo assets y referencias locales. |
| Artefactos SDD relacionados | `apps/web/specs/001-relocate-static-portal.md`, `apps/web/plan/001-relocate-static-portal.md`, `apps/web/tasks/001-relocate-static-portal.md` | Registrar la excepción de HTML/JavaScript autorizada por 003, integrándola con los cambios no confirmados de 002 existentes en el worktree. |
| Artefactos de feature | `apps/web/specs/003-lion-hero-mobile-navigation.md`, `apps/web/plan/003-lion-hero-mobile-navigation.md`, `apps/web/tasks/003-lion-hero-mobile-navigation.md` | Mantener trazabilidad de alcance, diseño y tareas. |

## Contrato y datos

- Endpoints con rutas nombradas, autenticación y permisos: No aplica; el portal y sus destinos permanecen estáticos y públicos.
- Validación/Form Requests, Actions, Resources y Policies: No aplica; el código de menú no ejecutará lógica de dominio ni solicitudes HTTP.
- Migraciones, `BaseModel`, auditoría y SoftDeletes: No aplica; no se crea, consulta ni modifica persistencia.
- Errores y compatibilidad: El control de menú permanece oculto y la lista de enlaces visible hasta que JavaScript inicializa correctamente. Los enlaces mantienen sus fragmentos `#...` y la navegación nativa. `hidden` y `aria-expanded` representan el mismo estado.

## Seguridad, offline y operación

- No se leen ni escriben datos sensibles, cookies, credenciales ni configuración del servidor.
- No se cambian permisos ni contenido; los enlaces existentes siguen siendo públicos.
- No se agregan almacenamiento local, solicitudes de red, servicios ni dependencias.
- La implementación usa APIs DOM estándar y CSS portable, sin acoplarse a GCP, MySQL o un proveedor.
- No hay flujo offline de datos; el sitio conserva su operación estática actual.
- Navegación con teclado: activación nativa del botón, Escape para cerrar y retorno del foco, foco visible y enlaces alcanzables aun si falla JavaScript.
- Pruebas: `node --test apps/web/src/tests/relocation.test.mjs`; revisión de interacción/viewport en el navegador integrado. `/verify` debe informar que `apps/web` no tiene `src/package.json` ni scripts de aplicación.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | `CA-01 lion-hero-mobile-navigation` verifica la imagen actual, el degradado verde legado en `.hero` y que las variables y selectores de la paleta general permanezcan intactos. | Node `node:test`; `apps/web/src/tests/relocation.test.mjs`. |
| CA-02 | `CA-02 lion-hero-mobile-navigation` verifica el marcado de navegación, botón de menú y reglas CSS que mantienen enlaces desplegados y botón oculto desde 821 px. Se comprueba en el navegador el estado computado a 1024 y 1366 px. | Node `node:test` y navegador integrado; `apps/web/src/tests/relocation.test.mjs`. |
| CA-03 | `CA-03 lion-hero-mobile-navigation` verifica atributos accesibles y lógica de apertura/cierre, Escape, restauración del foco, cierre por enlace y breakpoint; en navegador se ejecutan activaciones por teclado y puntero. | Node `node:test` y navegador integrado; `apps/web/src/tests/relocation.test.mjs`. |
| CA-04 | `CA-04 lion-hero-mobile-navigation` verifica presencia y orden de las reglas responsive; en navegador automatizado se comprueba `scrollWidth <= innerWidth`, legibilidad/disponibilidad de controles y ausencia de superposición en 360, 390, 768, 1024 y 1366 px. | Node `node:test` y navegador integrado; `apps/web/src/tests/relocation.test.mjs`. |
| CA-05 | `CA-05 lion-hero-mobile-navigation` comprueba que estén presentes los tests CA-01..CA-05 y que la suite solo dependa de builtins de Node; se ejecuta la suite completa. | Node `node:test`; `apps/web/src/tests/relocation.test.mjs`. |

La inspección con navegador integrado se registra como evidencia de aceptación, sin añadir un paquete E2E a una app estática sin manifiesto. La persona solicitante autorizó el 2026-10-08 continuar el trabajo con las pruebas automatizadas disponibles y documentar la limitación; no se afirma que `scrollWidth` esté medido en los cinco viewports ni se cierra CA-04 hasta poder efectuar esa comprobación visual.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Solo HTML, CSS, JavaScript y `node:test` ya disponibles; no se incorpora tecnología ni dependencia. |
| II. La spec manda | Sí | La spec `003-lion-hero-mobile-navigation` está Aprobada. Los cambios se limitan a su capa de hero y a navegación/responsive; las referencias históricas de reubicación se actualizan por el permiso explícito de esta spec. |
| III. Lógica separada de la interfaz | Sí | La lógica adicional solo controla el estado visual/teclado del menú; no calcula dominio, consulta API ni escribe datos. |
| IV. Un test por criterio | Sí | La suite persistente tiene pruebas con nombres CA-01..CA-05; el navegador integrado verifica interacciones y dimensiones reales sin depender de paquetes. |
| V. Una sola fuente de verdad para los datos | Sí | No hay datos ni persistencia; `settings_colores` sigue sin consultarse ni modificarse. |
| VI. Código en inglés, personas en español | Sí | Identificadores, atributos y tests en inglés; nombres, interfaz y documentación funcional en español. |

No se requiere excepción constitucional ni ADR.

## Riesgos y decisiones

- ADR requerido/aprobado: No aplica; no se añade tecnología.
- Decisiones: conservar escritorio desplegado desde 821 px; activar menú colapsable hasta 820 px; conservar navegación visible si JavaScript no se inicializa; recuperar el degradado original sin reverdecer otras superficies.
- Riesgo de CSS acumulado: `styles.css` contiene breakpoints repetidos de cambios previos. Mitigación: integrar las reglas del menú y cabecera en las reglas existentes pertinentes, evitar duplicar overrides y validar todos los viewports especificados.
- Riesgo de una prueba E2E no reproducible: la app no tiene framework de navegador instalado. Mitigación: no introducir paquetes; mantener tests estructurales en `node:test` y guardar evidencia de ejecución de navegador en tareas.
- Riesgo de conflicto con cambios actuales no confirmados de 002: integrar 003 sin reemplazar ni revertir los cambios del usuario en archivos de la spec, plan, tasks, CSS y tests ya modificados.

## Orden y aprobación

1. Obtener aprobación técnica del presente plan.
2. Crear y revisar `apps/web/tasks/003-lion-hero-mobile-navigation.md`, vinculando T-xx a cada CA-xx antes de implementar.
3. Añadir marcado accesible y control de menú progresivamente mejorado; verificar estado, foco, Escape y resize.
4. Ajustar el degradado del hero y los estilos responsivos; conservar la paleta de las demás superficies.
5. Extender los tests nombrados, ajustar las expectativas estructurales 001 y proteger los hashes de recursos fuera de alcance.
6. Ejecutar tests Node, interacción/viewport en navegador integrado, `git diff --check` y `/verify`; revisar que los cambios existentes no relacionados permanezcan intactos.
7. Actualizar spec, plan y tasks a Implementada únicamente después de pasar los criterios.

La aprobación funcional de la spec y la aprobación del plan técnico fueron otorgadas por la persona solicitante el 2026-10-08 en esta conversación. No se inicia la implementación antes de desglosar las tareas.
