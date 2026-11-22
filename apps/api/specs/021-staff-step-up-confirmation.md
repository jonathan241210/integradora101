# 021 · staff-step-up-confirmation

- App dueña: `api`
- Apps/paquetes afectados: `api` (dueña de la lógica), `dashboard` (`dashboard-015`, diálogo de contraseña y enrolamiento de cajeros), `packages/api-client` (nueva llamada de confirmación y tratamiento de los códigos 403), `dashboard-002` y `dashboard-005` (consumidores existentes; sin cambio de contrato para ellos salvo el código nuevo). No afecta a `apps/pwa`, `apps/web` ni `apps/mobile`.
- Relacionadas: `api-003` (2FA y roles con 2FA; nota de revisión añadida), `api-007` (gestión de cuentas y 2FA), `api-009` (venta, cancelación y precios; nota de revisión 2026-11-20), `api-020` (QR de recinto). Esta spec es la primera de la secuencia 021 → 022 → 023 → 024 (orden de implementación acordado: 1 → 2 → 3 → 4).
- Estado: Aprobada
- Solicitante / responsable funcional: Jonathan
- Aprobación funcional: Jonathan, 2026-11-20
- Fecha de redacción: 2026-11-20. Las preguntas abiertas se cerraron el mismo día; ver «Decisiones 2026-11-20».

## Problema y contexto

Hoy cualquier sesión válida puede cancelar un boleto, cambiar un precio, restablecer la contraseña o el 2FA de otra cuenta, eliminar un recinto o cambiar el rol de una cuenta sin volver a demostrar que la persona que opera es la titular de la sesión. El 2FA se pide solo al iniciar sesión (Fortify, `api-003` CA-09), y el middleware `EnsureAdministratorTwoFactor` solo exige configurarlo a `admin` y `zoo-admin` (`config('arca.two_factor_roles')` = `['admin', 'zoo-admin']`). El rol `cashier`, que cancela boletos y vende en taquilla, no tiene 2FA obligatorio.

Esta spec agrega dos mecanismos:

1. **2FA obligatorio también para `cashier`.** Un cajero sin 2FA confirmado no puede operar en `/api/v1/admin/*`.
2. **Confirmación de contraseña por operación sensible**, con dos modos: «Siempre» (la contraseña viaja con cada operación) y «Ventana» (una confirmación vale 10 minutos fijos para esa sesión).

La contraseña confirma que la persona en la sesión es la titular de la cuenta; no sustituye al 2FA. La decisión de qué operación pide confirmación vive en la API (RN-02); el dashboard solo presenta el diálogo.

Fortify tiene `confirmPassword` en `false` (`apps/api/src/config/fortify.php`), así que no hay confirmación de contraseña en ninguna operación de personal hoy. Esta spec no añade dependencias: Sanctum, Fortify y Spatie Activitylog ya están aprobados (ADR 0001).

## Objetivos

- Que un `cashier` no pueda vender, cancelar ni consultar `/api/v1/admin/*` sin 2FA confirmado.
- Que cada operación de la tabla «Modo de confirmación» pida contraseña según su modo, verificada en el servidor.
- Que los intentos de confirmación, exitosos o fallidos, queden registrados en `activity_log` sin contraseña ni secretos.
- Que la ventana de 10 minutos no requiera tablas ni columnas nuevas.

## Fuera de alcance

- Cambios de esquema y DBR: esta spec no crea tablas ni columnas (ver «Datos, privacidad y auditoría»).
- Sustituir el 2FA por la contraseña o aceptar la contraseña como segundo factor en el login.
- Código TOTP o de recuperación dentro del diálogo de confirmación (decisión 2026-11-20: el diálogo pide solo la contraseña).
- Confirmación de contraseña para la venta, la cotización, la exportación de reportes, noticias, eventos, recuerdos, especies, PWA veterinaria y lecturas (no piden confirmación; ver tabla).
- Confirmación para el arqueo (`cash-closings`): cuando se implemente, pedirá contraseña «Siempre». Es una nota futura, sin CA en esta spec.
- Recuperación de contraseña por correo (`api-003` RN-14).
- Cambios de roles, permisos y comandos de consola: `api-023`.
- Motivo de cancelación clasificado y reporte de cancelaciones: `api-022`.
- Avisos de pendientes: `api-024`.
- Panel nuevo para consultar los eventos `password-confirmation.*` (decisión 2026-11-20).
- Cambios en `apps/web`, `apps/pwa` o `apps/mobile`.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| `cashier` (taquilla) | Operar la venta y el historial con 2FA y confirmar su contraseña para cancelar boletos | Sesión válida + 2FA confirmado; `tickets.create`, `tickets.view`, `tickets.cancel` (sin cambios) |
| `admin` (Presidencia) | Confirmar su contraseña para cambiar precios, cuentas y recintos | Sesión válida + 2FA confirmado; permisos actuales de cada operación |
| `zoo-admin` (Dirección) | Confirmar su contraseña para eliminar un recinto y para regenerar su QR (la primera generación no pide); cambiar precios, cuentas o contenido según permisos | Sesión válida + 2FA confirmado; permisos actuales |
| `veterinarian` | Sin cambios: no tiene 2FA ni pide confirmación en sus rutas | `veterinarian`, según `api-014` y la PWA |
| `executive` | Sin cambios de acceso; sus operaciones de lectura no piden confirmación | `dashboard.view`, `reports.view`, `public-content.view` |
| Cualquier usuario con 2FA confirmado | Cambiar su propia contraseña (Siempre, con la contraseña actual) | Sesión válida + 2FA confirmado según su rol |

