# Plan técnico · 001 · admin-dashboard-prototype

- Spec: `apps/dashboard/specs/001-admin-dashboard-prototype.md`
- Estado de spec: Aprobada
- Estado técnico de la ampliación anterior: Aprobado por el solicitante, 2026-10-09
- Estado técnico de la nueva ampliación (login administrativo, paleta institucional y entrada HTML): Aprobado por el solicitante, 2026-10-09
- Aprobación de la versión anterior: Solicitante, 2026-10-08
- Responsable técnico de esta ampliación: Por identificar según acuerdo del equipo
- Fecha: 2026-10-09

## Diseño de solución

Conservar la SPA existente del dashboard con React 19, TypeScript, Vite 7 y Tailwind CSS 4, conforme al ADR 0002. No agregar React Router ni dependencias. Usar la shell actual, componentes de `@arca/ui`, tokens de `@arca/tokens`, el alias `@/` configurado, vistas en español y el patrón View/ViewModel existente. El HTML continúa generado por React; la lógica de presentación está en TypeScript y el diseño en CSS.

`apps/dashboard/index.html` se conserva como documento de entrada y montaje de React/Vite, no como contenedor del código completo de la app. La interfaz, sus estados y estilos continúan en los módulos existentes de `src/`, incluyendo `LoginView`, el ViewModel y `styles.css`.

Extender la selección de perfil para separar un acceso administrativo demostrativo del acceso de taquilla. El perfil administrativo abre la navegación administrativa, que agrega Modificación de recintos y Usuarios de taquilla. El perfil de taquilla presenta un formulario con las credenciales ficticias documentadas en la spec; solo tras una comparación local en memoria habilita Venta de boletos e Historial de boletos. El perfil y la sesión activa se reinician al cerrar sesión; las cuentas creadas permanecen en memoria para poder cambiar de perfil y probar el login de esa cuenta durante la misma carga de página. Recintos editados y cuentas creadas desaparecen al recargar. El historial y los reportes usan fixtures estáticos distintos. El estado de login es exclusivamente una simulación de interfaz, nunca autorización.

Ambos perfiles usarán formularios separados. El login administrativo verificará `administrador@demo.local` / `demo1234`; el de taquilla conservará `taquilla@demo.local` / `demo1234` y las cuentas ficticias creadas durante la carga. Se compartirán controles visuales, no el contrato de credenciales. Cada formulario mostrará sus credenciales públicas de demostración y un error accesible.

Mapear la paleta de `docs/04-sistema-de-diseno.md` desde los aliases semánticos de `apps/dashboard/src/styles.css`: borgoña `--sidebar`, vino `--primary`, dorado `--secondary`, beige `--accent`, blancos/negros según contraste, 16px y Lato 400 con fallback del sistema. Eliminar los roles azules/verdes como colores de marca y conservar `--success`, `--warning`, `--danger` y los tokens de foco para sus significados semánticos. Reutilizar los defaults ya centralizados en `@arca/tokens`; no alterar ese paquete, no incluir hex de marca en las vistas y no consultar/escribir `settings_colores` ni `GET /api/theme` en el prototipo local.

Las nuevas vistas se componen con primitivas accesibles existentes de `@arca/ui`; si se requiere un control común, reutilizar o extender solo esa librería interna sin dependencia nueva ni lógica de dominio. Mantener SVG locales y tokens semánticos; no fijar hex de marca en vistas.

Modificación de recintos presenta fixtures identificados como ficticios y campos de nombre, descripción y estado; enviar el formulario solo actualiza el estado temporal y muestra confirmación. Usuarios de taquilla presenta la cuenta inicial ficticia, permite crear cuentas en memoria con campos requeridos y las hace disponibles para un login de taquilla durante la sesión de la página. Ninguna operación usa API, cookies, `localStorage`, `sessionStorage` ni base de datos. Venta mantiene sus estados visuales existentes sin cálculo de precios ni pagos.

