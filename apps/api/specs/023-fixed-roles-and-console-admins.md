# 023 · fixed-roles-and-console-admins

- App dueña: `api`
- Apps/paquetes afectados: `api`, `dashboard` (consumidor, `dashboard-017`), `packages/api-client` (contrato de roles, permisos y avisos de consola; sin cambio en los valores de `home`, salvo el de Comunicación, que es `administration`)
- Estado: Aprobada
- Solicitante / responsable funcional: Jonathan
- Responsable de BD: Víctor Adrián (solo si el plan abre una DBR; ver «Datos, privacidad y auditoría»: la verificación de esquema de 2026-11-20 indica que no hace falta)
- Aprobación funcional: Jonathan, 2026-11-20
- Cambio 3 de 4 (orden de implementación 1 → 2 → 3 → 4). Specs relacionadas: `api-021` (2FA de taquilla y confirmación de contraseña; esta spec solo la cita), `api-007` (gestión de usuarios; recibe una nota de revisión), `api-003` (login, 2FA y `me`), `api-009` (historial de boletos), `dashboard-017` (interfaz de esta spec).

## Problema y contexto

Hoy el catálogo de roles tiene cinco códigos: `admin` (Presidencia, 4 cuentas), `zoo-admin` (3), `executive` (1), `cashier` (1) y `veterinarian` (1). Cuatro problemas motivan este cambio:

1. **Cualquier gestor de cuentas puede crear o promover administradores.** `ResolveManageableRolesAction` devuelve todos los roles a quien tiene `users.manage`, incluido `admin`. Desde la API, un administrador puede crear otro administrador, cambiarle el rol o restablecer su contraseña y su 2FA.
2. **Dirección necesita dos roles que hoy no existen.** Uno de solo lectura para la dirección («Consulta directiva», que sustituye la etiqueta de `executive`) y otro para contenido público («Comunicación»: noticias, eventos, momentos y TulanPedia).
3. **Algunas decisiones dependen del nombre del rol.** `ListTicketHistoryAction` (`FULL_READ_ROLES = ['admin', 'zoo-admin']`) y `ResolveStaffHomeAction` deciden por código de rol. Cada rol nuevo obligaría a tocar código; las decisiones deben pasar a permisos.
4. **La alta por consola no tiene controles.** `php artisan arca:create-staff` ofrece `admin`, no pide motivo, no deja auditoría ni avisa a los administradores.

Además, la base viva tiene el permiso `operational-staff.manage`, que ya no está en el seeder (ver «Hallazgos»).

## Objetivos

- Catálogo cerrado de seis roles de personal: `admin`, `zoo-admin`, `executive` («Consulta directiva», código conservado), `communications` («Comunicación»), `cashier` y `veterinarian`. No hay permisos por cuenta ni roles creados desde la interfaz.
- Las cuentas `admin` no se crean, promueven, editan, desactivan, eliminan ni restablecen desde la API ni el dashboard; solo desde la consola del servidor (`arca:admin:*`).
- Las decisiones de lectura del historial de boletos, de inicio por cuenta y de sugerencia de rol se toman por permiso, no por nombre de rol.
- Cada comando de consola que cambia datos exige motivo, pide confirmación, deja auditoría con su origen y avisa a los administradores activos.
- Ninguna cuenta queda sin administrador activo.

## Fuera de alcance

- Permisos por cuenta, roles creados desde la interfaz o cuentas delegadas.
- Cambio de contraseña propio, recuperación por correo y contraseña temporal con cambio obligatorio. (El cambio de contraseña propia con contraseña actual es de `api-021`, CA-33.)
- Comando de eliminación de cuentas (no existe; la baja es lógica, desactivar). *Revisión 2026-11-21: ahora existe `arca:admin:delete`, solo borrado lógico (CA-46, RN-25).*
- Interfaz de la consola (solo línea de comandos) y herramienta de rescate fuera del servidor.
- Confirmación de contraseña en las operaciones de usuarios desde la API: la define `api-021`.
- 2FA de `veterinarian` (sigue sin 2FA, trabajo de campo offline).
- Limpieza de la fila `operational-staff.manage` de la base: es un cambio de datos aparte (decisión 2026-11-20).
- Rediseño de la vista de la sección Usuarios en el dashboard (lo cubre `dashboard-017`).
- Cambios en `apps/web`, `apps/pwa` y `apps/mobile`.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| `admin` (Presidencia e Informática) | Ver cuentas admin en solo lectura desde la API y gestionarlas desde la consola; leer el historial completo de boletos | Sesión válida + 2FA confirmado; `users.manage` (solo lectura sobre cuentas `admin`); `tickets.view-all` |
| `zoo-admin` (Dirección del zoológico) | Mismo panel de contenido y reportes; sin cuentas (`api-007`) | Sin cambios: `news.manage`, `events.manage`, `enclosures.manage`, `dashboard.view`, `reports.view`, `tickets.view`, `tickets.view-all`, `cash-closings.view`, `public-content.view`, `species.review`, `memories.review` |
| `executive` («Consulta directiva») | Panel y reporte en solo lectura | `dashboard.view`, `reports.view`, `public-content.view` |
| `communications` («Comunicación») | Publicar contenido y revisar solicitudes | `news.manage`, `events.manage`, `memories.review`, `species.review`, `public-content.view` |
| `cashier` | Sin cambios funcionales (2FA desde `api-021`) | Sin cambios |
| `veterinarian` | Sin cambios; sin 2FA | Sin cambios |
| Operador de consola (persona con acceso al servidor) | Crear, promover, desactivar, restablecer y listar cuentas admin | Acceso al servidor; no hay rol en la aplicación. Persona por identificar |

## Historias de usuario

