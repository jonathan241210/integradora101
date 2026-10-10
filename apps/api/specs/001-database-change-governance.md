# 001 · database-change-governance

- App dueña: `api`
- Apps/paquetes afectados: `api`, `dashboard`, `pwa`, `web`, `mobile`, documentación e infraestructura
- Estado: Implementada
- Solicitante / responsable funcional: Jonathan
- Aprobación funcional: Aprobada

## Problema y contexto

ARCA-NB necesita conectar una instancia existente de MySQL 8.0 que contiene esquema, pero todavía no datos. Actualmente se exige MySQL 8 y migraciones Laravel, pero no existe un proceso documental que indique cómo una aplicación solicita datos nuevos o corregidos, quién diseña y prueba el cambio, cuándo puede consumirlo backend ni cómo se registra su aplicación por ambiente.

Sin ese gobierno, una interfaz o agente podría crear SQL o migraciones sin coordinación, aplicar cambios manuales, asumir que una aprobación equivale a producción modificada o generar diferencias entre desarrollo, pruebas, staging y producción.

El equipo acordó usar exclusivamente la familia MySQL 8.0.x. La revisión mínima compatible se definirá después de inventariar la instancia real. También acordó que el responsable de base de datos será dueño de crear, probar y aplicar las migraciones Laravel, mientras backend consumirá el contrato cuando BD y backend lo declaren listo.

## Objetivos

- Establecer MySQL 8.0.x como familia obligatoria en todos los ambientes de ARCA-NB.
- Crear una sección central `docs/database/` para política, plantilla y solicitudes `DBR-NNN-slug.md`.
- Exigir una DBR aprobada antes de modificar esquema, funciones o procedimientos almacenados.
- Asignar al responsable de BD la creación, prueba, evidencia y aplicación de migraciones Laravel.
- Permitir que backend implemente el código consumidor solo cuando BD y backend confirmen el estado `Lista para backend`.
- Registrar por separado la aplicación del cambio en desarrollo/pruebas, staging y producción.
- Permitir funciones y procedimientos almacenados solo cuando exista justificación técnica y sin trasladar las reglas principales fuera de Actions Laravel.
- Permitir la conexión inicial y sus pruebas sin DBR cuando no alteren el esquema, conservando SDD, variables de entorno y protección de secretos.

## Fuera de alcance

- Conectar ahora la instancia MySQL, crear credenciales o agregar archivos de conexión.
- Inventariar ahora la revisión exacta, charset, collation, modo SQL o esquema existente.
- Elegir ahora entre baseline y reconstrucción controlada del esquema existente.
- Crear, alterar o eliminar tablas, columnas, índices, funciones, procedimientos o datos.
- Crear una DBR concreta para una feature de negocio.
- Ejecutar migraciones o comandos contra bases de desarrollo, pruebas, staging o producción.
- Autorizar SQL manual como alternativa a migraciones Laravel.
- Autorizar vistas o triggers; requerirán una decisión futura aprobada.
- Modificar la feature web `003-lion-hero-mobile-navigation` en progreso.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Solicitante de una feature | Pedir datos nuevos, corregidos o reestructurados | Crear una DBR; no modificar esquema ni crear migraciones |
| Responsable de base de datos | Diseñar físicamente, migrar, probar y aplicar el cambio | Crear migraciones y pruebas; acceso controlado por ambiente según autorización |
| Responsable backend | Validar el contrato y consumirlo desde la API | Revisar/aprobar DBR; modificar código API solo cuando quede lista para backend |
| Responsables de clientes | Informar necesidades de datos | Crear DBR; no crear SQL, migraciones ni accesos directos a MySQL |
| Equipo revisor | Verificar arquitectura, seguridad y trazabilidad | Revisar ADR, Constitución, SDD y evidencia |

Los roles describen responsabilidades sobre el cambio, no conceden por sí mismos credenciales de base de datos. Los accesos reales se administran fuera del repositorio bajo mínimo privilegio.

## Historias de usuario

