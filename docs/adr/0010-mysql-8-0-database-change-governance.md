# 0010 · MySQL 8.0 y gobierno de cambios de base de datos

- Estado: Aceptado
- Fecha: 2026-10-09
- Spec relacionada: `apps/api/specs/001-database-change-governance.md`

## Contexto

El equipo acordó fijar la base principal a la familia **MySQL 8.0.x** (no 8.4). La instancia existente contiene esquema pero no datos, y la revisión mínima compatible se definirá tras el inventario inicial. Hasta ahora la Constitución exigía migraciones sin definir quién las crea, cómo se solicita un cambio ni cuándo backend puede consumirlo. Este ADR especializa ADR 0001 y ADR 0006 sin borrar su historial.

## Decisión

1. MySQL 8.0.x es la familia obligatoria en todos los ambientes; se admite un rango de parches y la revisión mínima se registrará tras el inventario.
2. Toda necesidad de esquema, función o procedimiento comienza con una solicitud `DBR-NNN-slug.md` en `docs/database/requests/`, aprobada por el responsable de BD y el responsable backend.
3. Todo cambio físico se implementa mediante migración Laravel creada, probada y aplicada por el responsable de BD. El SQL propuesto en la DBR es solo referencia; no se ejecuta directamente.
4. Backend implementa el código consumidor únicamente cuando la DBR llega a `Lista para backend`.
5. La aplicación se registra por ambiente: desarrollo/pruebas, staging y producción, con respaldo, evidencia y plan de reversión.
6. Funciones y procedimientos almacenados son excepcionales, se versionan dentro de migraciones y se prueban en MySQL 8.0; las reglas principales de negocio permanecen en Actions. Vistas y triggers quedan fuera salvo futura decisión.
7. Conectar la API y probar conectividad no requiere DBR mientras no altere el esquema, pero sí SDD, `.env` y ausencia de secretos versionados.

## Alternativas consideradas

- SQL manual aplicado por BD sin migración: descartado por divergencia entre ambientes y pérdida de versionado.
- Backend crea las migraciones: descartado; el equipo decidió que BD es dueño del ciclo físico completo.
- Fijar una revisión 8.0.x exacta desde hoy: descartado hasta conocer la revisión real de la instancia.
- MySQL 8.4: descartado por la decisión del equipo de fijar la familia 8.0.

## Consecuencias

### Positivas

Contrato de datos revisable antes de tocar el esquema, roles claros entre BD y backend, esquema versionado de extremo a extremo y trazabilidad por ambiente.

### Riesgos o costos

El flujo añade un artefacto (DBR) por cambio; backend puede bloquearse hasta que BD verifique la migración; las funciones/procedimientos complican pruebas y portabilidad si se abusan.

## Validación y revisión

Se verifica mediante la política `docs/database/`, la cobertura documental `apps/api/src/tests/database-governance.test.mjs` y la revisión del PR que introduce este ADR. El inventario inicial de la conexión completará la revisión mínima.
