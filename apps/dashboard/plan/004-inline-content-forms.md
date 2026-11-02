# Plan técnico · 004 · inline-content-forms

- Spec: `apps/dashboard/specs/004-inline-content-forms.md`
- Estado de spec: Borrador (pendiente de aprobación). Este plan no debe ejecutarse hasta que la spec esté Aprobada; la parte de imágenes también requiere `api-008` aprobada.
- Estado del plan: Borrador (pendiente de aprobación técnica y del Constitution Check).
- Responsable técnico: por identificar (frontend).
- Contrato que consume: `apps/api/specs/008-event-news-images.md` y su plan (noticias y eventos); `apps/api/specs/007-administration-management.md` (cuentas, sin cambios).
- Origen: plan de trabajo aprobado por el usuario el 2026-11-01 (fuera del repositorio), con las decisiones D1 a D3 y el panel colapsable comunicados por la sesión principal el mismo día.

## Diseño de solución

Noticias, Eventos y Usuarios pasan de «botón + diálogo» a un formulario fijo en la página, con paneles que se pueden minimizar, la caja de imagen real (noticias y eventos) y las confirmaciones en línea. Se mantiene la arquitectura MVVM de `dashboard-003`:

```
View (props, sin lógica)  ←  Section (contenedor delgado)  ←  hook ViewModel  →  funciones puras + reducer  →  @arca/api-client  →  API
                                                                          ↘  services/image-preview (inyectado, solo noticias y eventos)
```

- **View** (`src/views/NewsView.tsx`, `EventsView.tsx`, `UsersView.tsx`): pinta paneles, formularios, caja de imagen, tarjetas o tabla y confirmaciones en línea con `@arca/ui` y clases existentes. No importa `services/` ni `@arca/api-client`.
- **Componentes locales**:
  - `src/components/FormPanel.tsx` (nuevo): panel colapsable con botón `aria-expanded` y `aria-controls`. Recibe `expanded` y `onToggle` por props; no guarda estado propio.
  - `src/components/InlineConfirm.tsx` (nuevo): confirmación dentro de la tarjeta o fila (mensaje, «Confirmar», «Cancelar»). Escape cancela; foco inicial en «Cancelar».
  - `src/components/InlinePasswordReset.tsx` (nuevo, o bloque dentro de `InlineConfirm`): campo de nueva contraseña con mostrar/ocultar. El valor vive en el estado local del campo hasta enviarse (mismo patrón que `dashboard-003`).
  - `src/components/ConfirmDialog.tsx` (de `dashboard-003`): se retira si después del cambio no tiene usos en el dashboard (verificar con búsqueda antes de borrar).
- **Section** (`src/sections/NewsSection.tsx`, `EventsSection.tsx`, `UsersSection.tsx`): ya existen desde `dashboard-003`; solo se ajustan para pasar las nuevas props.
- **ViewModel** (`src/viewmodels/news-management.ts`, `events-management.ts`, `staff-accounts.ts`): estado con `editing`, `pendingAction`, `formExpanded` (por defecto `true`, RN-11), `form` y `notice`. En noticias y eventos, `form` incluye `image: File | null`, `imagePreview`, `removeImage`. Reducer y funciones asíncronas que reciben el cliente y el servicio de vista previa como parámetros.
- **Hook** (`src/viewmodels/useNewsManagement.ts`, `useEventsManagement.ts`, `useStaffAccounts.ts`): une el reducer con `adminApi` (de `services/arca-api.ts`) y, en noticias y eventos, con `services/image-preview.ts`.

### Decisiones de diseño

