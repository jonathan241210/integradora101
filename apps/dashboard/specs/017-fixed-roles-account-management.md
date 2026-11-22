# 017 · fixed-roles-account-management

- App dueña: `dashboard`
- Apps/paquetes afectados: `dashboard`, `packages/api-client` (campos nuevos de `users`, `users/options` y avisos de consola)
- Estado: Aprobada
- Solicitante / responsable funcional: Jonathan
- Aprobación funcional: Jonathan, 2026-11-20
- Cambio 3 de 4. Depende de `api-023` (roles fijos, cuentas admin solo por consola, avisos de consola) y de `api-007` (gestión de usuarios, revisada por `api-023`). Cita `api-021` solo para la confirmación de contraseña, que esta spec no redefine (usa el diálogo de `dashboard-015`). Relacionada con `dashboard-003` (secciones de administración), `dashboard-002` (login) y `dashboard-004` (formularios en línea).

## Problema y contexto

La sección Usuarios del dashboard (`dashboard-003`) ofrece hoy como rol asignable cualquiera de los cinco de la API, incluido «Administrador de Presidencia», y trata a todas las cuentas por igual. Con `api-023`:

- `admin` deja de ser un rol que se pueda elegir ni operar desde la interfaz. Sus cuentas se ven en la tabla, pero solo en lectura.
- `executive` se presenta como «Consulta directiva» y aparece un rol nuevo, «Comunicación».
- Los roles de Dirección y de Comunicación exigen 2FA; la persona debe saberlo al crear la cuenta.
- Un administrador puede recibir avisos de cambios hechos por consola que no hizo él mismo; debe verlos al iniciar sesión.

La interfaz no toma decisiones: lo que muestra viene de la API (RN-02 de `dashboard-003`).

## Objetivos

- Alta y edición de cuentas no admin con los roles que devuelve la API (`users/options`), sin «Administrador de Presidencia».
- Cuentas `admin` visibles y en solo lectura, sin acciones de gestión y con una indicación clara.
- Vista de solo lectura de lo que permite el rol elegido, con las secciones que abre.
- Aviso al administrador, al iniciar sesión, de los cambios de cuentas admin hechos desde la consola; se marca como leído.
- Navegación y etiquetas de «Consulta directiva» y «Comunicación» según la API.

## Fuera de alcance

- Cualquier acción de escritura sobre cuentas `admin` desde la interfaz (no existe, ni siquiera deshabilitada con función).
- Crear roles, permisos por cuenta o cuentas delegadas.
- Cambio de contraseña propio y recuperación por correo. (El cambio de contraseña propia con contraseña actual es de `api-021`, CA-33; su pantalla no se diseña aquí.)
- Comandos de consola y su salida (solo se muestra el resultado en el aviso).
- Pantalla de inicio de Comunicación: decidida en `api-023` (Noticias); esta spec solo la consume.
- Rediseño visual de la sección (ya cubierto por `dashboard-003`, revisión visual de 2026-11-12).
- Tiempo real, notificaciones push o correo.
- Cambios en `apps/web`, `apps/pwa` y `apps/mobile`.
- Autorización en el cliente: la interfaz oculta acciones; la API decide (RN-01 de `dashboard-003`).

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| `admin` (Presidencia e Informática) | Gestionar cuentas no admin; ver cuentas admin en solo lectura; leer avisos de consola | Sesión válida + 2FA confirmado; `users.manage` |
| `zoo-admin` | Sin sección Usuarios (decisión de 2026-11-05, `dashboard-003`) | Sin cambios |
| `executive` («Consulta directiva») | Panel y Reporte en solo lectura; sin Usuarios | `dashboard.view`, `reports.view`, `public-content.view` |
| `communications` («Comunicación») | Noticias, Eventos, Momentos y TulanPedia; sin Usuarios | `news.manage`, `events.manage`, `memories.review`, `species.review`, `public-content.view` |
| `cashier`, `veterinarian` | Sin cambios | Sin cambios |

## Historias de usuario