Nota: esta spec añade `cashier` a los roles con 2FA. Los roles nuevos de `api-023` (Consulta directiva y Comunicación) se sumarán a esa lista en su propia spec. `veterinarian` y `executive` quedan sin 2FA en esta spec.

## Historias de usuario

- Como `cashier`, quiero configurar mi 2FA antes de vender para que nadie opere en mi caja con mi sesión abierta.
- Como `cashier`, quiero confirmar mi contraseña antes de cancelar un boleto para que una sesión olvidada no permita cancelar.
- Como `admin`, quiero confirmar mi contraseña cada vez que cambie un precio o restablezca la contraseña o el 2FA de otra cuenta para que la acción quede protegida aunque la sesión esté abierta.
- Como responsable de seguridad, quiero que cada confirmación exitosa o fallida quede registrada para detectar intentos indebidos.

## Modo de confirmación por operación

Tabla normativa: toda operación de `/api/v1/admin/*` se clasifica en uno de estos tres modos. Una operación nueva se clasifica en su spec antes de implementarse (RN-01).

| Modo | Operación | Ruta (API) | Permiso / rol | Spec de origen |
|---|---|---|---|---|
| Siempre | Cambiar precio de adulto o niño (inmediato o programado) | `POST /api/v1/admin/ticket-prices` | `ticket-prices.manage` | `api-009` CA-18, CA-19 |
| Siempre | Restablecer contraseña de otra cuenta | `PUT /api/v1/admin/users/{user}/password` | `users.manage` | `api-007` CA-10. Enmienda técnica 2026-11-20 (B-1): la confirmación va en `current_password` (CA-37, RN-16) |
| Siempre | Restablecer 2FA de otra cuenta | `DELETE /api/v1/admin/users/{user}/two-factor` | `users.manage` | `api-007` CA-11 |
| Siempre | Cambiar el rol de una cuenta, o cualquier `PATCH` que cambie `role` junto con otros campos (p. ej. nombre o área) | `PATCH /api/v1/admin/users/{user}` con `role` distinto del actual | `users.manage` | `api-007` CA-06 |
| Siempre | Cambiar la contraseña propia (exige la contraseña actual) | Ruta por definir en el plan (hoy no existe para el personal; `me/password` es de visitantes) | Sesión propia + 2FA según rol | Decisión 2026-11-20 (CA-33) |
| Ventana 10 min | Cancelar un boleto | `POST /api/v1/admin/tickets/{ticket}/cancel` | `tickets.cancel` | `api-009` CA-10 |
| Ventana 10 min | Crear una cuenta no admin | `POST /api/v1/admin/users` | `users.manage` | `api-007` CA-03 |
| Ventana 10 min | Editar una cuenta no admin sin cambio de rol | `PATCH /api/v1/admin/users/{user}` (sin cambio de `role`) | `users.manage` | `api-007` CA-06 |
| Ventana 10 min | Desactivar una cuenta no admin | `PATCH /api/v1/admin/users/{user}/status` | `users.manage` | `api-007` CA-07 |
| Ventana 10 min | Activar una cuenta no admin | `PATCH /api/v1/admin/users/{user}/status` (activación) | `users.manage` | `api-007` CA-07; decisión 2026-11-20 (CA-35) |
| Ventana 10 min | Eliminar una cuenta no admin | `DELETE /api/v1/admin/users/{user}` | `users.manage` | `api-007` CA-08 |
| Ventana 10 min | Regenerar el QR de un recinto que ya tiene QR (sin QR previo, No pide: CA-39) | `POST /api/v1/admin/enclosures/{enclosure}/qr/regenerate` | `enclosures.manage` | `api-020` |
| Ventana 10 min | Eliminar un recinto | `DELETE /api/v1/admin/enclosures/{enclosure}` | `enclosures.manage` | `api-007` (recintos) |
| No pide | Crear un recinto (enmienda técnica 2026-11-20, B-4; CA-40) | `POST /api/v1/admin/enclosures` | `enclosures.manage` | `api-019` |
| No pide | Editar un recinto (enmienda técnica 2026-11-20, B-4; CA-40) | `PATCH /api/v1/admin/enclosures/{enclosure}` | `enclosures.manage` | `api-019` |
| No pide | Cambiar el estado de un recinto (enmienda técnica 2026-11-20, B-4; CA-40) | `PATCH /api/v1/admin/enclosures/{enclosure}/status` | `enclosures.manage` | `api-019` |
| No pide | Vender boletos | `POST /api/v1/admin/tickets` | `tickets.create` | `api-009` CA-01 |
| No pide | Cotizar boletos | `POST /api/v1/admin/tickets/quote` | `tickets.create` | `api-009` CA-46 |
| No pide | Exportar reportes (CSV, XLSX, PDF); solo se audita, como ya ocurre | `GET /api/v1/admin/reports/tickets/export` | `reports.view` | `api-007` |
| No pide | Generar el QR de un recinto por primera vez | `POST /api/v1/admin/enclosures/{enclosure}/qr` | `enclosures.manage` | `api-020`; decisión 2026-11-20 (CA-34) |
| No pide | Noticias y eventos | `/api/v1/admin/news*`, `/api/v1/admin/events*` | `news.manage`, `events.manage` | `api-008` |
| No pide | Recuerdos y especies (revisión y publicación) | `/api/v1/admin/memories*`, `/api/v1/admin/species*`, `/api/v1/admin/species-publication-requests*`, `/api/v1/admin/published-species` | `memories.review`, `species.review` | `api-010`, `api-014` |
| No pide | Veterinaria (PWA) | `/api/v1/staff/*`, `/api/v1/veterinarian/*` | rol `veterinarian` | `api-014`, `api-016` |
| No pide | Lecturas (`GET`) de administración no listadas arriba | p. ej. `GET /api/v1/admin/tickets`, `GET /api/v1/admin/users`, `GET /api/v1/admin/dashboard` | permiso de cada lectura | specs de cada módulo |

