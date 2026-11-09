# 010 · visitor-memory-requests

- App dueña: `mobile`
- Apps/paquetes afectados: `mobile` (área nueva del visitante), `api` (estados y archivo; spec `api-010`), `dashboard` (revisión; spec futura, no se redacta ahora)
- Estado: Borrador
- Solicitante / responsable funcional: Aksel
- Aprobación funcional: pendiente

## Problema y contexto

La app del visitante no tiene módulo para pedir que una foto entre en «Momentos para recordar». Las pestañas actuales son Inicio, Mapa, Escanear, Colección y Perfil. No hay ruta, pantalla ni selector de imagen. El portal solo muestra tres fotos fijas y no recibe subidas.

El visitante debe poder lanzar una petición desde el teléfono. El administrador general y el administrador del zoológico la revisan en el dashboard, en una spec que todavía no se escribe. La API, en `api-010`, es la dueña de los estados y del archivo. Este documento solo describe el hueco de la app y el comportamiento que se espera ver. Es un borrador prematuro: no autoriza plan, tasks ni código, y se va a modificar cuando se defina mejor el flujo.

## Objetivos

- Ofrecer en la app un lugar para elegir una imagen y enviar la petición.
- Mostrar al visitante el estado de sus peticiones en español: enviada, en proceso, aceptada y rechazada.
- No publicar la foto en el teléfono ni afirmar que ya está en el portal.

## Fuera de alcance

- Implementar pantallas, navegación, selector de imagen o llamadas de red a partir de este borrador.
- Decidir ya si el módulo es una pestaña nueva o una pantalla dentro de Perfil.
- La revisión de `admin` y `zoo-admin`. Queda nombrada como spec futura del dashboard.
- Cambiar la galería de `apps/web`.
- Elegir una librería de cámara o galería. Si hace falta una dependencia nueva, esperará un ADR cuando la spec se apruebe.
- Cola offline. Hasta que se diga lo contrario, sin red no se encola la imagen.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante con correo verificado | Elegir una imagen, enviarla y ver el estado | Sesión de la app |
| Visitante sin sesión o sin correo verificado | No envía | — |
| `admin` y `zoo-admin` | Revisar en el dashboard, no en esta app | Spec futura |

## Historias de usuario

- Como visitante, quiero pedir desde la app que suban una foto de mi visita, para que el zoológico decida si entra en los momentos para recordar.
- Como visitante, quiero ver si mi petición sigue enviada, en proceso, aceptada o rechazada, para no pensar que ya se publicó.

## Criterios de aceptación

Provisionales. No son contrato hasta la aprobación.

- **CA-01:** Dada la app con sesión y correo verificado, cuando el visitante abre el módulo de memorias, entonces puede elegir una imagen y enviar la petición. La app no dice que la foto ya está publicada.
- **CA-02:** Dado un envío aceptado por la API, cuando la app recibe 201, entonces muestra la petición como «Enviada».
- **CA-03:** Dadas las peticiones del visitante, cuando las consulta, entonces cada una muestra su estado en español: Enviada, En proceso, Aceptada o Rechazada. No muestra peticiones de otra cuenta.
- **CA-04:** Dado un archivo que la API rechaza, o la falta de sesión, o la falta de red, cuando el visitante intenta enviar, entonces la app muestra un mensaje en español y no afirma que la petición se guardó.
- **CA-05:** Dado el código de la app, cuando se revise, entonces se cumple MVVM: la pantalla no llama a la red por su cuenta y usa `@arca/api-client`. Este borrador no crea esa pantalla.

## Reglas de negocio

- **RN-01:** La app no acepta ni rechaza. Esos pasos son de `admin` y `zoo-admin`, fuera de esta spec.
- **RN-02:** Los estados que muestra son los de `api-010`: `submitted` (Enviada), `in_review` (En proceso), `accepted` (Aceptada) y `rejected` (Rechazada).
- **RN-03:** Una petición aceptada no se presenta como foto ya visible en el portal.
- **RN-04:** El formato que la app anticipa, igual que la propuesta de `api-010`, es JPG, PNG o WebP de hasta 5 MB y una imagen por petición. La API sigue siendo quien valida.
- **RN-05:** Sin `EXPO_PUBLIC_API_URL` no hay envío real. No se simula una publicación.
- **RN-06:** Textos de la interfaz en español; identificadores en inglés.

## Datos, privacidad y auditoría

La app envía la imagen y la sesión por HTTPS y no guarda una copia permanente de la foto en el teléfono como publicación. La imagen puede mostrar personas, incluidos menores. El texto de consentimiento, si hace falta, lo definirá la spec aprobada junto con `api-010`. La app no escribe la bitácora de la revisión.

No requiere DBR propia. La tabla y el archivo los pide `api-010` cuando deje de ser borrador.

## Flujos y errores

1. El visitante entra al módulo — el lugar de la app está sin decidir.
2. Elige una imagen y confirma el envío.
3. Con red y sesión válida, la API crea la petición y la app muestra «Enviada».
4. Más tarde, la lista refleja En proceso, Aceptada o Rechazada según `api-010`.
5. Sin red: mensaje «Sin conexión» y la imagen no se encola.
6. Sin sesión, o con correo sin verificar: la app no envía y explica que hace falta una cuenta confirmada.

## Dependencias, riesgos y preguntas

- Dependencias/ADR: `api-010` (borrador del contrato), `mobile-004` (sesión). Un selector de imágenes nuevo necesita ADR si no está cubierto por el ADR 0004. La spec del dashboard se escribirá cuando se defina la revisión.
- Riesgos: prometer publicación al enviar; elegir una pestaña de más antes de saber si el módulo vive en Perfil; depender de una librería que aún no tiene ADR.
- Preguntas pendientes:
  1. ¿El módulo es una pestaña, una entrada en Perfil u otra pantalla?
  2. ¿El visitante ve el motivo del rechazo?
  3. ¿La petición lleva un texto además de la imagen?
  4. ¿Qué se le dice sobre fotos de otras personas, sobre todo menores, antes de enviar?
  5. ¿Puede cancelar una petición que sigue enviada?

## Revisión

- Aprobadores y fecha: pendiente. Borrador prematuro pedido por Aksel el 2026-11-05 para ajustarlo cuando el flujo se defina.
- Evidencia/enlaces: `apps/api/specs/010-visitor-memory-requests.md`, `apps/mobile/src/app/(tabs)/_layout.tsx`, `apps/web/src/index.html` (sección `#galeria`).
