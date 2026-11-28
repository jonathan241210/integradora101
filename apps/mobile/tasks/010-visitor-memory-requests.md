# Tareas · 010 · visitor-memory-requests

- Spec: `apps/mobile/specs/010-visitor-memory-requests.md` (En progreso; aprobada)
- Plan: `apps/mobile/plan/010-visitor-memory-requests.md` (Aprobado)
- ADR: `docs/adr/0030-expo-image-picker-visitor-memories.md` (Aceptado)
- Estado del checklist: Aprobado. Autoriza la implementación en el orden de abajo. Las casillas se marcan al completar cada tarea.
- Solicitada: 2026-11-14
- Aprobada: 2026-11-14
- Base de datos: ninguna tarea. DBR-012 ya está Lista para backend. No hay esquema nuevo.

## Dependencias

- [x] **T-01** (RN-10, ADR 0030): Instalar `expo-image-picker` en `apps/mobile`, compatible con Expo SDK 57, y declarar en `app.json` el permiso de galería con texto en español. Sin cámara, sin video y sin leer el álbum completo. Hecho cuando el paquete está en el manifiesto y el permiso no se pide al abrir Perfil.

## Contrato

- [x] **T-02** (CA-06, CA-11, RN-09): Añadir en `packages/api-client/visitor.ts` los tipos y los métodos `listVisitorMemories`, `submitVisitorMemory` y `resubmitVisitorMemory`. El alta y el reenvío van en `multipart/form-data` con `image`, `opinion` (omitida si no hay texto) y `consent`. Sin calcular plazo, límite ni estado. Hecho cuando una prueba del paquete nombra el contrato y no contiene reglas de negocio.

## Implementación

- [x] **T-03** (CA-01, RN-08): Crear `apps/mobile/src/memories/pickMemoryImage.ts`. Pide el permiso solo al elegir la foto y devuelve un archivo JPG, PNG o WebP. Si el permiso se niega, no devuelve archivo. Hecho cuando el módulo no abre la cámara ni guarda una copia permanente.
- [x] **T-04** (CA-06, CA-14, CA-15, CA-18, RN-02, RN-11): Crear `apps/mobile/src/viewmodels/useVisitorMemories.ts`. Pide `GET /api/v1/visitor/memories`, traduce `submitted`, `in_review`, `accepted` y `rejected`, y expone `can_submit`, `next_submission_at` y `open_request_id` tal como llegan. Hecho cuando el hook no calcula la ventana de 7 días.
- [x] **T-05** (CA-02, CA-03, CA-04, CA-05, CA-09, CA-10, CA-16, CA-17, RN-04, RN-06): Crear `apps/mobile/src/viewmodels/useMemoryForm.ts`. Arma el alta y el reenvío, bloquea un segundo toque mientras viaja, y traduce 422, 429, 401, 403, 404, 413, 415 y la falta de red. La opinión vacía se puede enviar. Hecho cuando sin red no encola la imagen y ningún error dice que la petición se guardó.
- [x] **T-06** (CA-01, RN-09): Añadir en `ProfileScreen` y en `apps/mobile/src/app/(tabs)/profile.tsx` la fila «Mis momentos». Registrar `memories` y `memory-form` en `_layout.tsx` con `href: null`, y en `AppTabBar` dejarlas asociadas a Perfil. Hecho cuando la barra inferior sigue con las cinco pestañas actuales.
- [x] **T-07** (CA-06, CA-07, CA-08, CA-14, CA-15, RN-03, RN-13, RN-14): Crear `MemoriesScreen.tsx` y `apps/mobile/src/app/(tabs)/memories.tsx`. Cada fila muestra el estado en español. Una rechazada muestra «Motivo» y los textos de `image` y `content`. Una aceptada muestra el plazo vigente o el vencido. No muestra la foto. Hecho cuando el aviso de límite o de petición abierta sale de `meta` y no se ofrece un alta nueva en esos casos.
- [x] **T-08** (CA-02, CA-03, CA-12, CA-16, CA-17, RN-07): Crear `MemoryFormScreen.tsx` y `apps/mobile/src/app/(tabs)/memory-form.tsx`. El formulario de alta y el de corrección son el mismo. El botón «Enviar petición» espera imagen y consentimiento; la opinión es opcional, con contador hasta 300. La casilla usa el texto de referencia de `api-010` RN-08 y se anuncia su estado. La corrección precarga la opinión de la lista, vuelve a pedir consentimiento y resalta `rejected_fields` con texto, no solo con color. Hecho cuando la pantalla no importa el cliente HTTP. Enmienda: si el id no está en memoria, la ruta muestra «Buscando tu momento…», pide la lista una vez y, si sigue ausente, usa `MemoryUnavailableScreen`.

## Pruebas

Archivo: `apps/mobile/__tests__/visitor-memories.test.tsx`. Cliente y selector simulados. Cada prueba nombra su CA.