- **Sin modales (RN-01, D3).** Se eliminan `Dialog` y `ConfirmDialog` de las tres vistas. El formulario siempre está presente; «Editar» solo lo carga.
- **Panel colapsable (CA-03, RN-11).** `FormPanel` expone un botón con `aria-expanded` y `aria-controls` apuntando al contenido. El contenido se oculta con el atributo `hidden` para que el estado de los campos se conserve (los controles siguen montados). `formExpanded` vive en el ViewModel (`true` al abrir la sección), así es testeable. Enter y Espacio funcionan porque el control es un `<button>`.
- **Una sola acción en línea abierta (CA-12).** `pendingAction` guarda `{ type: "delete" | "status" | "reset-password" | "reset-two-factor", id }` o `null`. Abrir otra acción cierra la anterior.
- **Foco inicial en «Cancelar» (propuesta).** Al abrir una confirmación, el foco va a «Cancelar» para evitar confirmaciones por error. Ajustable en revisión.
- **Escape (CA-12).** Un manejador de teclado en el contenedor de la confirmación cancela la acción.
- **Vista previa (RN-04).** `services/image-preview.ts` expone `create(file): string` y `revoke(url): void` basados en `URL.createObjectURL`/`revokeObjectURL`. El ViewModel lo recibe inyectado. La vista nunca llama a `URL`.
- **Validación de ayuda (RN-03, CA-05).** El ViewModel comprueba tipo y tamaño con dos constantes (`image/jpeg`, `image/png`, `image/webp`; 5 MB). Si no cumple, no adjunta el archivo y deja un error en la caja de imagen (D1). Las constantes son espejo de `api-008` RN-01 y RN-02; un cambio en la API exige cambiarlas en el mismo PR.
- **Quitar y reemplazar (CA-06).** «Quitar imagen» borra la vista previa y marca `removeImage` solo si había una imagen guardada. Elegir un archivo nuevo pone `removeImage` en `false` (P4 de `api-008`: gana el archivo).
- **Contraseña (CA-10, RN-04).** La contraseña escrita en el campo de restablecer vive en el estado local de `InlinePasswordReset`. Al confirmar, la vista la pasa al ViewModel, que la envía a `adminApi.users.resetPassword` sin guardarla en su estado. Tras el envío, el campo se vacía y se desmonta. Mismo patrón que `dashboard-003` RN-07.
- **Envío (CA-16).** El ViewModel construye la entrada del cliente (`NewsInput`/`EventInput` con `image` y `remove_image`). `@arca/api-client` decide si envía `FormData` (cuando hay archivo) o JSON. La vista no construye peticiones.
- **Miniaturas (CA-14).** `image_url` como `src` de `<img>` con `alt` que nombra el elemento; sin `image_url`, marcador. No hay procesamiento de imagen.
- **Tabla de Usuarios (CA-18).** Se mantiene la tabla de `dashboard-003` dentro de su contenedor con desplazamiento propio; las acciones en línea se muestran debajo de la fila a ancho completo para no romper la tabla en pantallas estrechas.
- **Estilos (RN-10, CA-19).** Reutilizar `.form-card`, `.form-grid--events`, `.upload-box` y la tabla de `styles.css`. Nuevas clases para vista previa, miniatura, confirmación en línea, panel colapsable y campo de contraseña, todas con tokens de `@arca/tokens`. Sin hexadecimales.
- **Responsive (CA-18).** Por debajo de 640 px, el formulario, la caja de imagen y las tarjetas se apilan; la tabla usa su contenedor desplazable.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| `packages/api-client` | `admin-types.ts`, `http.ts`, `admin.ts` (ajuste, ver `api-008` T-10) | Envío con `FormData` y `POST` + `_method=PATCH` para editar con archivo; tipos `image_url`, `image`, `remove_image` |
| Servicios | `src/services/image-preview.ts` (nuevo) | Crear y liberar URLs de vista previa, inyectable |
| ViewModels | `src/viewmodels/news-management.ts`, `events-management.ts`, `staff-accounts.ts` (ajuste) | `editing`, `pendingAction`, `formExpanded`, formulario con imagen (noticias y eventos) y flujo de restablecimiento |
| ViewModels (hooks) | `src/viewmodels/useNewsManagement.ts`, `useEventsManagement.ts`, `useStaffAccounts.ts` (ajuste) | Pasar `adminApi` y `image-preview` |
| Vistas | `src/views/NewsView.tsx`, `src/views/EventsView.tsx`, `src/views/UsersView.tsx` (reescritura de la presentación) | Panel fijo, caja de imagen, tarjetas o tabla con acciones en línea; sin `Dialog` |
| Componentes | `src/components/FormPanel.tsx`, `InlineConfirm.tsx`, `InlinePasswordReset.tsx` (nuevos); `ConfirmDialog.tsx` (retirar si no tiene usos) | Piezas locales de la interacción nueva |
| Secciones | `src/sections/NewsSection.tsx`, `EventsSection.tsx`, `UsersSection.tsx` (ajuste mínimo) | Pasar props nuevas a la View |
| Estilos | `src/styles.css` (clases nuevas con tokens) | Vista previa, miniatura, confirmación, panel colapsable y campo de contraseña |
| Pruebas | `src/tests/inline-content-forms.test.tsx` (nuevo); `src/tests/content-management.test.tsx` y `src/tests/staff-accounts.test.tsx` (reemplazo de aserciones de diálogo e imagen); `src/tests/api-client-admin.test.tsx` (bloque nuevo); `src/tests/administration-quality.test.tsx` y `administration-coverage.test.tsx` (ajuste) | Un test por CA |
| Documentación | `apps/dashboard/docs/arquitectura.md`, `apps/dashboard/docs/manual-demo.md` (ajuste) | Referencia vigente de formularios en línea |
| Specs anteriores | Nota de vigencia en `specs/003`, `plan/003` y `tasks/003` (ajuste de texto de la nota ya añadida) | Reflejar que Usuarios también cambia |

