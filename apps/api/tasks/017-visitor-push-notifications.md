# Tareas · 017 · visitor-push-notifications

- Spec: `apps/api/specs/017-visitor-push-notifications.md` (Aprobada, Aksel, 2026-11-14)
- Plan: `apps/api/plan/017-visitor-push-notifications.md` (Aprobado técnicamente, Victor Adrian, 2026-11-14)
- ADR: `docs/adr/0029-visitor-android-push.md` (Aceptado, Aksel, 2026-11-14)
- DBR: `docs/database/requests/DBR-017-visitor-push-notifications.md` (Lista para backend, BD Victor Adrian y backend Aksel, 2026-11-14)
- Estado del checklist: **Aprobado** (Aksel, 2026-11-14). Autoriza el código de estas tareas. No autoriza migraciones nuevas ni llamadas reales a Expo.

Ninguna tarea añade alcance. Si algo de la lista no está en la spec o en el plan, se para y se pregunta. Los tests usan `DatabaseTransactions` contra `arca_pruebas`. Prohibido `RefreshDatabase`, `migrate:fresh` y cualquier llamada real a Expo. Nunca `arca_zoo`. El nombre del test cita `CA-xx` (en el método, `caNN_`, porque PHPUnit no admite guiones) y el docblock cita `CA-NN`.

## Base de datos (solo lectura)

- [x] **T-01** (precondición de CA-01 a CA-16; RN-12): comprobar la migración sin aplicarla. Evidencia 2026-11-14: `php artisan migrate:status` muestra `2026_11_14_000017_visitor_push_notifications_schema` como Ran (lote 9) con `DB_DATABASE=arca_pruebas`. No se ejecutó `migrate`.
  - Depende de: nada.
  - Pasos: desde `apps/api/src`, `php artisan migrate:status`. La migración `2026_11_14_000017_visitor_push_notifications_schema` debe figurar como ejecutada (`Ran`) y `DB_DATABASE` debe ser `arca_pruebas`, sin copiar secretos al repositorio. No ejecutar `migrate` ni escribir otra migración.
  - Archivos: ninguno.
  - Hecho cuando: la salida de `migrate:status` está anotada en el PR. Si no figura como `Ran`, detenerse y reportarlo. El resto del checklist no empieza.

## Implementación

- [x] **T-02** (RN-12): modelos de preferencia, token y anti-duplicado.
  - Depende de: T-01.
  - Archivos: `apps/api/src/app/Models/VisitorNotificationPreference.php`, `VisitorPushToken.php`, `PushDispatch.php`.
  - Cambios: no extienden `BaseModel` y no usan SoftDeletes. Preferencias y tokens se borran con la cuenta. `push_dispatches` no guarda `visitor_id` ni datos personales.
  - Hecho cuando: las tres clases apuntan a las tablas de DBR-017.

- [x] **T-03** (RN-10): configuración del envío.
  - Depende de: T-01.
  - Archivos: `apps/api/src/config/push.php`, `apps/api/src/.env.example`.
  - Cambios: `PUSH_ENABLED`, `EXPO_PUSH_URL` y `EXPO_ACCESS_TOKEN` vacío. El código no llama a `env()` fuera de config. `EXPO_ACCESS_TOKEN` no se versiona con valor.
  - Hecho cuando: `.env.example` documenta las tres claves y el config las lee.

- [x] **T-04** (CA-11, CA-14, CA-16): contrato de envío y doble de prueba.
  - Depende de: T-03.
  - Archivos: `apps/api/src/app/Push/PushGateway.php`, `ExpoPushGateway.php`, `FakePushGateway.php`.
  - Cambios: `ExpoPushGateway` usa `Http` de Laravel. El falso guarda los mensajes en memoria. Ningún test llama a Expo. El gateway no escribe el token en el log.
  - Hecho cuando: un test puede sustituir el gateway sin red.

