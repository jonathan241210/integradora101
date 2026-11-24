# Plan técnico · 017 · visitor-push-notifications

- Spec: `apps/api/specs/017-visitor-push-notifications.md`
- Estado de spec: Implementada
- Solicitada: 2026-11-14
- Aprobada: 2026-11-14
- Estado del plan: Aprobado técnicamente. No autoriza código hasta contar con tasks aprobadas. El ADR 0029 está Aceptado y DBR-017 está en `Lista para backend`.
- Responsable técnico: por identificar

## Diseño de solución

La API decide si un aviso corresponde, redacta el título y el cuerpo en español y los pone en el payload. El teléfono solo muestra la barra del sistema (`mobile-013`). No hay correo ni bandeja.

El envío sale por la cola `database` (`jobs`, ya creada). Publicar una noticia, publicar un evento o aceptar o rechazar un momento responde como hoy. Un job posterior llama al servicio push de Expo con `Illuminate\Support\Facades\Http`, sin paquete nuevo. Expo entrega a FCM y FCM al Android. El ADR 0029 está Aceptado. El envío real y `expo-notifications` esperan las tasks.

Los tests sustituyen el gateway. Ningún test llama a Expo.

```text
SaveNewsAction / SaveEventAction / comando horario
  → QueueVisibleContentPushAction (si es visible y no hay dispatch)
AcceptMemoryAction / RejectMemoryAction (api-010, aún no están en src/)
  → QueueMemoryPushAction (solo accepted o rejected)
        → fila push_dispatches (única) + job SendPushJob
              → PushGateway (ExpoPushGateway o doble de test)
                    → POST al servicio push de Expo
```

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Datos | DBR-017 (Lista para backend). La migración `2026_11_14_000017_visitor_push_notifications_schema` ya existe; este plan no la aplica | `visitor_notification_preferences`, `visitor_push_tokens`, `push_dispatches` |
| API / modelos | `app/Models/VisitorNotificationPreference.php`, `VisitorPushToken.php`, `PushDispatch.php` | Filas de preferencia, token y deduplicación. No extienden `BaseModel` ni usan SoftDeletes (excepción de RN-12, mismo criterio que `visitor_refresh_tokens`) |
| API / config | `config/push.php`; `.env.example` con `PUSH_ENABLED`, `EXPO_PUSH_URL`, `EXPO_ACCESS_TOKEN` vacío y `PUSH_CA_BUNDLE` vacío | La URL, el token y el paquete de CA salen de `.env`. El código no llama a `env()` fuera de config. `PUSH_CA_BUNDLE` solo hace falta si PHP no verifica HTTPS (cURL 60 en Windows) |
| API / gateway | `app/Push/PushGateway.php`, `ExpoPushGateway.php`, `FakePushGateway.php` | Contrato de envío. `Http::post` a Expo, con `PUSH_CA_BUNDLE` si hace falta verificar TLS. Si Expo rechaza todos los tickets del lote, el job falla. El falso guarda los mensajes en memoria |
| API / Actions | `app/Actions/Visitor/UpsertVisitorPushTokenAction.php`, `DeleteVisitorPushTokenAction.php`, `ShowNotificationPreferencesAction.php`, `UpdateNotificationPreferencesAction.php` | Registro, baja y preferencias de la cuenta de la sesión |
| API / Actions | `app/Actions/Push/QueueVisibleContentPushAction.php`, `QueueMemoryPushAction.php` | Insertan `push_dispatches` si la clave única está libre y encolan el job |
| API / job | `app/Jobs/SendPushJob.php` | Carga destinatarios, arma el payload y llama al gateway. Reintentos acotados (`tries` 3). No revierte contenido |
| API / comando | `app/Console/DispatchVisibleContentPushCommand.php`; `routes/console.php` | Cada hora busca noticias y eventos ya visibles sin fila de dispatch |
| API / HTTP | `app/Http/Controllers/Visitor/VisitorPushTokenController.php`, `VisitorNotificationPreferenceController.php` | Controladores delgados |
| API / validación | `app/Http/Requests/Visitor/UpsertVisitorPushTokenRequest.php`, `DeleteVisitorPushTokenRequest.php`, `UpdateNotificationPreferencesRequest.php` | Token no vacío, `platform` = `android`, booleanos. Mensajes en español. 403 `email_not_verified` si `email_verified_at` es null |
| API / Resources | `app/Http/Resources/Visitor/NotificationPreferencesResource.php` | Solo `news_and_events` y `memory_status` |
| API / rutas | `routes/api.php`, dentro de `auth:sanctum` + `visitor.token` | Nombres de RN-14 |
| API / cuenta | `app/Actions/Visitor/DeleteVisitorAccountAction.php` | Antes de borrar la cuenta, borra tokens y preferencias (CA-13). Los refresh tokens siguen como hoy |
| API / contenido | `SaveNewsAction.php`, `SaveEventAction.php` | Al terminar el guardado, llaman a `QueueVisibleContentPushAction` si el registro está visible |
| API / momentos | Llamada prevista en `AcceptMemoryAction` y `RejectMemoryAction` del plan de `api-010` | Esas clases no están en `src/`. Este plan fija la llamada; los tests de CA-08 a CA-10 invocan `QueueMemoryPushAction` con una fila de `visitor_memories`. Quien implemente `api-010` añade la llamada al final del commit |
| API / pruebas | `tests/Feature/Visitor/PushTokenTest.php`, `NotificationPreferenceTest.php`, `ContentPushDispatchTest.php`, `MemoryPushDispatchTest.php` | Un test nombra cada CA-01 a CA-15. `Http::fake` o `FakePushGateway`. `DatabaseTransactions`. Sin `RefreshDatabase` |
| Paquete | `packages/api-client/visitor.ts` | Tipos y métodos. Sin reglas de negocio. Lo consume `mobile-013` |
| Infra | `infra/README.md` (en el PR de implementación, no ahora) | Worker de cola, `schedule:run` y `EXPO_ACCESS_TOKEN` por ambiente |
| Documentación | `apps/api/docs/` una sección corta de push del visitante, en el mismo PR de implementación | Referencia de rutas y de que el token no se registra en logs |

