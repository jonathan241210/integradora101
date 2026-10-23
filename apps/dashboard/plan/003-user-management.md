# Plan técnico · 003 · user-management

- Spec: `apps/dashboard/specs/003-user-management.md`
- Estado de spec: Implementada (pendiente de revisión del usuario)
- Responsable técnico: Dashboard

Verificación local: Vitest (14 archivos, 57 pruebas), `npx tsc --noEmit` y `npm run build` aprobados. La suite Feature de `api-006` pasó sobre `arca_pruebas` (63 pruebas).

## Diseño de solución

`@arca/api-client` define DTOs y `createUsersApi(http)` para consumir `staff-users.*`. `useUsers(api, enabled)` carga lista y catálogo, prepara altas/ediciones, traduce errores API y coordina desactivación confirmada. `UsersView` presenta formulario, tabla y estados accesibles, sin realizar solicitudes. La API conserva toda autorización y lógica de negocio.

La navegación muestra `users` para `users.manage` y `ticket-users` para `operational-staff.manage` solo cuando no se tiene también `users.manage`; ambas secciones utilizan la misma vista conectada a API. Se retiran la vista y los fixtures/acciones demo de usuarios.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Cliente | `packages/api-client/types.ts`, `users.ts`, `http.ts`, `index.ts` y sus tests | DTOs y métodos `list`, `catalog`, `create`, `update`, `deactivate` |
| Servicio | `apps/dashboard/src/services/arca-api.ts` | Exportar la instancia compartida `usersApi` |
| ViewModel | `src/viewmodels/useUsers.ts` | Carga, edición parcial, errores, confirmación, éxito y recarga |
| Vistas | `src/views/UsersView.tsx` y estilos existentes | Tabla desplazable, formularios, estados y diálogo accesible |
| Navegación/demo | `navigation.ts`, `App.tsx`, `dashboard-demo.ts`, hook y fixtures | Permisos de presentación y retiro del estado demostrativo de usuarios |
| Pruebas/docs | Vitest, specs 001/002, arquitectura y manual local | Cobertura CA-01..CA-09 y documentación vigente |

## Contrato y datos

- `createUsersApi(http)` desenvuelve `{ data }` y expone `GET /api/v1/staff-users`, `GET /api/v1/staff-users/catalog`, `POST /api/v1/staff-users`, `PATCH /api/v1/staff-users/{id}` y `DELETE /api/v1/staff-users/{id}`.
- `PATCH` utiliza `http.request` para heredar XSRF, reintento 419 y manejo de 401; el cliente HTTP ya acepta respuestas 204 sin parsear JSON.
- La interfaz usa los roles y departamentos recibidos del catálogo; no calcula permisos ni reglas de negocio.
- La contraseña vive solo en el formulario en memoria y se limpia al guardar o cancelar.
- No se agregan dependencias, rutas de cliente ni almacenamiento local.

## Seguridad, offline y operación

- La API conserva autoridad sobre acceso y datos; navegación por permisos es solo presentación.
- Los errores 422 muestran resumen y mensajes relacionados con campos; 403/429 muestran texto de API en `role="alert"`; el manejador global resuelve 401.
- La vista usa labels/IDs, `aria-invalid`, `aria-describedby`, feedback anunciado, foco visible, confirmación accesible, tokens semánticos y tabla adaptable de 360 a 1366 px.
- No se almacenan datos personales ni contraseñas en local/session storage. Las vistas no usan `fetch`/`axios`.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | `CA-01 navegación muestra la sección según permisos` | Dashboard, `src/tests/users-management.test.tsx` |
| CA-02 | `CA-02 lista estados loading, vacío, error y tabla` | Dashboard, mismo archivo |
| CA-03 | `CA-03 alta usa catálogo, propone rol y limpia contraseña` | Dashboard, mismo archivo |
| CA-04 | `CA-04 edición envía solo campos cambiados y cancelar limpia` | Dashboard, mismo archivo |
| CA-05 | `CA-05 desactivación exige confirmación accesible` | Dashboard, mismo archivo |
| CA-06 | `CA-06 errores 422, 403, 429 y 401 son accesibles` | Dashboard, mismo archivo |
| CA-07 | `CA-07 usa usersApi solo desde useUsers y retira demo` | Dashboard, mismo archivo |
| CA-08 | `CA-08 sin banner, tokens semánticos y contenido adaptable` | Dashboard, mismo archivo |
| CA-09 | `CA-09 cobertura nombrada para todos los criterios` | Dashboard, mismo archivo |

Las rutas, métodos, XSRF, 419, 204 y unwrap del cliente se cubren en `src/tests/api-client-users.test.tsx`.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | React/Vitest/API client existentes; sin dependencias nuevas |
| II. La spec manda | Sí | La sección y los flujos siguen `dashboard-003` |
| III. Lógica separada de la interfaz | Sí | API client → ViewModel → vista; sin llamadas HTTP desde la vista |
| IV. Un test por criterio | Sí | CA-01..CA-09 mapeados a Vitest |
| V. Una sola fuente de verdad para los datos | Sí | Los usuarios provienen de la API; ningún estado demo/local persistente |
| VI. Código en inglés, personas en español | Sí | Identificadores ingleses; textos y mensajes UI españoles |

## Riesgos y decisiones

- ADR requerido/aprobado: ninguno; se conserva ADR 0002 y el cliente local existente.
- La suite no cuenta con jsdom/testing-library; se probarán ViewModels y renderizado estático siguiendo el patrón local, y se ejercitará el diálogo mediante estado accesible.
- `packages/ui` es dependencia local ya declarada; no se agrega una instalación ni dependencia independiente.
- La limpieza del demo no debe retirar otros flujos o fixtures que aún use el dashboard.

## Orden y aprobación

1. Implementar y probar `createUsersApi`; después el servicio y `useUsers`.
2. Actualizar navegación, retirar demo de usuarios, implementar `UsersView` e integrar en ambas secciones.
3. Completar cobertura CA-01..CA-09, actualizar specs y documentación y ejecutar Vitest/TypeScript/build según scripts existentes.

La implementación sigue el diseño autorizado expresamente en el handoff del lead. No se asignan tareas a personas por nombre.
