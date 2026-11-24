# Plan técnico · 010 · visitor-memory-requests

- Spec: `apps/mobile/specs/010-visitor-memory-requests.md`
- Estado de spec: Implementada
- Solicitada: 2026-11-14
- Aprobada: 2026-11-14
- Estado del plan: Aprobado. Tasks aprobadas. Con el ADR 0030 aceptado, la implementación puede instalar `expo-image-picker`.
- Responsable técnico: Frontend
- Dependencias: `api-010` (Aprobada, En progreso; envío, lista y reenvío ya están en la API), DBR-012 (Lista para backend), ADR 0030 (Aceptado)

## Diseño de solución

El visitante entra desde Perfil a «Mis memorias». Ahí ve sus peticiones y, si la API lo permite, abre el formulario. La API decide el estado, el límite semanal, la petición abierta, el motivo y el plazo. La app traduce y no guarda la foto.

MVVM se mantiene: las pantallas reciben props; un hook pide la lista y otro envía o reenvía. La red pasa por `@arca/api-client` en modo Bearer. No hay pestaña nueva.

El ADR 0030 está Aceptado. `expo-image-picker` se instala en el corte de implementación, junto con las tasks, y no antes.

```text
Perfil (View)
  → «Mis memorias»
      → useVisitorMemories (ViewModel)
          → @arca/api-client GET /visitor/memories
      → formulario
          → useMemoryForm (ViewModel)
              → selector de galería (expo-image-picker, tras el ADR)
              → POST /visitor/memories o POST /visitor/memories/{id}/resubmit
```

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Paquete | `packages/api-client/visitor.ts` | `listVisitorMemories`, `submitVisitorMemory`, `resubmitVisitorMemory`. Tipos en inglés. Sin reglas de plazo ni de límite |
| Perfil | `apps/mobile/src/screens/ProfileScreen.tsx` y `apps/mobile/src/app/(tabs)/profile.tsx` | Una fila «Mis memorias» que abre la lista. El resto del perfil se queda |
| Lista | `apps/mobile/src/screens/MemoriesScreen.tsx` y `apps/mobile/src/app/(tabs)/memories.tsx` | Título «Mis memorias». Estados en español, motivo, plazo y el aviso de límite. Sin recuadro de petición abierta. `href: null` en el layout de pestañas, y la barra sigue marcando Perfil |
| Ficha | `apps/mobile/src/screens/MemoryDetailScreen.tsx` | Enviada, en proceso o aceptada: solo lectura de lo enviado y del estado |
| Formulario | `apps/mobile/src/screens/MemoryFormScreen.tsx` y `apps/mobile/src/app/(tabs)/memory-form.tsx` | Alta y corrección. Si el id aún no está en memoria, la ruta pide la lista una vez. Si sigue ausente, `MemoryUnavailableScreen` |
| ViewModels | `apps/mobile/src/viewmodels/useVisitorMemories.ts` y `useMemoryForm.ts` (nuevos) | Leen la lista, arman el multipart y traducen 422, 429 y la falta de red |
| Galería | `apps/mobile/src/memories/pickMemoryImage.ts` (nuevo) | Pide el permiso y devuelve un archivo. El ADR 0030 ya está Aceptado; el archivo se escribe en la implementación |
| Navegación | `apps/mobile/src/app/(tabs)/_layout.tsx` y `apps/mobile/src/components/AppTabBar.tsx` | Rutas ocultas `memories` y `memory-form`, asociadas a Perfil al volver |
| Pruebas | `apps/mobile/__tests__/visitor-memories.test.tsx` | CA-01 a CA-18 con cliente y selector simulados |
| Documentación | `apps/mobile/docs/` una nota de permiso de galería, en el PR de implementación | Cuándo se pide y qué dice si se niega |

## Contrato y datos

La app consume las rutas que ya expone `api-010`. No hay endpoints nuevos ni DBR nueva.

- `GET /api/v1/visitor/memories` (`visitor.memories.index`), sesión de visitante con correo verificado.
- `POST /api/v1/visitor/memories` (`visitor.memories.store`), `multipart/form-data` con `image` (archivo), `opinion` (omitido o vacío si no hay texto) y `consent` aceptado. Responde 201. El archivo se adjunta como `File` de `expo-file-system` (módulo que ya trae el SDK). El `fetch` de Expo no envía la parte `{ uri, name, type }` y el teléfono lo mostraba como «Sin conexión».
- `POST /api/v1/visitor/memories/{id}/resubmit` (`visitor.memories.resubmit`), el mismo cuerpo. `image` solo es obligatorio en la app cuando `rejected_fields` incluye `image`.