- Como administrador de Presidencia, quiero que ninguna cuenta de administrador pueda cambiarse desde la pantalla de usuarios, para que solo un cambio hecho en el servidor afecte a los administradores.
- Como persona de Dirección, quiero una cuenta de solo consulta con el panel y el reporte, para revisar cifras sin poder modificar nada.
- Como persona de Comunicación, quiero una cuenta que publique noticias, eventos, momentos y especies sin acceder a taquilla ni a cuentas.
- Como operador del servidor, quiero dar de alta, promover, desactivar o restablecer un administrador con un motivo registrado, para que cada cambio tenga responsable y trazabilidad.
- Como administrador, quiero recibir un aviso al entrar cada vez que se cambie una cuenta admin desde la consola, para enterarme aunque no lo haya hecho yo.

## Criterios de aceptación

### Roles y permisos

- **CA-01:** Dado el seeder de roles, cuando se ejecuta, entonces el rol `executive` (etiqueta «Consulta directiva») tiene exactamente `dashboard.view`, `reports.view` y `public-content.view`, y ningún otro permiso.
- **CA-02:** Dado el seeder de roles, cuando se ejecuta, entonces el rol `communications` (etiqueta «Comunicación») tiene exactamente `news.manage`, `events.manage`, `memories.review`, `species.review` y `public-content.view`, sin `dashboard.view`, `reports.view` ni `users.manage`.
- **CA-03:** Dada la cuenta existente con rol `executive` (única en la base viva, ver «Estado actual»), cuando se aplica esta spec, entonces la cuenta conserva su identificador, sus datos, su historial de `activity_log` y sus sesiones válidas; no se borra ni se duplica; su rol conserva el código `executive`, tiene los mismos permisos y el mismo `home` que antes, y su etiqueta en la API es «Consulta directiva» (decisión 2026-11-20: no hay migración de código).
- **CA-04:** Dada la configuración `arca.two_factor_roles`, cuando se consulta, entonces contiene `admin`, `zoo-admin`, `cashier`, `executive` y `communications`, y no contiene `veterinarian`. Una cuenta de esos roles sin 2FA confirmado recibe 403 `two_factor_setup_required` en las rutas protegidas distintas de `me`, `logout` y 2FA.
- **CA-05:** Dada la cuenta `executive` existente sin 2FA, cuando inicia sesión tras aplicar esta spec, entonces `me` devuelve `two_factor_setup_required: true` y debe configurar el 2FA antes de usar el panel.
- **CA-06:** Dadas las cuentas existentes, cuando consultan `GET /api/v1/auth/me`, entonces el `home` por permiso (RN-03) es: `admin` y `zoo-admin` → `administration`; `executive` → `executive`; `cashier` → `ticket`; `veterinarian` → `pwa` con `pwa_url`. Las respuestas coinciden con las de `api-003` CA-05.
- **CA-07:** Dada una cuenta con rol `communications`, cuando consulta `me`, entonces `home` es `administration` con la sección de inicio «Noticias» (decisión 2026-11-20), y su navegación muestra solo Noticias, Eventos, Momentos y TulanPedia según sus permisos. Ninguna cuenta activa queda sin `home`.
- **CA-08:** Dado el historial de boletos (`api-009`), cuando lo consulta quien tiene el permiso `tickets.view-all` (admin y zoo-admin), entonces ve los boletos de todos los cajeros; cuando lo consulta `cashier`, ve solo los suyos; cuando lo consulta quien no tiene `tickets.view` (`executive`, `communications`, `veterinarian`), responde 403. El permiso `tickets.view-all` se asigna a `admin` y `zoo-admin`, equivalente a hoy (decisión 2026-11-20).
- **CA-09:** Dada cualquier área del catálogo `departments`, cuando se pide la sugerencia de rol por área, entonces la respuesta nunca es `admin`. Presidencia e Informática sugieren `executive` («Consulta directiva») (decisión 2026-11-20).
- **CA-10:** Dado `GET /api/v1/admin/users/options` con `users.manage`, cuando se consulta, entonces devuelve los roles asignables (sin `admin`), cada uno con su etiqueta en español (p. ej. «Consulta directiva») la lista de sus permisos con etiquetas en español y un indicador `two_factor_required` (verdadero para los roles de `arca.two_factor_roles`), para que el dashboard muestre en solo lectura lo que permite el rol y avise del 2FA obligatorio (`dashboard-017`). Un actor sin `users.manage` recibe 403 (api-007 CA-02).

### Cuentas admin desde la API

- **CA-11:** Dada una cuenta con rol `admin`, cuando un actor con `users.manage` llama a `PATCH /api/v1/admin/users/{user}`, `PATCH .../status`, `DELETE .../{user}`, `PUT .../password` o `DELETE .../two-factor`, entonces responde **403** con el mensaje «Las cuentas de administrador solo se gestionan desde la consola del servidor.», no hay cambios y la respuesta no depende del contenido del cuerpo, aunque sea inválido.
- **CA-12:** Dada una cuenta sin rol `admin`, cuando un actor con `users.manage` llama a `POST /api/v1/admin/users` o a `PATCH /api/v1/admin/users/{user}` con `role: "admin"`, entonces responde **403** con el mensaje «No puedes asignar el rol de administrador desde la administración.» y no hay cambios.
- **CA-13:** Dado `GET /api/v1/admin/users` o `GET /api/v1/admin/users/{user}` con `users.manage`, cuando la cuenta es `admin`, entonces responde 200 con sus datos en solo lectura y `managed_by_console: true`; las cuentas de otros roles devuelven `managed_by_console: false`. Ninguna respuesta incluye contraseña ni secretos 2FA.
- **CA-14:** Dada una operación de escritura sobre una cuenta, cuando se evalúan las condiciones en este orden, entonces se aplica: permiso `users.manage` (403) → cuenta inexistente (404 «Usuario no encontrado.») → cuenta `admin` o rol `admin` pedido (403 de CA-11 o CA-12) → validación del cuerpo (422). Esto mantiene el orden de `api-007` CA-02 y CA-04.