Las dos operaciones que la versión anterior dejaba sin clasificar quedan resueltas en «Decisiones 2026-11-20»: generar el QR por primera vez es **No pide**; activar una cuenta es **Ventana**.

**Enmienda técnica 2026-11-20** (decisiones de la aprobación técnica del plan; sin renumerar CA ni RN):
- B-1: en `PUT /api/v1/admin/users/{user}/password` la confirmación del administrador va en `current_password`, y `password` es la nueva contraseña (CA-37, RN-16).
- B-2: crear, editar, activar, desactivar o eliminar cuentas `zoo-admin` y demás cuentas no admin es Ventana. Las cuentas `admin` quedan fuera de la operación desde la API (`api-023`); su 403 se evalúa antes que el de contraseña (CA-38, RN-17).
- B-3: regenerar el QR de un recinto sin código previo es No pide (CA-39).
- B-4: crear, editar un recinto y cambiar su estado son No pide (CA-40).

## Mecanismo de confirmación

- **Ventana (10 min):** `POST /api/v1/admin/password-confirmation` (nombre `admin.password-confirmation.store`), con campo `password`. Si la contraseña es correcta, la API guarda en la sesión de Sanctum el instante de confirmación y responde 200 con `confirmed_until` (ISO 8601 UTC, instante + 10 min). Ninguna operación de Ventana extiende ese instante.
- **Siempre:** la operación recibe el campo `password` en su cuerpo y lo valida en el mismo request. No usa ni crea ventana.
- Ambos mecanismos usan el mismo control de intentos y la misma auditoría.
- Respuestas de error: 403 `password_confirmation_required` cuando falta confirmación vigente o falta `password` en un Siempre. Su cuerpo incluye `mode`: `window` (confirmar y reintentar) o `always` (reenviar la operación con `password`). Así el cliente no clasifica operaciones (RN-02); 422 «La contraseña no es correcta.» con la contraseña incorrecta; 429 «Demasiados intentos. Intenta de nuevo en :seconds segundos.» al superar el límite (reutiliza el texto de `lang/es/auth.php`).
- **Límite de intentos (decisión 2026-11-20):** 5 contraseñas incorrectas en 10 minutos por usuario bloquean la confirmación durante 10 minutos (429). El bloqueo aplica a Ventana y a Siempre.

## Criterios de aceptación

### Taquilla con 2FA (cajero)

- **CA-01:** Dado un `cashier` sin 2FA confirmado, cuando llama cualquier ruta `/api/v1/admin/*` (p. ej. `GET /api/v1/admin/tickets` o `POST /api/v1/admin/tickets`), entonces responde 403 con código `two_factor_setup_required`, no crea boleto y no cambia datos. Cuando llama `GET /api/v1/auth/me`, entonces responde `two_factor_setup_required: true`.
- **CA-02:** Dado un `cashier` sin 2FA confirmado, cuando llama `GET /api/v1/auth/me`, `POST /api/v1/auth/logout` o los endpoints de enrolamiento 2FA, entonces responde según `api-003` (no queda bloqueado para configurar su 2FA).
- **CA-03:** Dado un `cashier` con 2FA confirmado, cuando inicia sesión con credenciales válidas, entonces la API responde `two_factor: true` y exige el reto TOTP o código de recuperación (`api-003` CA-09). Hasta completar el reto, las rutas `/api/v1/admin/*` no devuelven datos.
- **CA-04:** Dado un `veterinarian`, cuando inicia sesión, entonces no se le exige 2FA ni reto ni enrolamiento (regresión de `api-003` RN-16 para roles fuera de la lista).
- **CA-05:** Dados `admin` y `zoo-admin`, cuando se aplica esta spec, entonces mantienen el comportamiento de `api-003` CA-08 y CA-09 (regresión).

### Confirmación de contraseña (mecanismo)

