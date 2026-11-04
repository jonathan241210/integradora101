# Tareas · 004 · inline-content-forms

- Spec: `apps/dashboard/specs/004-inline-content-forms.md` (Aprobada, 2026-11-02)
- Plan: `apps/dashboard/plan/004-inline-content-forms.md` (Aprobado 2026-11-02 por el usuario al ordenar implementar)
- Dependencia: `apps/api/specs/008-event-news-images.md` y su plan (aprobados) para noticias y eventos; `api-007` para Usuarios (sin cambios)
- Estado del checklist: En progreso. Spec Aprobada y En progreso; plan aprobado; quedan abiertas T-37, T-38, T-39 y T-42.

Rutas relativas a `apps/dashboard` salvo que se indique `packages/…`. Cada prueba nombra su criterio con el bloque `describe("CA-NN inline-content-forms", …)`. Se desarrolla contra un `AdminApi` simulado (RN-07) hasta que `api-008` esté disponible. No se instalan dependencias ni se toca `package.json`. No se tocan `.github/workflows` (fuera de alcance).

Decisiones ya tomadas (2026-11-01): D1 archivo no válido no se adjunta y muestra error; D2 con arrastrar y soltar (eventos nativos), sin recorte ni varias imágenes; D3 «sin modales» también en Usuarios; panel colapsable en las tres secciones, expandido por defecto.

## Base de datos (responsable de BD)

No hay tareas de BD. Esta feature no cambia el esquema ni requiere DBR (`api-008` RN-10).

## Implementación

### Cliente de API (`@arca/api-client`) y servicios

- [x] **T-01** (CA-04, CA-16, RN-04): Crear `src/services/image-preview.ts` con `create(file)` y `revoke(url)` basados en `URL.createObjectURL`/`URL.revokeObjectURL`, inyectable en los ViewModels de noticias y eventos. Ninguna vista llama a `URL`.
- [x] **T-02** (CA-04, CA-16): Verificar, tras `api-008` T-10, que `packages/api-client` (`admin-types.ts`, `http.ts`, `admin.ts`) envía `FormData` cuando hay archivo, usa `POST` + `_method=PATCH` para editar con archivo y JSON cuando no lo hay, y que `NewsInput`/`EventInput` tienen `image?: File | null` y `remove_image?: boolean`. Usuarios no cambia. Si hay que ajustar algo en el paquete, se documenta en `packages/api-client/README.md`. Prueba en T-33.

### Componentes y estilos base

- [x] **T-03** (CA-08, CA-09, CA-12, RN-02, RN-06): Crear `src/components/InlineConfirm.tsx`: confirmación dentro de la tarjeta o fila con mensaje, «Confirmar» y «Cancelar»; foco inicial en «Cancelar»; Escape cancela; `role="group"` con `aria-label`. Sin dependencias.
- [x] **T-04** (CA-10, CA-12, RN-04): Crear `src/components/InlinePasswordReset.tsx`: campo de nueva contraseña con botón de mostrar/ocultar accesible, «Confirmar» y «Cancelar». El valor vive en el estado local del campo; se vacía y se desmonta al confirmar o cancelar.
- [x] **T-05** (CA-03, CA-16, RN-11): Crear `src/components/FormPanel.tsx`: panel colapsable con botón que tiene `aria-expanded` y `aria-controls`, contenido con `hidden` cuando está minimizado y estado recibido por props. Enter y Espacio funcionan con el `<button>`.
- [x] **T-06** (CA-19, CA-18, RN-10): En `src/styles.css`, clases nuevas solo con tokens semánticos para vista previa de imagen, miniatura en tarjeta, marcador sin imagen, `InlineConfirm`, panel colapsable y campo de contraseña. Reutilizar `.form-card`, `.form-grid--events` y `.upload-box`. Sin hexadecimales.

### Noticias y eventos

