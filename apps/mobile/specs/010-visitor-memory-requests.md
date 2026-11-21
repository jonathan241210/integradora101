# 010 · visitor-memory-requests

- App dueña: `mobile`
- Apps/paquetes afectados: `mobile` (envío, corrección y reenvío, y «Mis memorias», pantallas y ViewModels nuevos); `packages/api-client` (métodos y tipos del visitante para peticiones, sin lógica de negocio); `api` (contrato y reglas en `api-010`, dueña de estados, límites, archivo, publicación y vigencia); `dashboard` (revisión, `dashboard-008`); `web` (galería pública, `web-010`).
- Estado: En progreso
- Solicitante / responsable funcional: Aksel
- Aprobación funcional: Aksel, 2026-11-14 (alcance, CA y RN, incluidas las tres decisiones de esa fecha)
- Dependencias de contrato: `api-010` (Aprobada el 2026-11-12; En progreso), DBR-012 (Lista para backend, aplicada en `arca_pruebas` el 2026-11-11) y ADR 0030 (Aceptado, Aksel, 2026-11-14). Plan: `apps/mobile/plan/010-visitor-memory-requests.md` (Aprobado, Aksel, 2026-11-14).
- Entrada: una sección dentro de Perfil. Sin pestaña nueva.

## Problema y contexto

La app del visitante no tiene forma de pedir que una foto entre en «Momentos para recordar» del portal. Las pestañas actuales son Inicio, Mapa, Escanear, Colección y Perfil. No hay pantalla, selector de imagen ni llamada de envío.

Esta spec describe lo que el visitante ve y hace en la app: desde Perfil, elegir una imagen de la galería del teléfono, escribir una opinión corta si quiere, confirmar el consentimiento, enviar la petición, consultar el estado de sus peticiones y, si fue rechazada, corregir lo que el zoológico señaló y reenviarla. La decisión la toma el zoológico en el dashboard (`api-010`, `dashboard-008`). La app no acepta ni rechaza nada, y nunca presenta una foto como publicada si la API no la ha aceptado y vigente.

La foto la guarda la API en `apps/api/src/media/memories/` (`api-013`, ADR 0026). La app no escribe en esa carpeta. El portal lee la URL pública solo cuando el momento está aceptado y vigente (`web-010`).

## Decisiones tomadas (2026-11-10)

- **Una imagen y una opinión** por petición. Imagen JPG, PNG o WebP de máximo 5 MB. La opinión, si se envía, tiene de 1 a 300 caracteres (`api-010` RN-05, RN-06).
- **Casilla de consentimiento obligatoria** en cada envío y en cada reenvío. Su texto completo, con la referencia a los términos y condiciones, lo aprueba el zoológico (`api-010` RN-08, RN-23).
- **Estados en español:** Enviada, En proceso, Aceptada y Rechazada.
- **Límite semanal:** la app muestra desde qué fecha y hora puede enviar otra memoria (una memoria por semana), con el texto que llega en la respuesta de la lista o en el error 429 (CA-14).
- **Una petición abierta a la vez:** si hay una abierta, el formulario de envío no se ofrece para una nueva (CA-15).
- **Rechazo con motivos:** el motivo se muestra con los campos marcados por `zoo-admin` (`image` y/o `content`). En el formulario de corrección, la app resalta lo marcado y muestra el mensaje del admin (CA-07, CA-16, CA-17).
- **Corrección y reenvío:** una rechazada se corrige y se reenvía la misma petición. La app no crea una petición nueva (CA-16, CA-18).
- **Plazo de publicación:** al ver una petición aceptada, la app dice hasta qué fecha estará publicada, o que la publicación ya venció (CA-08).
- **Aceptada significa publicada durante un plazo.**
- **Borrado de cuenta:** la elección de conservar o eliminar los momentos se pide en el flujo de borrado de cuenta. Esa pantalla pertenece a `mobile-004` y no se modifica aquí.
- Fuera de alcance: cancelar peticiones, editarlas después del envío (salvo el reenvío de una rechazada) y la cola offline.

## Decisiones tomadas (2026-11-14)

Aksel, responsable funcional de la app:

- **Entrada:** una sección «Mis memorias» dentro de Perfil. No se añade una pestaña a la barra inferior ni un acceso en Inicio.
- **Foto:** se elige de la galería del teléfono con `expo-image-picker`. El ADR 0030 quedó Aceptado por Aksel el 2026-11-14. La dependencia se instala en la implementación, no con esta aprobación, y no se abre la cámara.
- **Opinión:** opcional, igual que la API (`api-010` RN-06, decisión del 2026-11-11). Se puede enviar la foto sin texto. Si hay texto, tiene de 1 a 300 caracteres.

## Decisiones tomadas (2026-11-15)

Aksel, responsable funcional de la app:

- **Estado al día:** cada vez que se abre «Mis memorias», y al volver a la app con esa pantalla abierta, se vuelve a pedir la lista. El estado que cambió el zoológico se ve sin cerrar el proceso. No es un canal en vivo mientras la pantalla se queda quieta en primer plano.
- **Una sola entrada al alta:** con una petición abierta no se ofrece «Enviar un momento». Enmienda de Aksel, 2026-11-17: la lista ya no muestra el recuadro «Ya tienes una petición abierta.». La petición enviada se abre en una ficha de solo lectura, con lo enviado y su estado, sin campos ni botón de envío. Una rechazada sigue abriendo la corrección.
- **Corrección con confirmación:** al terminar la corrección, la app pregunta «¿Seguro que quieres enviar la corrección?». Cancelar deja el formulario. Confirmar reenvía y, al responder 200, vuelve a «Mis memorias». El formulario no se queda abierto, así que no se puede seguir modificando esa revisión.

## Decisiones tomadas (2026-11-18)

- **Aviso de momento:** el toque abre `/memory-form` con el id. Si esa petición no está en la copia en memoria, la ruta pide la lista una vez y muestra «Buscando tu memoria…». No declara que falta antes de esa lectura. Si la lista la trae, se ve la ficha o la corrección. Si no, la pantalla «Tu memoria» explica que no está en la cuenta, o pide reintentar si la lectura falló. Después de esa lectura, motivo y plazo salen de la copia cargada (CA-18).

## Objetivos

- Ofrecer, desde Perfil, un lugar para elegir la imagen, escribir la opinión si se quiere, dar el consentimiento y enviar la petición.
- Mostrar al visitante el estado de sus peticiones en español, con el motivo y los campos a corregir cuando fue rechazada.
- Permitir la corrección y el reenvío de una rechazada, resaltando lo que hay que cambiar.
- Mostrar cuándo puede enviar otra memoria y hasta cuándo está publicada una foto aceptada.
- No prometer publicación al enviar ni guardar copias de la foto como si ya estuviera publicada.

## Fuera de alcance

- Cancelar o editar una petición, salvo el reenvío de una rechazada (`api-010` RN-19).
- Cola offline o reintento automático sin red.
- Varias imágenes por petición.
- Captura directa con la cámara dentro de la app. Solo se elige un archivo de la galería del teléfono.
- La revisión de `zoo-admin` y la publicación: `dashboard-008` y `api-010`.
- La galería del portal: `web-010`.
- Una pestaña nueva o un acceso desde Inicio.
- Instalar `expo-image-picker` antes de las tasks de este plan.
- El push de aceptación o de rechazo en la barra del sistema: `mobile-013` y `api-017`. Esta spec no lo envía. El vencimiento no genera push. La app muestra el estado cuando se abre.
- La pantalla de borrado de cuenta y su elección: `mobile-004` (divergencia pendiente).

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante con correo verificado | Enviar una petición, ver sus peticiones y su estado, corregir y reenviar una rechazada | Sesión de visitante de `mobile-004`; permiso de galería del dispositivo solicitado en el momento de elegir la imagen |
| Visitante sin sesión o con correo sin verificar | No envía; ve el aviso de cuenta confirmada | — |
| `zoo-admin` y `admin` | Revisan en el dashboard, no en esta app | Fuera de esta spec (`dashboard-008`) |

## Historias de usuario

- Como visitante, quiero enviar una foto de mi visita, con una opinión corta si quiero, para que el zoológico decida si entra en «Momentos para recordar».
- Como visitante, quiero ver si mi petición está enviada, en proceso, aceptada o rechazada, para no pensar que ya está publicada cuando no lo está.
- Como visitante cuya petición fue rechazada, quiero leer el motivo y ver qué hay que cambiar, para corregirlo y reenviarlo sin empezar de cero.
- Como visitante, quiero saber hasta cuándo estará publicada mi foto y desde cuándo puedo enviar otra.