Añadir una guía local en español bajo `apps/dashboard/docs/` que explique cómo iniciar el prototipo, elegir perfil, acceder con las credenciales ficticias, crear un usuario, recorrer recintos/venta/historial, ejecutar pruebas y reconocer límites/pérdida de datos. Los comentarios del código solo aclararán lógica no obvia.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| `apps/dashboard` | `src/App.tsx`, `src/viewmodels/dashboard-demo.ts`, `src/viewmodels/useDashboardDemo.ts` | Modelar perfiles y transiciones locales en el reducer/ViewModel existente; filtrar secciones según perfil de demostración. Al salir, limpiar la sesión activa y conservar cuentas creadas solo hasta recargar. Sin lógica de negocio ni persistencia. |
| `apps/dashboard` | `src/views/LoginView.tsx`, `src/views/DashboardView.tsx`, `src/views/EnclosuresView.tsx`, `src/views/TicketUsersView.tsx`, `src/views/TicketSaleView.tsx`, `src/views/TicketHistoryView.tsx`, `src/views/TicketReportView.tsx` | Selector y login separado por perfil, incluyendo login administrativo; modificación temporal de recintos, alta temporal de cuentas, venta e historial de muestra y reporte administrativo. Reutilizar `NewsView` y `EventsView`. |
| `apps/dashboard` | `src/data/demo-data.ts`, `src/styles.css` | Definir fixtures ficticios y centralizar aliases del dashboard en la paleta institucional, manteniendo colores de estado, foco, contraste y responsive. |
| `apps/dashboard` | `src/tests/*.test.tsx` | Cubrir CA-01..CA-14 mediante tests Vitest nombrados; usar renderer server de React y pruebas puras del reducer/ViewModel. Conservar el patrón existente de Vitest, que descubre `*.test.tsx`; no añadir jsdom ni testing-library. |
| `apps/dashboard/docs` | `manual-demo.md`, `arquitectura.md` | Documentar ejecución, perfiles, credenciales ficticias, recorridos, organización del código, pruebas y límites; describir la arquitectura SPA/MVVM conforme a la plantilla por app, sin presentar los mocks como capacidades operativas. |
| `apps/dashboard` y `packages/tokens` | `README.md`, `docs/manual-demo.md`, `docs/arquitectura.md`, `packages/tokens/README.md` | Documentar los credenciales, colores y el uso de `index.html`; corregir la referencia anterior a los roles azules/verdes de la demo. |
| `packages/ui`, `packages/tokens` | API y CSS actuales | Consumir controles compartidos y defaults semánticos existentes. No cambiar APIs ni CSS del paquete; la SPA mapea sus roles localmente a la paleta institucional. |
| API/BD y raíz del repositorio | Ninguno | No crear rutas/endpoints, Actions, Requests, Resources, Policies, modelos, migraciones, workspace global ni dependencias nuevas. |

## Contrato y datos

- Endpoints con rutas nombradas, autenticación y permisos: No aplica. No se consumen endpoints ni se añaden rutas de cliente. El acceso de ambos perfiles solo representa una transición visual local, no autentica ni autoriza.
- Validación/Form Requests, Actions, Resources y Policies: No aplica en el prototipo. Las vistas validan solo campos de presentación requeridos y una comparación de credenciales ficticias en memoria; no se implementan reglas operativas.
- Migraciones, `BaseModel`, auditoría y SoftDeletes: No aplica; no hay persistencia.
- Datos: constantes ficticias y estado efímero de React; nada contiene datos de personas reales, ventas reales o montos operativos. Cambios y cuentas desaparecen al recargar. Cerrar sesión oculta las vistas de taquilla y limpia la sesión activa, pero conserva las cuentas ficticias durante esa carga para permitir cambiar de perfil.
- Errores y compatibilidad: no hay red ni operaciones remotas. Credenciales incorrectas y campos incompletos muestran feedback accesible en español y permiten corregir el formulario. Cada vista mantiene aviso visible de demostración.
- Dependencias: se conservan React/React DOM 19, Vite 7, TypeScript, Tailwind CSS 4, Vitest y los paquetes locales `@arca/ui` y `@arca/tokens`. No React Router, cliente HTTP, charting, iconos externos ni proveedores de pago. No se instala ni actualiza ninguna dependencia.

## Seguridad, offline y operación

