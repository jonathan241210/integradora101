# 007 · administration-management

- App dueña: `api`
- Apps/paquetes afectados: `api`, `dashboard` (consumidor, `dashboard-003`), `packages/api-client`
- Estado: Aprobada
- Solicitante / responsable funcional: Jonathan
- Responsable de BD: Víctor Adrián (DBR-005)
- Aprobación funcional: Jonathan, 2026-10-30

## Problema y contexto

El login real del personal (`api-003`, `dashboard-002`) ya permite entrar al dashboard, pero las secciones de administración siguen con datos ficticios. `api-003` y `dashboard-002` dejaron pendiente la «Gestión de usuarios» (alta, edición, baja, restablecimiento de contraseña y de 2FA).

Esta feature expone en la API las capacidades privadas del administrador general (`admin`, Presidencia) y del administrador del zoológico (`zoo-admin`, Dirección): gestión de cuentas del personal, noticias, eventos, recintos, panel principal y reporte de boletos con exportación. La misma API sirve a ambos roles; lo que cambia es su alcance (RN-01).

Los permisos ya existen en `RolesAndPermissionsSeeder` (`users.manage`, `operational-staff.manage`, `news.manage`, `events.manage`, `enclosures.manage`, `dashboard.view`, `reports.view`). Esta feature no crea permisos nuevos.

## Objetivos

- Gestionar cuentas del personal desde la API: listar, buscar, crear, editar, activar/desactivar, eliminar (baja lógica), restablecer contraseña y restablecer 2FA.
- Gestionar noticias y eventos (crear, editar, activar/desactivar, eliminar lógicamente) y recintos (crear y renombrar).
- Entregar métricas del panel principal y un reporte de boletos por periodo semanal o mensual, calculados en el servidor.
- Exportar el reporte en CSV, Excel y PDF.
- Aplicar autorización y alcance por rol solo en el servidor, con auditoría de cada acción administrativa.

## Fuera de alcance

- Venta de boletos, arqueo y cierres de caja (el reporte solo lee `tickets`; sin ventas reales los resultados quedan en cero).
- Subida o edición de imágenes: `image_path` se conserva tal cual y no se edita.
- `GET /news` público y cambios al catálogo público de `api-006`, salvo que los eventos eliminados dejan de aparecer (RN-09).
- Eliminación de recintos.
- Recuperación de contraseña por correo y cambio de contraseña propio.
- Contraseña temporal con cambio obligatorio en el primer ingreso.
- Envío de reportes por correo o programados.
- Cambios en `apps/web`, `apps/pwa` y `apps/mobile`.
- Gestión de roles y permisos como tales (la matriz de `docs/03-roles-y-permisos.md` no se edita desde la interfaz).

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| `admin` (Presidencia) | Gestionar todas las cuentas, contenido, recintos, panel y reporte | Sesión válida + 2FA confirmado; `users.manage`, `news.manage`, `events.manage`, `enclosures.manage`, `dashboard.view`, `reports.view` |
| `zoo-admin` (Dirección) | Gestionar cuentas de taquilla y veterinaria, contenido, recintos, panel y reporte | Sesión válida + 2FA confirmado; `operational-staff.manage`, `news.manage`, `events.manage`, `enclosures.manage`, `dashboard.view`, `reports.view` |
| `executive` | Consultar panel y reporte en solo lectura, incluida la exportación | `dashboard.view`, `reports.view` |
| `cashier`, `veterinarian` | Sin acceso a estos endpoints | — |
| Responsable de BD | Crear, probar y aplicar DBR-005 | Flujo DBR de `docs/database/` |

## Historias de usuario

- Como `admin`, quiero crear, editar, desactivar y restablecer las cuentas de todo el personal para mantener el acceso al sistema bajo control.
- Como `zoo-admin`, quiero administrar solo las cuentas de taquilla y veterinaria para operar mi área sin tocar cuentas de mayor privilegio.
- Como administrador, quiero restablecer el 2FA de quien perdió su celular para que pueda volver a enrolarse.
- Como administrador, quiero publicar, editar y retirar noticias y eventos, y renombrar recintos, para mantener actualizada la información institucional.
- Como administrador o directivo, quiero ver el reporte semanal o mensual y exportarlo para presentarlo o archivarlo.

## Criterios de aceptación

### Usuarios