## Criterios de aceptación

- **CA-01 (acceso desde Perfil):** Dada la app con sesión y correo verificado, cuando el visitante abre Perfil y pulsa «Mis memorias», entonces entra al módulo, donde puede elegir una imagen de la galería, escribir su opinión si quiere, marcar el consentimiento y enviar. La app pide permiso de galería solo al elegir la imagen. No aparece una pestaña nueva. Enmienda de Aksel, 2026-11-17: el título de la sección es «Mis memorias».
- **CA-02 (formulario):** Dado el formulario de envío, cuando se muestra, entonces tiene un control para elegir la imagen de la galería, un campo de opinión opcional con contador de caracteres (máximo 300, anunciado a lectores de pantalla), la casilla de consentimiento con su texto completo (RN-07) y el botón «Enviar petición». El botón está desactivado mientras falten la imagen o el consentimiento, o mientras haya un bloqueo de CA-14 o CA-15. Una opinión vacía deja el botón activo si la imagen y el consentimiento ya están.
- **CA-03 (validación local como ayuda):** Dado un archivo que no es JPG, PNG o WebP, que pesa más de 5 MB, o una opinión de más de 300 caracteres, cuando se elige o se escribe, entonces la app avisa en español y no llama a la API. La opinión vacía no es un error. La API valida igualmente (`api-010` CA-02, CA-03).
- **CA-04 (envío correcto):** Dado un envío que responde 201, cuando llega la respuesta, entonces la app muestra la petición como «Enviada» con el texto «Tu petición se envió. El zoológico la revisará; todavía no está publicada.». No dice que la foto ya está en el portal.
- **CA-05 (envío único):** Dado un envío en curso, cuando el visitante toca de nuevo «Enviar petición», entonces no se lanza otra petición. Mientras espera, un indicador tapa la pantalla, igual que en `mobile-004` CA-05.
- **CA-06 (estados de la lista):** Dada la lista «Mis memorias», cuando se muestra, entonces cada petición aparece con su estado en español: Enviada, En proceso, Aceptada o Rechazada. Solo muestra peticiones de la cuenta activa. La lista se pide con `GET /api/v1/visitor/memories` (`api-010` CA-06) cada vez que se abre la pantalla y cuando la app vuelve a primer plano con esa pantalla abierta, aunque ya hubiera una copia en memoria. Una Enviada incluye el texto de CA-04.
- **CA-07 (motivo y campos a corregir):** Dada una petición Rechazada, cuando se muestra, entonces incluye el motivo que devolvió la API, como texto, con la etiqueta «Motivo». Además, lista lo marcado con textos en español: «La foto no cumple lo indicado» si `rejected_fields` incluye `image`, y «La opinión necesita cambios» si incluye `content`. El texto va junto al icono o a la etiqueta, no solo en color (CA-12).
- **CA-08 (aceptada y su plazo):** Dada una petición Aceptada con `is_published` verdadero, cuando se muestra, entonces dice «Publicada en «Momentos para recordar» del portal hasta el {fecha}.». Dada una petición Aceptada con `is_published` falso, cuando se muestra, entonces dice «La publicación terminó el {fecha}. Ya no se muestra en el portal.». La app no muestra la foto como publicada si la API no la marca como aceptada y vigente. Las fechas se muestran en la zona horaria de la API (`api-010` CA-06).
- **CA-09 (errores):** Dada una respuesta de error, cuando llega, entonces:
  - 422 muestra el mensaje junto al campo (imagen, opinión o consentimiento);
  - 422 `open_request` y 429 `weekly_limit_reached` muestran el texto de CA-14 o CA-15;
  - 401 o 403 `email_not_verified` lleva a la pantalla de verificación de `mobile-004`;
  - 403 sin permiso y 404 muestran un mensaje en español;
  - 413 o 415 muestran el mensaje de tamaño o formato.

  Ningún error dice que la petición se guardó.