- [x] **T-07** (CA-01, CA-02, CA-03, CA-05, CA-06, CA-07, CA-13, RN-01, RN-03, RN-04, RN-11): Ajustar `src/viewmodels/news-management.ts` y `events-management.ts`: quitar `dialog`; añadir `editing`, `pendingAction`, `formExpanded` (por defecto `true`), `form` con `image`, `imagePreview` y `removeImage`; validación de tipo y tamaño como ayuda (constantes espejo de `api-008` RN-01 y RN-02) que deja el archivo sin adjuntar y con error; `removeImage` solo si había imagen guardada; elegir archivo nuevo deja `removeImage` en `false`; liberar la vista previa al cambiar, cancelar o salir; 422 por campo conserva lo escrito.
- [x] **T-08** (CA-01, CA-02, CA-04, CA-05, CA-06, CA-16): Ajustar `src/viewmodels/useNewsManagement.ts` y `useEventsManagement.ts` para pasar `adminApi` y el servicio de vista previa al reducer.
- [x] **T-09** (CA-01, CA-02, CA-03, CA-04, CA-05, CA-06, CA-16): Reescribir `src/views/NewsView.tsx` y `src/views/EventsView.tsx`: `FormPanel` que envuelve el formulario en `Card.form-card` con `form.form-grid--events`; caja de imagen con `label.upload-box` y `input type="file"` (`accept` JPG, PNG, WebP), texto «JPG, PNG o WebP · máximo 5 MB» enlazado con `aria-describedby`; error de archivo no válido en la caja; vista previa; «Quitar imagen»; «Cancelar edición» cuando se edita. Quitar `Dialog` y `ConfirmDialog` de estas vistas. Sin `fetch` ni importaciones de `services/` o `@arca/api-client`.
- [x] **T-10** (CA-08, CA-09, CA-12, CA-14, CA-16): En las mismas vistas, tarjetas de lista con miniatura (`image_url`, `alt` con el nombre o marcador sin imagen), estado activo o inactivo, «Editar», «Activar/Desactivar» y «Eliminar»; la acción pendiente se muestra con `InlineConfirm` dentro de la tarjeta; una sola a la vez.
- [x] **T-11** (CA-13, CA-15): Ajustar `src/sections/NewsSection.tsx` y `EventsSection.tsx` (props nuevas) y los avisos `role="status"` y errores de sección (403, 404, 422, red) sin perder lista ni formulario. El 401 sigue el manejador global.

### Usuarios

- [x] **T-12** (CA-01, CA-02, CA-03, CA-07, CA-13, RN-01, RN-04, RN-05, RN-11): Ajustar `src/viewmodels/staff-accounts.ts` y `useStaffAccounts.ts`: quitar el diálogo activo; añadir `editing`, `pendingAction`, `formExpanded` (por defecto `true`) y `form` (nombre, apellidos, área, rol; correo editable solo en alta); el área propone el rol sugerido de `options`; 422 por campo conserva lo escrito; la contraseña nunca entra en el estado del ViewModel.
- [x] **T-13** (CA-08, CA-09, CA-10, CA-11, CA-12, RN-02, RN-04): En el mismo ViewModel, acciones en línea: `pendingAction` para eliminar, activar/desactivar, restablecer contraseña y restablecer 2FA; la contraseña llega desde `InlinePasswordReset` solo al confirmar y se envía a `adminApi.users.resetPassword` sin guardarse.
- [x] **T-14** (CA-01, CA-02, CA-03, CA-08, CA-09, CA-10, CA-11, CA-12, CA-16, CA-18): Reescribir `src/views/UsersView.tsx`: `FormPanel` con el formulario de alta y edición (correo en solo lectura al editar; errores 422 por campo); tabla de `dashboard-003` dentro de su contenedor con desplazamiento propio; acciones por fila con confirmación en línea debajo de la fila a ancho completo; restablecer contraseña y 2FA en línea. Quitar `Dialog` y `ConfirmDialog` de la vista.
- [x] **T-15** (CA-13, CA-15): Ajustar `src/sections/UsersSection.tsx` (props nuevas), avisos `role="status"` y errores de sección (403, 404, 422, red) sin perder lista ni formulario.
- [x] **T-16** (CA-01, RN-01, RN-09): Retirar `ConfirmDialog.tsx` si después de los cambios no tiene usos en el dashboard (búsqueda previa y evidencia en el PR). Si lo usa otra sección, se mantiene y se anota. **Resultado:** se mantiene; `grep` tras el cambio: lo siguen usando `views/TicketSaleView.tsx` y `views/TicketPricesView.tsx` (`dashboard-005`). Noticias, Eventos y Usuarios ya no lo importan.

## Pruebas (un test por CA)