- **CA-01:** Dado un administrador con `users.manage` u `operational-staff.manage`, cuando llama `GET /api/v1/admin/users`, entonces recibe una lista paginada de cuentas (id, nombre completo, correo, área, rol, estado activo, `last_login_at`, si tiene 2FA confirmado) con filtros opcionales por texto (nombre o correo), rol, área y estado, ordenada por apellidos; nunca incluye contraseña ni secretos 2FA.
- **CA-02:** Dado un `zoo-admin`, cuando consulta la lista, el detalle o cualquier operación sobre una cuenta cuyo rol no es `cashier` ni `veterinarian`, entonces la lista no la incluye y el detalle o la operación responde 404 con «Usuario no encontrado.»; un `admin` ve y gestiona todas las cuentas.
- **CA-03:** Dados correo institucional, nombre, apellidos, área, rol y contraseña válidos, cuando se llama `POST /api/v1/admin/users`, entonces crea la cuenta activa con el rol asignado (el área sugiere el rol vía `SuggestRoleForDepartmentAction`, pero el rol enviado es el que se aplica), registra `created_by` y responde 201 sin devolver la contraseña.
- **CA-04:** Dado un `zoo-admin`, cuando intenta crear o editar una cuenta con rol `admin`, `zoo-admin` o `executive`, entonces responde 403 con «No tienes permiso para asignar ese rol.» y no modifica nada.
- **CA-05:** Dado un correo ya usado (incluso por una cuenta eliminada) o una contraseña que no cumple `Password::defaults()`, cuando se crea o se restablece, entonces responde 422 con mensajes en español por campo.
- **CA-06:** Dada una cuenta dentro del alcance, cuando se llama `PATCH /api/v1/admin/users/{user}`, entonces actualiza nombre, apellidos, área y rol, registra `updated_by` y responde 200; el correo no se modifica.
- **CA-07:** Dada una cuenta dentro del alcance, cuando se llama a activar o desactivar, entonces cambia `is_active`; al desactivar se invalidan sus sesiones activas y no puede iniciar sesión (mensaje genérico de `api-003`).
- **CA-08:** Dada una cuenta dentro del alcance, cuando se llama `DELETE /api/v1/admin/users/{user}`, entonces se elimina lógicamente (SoftDeletes), se invalidan sus sesiones y no puede iniciar sesión; la fila permanece en la base de datos.
- **CA-09:** Dado un administrador, cuando intenta desactivar o eliminar su propia cuenta, o desactivar, eliminar o degradar al último `admin` activo, entonces responde 422 con un mensaje en español y no hay cambios.
- **CA-10:** Dada una cuenta dentro del alcance y una contraseña nueva válida, cuando se llama a restablecer contraseña, entonces la contraseña se guarda con bcrypt y se invalidan las sesiones de esa cuenta.
- **CA-11:** Dada una cuenta con 2FA confirmado, cuando un administrador con alcance sobre ella restablece su 2FA, entonces se borran el secreto, los códigos de recuperación y la confirmación, se invalidan sus sesiones, y en su siguiente ingreso `me` devuelve `two_factor_setup_required: true` si su rol lo exige.
- **CA-12:** Dado `GET /api/v1/admin/users/options`, cuando lo consulta un administrador, entonces recibe las áreas activas y los roles que puede asignar (`admin` todos; `zoo-admin` solo `cashier` y `veterinarian`), con etiquetas en español y el rol sugerido por área.

### Noticias y eventos

- **CA-13:** Dado `news.manage`, cuando se llama `GET /api/v1/admin/news`, entonces lista noticias activas e inactivas no eliminadas, ordenadas por fecha de publicación descendente; la misma regla aplica a `GET /api/v1/admin/events` con `events.manage`, ordenada por `start_date` descendente.
- **CA-14:** Dados datos válidos, cuando se crea o edita una noticia (título, descripción, contenido, fecha de publicación, vigencia, categoría, estado) o un evento (nombre, descripción, fechas, horas, ubicación, estado), entonces se guarda con `author_id` del usuario actual en el alta, responde 201/200 y rechaza con 422 en español fechas incoherentes (fin anterior al inicio) o campos obligatorios vacíos.
- **CA-15:** Dado un recurso existente, cuando se activa, desactiva o elimina, entonces cambia `is_active` o se marca `deleted_at` (borrado lógico) y deja de aparecer en la lista de administración (si está eliminado) y, para eventos, en `GET /api/v1/events`.
- **CA-16:** Dado un usuario sin `news.manage` o sin `events.manage`, cuando intenta cualquiera de estas operaciones, entonces responde 403.

