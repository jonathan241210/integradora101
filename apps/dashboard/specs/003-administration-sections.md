# 003 · administration-sections

- App dueña: `dashboard`
- Apps/paquetes afectados: `dashboard`, `packages/api-client`, `packages/ui` (solo si falta algún componente compartido)
- Estado: Implementada
- Solicitante / responsable funcional: Jonathan
- Aprobación funcional: Jonathan, 2026-10-30

## Problema y contexto

Tras el login real (`dashboard-002`), las secciones de administración (Panel principal, Noticias, Eventos, Reporte de boletos, Recintos y Usuarios de taquilla) siguen con datos ficticios del prototipo `dashboard-001`. La API expone sus contrapartes reales en `api-007`. Esta feature conecta esas secciones a la API para el administrador general (`admin`, Presidencia) y el administrador del zoológico (`zoo-admin`, Dirección), y el Panel y el Reporte también para `executive`, en solo lectura.

La vista «Usuarios» pasa de ser una demostración a gestionar cuentas reales del personal. Venta e Historial de taquilla (`cashier`) siguen demostrativos hasta su propia spec.

## Objetivos

- Gestionar cuentas del personal desde el dashboard: listar, buscar y filtrar, crear, editar, activar/desactivar, eliminar, restablecer contraseña y restablecer 2FA.
- Gestionar noticias, eventos y recintos con datos reales (según `api-007`).
- Mostrar el Panel principal y el Reporte de boletos con datos reales, con periodo semanal o mensual y exportación a CSV, Excel y PDF.
- Que la misma interfaz sirva a `admin` y `zoo-admin`, mostrando solo las opciones que sus permisos permiten.
- Mantener MVVM, accesibilidad, diseño adaptable y tokens semánticos.

## Fuera de alcance

- Venta e Historial de boletos de taquilla y arqueo (siguen demostrativos).
- Subida de imágenes de noticias y eventos.
- Eliminación de recintos.
- Recuperación o cambio de contraseña propio, contraseña temporal con cambio obligatorio.
- Generación de archivos en el navegador: la API genera las exportaciones.
- React Router y nuevas dependencias (ADR 0002); la navegación sigue por estado de la SPA.
- Cambios en `apps/web`, `apps/pwa` y `apps/mobile`.
- Autorización en el cliente: las pantallas solo presentan lo que la API permite.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| `admin` | Todas las secciones de administración y todas las cuentas | `users.manage`, `news.manage`, `events.manage`, `enclosures.manage`, `dashboard.view`, `reports.view` |
| `zoo-admin` | Las mismas secciones; en Usuarios solo cuentas de taquilla y veterinaria | `operational-staff.manage`, `news.manage`, `events.manage`, `enclosures.manage`, `dashboard.view`, `reports.view` |
| `executive` | Panel y Reporte en solo lectura, con exportación | `dashboard.view`, `reports.view` |
| `cashier` | Sin cambios (Venta e Historial demostrativos) | `tickets.*` |

## Historias de usuario

- Como `admin`, quiero administrar las cuentas de todo el personal desde una tabla con búsqueda y filtros para mantener los accesos al día.
- Como `zoo-admin`, quiero ver y gestionar solo las cuentas de taquilla y veterinaria para operar mi área.
- Como administrador, quiero restablecer la contraseña o el 2FA de una cuenta para devolver el acceso a quien lo perdió.
- Como administrador, quiero crear, editar y retirar noticias y eventos, y renombrar recintos, para mantener la información al día.
- Como administrador o directivo, quiero ver el reporte semanal o mensual y exportarlo en PDF, Excel o CSV.

## Criterios de aceptación

### Navegación y estructura

- **CA-01:** Dada una sesión con `home: administration`, cuando se presenta la navegación, entonces muestra Panel principal, Noticias, Eventos, Reporte, Recintos y Usuarios según los permisos de `me` (Usuarios con `users.manage` u `operational-staff.manage`); la etiqueta de la sección es «Usuarios» y deja de decir «Usuarios de taquilla».
- **CA-02:** Dadas las secciones conectadas a la API, cuando se presentan, entonces no muestran el aviso de demostración ni datos ficticios; Venta e Historial de taquilla conservan el suyo.