- **CA-06:** Dado un usuario autenticado con 2FA confirmado, cuando llama `POST /api/v1/admin/password-confirmation` con su contraseña correcta, entonces responde 200 con `confirmed_until` en UTC (instante + 10 min), registra el instante en la sesión y no devuelve ni guarda la contraseña.
- **CA-07:** Dado un usuario autenticado, cuando llama `POST /api/v1/admin/password-confirmation` con una contraseña incorrecta, entonces responde 422 «La contraseña no es correcta.», no crea ni extiende ninguna ventana y registra el intento fallido (CA-28).
- **CA-08:** Dada una confirmación válida a las `T`, cuando se ejecutan operaciones de Ventana en `T + 9 min 59 s`, entonces se aceptan; cuando se ejecuta una operación de Ventana en `T + 10 min 1 s`, entonces responde 403 `password_confirmation_required` y no cambia datos. Las operaciones aceptadas dentro de la ventana no alargan su fin.
- **CA-09:** Dada una ventana vigente en una sesión, cuando otra sesión del mismo usuario ejecuta una operación de Ventana, entonces responde 403 `password_confirmation_required`: la ventana es de la sesión que confirmó.
- **CA-10:** Dada una ventana vigente, cuando el usuario cierra sesión (`POST /api/v1/auth/logout`) y vuelve a iniciar sesión, entonces la ventana ya no existe y la siguiente operación de Ventana responde 403 `password_confirmation_required`.
- **CA-11:** Dada una ventana vigente, cuando la sesión expira por inactividad (`SESSION_LIFETIME`, `api-003` CA-12), entonces la siguiente llamada responde 401 (no 403) y no ejecuta la operación.

### Operaciones «Siempre»

- **CA-12:** Dada cualquier operación de Siempre (ver tabla), cuando se llama sin el campo `password` aunque exista una ventana vigente, entonces responde 403 `password_confirmation_required` y no cambia datos. Una ventana vigente no sustituye la contraseña en una operación de Siempre.
- **CA-13:** Dada una operación de Siempre con `password` incorrecta, cuando se llama, entonces responde 422 «La contraseña no es correcta.», no cambia datos y registra el intento fallido (CA-28).
- **CA-14:** Dada una operación de Siempre con `password` correcta, cuando se llama, entonces se ejecuta con su regla propia (`api-009` CA-18 y CA-19 para precios, `api-007` CA-06, CA-10 y CA-11 para cuentas) y no crea ni altera ninguna ventana.

### Operaciones «Ventana»

- **CA-15:** Dada una operación de Ventana sin confirmación vigente, cuando se llama (cancelar boleto, crear, editar sin cambio de rol, desactivar, activar, eliminar cuenta no admin, regenerar QR, eliminar recinto), entonces responde 403 `password_confirmation_required` y no cambia datos.
- **CA-16:** Dada una confirmación vigente, cuando el `cashier` cancela un boleto suyo del mismo día (`api-009` CA-10), entonces se aplica la cancelación de `api-009` sin pedir otra contraseña; cuando la ventana expiró, responde 403 `password_confirmation_required`. Esta spec modifica el requisito de cancelar de `api-009` CA-10; la nota de revisión de `api-009` (2026-11-20) recoge el cambio.
- **CA-17:** Dada una confirmación vigente, cuando `admin` crea una cuenta no admin, entonces se aplica `api-007` CA-03 sin pedir otra contraseña; con la ventana expirada, responde 403 `password_confirmation_required`.
- **CA-18:** Dada una confirmación vigente, cuando `admin` edita una cuenta no admin sin cambiar su rol, entonces se aplica `api-007` CA-06; con la ventana expirada, responde 403 `password_confirmation_required`.
- **CA-19:** Dada una confirmación vigente, cuando `admin` desactiva o elimina (baja lógica) una cuenta no admin, entonces se aplica `api-007` CA-07 o CA-08; con la ventana expirada, responde 403 `password_confirmation_required`.
- **CA-20:** Dada una confirmación vigente, cuando `admin` regenera el QR de un recinto que ya tiene QR o elimina un recinto, entonces se aplica `api-020` o `api-019`; con la ventana expirada, responde 403 `password_confirmation_required`. La primera generación del QR no pide confirmación (CA-34).

### Operaciones «No pide»

- **CA-21:** Dado un `cashier` sin confirmación vigente, cuando vende (`POST /api/v1/admin/tickets`) o cotiza (`POST /api/v1/admin/tickets/quote`) con datos válidos, entonces la operación se resuelve según `api-009` (201 o 200) y no responde `password_confirmation_required`.
- **CA-22:** Dado un usuario con `reports.view` sin confirmación vigente, cuando exporta un reporte (`GET /api/v1/admin/reports/tickets/export`), entonces se resuelve según `api-007` y no pide contraseña; la exportación sigue auditada como hoy.
- **CA-23:** Dado un usuario con `news.manage` o `events.manage` sin confirmación vigente, cuando crea, edita, cambia el estado o elimina una noticia o un evento, entonces no responde `password_confirmation_required`.
- **CA-24:** Dado un usuario con `memories.review` o `species.review` sin confirmación vigente, cuando revisa, acepta, rechaza, publica o despublica, entonces no responde `password_confirmation_required`.
- **CA-25:** Dado un `veterinarian` en las rutas de la PWA, cuando registra o consulta expedientes y solicitudes, entonces no se le exige 2FA ni contraseña.
- **CA-26:** Dadas las lecturas (`GET`) de administración que no están en la tabla de cancelación o de cuentas, cuando se llaman sin confirmación vigente, entonces responden según su permiso y no piden contraseña.

### Límite de intentos y auditoría

