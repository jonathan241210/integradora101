# Plan técnico · 013 · enclosure-qr-printing

- Spec: `apps/dashboard/specs/013-enclosure-qr-printing.md`
- Estado de spec: Implementada
- Solicitada: 2026-11-18
- Aprobada: 2026-11-18
- Estado del plan: **Aprobado**. Autoriza la implementación según sus tasks.
- Responsable técnico: Frontend y Backend
- Dependencias de implementación: `api-020` (Aprobada). Esta implementación empieza cuando estén listos los endpoints de `api-020` (T-04 a T-07) y el cliente (`api-020` T-15). Enmienda (c) de `dashboard-012` (CA-32, CA-38, RN-07) y enmienda a su CA-03 se aplican en el mismo PR.
- ADR: no requerido (sin dependencias nuevas; `bacon` vive en la API).

## Diseño de solución

El panel presenta y pide. No genera códigos, no decide qué código está activo y no calcula permisos. Todo el dato viene de `@arca/api-client` a través de un hook (ViewModel). La vista solo muestra.

Piezas:

- **Tarjeta de recinto** (`EnclosuresView`): muestra «Ver QR» o «Generar QR» según `has_active_qr`, y la insignia «Sin QR» cuando no hay código activo. Botones solo con `enclosures.manage`.
- **Hook `useEnclosureQr`** (ViewModel): carga `enclosures.qr(id)`, llama a `generateQr(id)` o `regenerateQr(id)`, guarda estado (`idle`, `loading`, `ready`, `error`), mapea errores HTTP a los textos de la spec y expone una función para refrescar el indicador `has_active_qr` de la lista. No guarda el código en almacenamiento ni en la URL (CA-14).
- **Componente `EnclosureQrDialog`** (View): usa el diálogo modal del proyecto (`@arca/ui` o el componente de diálogo que ya usa `ConfirmDialog`), con título, imagen del QR, código en texto, aviso de recinto inactivo, y botones «Imprimir», «Regenerar QR» y «Cerrar». El SVG se muestra como `<img src="data:image/svg+xml;charset=utf-8,...">` con `encodeURIComponent` (RN-03), nunca con `innerHTML`.
- **Confirmación de regenerar:** `ConfirmDialog` de variante peligro (ya existente) con el texto de CA-05.
- **Confirmación de eliminar (enmienda a `dashboard-012` CA-03):** el texto existente recibe la frase final «Sus códigos QR dejarán de funcionar.».
- **Hoja de impresión:** un bloque `#enclosure-qr-print` dentro del diálogo, con nombre del recinto, QR grande y código debajo. `window.print()` al pulsar «Imprimir». En `styles.css`, la regla `@media print` oculta la interfaz y muestra solo la hoja (RN-04). Sin librería nueva ni `document.write`.
- **Catálogo de acciones** (`apps/dashboard/src/viewmodels/search-actions.ts`): una entrada «QR del recinto» (sección Recintos, permiso `enclosures.manage`, abre diálogo, sinónimos `qr`, `código qr`, `qr recinto`, `imprimir qr`, `regenerar qr`, `generar qr`). La vista recibe el foco según el término: «imprimir» → «Imprimir»; «regenerar» → «Regenerar QR»; otros → «Ver QR». Abrir la acción nunca genera, imprime ni regenera (RN-07 de `dashboard-012`).
- **Pruebas:** Vitest con cliente simulado de `@arca/api-client`. Un `describe("CA-xx enclosure-qr-printing")` por criterio en `src/tests/enclosure-qr-printing.test.tsx`, registrado en `administration-coverage.test.tsx`.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Dashboard / Recintos | `src/views/EnclosuresView.tsx`, `src/viewmodels/enclosures-management.ts`, `src/viewmodels/useEnclosuresManagement.ts` | Botones, insignia «Sin QR», aviso de eliminar con QR (CA-01, CA-16, CA-23) |
| Dashboard / QR | `src/viewmodels/useEnclosureQr.ts`, `src/components/EnclosureQrDialog.tsx` | Hook (VM) y diálogo (View) (CA-02 a CA-07, CA-11, CA-12, CA-15) |
| Dashboard / impresión | `src/components/EnclosureQrDialog.tsx` (bloque `#enclosure-qr-print`), `src/styles.css` | Hoja y `@media print` (CA-08 a CA-10) |
| Dashboard / catálogo | `src/viewmodels/search-actions.ts` | Entrada «QR del recinto» y foco por término (CA-18 a CA-20) |
| Dashboard / estilos | `src/styles.css` | Tokens semánticos, insignia, diálogo (CA-17) |
| Paquete | `packages/api-client/admin.ts`, `packages/api-client/admin-types.ts` (en `api-020` T-15) | Métodos y tipos (sin lógica) |
| Pruebas | `src/tests/enclosure-qr-printing.test.tsx`, `src/tests/administration-coverage.test.tsx` | CA-01 a CA-23 |
| Documentación | `apps/dashboard/docs/manual-demo.md` (flujo de QR), `apps/dashboard/docs/arquitectura.md` (diálogo y hook) si cambia la referencia | Documentación local |