- **CA-10 (sin red):** Dado un envío o un reenvío sin conexión, cuando se intenta, entonces la app muestra «Sin conexión», no guarda la imagen ni la encola y no dice que la petición se envió.
- **CA-11 (MVVM):** Dada la implementación, cuando se revisa, entonces las pantallas no llaman a la red: usan un hook ViewModel que llama a `@arca/api-client` (modo Bearer, `mobile-004` CA-12). Ningún componente usa `fetch` ni `axios`, y ningún token sale del almacenamiento seguro.
- **CA-12 (accesibilidad):** Dado el módulo, cuando se usa con lector de pantalla, entonces los controles tienen nombre en español, el estado de envío, los errores, el límite semanal y los campos a corregir se anuncian, el consentimiento se activa con un toque y se anuncia su estado, y lo marcado en una rechazada se distingue por texto y no solo por color.
- **CA-13 (pruebas):** Dada la suite de Jest, cuando se ejecuta, entonces existe al menos una prueba que nombra cada CA-01 a CA-18 con el cliente simulado, y se cumple la cobertura mínima de `mobile-011`.
- **CA-14 (límite semanal visible):** Dado que la lista del visitante trae `meta.can_submit` falso y `meta.next_submission_at` (o que un envío responde 429 con esa fecha), cuando se abre el formulario, entonces muestra en texto «Podrás enviar otra memoria a partir del {fecha y hora}.», desactiva «Enviar petición» y no ofrece el formulario hasta esa hora. Si el reloj del teléfono no coincide con el servidor, la API decide: un 429 se muestra con el mismo texto (`api-010` CA-23).
- **CA-15 (petición abierta):** Dado que la lista trae `meta.open_request_id` no nulo, cuando se muestra «Mis memorias», entonces no aparece el recuadro «Ya tienes una petición abierta.» ni «Enviar un momento». Al pulsar la petición, se ve lo enviado y el estado, sin campos de edición ni «Enviar petición». Un envío que responde 422 `open_request` sigue mostrando «Ya tienes una petición abierta.» junto al intento (`api-010` CA-24). Tras un envío o un reenvío correcto, la copia local marca esa petición como abierta para que «Enviar un momento» no vuelva a aparecer. Una rechazada sigue abriendo la corrección. Enmienda de Aksel, 2026-11-17.
- **CA-16 (corrección de rechazada):** Dada una petición Rechazada, cuando el visitante pulsa «Corregir y reenviar», entonces la app abre el formulario precargado con su opinión (vacío si no tenía), muestra el motivo (CA-07), resalta cada campo de `rejected_fields` con un texto («Cambia la foto: el zoológico no la aceptó.» si incluye `image`; «Cambia la opinión: el zoológico pide otro texto.» si incluye `content`) y el envío llama `POST /api/v1/visitor/memories/{id}/resubmit`. El consentimiento vuelve a pedirse. Al pulsar «Enviar petición» la app pregunta «¿Seguro que quieres enviar la corrección?» y no llama al reenvío hasta «Sí, enviar». «Cancelar» cierra la pregunta y deja el formulario. Un reenvío con 200 muestra la petición como «Enviada» con el texto de CA-04, quita los campos y vuelve a «Mis memorias».
- **CA-17 (validación de la corrección):** Dada una corrección cuyo motivo incluye `image`, cuando el visitante no elige una foto nueva, entonces la app no envía y pide elegir otra foto (ayuda local). Dada una corrección cuyo motivo incluye `content`, cuando la opinión es igual a la anterior (sin contar espacios al inicio y al final), entonces la app desactiva el envío y pide cambiarla (ayuda local). Si la opinión anterior era vacía y el motivo incluye `content`, hace falta un texto de 1 a 300 caracteres. Si la API responde 422 en `errors.image` u `errors.opinion`, el mensaje aparece junto al campo. La API decide (`api-010` CA-27).
- **CA-18 (plazo y reenvío sin consulta extra):** Dado que la app ya tiene la lista (CA-06), cuando el visitante llega a «Corregir y reenviar» o a la fecha de una aceptada, entonces la app usa los datos de esa lista y no pide otra vez la lista para mostrar el motivo, los campos o el plazo. Después de un envío o un reenvío correcto, la lista se actualiza con la respuesta. Enmienda 2026-11-18: si `/memory-form` se abre con un id que aún no está en memoria, pide la lista una vez antes de decidir que falta.

## Reglas de negocio

