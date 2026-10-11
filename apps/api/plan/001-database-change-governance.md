# Plan técnico · 001 · database-change-governance

- Spec: `apps/api/specs/001-database-change-governance.md`
- Estado de spec: Aprobada
- Responsable técnico: Jonathan

## Diseño de solución

Se creará una sección central `docs/database/` con política, plantilla y registro de solicitudes `DBR-NNN-slug.md`. Se documentará MySQL 8.0.x como familia obligatoria con revisión mínima pendiente del inventario inicial, y se formalizará el flujo:

```text
Solicitud DBR
→ Aprobación BD + backend
→ Migración Laravel creada por BD
→ Verificación por BD en base MySQL 8.0 de desarrollo/pruebas
→ Lista para backend
→ Código consumidor del backend + pruebas integradas
→ Aplicación por BD en staging
→ Aplicación por BD en producción
```

El SQL incluido en una DBR será únicamente referencia de revisión; jamás se ejecuta directamente. Toda modificación física se hará mediante migraciones Laravel. Funciones y procedimientos almacenados serán excepcionales, versionados dentro de migraciones con `DB::statement()` y probados en MySQL 8.0; vistas y triggers quedan excluidos. Las reglas principales de negocio se mantienen en Actions.

La conexión inicial y sus pruebas de conectividad no requerirán DBR mientras no alteren el esquema, pero sí su propio SDD mínimo, configuración por `.env` y ausencia de secretos versionados. Su inventario (versión, charset/collation, modo SQL, motor y esquema existente) alimentará la revisión mínima 8.0.x y la decisión posterior de baseline o reconstrucción controlada de la instancia, que contiene esquema pero no datos.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Documentación de gobierno | `docs/database/README.md`, `docs/database/templates/change-request.md`, `docs/database/requests/README.md` | Política, plantilla DBR y registro de solicitudes |
| Decisiones | `docs/adr/0010-mysql-8-0-database-change-governance.md`, `docs/adr/README.md` | Registrar la decisión aceptada e indexarla |
| Constitución y reglas | `CONSTITUTION.md`, `AGENTS.md`, `apps/api/AGENTS.md` | Ownership BD, MySQL 8.0.x, DBR obligatoria y límites de agentes |
| Referencias | `README.md`, `docs/02-arquitectura.md`, `docs/05-flujo-sdd.md`, `docs/06-convenciones.md`, `docs/README.md`, `infra/README.md` | Consistencia de versión, flujo, roles e índices |
| Plantillas SDD | `docs/templates/spec.md`, `docs/templates/plan.md`, `docs/templates/tasks.md` | Referencia a DBR y separación de tareas BD/backend |
| Prueba documental | `apps/api/src/tests/database-governance.test.mjs` | Cobertura automatizada de CA-01 a CA-10 con Node 22 integrado |

## Contrato y datos

- Endpoints: no se crean.
- Migraciones: no se crean; se documenta que serán propiedad exclusiva del responsable de BD bajo `apps/api/src/database/migrations/` después de una DBR aprobada.
- Datos sensibles: la plantilla exige clasificación, SoftDeletes, auditoría y `created_by`/`updated_by` cuando aplique.
- `settings_colores`: sigue siendo fuente externa `mysql2` de solo lectura; fuera de migraciones.

## Seguridad, offline y operación

No se versionarán credenciales, hosts privados ni secretos en DBR, migraciones, pruebas o evidencias. El acceso por ambiente se gestiona fuera del repositorio con mínimo privilegio. La aplicación en staging y producción requiere respaldo/validación previa, autorización de despliegue y plan de reversión ejecutados por el responsable de BD.

## Mapeo de criterios a pruebas

La API aún no tiene `composer.json` ni PHPUnit; se usará una prueba estructural con módulos integrados de Node.js 22, sin crear manifiestos ni instalar dependencias. Comando: `node --test apps/api/src/tests/database-governance.test.mjs`.

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | Test CA-01: presencia de “MySQL 8.0.x” normativa, revisión mínima pendiente y ausencia de 8.4 como permitida | `apps/api/src/tests/database-governance.test.mjs` |
| CA-02 | Test CA-02: DBR obligatoria y prohibición de SQL/migraciones por el solicitante | mismo archivo |
| CA-03 | Test CA-03: campos obligatorios de la plantilla | mismo archivo |
| CA-04 | Test CA-04: migración exclusiva de BD y prohibición de SQL manual | mismo archivo |
| CA-05 | Test CA-05: estado “Lista para backend” con requisitos previos | mismo archivo |
| CA-06 | Test CA-06: estados por ambiente y aplicación por BD | mismo archivo |
| CA-07 | Test CA-07: funciones/procedimientos excepcionales y reglas en Actions | mismo archivo |
| CA-08 | Test CA-08: conexión sin DBR pero con SDD y `.env` | mismo archivo |
| CA-09 | Test CA-09: protección del esquema existente y baseline por decisión | mismo archivo |
| CA-10 | Test CA-10: consistencia de referencias entre documentos | mismo archivo |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | MySQL se restringe a 8.0.x; el cambio constitucional queda registrado en ADR 0010 aceptado por el equipo; sin dependencias nuevas |
| II. La spec manda | Sí | Spec aprobada por el solicitante; plan y tasks con el mismo identificador |
| III. Lógica separada de la interfaz | Sí | Reglas principales permanecen en Actions; clientes solo generan DBR |
| IV. Un test por criterio | Sí | Prueba documental Node con un test nombrado por CA-01 a CA-10 |
| V. Una sola fuente de verdad para los datos | Sí | El esquema continúa versionado por migraciones Laravel; añade DBR previa y ownership de BD |
| VI. Código en inglés, personas en español | Sí | Identificadores SQL y nombres técnicos en inglés; documentos en español |

## Riesgos y decisiones

- ADR requerido: se crea `0010` como Aceptado; especializa ADR 0001 y 0006 sin borrar historial.
- La especificación quedó aprobada e Implementada el 2026-10-09.
- La prueba documental es transitoria hasta que exista PHPUnit en la API.
- El cambio a `CONSTITUTION.md` se justifica por la aprobación del equipo confirmada por el solicitante; el PR debe enlazar esa evidencia.

## Orden y aprobación

1. Aprobación de este plan técnico.
2. Crear y aprobar `apps/api/tasks/001-database-change-governance.md`.
3. Implementar `docs/database/`, ADR 0010 y actualizaciones normativas.
4. Crear la prueba documental y ejecutarla.
5. Verificar enlaces, referencias de versión, `git diff --check` y `/verify` (reportando API no inicializada).
6. Actualizar estado de la spec a Implementada cuando se cumpla la definición de terminado.

Aprobación técnica: Jonathan, 2026-10-09.