### Usuarios

- **CA-03:** Dada la sección Usuarios, cuando carga, entonces muestra una tabla paginada con nombre, correo, área, rol, estado y último acceso, con búsqueda por texto y filtros por rol, área y estado, y estados de carga, vacío y error con `role="alert"` en español.
- **CA-04:** Dado el formulario de alta, cuando la persona elige un área, entonces propone el rol sugerido por la API (editable), solo ofrece los roles asignables que devuelve `api-007` (`zoo-admin` no ve `admin`, `zoo-admin` ni `executive`) y muestra los errores 422 junto a cada campo.
- **CA-05:** Dada una cuenta, cuando se edita, entonces el formulario permite cambiar nombre, apellidos, área y rol; el correo se muestra y no es editable.
- **CA-06:** Dada una cuenta, cuando se elige desactivar/activar, eliminar, restablecer contraseña o restablecer 2FA, entonces se pide confirmación explícita en un diálogo accesible que nombra la cuenta y el efecto, y solo al confirmar se llama a la API; el restablecimiento de contraseña pide la nueva contraseña (con mostrar/ocultar accesible).
- **CA-07:** Dadas las reglas de la API, cuando responde 403, 404 o 422 (p. ej. desactivar la propia cuenta o al último `admin`), entonces el dashboard muestra su mensaje en español sin cambiar la lista, y tras una operación exitosa refresca la lista y confirma con un aviso accesible.

### Noticias, eventos y recintos

- **CA-08:** Dadas las secciones Noticias y Eventos, cuando cargan, entonces listan los elementos activos e inactivos con su estado, y permiten crear, editar, activar/desactivar y eliminar (con confirmación) mediante formularios con validación 422 por campo; no hay campo de subida de imagen.
- **CA-09:** Dada la sección Recintos, cuando carga, entonces lista los recintos con su número de animales y permite crear y renombrar; no ofrece eliminar, y un nombre repetido muestra el error de la API.

### Panel y reporte

- **CA-10:** Dado el Panel principal, cuando carga, entonces muestra los totales del día y de los últimos 7 días (boletos, adultos, niños, ingresos) y la serie diaria que entrega la API, sin cálculos en el cliente, con estado vacío claro cuando no hay ventas.
- **CA-11:** Dado el Reporte, cuando se abre, entonces ofrece un selector Semanal/Mensual (con rango personalizado como opción secundaria) y navegación al periodo anterior/siguiente, y muestra los totales, el desglose diario y el listado de boletos recibidos de la API.
- **CA-12:** Dado un reporte mostrado, cuando se pulsa «Exportar CSV», «Exportar Excel» o «Exportar PDF», entonces el cliente solicita el archivo a la API para el periodo visible y lo descarga. Los tres botones están siempre visibles y habilitados, salvo mientras una exportación está en curso. Si la API responde 422 (un formato fuera de su lista habilitada, «Formato de exportación no disponible.», o PDF sobre el tope de boletos de `api-007`) o la descarga falla, muestra el mensaje de la API en español en la propia sección y conserva el reporte en pantalla.
- **CA-13:** Dado un `executive`, cuando entra, entonces ve el Panel y el Reporte reales en solo lectura, con exportación y sin acciones de edición.

### Calidad