## Contrato y datos

- **Endpoints consumidos** (de `api-020`): `GET .../enclosures/{id}/qr`, `POST .../enclosures/{id}/qr`, `POST .../enclosures/{id}/qr/regenerate`. Y `has_active_qr` del listado admin.
- **Forma de la respuesta:** `{ enclosure: { id, name, is_active }, qr: { code, svg } | null }`. `deactivated` en regenerar (no se muestra).
- **Errores que el ViewModel mapea:** 403 → «No tienes permiso para realizar esta acción.»; 404 → «Recinto no encontrado.» y cierre del diálogo; 500 o sin conexión → mensajes de carga, generar o regenerar de CA-11 y CA-12.
- **Datos:** no hay almacenamiento. El código vive en memoria del diálogo mientras está abierto.
- **DBR:** no aplica en el frontend.

## Seguridad, offline y operación

- **Permisos:** la UI oculta botones sin `enclosures.manage`; la API comprueba el permiso en cada ruta (`api-020` CA-13).
- **Datos sensibles:** el código no aparece en la lista, en el buscador (`dashboard-012`), ni en `localStorage`, `sessionStorage`, cookies, URL o logs del cliente (CA-13, CA-14). Un test lee el código del hook y de la vista.
- **SVG:** data URI con `encodeURIComponent`, sin `innerHTML` (RN-03). El texto alternativo es «Código QR del recinto <nombre>».
- **Impresión:** `window.print()` solo al pulsar «Imprimir». La hoja tiene solo nombre, QR y código.
- **Sin offline:** el panel requiere conexión. Sin conexión, el diálogo muestra el mensaje de carga (CA-11).
- **Sin dependencias npm nuevas.** Sin ADR.

## Mapeo de criterios a pruebas

Todas en `src/tests/enclosure-qr-printing.test.tsx`, con `describe("CA-xx enclosure-qr-printing")`. El cliente se simula con `vi.mock("@arca/api-client")`.

| Criterio | Prueba automatizada | Tareas |
|---|---|---|
| CA-01 | Tarjeta muestra «Ver QR» con `has_active_qr` verdadero y «Generar QR» con falso; nombre accesible; sin permiso no hay botones | T-01 |
| CA-02 | Abrir «Ver QR» llama una vez a `qr(id)`, muestra «Cargando QR…» con `role="status"`, no llama a generar ni regenerar | T-01 |
| CA-03 | Diálogo con título, imagen con alt, código en texto, botones; Esc y «Cerrar» devuelven el foco | T-02 |
| CA-04 | «Generar QR» llama una vez a `generateQr(id)` sin confirmación; la tarjeta pasa a «Ver QR» sin cambiar página ni orden | T-03 |
| CA-05 | Regenerar abre `ConfirmDialog` con el título y el texto exactos; no llama a la API hasta confirmar; cancelar no cambia nada | T-04 |
| CA-06 | Confirmar llama una vez a `regenerateQr(id)`; muestra el código nuevo y el aviso en `role="status"` | T-03 |
| CA-07 | Recinto inactivo muestra el aviso confirmado; los botones funcionan | T-02 |
| CA-08 | «Imprimir» llama una vez a `window.print()` y no llama a generar ni regenerar | T-05 |
| CA-09 | `#enclosure-qr-print` contiene solo nombre, QR y código; sin botones ni navegación | T-05 |
| CA-10 | Un test lee `styles.css` y comprueba la regla `@media print`: oculta la interfaz y fija el QR en al menos 70 mm. La impresión real se registra como evidencia manual | T-06 |
| CA-11 | 403 → mensaje de permiso; 404 → «Recinto no encontrado.» y cierre; 500 o sin red → mensaje y «Reintentar» que solo llama a `qr(id)` | T-07 |
| CA-12 | Error al generar: la tarjeta no cambia; error al regenerar: el diálogo conserva el código anterior | T-07 |
| CA-13 | El DOM de la lista y del buscador no contiene el código; test de lectura estática del hook y la vista: sin `localStorage`, `sessionStorage`, `document.cookie` ni `history` | T-08 |
| CA-14 | Lectura estática: sin almacenamiento ni URL con el código | T-08 |
| CA-15 | `role="dialog"`, `aria-modal`, nombre por título, foco inicial en «Imprimir», Tab no sale, Esc cierra | T-02 |
| CA-16 | Tras generar o regenerar, página y orden no cambian; `has_active_qr` se actualiza | T-09 |
| CA-17 | Test lee `styles.css` y comprueba que los bloques nuevos no tienen hex ni `rgb(` | T-06 |
| CA-18 | Buscar «qr», «imprimir qr» o «regenerar qr» muestra «QR del recinto»; abrirla abre el diálogo con el foco correcto; no llama a `generateQr`, `regenerateQr` ni `window.print()` | T-10 |
| CA-19 | Perfil sin `enclosures.manage` no ve «QR del recinto» al buscar | T-10 |
| CA-20 | Consulta «qr»: aparecen «QR del recinto» (`enclosures.manage`) y «Nueva venta» (`tickets.create`) según permisos; cuatro combinaciones | T-10 |
| CA-21 | Cobertura: un `describe` por CA-01 a CA-23 y registro en `administration-coverage.test.tsx` | T-12 |
| CA-22 | Test lee los archivos de la vista y el hook: sin `fetch(` ni `axios`; la vista usa solo el hook | T-11 |
| CA-23 | Eliminar muestra el `ConfirmDialog` con el texto de `dashboard-012` CA-03 más «Sus códigos QR dejarán de funcionar.»; cancelar no cambia nada | T-04 |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin dependencias npm nuevas. `window.print()` y CSS nativos. |
| II. La spec manda | Sí | Spec 013 Aprobada; plan y tasks con el mismo `013-enclosure-qr-printing`. Enmienda (c) de `dashboard-012` aprobada. |
| III. Lógica separada de la interfaz | Sí | Vista sin `fetch`; hook como ViewModel; reglas de códigos en `api-020`. Test CA-22. |
| IV. Un test por criterio | Sí | Mapeo CA-01 a CA-23 con `describe` por criterio. CI: pendiente de evidencia de la sesión principal. |
| V. Una sola fuente de verdad para los datos | Sí | El panel no guarda datos; la API es la autoridad (`api-020`). |
| VI. Código en inglés, personas en español | Sí | Textos de UI en español (CA-01 a CA-23); nombres de componentes y hooks en inglés. |