## Contrato y datos

### Endpoints

Prefijo `/api/v1`. Grupo existente `visitor` + `auth:sanctum` + `visitor.token` (`EnsureVisitorToken`, ability `visitor`).

| Método | Ruta | Nombre | Éxito | Error |
|---|---|---|---|---|
| `PUT` | `/visitor/push-tokens` | `visitor.push-tokens.store` | 200 `{"data":{"platform":"android"}}` | 401 sin sesión; 403 `email_not_verified` o ability ajena; 422 sin token o `platform` distinto de `android` |
| `DELETE` | `/visitor/push-tokens` | `visitor.push-tokens.destroy` | 204 | 401; 404 si el token no es de esa cuenta |
| `GET` | `/visitor/notification-preferences` | `visitor.notification-preferences.show` | 200 con los dos booleanos | 401; 403 |
| `PATCH` | `/visitor/notification-preferences` | `visitor.notification-preferences.update` | 200 con los dos booleanos | 401; 403; 422 si un campo presente no es booleano |

El cuerpo de alta es `{ "token": "...", "platform": "android" }`. El de baja envía el mismo `token`. El `PATCH` acepta uno o los dos campos. La primera lectura, sin fila, devuelve `news_and_events: false` y `memory_status: true` y no exige crear la fila hasta el primer `PATCH` (RN-03).

El login de `api-004` ya rechaza el correo sin verificar. La Request igual comprueba `email_verified_at` para el caso de un token fabricado en pruebas (CA-02).

`GET /api/v1/visitor/me` no gana campos de token ni de preferencias (RN-08).

### Payload que viaja a Expo

Un objeto por token. El gateway puede agrupar hasta 100 por petición HTTP.

- Noticia: `title` = `news.title`, `body` = `Hay una noticia nueva.`, `data.type` = `news`, `data.id` = id en string, `channelId` = `news-and-events`.
- Evento: `title` = `events.name`, `body` = `Hay un evento nuevo.`, `data.type` = `event`, `channelId` = `news-and-events`.
- Momento aceptado: título `Tu momento fue aceptado`, cuerpo `Tu foto ya está en la galería del portal.`, `data.outcome` = `accepted`, `channelId` = `memories`.
- Momento rechazado: título `Tu momento no se publicó`, cuerpo `Ábrelo en la app para ver qué corregir.`, `data.outcome` = `rejected`, `channelId` = `memories`.

El payload no incluye correo, nombre, apodo, opinión, motivo, campos rechazados ni URL de imagen (CA-14). El gateway no escribe el token en el log.

### Deduplicación

`push_dispatches` tiene clave única `(subject_type, subject_id, transition_key)`.

