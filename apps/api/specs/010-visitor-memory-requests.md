# 010 · visitor-memory-requests

- App dueña: `api`
- Apps/paquetes afectados: `api` (dueña de estados, archivo y revisión), `mobile` (quien envía; spec `mobile-010`), `dashboard` (quien revisa; spec futura, no se redacta ahora)
- Estado: Borrador
- Solicitante / responsable funcional: Aksel
- Responsable de BD: por identificar. Esta feature requerirá una DBR cuando se apruebe; este borrador no la abre.
- Aprobación funcional: pendiente

## Problema y contexto

En el portal público, la sección «Momentos para recordar» (`#galeria` en `apps/web`) muestra tres fotos fijas. No hay subida, ni petición, ni revisión. El zoológico quiere que un visitante, desde la app móvil, pida publicar una imagen. El administrador general (`admin`) y el administrador del zoológico (`zoo-admin`) darán visto bueno o visto malo. La imagen no se publica sola.

No existe tabla, permiso, endpoint ni pantalla para esto. `api-008` cubre imágenes de noticias y eventos que sube el personal, no peticiones de visitantes. Este documento es un borrador prematuro: el alcance se va a recortar cuando el flujo se defina mejor. No autoriza plan, tasks ni código.

## Objetivos

- Guardar una petición de imagen por visitante con sesión verificada, con un estado explícito.
- Dejar que `admin` y `zoo-admin` la acepten o la rechacen.
- No publicar la imagen en el portal como efecto de la aceptación.

## Fuera de alcance

- Implementar endpoints, pantallas, almacenamiento o migraciones a partir de este borrador.
- La spec de revisión en el dashboard. Se nombra como trabajo futuro; su interfaz aún no está definida.
- Mostrar la imagen aceptada en `apps/web` o sustituir las fotos fijas de «Momentos para recordar».
- Varias imágenes por petición, álbumes, comentarios públicos y recorte en el servidor.
- La app móvil no decide aquí su navegación: eso vive en `mobile-010`.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante con correo verificado | Enviar una imagen y consultar el estado de su petición | Sesión Bearer `visitor` |
| `admin` (Presidencia) | Aceptar o rechazar peticiones | Por definir: permiso nuevo o uno de contenido ya existente |
| `zoo-admin` (Dirección) | Lo mismo que `admin` para estas peticiones | El mismo permiso, cuando se defina |
| `executive`, `cashier`, `veterinarian` | Sin revisión | — |
| Responsable de BD | Aplicar la DBR que acompañe la spec aprobada | Flujo DBR |

## Historias de usuario

- Como visitante, quiero pedir que una foto mía del zoológico se publique, para compartir un momento sin que aparezca hasta que alguien del zoológico la revise.
- Como `admin` o `zoo-admin`, quiero aceptar o rechazar esa petición, para que en la galería solo entre lo que el zoológico autorice.

## Criterios de aceptación

Provisionales. No son contrato hasta la aprobación.

- **CA-01:** Dado un visitante con correo verificado y un archivo JPG, PNG o WebP de hasta 5 MB, cuando envía la petición, entonces la API responde 201, guarda la imagen fuera del portal público y deja la petición en `submitted`.
- **CA-02:** Dado un archivo de otro tipo o de más de 5 MB, o un visitante sin sesión o sin correo verificado, cuando intenta enviar, entonces la API responde 422 o 401/403 en español y no guarda archivo ni petición.
- **CA-03:** Dado el visitante dueño, cuando consulta sus peticiones, entonces ve estado, fecha y, si se define así, el motivo de rechazo. No ve peticiones de otras cuentas.
- **CA-04:** Dado `admin` o `zoo-admin`, cuando acepta una petición, entonces el estado pasa a `accepted`. Cuando la rechaza, pasa a `rejected`. Otro rol recibe 403 y la petición no cambia.
- **CA-05:** Dada una petición `accepted`, cuando alguien consulta el catálogo público o el portal, entonces esa imagen no aparece ahí por esta spec.
- **CA-06:** Dado el código de la API, cuando se revise, entonces la regla vive en Actions y el controlador es delgado. No hay migración en este borrador.