- Como administrador, quiero elegir un rol de la lista que me entrega la API, sin ver «Administrador de Presidencia», para no intentar algo que no puedo hacer.
- Como administrador, quiero ver en solo lectura las cuentas admin, con la indicación de que se gestionan desde la consola, para saber quién tiene el rol sin poder modificarlo.
- Como administrador, quiero ver qué secciones abre un rol antes de crear la cuenta, para elegir bien.
- Como administrador, quiero un aviso al entrar cuando se haya cambiado una cuenta admin por consola, para no enterarme tarde.
- Como persona de Dirección o de Comunicación, quiero que mi pantalla de inicio muestre solo lo que mi rol permite, para no ver secciones vacías ni sin acceso.

## Criterios de aceptación

### Alta y edición de cuentas

- **CA-01:** Dado el formulario de alta, cuando se abre el selector de rol, entonces las opciones son exactamente las que devuelve `users/options` (`api-023` CA-10); no aparece «Administrador de Presidencia» ni el valor `admin` en el DOM, en el estado del ViewModel ni en las opciones.
- **CA-02:** Dado un rol elegido en el alta o en la edición, cuando se muestra, entonces aparece en solo lectura **las secciones que abre** el rol (decisión 2026-11-20). Las secciones se derivan de la lista de permisos que entrega la API (`users/options`) con el mapa permiso → sección de `dashboard-003`, sin deducir nada del nombre del rol.
- **CA-03:** Dado un rol con `two_factor_required: true` elegido en el alta, cuando se muestra el formulario, entonces aparece el texto «Esta cuenta deberá configurar su segundo factor (2FA) al iniciar sesión por primera vez.» sin bloquear el envío.
- **CA-04:** Dada una cuenta con rol `admin` en la tabla, cuando se muestra, entonces aparece con la etiqueta «Gestionada desde la consola del servidor», sin ninguna acción (ni editar, activar o desactivar, eliminar, restablecer contraseña o 2FA), y su detalle es de solo lectura (`managed_by_console: true`). Decisión 2026-11-20: las cuentas admin aparecen sin acciones, ni deshabilitadas. También aparecen en los resultados de la búsqueda global, en solo lectura y sin acciones (decisión Q5 de `api-023`, 2026-11-20).
- **CA-05:** Dada una cuenta no admin, cuando se editan, activan o desactivan, eliminan o restablecen contraseña o 2FA, entonces se aplican las reglas de `dashboard-003` (CA-05, CA-06) y de `api-021` para la confirmación de contraseña (con el diálogo de `dashboard-015`); esta spec no las cambia.
- **CA-06:** Dada una respuesta 403 de la API sobre una cuenta admin o por un rol `admin` pedido (`api-023` CA-11 y CA-12), cuando llega a la vista, entonces muestra el mensaje de la API en español en el propio formulario o diálogo, sin cambiar la lista ni cerrar la vista de forma inesperada.

### Navegación, inicio y etiquetas

- **CA-07:** Dada una cuenta `executive` («Consulta directiva»), cuando inicia sesión, entonces su pantalla de inicio es el Panel principal y su navegación muestra solo Panel principal y Reporte de boletos, en solo lectura (`dashboard-003` CA-13).
- **CA-08:** Dada una cuenta `communications`, cuando inicia sesión, entonces su navegación muestra solo Noticias, Eventos, Momentos y TulanPedia según sus permisos, y su pantalla de inicio es Noticias (decisión 2026-11-20, `api-023` CA-07). La interfaz no tiene ninguna pantalla de inicio por nombre de rol.
- **CA-09:** Dada la interfaz de cuentas y de sesión, cuando muestra un rol, entonces usa la etiqueta que entrega la API («Consulta directiva», «Comunicación»). La cabecera del panel para el perfil `executive` muestra «Consulta directiva» (decisión 2026-11-20, en lugar de «Panel ejecutivo»). No aparece «Ejecutivo» ni «Panel ejecutivo» en ningún selector, tabla, cabecera ni mensaje.

### Aviso de cambios de consola

