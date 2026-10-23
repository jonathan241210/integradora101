# Tareas · 003 · user-management

- Spec: `apps/dashboard/specs/003-user-management.md`
- Plan: `apps/dashboard/plan/003-user-management.md`

Precondición: endpoints de `api-006` y cliente local `@arca/api-client`; no se requieren dependencias ni cambios de base de datos.

## Implementación

- [x] **T-01** (CA-03, CA-04, CA-05, CA-06, CA-07): agregar DTOs y `createUsersApi(http)` para list/catalog/create/update/deactivate, con unwrap `{data}` y PATCH mediante `http.request`.
- [x] **T-02** (CA-02, CA-03, CA-04, CA-05, CA-06): exportar `usersApi` y crear `useUsers(api, enabled)` para carga, formulario, cambios parciales, errores, feedback y desactivación confirmada.
- [x] **T-03** (CA-01, CA-07): mostrar `users` para `users.manage` y `ticket-users` solo para `operational-staff.manage` sin `users.manage`; retirar vista, test, acciones, estado y fixtures demo de usuarios.
- [x] **T-04** (CA-02, CA-03, CA-04, CA-05, CA-06, CA-08): crear `UsersView` con tabla desplazable, formulario accesible, estados, mensajes API, diálogo de confirmación, tokens semánticos y diseño adaptable.

## Pruebas (cada una nombra su CA)

- [x] **T-05** (CA-01): agregar prueba Vitest `CA-01` para permisos de navegación de admin, zoo-admin, executive y cashier.
- [x] **T-06** (CA-02): agregar prueba Vitest `CA-02` para loading, tabla, vacío, error y retry.
- [x] **T-07** (CA-03): agregar prueba Vitest `CA-03` para catálogo, rol sugerido, alta, éxito y limpieza de contraseña.
- [x] **T-08** (CA-04): agregar prueba Vitest `CA-04` para edición parcial, cancelación y refresco.
- [x] **T-09** (CA-05): agregar prueba Vitest `CA-05` para confirmación accesible y desactivación.
- [x] **T-10** (CA-06): agregar prueba Vitest `CA-06` para 422, 403, 429, `role="alert"` y el handler global 401.
- [x] **T-11** (CA-07): agregar prueba Vitest `CA-07` para uso exclusivo desde ViewModel y retirada de demo; cubrir paths, métodos, CSRF/419 y 204 en el cliente.
- [x] **T-12** (CA-08): agregar prueba Vitest `CA-08` para ausencia de banner, tokens semánticos, accesibilidad y ausencia de desbordamiento en los anchos cubiertos por los estilos.
- [x] **T-13** (CA-09): agregar prueba que compruebe que existe cobertura nombrada para cada CA-01..CA-09.

## Calidad y entrega

- [x] **T-14**: actualizar `dashboard-001`/`dashboard-002`, arquitectura y manual de demo para reflejar la gestión real y conservar las demás áreas demo.
- [x] **T-15**: ejecutar Vitest, TypeScript y build con los scripts existentes; registrar resultados y actualizar el estado de la spec. Resultado: `npx vitest run` pasó (14 archivos, 57 pruebas), `npx tsc --noEmit` y `npm run build` pasaron. La suite Feature de `api-006` pasó sobre `arca_pruebas`; la spec queda `Implementada`, pendiente de revisión del usuario.
