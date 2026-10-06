# 0006 · Google Cloud con portabilidad a MySQL Server local

- Estado: Aceptado
- Fecha: 2026-10-03
- Spec relacionada: Por definir al iniciar despliegues

## Contexto
El alojamiento previsto es Google Cloud con una base MySQL 8 administrada, por ejemplo Cloud SQL. Puede ser necesario migrar en el futuro a un MySQL Server local. La lógica no debe quedar atada a servicios propietarios.

## Decisión
Usar MySQL 8 estándar, sin extensiones ni funciones exclusivas del proveedor. Configurar conexiones y credenciales solo por `.env`/variables de entorno. No incluir SDK de Google Cloud en la lógica de negocio. El almacenamiento de archivos que requiera nube se accede exclusivamente a través de discos configurables de Laravel Filesystem, con opción de un driver local. La infraestructura se describe en `infra/README.md`; no está implementada.

## Alternativas consideradas
- Usar servicios propietarios en lógica de dominio y aceptar costos de migración.
- Operar desde el inicio un servidor de BD local, que no corresponde al hosting inicialmente previsto.

## Consecuencias
### Positivas
Portabilidad y posibilidad de cambiar de proveedor mediante configuración, con menos dependencia de SDK específicos.
### Riesgos o costos
Se deben probar compatibilidad y copias/restauración entre entornos; capacidades administradas específicas de GCP no se asumirán en el dominio.

## Validación y revisión
Verificar migraciones contra MySQL 8 estándar y preparar pruebas de restauración/migración. Mantener secretos fuera del repositorio.