- [x] **T-17** (CA-01): `src/tests/inline-content-forms.test.tsx`: Noticias, Eventos y Usuarios renderizan el formulario en la página, sin `<dialog>` ni modales; no existe botón de crear que abra diálogo.
- [x] **T-18** (CA-02): Mismo archivo: «Editar» carga los datos (imagen actual en noticias y eventos; correo de solo lectura en Usuarios) y aparece «Cancelar edición» que vuelve al alta.
- [x] **T-19** (CA-03): Mismo archivo: `FormPanel` con `aria-expanded` y `aria-controls`; expandido por defecto; minimizar oculta el contenido sin perder valores ni la imagen seleccionada; Enter y Espacio alternan; la lista sigue visible; el estado vive en el ViewModel.
- [x] **T-20** (CA-04): Caja de imagen con control de archivo etiquetado, texto de formatos y límite enlazado; la vista previa se crea al elegir o soltar un archivo válido y no se llama a subida hasta guardar. Incluye arrastrar y soltar sobre la caja (eventos nativos `dragover`/`dragleave`/`drop`, indicación visual mientras se arrastra); el selector sigue operable con teclado.
- [x] **T-21** (CA-05): Archivo con tipo o tamaño no válidos, elegido o soltado sobre la caja: error en la caja de imagen y el archivo no se adjunta (D1).
- [x] **T-22** (CA-06): «Quitar imagen» borra la vista previa y deja `remove_image: true` en la entrada; elegir un archivo nuevo deja `removeImage` en falso.
- [x] **T-23** (CA-07): 422 con `errors.image` y otros campos en Noticias, Eventos y Usuarios: cada mensaje junto a su campo; se conserva lo escrito y el archivo.
- [x] **T-24** (CA-08): Eliminar abre `InlineConfirm` en Noticias, Eventos y Usuarios con el nombre y el efecto (en noticias y eventos, el elemento se elimina y deja de mostrarse, y su imagen se borra; en Usuarios, baja lógica); la API no se llama hasta «Confirmar»; «Cancelar» no hace nada. El texto de noticias y eventos depende de `api-008` CA-07 (P2).
- [x] **T-25** (CA-09): Activar/desactivar abre la confirmación con su efecto en las tres secciones; la API no se llama hasta confirmar.
- [x] **T-26** (CA-10): Restablecer contraseña en línea: campo con mostrar/ocultar accesible; la API no se llama hasta confirmar; la contraseña no queda en el estado del ViewModel tras enviar (`staff-accounts.test.tsx`, ampliado).
- [x] **T-27** (CA-11): Restablecer 2FA abre confirmación en línea con el nombre de la cuenta y el efecto; la API no se llama hasta confirmar (`staff-accounts.test.tsx`, ampliado).
- [x] **T-28** (CA-12): Escape cancela; solo una acción en línea abierta por sección; foco inicial en «Cancelar»; `role="group"` y `aria-label` presentes.
- [x] **T-29** (CA-13): Tras éxito: recarga de la lista y aviso `role="status"`; si el elemento era el editado, el formulario vuelve al alta.
- [x] **T-30** (CA-14): Miniatura con `image_url` y `alt` con el nombre; marcador sin imagen; estado activo o inactivo en tarjetas y en filas de Usuarios.
- [x] **T-31** (CA-15): 403, 404, 422 y red en la sección sin perder lista ni formulario; 401 dispara el manejador global («Tu sesión expiró»), reutilizando `administration-quality.test.tsx`.
- [x] **T-32** (CA-16, CA-17, CA-19): `src/tests/administration-quality.test.tsx` (ampliado): revisión estática de `views/`, `components/` y `sections/` (sin `fetch`, `axios` ni `@arca/api-client`; sin cálculos ni permisos); `package.json` sin dependencias nuevas; sin hex de marca en `styles.css` ni en las vistas nuevas.
- [x] **T-33** (CA-04, CA-16): `src/tests/api-client-admin.test.tsx`, bloque `describe("CA-04 inline-content-forms")`: `create`/`update` envían `FormData` con archivo; la edición con archivo usa `POST` + `_method=PATCH`; JSON sin archivo; `remove_image` se envía. Con `fetch` simulado. Cubre `api-008` T-10 desde la suite del dashboard.
- [x] **T-34** (CA-18): Marcado responsive (clases de apilado de `.upload-box`, formulario y tarjetas; contenedor desplazable de la tabla de Usuarios) en `administration-quality.test.tsx`. La comprobación de anchos se hace a mano en T-37.
- [x] **T-35** (CA-01, CA-08, CA-09, CA-10, CA-11, RN-09): Actualizar `src/tests/staff-accounts.test.tsx` (de `dashboard-003` T-18): sustituir las aserciones de `ConfirmDialog` y de diálogo de alta y edición (`dashboard-003` CA-06) por las de esta spec; conservar las de columnas, filtros, roles asignables, 403/404/422 y recarga.
- [x] **T-36** (CA-01, CA-08, CA-09, CA-19, RN-09): Reescribir `src/tests/content-management.test.tsx` (de `dashboard-003` T-19): sustituir «sin campo de imagen» y «sin modal» por los CA de esta spec; conservar lista, estado y 422 por campo.
- [x] **T-43** (CA-20): `src/tests/administration-coverage.test.tsx` (ampliado): verifica que `CA-01` a `CA-19 inline-content-forms` aparecen nombrados en los tests.