- [x] **T-05** (CA-01, CA-02, CA-03, CA-12, CA-15; RN-08, RN-13, RN-14): alta y baja del token.
  - Depende de: T-02.
  - Archivos: `apps/api/src/app/Actions/Visitor/UpsertVisitorPushTokenAction.php`, `DeleteVisitorPushTokenAction.php`, `apps/api/src/app/Http/Requests/Visitor/UpsertVisitorPushTokenRequest.php`, `DeleteVisitorPushTokenRequest.php`, `apps/api/src/app/Http/Controllers/Visitor/VisitorPushTokenController.php`, `apps/api/src/routes/api.php`.
  - Cambios: `PUT /api/v1/visitor/push-tokens` (`visitor.push-tokens.store`) y `DELETE /api/v1/visitor/push-tokens` (`visitor.push-tokens.destroy`), dentro de `auth:sanctum` + `visitor.token` y `EnsureVisitorEmailVerified`. Plataforma solo `android`. El mismo token deja una sola fila. Borrar un token ajeno responde 404 y no toca la otra cuenta. `GET /api/v1/visitor/me` no gana campos de token.
  - Hecho cuando: las rutas nombradas responden 200, 204, 401, 403 `email_not_verified`, 422 y 404 según CA-01, CA-02 y CA-03. Lo demuestran T-07, T-08, T-09, T-17 y T-25.

- [x] **T-06** (CA-04; RN-02, RN-03): lectura y cambio de preferencias.
  - Depende de: T-02.
  - Archivos: `apps/api/src/app/Actions/Visitor/ShowNotificationPreferencesAction.php`, `UpdateNotificationPreferencesAction.php`, `apps/api/src/app/Http/Requests/Visitor/UpdateNotificationPreferencesRequest.php`, `apps/api/src/app/Http/Resources/Visitor/NotificationPreferencesResource.php`, `apps/api/src/app/Http/Controllers/Visitor/VisitorNotificationPreferenceController.php`, `apps/api/src/routes/api.php`.
  - Cambios: `GET` (`visitor.notification-preferences.show`) y `PATCH` (`visitor.notification-preferences.update`). Sin fila, la lectura devuelve `news_and_events: false` y `memory_status: true` y no crea la fila hasta el primer `PATCH`. El resource solo expone esos dos booleanos.
  - Hecho cuando: el GET inicial y el PATCH válido e inválido coinciden con CA-04. Lo demuestra T-10.

- [x] **T-07** (CA-01): test de alta y de repetición del mismo token.
  - Depende de: T-05.
  - Archivo: `apps/api/src/tests/Feature/Visitor/PushTokenTest.php`.
  - Hecho cuando: el test nombra CA-01, usa `DatabaseTransactions` y comprueba una sola fila tras el segundo `PUT`.

- [x] **T-08** (CA-02): test de 401, 403 `email_not_verified` y 422.
  - Depende de: T-05.
  - Archivo: el mismo `PushTokenTest.php`.
  - Hecho cuando: el test nombra CA-02 y comprueba que no se guarda fila.

- [x] **T-09** (CA-03): test de 204 propio y 404 de token ajeno.
  - Depende de: T-05.
  - Archivo: el mismo `PushTokenTest.php`.
  - Hecho cuando: el test nombra CA-03 y la fila de la otra cuenta sigue.

- [x] **T-10** (CA-04): test del GET inicial y del PATCH válido e inválido.
  - Depende de: T-06.
  - Archivo: `apps/api/src/tests/Feature/Visitor/NotificationPreferenceTest.php`.
  - Hecho cuando: el test nombra CA-04. El primer GET no exige fila. Un valor que no es booleano responde 422 y no cambia la fila.

- [x] **T-11** (CA-05, CA-06, CA-07, CA-11, CA-14; RN-04, RN-05, RN-07): cola de noticia y de evento.
  - Depende de: T-02, T-04.
  - Archivos: `apps/api/src/app/Actions/Push/QueueVisibleContentPushAction.php`, `apps/api/src/app/Jobs/SendPushJob.php`, `apps/api/src/app/Console/Commands/DispatchVisibleContentPushCommand.php`, `apps/api/src/routes/console.php`, `apps/api/src/app/Actions/Admin/Content/SaveNewsAction.php`, `SaveEventAction.php`.
  - Cambios: al terminar el guardado, si el registro está visible, se inserta `push_dispatches` (`subject_type` `news` o `event`, `transition_key` `published`) y se encola el job. Si la clave ya existe, no hay otro job. El comando `push:dispatch-visible-content` corre cada hora y recorre lo visible sin esa fila. El scope `Event::publicVisible()` concentra la condición de `api-006`; el listado público lo usa sin cambiar su contrato. Noticia visible según `News::publicVisible()`. El job tiene `tries` 3. Un fallo del gateway no revierte la noticia ni el evento. `PUSH_ENABLED=false` marca el dispatch `sent` sin HTTP. Los tests inyectan `FakePushGateway` y no dependen de esa bandera.
  - Textos: noticia, título = `news.title`, cuerpo «Hay una noticia nueva.», `data.type` `news`, `channelId` `news-and-events`. Evento, título = `events.name`, cuerpo «Hay un evento nuevo.», `data.type` `event`, el mismo canal. El `id` viaja en string.
  - Hecho cuando: T-12 a T-16 pasan.

