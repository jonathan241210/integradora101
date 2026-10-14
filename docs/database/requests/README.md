# Registro de solicitudes de cambio de base de datos (DBR)

Una DBR documenta cualquier necesidad de crear, modificar o eliminar esquema, funciones o procedimientos de la base MySQL 8.0.x de ARCA-NB. Sin DBR aprobada no existe cambio de base de datos.

## Nomenclatura

`DBR-NNN-slug.md` — NNN es un entero secuencial de tres dígitos único en esta carpeta (nunca reutilizar ni renumerar); el slug es breve, en inglés y kebab-case. Ejemplo: `DBR-001-users-name-column.md`.

## Reglas

1. Crea la DBR desde `../templates/change-request.md` en estado `Borrador`.
2. La DBR acompaña a la spec de la feature; no la sustituye (spec, plan y tasks siguen siendo obligatorios).
3. El SQL propuesto es solo referencia: se marca “no ejecutar directamente”.
4. La DBR pasa a `Aprobada` solo con aprobaciones separadas de BD y backend.
5. El responsable de BD convierte el cambio aprobado en migración Laravel, la prueba en una base MySQL 8.0 aislada y documenta la evidencia.
6. Con `Lista para backend`, backend implementa el código consumidor; sin ese estado no se programa contra el cambio.
7. La aplicación se registra por ambiente en la tabla de la propia DBR.
8. El contenido se redacta en español; identificadores SQL y técnicos en inglés. Nunca incluir secretos ni credenciales.

## Solicitudes

La conexión inicial y sus pruebas no requieren DBR mientras no alteren el esquema.

| DBR | Slug | Estado | Spec origen | Notas |
|---|---|---|---|---|
| [DBR-001](DBR-001-english-schema-normalization.md) | `english-schema-normalization` | Borrador | `apps/api/specs/003-staff-authentication.md` | Renombre en sitio de las 16 tablas al inglés |
| [DBR-002](DBR-002-staff-authentication.md) | `staff-authentication` | Borrador | `apps/api/specs/003-staff-authentication.md` | Columnas de autenticación en `users`/`departments` y tablas nuevas (Spatie, sessions, cache, activity_log); depende de DBR-001 |
| [DBR-003](DBR-003-visitor-accounts.md) | `visitor-accounts` | Borrador | `apps/api/specs/004-visitor-authentication.md` | Cuenta del visitante: columnas en `visitors`, `personal_access_tokens`, `visitor_refresh_tokens`, `visitor_verification_codes`; depende de DBR-001 |
| [DBR-004](DBR-004-visitor-progress.md) | `visitor-progress` | Borrador | `apps/api/specs/005-visitor-progress.md` | Colección por especie, `visitor_scans`, logros/misiones y libro mayor de puntos; depende de DBR-001 y DBR-003 |
