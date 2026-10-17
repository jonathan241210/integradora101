# 0013 · Aiven como proveedor de MySQL administrado

- Estado: Aceptado
- Fecha: 2026-10-15
- Spec relacionada: `apps/api/specs/002-initial-db-connection.md`, `apps/api/specs/003-staff-authentication.md`
- Sustituye a: [0006 · Google Cloud con portabilidad a MySQL Server local](0006-hosting-google-cloud-portable.md)

## Contexto
ADR 0006 preveía Google Cloud (por ejemplo, Cloud SQL) como destino del sistema. En la práctica, la base de datos en la nube del proyecto se creó en **Aiven Cloud MySQL**: la conexión inicial de la API (`api-002`) y las migraciones de DBR-001 y DBR-002 ya operan sobre Aiven. El inventario de la instancia observó MySQL `8.4.11`, mientras que el proyecto se compromete con MySQL 8.0.x (ADR 0010). Faltaba registrar el cambio de proveedor y el uso de cada base.

## Decisión
- **Aiven MySQL** es el proveedor de la base de datos administrada del proyecto.
- **Google Cloud deja de ser el destino del sistema.** El hosting de la API y de los clientes, y el almacenamiento de archivos, quedan **por definir** en un ADR posterior.
- La conexión usa TLS con el certificado CA de Aiven; su ruta se configura solo por `.env` (`DB_SSL_CA`). El certificado, las contraseñas y el `.env` nunca se versionan.
- **Compatibilidad estricta con MySQL 8.0.x** aunque Aiven ejecute 8.4: no se usan funciones, sintaxis ni capacidades exclusivas de 8.4 ni del proveedor.
- Bases por ambiente:
  - `arca_pruebas`: base de trabajo del equipo y de PHPUnit; contiene las cuentas de prueba; no se borra ni se reconstruye. Los tests usan `DatabaseTransactions`.
  - `arca_zoo`: producción; fuera del alcance del equipo de desarrollo, los agentes y los tests.
- Se mantiene la **portabilidad a MySQL Server local**: cambiar de proveedor solo requiere cambiar `.env`. No se incorporan SDK de proveedores a la lógica de negocio; el almacenamiento, cuando se defina, queda detrás de discos de Laravel Filesystem.

## Alternativas consideradas
- Mantener Google Cloud (Cloud SQL) como destino: no corresponde a la infraestructura ya creada y en uso.
- Operar desde el inicio un MySQL Server local: no ofrece una base compartida para el equipo.

## Consecuencias
### Positivas
La documentación refleja la infraestructura real; el equipo comparte `arca_pruebas` con TLS y el código sigue siendo portable.
### Riesgos o costos
- La diferencia de versión (8.4 en Aiven, 8.0.x comprometida) exige revisar migraciones y consultas contra 8.0.
- Los tests de la API dependen de la disponibilidad de red hacia Aiven.
- El hosting de la API está pendiente; la cookie de sesión de Sanctum requerirá que API, dashboard y PWA compartan dominio raíz.
- La enmienda de la Constitución (principio I) normalmente requiere acuerdo del equipo; se registra con la aprobación de Jonathan y debe comunicarse al equipo.

## Validación y revisión
- Aprobado por Jonathan, 2026-10-15, en representación del equipo.
- Enmienda el principio I de `CONSTITUTION.md` y deja ADR 0006 como Superseded.
- Verificación: `DbConnectionTest` (`api-002`) y el inventario `apps/api/docs/inventario-bd-inicial.md`; migraciones revisadas contra MySQL 8.0.x por el responsable de BD.