- Noticia: `subject_type` `news`, `transition_key` `published`.
- Evento: `subject_type` `event`, `transition_key` `published`.
- Momento: `subject_type` `memory`, `transition_key` el id de la fila de `visitor_memory_reviews` de esa transición.

La Action inserta la fila en estado `pending` y encola `SendPushJob` con ese id. Si la clave ya existe, no encola otro job (CA-05, CA-07, CA-10). Un segundo rechazo, con otra fila de revisión, tiene otra clave y sí encola (CA-10). El job, al terminar, marca `sent`. Si agota los 3 intentos, marca `failed`. La fila se queda, así el comando horario no vuelve a encolar esa noticia.

### Visibilidad

- Noticia: el scope ya existente `News::publicVisible()` (`api-011` RN-03, `PublicCalendar::today()`).
- Evento: la misma condición que `ListEventsAction` (`is_active` y `end_date` nulo o `>=` hoy). Se extrae a un scope `Event::publicVisible()` para no copiar la condición en el comando y en el guardado. El listado público pasa a usar ese scope sin cambiar su contrato (`api-006`).

`SaveNewsAction` y `SaveEventAction` llaman a la Action de cola solo si, después de guardar, el modelo cumple el scope. El comando `push:dispatch-visible-content`, cada hora en `routes/console.php`, recorre las visibles sin fila `published`. Así una `published_date` futura espera a ese día (CA-06).

### Momentos

`AcceptMemoryAction` y `RejectMemoryAction` ya están en `apps/api/src/app/Actions/Memories/Review/`. Después del commit llaman:

`QueueMemoryPushAction::execute($memory, $outcome, $reviewId)` con `$outcome` `accepted` o `rejected`.

No se llama en `in_review`, en el envío, en el reenvío ni al vencer `published_until` (CA-09). Si `memory_status` es `false` o no hay tokens, la Action no encola y no cambia el estado del momento.

### Borrado de cuenta

`DeleteVisitorAccountAction` borra las filas de tokens y de preferencias de ese `visitor_id` antes de `$visitor->delete()`. La DBR además pide `ON DELETE CASCADE` desde `visitors`. `push_dispatches` no tiene `visitor_id`: se conserva para que una reedición no dispare otro aviso.

### Errores y compatibilidad

Los mensajes visibles siguen en español. Un 5xx de Expo no cambia la noticia, el evento ni el momento (CA-11): el job falla solo. `PUSH_ENABLED=false` (desarrollo) marca el dispatch `sent` sin HTTP, para que la cola no se atasque en local. Las pruebas no dependen de esa bandera: inyectan `FakePushGateway`.

## Seguridad, offline y operación

- El token push es un identificador del teléfono. No entra en Activitylog ni en logs de aplicación. `EXPO_ACCESS_TOKEN` solo vive en `.env` de cada ambiente y no se versiona.
- Las rutas exigen ability `visitor`. Una sesión cookie de personal no las usa (CA-15). Un visitante no borra el token de otro (CA-03).
- No hay rate limit nuevo en este corte. El registro es un `PUT` idempotente por token.
- La app puede estar cerrada: el texto va en el payload (RN-01). No hay cola offline en el cliente.
- MySQL 8.0, portable entre Aiven y local (ADR 0013). Tipos estándar. La base de trabajo de los tests es `arca_pruebas`. `arca_zoo` no se toca.
- Operación, cuando se implemente: un worker de `queue:work` y `schedule:run` cada minuto. Sin eso, el aviso queda en `jobs` o espera a la hora siguiente. Se anota en `infra/README.md` en ese PR.
- El build público es Play Store (ADR 0012). Expo Go no entrega este push.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | Alta y repetición del mismo token dejan una fila | `apps/api/src/tests/Feature/Visitor/PushTokenTest.php` |
| CA-02 | 401, 403 `email_not_verified` y 422 | El mismo archivo |
| CA-03 | 204 de la propia cuenta y 404 de un token ajeno | El mismo archivo |
| CA-04 | GET inicial y PATCH válido e inválido | `NotificationPreferenceTest.php` |
| CA-05 | Un destinatario, texto de noticia, sin segundo job al reeditar | `ContentPushDispatchTest.php` |
| CA-06 | Noticia futura no encola; el comando la encola al volverse visible | El mismo archivo |
| CA-07 | Texto de evento y preferencia apagada | El mismo archivo |
| CA-08 | Textos de aceptado y rechazado y claves `data` | `MemoryPushDispatchTest.php` |
| CA-09 | `in_review`, vencimiento, preferencia apagada y cuenta sin token no encolan | El mismo archivo |
| CA-10 | Segundo rechazo encola; reintento del job de la primera transición no crea otra fila | El mismo archivo |
| CA-11 | Gateway que lanza y la noticia o el momento siguen guardados | `ContentPushDispatchTest.php` y `MemoryPushDispatchTest.php` |
| CA-12 | Dos tokens reciben dos mensajes; borrar uno deja el otro | `PushTokenTest.php` y `ContentPushDispatchTest.php` |
| CA-13 | `DELETE /api/v1/visitor/me` borra tokens y preferencias | `PushTokenTest.php` |
| CA-14 | El mensaje capturado por el doble no trae correo, nombre, opinión, motivo ni URL | `ContentPushDispatchTest.php` y `MemoryPushDispatchTest.php` |
| CA-15 | 401 sin Bearer; cookie de personal no opera estas rutas | `PushTokenTest.php` |
| CA-16 | La suite nombra CA-01 a CA-15, usa `DatabaseTransactions` y no llama a Expo | Los cuatro archivos |

