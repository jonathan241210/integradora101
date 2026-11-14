# 017 · visitor-push-notifications

- App dueña: `api`
- Apps/paquetes afectados: `api` (dueña de cuándo se avisa, a quién, el texto, las preferencias y los tokens); `mobile` (permiso de Android, registro del teléfono y aviso en la barra del sistema, spec `mobile-013`); `packages/api-client` (métodos y tipos del visitante, sin lógica de negocio).
- Estado: Aprobada
- Solicitante / responsable funcional: Aksel
- Aprobación funcional: Aksel, 2026-11-14
- Decisiones de alcance confirmadas el 2026-11-14: solo push a la barra del sistema; sin correo; un momento se avisa al aceptarlo o al rechazarlo; noticias y eventos solo a cuentas con sesión que activaron ese aviso; dos preferencias distintas. `news_and_events` nace en `false` y `memory_status` nace en `true`.
- Dependencias: `api-004` (sesión de visitante y borrado de cuenta), `api-010` (transiciones de un momento), `api-011` (cuándo una noticia es visible) y `api-006` (cuándo un evento es visible). El envío real espera plan y tasks aprobados, DBR-014 en `Lista para backend` y la aceptación del ADR 0029.
- Aprobar esta spec no autoriza implementar: faltan el plan técnico del equipo, las tasks y la DBR en `Lista para backend`.

## Problema y contexto

Quien usa la app del zoológico se entera de una noticia, un evento o el resultado de su foto solo si abre la app y busca. `api-010` y `mobile-010` dejaron ese aviso fuera de su versión: la app consulta «Mis momentos» y no hay push ni correo.

Esta spec cubre el aviso que Android muestra en la barra del sistema, también con la app en segundo plano o cerrada. El texto lo redacta la API y viaja en el push. No hay bandeja dentro de la app ni correo.

Afecta a quien tiene cuenta de visitante en la app Android. El portal, el dashboard y la PWA no envían ni reciben estos avisos.

## Objetivos

- Avisar una sola vez cuando una noticia o un evento pasa a ser visible para el público, solo a las cuentas que activaron esa preferencia y tienen un teléfono registrado.
- Avisar una sola vez al aceptar o al rechazar un momento, solo a su autor si activó esa preferencia y tiene un teléfono registrado.
- Guardar en la cuenta las dos preferencias y los tokens de los teléfonos.
- Que un fallo del envío no deshaga la publicación ni la revisión.
- Cubrir cada CA-xx con al menos un test PHPUnit que lo nombre, sin llamar a un servicio push real.

## Fuera de alcance

- Correo, SMS y avisos dentro de la app (bandeja, badge o pantalla de historial).
- Push en el portal, el dashboard o la PWA. El portal sigue sin sesión ni service worker (ADR 0024 y ADR 0027).
- iOS. La app pública es Android (ADR 0004 y ADR 0012).
- Avisar cuando un momento pasa a En proceso, cuando vence en la galería o cuando se reenvía.
- Un segundo aviso si la noticia o el evento se edita, se oculta o vuelve a publicarse.
- Avisar al personal. `staff_notifications` no se usa ni se amplía.
- Elegir el proveedor del push y la librería. Lo decide el plan y el ADR 0029. Los tests sustituyen el envío.
- Redactar el aviso de privacidad oficial del zoológico.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante con sesión y correo verificado | Registrar su teléfono, elegir las dos preferencias y recibir el push | Ability `visitor` (`api-004`) y correo verificado |
| Visitante sin sesión o con correo sin verificar | No registra el teléfono ni cambia preferencias | — |
| `zoo-admin` | Sin acción nueva: aceptar o rechazar un momento, o publicar una noticia o un evento, dispara el aviso | Los permisos que ya exigen esas acciones |
| Otro visitante o el personal | No lee ni borra tokens o preferencias ajenas | — |

## Historias de usuario

- Como visitante, quiero recibir en la barra del sistema el aviso de una noticia o un evento nuevo, para enterarme sin abrir la app.
- Como visitante, quiero apagar las noticias y los eventos sin apagar el resultado de mi foto.
- Como visitante, quiero que al aceptar o rechazar mi foto el teléfono me avise, para saber si ya está en la galería o si tengo que corregirla.
- Como visitante, quiero que el aviso de un rechazo no muestre el motivo en la pantalla de bloqueo.