- **CA-27:** Dadas 5 contraseñas incorrectas por usuario en 10 minutos (decisión 2026-11-20), cuando llega el intento siguiente (con contraseña correcta o incorrecta, en Ventana o en Siempre), entonces responde 429 con «Demasiados intentos. Intenta de nuevo en :seconds segundos.», no valida la contraseña hasta que pase la espera de 10 minutos y no ejecuta la operación.
- **CA-28:** Dado un intento de confirmación o una operación de Siempre con `password` (exitoso o fallido), cuando se procesa, entonces `activity_log` registra un evento con actor, correo, IP, user-agent, nombre de ruta de la operación y resultado (`succeeded` o `failed`), nunca la contraseña, el hash ni secretos 2FA. Nombres de evento: `password-confirmation.succeeded` y `password-confirmation.failed`.
- **CA-29:** Dado un intento de Ventana o de Siempre rechazado por 403 `password_confirmation_required`, cuando ocurre, entonces no se registra como intento de contraseña (no hay contraseña verificada) y no cuenta para el límite de CA-27.

### Transversales

- **CA-30:** Dado un `cashier` con 2FA confirmado, cuando vende o consulta su historial, entonces las respuestas de venta e historial mantienen su forma de `api-009` (CA-01, CA-14, CA-16); esta spec solo añade los códigos 403 y 422 descritos.
- **CA-31:** Dado el catálogo de roles con 2FA, cuando se lee `config('arca.two_factor_roles')`, entonces contiene `admin`, `zoo-admin` y `cashier`, y no contiene `veterinarian` ni `executive`. (La lista se amplía en `api-023`, CA-04.)
- **CA-32:** Dada la suite de PHPUnit, cuando se ejecuta `php artisan test`, entonces corre contra `arca_pruebas` con `DatabaseTransactions` (nunca `arca_zoo`) y existe al menos un test que nombra cada CA-01 a CA-42, excepto CA-33. *Enmienda técnica 2026-11-20 (B-5): CA-33 queda fuera de alcance por la decisión final de 2026-11-20 y no tiene test; el resto de CA sí lo tiene.*

### Decisiones 2026-11-20 (criterios añadidos)

- **CA-33:** Dado un usuario autenticado que cambia su propia contraseña, cuando la petición no incluye `password` con su contraseña actual, entonces responde 403 `password_confirmation_required` con `mode: always` aunque exista una ventana vigente y no cambia la contraseña. Con la contraseña actual incorrecta responde 422 «La contraseña no es correcta.» y no cambia nada; con la correcta aplica el cambio. La ruta se fija en el plan.
- **CA-34:** Dado un recinto que todavía no tiene código QR generado, cuando se genera por primera vez (`POST /api/v1/admin/enclosures/{enclosure}/qr`), entonces se resuelve según `api-020` sin pedir contraseña ni ventana, tenga o no una ventana vigente. Las generaciones posteriores (regenerar) siguen el modo Ventana de CA-20.
- **CA-35:** Dada una cuenta no admin desactivada, cuando `admin` la activa (`PATCH /api/v1/admin/users/{user}/status` con activación), entonces sin ventana vigente responde 403 `password_confirmation_required` y no cambia datos; con ventana vigente se aplica la regla de activación de `api-007`.
- **CA-36:** Dado `PATCH /api/v1/admin/users/{user}` que cambia `role` junto con otros campos (nombre, área, etc.), cuando se llama sin `password`, aunque exista una ventana vigente, entonces responde 403 `password_confirmation_required` con `mode: always` y no cambia datos. Con `password` correcta se aplica la petición completa (`api-007` CA-06); con `password` incorrecta responde 422 y no cambia datos.
- **CA-37 (enmienda técnica 2026-11-20, B-1):** Dado `PUT /api/v1/admin/users/{user}/password` (restablecer la contraseña de otra cuenta, `users.manage`), cuando se llama sin `current_password` aunque exista una ventana vigente, entonces responde 403 `password_confirmation_required` con `mode: always` y no cambia datos. Con `current_password` incorrecta (contraseña del administrador que opera) responde 422 «La contraseña no es correcta.», no cambia datos y registra el intento fallido (CA-28). Con `current_password` correcta restablece la contraseña usando `password` como nueva contraseña, validada con `Password::defaults()`; `password` nunca sirve de confirmación en esta ruta.
- **CA-38 (enmienda técnica 2026-11-20, orden con `api-023`):** Dada una cuenta con rol `admin` como objetivo de una escritura bajo `/api/v1/admin/users/*` (`api-023` CA-11), cuando la llama un actor con `users.manage` sin ventana vigente y sin `password`, entonces responde el 403 de cuenta admin de `api-023` y no `password_confirmation_required`. El control de cuenta admin se evalúa antes que el de contraseña (`api-023` Q6).
- **CA-39 (enmienda técnica 2026-11-20, B-3):** Dado `POST /api/v1/admin/enclosures/{enclosure}/qr/regenerate` sobre un recinto sin código QR activo, cuando se llama sin ventana vigente, entonces se resuelve como primera generación (CA-34): no pide contraseña ni ventana. Sobre un recinto con QR activo se aplica CA-20 (Ventana).
- **CA-40 (enmienda técnica 2026-11-20, B-4):** Dado un usuario con `enclosures.manage` y sin ventana vigente, cuando crea un recinto (`POST /api/v1/admin/enclosures`), edita sus datos (`PATCH /api/v1/admin/enclosures/{enclosure}`) o cambia su estado (`PATCH /api/v1/admin/enclosures/{enclosure}/status`), entonces la operación se resuelve según `api-019` sin pedir contraseña ni responder `password_confirmation_required`.
- **CA-41 (enmienda técnica 2026-11-20, B-7):** Dados cuatro intentos fallidos de un usuario dentro de 10 minutos, sin bloqueo activo, cuando confirma su contraseña correctamente, entonces el contador de fallos de ese usuario se borra y un fallo posterior empieza a contar desde cero. Dado un bloqueo activo (CA-27), la contraseña correcta responde 429, no valida la contraseña y no borra el contador.