- **CA-14:** Dado el código del dashboard, cuando se revise, entonces toda llamada a la API pasa por `@arca/api-client` desde hooks ViewModel (uno por sección); ningún componente de `views/` o `components/` usa `fetch`/`axios` ni calcula totales o permisos.
- **CA-15:** Dado cualquier 401 en estas secciones, cuando lo detecta el estado de sesión, entonces el dashboard vuelve al login con «Tu sesión expiró» (`dashboard-002` CA-08).
- **CA-16:** Dadas las vistas nuevas, cuando se usan con teclado y a anchos de 360 a 1366 px, entonces conservan foco visible, diálogos con foco atrapado y cierre con Escape, tablas con desplazamiento propio o diseño apilado, y no hay desbordamiento horizontal de la página.
- **CA-17:** Dada la interfaz, cuando se revisa su estilo, entonces usa tokens semánticos y no fija hex de marca.
- **CA-18:** Dada la suite del dashboard, cuando se ejecutan los tests de Vitest con un cliente simulado de `@arca/api-client`, entonces existe al menos una prueba que nombra cada CA-01 a CA-19.

### Zona horaria

- **CA-19:** Dado el Panel principal o el Reporte, cuando se piden el panel, el reporte o su exportación, entonces `@arca/api-client` envía en `timezone` la zona horaria del navegador (`Intl.DateTimeFormat().resolvedOptions().timeZone`) en las tres llamadas, y ni la vista ni el ViewModel calculan periodos, días ni fechas con esa zona. Si el navegador no informa la zona, la llamada se hace sin `timezone` y la API responde con su zona por defecto. Aclaración (decisión de Jonathan, 2026-10-30; `api-007` RN-14 y CA-28). Confirmado por Jonathan, 2026-10-30.

## Reglas de negocio

- **RN-01:** El mapa permiso → sección es solo presentación; la autorización real la aplica `api-007`. Ocultar una opción nunca equivale a protegerla.
- **RN-02:** Los roles asignables, las reglas de alcance y las validaciones vienen de la API; el cliente no las reimplementa.
- **RN-03:** Las acciones destructivas o sensibles (desactivar, eliminar, restablecer contraseña o 2FA, eliminar noticia o evento) siempre piden confirmación.
- **RN-04:** Totales, periodos y series se muestran tal como los calcula la API (Constitución III).
- **RN-05:** Mensajes y etiquetas en español; identificadores del código en inglés (Constitución VI).
- **RN-06:** Sin React Router: la navegación entre vistas sigue por estado de la SPA (ADR 0002).
- **RN-07:** La contraseña capturada para crear o restablecer una cuenta no se guarda en el cliente y se descarta tras enviarla.
- **RN-08:** Esta feature depende de `api-007`; mientras no esté implementada, el desarrollo usa un cliente simulado en tests.
- **RN-09:** El diseño visual no cambia: se conservan colores y tipografía vigentes (tokens semánticos). Las secciones, botones, diálogos, tablas y formularios nuevos reutilizan los componentes y patrones de las pantallas existentes y de `@arca/ui`.
- **RN-10:** La feature se entrega completa en conjunto (Usuarios, Noticias, Eventos, Recintos, Panel y Reporte), no por etapas. Los formatos CSV, Excel y PDF se ofrecen siempre en la interfaz. La API (`api-007`, RN-12 y CA-23) tiene habilitados los tres desde la aceptación del ADR 0017 (2026-10-30); la API solo responde 422 para un formato fuera de su lista («Formato de exportación no disponible.») o para PDF sobre el tope de boletos, y la interfaz muestra ese error según CA-12.
- **RN-11:** (Decisión y redacción confirmadas por Jonathan, 2026-10-30: zona del dispositivo con respaldo en `America/Mexico_City`.) La zona horaria con la que se calculan los periodos, los días y la exportación es la del dispositivo que consulta. La obtiene y la envía `@arca/api-client` (en el parámetro `timezone` del Panel, del Reporte y de su exportación), no las vistas ni los ViewModels. El cliente no calcula periodos, días ni totales con esa zona: los recibe de la API (RN-04; `api-007` RN-14).

## Datos, privacidad y auditoría