## Criterios de aceptación

- **CA-01 (registro del teléfono):** Dado un visitante con sesión y correo verificado, cuando envía `PUT /api/v1/visitor/push-tokens` con un token no vacío y `platform` `android`, entonces responde 200 y guarda ese token ligado a su cuenta. Enviar el mismo token otra vez responde 200 y deja una sola fila.
- **CA-02 (sesión y plataforma):** Dado un `PUT` sin sesión, responde 401. Con correo sin verificar, responde 403 `email_not_verified`. Con `platform` distinto de `android`, o sin token, responde 422 y no guarda nada.
- **CA-03 (baja del teléfono):** Dada una sesión con un token registrado, cuando envía `DELETE /api/v1/visitor/push-tokens` con ese token, entonces responde 204 y ese teléfono deja de recibir avisos. Un token que no es suyo responde 404 y no borra la fila de otra cuenta.
- **CA-04 (preferencias):** Dada la primera lectura `GET /api/v1/visitor/notification-preferences` de una cuenta, cuando responde 200, entonces `news_and_events` es `false` y `memory_status` es `true`. Un `PATCH` con uno o los dos booleanos responde 200 y el `GET` siguiente devuelve lo guardado. Un valor que no es booleano responde 422 y no cambia la fila.
- **CA-05 (noticia, una vez y solo a quien la pidió):** Dada una noticia que pasa a ser visible (RN-04) y dos visitantes con token Android, uno con `news_and_events` en `true` y otro en `false`, cuando la API procesa el aviso, entonces encola un solo push al primero, con título igual al `title` de la noticia, cuerpo «Hay una noticia nueva.» y datos `type` `news` e `id` de esa noticia. El segundo no recibe nada. Guardar de nuevo la misma noticia, editarla, desactivarla o volver a activarla no encola otro push.
- **CA-06 (noticia aún no visible):** Dada una noticia inactiva, borrada lógicamente, con `published_date` posterior a hoy o con `end_date` anterior a hoy (`api-011` RN-03 y RN-14), cuando se guarda, entonces no encola push. Si más adelante cumple la visibilidad, el primer momento en que es visible encola el único push de CA-05.
- **CA-07 (evento, una vez):** Dado un evento que pasa a ser visible (`is_active` y `end_date` nulo o mayor o igual a hoy, `api-006`) y un visitante con token y `news_and_events` en `true`, cuando la API procesa el aviso, entonces encola un solo push con título igual al `name` del evento, cuerpo «Hay un evento nuevo.» y datos `type` `event` e `id`. Quien tiene la preferencia en `false` no recibe nada. Editarlo o volver a activarlo no encola otro.
- **CA-08 (momento aceptado o rechazado):** Dada la transición de un momento a `accepted` o a `rejected` (`api-010`) y su autor con token y `memory_status` en `true`, cuando la transición queda guardada, entonces encola un solo push. Si fue aceptado, el título es «Tu momento fue aceptado» y el cuerpo «Tu foto ya está en la galería del portal.». Si fue rechazado, el título es «Tu momento no se publicó» y el cuerpo «Ábrelo en la app para ver qué corregir.». Los datos son `type` `memory`, `id` del momento y `outcome` `accepted` o `rejected`.
- **CA-09 (momento sin aviso):** Dado un momento que pasa a `in_review`, que sigue `submitted` o cuya publicación vence, cuando ocurre, entonces no encola push. Si el autor tiene `memory_status` en `false` o no tiene token, aceptar o rechazar tampoco encola push y el estado del momento queda como lo dejó `api-010`.
- **CA-10 (un aviso por transición):** Dado un momento rechazado, corregido y rechazado otra vez, cuando ocurre la segunda transición a `rejected`, entonces encola un push nuevo. Reintentar el envío de la primera transición no encola un duplicado.
- **CA-11 (el fallo no deshace la acción):** Dado que el envío push falla o el proveedor está caído, cuando se publicó la noticia o el evento, o se aceptó o rechazó el momento, entonces esa acción responde igual que hoy y queda guardada. El fallo no la revierte.
- **CA-12 (varios teléfonos):** Dada una cuenta con dos tokens Android y la preferencia encendida, cuando corresponde un aviso, entonces encola un push a cada token. `DELETE` de uno no quita el otro.
- **CA-13 (borrado de cuenta):** Dada una cuenta con tokens y preferencias, cuando `DELETE /api/v1/visitor/me` borra la cuenta (`api-004` CA-14), entonces también borra físicamente sus tokens y sus preferencias. Un aviso posterior no tiene destinatario.
- **CA-14 (privacidad del payload):** Dado cualquier push de esta spec, cuando se revisa su contenido, entonces no incluye correo, nombre, apodo, opinión, motivo de rechazo, campos rechazados ni URL de la imagen. El texto visible está en español.
- **CA-15 (aislamiento):** Dada la sesión de un visitante, cuando consulta o cambia preferencias o tokens, entonces solo opera sobre los suyos. Sin sesión responde 401. Estas rutas no aceptan la sesión cookie del personal.
- **CA-16 (cobertura):** Dada la suite de PHPUnit contra `arca_pruebas`, cuando se ejecuta, entonces hay al menos un test que nombra cada CA-01 a CA-15, usa `DatabaseTransactions` y un doble del envío push. Ningún test llama a un servicio externo ni usa `RefreshDatabase`.