### Recintos

- **CA-17:** Dado `enclosures.manage`, cuando se llama `GET /api/v1/admin/enclosures`, entonces lista los recintos con su nombre y la cantidad de animales asignados.
- **CA-18:** Dado un nombre válido y no vacío (máximo 100 caracteres, único sin distinguir mayúsculas), cuando se crea o renombra un recinto, entonces se guarda y responde 201/200; un nombre repetido responde 422 en español. No existe operación de eliminación.

### Panel y reporte

- **CA-19:** Dado `dashboard.view`, cuando se llama `GET /api/v1/admin/dashboard`, entonces devuelve, calculados en el servidor, los totales del día actual y de los últimos 7 días (boletos vendidos, adultos, niños e ingresos en MXN) y la serie diaria de ingresos de esos 7 días; sin ventas todos los valores son 0.
- **CA-20:** Dado `reports.view`, cuando se llama `GET /api/v1/admin/reports/tickets` con `period=week` o `period=month` y una fecha de referencia, entonces devuelve el periodo (lunes a domingo, o mes calendario), los totales (boletos, adultos, niños, ingresos), el desglose por día y el listado de boletos del periodo, todo con zona horaria `America/Mexico_City`.
- **CA-21:** Dado un reporte con `period=custom`, cuando el rango excede 366 días, la fecha final es anterior a la inicial o falta un extremo, entonces responde 422 en español.
- **CA-22:** Dado un reporte, cuando se solicita su exportación en CSV, entonces la API responde un archivo descargable `.csv` (UTF-8 con BOM, separador coma) con el mismo contenido y totales que el reporte en pantalla.
- **CA-23:** Dado un reporte, cuando se solicita su exportación en Excel (`.xlsx`) o PDF, entonces la API responde el archivo con el mismo contenido y totales; estos formatos se habilitan solo cuando el ADR de la librería correspondiente esté aprobado (RN-12).
- **CA-24:** Dado el panel o el reporte, cuando los consulta un `executive`, un `admin` o un `zoo-admin`, entonces recibe los mismos datos en solo lectura; un usuario sin `dashboard.view`/`reports.view` recibe 403.

### Transversales

- **CA-25:** Dada cualquier ruta `/api/v1/admin/*`, cuando se llama sin sesión responde 401, y con un administrador sin 2FA confirmado responde 403 `two_factor_setup_required`.
- **CA-26:** Dadas las acciones administrativas sobre cuentas, noticias, eventos y recintos (alta, edición, cambio de estado, eliminación, restablecimiento de contraseña o 2FA), cuando ocurren, entonces Activitylog registra actor, acción y recurso afectado, sin contraseñas ni secretos.
- **CA-27:** Dada la suite de PHPUnit, cuando se ejecuta `php artisan test`, entonces corre contra `arca_pruebas` (nunca `arca_zoo`) con `DatabaseTransactions` y existe al menos un test que nombra cada CA-01 a CA-26.

## Reglas de negocio

- **RN-01:** `admin` (con `users.manage`) gestiona todas las cuentas; `zoo-admin` (con `operational-staff.manage`) solo gestiona cuentas `cashier` y `veterinarian`, y no ve las demás en las listas.
- **RN-02:** Cada cuenta tiene exactamente un rol. El área organiza al personal y sugiere el rol, pero no otorga acceso (`docs/03-roles-y-permisos.md`).
- **RN-03:** Nadie puede desactivar ni eliminar su propia cuenta; el sistema siempre conserva al menos un `admin` activo.
- **RN-04:** Desactivar, eliminar, restablecer contraseña o restablecer 2FA invalida las sesiones activas de la cuenta afectada.
- **RN-05:** El correo es único entre todas las cuentas, incluidas las eliminadas lógicamente, y no se puede cambiar desde esta feature.
- **RN-06:** La contraseña la captura el administrador y cumple `Password::defaults()` (`api-003` CA-11); la API nunca la devuelve ni la registra.
- **RN-07:** La autorización se aplica en el servidor con permisos de Spatie y Policies por registro; ocultar opciones en la interfaz no protege los endpoints.
- **RN-08:** Los cálculos de totales, periodos y series (Panel y Reporte) viven únicamente en Actions de la API (Constitución III), en zona horaria `America/Mexico_City`; el periodo semanal va de lunes a domingo y el mensual es el mes calendario.
- **RN-09:** Las cuentas, noticias y eventos eliminados lo son por SoftDeletes y conservan auditoría; un evento eliminado deja de aparecer en el catálogo público.
- **RN-10:** Rutas nombradas bajo `/api/v1/admin`, controladores delgados que delegan en Actions; identificadores, rutas y permisos en inglés, mensajes en español; sin Inertia ni Wayfinder.
- **RN-11:** Esta feature no crea permisos ni roles nuevos; usa la matriz vigente de `docs/03-roles-y-permisos.md`.
- **RN-12:** Excel y PDF requieren dependencias PHP nuevas y por tanto un ADR aprobado (Constitución I). Hasta entonces solo se entrega CSV, que no requiere dependencia.
- **RN-13:** Las respuestas del reporte y de la exportación contienen exactamente los mismos totales, calculados por la misma Action.