- Como desarrollador de una interfaz o backend, quiero solicitar claramente un dato faltante para no modificar directamente la base de datos.
- Como responsable de BD, quiero recibir una solicitud aprobable con contrato y SQL de referencia para crear una migración Laravel verificable.
- Como responsable backend, quiero conocer cuándo el contrato está listo en la base de pruebas para implementar modelos, validaciones y endpoints sin asumir cambios inexistentes.
- Como responsable de despliegue de BD, quiero registrar cada aplicación por ambiente para evitar que “Aprobada” o “Aplicada” tengan significados ambiguos.

## Criterios de aceptación

- **CA-01:** Dada la documentación normativa, cuando se consulte la versión de base de datos, entonces identificará MySQL 8.0.x como familia obligatoria, indicará que la revisión mínima está pendiente del inventario inicial y no presentará MySQL 8.4 como versión permitida.
- **CA-02:** Dada una necesidad de crear o modificar esquema, función o procedimiento, cuando la detecte cualquier aplicación o agente, entonces las reglas exigirán crear primero una solicitud `docs/database/requests/DBR-NNN-slug.md` y prohibirán que el solicitante cree SQL ejecutable, migraciones o cambios directos.
- **CA-03:** Dada una DBR, cuando se redacte, entonces la plantilla exigirá origen/spec, justificación, contrato esperado, elementos afectados, SQL MySQL 8.0 de referencia no ejecutable, nulabilidad/defaults, datos existentes, privacidad, auditoría, rendimiento, reversión, pruebas, despliegue y aprobaciones separadas de BD y backend.
- **CA-04:** Dada una DBR aprobada, cuando se implemente el cambio físico, entonces la política asignará exclusivamente al responsable de BD crear y probar la migración Laravel; no permitirá SQL manual como flujo alternativo.
- **CA-05:** Dada una migración verificada en una base MySQL 8.0 de desarrollo/pruebas, cuando BD documente estructura, reversión, compatibilidad y evidencia, entonces BD y backend podrán confirmar `Lista para backend`, y solo después backend implementará el código consumidor y sus pruebas integradas.
- **CA-06:** Dado un cambio aprobado, cuando avance entre ambientes, entonces la DBR registrará estados separados para desarrollo/pruebas, staging y producción; el responsable de BD aplicará la migración en staging y producción con controles de respaldo, autorización, evidencia y reversión.
- **CA-07:** Dada la necesidad excepcional de una función o procedimiento almacenado, cuando se solicite, entonces se justificará frente a una Action Laravel, se versionará mediante migración, se probará en MySQL 8.0 y conservará las reglas principales de negocio en Actions; vistas y triggers permanecerán fuera de alcance.
- **CA-08:** Dada la conexión inicial o una prueba de conectividad que no modifica el esquema, cuando se planifique, entonces no requerirá DBR, pero sí spec, plan y tasks aprobados, configuración mediante variables de entorno, ausencia de secretos versionados e inventario de versión y configuración relevante.
- **CA-09:** Dado el esquema existente sin datos, cuando se realice el inventario inicial, entonces no se borrará, recreará ni adoptará como baseline automáticamente; una decisión posterior aprobada definirá baseline o reconstrucción controlada.
- **CA-10:** Dadas las reglas, arquitectura, SDD, plantillas e infraestructura del repositorio, cuando se revise la política, entonces serán consistentes sobre roles, MySQL 8.0.x, DBR, migraciones, ambientes y límites de conexión.

## Reglas de negocio y gobierno

- **RN-01:** Toda modificación de esquema, función o procedimiento requiere una DBR aprobada por responsable de BD y responsable backend.
- **RN-02:** El SQL incluido en una DBR es referencia de revisión y debe indicar que no se ejecuta directamente.
- **RN-03:** Toda modificación física se implementa mediante una migración Laravel creada por el responsable de BD.
- **RN-04:** No se permite SQL manual como alternativa a una migración, incluso en la base de pruebas.
- **RN-05:** Solo el responsable de BD crea, modifica y aplica migraciones; backend no cambia una migración aprobada y devuelve la DBR a revisión si detecta una divergencia.
- **RN-06:** `Aprobada` autoriza elaborar la migración; no significa que el cambio esté aplicado en ningún ambiente.
- **RN-07:** `Lista para backend` requiere migración implementada y verificada por BD, más confirmación de BD y backend.
- **RN-08:** La aplicación se registra por ambiente; no existe un estado global ambiguo llamado únicamente `Aplicada`.
- **RN-09:** Las reglas principales de negocio permanecen en Actions Laravel. Funciones y procedimientos son excepcionales y requieren justificación documentada.
- **RN-10:** Vistas y triggers no están autorizados por esta feature.
- **RN-11:** La conexión y las pruebas sin alteración de esquema están exentas de DBR, pero no de SDD, seguridad ni pruebas.
- **RN-12:** Los clientes nunca acceden directamente a MySQL ni crean migraciones; expresan sus necesidades mediante DBR.
- **RN-13:** Identificadores SQL, tablas, columnas, funciones, procedimientos y migraciones se nombran en inglés; solicitudes y documentación se redactan en español.