- **RN-01 (la app no decide):** La app no acepta ni rechaza. Esas decisiones son de `zoo-admin` (`api-010`). La app tampoco decide si un envío está permitido: muestra lo que devuelve la API (CA-14, CA-15).
- **RN-02 (estados):** Los estados son los de `api-010` RN-01: `submitted` (Enviada), `in_review` (En proceso), `accepted` (Aceptada) y `rejected` (Rechazada). La app los traduce; no los calcula.
- **RN-03 (aceptada es publicada durante un plazo):** Aceptada significa publicada en el portal hasta `published_until`. Una petición que no está aceptada, o cuya publicación venció, nunca se presenta como publicada (CA-08).
- **RN-04 (formato y opinión):** JPG, PNG o WebP, máximo 5 MB, una imagen de la galería (`api-010` RN-05). La opinión es opcional; si se escribe, tiene de 1 a 300 caracteres y la vacía se envía como ausencia de texto (`api-010` RN-06). La validación local es ayuda; la API decide.
- **RN-05 (sin simulación):** Sin `EXPO_PUBLIC_API_URL` no hay envío real. La app no simula ni publica.
- **RN-06 (sin cola offline):** Sin red no se encola la imagen ni la petición. Se muestra «Sin conexión» (CA-10).
- **RN-07 (consentimiento):** La casilla es obligatoria en cada envío y en cada reenvío. Su texto es el de `api-010` RN-08: «Confirmo que tengo permiso de las personas que aparecen en la foto y, si hay menores, de sus madres, padres o tutores, y que acepto los términos y condiciones de «Momentos para recordar».» Ese texto es de referencia hasta que lo apruebe el zoológico. Hasta esa aprobación, la app no se publica con el texto de referencia.
- **RN-08 (permiso del dispositivo):** El acceso a la galería se pide explícitamente y solo al elegir la imagen. La app no abre la cámara, no lee la galería completa y no guarda copias permanentes de la foto.
- **RN-09 (textos):** Textos de la interfaz en español; identificadores, rutas y campos en inglés.
- **RN-10 (selector):** Elegir la foto usa `expo-image-picker`, autorizado por el ADR 0030 (Aceptado, Aksel, 2026-11-14). Se instala en la implementación. El ADR 0004 no cubre este selector.
- **RN-11 (límite y textos desde la API):** La fecha de «puedes enviar otro» y el estado de la petición abierta vienen de la API (`meta` de la lista o el error 429). La app no calcula la ventana de 7 días (`api-010` RN-17, RN-18).
- **RN-12 (corrección):** La app no inventa campos. Lo que resalta viene de `rejected_fields`. Un reenvío siempre es la misma petición (`api-010` RN-19).
- **RN-13 (plazo de la foto):** La app muestra `published_until` y `is_published` tal como llegan. No calcula el plazo ni decide cuándo termina.
- **RN-14 (sin imagen en la lista):** «Mis memorias» no muestra la foto. La API no entrega URL de la imagen al visitante (`api-013`). La corrección de la foto usa un archivo nuevo elegido en el teléfono.
- **RN-15 (una edición por revisión):** El formulario de alta no se ofrece si hay una petición abierta. La corrección solo se abre si el estado es Rechazada. Confirmar el reenvío cierra el formulario y regresa a la lista. Hasta que el zoológico la rechace de nuevo, esa petición no vuelve a mostrar campos editables (CA-15, CA-16).

## Datos, privacidad y auditoría

- La app envía la imagen, la opinión si existe, el consentimiento y el token por HTTPS. El token vive solo en el almacenamiento seguro (`mobile-004`).
- La foto puede mostrar personas, incluidos menores. La app no la publica ni la muestra fuera de «Mis memorias», y dentro de «Mis memorias» no muestra el archivo (RN-14). Los metadatos (ubicación, por ejemplo) los quita la API (`api-010` RN-05) al guardar en `media/memories/`.
- La app no escribe bitácora de revisión; la auditoría es de la API.
- No requiere DBR propia. La tabla y los campos los pide `api-010` a través de DBR-012.

## Flujos y errores

