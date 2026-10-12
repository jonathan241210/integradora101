# 002 · initial-db-connection

- App dueña: `api`
- Apps/paquetes afectados: `api`
- Estado: Implementada
- Solicitante / responsable funcional: Jonathan
- Responsable de BD: Victor Adrian
- Aprobación funcional: Victor Adrian, 2026-10-11

## Problema y contexto

El equipo necesita que la API Laravel pueda conectarse a la instancia MySQL 8.0.x
alojada en Aiven Cloud para que todos los integrantes puedan verificar la conectividad
y realizar el inventario inicial (versión, charset, collation, modo SQL y esquema existente).

Actualmente `apps/api/src/` no tiene código fuente: la app Laravel no está inicializada.
Sin la conexión establecida y documentada no es posible avanzar a ninguna feature de datos,
ni que los compañeros del equipo confirmen el acceso a la base.

La conexión no altera el esquema; por ello no requiere DBR (CA-08 de la spec 001),
pero sí requiere su propio SDD, configuración por `.env` y ausencia de secretos versionados.

## Objetivos

- Inicializar el proyecto Laravel 12 en `apps/api/src/`.
- Configurar la conexión a MySQL 8.0.x de Aiven mediante variables de entorno (`.env`).
- Proveer un `.env.example` con las claves necesarias sin valores reales.
- Verificar conectividad ejecutando `php artisan db:show` (o equivalente) sin error.
- Registrar el inventario inicial: versión del servidor, charset, collation, modo SQL y lista de tablas existentes.
- Dejar el resultado del inventario documentado en `apps/api/docs/inventario-bd-inicial.md`.

## Fuera de alcance

- Crear, alterar o eliminar tablas, columnas, índices, funciones, procedimientos o datos.
- Decidir entre baseline y reconstrucción controlada del esquema existente (decisión posterior).
- Instalar o configurar Sanctum, Fortify, Spatie ni otros paquetes de negocio.
- Exponer endpoints ni crear modelos de dominio.
- Configurar entornos de staging o producción.
- Compartir credenciales reales en el repositorio.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Responsable backend (Jonathan) | Inicializar Laravel y configurar `.env` local | Acceso de escritura al repo; credenciales Aiven por canal externo |
| Integrantes del equipo | Configurar su propio `.env` local y verificar conectividad | Credenciales Aiven recibidas por canal externo |
| Responsable de BD | Validar inventario y decidir estrategia de baseline | Revisión del inventario documentado |

Las credenciales (usuario, contraseña) se comparten por canal externo al repositorio (no en commits, no en issues, no en PRs).

## Historias de usuario

- Como integrante del equipo, quiero configurar mi `.env` local y verificar que la API conecta a la base de datos de Aiven, para poder trabajar en features que dependan de datos reales.
- Como responsable de BD, quiero ver el inventario inicial de la instancia (versión, charset, tablas) para decidir la estrategia de baseline o reconstrucción controlada.

## Criterios de aceptación

- **CA-01:** Dado el repositorio clonado, cuando un integrante copia `.env.example` a `.env` y llena sus credenciales, entonces el archivo contiene todas las claves necesarias para la conexión sin ningún valor real versionado.
- **CA-02:** Dado un `.env` correctamente configurado, cuando se ejecuta `php artisan db:show` (o `php artisan migrate:status`), entonces el comando responde sin error de conexión y muestra información del servidor MySQL.
- **CA-03:** Dado el resultado de conectividad, cuando se completa el inventario, entonces `apps/api/docs/inventario-bd-inicial.md` registra versión del servidor, charset, collation, modo SQL y lista de tablas; sin incluir contraseñas, usuarios ni hosts privados.
- **CA-04:** Dado el código fuente en `apps/api/src/`, cuando se revisa el repositorio, entonces no existe ningún archivo `.env` con valores reales ni credenciales versionadas; solo `.env.example`.
- **CA-05:** Dado el proyecto Laravel inicializado, cuando se ejecuta `php artisan about`, entonces reporta Laravel 12 y PHP 8.2+ sin errores de arranque.

## Reglas de negocio

- **RN-01:** Las credenciales de conexión (usuario, contraseña) no se versionan en ningún archivo del repositorio.
- **RN-02:** La conexión se configura exclusivamente mediante variables de entorno (`.env`); no se hardcodea host, puerto, usuario ni contraseña en código.
- **RN-03:** El host es `mysql-230c9986-arcannb.a.aivencloud.com`, el puerto `15280` y la base de datos `arca_pruebas`; estos datos no son secretos y pueden incluirse en `.env.example`.
- **RN-04:** Esta feature no modifica el esquema existente; si durante el inventario se detecta necesidad de cambio, se abre una DBR antes de actuar.
- **RN-05:** El inventario se redacta en español y no incluye datos sensibles, contraseñas ni información personal.

## Datos, privacidad y auditoría

Esta feature no crea ni modifica datos. Consulta el esquema existente en modo lectura para inventariarlo.
No requiere DBR (CA-08 de api-001). No hay datos clínicos ni financieros involucrados.
El inventario documentado no debe incluir credenciales ni hosts privados con contraseña.

## Flujos y errores

### Flujo principal

1. Responsable backend inicializa Laravel 12 en `apps/api/src/` con `composer create-project`.
2. Copia `.env.example` a `.env` y completa usuario y contraseña con las credenciales de Aiven.
3. Ejecuta `php artisan db:show` para verificar conectividad.
4. Si conecta: registra versión, charset, collation, modo SQL y tablas en `apps/api/docs/inventario-bd-inicial.md`.
5. Comparte las credenciales por canal externo para que cada integrante configure su `.env`.

### Errores esperados

- **Fallo de conexión SSL/TLS:** Aiven requiere SSL; verificar que `DB_OPTIONS` incluya la configuración de SSL o que el DSN lo active.
- **Puerto bloqueado:** verificar que el firewall/red local permite salida al puerto 15280.
- **Credenciales incorrectas:** el error de MySQL indicará "Access denied"; revisar usuario y contraseña en `.env`.
- **Base de datos no encontrada:** verificar que `DB_DATABASE=arca_pruebas` coincida con el nombre real en Aiven.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** api-001 (gobierno de BD, Aprobada/Implementada), ADR 0001 (Laravel central), ADR 0006 (portabilidad GCP/local), ADR 0010 (MySQL 8.0.x).
- **Riesgos:**
  - Aiven requiere CA certificate SSL; debe descargarse desde el panel de Aiven y referenciarse por ruta local en `.env`, nunca versionarse en el repo.
  - Un `.env` con credenciales reales commiteado por error expondría la base de datos del equipo.
  - La revisión exacta de MySQL 8.0.x se conocerá al conectar; debe registrarse para completar el inventario de api-001.
- **Respuestas confirmadas:**
  1. ✅ Aiven requiere CA certificate (`ca.pem`); no requiere certificado de cliente adicional.
  2. ✅ Usuario responsable de BD: `avnadmin` (Victor Adrian). Usuario para el resto del equipo: `desarrollador`.
  3. ✅ Sin IP allowlist activa por ahora; todos los integrantes pueden conectarse directamente.

## Revisión

- Aprobadores y fecha: pendiente de aprobación funcional por Jonathan.
- Evidencia/enlaces: api-001 (Implementada), ADR 0010.