- **CA-10:** Dada una cuenta `admin` con avisos de consola no leídos, cuando inicia sesión, entonces ve un aviso accesible (`role="status"` o `role="alert"` según su tono) con texto por cada aviso: «Cambio por consola: {acción} en {correo} el {fecha}. Motivo: {motivo}.». Si hay varios, se listan todos, con desplazamiento si no caben (decisión 2026-11-20). El aviso aparece sobre la pantalla de inicio y puede cerrarse. *Sustituido por CA-19 a CA-21 y CA-23 (revisión 2026-11-21): ya no es banner fijo; el texto de cada aviso no cambia.*
- **CA-11:** Dado un aviso mostrado, cuando el administrador lo cierra, entonces la interfaz llama a `POST /api/v1/admin/console-notices/{notice}/read` (`api-023` CA-26), el aviso deja de mostrarse y no reaparece al iniciar otra sesión. *Sustituido por CA-19 y CA-22 (revisión 2026-11-21): se marca leído al mostrarse, no al cerrar.*
- **CA-12:** Dada una cuenta sin `users.manage`, cuando inicia sesión, entonces la interfaz no consulta los avisos de consola y no muestra ninguno.
- **CA-13:** Dado un fallo al consultar los avisos de consola, cuando ocurre, entonces el panel carga igual y el aviso muestra un mensaje de error en español con opción de reintentar; no bloquea la navegación. *Sustituido por CA-25 (revisión 2026-11-21): el error sale como aviso emergente, sin banner ni reintento.*

### Calidad y transversales

- **CA-14:** Dadas las vistas nuevas o cambiadas, cuando se usan con teclado y en anchos de 360 a 1366 px, entonces conservan foco visible, diálogos con foco atrapado y cierre con Escape, tablas con desplazamiento propio y sin desbordamiento horizontal de la página.
- **CA-15:** Dado el código del dashboard, cuando se revisa, entonces toda llamada a la API pasa por `@arca/api-client` desde hooks ViewModel; ningún componente de `views/` o `components/` usa `fetch`/`axios` ni decide permisos o roles por nombre.
- **CA-16:** Dado cualquier 401 en estas secciones o en la consulta de avisos, cuando lo detecta el estado de sesión, entonces el dashboard vuelve al login con «Tu sesión expiró» (`dashboard-002` CA-08).
- **CA-17:** Dada la interfaz, cuando se revisa su estilo, entonces usa tokens semánticos y no fija hex de marca.
- **CA-18:** Dada la suite de Vitest con un cliente simulado de `@arca/api-client`, cuando se ejecuta, entonces existe al menos una prueba que nombra cada CA-01 a CA-17.

### Revisión 2026-11-21 (aprobada por Jonathan): avisos de consola como emergentes

Los avisos de cambios por consola dejan de ser un banner fijo en el Panel principal y salen como mensaje emergente de la cola de `DashboardNotifications`, la misma de los avisos de pendientes (`dashboard-018`). CA-12, CA-14 (en lo que no es del banner), CA-15, CA-16 y CA-17 se mantienen.

Criterios sustituidos (nota 2026-11-21): CA-10, CA-11 y CA-13 (el banner con cierre y reintento) los sustituyen CA-19 a CA-25; la cobertura de CA-18 y CA-26 no los exige y su test los omite.

- **CA-19:** Dada una cuenta con `users.manage` y avisos de consola no leídos, cuando inicia sesión, entonces cada aviso reciente sale una sola vez como emergente de tono `info` con el texto «Cambio por consola: {acción} en {correo} el {fecha}. Motivo: {motivo}.», y al mostrarse se marca como leído con `POST /api/v1/admin/console-notices/{notice}/read` para que no vuelva a salir.
- **CA-20:** Dados avisos de distinta antigüedad, cuando se decide qué mostrar, entonces solo se muestran los de los últimos 7 días según `created_at`; los más viejos se marcan como leídos sin mostrarse.
- **CA-21:** Dados más de 3 avisos recientes, cuando se muestran, entonces salen los 3 más recientes y un cuarto emergente «Y N cambios más por consola en los últimos días.» (con N = los restantes; «Y 1 cambio más…» si es uno). Los resumidos también se marcan como leídos.
- **CA-22:** Dado un fallo al marcar un aviso como leído, cuando ocurre, entonces no se reintenta ni se muestra error al usuario; el aviso volverá a salir en el siguiente inicio de sesión.
- **CA-23:** Dado el Panel principal, cuando se abre, entonces ya no muestra el banner de avisos de consola; `ConsoleNoticesBanner` y su CSS se eliminan.
- **CA-24:** Dados avisos de consola y avisos de pendientes (`dashboard-018`) en el mismo inicio de sesión, cuando se publican, entonces comparten la cola FIFO (RN-14 de `dashboard-018`) y no se duplican al cambiar de sección: se consultan solo al iniciar sesión.
- **CA-25:** Dado un fallo al consultar los avisos de consola, cuando ocurre, entonces se publica un emergente de error en español («No fue posible consultar los avisos de consola.») y el panel carga igual.
- **CA-26:** Dada la suite de Vitest, cuando se ejecuta, entonces existe al menos una prueba que nombra cada CA-19 a CA-25.