- La vista presenta las claves iniciales ficticias expresamente autorizadas en la spec; el texto de pantalla y la guía advierten que solo sirven en la demostración y nunca deben reutilizarse. Son valores públicos en código cliente, no secretos.
- El estado local de perfil no protege rutas ni datos: todo código y fixture está disponible en el cliente. No presentar el prototipo como herramienta operativa ni como mecanismo de control de acceso.
- No se montan campos de datos personales reales, tarjetas o claves reutilizadas. Los formularios solo aceptan datos ficticios de demostración. Indicadores, importes, recintos, cuentas, ventas e historial son ficticios.
- Crear usuarios y editar recintos solo modifica estado React volátil; venta, filtros, publicación y confirmación no cambian datos persistentes. Cerrar sesión restablece el perfil activo pero conserva cuentas creadas mientras la página siga cargada, para permitir probarlas desde Taquilla.
- Las vistas y componentes no usan `fetch`/`axios`, cookies, `localStorage`, `sessionStorage`, analytics, scripts remotos ni recursos externos.
- El prototipo estático se puede cargar sin red después de compilar; esto no representa el modo offline de la PWA.
- Revisión de accesibilidad: etiquetas asociadas a campos, botones semánticos, navegación por teclado, foco visible y administración del foco al abrir/cerrar el menú móvil y cambiar de sección, `aria-live` para estado de proceso, `aria-modal`/foco para diálogos si aplica, contraste de tokens y `prefers-reduced-motion`.
- Responsive: menú lateral expandido en escritorio, menú contraíble mediante control accesible en tablet/móvil; evitar overflow en 360, 390, 768, 1024 y 1366 px.
- Portabilidad: herramientas estándar del stack aprobado; no se incorpora SDK/servicio de nube ni configuración dependiente del despliegue.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | `CA-01 admin-dashboard-prototype` comprueba selector de perfiles, entrada administrativa y presentación de acceso taquilla sin envío de datos. | Vitest, `apps/dashboard/src/tests/login.test.tsx` y prueba del reducer/ViewModel. |
| CA-02 | `CA-02 admin-dashboard-prototype` comprueba opciones administrativas, indicadores y ausencia de vistas de taquilla para ese perfil. | Vitest, `apps/dashboard/src/tests/dashboard.test.tsx`. |
| CA-03 | `CA-03 admin-dashboard-prototype` comprueba vistas de noticias/eventos, campos y tarjetas, y que las acciones solo muestran estado demo. | Vitest, `apps/dashboard/src/tests/content-management.test.tsx`. |
| CA-04 | `CA-04 admin-dashboard-prototype` comprueba que venta solo aparece para taquilla con sesión demo y recorre sus estados ficticios sin precio/persistencia. | Vitest, `apps/dashboard/src/tests/ticket-sale.test.tsx` y prueba del reducer/ViewModel. |
| CA-05 | `CA-05 admin-dashboard-prototype` comprueba Reporte de boletos y su acceso administrativo, separado del historial de taquilla. | Vitest, `apps/dashboard/src/tests/ticket-report.test.tsx`. |
| CA-06 | `CA-06 admin-dashboard-prototype` comprueba contratos CSS responsive/foco/controles; inspección en navegador registra dimensiones y overflow de los cinco viewports. | Vitest, `apps/dashboard/src/tests/responsive.test.tsx`; navegador integrado. |
| CA-07 | `CA-07 admin-dashboard-prototype` verifica nombres de pruebas CA-01..CA-14 y presencia de cobertura por pantalla/flujo. | Vitest, `apps/dashboard/src/tests/acceptance-coverage.test.tsx`. |
| CA-08 | `CA-08 admin-dashboard-prototype` conserva pruebas de build/type-check, exports y tokens semánticos. | Scripts del dashboard + `apps/dashboard/src/tests/design-system.test.tsx`; `packages/ui` y `packages/tokens`. |
| CA-09 | `CA-09 admin-dashboard-prototype` comprueba campos de recinto, estado ficticio y actualización temporal sin persistencia. | Vitest, `apps/dashboard/src/tests/enclosures.test.tsx` y prueba del reducer/ViewModel. |
| CA-10 | `CA-10 admin-dashboard-prototype` comprueba credenciales válidas/incorrectas, visibilidad condicionada de secciones y cierre de sesión. | Vitest, `apps/dashboard/src/tests/login.test.tsx` y `apps/dashboard/src/tests/acceptance-coverage.test.ts`. |
| CA-11 | `CA-11 admin-dashboard-prototype` comprueba filas/filtros del historial exclusivamente ficticios y su separación del reporte. | Vitest, `apps/dashboard/src/tests/ticket-history.test.tsx`. |
| CA-12 | `CA-12 admin-dashboard-prototype` comprueba alta de cuenta efímera, login posterior en la misma sesión y documentación de sus límites. | Vitest, `apps/dashboard/src/tests/ticket-users.test.tsx`; guía `apps/dashboard/docs/manual-demo.md`. |
| CA-13 | `CA-13 admin-dashboard-prototype` comprueba credenciales válidas/incorrectas del perfil administrativo, feedback accesible, navegación condicionada solo en la presentación y cierre de sesión. | Vitest, `apps/dashboard/src/tests/login.test.tsx` y pruebas del reducer/ViewModel. |
| CA-14 | `CA-14 admin-dashboard-prototype` comprueba los aliases de tokens semánticos, valores de la paleta institucional, tipografía/tamaño base, ausencia de hex de marca en vistas y conservación de colores de estado/foco. | Vitest, `apps/dashboard/src/tests/design-system.test.tsx` y `apps/dashboard/src/tests/responsive.test.tsx`. |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Se conserva React 19, TypeScript, Vite 7, Tailwind CSS 4 y Vitest aprobados; no se agregan dependencias, servicios, SDKs ni configuración dependiente de nube. |
| II. La spec manda | Sí | La spec `001-admin-dashboard-prototype` está Aprobada con CA-01..CA-14 y este plan/checklist aprobados antes de implementar la ampliación. |
| III. Lógica separada de la interfaz | Sí | Esta ampliación solo simula la interfaz: fixtures y estados efímeros; no ventas reales, cálculos de precios, API ni permisos implementados en UI. |
| IV. Un test por criterio | Sí, sujeto a implementación | El mapeo de este plan asigna Vitest nombrado para CA-01..CA-14; los tests propuestos se implementarán junto con las vistas y se verificarán con la suite. |
| V. Una sola fuente de verdad para los datos | Sí | No se accede a información real, BD, cookies ni almacenamiento persistente; todo dato es fixture o estado temporal. La versión operativa requiere otra spec y API/MySQL. |
| VI. Código en inglés, personas en español | Sí | Símbolos, tipos y nombres de archivos en inglés; labels, mensajes, guía y documentación de feature en español. |