### Comandos de consola

- **CA-15:** Dado `php artisan list`, cuando se consulta el espacio `arca:admin`, entonces existen exactamente `arca:admin:create`, `arca:admin:promote {email}`, `arca:admin:deactivate {email}`, `arca:admin:reset-password {email}`, `arca:admin:reset-two-factor {email}` y `arca:admin:list`. No existe ningún comando de eliminación. *Nota revisión 2026-11-21: cambia de sentido; el conjunto pasa a ser el de CA-49 e incluye `delete` (borrado lógico, CA-46).*
- **CA-16:** Dado cualquier comando de `arca:admin:*` que cambie datos, cuando se ejecuta sin un motivo válido (RN-07: al menos 10 caracteres), entonces termina con código de fallo, muestra «Indica el motivo del cambio.» y no cambia ninguna cuenta, ni registra auditoría, ni crea avisos. `arca:admin:list` no pide motivo (decisión 2026-11-20).
- **CA-17:** Dado cualquier comando que cambie datos, cuando el operador rechaza la confirmación, entonces no hay cambios, ni auditoría ni avisos. Solo tras confirmar se aplica el cambio. *Nota revisión 2026-11-21: en el nivel medio la confirmación es escribir el correo afectado (CA-40); en el alto exige además la contraseña del titular (CA-38).*
- **CA-18:** Dado un cambio aplicado por consola, cuando se consulta `activity_log`, entonces existe un registro con la acción, la cuenta afectada (correo), el origen `consola`, el usuario del sistema operativo, el servidor, la fecha y el motivo; no tiene causante de tipo usuario de la aplicación y nunca contiene contraseñas ni secretos 2FA.
- **CA-19:** Dado un cambio aplicado por consola, cuando termina, entonces se crea un aviso no leído en `staff_notifications` para cada cuenta `admin` activa **después de aplicar el cambio** (decisión Q2, 2026-11-20; una cuenta desactivada por el cambio no recibe aviso), con un tipo nuevo de aviso, y ninguna cuenta no admin lo recibe.
- **CA-20:** Dado `arca:admin:deactivate` sobre la última cuenta `admin` activa, cuando se confirma, entonces el comando rechaza con «Debe existir al menos un administrador de Presidencia activo.» y no hay cambios. Con dos o más administradores activos, desactiva la cuenta indicada e invalida sus sesiones. *Nota revisión 2026-11-21: la última cuenta admin activa es necesariamente el titular, así que el comando la rechaza primero con el mensaje del titular (CA-45); `GuardAdministratorContinuityAction` conserva la regla y el mensaje.*
- **CA-21:** Dado `arca:admin:create` con correo válido, nombre, área, contraseña que cumple `Password::defaults()` y motivo, cuando se confirma, entonces crea una cuenta `admin` activa sin 2FA configurado; en su primer inicio de sesión `me` devuelve `two_factor_setup_required: true` hasta que confirme el 2FA.
- **CA-22:** Dado `arca:admin:promote {email}` sobre una cuenta activa no eliminada que no es `admin`, cuando se confirma, entonces esa cuenta tiene un único rol (`admin`), conserva su área y sus datos y sus sesiones siguen válidas. Sobre una cuenta inactiva o eliminada, rechaza el cambio con mensaje en español.
- **CA-23:** Dado `arca:admin:reset-password {email}`, cuando la nueva contraseña cumple `Password::defaults()` y se confirma, entonces se guarda con bcrypt y se invalidan las sesiones de la cuenta. Dado `arca:admin:reset-two-factor {email}`, cuando se confirma, entonces se borran el secreto, los códigos de recuperación y la confirmación, se invalidan sus sesiones y en su siguiente inicio exige configurar el 2FA. *Nota revisión 2026-11-21: `reset-password` es de nivel alto (CA-38) y `reset-two-factor` de nivel medio (CA-40).*
- **CA-24:** Dado `arca:create-staff`, cuando se muestra la lista de roles, entonces no incluye `admin`, y el rol no tiene un valor por defecto que conceda acceso (el operador elige explícitamente). *Enmienda Q4 (2026-11-20): el selector de rol arranca sin opción marcada; la sugerencia de área aparece en la etiqueta y no como valor por defecto.*

### Avisos a administradores

- **CA-25:** Dado `GET /api/v1/admin/console-notices` con `users.manage`, cuando lo consulta un administrador, entonces recibe solo sus avisos no leídos (`read_at` nulo) con la acción, la cuenta afectada, el origen, el motivo y la fecha; si hay varios, los recibe todos. Un actor sin `users.manage` recibe 403.
- **CA-26:** Dado `POST /api/v1/admin/console-notices/{notice}/read`, cuando el administrador marca su aviso, entonces se registra `read_at` y el aviso deja de aparecer en la consulta. Un aviso de otra cuenta responde 404 y no cambia.

### Hallazgos y transversales