## Reglas de negocio

- **RN-01:** La interfaz solo presenta. Ocultar una acción nunca protege la operación; la API aplica la regla de `api-023` (RN-06).
- **RN-02:** Los roles asignables, sus permisos, su etiqueta, `two_factor_required` y las listas de avisos vienen de la API. El cliente no reimplementa estas reglas (RN-02 de `dashboard-003`).
- **RN-03:** La vista de solo lectura del rol y los avisos de consola usan los textos de la API en español; la interfaz no traduce permisos ni códigos de rol por su cuenta. El mapa permiso → sección es de presentación (`dashboard-003`).
- **RN-04:** Las cuentas `admin` no tienen acciones de escritura en la interfaz. Esta regla es de presentación; el bloqueo real está en `api-023` (CA-11).
- **RN-05:** Un aviso de consola se marca como leído solo al cerrarlo; nunca se marca automáticamente al mostrarse.
- **RN-06:** Mensajes y etiquetas en español; identificadores en inglés (Constitución VI).
- **RN-07:** Sin React Router: la navegación sigue por estado de la SPA (ADR 0002).
- **RN-08:** La contraseña capturada para crear o restablecer una cuenta no se guarda en el cliente y se descarta tras enviarla (RN-07 de `dashboard-003`).

## Datos, privacidad y auditoría

- La interfaz muestra datos personales del personal (correo, nombre, área, rol) y, en los avisos, el correo de la cuenta afectada por un cambio de consola. Solo lo ve quien la API autoriza (`users.manage`).
- No se almacenan avisos ni datos de usuarios fuera de la memoria de la sesión.
- No requiere DBR: esta spec no toca esquema. Los datos de los avisos y su estado de leído están en `api-023` (verificación de esquema en su plan).

## Flujos y errores

1. Con sesión válida, la navegación muestra las secciones según `me` (permisos).
2. Usuarios (solo `users.manage`): la tabla muestra cuentas no admin con acciones y cuentas admin en solo lectura.
3. Alta: el selector ofrece los roles de `users/options`; al elegir uno se muestran sus secciones (solo lectura) y, si corresponde, la nota de 2FA.
4. Aviso de consola al iniciar sesión (solo `users.manage`): se muestran todos los no leídos; cada cierre los marca como leídos.
5. Errores: 401 → login («Tu sesión expiró»); 403/404/422 → mensaje en español en la vista, sin cambiar la lista; fallo de red → estado de error con reintento; fallo de avisos → aviso con error y el resto de la app sigue.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** `api-023` (roles, CA-10 con permisos etiquetados y `two_factor_required`, CA-11/CA-12 de cuentas admin, CA-13 `managed_by_console`, CA-25/CA-26 avisos de consola); `api-007` (revisada); `api-021` (confirmación de contraseña) y `dashboard-015` (diálogo); `dashboard-002`, `dashboard-003` (CA-05, CA-06, CA-07, CA-13), `dashboard-004` (formularios en línea). ADR 0002.
- **Riesgos:**
  - Si `api-023` no entrega `managed_by_console` o `two_factor_required`, la interfaz no puede cumplir CA-03 ni CA-04: bloqueo de dependencia.
  - Impacto en código y pruebas existentes (ver «Impacto en el código del dashboard»).