## Reglas de negocio

- **RN-01:** Los estados persistidos son `submitted` (enviada), `in_review` (en proceso), `accepted` (aceptada) y `rejected` (rechazada). La interfaz los muestra en español.
- **RN-02:** Solo `admin` y `zoo-admin` cambian el estado a aceptada o rechazada. El visitante no publica ni se autoacepta.
- **RN-03:** Aceptar no publica la imagen en el portal. La publicación, si llega, será otra spec.
- **RN-04:** El formato de archivo queda copiado de `api-008` como propuesta: JPG, PNG o WebP, máximo 5 MB, una imagen por petición. Se puede cambiar al aprobar.
- **RN-05:** El esquema nuevo exige una DBR aprobada y en `Lista para backend` antes de cualquier migración. Este borrador no la sustituye ni la crea.
- **RN-06:** Identificadores y estados en inglés; mensajes al visitante y al personal en español.

## Datos, privacidad y auditoría

La petición guarda el visitante que la envía, el estado, la ruta del archivo y marcas de tiempo. La imagen puede mostrar personas, incluidos menores, dentro del zoológico: es dato personal y no clínico ni financiero. Hace falta decidir consentimiento, quién puede aparecer y cuánto se conservan las rechazadas.

Cuando se apruebe, el modelo de negocio sigue la Constitución V (SoftDeletes), salvo que el derecho de supresión de la cuenta del visitante obligue a borrar también su archivo. Esa decisión queda abierta. La revisión debe quedar auditada (quién aceptó o rechazó, y cuándo), sin guardar el binario en la bitácora.

No hay DBR todavía. La que se abra acompañará a esta spec y no la sustituye.

## Flujos y errores

1. El visitante con sesión verificada elige una imagen en la app (`mobile-010`) y la envía.
2. La petición nace en `submitted`.
3. Alguien del zoológico la pasa a `in_review` — el disparador exacto no está definido.
4. `admin` o `zoo-admin` la acepta o la rechaza.
5. El visitante consulta el estado. La imagen aceptada no sale en el portal.

Errores previstos: sin sesión, correo sin verificar, archivo inválido, petición de otra cuenta y rol sin permiso. Los textos en español se cierran al aprobar.

## Dependencias, riesgos y preguntas

- Dependencias/ADR: `api-004` (sesión del visitante), `api-007` (roles `admin` y `zoo-admin`), `api-008` (referencia de tipo y tamaño de imagen, no el mismo flujo). `mobile-010` describe el área de la app. El dashboard tendrá su propia spec cuando se defina la revisión. Una imagen en disco local no pide ADR; un almacenamiento externo sí.
- Riesgos: fotos de menores sin regla de consentimiento; archivos huérfanos si se borra la cuenta; confundir «aceptada» con «publicada».
- Preguntas pendientes:
  1. ¿Qué acción pasa la petición de `submitted` a `in_review`: abrirla un revisor, asignarla, o un paso automático?
  2. ¿El visitante ve un motivo cuando la petición se rechaza?
  3. ¿Hace falta un permiso nuevo o se reutiliza `news.manage` / `events.manage`?
  4. ¿Se permiten fotos donde aparezcan personas, y en particular menores? ¿Qué texto de consentimiento acompaña el envío?
  5. ¿Cuánto tiempo se conservan la imagen y la fila si se rechaza, y qué pasa con ellas al borrar la cuenta del visitante?
  6. ¿La petición lleva título o texto, o solo la imagen?

## Revisión

- Aprobadores y fecha: pendiente. Borrador prematuro pedido por Aksel el 2026-11-05 para ajustarlo cuando el flujo se defina.
- Evidencia/enlaces: `apps/web/src/index.html` (sección `#galeria`, «Momentos para recordar»), `apps/mobile/specs/010-visitor-memory-requests.md`, `apps/api/specs/008-event-news-images.md`.