- **CA-27:** Dada la base de código tras esta spec, cuando se busca `operational-staff.manage` y las decisiones por nombre de rol (`FULL_READ_ROLES`, `ResolveStaffHomeAction`, `CreateStaffCommand`), entonces ninguna ruta, policy ni Action decide por el permiso huérfano, y las decisiones usan permisos según RN-03.
- **CA-28:** Dada la suite de PHPUnit, cuando se ejecuta `php artisan test`, entonces corre contra `arca_pruebas` con `DatabaseTransactions` y existe al menos un test que nombra cada CA-01 a CA-31.
- **CA-29 (decisión 2026-11-20):** Dada una petición rechazada por 403 de CA-11 o CA-12 (operación sobre cuenta `admin` o rol `admin` pedido), cuando ocurre, entonces `activity_log` registra el intento con actor, ruta, cuenta afectada (correo), fecha y resultado `denied`, sin datos sensibles ni contraseñas, y no hay cambios. Los 403 por falta de permiso `users.manage` no se auditan.
- **CA-30 (decisión 2026-11-20):** Dado `arca:admin:deactivate`, `arca:admin:reset-password` o `arca:admin:reset-two-factor` sobre una cuenta que no tiene rol `admin`, cuando se ejecutan, entonces rechazan el cambio con mensaje en español y no hay cambios, ni auditoría ni avisos. Dado `arca:admin:promote` sobre una cuenta que ya es `admin`, entonces también rechaza el cambio.
- **CA-31 (decisión 2026-11-20):** Dado `arca:admin:list`, cuando se ejecuta, entonces muestra las cuentas `admin` sin pedir motivo, no cambia datos, no registra auditoría y no crea avisos.
- **CA-32 (decisión Q1, 2026-11-20):** Dado `php artisan list`, cuando se consulta, entonces no existe `arca:create-staff-simple`: el comando que creaba cuentas sin rol y sin auditoría se retira. `arca:create-staff` queda como único comando de alta de personal no admin.
- **CA-33 (decisión Q1, 2026-11-20):** Dado `arca:create-staff`, cuando crea una cuenta no admin, entonces cumple RN-07 a RN-10: pide motivo (sin motivo válido no cambia nada), muestra resumen, pide confirmación, registra la auditoría de cambio por consola (sin causante de usuario) y crea avisos para las cuentas `admin` activas tras el cambio.
- **CA-34 (decisión Q3, 2026-11-20):** Dado un comando `arca:admin:*` que cambia datos ejecutado sin terminal (`--no-interaction`), cuando se llama, entonces `promote`, `deactivate` y `reset-two-factor` solo aplican el cambio con `--reason` válido y `--yes`; sin `--yes` no cambian nada. `create` y `reset-password` se rechazan con «Este comando pide la contraseña en la terminal.» y no cambian nada. Ninguna contraseña se acepta como argumento u opción. *Nota revisión 2026-11-21: `promote` y `deactivate` pasan a nivel alto y se rechazan sin terminal; `reset-two-factor` (nivel medio) sin terminal exige `--reason` y `--confirm-email` (el `--yes` solo no basta); el nivel bajo sigue con `--reason` y `--yes`.*
- **CA-35 (decisión Q5, 2026-11-20):** Dada la búsqueda global (`api-019`, grupo `users`) con `users.manage`, cuando un término coincide con una cuenta `admin`, entonces la cuenta aparece en solo lectura, con `managed_by_console: true` y sin acciones de gestión. Las cuentas no admin conservan sus acciones.
- **CA-36 (decisión Q6, 2026-11-20):** Dada una cuenta `admin` como objetivo, cuando un actor con `users.manage` pide una escritura sin ventana vigente de `api-021` y sin `password`, entonces responde el 403 de cuenta admin de CA-11, no `password_confirmation_required`. El orden es el mismo en todas las operaciones de la cuenta admin (`api-021` CA-38).

### Revisión 2026-11-21 (aprobada por Jonathan): niveles de consola, titular y recuperación

Jonathan aprobó esta revisión el 2026-11-21. No cambia el esquema (sin DBR; `users.deleted_at` ya existe, verificado con `db:table users`). Los CA y RN nuevos continúan la numeración; los CA anteriores que cambian de sentido llevan nota.

- **CA-37:** Dada la variable `ARCA_PRIMARY_ADMIN_EMAIL` (`config('arca.primary_admin_email')`), cuando está vacía o su correo no es un administrador activo, entonces `create`, `promote`, `demote`, `deactivate`, `delete` y `reset-password` terminan en fallo con un error en español y no cambian nada, ni registran auditoría ni crean avisos.
- **CA-38:** Dado un comando de nivel alto, cuando se ejecuta con terminal, entonces pide la contraseña del titular oculta (nunca por opción), la valida con `Hash::check` y solo con una correcta continúa; con una incorrecta falla sin cambios; también si la operación es sobre la propia cuenta del titular. Sin terminal se rechaza.
- **CA-39:** Dados 5 fallos de contraseña del titular en 10 minutos, cuando ocurren, entonces los comandos de nivel alto quedan bloqueados 10 minutos (aunque la contraseña sea correcta); los fallos y el bloqueo se auditan con origen `consola`, sin causante de usuario y sin la contraseña. Los niveles bajo y medio no se bloquean.
- **CA-40:** Dado un comando de nivel medio (`edit-email`, `reactivate`, `reset-two-factor`), cuando se ejecuta, entonces exige motivo y escribir el correo afectado; `--yes` no lo sustituye; `--confirm-email=<correo>` lo sustituye solo si coincide; un correo distinto falla sin cambios.
- **CA-41:** Dado `arca:admin:edit-name {email}` (nivel bajo), cuando se ejecuta con motivo y confirmación, entonces cambia nombre y apellidos de una cuenta admin, deja auditoría `consola` y avisa a los administradores activos; sin motivo o sin confirmar no cambia nada.
- **CA-42:** Dado `arca:admin:edit-email {email}`, cuando el correo nuevo no tiene formato válido, ya existe (incluidas cuentas eliminadas), o la cuenta está eliminada, entonces falla sin cambios; sobre el titular se permite y avisa «Actualiza ARCA_PRIMARY_ADMIN_EMAIL en el .env».
- **CA-43:** Dado `arca:admin:reactivate {email}`, cuando la cuenta es admin, está inactiva y no eliminada, entonces la activa con auditoría y avisos; en cualquier otro caso falla sin cambios.
- **CA-44:** Dado `arca:admin:demote {email} {--role=}`, cuando se confirma con la contraseña del titular, entonces quita el rol `admin` y asigna el rol indicado, que es obligatorio y debe ser uno de los asignables (nunca `admin`); rechaza cuentas no admin, el titular y cualquier cambio que deje cero administradores activos.
- **CA-45:** Dada la cuenta titular, cuando se intenta `deactivate`, `delete` o `demote`, entonces falla con «Primero cambia ARCA_PRIMARY_ADMIN_EMAIL a otro administrador.» sin cambios.
- **CA-46:** Dado `arca:admin:delete {email}`, cuando la cuenta admin ya está desactivada, no es el titular ni la última activa, y se confirma con la contraseña del titular, entonces se borra de forma lógica (SoftDeletes), se invalidan sus sesiones y tokens y se conservan la auditoría y las relaciones; una cuenta activa o ya eliminada se rechaza.
- **CA-47:** Dado `ARCA_ADMIN_RECOVERY` (`config('arca.admin_recovery')`, `false` por defecto), cuando es `true`, entonces solo `arca:admin:reset-password` sobre el titular (o `create` si no hay ningún admin activo) se permite con motivo y escribiendo el correo, sin la contraseña del titular, y se audita como recuperación; el resto de comandos siguen pidiendo la contraseña.
- **CA-48:** Dado el modo recuperación activo, cuando se ejecuta cualquier `arca:admin:*`, entonces muestra «Modo recuperación activo: desactívalo al terminar (ARCA_ADMIN_RECOVERY=false).»; con el modo desactivado no aparece.
- **CA-49:** Dado `php artisan list`, cuando se consulta el espacio `arca:admin`, entonces existen exactamente `create`, `deactivate`, `delete`, `demote`, `edit-email`, `edit-name`, `list`, `promote`, `reactivate`, `reset-password` y `reset-two-factor`; ninguno borra físicamente.