## Calidad y entrega

- [ ] **T-37** (CA-12, CA-18): Revisión manual documentada en el PR: navegación con teclado en formularios, paneles colapsables, confirmaciones y campo de contraseña (foco visible, Escape); ausencia de desbordamiento horizontal a 360, 768 y 1366 px en Noticias, Eventos y Usuarios.
- [ ] **T-38** (CA-01 a CA-15): Recorrido de extremo a extremo contra la API real en `arca_pruebas` con `presidencia@arca.local` o `direccion_zoo@arca.local`. Usuarios puede verificarse con la API de `api-007`; Noticias y Eventos (subir, reemplazar, quitar y eliminar; comprobar que el archivo desaparece de `storage/app/public/{news,events}`) **dependen de `api-008` implementada**. Registrar evidencia sin contraseñas ni secretos.
- [ ] **T-39**: Desde `apps/dashboard` ejecutar `npm run types`, `npm test` y `npm run build`; correr `/verify` y registrar resultados en el PR. Sin ejecutar nada en `arca_zoo`.
- [x] **T-40**: Actualizar `apps/dashboard/docs/arquitectura.md` (formularios en línea, paneles colapsables, `image-preview`, `InlineConfirm`, `InlinePasswordReset`) y `apps/dashboard/docs/manual-demo.md` (Noticias, Eventos y Usuarios ya no usan diálogos ni son demostrativos).
- [x] **T-41**: Actualizar las notas de vigencia de `apps/dashboard/specs/003-administration-sections.md`, `plan/003-administration-sections.md` y `tasks/003-administration-sections.md` para que digan que Usuarios también cambia de interacción (D3). Sin cambiar criterios ni estados.
- [ ] **T-42**: Completar el Constitution Check del PR, enlazar spec, plan y tasks de `dashboard-004` y de `api-008`, citar `dashboard-004` en los commits y pasar la spec a Implementada solo cuando CA-01 a CA-20 estén verificados con evidencia y exista aprobación funcional.

## Trazabilidad

- CA-01 → T-07, T-08, T-09, T-12, T-14, T-16 (implementación); T-17, T-35, T-36 (prueba).
- CA-02 → T-07, T-09, T-12, T-14 (implementación); T-18 (prueba).
- CA-03 → T-05, T-07, T-09, T-12, T-14 (implementación); T-19 (prueba).
- CA-04 → T-01, T-02, T-08, T-09 (implementación); T-20, T-33 (prueba).
- CA-05 → T-07, T-09 (implementación); T-21 (prueba).
- CA-06 → T-07, T-09 (implementación); T-22 (prueba).
- CA-07 → T-07, T-12, T-14 (implementación); T-23 (prueba).
- CA-08 → T-03, T-10, T-13, T-14 (implementación); T-24 (prueba).
- CA-09 → T-03, T-10, T-13, T-14 (implementación); T-25 (prueba).
- CA-10 → T-04, T-13, T-14 (implementación); T-26 (prueba).
- CA-11 → T-13, T-14 (implementación); T-27 (prueba).
- CA-12 → T-03, T-04, T-10, T-14 (implementación); T-28 (prueba) y T-37 (manual).
- CA-13 → T-07, T-11, T-12, T-15 (implementación); T-29 (prueba).
- CA-14 → T-10, T-14 (implementación); T-30 (prueba).
- CA-15 → T-11, T-15 (implementación); T-31 (prueba).
- CA-16 → T-01, T-08, T-09, T-14 (implementación); T-32 (prueba).
- CA-17 → T-32 (prueba estática del `package.json`).
- CA-18 → T-06, T-14 (implementación); T-34 (prueba de marcado) y T-37 (manual).
- CA-19 → T-06 (implementación); T-32 (prueba).
- CA-20 → T-43 (prueba de cobertura).
- RN-01 a RN-11: T-03, T-05, T-07, T-12, T-14, T-16 (implementación) y las pruebas anteriores. RN-09: T-35, T-36 (reemplazo de aserciones de `dashboard-003`) y T-41.

Orden por dependencias: contrato de `api-008` (su T-10) → T-01, T-02 → T-03, T-04, T-05, T-06 → T-07, T-08, T-09, T-10, T-11 (noticias y eventos) → T-12, T-13, T-14, T-15, T-16 (usuarios; no depende de `api-008`) → T-17 a T-36, T-43 (cada prueba junto a su tarea) → T-37 → T-38 (espera `api-008` para noticias y eventos) → T-39 → T-40, T-41, T-42.