## Reglas de negocio

- **RN-01:** Toda operación de `/api/v1/admin/*` se clasifica en Siempre, Ventana o No pide según la tabla de esta spec. Una operación nueva se clasifica aquí antes de implementarse.
- **RN-02:** La confirmación se decide y verifica en el servidor (middleware o Action). El cliente no decide qué pide contraseña; solo presenta el diálogo cuando recibe 403 `password_confirmation_required`.
- **RN-03:** La ventana dura 10 minutos fijos desde la confirmación exitosa. No se alarga con actividad. Se guarda en la sesión del usuario que confirmó, se pierde al cerrar sesión o al expirar la sesión (`api-003` RN-12) y no se comparte entre sesiones.
- **RN-04:** Las operaciones de Siempre exigen la contraseña en cada petición y no crean ventana. Una ventana vigente no las satisface.
- **RN-05:** La contraseña se verifica contra el hash bcrypt de `users` (`api-003` RN-10). Nunca se guarda en sesión, en `activity_log`, en respuestas ni en logs.
- **RN-06:** Confirmar la contraseña no sustituye al 2FA. Un usuario sin 2FA confirmado en un rol de `config('arca.two_factor_roles')` no opera aunque confirme su contraseña.
- **RN-07:** Límite de intentos de contraseña por usuario: 5 contraseñas incorrectas en 10 minutos bloquean la confirmación durante 10 minutos (429), tanto en Ventana como en Siempre (decisión 2026-11-20). El límite cuenta solo las contraseñas verificadas y fallidas (CA-29). *Enmienda técnica 2026-11-20 (B-7): una confirmación correcta sin bloqueo activo borra los fallos previos del usuario (CA-41).*
- **RN-08:** Toda confirmación exitosa o fallida y toda operación de Siempre con `password` se registra en Activitylog (CA-28). *Enmienda técnica 2026-11-20 (B-8): `log_name` `auth`, como `api-003`, con correo, IP y user-agent (RN-18); deja de usarse el formato de `api-007` CA-26.*
- **RN-09:** `config('arca.two_factor_roles')` pasa a `['admin', 'zoo-admin', 'cashier']` en esta spec. `api-023` lo amplía con los roles nuevos. `veterinarian` no usa 2FA.
- **RN-10:** Los mensajes al usuario están en español; los códigos (`two_factor_setup_required`, `password_confirmation_required`) y los nombres de rutas y eventos, en inglés (Constitución VI).
- **RN-11:** La ventana vive en la sesión de Laravel (driver `database`, tabla `sessions`). No requiere columnas ni tablas nuevas.
- **RN-12:** Las rutas `staff/*` y `visitor/*` no usan confirmación de contraseña.
- **RN-13:** La confirmación de contraseña no reemplaza ni modifica `api-003` (login, 2FA, expiración). Solo se añade una capa por operación.
- **RN-14:** Despliegue del 2FA de `cashier` (decisión 2026-11-20): los cajeros se avisan fuera del sistema unos días antes del despliegue; desde el despliegue el 2FA es obligatorio para `cashier`, sin fecha de corte en el código.
- **RN-15:** Los eventos `password-confirmation.*` se conservan en `activity_log` con la misma retención que el resto de eventos de auditoría; no hay panel nuevo para consultarlos (decisión 2026-11-20).
- **RN-16 (enmienda técnica 2026-11-20, B-1):** En `PUT /api/v1/admin/users/{user}/password` el campo `password` es la nueva contraseña y la confirmación del administrador va en `current_password`. Es la única excepción a la reserva del campo `password` para la confirmación de Siempre (CA-37).
- **RN-17 (enmienda técnica 2026-11-20, B-2):** Las altas, ediciones, activaciones, desactivaciones y bajas de cuentas no admin, incluidas las de `zoo-admin`, siguen el modo Ventana de la tabla. Las cuentas `admin` no son objetivo de estas operaciones desde la API (`api-023` CA-11) y su 403 se evalúa antes (CA-38).
- **RN-18 (enmienda técnica 2026-11-20, B-8):** Los eventos `password-confirmation.*` usan `log_name` `auth` y registran correo, IP y user-agent del actor, como `api-003`. Textos aceptados: 403 «Confirma tu contraseña para realizar esta acción.»; 422 «La contraseña no es correcta.»; 429 «Demasiados intentos. Intenta de nuevo en :seconds segundos.»; 200 con envoltorio `data`: `{ "data": { "confirmed_until": "…" } }`, como el resto de `/api/v1/admin`.

## Datos, privacidad y auditoría