- [x] **T-12** (CA-05): test de un destinatario, texto de noticia y sin segundo job al reeditar.
  - Depende de: T-11.
  - Archivo: `apps/api/src/tests/Feature/Visitor/ContentPushDispatchTest.php`.
  - Hecho cuando: el test nombra CA-05. Quien tiene `news_and_events` en `false` no recibe nada. Guardar de nuevo, editar, desactivar o volver a activar no encola otro push.

- [x] **T-13** (CA-06): test de noticia aún no visible y del comando horario.
  - Depende de: T-11.
  - Archivo: el mismo `ContentPushDispatchTest.php`.
  - Hecho cuando: el test nombra CA-06. Inactiva, borrada, con `published_date` posterior a hoy o `end_date` anterior a hoy no encola. Al volverse visible, el comando encola el único push.

- [x] **T-14** (CA-07): test del texto de evento y de la preferencia apagada.
  - Depende de: T-11.
  - Archivo: el mismo `ContentPushDispatchTest.php`.
  - Hecho cuando: el test nombra CA-07. Editar o volver a activar no encola otro.

- [x] **T-15** (CA-11): test de fallo del gateway sin deshacer la noticia.
  - Depende de: T-11.
  - Archivo: el mismo `ContentPushDispatchTest.php`.
  - Hecho cuando: el test nombra CA-11. La noticia queda guardada y la respuesta del guardado no cambia.

- [x] **T-16** (CA-14): test de privacidad del payload de noticia y de evento.
  - Depende de: T-11.
  - Archivo: el mismo `ContentPushDispatchTest.php`.
  - Hecho cuando: el test nombra CA-14. El mensaje del doble no trae correo, nombre, apodo, opinión, motivo, campos rechazados ni URL de imagen. El texto visible está en español.

- [x] **T-17** (CA-12): test de dos teléfonos y de borrar uno.
  - Depende de: T-05, T-11.
  - Archivos: `PushTokenTest.php` y `ContentPushDispatchTest.php`.
  - Hecho cuando: el test nombra CA-12. Los dos tokens reciben un mensaje. `DELETE` de uno deja el otro.

- [x] **T-18** (CA-08, CA-09, CA-10; RN-06): cola del momento sobre las acciones que ya existen.
  - Depende de: T-02, T-04.
  - Archivos: `apps/api/src/app/Actions/Push/QueueMemoryPushAction.php`, `apps/api/src/app/Actions/Memories/Review/AcceptMemoryAction.php`, `RejectMemoryAction.php`.
  - Cambios: después del commit, aceptar llama `QueueMemoryPushAction::execute($memory, 'accepted', $reviewId)` y rechazar llama con `rejected`. No se llama en `in_review`, en el envío, en el reenvío ni al vencer `published_until`. Si `memory_status` es `false` o no hay tokens, no encola y no cambia el estado del momento. `transition_key` es el id de la fila de `visitor_memory_reviews` de esa transición. Un segundo rechazo, con otra fila de revisión, tiene otra clave.
  - Textos: aceptado, «Tu momento fue aceptado» y «Tu foto ya está en la galería del portal.». Rechazado, «Tu momento no se publicó» y «Ábrelo en la app para ver qué corregir.». `data.type` `memory`, `data.outcome` `accepted` o `rejected`, `channelId` `memories`.
  - Hecho cuando: T-19 a T-22 pasan.

- [x] **T-19** (CA-08): test de los textos y de las claves `data` de aceptado y rechazado.
  - Depende de: T-18.
  - Archivo: `apps/api/src/tests/Feature/Visitor/MemoryPushDispatchTest.php`.
  - Hecho cuando: el test nombra CA-08 y el autor con token y `memory_status` en `true` recibe un solo push por transición.

