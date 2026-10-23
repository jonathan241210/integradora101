# Plan técnico · 006 · user-management

- Spec: `apps/api/specs/006-user-management.md`
- Estado de spec: Implementada (pendiente de revisión del usuario)
- Responsable técnico: API

Verificación local sin base de datos: Pint, `php -l` en los PHP de la feature y las cinco rutas `staff-users.*` con su middleware están aprobados. PHPUnit Feature queda pendiente de acceso autorizado a `arca_pruebas`.

## Diseño de solución

Las rutas `staff-users.*` delegan autenticación al Sanctum, pertenencia al personal a `staff.user`, 2FA a `administrator.two-factor`, y límites al middleware `throttle:staff-users`. `StaffUserPolicy` delega el alcance de roles a `ResolveManageableRolesAction`; Actions validan y realizan operaciones transaccionales. `StaffUserResource` expone solo datos autorizados. `LogStaffUserEventAction` registra altas, cambios y bajas sin valores sensibles.

La API administra exclusivamente las tablas ya existentes de personal, departamentos, roles, sesiones y auditoría. Esta feature no crea DBR, migraciones, esquema ni seeders.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| API / autorización | `ResolveManageableRolesAction`, `StaffUserPolicy`, `AppServiceProvider` | Resolver roles autorizados, alcance de cuentas y limitador |
| API / persistencia | `UpdateStaffAccountAction`, `DeactivateStaffAccountAction`, `LogStaffUserEventAction` | Actualización parcial, baja lógica, cierre de sesiones/tokens y auditoría |
| API / HTTP | `app/Http/Controllers/Staff/StaffUserController.php`, `StaffUserResource`, rutas `staff-users.*`, `config/arca.php` | Catálogo y CRUD limitado a los permisos |
| Paquetes/clientes | Sin cambios en esta app | El contrato lo consume `@arca/api-client` según `dashboard-003` |
| Documentación | Plan, tasks y contrato local de API si corresponde | Mantener la referencia del endpoint vigente |

## Contrato y datos

- Prefijo `/api/v1/staff-users`; rutas nombradas `staff-users.catalog`, `staff-users.index`, `staff-users.store`, `staff-users.update` y `staff-users.destroy`, todas con `auth:sanctum`, `staff.user`, `administrator.two-factor` y `throttle:staff-users`.
- `GET` lista usuarios activos/no eliminados ordenados por nombre; el alcance de `zoo-admin` incluye solo cuentas con roles manejables. `GET catalog` devuelve áreas activas y roles autorizados con etiquetas en español. `POST` reutiliza `CreateStaffAccountAction`; `PATCH` actualiza solo campos enviados y sincroniza el rol si fue incluido; `DELETE` desactiva con SoftDeletes.
- La Policy permite `users.manage` o `operational-staff.manage` en `viewAny`/`create`; `update` exige cuenta administrable; `delete` prohíbe desactivar la propia cuenta; `assignRole` limita roles y prohíbe cambiar el propio rol.
- `StaffUserResource` incluye `id`, nombres, `full_name`, `email`, departamento, roles e `is_active`; nunca contraseña, permisos, token ni secretos 2FA.
- Las reglas de edición reflejan las de creación con `sometimes`, correo normalizado y único ignorando el ID, contraseña opcional y respuestas de validación en español.
- `DeactivateStaffAccountAction` limpia sesiones si el driver es `database` y tokens Sanctum cuando el modelo los soporta. El evento de actividad conserva causante, cuenta, correo, roles y nombres de campos cambiados, nunca valores de contraseña.
- No hay DBR relacionada: el contrato usa el esquema existente de DBR-001/002. No se modifican migraciones ni seeders.
- Errores: 401 sin sesión; 403 por permisos, 2FA, alcance o acción propia; 404 para cuenta inexistente/eliminada; 422 por validación; 429 con mensaje y `Retry-After`.

## Seguridad, offline y operación

- Cada operación valida permiso y alcance en servidor; el filtrado visual no se considera autorización.
- Los nombres de roles web se resuelven desde permisos actuales, sin confiar en valores enviados por el cliente.
- El límite `arca.staff_users_per_minute` usa usuario autenticado e IP; el fallback de configuración es 60 solicitudes por minuto y mantiene el texto de espera en español.
- No se registra ni devuelve contraseña, token o secreto 2FA. La baja mantiene el registro y elimina sesiones/token asociados para impedir el reingreso.
- Consultas y reglas usan Eloquent/MySQL 8.0.x ya existente; no se agrega sintaxis específica de Aiven ni dependencia nueva.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | `CA-01 admin lista recursos sin datos sensibles` | API, `tests/Feature/Staff/StaffUserManagementTest.php` |
| CA-02 | `CA-02 admin crea cualquier rol` | API, mismo archivo |
| CA-03 | `CA-03 creación y edición validan campos en español` | API, mismo archivo |
| CA-04 | `CA-04 zoo-admin solo gestiona personal operativo` | API, mismo archivo |
| CA-05 | `CA-05 autenticación, permisos y 2FA bloquean rutas` | API, mismo archivo |
| CA-06 | `CA-06 actualización parcial registra updated_by` | API, mismo archivo |
| CA-07 | `CA-07 baja lógica revoca sesiones y tokens` | API, mismo archivo |
| CA-08 | `CA-08 se prohíbe la baja propia y cambiar el rol propio` | API, mismo archivo |
| CA-09 | `CA-09 catálogo limita y traduce roles asignables` | API, mismo archivo |
| CA-10 | `CA-10 auditoría no contiene contraseñas` | API, mismo archivo |
| CA-11 | `CA-11 el límite responde 429 con Retry-After` | API, mismo archivo |
| CA-12 | `CA-12 cobertura nombrada para todos los criterios` | API, mismo archivo |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Laravel/Spatie existentes; no se agregan dependencias |
| II. La spec manda | Sí | Diseño, rutas y casos se limitan a `api-006` |
| III. Lógica separada de la interfaz | Sí | Policy, Actions, Resource y Controller siguen límites MVC |
| IV. Un test por criterio | Sí | CA-01..CA-12 mapeados a PHPUnit Feature |
| V. Una sola fuente de verdad para los datos | Sí | La API y su DB existente son autoridad de personal |
| VI. Código en inglés, personas en español | Sí | Identificadores ingleses y mensajes/etiquetas españolas |

## Riesgos y decisiones

- ADR requerido/aprobado: ninguno nuevo; se reutilizan Sanctum, Fortify, Spatie, ADR 0010 y ADR 0013.
- El middleware `administrator.two-factor` ya devuelve 403 con código `two_factor_setup_required` y mensaje en español; CA-05 coincide con el comportamiento real.
- `Password::defaults()` puede consultar HIBP fuera de `local`; los tests deben usar `Http::fake()` en los casos pertinentes.
- La suite depende de que `arca_pruebas` ya contenga el esquema aprobado; no se debe reconstruir ni migrar desde PHPUnit.

## Orden y aprobación

1. Autorización, roles y limitador; Actions transaccionales y auditoría; Resource, controller y rutas; pruebas CA-01..CA-12.
2. Consumidor `@arca/api-client` y dashboard según `dashboard-003`.
3. Ejecutar PHPUnit Feature en `arca_pruebas`, revisar seguridad y formato y actualizar tasks con resultados.

La implementación sigue el diseño autorizado expresamente en el handoff del lead. No se asignan tareas a personas por nombre.