Ninguna excepción. La regla de accesibilidad y tokens (`dashboard/AGENTS.md`) se verifica en CA-15 y CA-17.

## Riesgos y decisiones

- **Impresión entre navegadores:** márgenes y escala varían. Mitigación: CA-10 con evidencia manual en Chrome y Edge, registrada por la sesión principal.
- **Colisión de palabras en el buscador:** «qr» y «imprimir» coinciden con «Nueva venta» y con «QR del recinto». Decisión: se muestran ambas según permisos (CA-20). El orden lo fija el catálogo.
- **Regenerar por error:** deja sin efecto los QR impresos. Mitigación: confirmación con aviso (CA-05).
- **Foco por término:** la lógica de «imprimir» y «regenerar» vive en el catálogo (presentación), no en la API. No decide permisos.
- **Divergencia de progreso:** no afecta a esta spec; la regla de `api-019` CA-35 sigue vigente (`api-020` CA-24).
- **Alternativas descartadas:** `dangerouslySetInnerHTML` para el SVG (riesgo y contraria a RN-03); una librería de PDF (contraria a RN-04); generar el código en el cliente (contrario a `api-020`).

## Orden y aprobación

1. Esperar `api-020` T-04 a T-07 y T-15 (endpoints y cliente).
2. Hook `useEnclosureQr` y tarjeta (T-01), diálogo (T-02), acciones de generar y regenerar (T-03), confirmaciones (T-04).
3. Impresión y estilos (T-05, T-06); errores y seguridad de la vista (T-07, T-08); orden y página (T-09).
4. Catálogo y enmiendas a `dashboard-012` (T-10); MVVM (T-11); cobertura (T-12).
5. Documentación, verificaciones y PR (T-13 a T-15).

- Revisión técnica: pendiente.
- Aprobador funcional: responsable funcional (aprobada).
- Evidencias: pendientes de la sesión principal (Vitest, lint, `tsc` y la impresión manual en Chrome y Edge). Esta sesión no tiene shell y no afirma que pasen.

## Decisiones de implementación aceptadas por la sesión principal

- **D-QR-1 (RN-11 de dashboard-012):** una palabra de 2 letras (p. ej. «qr») reconoce una acción solo por coincidencia exacta con la etiqueta o un sinónimo; las palabras de 3 o más letras siguen la tolerancia normal.
- **D-QR-2:** al combinar acción y elemento, gana la acción con más palabras reconocidas (empate: orden del catálogo); corrige «imprimir qr recinto lobos» y «eliminar recinto lobos».
- **D-QR-3:** foco inicial del diálogo en «Imprimir»; en «Regenerar QR» si la consulta contiene «regenerar»; al cerrar vuelve al botón de la tarjeta.
- **D-QR-4:** la frase «Sus códigos QR dejarán de funcionar.» se añade al confirmar la eliminación solo si `has_active_qr` es verdadero (CA-23).
- **D-QR-5:** `packages/ui` `Dialog` añade `aria-modal="true"` (CA-15). La hoja de impresión se monta con portal en `document.body` y `@media print` acotado a `#enclosure-qr-print`, sin afectar la impresión de boletos.
- **Limitación:** Vitest corre en entorno node; foco, Esc y Tab se verifican por lectura estática. La prueba manual de impresión en Chrome y Edge (T-06, T-16) queda pendiente.