Sin cambios en `package.json`, en `@arca/ui` ni en `@arca/tokens` (CA-17, RN-06).

## Contrato y datos

- **Cliente.** Noticias y eventos: `news.create/update/setStatus/remove` y `events.*`; con archivo, el helper `content` (de `api-008` T-10) envía `FormData` y edita con `POST` + `_method=PATCH`; sin archivo, JSON como hasta hoy. Usuarios: los métodos de `dashboard-003` (`users.create/update/setStatus/remove/resetPassword/resetTwoFactor`) sin cambios.
- **Tipos.** `NewsDto` y `EventDto` añaden `image_url: string | null`. `NewsInput` y `EventInput` añaden `image?: File | null` y `remove_image?: boolean`.
- **Errores.** `api-errors.ts` (de `dashboard-003`) ya convierte 422 en `fieldErrors`; `image` aparece como campo más.
- **Datos.** Sin DBR. Ningún dato se persiste en el navegador (RN-04).

### ViewModels

| Hook | Estados | Operaciones |
|---|---|---|
| `useNewsManagement` / `useEventsManagement` | `loading`, `ready`, `empty`, `error`; `editing`, `pendingAction`, `formExpanded`, `form` (con `image`, `imagePreview`, `removeImage`), `notice` | cargar, elegir imagen (con validación de ayuda), quitar imagen, cancelar edición, guardar, abrir y cerrar confirmación, cambiar estado, eliminar, expandir o minimizar panel |
| `useStaffAccounts` | `loading`, `ready`, `empty`, `error`; filtros, página, `editing`, `pendingAction`, `formExpanded`, `form`, `notice` | cargar con filtros, cargar opciones, guardar (alta o edición), cancelar edición, abrir y cerrar confirmación, activar/desactivar, eliminar, restablecer contraseña (la contraseña no entra en el estado), restablecer 2FA, expandir o minimizar panel |

Reglas comunes: 401 lo gestiona el manejador global (CA-15); 403, 404, 422 y red se muestran en la sección; el formulario conserva lo escrito ante un 422 (CA-07).

## Seguridad, offline y operación

- Permisos: la vista oculta acciones según `me`, pero la API decide (RN-08).
- Archivo: `File` solo en memoria; no se guarda en `localStorage` ni en la URL (RN-04). La vista previa se libera con `revoke`.
- Contraseñas: viven en el campo local hasta confirmar; no pasan por consola ni por el estado del ViewModel tras enviarse (RN-04).
- Tipos y tamaño: error en la caja de imagen y sin adjuntar (CA-05); la API vuelve a validar.
- Sin modo offline: pantallas en línea; ante fallo de red, mensaje con reintento.
- Sin secretos ni datos personales nuevos.
- Accesibilidad: `<label>` y `aria-describedby` en el control de archivo; `aria-expanded` y `aria-controls` en `FormPanel`; foco visible en `:focus-within` de `.upload-box` (ya existente); `role="status"` en el aviso; `role="group"` y `aria-label` en las confirmaciones; botón de mostrar/ocultar con `aria-pressed` o texto accesible; Escape cancela.

## Mapeo de criterios a pruebas

