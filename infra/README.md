# Infraestructura

**Estado: bosquejo; no hay infraestructura implementada.** No crear recursos, archivos de entorno ni despliegues sin spec, plan, aprobación y revisión de seguridad.

## Desarrollo local

Se prevé un `docker-compose` para servicios locales de desarrollo, incluido MySQL 8.0.x. Aún no existe archivo Compose ni configuración de contenedores. El equipo debe decidir puertos, volúmenes, datos semilla y estrategia de respaldos en una spec.

## Alojamiento previsto

El primer destino es Google Cloud con MySQL 8.0.x administrado (por ejemplo, Cloud SQL). La API Laravel y los clientes podrán desplegarse en servicios acordados posteriormente. El almacenamiento de archivos que se agregue usará discos configurables de Laravel Filesystem, no llamadas a SDK desde dominio.

## Base de datos

La familia MySQL 8.0.x es obligatoria en todos los ambientes; la revisión mínima queda pendiente del inventario inicial (`SELECT VERSION()`, charset/collation, modo SQL, motor y esquema existente). La instancia existente contiene esquema sin datos: no se borra, recrea ni adopta como baseline automáticamente; una decisión aprobada definirá baseline o reconstrucción controlada. Cada ambiente (desarrollo/pruebas, staging y producción) usa una base aislada; los cambios siguen `docs/database/README.md` y los aplica el responsable de BD con respaldo, autorización, evidencia y reversión.

## Portabilidad

- Usar capacidades compatibles con MySQL 8.0.x; no depender de extensiones exclusivas de Cloud SQL.
- Configurar acceso, host, base, usuario y secreto mediante variables de entorno; no versionar credenciales.
- Mantener datos persistentes en migraciones Laravel y planear exportación, respaldo y restauración verificables.
- Para migrar a MySQL Server local, apuntar conexiones a la instancia local mediante `.env`, validar collation/versión y probar restauración; revisar por separado el driver de archivos.
- `settings_colores` se conecta por `mysql2` como fuente externa de solo lectura; sus credenciales se gestionan fuera del repo.

## Secretos y operación

Los secretos se administran con mecanismos de cada entorno (Secret Manager u opción local segura) y se inyectan al proceso; nunca se guardan en Git, imágenes ni logs. `.env.example` contiene solo nombres y valores de muestra no sensibles. Definir acceso mínimo, rotación, respaldos, restauración y auditoría antes de producción.

Referencia de arquitectura: ADR 0006. Todo despliegue requiere SDD y checklist operativo aprobado.