## Reglas de negocio

- **RN-01 (la API redacta y decide):** La API decide si un aviso corresponde, a qué cuenta y con qué texto. El teléfono solo lo muestra. El texto visible va en el payload porque la app puede estar cerrada.
- **RN-02 (dos preferencias):** `news_and_events` cubre noticias y eventos. `memory_status` cubre la aceptación y el rechazo de un momento. Una no enciende la otra.
- **RN-03 (valores iniciales):** Al crear las preferencias, `news_and_events` nace en `false` y `memory_status` nace en `true`. Confirmado por Aksel el 2026-11-14.
- **RN-04 (visibilidad):** Una noticia se puede avisar solo cuando es visible según `api-011` RN-03, con «hoy» en `America/Mexico_City` (`api-011` RN-14). Un evento, solo cuando es visible según `api-006`. El aviso espera a ese momento si al guardar todavía no lo es.
- **RN-05 (una vez por contenido):** Cada noticia y cada evento generan como máximo un push, el de la primera vez que fueron visibles. Editar, ocultar o volver a publicar no genera otro.
- **RN-06 (transiciones del momento):** Solo el paso a `accepted` y el paso a `rejected` generan push. Cada transición genera uno. En proceso, el envío, el reenvío y el vencimiento no generan push.
- **RN-07 (destinatario):** El push de una noticia o un evento llega a cada token Android de las cuentas con `news_and_events` en `true`. El de un momento llega solo a los tokens de su autor si `memory_status` está en `true`. Sin token no hay envío y no hay otro canal.
- **RN-08 (token):** El token identifica un teléfono Android de una cuenta. Se guarda al registrarlo y se borra al darlo de baja, al cerrar la sesión de ese teléfono o al borrar la cuenta. No se devuelve en `GET /api/v1/visitor/me` ni en las preferencias.
- **RN-09 (sin correo ni bandeja):** No se envía correo. No se escribe en `staff_notifications` ni se crea un historial de avisos para mostrar dentro de la app. El registro que evita duplicados no es una bandeja.
- **RN-10 (el envío no bloquea):** El push se encola (`jobs`, `QUEUE_CONNECTION`). Publicar o revisar no espera al proveedor. Un fallo de envío se reintenta de forma acotada y no revierte la noticia, el evento ni el momento (CA-11).
- **RN-11 (arquitectura):** Controladores delgados → Form Requests → Actions → API Resources. La decisión de avisar vive en Actions, al cierre de la acción que publica o revisa, y en el pase que detecta el contenido que se vuelve visible por fecha. Esas Actions no se copian al cliente.
- **RN-12 (borrado físico):** Tokens y preferencias se borran físicamente con la cuenta (`api-004` RN-08). No son datos clínicos ni financieros y no usan SoftDeletes.
- **RN-13 (solo Android):** `platform` distinto de `android` se rechaza (CA-02).
- **RN-14 (rutas):** Rutas en inglés y con nombre, bajo `/api/v1/visitor`: `visitor.push-tokens.store`, `visitor.push-tokens.destroy`, `visitor.notification-preferences.show`, `visitor.notification-preferences.update`. Sin Inertia ni Wayfinder.