Convención: bloque `describe("CA-NN inline-content-forms", …)` como en `dashboard-003`. Vitest en `apps/dashboard/src/tests/`. Los ViewModels se prueban con un `AdminApi` simulado (`vi.fn`) y un servicio de vista previa simulado; las Views con `renderToStaticMarkup`.

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | Formulario visible en la página, sin `<dialog>` ni botón de crear que abra diálogo en Noticias, Eventos ni Usuarios | `inline-content-forms.test.tsx` |
| CA-02 | «Editar» carga el registro (imagen actual en noticias y eventos; correo de solo lectura en Usuarios) y muestra «Cancelar edición» | `inline-content-forms.test.tsx` |
| CA-03 | `FormPanel` con `aria-expanded` y `aria-controls`; expandido por defecto; minimizar oculta el contenido sin perder valores; Enter y Espacio alternan; la lista sigue visible; el estado vive en el ViewModel | `inline-content-forms.test.tsx` |
| CA-04 | Caja de imagen con `<input type="file">` etiquetado, texto de formatos y límite; arrastrar y soltar con eventos nativos (`dragover`/`dragleave`/`drop`) e indicación visual; vista previa al elegir o soltar y sin subida | `inline-content-forms.test.tsx` |
| CA-05 | Archivo (elegido o soltado) con tipo o tamaño no válidos: error en la caja de imagen y archivo no adjunto | `inline-content-forms.test.tsx` |
| CA-06 | «Quitar imagen» borra la vista previa y envía `remove_image: true`; elegir un archivo nuevo deja `removeImage` en falso | `inline-content-forms.test.tsx` |
| CA-07 | 422 con `errors.image` y otros campos junto a cada campo en las tres secciones; se conserva lo escrito y el archivo | `inline-content-forms.test.tsx` |
| CA-08 | Eliminar en Noticias, Eventos y Usuarios abre `InlineConfirm` con el nombre y el efecto (en noticias y eventos, el elemento se elimina y deja de mostrarse, y su imagen se borra; en Usuarios, baja lógica); la API solo se llama al confirmar | `inline-content-forms.test.tsx` |
| CA-09 | Activar/desactivar en las tres secciones abre la confirmación con su efecto; la API solo se llama al confirmar | `inline-content-forms.test.tsx` |
| CA-10 | Restablecer contraseña: campo con mostrar/ocultar accesible; la API solo se llama al confirmar; la contraseña no queda en el estado tras enviar | `staff-accounts.test.tsx` (ampliado) y `inline-content-forms.test.tsx` |
| CA-11 | Restablecer 2FA abre confirmación en línea con el nombre de la cuenta y el efecto; la API solo se llama al confirmar | `staff-accounts.test.tsx` (ampliado) |
| CA-12 | Escape cancela; una sola acción en línea abierta por sección; foco inicial en «Cancelar»; `role="group"` y `aria-label`; revisión manual de teclado (T-37) | `inline-content-forms.test.tsx` y revisión manual |
| CA-13 | Tras éxito: recarga, aviso `role="status"`; si el elemento era el editado, el formulario vuelve al alta | `inline-content-forms.test.tsx` |
| CA-14 | Miniatura con `image_url` y `alt` con el nombre; marcador sin imagen; estado activo o inactivo en tarjetas y en filas de Usuarios | `inline-content-forms.test.tsx` |
| CA-15 | 403, 404, 422 y red: mensaje en la sección sin perder lista ni formulario; 401 dispara el manejador global | `inline-content-forms.test.tsx`, `administration-quality.test.tsx` |
| CA-16 | Revisión estática: `views/`, `components/` y `sections/` no importan `fetch`, `axios` ni `@arca/api-client`; sin cálculos ni permisos | `administration-quality.test.tsx` (ampliado) |
| CA-17 | `package.json` sin dependencias nuevas (comparación con la versión de `dashboard-003`) | `administration-quality.test.tsx` (ampliado) |
| CA-18 | Marcado responsive: clases de apilado de `.upload-box`, formulario y tarjetas; contenedor desplazable de la tabla; comprobación de anchos a mano (T-37) | `administration-quality.test.tsx` y revisión manual |
| CA-19 | Sin hex de marca en `styles.css` ni en las vistas nuevas | `administration-quality.test.tsx` (patrón de `design-system.test.tsx`) |
| CA-20 | Cobertura: busca `CA-01` a `CA-19 inline-content-forms` en los tests | `administration-coverage.test.tsx` (ampliado) |

Además: `api-client-admin.test.tsx` (bloque `describe("CA-04 inline-content-forms")`) comprueba que `create`/`update` envían `FormData` cuando hay archivo, que la edición con archivo usa `POST` + `_method=PATCH`, y JSON cuando no hay archivo. Verifica `api-008` T-10 desde la suite del dashboard.

`content-management.test.tsx` y `staff-accounts.test.tsx` (de `dashboard-003`) se reemplazan en lo que describen diálogos e imagen: sus aserciones de «sin campo de imagen», de «sin modal» y de `ConfirmDialog` quedan sustituidas por los CA de esta spec (RN-09). Sus aserciones de listas, filtros, roles asignables y errores (`dashboard-003` CA-03, CA-04, CA-05, CA-07) se conservan.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí (propuesto) | React 19, TypeScript, Vite 7 y Tailwind 4 vigentes; sin dependencias nuevas (CA-17). Solo API nativa del navegador (`URL.createObjectURL`). |
| II. La spec manda | Pendiente | `dashboard-004` está en Borrador y depende de `api-008` para la parte de imágenes. No se escribe código antes de aprobar ambas. |
| III. Lógica separada de la interfaz | Sí (propuesto) | Views sin `fetch` ni cálculo (CA-16); la validación de ayuda vive en el ViewModel y es solo orientativa; la regla la aplica la API. |
| IV. Un test por criterio | Sí (propuesto) | La tabla cubre CA-01 a CA-19; `administration-coverage` lo verifica (CA-20). |
| V. Una sola fuente de verdad para los datos | Sí (propuesto) | La interfaz no guarda datos; el archivo y la contraseña viven en el estado de la sección o del campo y no se persisten. Sin cambio de esquema. |
| VI. Código en inglés, personas en español | Sí (propuesto) | Archivos, hooks, props y tipos en inglés; etiquetas, avisos y errores en español. |

