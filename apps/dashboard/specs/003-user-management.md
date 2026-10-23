# 003 · user-management

- App dueña: `dashboard`
- Apps/paquetes afectados: `dashboard`, `packages/api-client`
- Estado: Implementada (2026-10-23, rama `Jona-cambios`; pendiente de revisión del usuario)
- Solicitante / responsable funcional: Jonathan
- Aprobación funcional: Jonathan, 2026-10-23 (solicitud explícita de implementación en la rama experimental `Jona-cambios`; requiere revisión del equipo antes de integrarse a `main`)

## Problema y contexto

La vista «Usuarios de taquilla» (`TicketUsersView` y la acción `add-ticket-user` de `dashboard-demo.ts`) es demostrativa: guarda registros en memoria y no crea cuentas reales (`dashboard-001` CA-12, `dashboard-002` CA-10). Con los endpoints `staff-users.*` de `api-006`, el dashboard puede administrar cuentas reales del personal: Presidencia (`admin`, `users.manage`) administra todas las cuentas y el Administrador del zoológico (`zoo-admin`, `operational-staff.manage`) solo las de taquilla y veterinaria.

## Objetivos

- Sección «Gestión de usuarios» real para `users.manage` y sección «Personal operativo» para `operational-staff.manage` sin `users.manage`, ambas con la misma vista conectada a la API.
- Listar, dar de alta, editar y desactivar cuentas mediante `@arca/api-client` desde un hook ViewModel (`useUsers`), sin `fetch` en componentes.
- Manejo accesible de errores 422/403/429 y expiración 401 igual que el resto del dashboard.
- Retirar la vista y el estado demostrativos de usuarios, que dejan de usarse.

## Fuera de alcance

- Reactivar cuentas, restablecer 2FA de terceros, recuperación de contraseña o permisos individuales.
- Paginación o búsqueda en servidor (el personal es reducido; la lista llega completa).
- React Router ni dependencias nuevas (ADR 0002).
- Conectar a la API otras secciones demostrativas.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| `admin` (Presidencia) | Administrar todas las cuentas del personal | `users.manage` |
| `zoo-admin` | Administrar cuentas de taquilla y veterinaria | `operational-staff.manage` |
| `executive`, `cashier` | No ven la sección | — |

## Historias de usuario

- Como `admin`, quiero ver, crear, editar y desactivar las cuentas reales del personal desde el panel.
- Como `zoo-admin`, quiero administrar cajeros y veterinarios sin ver opciones de roles que no puedo asignar.
- Como persona usuaria de teclado o lector de pantalla, quiero que los errores del formulario se anuncien y queden asociados a cada campo.

## Criterios de aceptación

- **CA-01:** Dado un perfil `administration`, cuando se construya la navegación, entonces «Gestión de usuarios» (`users`) aparece solo con `users.manage` y «Personal operativo» (`ticket-users`) aparece solo con `operational-staff.manage` sin `users.manage`; `executive` y `cashier` no ven ninguna.
- **CA-02:** Dada la sección de usuarios, cuando cargue, entonces muestra estado de carga, después la lista real de `GET /api/v1/staff-users` (nombre completo, correo, área, rol en español y estado) en una tabla desplazable, o un estado vacío o de error con opción de reintentar.
- **CA-03:** Dado el formulario de alta, cuando se capture nombre, primer apellido, segundo apellido (opcional), correo, área, rol y contraseña, entonces las opciones de área y rol provienen de `GET /api/v1/staff-users/catalog`, elegir un área propone su rol sugerido, la contraseña tiene control accesible de mostrar/ocultar, y al guardar se llama a `create`, se anuncia el éxito y se refresca la lista.
- **CA-04:** Dada una cuenta de la lista, cuando se elija «Editar», entonces el formulario se llena con sus datos, la contraseña es opcional, al guardar se llama a `update` solo con los campos enviados y la lista se actualiza; «Cancelar» vuelve al alta.
- **CA-05:** Dada una cuenta de la lista, cuando se elija «Desactivar», entonces se pide confirmación en un diálogo accesible y, al confirmar, se llama a `deactivate`, se anuncia el resultado y la cuenta deja de mostrarse.
- **CA-06:** Dada una respuesta de error, cuando falle una operación, entonces: 422 muestra un resumen con `role="alert"` y cada mensaje junto a su campo (`aria-invalid` y `aria-describedby`); 403 y 429 muestran el mensaje de la API (con segundos de espera en 429) en `role="alert"`; 401 vuelve al login con «Tu sesión expiró» mediante el manejador global.
- **CA-07:** Dado el código del dashboard, cuando se revise, entonces la sección usa `createUsersApi` de `@arca/api-client` solo desde el ViewModel `useUsers`; las vistas no usan `fetch`/`axios`; el estado de usuarios no depende de `dashboard-demo.ts`, y `TicketUsersView`, `add-ticket-user` y los usuarios ficticios se retiran.
- **CA-08:** Dadas las secciones de usuarios, cuando se muestren, entonces no aparece el aviso de prototipo, usan tokens semánticos sin hex de marca, son operables con teclado con foco visible y no desbordan horizontalmente de 360 a 1366 px.
- **CA-09:** Dada la suite del dashboard, cuando se ejecute con un cliente simulado, entonces existe al menos una prueba nombrada por cada CA-xx de esta spec.

## Reglas de negocio

- **RN-01:** La navegación por permiso es solo presentación; la autorización y el alcance de cuentas los aplica la API (`api-006`). La misma vista sirve a `admin` y `zoo-admin`: la API decide qué cuentas y roles devuelve.
- **RN-02:** La interfaz no calcula permisos ni valida reglas de negocio; muestra los errores de la API.
- **RN-03:** La contraseña capturada se envía a la API y se descarta del estado al guardar o cancelar; nunca se almacena en el navegador.
- **RN-04:** Textos visibles en español; identificadores en inglés.

## Datos, privacidad y auditoría

El dashboard solo presenta datos personales mínimos del personal (nombre, correo, área, rol, estado) recibidos de la API y no los persiste. La auditoría la registra la API.

No requiere cambios de esquema ni DBR.

## Flujos y errores

1. Entrar a la sección → carga lista y catálogo → tabla o estado vacío/error.
2. Alta o edición → guardar → éxito anunciado y lista refrescada; errores por campo o generales.
3. Desactivar → diálogo de confirmación → éxito anunciado; errores generales.
4. 401 en cualquier llamada → login con «Tu sesión expiró».

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** `api-006` (endpoints `staff-users.*`), `dashboard-002` (sesión, navegación y manejador 401), ADR 0002.
- **Riesgos:** depende de que `api-006` esté desplegada en el ambiente; los tests usan un cliente simulado.
- **Preguntas pendientes:** ninguna para este alcance.

## Revisión

- Aprobadores y fecha: Jonathan (responsable funcional), 2026-10-23, por solicitud explícita en sesión; pendiente de revisión del equipo antes de integrarse a `main`.
- Evidencia/enlaces: `apps/api/specs/006-user-management.md`, `apps/dashboard/specs/001-admin-dashboard-prototype.md` (CA-12 reemplazado), `apps/dashboard/specs/002-real-staff-login.md` (CA-06 y CA-10 actualizados).