## Datos, privacidad y auditoría

- Se guardan las dos preferencias de la cuenta y, por teléfono, el token push, la plataforma `android` y la cuenta dueña. El token es un identificador del dispositivo: no se escribe en logs de aplicación ni en Activitylog.
- El payload de un momento no lleva motivo, opinión ni imagen (CA-14). Esos datos siguen en «Mis momentos», con sesión.
- No son datos clínicos ni financieros.
- Requiere DBR: sí. La acompaña `docs/database/requests/DBR-014-visitor-push-notifications.md` (Borrador, abierta). Esta spec no incluye SQL ni migración. Hasta que esa DBR esté en `Lista para backend` no se implementan modelos ni endpoints.
- El borrado de cuenta de `api-004` CA-14 debe incluir estas filas. Esta spec no modifica el texto de `api-004`; el plan de implementación engancha `DeleteVisitorAccountAction`.
- El aviso de privacidad oficial, antes del público, debe decir que la app registra el token del teléfono para estos avisos. Esta spec no cambia ese texto.

## Flujos y errores

1. La app, con sesión y correo verificado, registra el token Android y lee las preferencias.
2. La persona enciende o apaga cada preferencia. La API guarda el booleano.
3. Al volver visible una noticia o un evento, la API encola un push por cada token de quien tiene `news_and_events` en `true`, si ese contenido no se avisó antes.
4. Al aceptar o rechazar un momento, la API encola un push a los tokens del autor si `memory_status` está en `true`.
5. Cerrar sesión en un teléfono borra solo su token. Borrar la cuenta borra tokens y preferencias.
6. 401 sin sesión. 403 `email_not_verified` sin correo verificado. 422 si el cuerpo no cumple CA-02 o CA-04. 404 al borrar un token ajeno o inexistente. Un 5xx del proveedor queda en la cola y no cambia el contenido (CA-11).

## Dependencias, riesgos y preguntas

- Dependencias y ADR: el proveedor push queda propuesto en el ADR 0029 (push de Expo sobre FCM, HTTP de Laravel sin paquete nuevo en la API, `expo-notifications` en la app). El ADR está Propuesto y no autoriza instalar la dependencia ni enviar avisos reales. Credenciales solo en `.env`. El PR de implementación anota el requisito en `infra/README.md` (scheduler, worker de cola, credenciales y build de Play Store: el push no funciona en Expo Go).
- Divergencia: `api-010` y `mobile-010` citan esta spec en su «Fuera de alcance». `mobile-002` CA-14 cita los interruptores de `mobile-013`.
- Riesgos: sin el permiso de Android o sin token, la persona no se entera hasta abrir la app. Una noticia con `published_date` futuro espera a ese día y el ambiente necesita el pase programado encendido. El título que viaja es el de ese momento; una edición posterior no actualiza el aviso ya enviado.
- Preguntas pendientes: ninguna. El alcance y los valores iniciales quedaron confirmados por Aksel el 2026-11-14.

## Revisión

- Aprobadores y fecha: Aksel, 2026-11-14 (aprobación funcional). La aprobación técnica del plan sigue pendiente.
- Evidencia/enlaces: `apps/mobile/specs/013-visitor-push-notifications.md`, `apps/api/plan/017-visitor-push-notifications.md`, `docs/database/requests/DBR-014-visitor-push-notifications.md`, `docs/adr/0029-visitor-android-push.md`, `apps/api/specs/010-visitor-memory-requests.md`, `apps/api/specs/011-public-news-read.md`, `apps/api/specs/006-public-catalog-read.md`, `apps/api/specs/004-visitor-authentication.md`, `docs/adr/0004-mobile-react-native.md`, `docs/adr/0011-visitor-identity-and-mobile-session.md`, `docs/adr/0012-android-distribution-channel.md`.