## Riesgos y decisiones

- ADR requerido/aprobado: ADR 0002 cubre el stack actual; no se requiere ADR ni dependencia nueva. No agregar router, librerías de iconos, formularios, gráficos o pagos.
- Riesgo: el login local y la creación de usuarios podrían confundirse con seguridad real. Mitigar con banners, credenciales visibles de demo, ausencia expresa de claims de autorización y guía sobre datos expuestos al cliente.
- Riesgo: los reportes y el historial podrían parecer transacciones reales. Mantenerlos separados por perfil, etiquetarlos como ficticios y no calcular ni guardar importes.
- Riesgo: los cambios volátiles se pierden al recargar. Indicarlo antes/después de editar recintos o crear usuarios y describirlo en la guía.
- Riesgo: el login local podría confundirse con seguridad real. Mitigar con credenciales de muestra visibles, mensajes de demo y sin datos ni operaciones reales.
- Riesgo: los aliases del tema podrían producir bajo contraste o desplazar colores semánticos de estado. Mapearlos desde tokens centrales en un bloque CSS único y verificarlos con tests; conservar los tokens de estado y foco.
- No se modifica `apps/web` ni otras apps/paquetes; la base técnica ya instalada se conserva. No tocar cambios preexistentes ajenos a esta feature.

## Orden y aprobación

1. Plan anterior aprobado por el solicitante el 2026-10-09, incluyendo los límites simulados, el mapa CA→tests y el Constitution Check. Responsable técnico del equipo: por identificar según acuerdo interno.
2. Actualizar `tasks/001-admin-dashboard-prototype.md` con tareas dependientes para perfil/login, vistas de recintos, cuentas e historial, guía, tests y verificación; obtener aprobación del checklist.
3. Extender selector, reducer/ViewModel y shell para diferenciar administración y taquilla; salir limpia la sesión/perfil activo, conserva las cuentas ficticias en memoria y condiciona la navegación visible al perfil.
4. Implementar vistas administrativas de modificación de recintos y usuarios de taquilla, con fixtures/estado en memoria y feedback accesible.
5. Implementar login local ficticio, gating visual por sesión de demostración, historial de taquilla y separación con el reporte administrativo; conservar el flujo de venta existente.
6. Actualizar estilos responsive y documentación local en español; comprobar etiquetas, teclado, mensajes de error y visibilidad persistente de que es demo.
7. Añadir tests CA-01..CA-14 y cobertura del reducer; ejecutar `npm run types`, `npm run build`, `npm test`, `/verify` y validar responsive en los viewports especificados.

Aprobación funcional de la versión anterior de la spec: solicitante, 2026-10-09. Aprobación funcional y técnica de la ampliación de login administrativo, paleta institucional y alcance de `index.html`: solicitante, 2026-10-09.