**Reglas de negocio de la revisión**

- **RN-22 (niveles):** Todo comando que cambia datos pide motivo (RN-07), confirmación, deja auditoría `consola` (RN-09) y avisa (RN-10). Bajo: motivo y confirmación (`edit-name`). Medio: motivo y escribir el correo afectado (`edit-email`, `reactivate`, `reset-two-factor`). Alto: motivo y contraseña del titular (`create`, `promote`, `demote`, `deactivate`, `delete`, `reset-password`). `arca:admin:list` no pide motivo.
- **RN-23 (titular):** El titular es el admin activo cuyo correo está en `ARCA_PRIMARY_ADMIN_EMAIL`. No se puede desactivar, eliminar ni hacer `demote` mientras lo sea. Nunca queda cero admins activos (RN-11).
- **RN-24 (contraseña del titular):** Se pide oculta por prompt, nunca por opción; sin terminal se rechaza; 5 fallos en 10 minutos bloquean el nivel alto 10 minutos (caché y candado); se auditan fallos y bloqueos sin la contraseña. *Enmienda a RN-08: el nivel alto sí pide la contraseña del titular.*
- **RN-25 (eliminar):** `delete` es borrado lógico y solo de cuentas desactivadas, no titulares y que no sean la última; no borra físicamente. *Enmienda a RN-13, a «Fuera de alcance» y a RN-18: existe el comando de eliminación lógica y `arca:admin:*` incluye `edit-name`, `edit-email`, `reactivate`, `demote` y `delete`, todos sobre cuentas admin.*
- **RN-26 (recuperación):** `ARCA_ADMIN_RECOVERY=false` por defecto; solo se activa durante el procedimiento documentado y se desactiva al terminar; todo comando avisa mientras esté activo.

### Revisión 2026-11-21 (b) (aprobada por Jonathan): `arca:admin:list` con filtros y `arca:admin:help`

Jonathan aprobó esta revisión pequeña el 2026-11-21. Sin DBR ni migraciones (solo lectura de `users`, `deleted_at` ya existe). Los CA y RN continúan la numeración.

- **CA-50:** Dado `arca:admin:list` sin opciones, cuando se ejecuta, entonces muestra las cuentas admin activas y desactivadas (no las eliminadas), con el titular marcado «(Titular)».
- **CA-51:** Dado `arca:admin:list --deleted` (atajo `-d`), cuando se ejecuta, entonces muestra solo las cuentas admin eliminadas con SoftDeletes y su fecha de eliminación; sin ninguna muestra «No hay cuentas eliminadas.».
- **CA-52:** Dado `arca:admin:list --all`, cuando se ejecuta, entonces muestra todas las cuentas admin con una columna de estado «Activa», «Desactivada» o «Eliminada», y el titular marcado.
- **CA-53:** Dado `arca:admin:list --deleted --all`, cuando se ejecuta, entonces falla con «Las opciones --deleted y --all no se pueden usar juntas.» sin mostrar datos.
- **CA-54:** Dado `arca:admin:help`, cuando se ejecuta, entonces imprime en español, al estilo de `git help` y sin tabla (enmienda de Jonathan, 2026-11-21), la línea «uso: php artisan arca:admin:<comando> …» y cada comando `arca:admin:*` registrado agrupado por nivel con lo que pide cada nivel (nombre corto, descripción y opciones con su ayuda, tomados de su definición). Solo comandos y niveles; variables, ubicación y procedimiento quedan en `docs/administracion.md` (enmienda de Jonathan, 2026-11-21). Opciones con atajo: `-r` (`--reason`), `-y` (`--yes`), `-c` (`--confirm-email`), `-a` (`--all`), `-d` (`--deleted`). Es solo lectura, sin motivo, auditoría ni avisos.
- **CA-55:** Dado cualquier comando registrado en el espacio `arca:admin`, cuando se inspecciona, entonces declara su nivel (`LEVEL`: `lectura`, `bajo`, `medio` o `alto`), y su descripción y los textos de sus opciones están en español; un comando sin nivel hace fallar la prueba.

**Reglas de negocio de la revisión (b)**