## Datos, privacidad y auditoría

- Se manejan datos personales del personal (nombre, apellidos, correo institucional); nunca se exponen contraseñas, secretos ni códigos de recuperación 2FA.
- `users` ya usa SoftDeletes y `created_by`/`updated_by`. El reporte de boletos es un dato financiero de solo lectura: no se modifica ni elimina.
- Activitylog registra cada acción administrativa con actor y recurso.
- **Cambio de esquema:** `news` y `events` no tienen `deleted_at`; el borrado lógico (CA-15) requiere agregarlo mediante migración. Se solicitará en `docs/database/requests/DBR-005-news-events-soft-deletes.md` y, según el flujo, el responsable de BD la crea, prueba y aplica. Las tareas que dependen de ella (eliminar noticias y eventos) inician solo con DBR-005 en `Lista para backend`; el resto no necesita DBR. La DBR no sustituye esta spec.

## Flujos y errores

1. El administrador entra al dashboard (`api-003`), consulta `me` y la interfaz muestra las secciones según sus permisos.
2. Cada operación llama su endpoint; la API valida sesión, 2FA, permiso y alcance, ejecuta la Action y registra la auditoría.
3. Errores: 401 sin sesión; 403 sin permiso, sin 2FA o rol no asignable; 404 recurso inexistente o fuera de alcance; 422 validación o regla de negocio (RN-03); mensajes en español.
4. Conflicto de correo o de nombre de recinto: 422 por campo.
5. Exportación de formato aún no habilitado (Excel/PDF sin ADR): 422 con «Formato de exportación no disponible.».

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** `api-003` (implementada), `api-006` (el catálogo público de eventos debe excluir eliminados), DBR-005 para borrado lógico de noticias y eventos, ADR 0001 y ADR 0010. **ADR pendiente** para la(s) librería(s) de Excel y PDF (p. ej. OpenSpout o PhpSpreadsheet; Dompdf), a redactar en `/sdd-plan`.
- **Riesgos:**
  - Sin ventas reales el panel y el reporte se verán en cero hasta que exista la venta en taquilla.
  - Restablecer el 2FA y la contraseña de otras cuentas es una operación sensible; depende de la bitácora (CA-26).
  - Las sesiones se guardan en BD (`sessions`); invalidarlas requiere identificar las de la cuenta afectada.
- **Preguntas resueltas (Jonathan):**
  1. Métricas del panel y del reporte (boletos, adultos, niños, ingresos, serie diaria): suficientes.
  2. Rango personalizado de hasta 366 días como opción secundaria además de semanal y mensual: aprobado.
  3. El `zoo-admin` ve únicamente las cuentas bajo su alcance (`cashier` y `veterinarian`); no ve las demás ni en lectura (RN-01, CA-02).
  4. Responsable de BD de DBR-005: Víctor Adrián; a él se le solicita la DBR.
  5. Librería de Excel y PDF: sin preferencia por ahora. Excel y PDF quedan **definidos en esta spec** (CA-22/CA-23), pero su implementación se difiere hasta que se redacte y apruebe el ADR de la librería; se implementa primero CSV. No bloquea el resto de la feature.

## Revisión

- Aprobadores y fecha: Jonathan (responsable funcional), 2026-10-30.
- Evidencia/enlaces: `docs/03-roles-y-permisos.md`, `apps/api/specs/003-staff-authentication.md`, `apps/api/specs/006-public-catalog-read.md`, `apps/dashboard/specs/003-administration-sections.md`.