CA-16 se cumple porque cada test anterior incluye el identificador `CA-xx` en su nombre. No hace falta un test aparte.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | La API usa `Http` de Laravel, sin paquete nuevo. El ADR 0029 está Aceptado: `expo-notifications` se instala con las tasks. Secretos por `.env`. MySQL igual en Aiven y en local |
| II. La spec manda | Sí, en este documento | Spec Aprobada por Equipo de producto móvil. Plan aprobado por Responsable de BD Adrian el mismo día. Las tasks quedan en borrador hasta su aprobación. No hay código de esta feature |
| III. Lógica separada de la interfaz | Sí | Quién recibe el aviso y el texto viven en Actions. Los controladores delegan. `@arca/api-client` solo declara métodos |
| IV. Un test por criterio | Sí, al implementar | La tabla de arriba cubre CA-01 a CA-16. Los tests no se escriben en este corte |
| V. Una sola fuente de verdad para los datos | Excepción aceptada | DBR-017 está Lista para backend. Tokens, preferencias y `push_dispatches` no usan SoftDeletes ni `BaseModel`: se borran con la cuenta o se conservan solo como clave anti-duplicado, sin datos clínicos ni financieros (RN-12). `push_dispatches` no guarda datos personales. El plan y el ADR 0029 aceptan esa excepción |
| VI. Código en inglés, personas en español | Sí | Tablas, rutas, clases y `data.type` en inglés. Títulos, cuerpos y errores en español |

Ninguna excepción se implementa sin la aprobación de este plan y del ADR 0029. El plan y el ADR ya están aceptados. Faltan las tasks.

## Riesgos y decisiones

- ADR 0029: Expo Push API sobre FCM. Alternativa descartada en el ADR: SDK de Firebase en PHP y correo masivo.
- `AcceptMemoryAction` y `RejectMemoryAction` ya están en el repositorio. La task de momentos las llama al final del commit. Los tests de momentos también pueden invocar `QueueMemoryPushAction`.
- Sin worker o sin scheduler el aviso no sale, y el contenido sí queda guardado. Es el comportamiento de CA-11.
- Una edición posterior no cambia el texto ya enviado (RN-05).
- El aviso de privacidad oficial debe mencionar el token antes del público. Esta feature no redacta ese texto.

## Orden y aprobación

1. El plan lo aprobó Responsable de BD Adrian y el ADR 0029 lo aceptó Equipo de producto móvil, ambos. Faltan las tasks. No hay código.
2. DBR-017 está Lista para backend (BD Responsable de BD Adrian y backend Equipo de producto móvil). La migración ya fue probada en MySQL 8.0 aislado. La task de solo lectura comprueba si figura en `arca_pruebas` antes de programar.
3. Backend implementa modelos, Actions, rutas, job, comando y tests, y anota `infra/README.md`.
4. La implementación de estas tasks añade la llamada en `AcceptMemoryAction` y `RejectMemoryAction`, que ya existen.
5. `mobile-013` consume el contrato. Su plan ya está aprobado y el ADR 0029 ya acepta `expo-notifications`. Faltan sus tasks, que se redactan en el mismo corte y no se ejecutan todavía.

Aprobación funcional de la spec: Equipo de producto móvil. Aprobación técnica de este plan: Responsable de BD Adrian.