- **RN-27:** `list` (con cualquier filtro) y `help` son de solo lectura (RN-22): sin motivo, auditoría ni avisos. `-d` solo se usa como atajo de `--deleted`; no choca con las opciones globales de Artisan (`-h -q -V -n -v`).
- **RN-28:** El nivel de cada comando se declara en una constante del propio comando y `arca:admin:help` la lee; no hay lista de niveles copiada a mano.
- *Nota a CA-15/CA-49:* el conjunto de comandos del espacio pasa a incluir `arca:admin:help` (solo lectura); sigue sin haber comandos que borren físicamente. La etiqueta «Inactiva» de `list` pasa a «Desactivada».

## Reglas de negocio

- **RN-01:** Catálogo cerrado de roles: `admin`, `zoo-admin`, `executive` (etiqueta «Consulta directiva», código conservado), `communications` (etiqueta «Comunicación»), `cashier` y `veterinarian`. Cada cuenta tiene exactamente un rol (api-007 RN-02). No hay permisos por cuenta ni roles creados desde la interfaz.
- **RN-02:** Los permisos de cada rol son los de CA-01, CA-02 y la matriz de `docs/03-roles-y-permisos.md`, que se actualiza con esta aprobación. El permiso de lectura total de boletos se llama `tickets.view-all` y se asigna a `admin` y `zoo-admin` (decisión 2026-11-20).
- **RN-03:** Decisiones por permiso, no por nombre de rol. Esta tabla sustituye `FULL_READ_ROLES` y la lógica de `ResolveStaffHomeAction`; el plan la aplica y la prueba con una matriz (CA-06):
  - Lectura total del historial de boletos: permiso `tickets.view-all`.
  - Inicio (`home`), en este orden: `users.manage` o `enclosures.manage` → `administration`; `dashboard.view` → `executive`; `tickets.create` → `ticket`; `medical-records.view` → `pwa` con `pwa_url`; ningún otro permiso de inicio → `administration` con la sección de inicio «Noticias» (decisión 2026-11-20; aplica a `communications`).
  - Sugerencia de rol por área: nunca `admin`; Presidencia e Informática sugieren `executive` (CA-09).
  - Acceso a las rutas de `users`: `users.manage` (sin cambio). Las cuentas `admin` tienen una restricción adicional por rol (RN-06).
- **RN-04:** El código `executive` se conserva y solo cambia su etiqueta (decisión 2026-11-20). Ningún rol se borra; un rol retirado de la alta queda sin efecto para cuentas nuevas y sigue siendo válido para las existentes hasta migrarlas.
- **RN-05:** `arca.two_factor_roles` = `admin`, `zoo-admin`, `cashier`, `executive`, `communications`. `veterinarian` no usa 2FA. El 2FA de la cuenta nueva o reasignada se exige en su primer inicio (api-003 CA-08).
- **RN-06:** Las cuentas `admin` no son asignables ni operables desde la API ni el dashboard (CA-11, CA-12). Se pueden leer (CA-13). Solo la consola las crea, promueve, desactiva, restablece o lista.
- **RN-07:** Motivo obligatorio en cada comando que cambie datos. Texto no vacío de al menos 10 caracteres, sin valores por defecto. `arca:admin:list` no pide motivo (decisión 2026-11-20). En modo no interactivo el motivo se pasa como opción obligatoria; el plan fija el nombre de la opción.
- **RN-08:** Confirmación explícita antes de aplicar (CA-17). La confirmación es interactiva; no pide la contraseña del operador, porque la consola no tiene sesión de la aplicación. El mecanismo de ejecución no interactiva no puede saltarse el motivo ni la auditoría. *Enmienda Q3 (2026-11-20): ver RN-20 y CA-34.*
- **RN-09:** Auditoría de cada cambio por consola con origen: `consola`, usuario del sistema operativo, servidor, fecha, motivo, acción y cuenta afectada. Se registra en `activity_log` sin causante de tipo usuario. Nunca se registran contraseñas ni secretos (api-003 CA-13).
- **RN-10:** Aviso a todas las cuentas `admin` activas después de aplicar el cambio (decisión Q2, 2026-11-20), en `staff_notifications` con un tipo nuevo. El contenido es el mínimo de CA-25 (acción, correo afectado, origen, motivo, fecha). No contiene contraseñas ni secretos.
- **RN-11:** Nunca queda cero administradores activos. Desactivar la última cuenta `admin` activa se rechaza (CA-20). Recomendación operativa, no forzada en código: mantener al menos dos administradores activos.
- **RN-12:** Cuenta `admin` nueva o promovida: sin 2FA hasta su enrolamiento; no recibe contraseña temporal ni cambio forzado (fuera de alcance).
- **RN-13:** Desactivar, restablecer contraseña o 2FA por consola invalida las sesiones de la cuenta afectada (api-007 RN-04). No hay comando de eliminación; la baja es desactivar (Constitución V).
- **RN-14:** Las operaciones de usuarios que confirman contraseña (cambios de rol, restablecimientos, operaciones sobre cuentas no admin) siguen las reglas de `api-021`; esta spec no las duplica.
- **RN-15:** Los mensajes al usuario están en español; rutas, permisos, comandos y códigos en inglés (Constitución VI).
- **RN-16:** `ResolveManageableRolesAction`, `CreateStaffCommand`, `SuggestRoleForDepartmentAction` y `GuardAdministratorContinuityAction` se adaptan a esta spec en el plan. `GuardAdministratorContinuityAction` sigue protegiendo el último admin activo desde la consola.
- **RN-17 (decisión 2026-11-20):** Los intentos rechazados por la API sobre cuentas `admin` se auditan (CA-29) con el mismo nivel de datos que RN-09 y sin contraseñas.
- **RN-18 (decisión 2026-11-20):** `arca:admin:*` solo gestiona cuentas `admin`, salvo `arca:admin:create` (alta de una cuenta `admin`) y `arca:admin:promote` (convierte una cuenta de personal existente en `admin`). `deactivate`, `reset-password` y `reset-two-factor` solo actúan sobre cuentas `admin` (CA-30).
- **RN-19 (decisión Q1, 2026-11-20):** `arca:create-staff` cumple RN-07 a RN-10 (motivo, confirmación, auditoría y avisos), como cualquier comando de consola que cambia datos (CA-33). `arca:create-staff-simple` se retira (CA-32).
- **RN-20 (decisión Q3, 2026-11-20):** en modo no interactivo el motivo va en `--reason` y la confirmación en `--yes`. `promote`, `deactivate` y `reset-two-factor` lo admiten; `create` y `reset-password` piden la contraseña oculta y se rechazan sin terminal (CA-34).
- **RN-21 (decisión Q6, 2026-11-20):** el control de cuenta admin (CA-11) se evalúa antes que el control de confirmación de contraseña de `api-021` (CA-36 y `api-021` CA-38).