- **Impacto en el código del dashboard (lectura, sin cambios en esta spec):**
  - `apps/dashboard/src/App.tsx` líneas 287-288: etiqueta «Panel ejecutivo» para el perfil `executive`; pasa a «Consulta directiva» (CA-09).
  - `apps/dashboard/src/viewmodels/navigation.ts`: tipo `PresentationProfile` y `case "executive"`; el mapa permiso → sección no cambia.
  - `apps/dashboard/src/tests/administration-navigation.test.tsx`: pruebas que nombran `operational-staff.manage` (línea 52 y 62) y la de `executive` (líneas 91-136).
  - `apps/dashboard/src/tests/staff-accounts.test.tsx` línea 184: comprueba que no aparece «Ejecutivo».
  - `apps/dashboard/src/tests/admin-fixtures.ts`: roles fijos de prueba (se añaden `communications` y las etiquetas nuevas).
  - Vistas de la sección Usuarios (`views/`) y su ViewModel: selector de rol, tabla y formularios (no revisados línea a línea en esta redacción; el plan los localiza).
  - `packages/api-client`: `StaffHome` (`types.ts`) no cambia; se añaden tipos de avisos de consola y campos de cuentas.
- **Decisiones 2026-11-20** (las preguntas de la versión Borrador quedan cerradas):
  1. **Vista de solo lectura del rol.** Decisión 2026-11-20: mostrar las secciones que abre el rol (CA-02), no la lista completa de permisos.
  2. **Cuentas `admin` en la tabla.** Decisión 2026-11-20: sin acciones y con la etiqueta de CA-04 (no acciones deshabilitadas).
  3. **Varios avisos de consola no leídos.** Decisión 2026-11-20: se listan todos, con desplazamiento (CA-10); no se resumen en uno.
  4. **Etiqueta del perfil `executive` en la cabecera.** Decisión 2026-11-20: «Consulta directiva» (CA-09), en sustitución de «Panel ejecutivo».
  5. **Pantalla de inicio de Comunicación.** Decisión 2026-11-20: Noticias (CA-08; `api-023` pregunta 4).

## Revisión

- Aprobadores y fecha: Jonathan (responsable funcional), 2026-11-20.
- Enmienda técnica 2026-11-20: CA-04 incluye la búsqueda global (decisión Q5 de `api-023`). Las decisiones Q1 a Q4 y Q6 de `api-023` no cambian esta spec. Filtro «Todos los roles» aceptado (propuesta del plan).
- Evidencia/enlaces: `apps/api/specs/023-fixed-roles-and-console-admins.md`, `apps/api/specs/007-administration-management.md`, `apps/dashboard/specs/003-administration-sections.md`, `apps/dashboard/specs/002-real-staff-login.md`, `apps/dashboard/src/viewmodels/navigation.ts`, `apps/dashboard/src/App.tsx`.
- Historial de estado: Borrador (2026-11-20); Aprobada (2026-11-20); revisión 2026-11-21 aprobada por Jonathan (avisos de consola como emergentes, CA-19 a CA-26).
- Nota de revisión (2026-11-21, `dashboard-020`): la sección Usuarios aplica la regla de mensajes de `dashboard-020` RN-07 (CA-25). El error general de restablecer contraseña pasa a aviso emergente; el fallo al cargar roles (`optionsError`) pasa a estado de la vista con reintento. CA-06 y CA-13 de esta spec no cambian. La etiqueta de «Reporte de boletos» y «Cancelaciones» en las secciones que abre un rol pasa a «Reportes» (`dashboard-020` CA-01).
- Nota de revisión (2026-11-21 (b), `dashboard-020` CA-33 a CA-42): las acciones sobre una cuenta (activar, desactivar, eliminar, restablecer contraseña y 2FA) se confirman en un diálogo modal (`ConfirmDialog`), no en línea; el diálogo de contraseña de `dashboard-015` se abre encima sin cerrarlo (CA-36). En el formulario, el área sugiere el rol (`suggested_role` de `users/options`), con ayuda fija y aviso suave si el rol difiere; el admin puede cambiarlo y no se le pisa. Esta nota no cambia los CA de esta spec. Ver `apps/dashboard/specs/020-unified-reports-and-feedback.md`.

- Nota 2026-11-21 (c): la paginación de esta pantalla usa el componente único `Pagination` (`dashboard-020` CA-43 a CA-48); su comportamiento (tamaño de página, reinicio al filtrar) y los CA de esta spec no cambian.