El dashboard muestra datos personales del personal (nombre, correo, área, rol) solo a quien la API autoriza y no los almacena fuera de la memoria de la sesión. Las contraseñas nunca se guardan ni se muestran. La auditoría de las acciones administrativas la escribe la API (`api-007` CA-26). No requiere DBR propia: la que necesita el borrado lógico de noticias y eventos (DBR-005) acompaña a `api-007`.

## Flujos y errores

1. Con sesión válida, la navegación muestra las secciones del perfil según `me`.
2. Cada sección carga su lista al abrirse; las altas, ediciones y bajas llaman a la API y refrescan la lista.
3. Errores: 401 → login con «Tu sesión expiró»; 403/404/422 → mensaje en español en la propia vista; fallo de red → estado de error con opción de reintentar.
4. Exportación: la descarga se inicia desde la API; si falla, la vista conserva el reporte y muestra el error.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** `api-007` (esta feature no puede cerrarse sin ella; para la zona horaria, `api-007` RN-14 y CA-28), `dashboard-002`, ADR 0002; ADR 0017 (Excel y PDF, aceptado el 2026-10-30) en el lado de la API.
- **Riesgos:**
  - Sin ventas reales el Panel y el Reporte se verán vacíos.
  - El volumen de componentes nuevos (tablas, diálogos, formularios) puede requerir ampliar `@arca/ui`; se resolverá en el plan sin nuevas dependencias.
  - La spec es amplia y se entrega completa; el plan ordenará el trabajo internamente por sección sin cambiar el alcance ni dividir la entrega.
- **Preguntas resueltas (Jonathan):**
  1. Columnas y filtros propuestos para la tabla de Usuarios: suficientes.
  2. Entrega: todo junto, no por etapas.
  3. Diseño: no cambia colores ni tipografía; las vistas nuevas siguen los patrones de las pantallas actuales. Se pueden agregar secciones, botones, ventanas (diálogos) y similares, siempre con los mismos patrones y componentes ya definidos (RN-09).
- **Pregunta de zona horaria (2026-10-30): confirmada por Jonathan, 2026-10-30.**
  4. ¿El Panel y el Reporte deben mostrar la zona horaria que la API usó (p. ej. «Hora de Ciudad de México»)? Respuesta: no. La interfaz no muestra la zona usada y esta feature no añade ese texto. Confirmado por Jonathan, 2026-10-30.

## Revisión

- Aprobadores y fecha: Jonathan (responsable funcional), 2026-10-30.
- Evidencia/enlaces: `apps/api/specs/007-administration-management.md`, `apps/dashboard/specs/002-real-staff-login.md`, `apps/dashboard/specs/001-admin-dashboard-prototype.md`, `docs/03-roles-y-permisos.md`.
- Cambio de 2026-10-30 (decisión de Jonathan, responsable funcional): zona horaria del dispositivo, con respaldo en `America/Mexico_City`. Jonathan confirmó la decisión y aprobó proceder con la implementación. Se añaden RN-11 y CA-19; CA-18 se amplía a CA-01 a CA-19.
- La redacción literal de CA-19 y RN-11 la proveyó el documentador y fue confirmada por Jonathan, 2026-10-30.
- Confirmado por Jonathan, 2026-10-30: la interfaz no muestra la zona usada (pregunta 4).
- Confirmado por Jonathan, 2026-10-30: redacción reconciliada de RN-10 y CA-12 (divergencia de `apps/dashboard/plan/003-administration-sections.md`); Excel y PDF se ofrecen en la interfaz y dependen de la API (ADR 0017).
- Actualización de 2026-10-30 (aceptación del ADR 0017 por el equipo, solicitada por la sesión principal): la API ya habilita CSV, Excel y PDF. RN-10 y CA-12 se actualizan para que el 422 quede solo para formato fuera de la lista o PDF sobre el tope. Los criterios no cambian. Pendiente de confirmación funcional de Jonathan de esta redacción.
- Estado cambiado a Implementada el 2026-10-30: CA verificados con pruebas, revisión de calidad y de seguridad, Constitution Check y pruebas manuales de Jonathan.