La lista trae `data` y `meta`. Cada ítem tiene `id`, `status`, `opinion`, `created_at`, `reviewed_at` y `resubmitted_count`. Si está `rejected`, añade `rejection_reason` y `rejected_fields` (`image`, `content` o ambos). Si está `accepted`, añade `published_until` e `is_published`. `meta` trae `can_submit`, `next_submission_at` y `open_request_id`. No llega URL de la imagen, hash, `visitor_id` ni datos del revisor.

Traducción visible: `submitted` → «Enviada», `in_review` → «En proceso», `accepted` → «Aceptada», `rejected` → «Rechazada».

### Formulario

El botón «Enviar petición» espera imagen y consentimiento. La opinión vacía se puede enviar (CA-02). Más de 300 caracteres, un tipo distinto de JPG, PNG o WebP, o más de 5 MB, se avisan en la app y no salen a la red (CA-03).

Con `meta.can_submit` en falso se muestra «Podrás enviar otra memoria a partir del {fecha y hora}.» y no se ofrece el alta (CA-14). Con `open_request_id` la lista no muestra «Ya tienes una petición abierta.» ni ofrece otra alta (CA-15). Al tocar la petición se ve lo enviado y el estado, sin campos. Un 422 `open_request` sigue mostrando ese texto en el intento de envío. Un 429 usa el texto del límite.

Un 201 o un 200 de reenvío sustituye esa fila, marca `open_request_id` con su id cuando el estado sigue abierto, y muestra «Tu petición se envió. El zoológico la revisará; todavía no está publicada.» en la lista (CA-04, CA-16). La ruta vuelve a «Mis memorias». Mientras la petición viaja, un indicador tapa la pantalla y un segundo toque no dispara otro envío (CA-05).

La lista vuelve a llamar a `GET /visitor/memories` al abrirse y cuando la app regresa a primer plano (CA-06). No se queda con la copia de la sesión.

### Corrección

«Corregir y reenviar» abre el mismo formulario con la opinión de la lista (vacía si era nula) y el consentimiento sin marcar. Si `rejected_fields` incluye `image`, hace falta un archivo nuevo. Si incluye `content`, el texto recortado tiene que ser distinto del anterior; si el anterior era vacío, hace falta un texto de 1 a 300 caracteres (CA-17). No se vuelve a pedir la lista para pintar el motivo ni el plazo (CA-18). Al pulsar «Enviar petición» aparece «¿Seguro que quieres enviar la corrección?». Solo «Sí, enviar» llama a `resubmit`. Con 200 se quitan los campos y `router.replace('/memories')` (CA-16, RN-15).

### Permiso de galería

Al pulsar el control de la foto, y solo entonces, se pide el permiso (CA-01, RN-08). Si se niega, el formulario permanece y el texto indica que la foto se elige en los ajustes del teléfono. No se abre la cámara.

El ADR 0030 ya está Aceptado. Las pruebas del formulario usan un selector simulado; la dependencia se instala en la implementación.

## Seguridad, offline y operación