Ninguna excepción se propone. No se requiere ADR.

## Riesgos y decisiones

- **ADR requerido/aprobado:** ninguno (sin dependencias nuevas).
- **Dependencia de `api-008`:** sin el contrato real no hay prueba de extremo a extremo de noticias y eventos. Mitigación: cliente simulado y, al estar disponible, prueba manual en `arca_pruebas` (T-38). Usuarios no depende de `api-008`.
- **Alcance ampliado a Usuarios (D3):** aumenta el número de piezas en una sola entrega. Mitigación: el orden de implementación separa Noticias y Eventos de Usuarios, y cada sección se puede revisar por separado antes de cerrar la spec.
- **Reglas duplicadas (tipo y tamaño):** espejo de la API. Mitigación: comentario en el código y revisión conjunta de cambios.
- **Contraseña en pantalla:** el botón «Mostrar» revela el texto. Mitigación: el campo vuelve a ocultarse al confirmar o cancelar.
- **Alternativas descartadas:** (1) mantener `Dialog` y solo cambiar el botón (no cumple RN-01); (2) librería de subida, de acordeones o de arrastrar y soltar (requiere ADR y no es necesaria, RN-06; el arrastrar y soltar usa eventos nativos); (3) generar miniaturas en el navegador (lógica de imagen en la interfaz; fuera de alcance); (4) guardar el estado de colapso en `localStorage` (RN-11 lo prohíbe; no hay requisito de persistencia).

## Orden y aprobación

**Secuencia de implementación (tras aprobar spec y plan de `dashboard-004`; la parte de imágenes también tras `api-008`):**

1. `packages/api-client` (`api-008` T-10) y su prueba `CA-04` (T-02 de esta lista).
2. Componentes base: `FormPanel.tsx`, `InlineConfirm.tsx`, `InlinePasswordReset.tsx`; clases en `styles.css` (CA-03, CA-08, CA-10, CA-12, CA-19).
3. `services/image-preview.ts` y sus pruebas.
4. ViewModels de Noticias y Eventos (CA-02, CA-05, CA-06, CA-07, CA-13).
5. Vistas y secciones de Noticias y Eventos (CA-01, CA-04, CA-08, CA-09, CA-14).
6. ViewModel de Usuarios: edición, confirmaciones y restablecimientos (CA-02, CA-10, CA-11, CA-13).
7. Vista y sección de Usuarios: panel fijo, tabla con acciones en línea (CA-01, CA-08, CA-09, CA-14, CA-18).
8. Retirada de `ConfirmDialog` si no tiene usos y de `Dialog` en estas secciones.
9. Pruebas: `inline-content-forms.test.tsx`, reemplazo de aserciones en `content-management` y `staff-accounts`, ampliación de `administration-quality` y `administration-coverage`.
10. Documentación: `arquitectura.md`, `manual-demo.md`; actualizar las notas de vigencia de `dashboard-003`.
11. Verificación: `npm run types`, `npm test` y `npm run build` en `apps/dashboard`; `/verify`; revisión manual con teclado y a 360, 768 y 1366 px; recorrido contra la API real en `arca_pruebas` con `presidencia@arca.local` y `direccion_zoo@arca.local` (sin contraseñas en el registro).

**Dependencias:** `api-008` (contrato y endpoint, noticias y eventos), `api-007` (rutas, permisos y cuentas), `dashboard-003` (contenedores, sesión y tokens), `dashboard-002` (401).

**Aprobaciones requeridas:**

| Rol | Aprueba | Estado |
|---|---|---|
| Responsable funcional | Spec (D1 a D3 y panel colapsable registrados) | Pendiente |
| Equipo | Solución técnica y Constitution Check de este plan | Pendiente |
| Responsable técnico de `api-008` | Contrato de subida (decisiones P1 a P8 de `api-008`) | Pendiente |

Evidencias: `apps/dashboard/specs/003-administration-sections.md`, `apps/dashboard/plan/003-administration-sections.md`, `apps/api/specs/008-event-news-images.md`, `apps/api/plan/008-event-news-images.md`, `apps/dashboard/AGENTS.md`.