## Datos, privacidad y auditoría

Esta feature no modifica datos ni esquema. La plantilla DBR exigirá clasificar datos personales, clínicos y financieros; indicar retención, SoftDeletes, `created_by`/`updated_by`, Activitylog y mínimo privilegio cuando apliquen.

Las credenciales, hosts privados, contraseñas y secretos no se incluirán en DBR, migraciones, pruebas, evidencias ni logs. La conexión se configurará mediante variables de entorno. `settings_colores` continuará como fuente externa `mysql2` de solo lectura y no estará sujeta a migraciones de ARCA-NB.

## Flujos y errores

### Solicitud y preparación

1. Una feature detecta un dato faltante o incorrecto.
2. El solicitante crea una DBR en Borrador.
3. BD y backend revisan el contrato.
4. Si falta información, la DBR permanece En revisión y no se crea migración.
5. Si ambos aprueban, la DBR pasa a Aprobada.

### Implementación de base de datos

1. El responsable de BD crea la migración y pruebas.
2. El responsable de BD ejecuta la migración en una base MySQL 8.0 aislada.
3. Si falla creación, reversión, compatibilidad o rendimiento, registra evidencia y devuelve la DBR a revisión.
4. Si pasa, registra `Verificada por BD en desarrollo/pruebas`.
5. BD y backend confirman `Lista para backend`.

### Implementación backend y despliegue

1. Backend implementa el consumidor del contrato y pruebas integradas.
2. Si el contrato resulta insuficiente o incorrecto, no modifica la migración: devuelve la DBR a revisión.
3. BD aplica la migración en staging y registra evidencia.
4. Tras pruebas y autorización, BD respalda/valida y aplica en producción.
5. La DBR registra por separado cada ambiente.

### Conexión inicial

La conexión tiene su propio SDD mínimo. Inventariará versión, charset/collation, modo SQL, motor y esquema. Si requiere modificar el esquema, a partir de ese punto deberá abrir una DBR.

## Dependencias, riesgos y preguntas

- Dependencias/ADR: ADR 0001 (API central), ADR 0006 (portabilidad) y nuevo ADR 0010 para MySQL 8.0.x y gobierno de cambios.
- Riesgos: bloqueo de backend si BD no entrega migración; diferencias entre revisiones 8.0.x; migraciones destructivas; acoplamiento por objetos almacenados; esquema existente sin baseline; evidencia con datos sensibles.
- Mitigaciones: estados visibles, revisión mínima tras inventario, cambios expansivos antes que destructivos, respaldo/reversión, pruebas MySQL reales y secretos fuera del repositorio.
- Preguntas pendientes: nombre de las personas responsables de BD y backend; revisión mínima 8.0.x; estrategia de baseline o reconstrucción tras inventario.

## Revisión

- Aprobadores y fecha: Jonathan (funcional y técnica), 2026-10-09; acuerdo del equipo para modificar la Constitución registrado en ADR 0010.
- Evidencia/enlaces: `CONSTITUTION.md`, `AGENTS.md`, `apps/api/AGENTS.md`, `docs/05-flujo-sdd.md`, `apps/api/plan/001-database-change-governance.md`, `apps/api/tasks/001-database-change-governance.md`, `docs/database/README.md`, `docs/adr/0010-mysql-8-0-database-change-governance.md`, `apps/api/src/tests/database-governance.test.mjs`, ADR 0001 y ADR 0006.
