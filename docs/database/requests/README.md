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

Aún no hay solicitudes registradas. La conexión inicial y sus pruebas no requieren DBR mientras no alteren el esquema.