- **Esquema:** esta spec no crea ni modifica tablas, columnas, funciones ni procedimientos. **No requiere DBR** si el plan confirma que la ventana vive en la sesión (RN-11). Si el plan propone una columna o tabla, abre la DBR en `docs/database/requests/` antes de implementar, y el responsable de BD la crea y aplica.
- **Estado actual de la base (consulta en solo lectura de `arca_pruebas`, 2026-11-20, aportada por la sesión principal):** existen las tablas `sessions` y `activity_log` (esta última con `log_name`, `description`, `subject_*`, `causer_*`, `event`, `properties` json y `batch_uuid`); `roles` y `model_has_roles` existen con los roles vivos `admin`, `zoo-admin`, `executive`, `cashier` y `veterinarian`. `SESSION_DRIVER=database` según `.env.example`. `users` tiene `two_factor_secret`, `two_factor_recovery_codes` y `two_factor_confirmed_at`. Cuentas activas con 2FA confirmado por rol: `admin` 4 de 4, `zoo-admin` 3 de 3, `cashier` 0 de 1, `executive` 0 de 1, `veterinarian` 0 de 1. Al desplegar, la única cuenta `cashier` tendrá que configurar 2FA antes de operar (RN-14). No hace falta DBR.
- **Datos personales:** correo, IP y user-agent en `activity_log` (igual que `api-003` CA-13). Ningún dato de contraseña.
- **Secretos:** la contraseña viaja por HTTPS en el campo `password`; no se registra. Los secretos 2FA siguen cifrados por Fortify.
- **Retención:** `activity_log` no se borra físicamente (Constitución V para operaciones financieras y clínicas). Los eventos `password-confirmation.*` tienen la misma retención que el resto de `activity_log` (RN-15).
- **SoftDeletes:** no aplica a la ventana (vive en la sesión); las cuentas afectadas siguen con SoftDeletes (`api-007`).
- **Fortify:** `confirmPassword` sigue en `false`. El plan decide si la confirmación usa el middleware `password.confirm` de Laravel o un mecanismo propio (la ventana de 10 min debe ser fija; el timeout global de `auth.password_timeout` afectaría a otros flujos, verificar en el plan).

## Flujos y errores

### Flujo 1: cancelar un boleto con ventana vigente

1. El cajero (con 2FA) confirma su contraseña: `POST /api/v1/admin/password-confirmation` → 200 con `confirmed_until`.
2. Dentro de 10 min, `POST /api/v1/admin/tickets/{ticket}/cancel` → 200 (CA-16).

### Flujo 2: cancelar un boleto con ventana expirada

1. `POST /api/v1/admin/tickets/{ticket}/cancel` → 403 `password_confirmation_required`.
2. El dashboard abre el diálogo (`dashboard-015`), confirma la contraseña y reintenta la operación una vez.

### Flujo 3: cambiar un precio (Siempre)

1. `POST /api/v1/admin/ticket-prices` con `password` → 201 (CA-14), o 422 «La contraseña no es correcta.» (CA-13), o 403 si no se envió `password` (CA-12).

### Flujo 4: cajero sin 2FA

1. Login correcto → `me` devuelve `two_factor_setup_required: true`.
2. Cualquier ruta de operación → 403 `two_factor_setup_required` (CA-01).
3. Tras el enrolamiento (`api-003` CA-10), opera con normalidad.

### Errores

- 401: sin sesión o sesión expirada (CA-11).
- 403 `two_factor_setup_required`: rol con 2FA sin confirmar (CA-01).
- 403 `password_confirmation_required`: falta ventana vigente o falta `password` en una operación de Siempre (CA-08, CA-12, CA-15).
- 422 «La contraseña no es correcta.»: contraseña incorrecta (CA-07, CA-13).
- 429 «Demasiados intentos. Intenta de nuevo en :seconds segundos.»: límite de intentos (CA-27).

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** ADR 0001 (Sanctum, Fortify, Spatie Permission y Activitylog). Ninguna dependencia nueva. `api-003` (2FA y expiración), `api-007` (cuentas y 2FA), `api-009` (venta, cancelación y precios), `api-019` y `api-020` (recintos y QR), `dashboard-015` (diálogo de cliente). `api-022` (reporte de cancelaciones) mantiene la cancelación en modo Ventana. `api-023` (roles fijos) amplía `config('arca.two_factor_roles')` con sus roles nuevos.
- **Riesgos:**
  - El cajero sin 2FA queda bloqueado hasta enrolarse. Se avisa fuera del sistema unos días antes del despliegue (RN-14).
  - Las pruebas de `api-009` y `dashboard-005` que usan cajeros sin 2FA confirmado dejarán de pasar; el plan debe actualizar las pruebas (no se relajan los CA).
  - Una ventana en sesión no protege si el equipo deja la sesión abierta sin bloquear el equipo físico; es una medida de confirmación, no de bloqueo de equipo.
  - La ruta del cambio de contraseña propia (CA-33) no existe hoy para el personal; el plan la define.