- El archivo sale por HTTPS junto con el token de `expo-secure-store`. No se copia a un almacén permanente de la app ni se muestra en «Mis memorias» (RN-14).
- Sin red, el envío y el reenvío muestran «Sin conexión» y no encolan la imagen (CA-10).
- 401 y 403 `email_not_verified` llevan a la verificación de `mobile-004`. 403, 404, 413 y 415 muestran un mensaje en español. Ningún error afirma que la petición se guardó (CA-09).
- El texto de la casilla es el de referencia de `api-010` RN-08. La app no se publica con ese texto hasta que el zoológico lo apruebe (`mobile-010` RN-07).
- No hay cambio de esquema. La foto queda en `media/memories/` por la API (ADR 0026). MySQL no entra en esta app.
- El borrado de cuenta y `memories_policy` siguen fuera: no se toca `mobile-004` ni `api-004`.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | Perfil muestra «Mis memorias» y no hay pestaña nueva; el permiso se pide al elegir la foto, no al abrir Perfil | `apps/mobile/__tests__/visitor-memories.test.tsx` |
| CA-02 | El botón espera imagen y consentimiento, y queda activo con la opinión vacía | El mismo archivo |
| CA-03 | Tipo, tamaño u opinión de más de 300 caracteres no llaman al cliente | El mismo archivo |
| CA-04 | Un 201 muestra «Enviada» y el texto de revisión, sin decir que ya está en el portal | El mismo archivo |
| CA-05 | Un segundo toque durante el envío no llama otra vez | El mismo archivo |
| CA-06 | La lista pinta los cuatro estados en español, una Enviada muestra el texto de revisión, y el hook vuelve a pedir la lista aunque ya hubiera copia | El mismo archivo |
| CA-07 | Una rechazada muestra «Motivo» y los textos de `image` y `content` | El mismo archivo |
| CA-08 | Aceptada vigente y aceptada vencida usan los dos textos de plazo | El mismo archivo |
| CA-09 | 422, 401, 403, 404, 413 y 415 muestran su mensaje y no dicen que se guardó | El mismo archivo |
| CA-10 | Sin red, el envío muestra «Sin conexión» y no llama al alta | El mismo archivo |
| CA-11 | `MemoriesScreen` y `MemoryFormScreen` no importan el cliente HTTP | El mismo archivo, revisión de esas pantallas |
| CA-12 | Consentimiento, errores y campos marcados tienen nombre o texto, no solo color | El mismo archivo |
| CA-13 | Los nombres de las pruebas incluyen CA-01 a CA-18 | El mismo archivo |
| CA-14 | `can_submit` falso muestra la fecha y no ofrece el alta; un 429 usa el mismo texto | El mismo archivo |
| CA-15 | `open_request_id` muestra el aviso y no ofrece un alta nueva; tras guardar, la copia local queda abierta y un id que no está rechazado sale del formulario | El mismo archivo |
| CA-16 | «Corregir y reenviar» precarga la opinión, pide confirmación, llama a `resubmit` y, con 200, quita los campos | El mismo archivo |
| CA-17 | Sin foto nueva, o con la misma opinión, no se envía; un 422 queda junto al campo | El mismo archivo |
| CA-18 | Motivo y plazo salen de la lista ya cargada; tras el 200 esa fila se sustituye | El mismo archivo |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | `expo-image-picker` queda autorizado por el ADR 0030, Aceptado. Se instala en la implementación. El resto sigue en Expo (ADR 0004) |
| II. La spec manda | Sí | Spec y este plan aprobados. No hay tasks ni código |
| III. Lógica separada de la interfaz | Sí | Las pantallas no calculan plazo, límite ni estado. Los hooks llaman a `@arca/api-client` |
| IV. Un test por criterio | Sí, al implementar | La tabla nombra CA-01 a CA-18. El permiso real del teléfono queda como evidencia manual del PR |
| V. Una sola fuente de verdad para los datos | Sí | No hay DBR móvil ni cola local. La fila y el archivo los guarda la API (DBR-012, `media/memories/`) |
| VI. Código en inglés, personas en español | Sí | Rutas, tipos y archivos en inglés. Etiquetas, motivos y errores en español |

## Riesgos y decisiones

- La dependencia y el permiso de `app.json` se añaden en la implementación, con el ADR 0030 ya Aceptado. No se añaden antes de las tasks.
- El texto de la casilla no se publica hasta la redacción del zoológico (RN-07).
- `mobile-013` CA-10 abre `/memory-form` con el id. Enmienda: no es otra bandeja. Si la petición no está en memoria, se pide la lista una vez; si sigue ausente, se muestra «Tu memoria».
- Quien deja una rechazada sin corregir no puede enviar otra, porque la API lo trata como petición abierta. La app solo muestra el aviso (CA-15).

## Orden y aprobación

1. Plan y ADR 0030 aprobados.
2. Las tasks están en `apps/mobile/tasks/010-visitor-memory-requests.md`, aprobadas. Cada CA-01 a CA-18 tiene una prueba que lo nombra.
3. En el corte de implementación se instala `expo-image-picker`, se añaden los métodos del api-client y se actualiza la nota del permiso.
4. El push de un momento (`mobile-013` CA-10) abre `/memory-form` con el id. Enmienda: la ruta espera la lista antes de decir que la petición falta.

Aprobación funcional de la spec: Aprobada. Aprobación de este plan: Aprobada. Enmienda: refresco de la lista, alta bloqueada con petición abierta y confirmación de la corrección.