- [x] **T-09** (CA-01): Perfil muestra «Mis momentos», no hay pestaña nueva y el permiso se pide al elegir la foto.
- [x] **T-10** (CA-02): El botón espera imagen y consentimiento, y queda activo con la opinión vacía.
- [x] **T-11** (CA-03): Un archivo que no es JPG, PNG o WebP, uno de más de 5 MB, o una opinión de más de 300 caracteres no llama al cliente. La opinión vacía sí puede enviarse.
- [x] **T-12** (CA-04): Un 201 muestra «Enviada» y «Tu petición se envió. El zoológico la revisará; todavía no está publicada.»
- [x] **T-13** (CA-05): Un segundo toque durante el envío no llama otra vez.
- [x] **T-14** (CA-06): La lista pinta Enviada, En proceso, Aceptada y Rechazada, y usa `GET /api/v1/visitor/memories`.
- [x] **T-15** (CA-07): Una rechazada muestra «Motivo», «La foto no cumple lo indicado» y «La opinión necesita cambios» según `rejected_fields`.
- [x] **T-16** (CA-08): Aceptada con `is_published` verdadero y con `is_published` falso usan los dos textos de plazo. La lista no muestra la foto.
- [x] **T-17** (CA-09): 422, 401, 403 `email_not_verified`, 403, 404, 413 y 415 muestran su mensaje en español y no dicen que la petición se guardó.
- [x] **T-18** (CA-10): Sin red, el envío y el reenvío muestran «Sin conexión» y no llaman al alta.
- [x] **T-19** (CA-11): `MemoriesScreen` y `MemoryFormScreen` no importan `fetch`, `axios` ni el cliente HTTP. La red queda en los hooks.
- [x] **T-20** (CA-12): El consentimiento, los errores, el límite semanal y los campos a corregir tienen nombre o texto visible, no solo color.
- [x] **T-21** (CA-13): Los nombres de las pruebas de este archivo incluyen CA-01 a CA-18.
- [x] **T-22** (CA-14): `can_submit` falso muestra «Podrás enviar otro momento a partir del {fecha y hora}.» y no ofrece el alta. Un 429 usa el mismo texto.
- [x] **T-23** (CA-15): Enmienda. Con petición abierta no hay recuadro «Ya tienes una petición abierta.» ni alta nueva. La fila abre una ficha de solo lectura. Un 422 `open_request` sigue mostrando ese texto en el intento de envío.
- [x] **T-24** (CA-16): «Corregir y reenviar» precarga la opinión, vuelve a pedir consentimiento y llama a `POST /api/v1/visitor/memories/{id}/resubmit`. Un 200 muestra el texto de CA-04.
- [x] **T-25** (CA-17): Si el motivo incluye `image` y no hay foto nueva, no se envía. Si incluye `content` y la opinión recortada no cambió, no se envía. Un 422 queda junto al campo.
- [x] **T-26** (CA-18): El motivo y el plazo salen de la lista ya cargada. Tras un 200, esa fila se sustituye por la respuesta sin pedir otra vez la lista.

## Documentación y entrega

- [x] **T-27** (RN-07, RN-08): Escribir en `apps/mobile/docs/` la nota del permiso de galería: cuándo se pide, qué pasa si se niega y que el texto de la casilla es de referencia hasta que el zoológico lo apruebe. La app no se publica con ese texto antes. Hecho cuando la nota cita `mobile-010` y el ADR 0030.
- [x] **T-28** (CA-13): Ejecutar la suite `visitor-memories` en `apps/mobile` y registrar el resultado. No hace falta la suite completa del monorepo para cerrar esta tarea. Resultado: `npx jest __tests__/visitor-memories.test.tsx --no-coverage` — 19 pruebas en verde.
- [x] **T-29**: En el PR, enlazar spec, plan y tasks. No incluye el toque del push de `mobile-013` CA-10: esa ruta se conecta cuando esta pantalla exista, en la implementación de `mobile-013`, no aquí. No se modifica el borrado de cuenta de `mobile-004`. La verificación y el pull de memorias quedaron confirmados. Esta task no guarda la URL del PR.
- [x] **T-30** (CA-06, CA-15, CA-16, RN-15): Enmienda. La lista vuelve a pedirse al montar el hook. Tras guardar, `open_request_id` queda en la copia local. El formulario de alta no se pinta si hay petición abierta o si el id no está rechazado. La corrección pregunta «¿Seguro que quieres enviar la corrección?» y, con 200, oculta los campos y la ruta vuelve a «Mis momentos». Resultado: `npx jest __tests__/visitor-memories.test.tsx --no-coverage` — 21 pruebas en verde.

## Trazabilidad

| Criterio | Tarea de prueba |
|---|---|
| CA-01 | T-09 |
| CA-02 | T-10 |
| CA-03 | T-11 |
| CA-04 | T-12 |
| CA-05 | T-13 |
| CA-06 | T-14, T-30 |
| CA-07 | T-15 |
| CA-08 | T-16 |
| CA-09 | T-17 |
| CA-10 | T-18 |
| CA-11 | T-19 |
| CA-12 | T-20 |
| CA-13 | T-21 |
| CA-14 | T-22 |
| CA-15 | T-23, T-30 |
| CA-16 | T-24, T-30 |
| CA-17 | T-25 |
| CA-18 | T-26 |