- [x] **T-20** (CA-09): test de transiciones que no avisan.
  - Depende de: T-18.
  - Archivo: el mismo `MemoryPushDispatchTest.php`.
  - Hecho cuando: el test nombra CA-09. `in_review`, seguir `submitted`, el vencimiento, la preferencia apagada y la cuenta sin token no encolan. El estado del momento queda como lo dejó `api-010`.

- [x] **T-21** (CA-10): test de un aviso por transición.
  - Depende de: T-18.
  - Archivo: el mismo `MemoryPushDispatchTest.php`.
  - Hecho cuando: el test nombra CA-10. El segundo rechazo encola un push nuevo. Reintentar el job de la primera transición no crea otra fila.

- [x] **T-22** (CA-11, CA-14): test de fallo al revisar un momento y de privacidad de ese payload.
  - Depende de: T-18.
  - Archivo: el mismo `MemoryPushDispatchTest.php`.
  - Hecho cuando: los tests nombran CA-11 y CA-14. Aceptar o rechazar queda guardado si el gateway falla. El payload no trae motivo, opinión ni URL.

- [x] **T-23** (CA-13; RN-12): borrado físico al borrar la cuenta.
  - Depende de: T-02, T-05, T-06.
  - Archivo: `apps/api/src/app/Actions/Visitor/DeleteVisitorAccountAction.php`.
  - Cambios: antes de `$visitor->delete()`, borra tokens y preferencias de ese `visitor_id`. `push_dispatches` se conserva. La cascada de la DBR sigue definida en la migración; esta tarea no la reescribe.
  - Hecho cuando: T-24 pasa.

- [x] **T-24** (CA-13): test de `DELETE /api/v1/visitor/me`.
  - Depende de: T-23.
  - Archivo: `PushTokenTest.php`.
  - Hecho cuando: el test nombra CA-13. Tokens y preferencias desaparecen. Un aviso posterior no tiene destinatario.

- [x] **T-25** (CA-15): test de aislamiento.
  - Depende de: T-05, T-06.
  - Archivo: `PushTokenTest.php`.
  - Hecho cuando: el test nombra CA-15. Sin sesión responde 401. La cookie de personal no opera estas rutas. Un visitante solo ve y cambia lo suyo.

- [x] **T-26** (RN-11): métodos del cliente compartido, sin reglas.
  - Depende de: T-05, T-06.
  - Archivo: `packages/api-client/visitor.ts`.
  - Cambios: tipos y métodos de alta, baja, lectura y cambio. Sin decidir destinatarios ni redactar textos. Lo consume `mobile-013`.
  - Hecho cuando: el paquete declara las cuatro llamadas del plan y no contiene la decisión de avisar.

## Calidad y entrega

- [x] **T-27** (CA-16): suite de la feature.
  - Depende de: T-07 a T-10, T-12 a T-17, T-19 a T-22, T-24 y T-25.
  - Pasos: `php artisan test --filter=Push` desde `apps/api/src`, más el filtro que cubra los cuatro archivos si el nombre no entra en `Push`.
  - Hecho cuando: hay al menos un test que nombra cada CA-01 a CA-15, todos usan `DatabaseTransactions` y un doble del envío, y ninguno llama a un servicio externo ni usa `RefreshDatabase`.

- [x] **T-28**: estilo de los archivos de la feature.
  - Depende de: T-27.
  - Pasos: Pint sobre los archivos creados o tocados por T-02 a T-26.
  - Hecho cuando: Pint termina limpio en esos archivos.

- [x] **T-29**: nota de operación y referencia corta.
  - Depende de: T-11, T-23.
  - Archivos: `infra/README.md`, `apps/api/docs/visitante-push.md`.
  - Cambios: worker de `queue:work`, `schedule:run` y `EXPO_ACCESS_TOKEN` por ambiente. La nota dice las cuatro rutas y que el token no se registra en logs. No se redacta el aviso de privacidad oficial.
  - Hecho cuando: el PR de implementación enlaza esa nota y el checklist de `infra/README.md` menciona el worker y el scheduler.

- [x] **T-30**: enlaces del PR.
  - Depende de: T-27, T-29.
  - Hecho cuando: el PR cita `api-017` y enlaza spec, plan, tasks, ADR 0029 y DBR-017. No se abre ese PR en el corte que solo redacta este checklist.
  - Confirmado por Aksel el 2026-11-20: la verificación y el pull de notificaciones ya se hicieron. Esta task no guarda la URL del PR.