- **Decisiones 2026-11-20** (las preguntas de la versión Borrador quedan cerradas; no hay preguntas abiertas):
  1. **Decisión 2026-11-20 — Límite de intentos (CA-27, RN-07).** Pregunta: ¿cuántos fallos en cuántos minutos bloquean? Decisión: 5 intentos fallidos en 10 minutos por usuario bloquean la confirmación durante 10 minutos (429). El bloqueo aplica también a las operaciones de Siempre.
  2. **Decisión 2026-11-20 — Código 2FA en el diálogo.** Pregunta: ¿el diálogo acepta TOTP o código de recuperación? Decisión: no. El diálogo pide solo la contraseña (`dashboard-015`, fuera de alcance).
  3. **Decisión 2026-11-20 — Generar QR por primera vez.** Pregunta: ¿Ventana, Siempre o No pide? Decisión: **No pide** (CA-34).
  4. **Decisión 2026-11-20 — Activar una cuenta.** Pregunta: ¿Ventana o No pide? Decisión: **Ventana** (CA-35).
  5. **Decisión 2026-11-20 — Auditoría de confirmaciones.** Pregunta: ¿retención y panel de los eventos `password-confirmation.*`? Decisión: tienen la misma retención que el resto de `activity_log` y no hay panel nuevo; se consultan en la base (RN-15).
  6. **Decisión 2026-11-20 — Cambio de rol con otros campos.** Pregunta: ¿un `PATCH` que cambia rol y nombre a la vez es Siempre? Decisión: sí, Siempre (CA-36).
  7. **Decisión 2026-11-20 — Periodo de aviso para cajeros.** Pregunta: ¿bloqueo desde el despliegue o fecha de corte con aviso? Decisión: los cajeros se avisan fuera del sistema unos días antes; desde el despliegue el 2FA es obligatorio, sin fecha de corte en código (RN-14). Estado vivo: 0 de 1 cajero tiene 2FA.
  8. **Decisión 2026-11-20 — Cambio de contraseña propia.** Pregunta: ¿se confirma con la contraseña actual (Siempre)? Decisión: sí, Siempre con la contraseña actual (CA-33). La ruta se define en el plan.

## Revisión

- Aprobadores y fecha: Jonathan (responsable funcional), 2026-11-20.
- Enmienda técnica 2026-11-20: aprobación técnica del plan `apps/api/plan/021-staff-step-up-confirmation.md` con las decisiones B-1 a B-8. Añade CA-37 a CA-41 y RN-16 a RN-18; enmienda RN-07, RN-08, CA-32, la tabla de modos y la línea de `PUT users/{user}/password`. Ningún CA ni RN existente cambia de número.
- Nota de revisión 2026-11-20 en `apps/api/specs/009-ticket-sales.md` (cancelación con confirmación de contraseña y ventana de 10 min).
- Evidencia/enlaces: `apps/api/specs/003-staff-authentication.md` (nota de revisión 2026-11-20), `apps/api/specs/007-administration-management.md`, `apps/api/specs/009-ticket-sales.md`, `apps/dashboard/specs/015-step-up-confirmation.md`, `apps/api/src/routes/api.php`, `apps/api/src/config/arca.php`, `apps/api/src/app/Http/Middleware/EnsureAdministratorTwoFactor.php`, `apps/api/src/config/fortify.php`.

## Decisiones finales 2026-11-20 (Jonathan)
- **CA-33 fuera de alcance.** El personal no tiene función para cambiar su propia contraseña (solo existe `me/password` para visitantes). CA-33 no se implementa ni se prueba en esta feature; si después se crea esa función, exigirá la contraseña actual. Sigue vigente que restablecer la contraseña de **otra** cuenta (`PUT users/{user}/password`) pide confirmación «Siempre».
- **Política de contraseñas del personal (Jonathan, 2026-11-20).** Nadie del personal cambia su propia contraseña. Solo el `admin` restablece la contraseña de otras cuentas, desde el dashboard y con confirmación «Siempre». La contraseña de una cuenta `admin` solo se restablece por consola (`arca:admin:reset-password`, `api-023`).

## Revisión 2026-11-20 (hallazgo de seguridad, aprobado por Jonathan)

Hallazgo: `POST /api/v1/staff/auth/login` (`staff.auth.login`, `AuthController::login`) emitía un token Sanctum sin reto 2FA, y ese token también autenticaba en `admin/*`, lo que anulaba el 2FA obligatorio de `admin`, `zoo-admin` y `cashier`. Ningún cliente usa ese endpoint: la PWA usa `/api/v1/auth/login` (Fortify, cookie; pwa-003). No se renumera ningún CA ni RN existente.

- **CA-42:** Dada una cuenta con un rol de `config('arca.two_factor_roles')` (`admin`, `zoo-admin`, `cashier`), cuando llama `POST /api/v1/staff/auth/login` con credenciales válidas, entonces responde 403 con `code: two_factor_login_required` y el mensaje «Esta cuenta debe iniciar sesión desde el panel con su segundo factor.», no emite token y no actualiza `last_login_at`. El rechazo va después de validar la contraseña (una contraseña incorrecta responde igual que una cuenta inexistente, sin enumerar cuentas) y no limpia el límite de intentos del login. Un `veterinarian` sigue recibiendo su token. Un token Sanctum que no sea de la sesión de navegador (`currentAccessToken()` distinto de `TransientToken`) de una cuenta con rol de 2FA, incluidos los emitidos antes de esta regla, recibe el mismo 403 en `admin/*` (middleware `administrator.two-factor`).
- **RN-19:** Las cuentas con un rol de `config('arca.two_factor_roles')` solo operan con sesión de navegador y reto de segundo factor; no pueden obtener ni usar tokens personales de personal. La regla sigue la lista de roles, así que `api-023` la amplía junto con `two_factor_roles`. *Nota de revisión 2026-11-21 (seguridad): la regla alcanza también a `/api/v1/staff/*` y `GET /api/v1/auth/me` (middleware `staff.user`); el `veterinarian` con token sigue funcionando. Test: `test_ca42_api021_rn19_token_of_a_2fa_role_is_rejected_outside_admin`.*