1. El visitante abre Perfil y pulsa «Mis memorias» (CA-01).
2. Si `meta.can_submit` es falso o hay petición abierta, el formulario muestra el texto de CA-14 o CA-15 y no ofrece el envío.
3. Elige una imagen de la galería; la app valida tipo y tamaño como ayuda (CA-03). La opinión puede quedar vacía.
4. Marca el consentimiento y pulsa «Enviar petición» (CA-02, CA-05).
5. Con red y sesión válida, la API responde 201, la app vuelve a «Mis memorias» y muestra «Enviada» (CA-04, CA-15).
6. En «Mis memorias», la lista muestra el estado recién pedido (CA-06). Si la petición fue rechazada, muestra el motivo y los campos marcados (CA-07) y el botón «Corregir y reenviar» (CA-16). Si fue aceptada, muestra su plazo (CA-08).
7. Corrección: el formulario precargado resalta lo marcado (CA-16), la app valida lo que puede (CA-17), pide confirmación y reenvía con `POST .../resubmit`. Un 200 vuelve a la lista y muestra «Enviada» (CA-16, RN-15).
8. Sin red: «Sin conexión» (CA-10). Sin sesión o con correo sin verificar: la app no envía y explica que hace falta una cuenta confirmada (CA-09).

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:**
  - `api-010` (contrato de envío, reenvío y lista; Aprobada, En progreso).
  - `mobile-004` (sesión, correo verificado, refresh, almacenamiento seguro y pantalla de borrado de cuenta; Implementada).
  - `api-004`: `DELETE /api/v1/visitor/me` necesita el parámetro `memories_policy` (`keep` o `delete`), que pide esta app cuando el visitante tiene peticiones. **Divergencia pendiente:** no se modifica ni `api-004` ni `mobile-004` desde esta spec (`api-010` pregunta 5). La elección de borrado y el aviso de `api-010` deben integrarse en esa pantalla cuando se autorice.
  - ADR 0004 (Expo y React Native). No autoriza el selector de imágenes.
  - ADR 0030 (Aceptado, Aksel, 2026-11-14): `expo-image-picker` para elegir de la galería. Se instala en la implementación.
  - ADR 0026 y `api-013`: la API guarda el archivo en `media/memories/`. La app no toca esa carpeta.
- **Riesgos:**
  - Prometer publicación al enviar: se evita con los textos de CA-04.
  - Confundir «aceptada» con «vigente»: se evita con CA-08.
  - Visitante que no corrige una rechazada: queda bloqueado para nuevos envíos (`api-010` RN-18).
  - Consentimiento mal entendido por el visitante: se mitiga con el texto completo visible (CA-02).
  - Texto de referencia del consentimiento publicado antes de su aprobación por el zoológico (`api-010` RN-23). La app no se publica con ese texto hasta entonces (RN-07).
  - Instalar el selector antes de las tasks.
  - Reloj del teléfono distinto del servidor: la API decide (CA-14).
- **Preguntas pendientes:** ninguna de producto. El texto definitivo de la casilla y de los términos lo redacta el zoológico; hasta entonces se usa el de referencia y no se publica (RN-07).

## Revisión

- Aprobación funcional: Aksel, 2026-11-14. Alcance, CA y RN.
- Historial: borrador del 2026-11-05 → revisión del 2026-11-10 con las respuestas de Jonathan → aprobación funcional del 2026-11-14 (entrada en Perfil, galería, opinión opcional) → el mismo día, ADR 0030 Aceptado, plan aprobado y tasks aprobadas por Aksel → implementación el 2026-11-14. La suite `visitor-memories` quedó en verde. Enmienda del 2026-11-15 (Aksel): la lista se vuelve a pedir al abrirla, el alta no se abre con una petición pendiente y la corrección pide confirmación antes de volver a la lista. Aksel confirmó el 2026-11-20 la verificación y el pull (T-29). No pasa a Implementada: el zoológico aún no redacta el texto de la casilla (RN-07).
- Evidencia/enlaces: `apps/api/specs/010-visitor-memory-requests.md`, `apps/api/specs/012-public-memories-read.md`, `apps/api/specs/013-object-storage-images.md`, `apps/mobile/specs/004-visitor-account.md`, `apps/mobile/specs/013-visitor-push-notifications.md`, `docs/adr/0004-mobile-react-native.md`, `docs/adr/0026-object-storage-s3-images.md`, `docs/adr/0030-expo-image-picker-visitor-memories.md`, `apps/dashboard/specs/008-memory-moderation.md`, `apps/web/specs/010-dynamic-memories.md`, `docs/database/requests/DBR-012-visitor-memories.md`.