## Datos, privacidad y auditoría

### Estado actual

Consulta en solo lectura a `arca_pruebas`, 2026-11-20 (resultado aportado por la sesión principal; el redactor no ejecuta consultas). Pendiente de repetir en el plan antes de cualquier cambio de datos.

- `users`: cuentas con SoftDeletes y `created_by`/`updated_by`; columnas de 2FA de `api-003`.
- Roles vivos: `admin` (4 cuentas), `zoo-admin` (3), `executive` (1), `cashier` (1), `veterinarian` (1). No existen `communications` ni roles de consola.
- Permisos vivos: los del seeder más `operational-staff.manage` (huérfano, no está en el seeder).
- `activity_log` (Spatie): `log_name`, `description`, `subject_*`, `causer_*`, `event`, `properties` (json), `batch_uuid`.
- `staff_notifications`: `user_id`, `type` varchar(40), `payload` json, `ticket_price_id` nullable, `created_by`, `read_at`, `acknowledged_at`; sin SoftDeletes (ADR 0021). Verificado en solo lectura el 2026-11-20 (`php artisan db:table staff_notifications`): `created_by int` **admite NULL**, así que los avisos por consola caben sin cambio de esquema.
- `sessions` (SESSION_DRIVER=database).

### Evaluación de DBR

No hace falta DBR. Los cambios son de datos y de catálogo, no de esquema: filas de `roles`, `permissions` y `role_has_permissions` (seeder), cambios de `users` y de `model_has_roles`, filas nuevas en `activity_log` y `staff_notifications` con un tipo nuevo (cabe en varchar(40)), y revocación de `sessions`. Condiciones verificadas: (a) `staff_notifications.created_by` admite NULL (verificado el 2026-11-20); (b) no hace falta columna nueva para el motivo (se guarda en `properties` de `activity_log` y en `payload`); (c) ninguna tabla nueva. Si el plan encuentra que alguna falla, abre DBR en `docs/database/requests/`; esta spec no la sustituye.

### Privacidad

- Se tratan datos personales del personal (correo, nombre, área) y datos operativos de la consola (usuario del sistema operativo y nombre del servidor). Se registran solo para auditoría.
- Ningún aviso, auditoría ni respuesta contiene contraseñas ni secretos de 2FA.
- Retención de avisos y de auditoría: pendiente (no se define aquí).

## Flujos y errores

### Flujo principal de consola (alta de administrador)

1. El operador ejecuta `php artisan arca:admin:create`.
2. El comando pide correo, nombre, apellidos, área, contraseña (oculta, validada con `Password::defaults()`) y motivo (RN-07).
3. Muestra el resumen (cuenta, rol `admin`, motivo) y pide confirmación (RN-08).
4. Aplica el cambio; registra auditoría (RN-09) y crea avisos (RN-10).
5. Al primer inicio de sesión, la cuenta debe configurar el 2FA (CA-21).

### Flujo de la API sobre cuentas admin

1. Un administrador con `users.manage` consulta la lista: ve las cuentas `admin` con `managed_by_console: true` (CA-13).
2. Si intenta operar sobre una cuenta `admin`, la API responde 403 sin cambios y lo audita (CA-11, CA-29).

### Errores esperados

| Caso | Respuesta |
|---|---|
| Operación de escritura sobre cuenta `admin` | 403 «Las cuentas de administrador solo se gestionan desde la consola del servidor.» (auditado, CA-29) |
| `role: "admin"` en alta o cambio de rol | 403 «No puedes asignar el rol de administrador desde la administración.» (auditado, CA-29) |
| Cuenta inexistente | 404 «Usuario no encontrado.» (orden de CA-14) |
| Sin `users.manage` | 403 por permiso (no auditado) |
| Sin 2FA confirmado en cuenta de rol obligatorio | 403 `two_factor_setup_required` |
| Comando sin motivo válido | Fallo; «Indica el motivo del cambio.»; sin cambios |
| Confirmación rechazada | Sin cambios |
| Desactivar la última cuenta `admin` activa | Fallo; «Debe existir al menos un administrador de Presidencia activo.» |
| Promover o cambiar una cuenta inactiva o eliminada | Fallo en español; sin cambios |
| Desactivar, restablecer contraseña o 2FA sobre cuenta no admin (comando) | Fallo en español; sin cambios (CA-30) |
| Consulta de avisos sin `users.manage` | 403 |
| Marcar como leído un aviso ajeno | 404 |

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** `api-021` (confirmación de contraseña, citada, no redactada aquí); `api-003` (login, 2FA, `me`; sus RN-01, RN-16 y RN-17 y su CA-05 y CA-15 quedan sustituidos en lo que contradigan, según su nota de revisión); `api-007` (sus CA-02, CA-04 y CA-12 y RN-01 quedan revisados por esta); `api-009` (historial de boletos, `tickets.view-all`). ADR 0021 (sin SoftDeletes en `staff_notifications`). ADR 0001 (stack aprobado; sin dependencias nuevas).
- **Riesgos:**
  - **Bloqueo por falta de administrador activo.** Si todas las cuentas admin quedan inactivas, solo la consola puede recuperar el acceso. Mitigación: RN-11 y CA-20.
  - **Cuenta de Dirección con 2FA nuevo.** La cuenta `executive` existente deberá configurar 2FA en su siguiente inicio (CA-05). Requiere aviso previo al usuario.
  - **Ambigüedad del permiso huérfano.** Ver «Hallazgos».
  - **Rescate fuera de la consola.** Sin comando de eliminación y sin recuperación por correo, un error de desactivación solo se corrige con otra cuenta admin o la consola.
  - **Privacidad de los datos del servidor** en la auditoría (RN-09; retención pendiente).
- **Hallazgos**
  - **H-01: permiso huérfano `operational-staff.manage`.** Existe en la base viva (`permissions`), no está en `RolesAndPermissionsSeeder` y ya fue retirado del código por `api-007` (revisión 2026-11-05; RN-17 de `api-003`). Decisión 2026-11-20: queda sin efecto; su limpieza es un cambio de datos aparte, fuera de alcance. CA-27 verifica que ningún código lo usa.
  - **H-02: contradicción con la matriz documental resuelta.** `docs/03-roles-y-permisos.md` y `api-003` RN-01 sugerían `admin` para Presidencia e Informática. Con RN-06 esa sugerencia deja de ser válida; la sugerencia pasa a `executive` (decisión 2026-11-20).
- **Decisiones 2026-11-20** (las preguntas de la versión Borrador quedan cerradas):
  1. **Código del rol «Consulta directiva».** Decisión 2026-11-20: conservar `executive` con la etiqueta «Consulta directiva»; no migra datos ni toca la cuenta existente (RN-04, CA-03).
  2. **Código del rol «Comunicación».** Decisión 2026-11-20: `communications` (RN-01, CA-02).
  3. **Destino de `operational-staff.manage`.** Decisión 2026-11-20: queda sin efecto, como indica `api-007` RN-01; la limpieza de la fila es un cambio de datos aparte, fuera de alcance (H-01).
  4. **Pantalla de inicio de Comunicación.** Decisión 2026-11-20: «Noticias» (`home` `administration`, sección de inicio Noticias; RN-03, CA-07).
  5. **Sugerencia de rol para Presidencia e Informática.** Decisión 2026-11-20: `executive` («Consulta directiva») (CA-09, H-02).
  6. **Permiso de lectura total del historial de boletos.** Decisión 2026-11-20: se crea `tickets.view-all`, asignado a `admin` y `zoo-admin` (RN-02, CA-08).
  7. **Alcance de los comandos.** Decisión 2026-11-20: `arca:admin:promote` convierte una cuenta existente en `admin`; `deactivate`, `reset-password` y `reset-two-factor` solo actúan sobre cuentas `admin` (RN-18, CA-22, CA-30). `arca:admin:list` no pide motivo (CA-31).
  8. **Intentos rechazados sobre cuentas admin.** Decisión 2026-11-20: se registran en `activity_log` con actor y ruta, sin datos sensibles (CA-29, RN-17).
- **Propuestas confirmadas en la aprobación del 2026-11-20:** mensajes de CA-11 y CA-12; código 403 (y no 404) para cuentas admin; motivo de al menos 10 caracteres (RN-07); nombres de rutas de avisos (CA-25, CA-26); campo `managed_by_console` (CA-13); tabla de precedencia de RN-03.

## Revisión

- Aprobadores y fecha: Jonathan (responsable funcional), 2026-11-20.
- Evidencia/enlaces: `apps/api/specs/003-staff-authentication.md` (nota de revisión 2026-11-20), `apps/api/specs/007-administration-management.md`, `apps/dashboard/specs/003-administration-sections.md`, `apps/api/src/database/seeders/RolesAndPermissionsSeeder.php`, `apps/api/src/app/Actions/Admin/Users/*`, `apps/api/src/app/Actions/Auth/ResolveStaffHomeAction.php`, `apps/api/src/app/Actions/Admin/Tickets/ListTicketHistoryAction.php`, `apps/api/src/app/Console/Commands/CreateStaffCommand.php`, `apps/api/src/app/Actions/Staff/SuggestRoleForDepartmentAction.php`, `apps/api/src/routes/api.php` (grupo `users`), `docs/03-roles-y-permisos.md`.
- Historial de estado: Borrador (2026-11-20); Aprobada (2026-11-20).
- Revisión 2026-11-21 (aprobada por Jonathan): niveles de consola, titular y recuperación. Añade CA-37 a CA-49 y RN-22 a RN-26; anota CA-15, CA-17, CA-20, CA-23, CA-34, RN-08, RN-13 y RN-18. Sin DBR.
- Revisión 2026-11-21 (b) (aprobada por Jonathan): `arca:admin:list` con filtros y `arca:admin:help`. Añade CA-50 a CA-55 y RN-27 y RN-28; anota CA-15 y CA-49. Sin DBR.
- Nota de revisión de seguridad 2026-11-21: `reactivate` y `reset-two-factor` son de nivel medio por decisión de Jonathan (hallazgo B2 de la revisión de seguridad, riesgo aceptado). Las cuentas demo `demo-cancel-*` (`arca:demo:cancellation-reviews`) quedan activas a propósito (B5, mitigado porque el cajero exige 2FA); el comando nunca corre en producción. `edit-email` revoca sesiones y tokens de la cuenta; `create` valida los máximos de columna (correo 255, nombres 100).
- Enmienda técnica 2026-11-20: decisiones Q1 a Q7 de la aprobación técnica del plan `apps/api/plan/023-fixed-roles-and-console-admins.md`. Enmienda CA-19, CA-24, RN-08 y RN-10; añade CA-32 a CA-36 y RN-19 a RN-21. Nota de revisión de la excepción b) del ADR 0021 (Q7) en `docs/adr/0021-ticket-sales-constitution-exceptions.md`.
