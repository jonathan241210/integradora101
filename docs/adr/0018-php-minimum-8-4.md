# 0018 · PHP mínimo de la API en 8.4

- Estado: Aceptado
- Fecha: 2026-10-30
- Spec relacionada: N/A (decisión transversal de stack). Motivada por `apps/api/specs/007-administration-management.md` (CA-22 y CA-23) a través del ADR 0017.

## Contexto

El ADR 0001 fijó PHP 8.2+ como mínimo de `apps/api`. La Constitución I (`CONSTITUTION.md`) declara el stack como «Laravel 12/PHP 8.2+».

El ADR 0017 recomienda OpenSpout para generar el Excel (`.xlsx`) del reporte de boletos, exigido por `api-007` (CA-22 y CA-23). OpenSpout ≥5.4 requiere PHP 8.4+. La línea 4.x, en concreto 4.28.5, no declara soporte para PHP 8.5, versión que usa el equipo. El workflow principal de CI (`.github/workflows/ci.yml`) ya ejecuta PHP 8.4.

Subir el mínimo de PHP es un cambio al stack declarado en la Constitución I, por lo que requiere ADR y aprobación del equipo.

## Decisión

1. El PHP mínimo de `apps/api` pasa de **8.2 a 8.4**. En `apps/api/src/composer.json` la restricción queda como `"php": "^8.4"`.
2. Laravel 12 se mantiene. Es compatible con PHP 8.4. No cambian MySQL 8.0.x, Aiven (ADR 0013) ni el resto del stack.
3. Este ADR **no aprueba por sí mismo** ninguna dependencia nueva. OpenSpout y Dompdf siguen condicionados a la aprobación del ADR 0017 y a su tarea en `apps/api/tasks/`. Este ADR solo habilita técnicamente la versión mínima de PHP que OpenSpout ≥5.4 necesita.
4. Se mantiene la portabilidad (Constitución I): el cambio no introduce servicios propietarios ni configuración fuera de `.env`.

**Aprobación:** el equipo aprobó el cambio. La aprobación fue comunicada por Jonathan el 2026-10-30, en representación del equipo, igual que en el ADR 0013.

## Alternativas consideradas

| Alternativa | A favor | En contra |
|---|---|---|
| Mantener PHP 8.2 y usar PhpSpreadsheet para Excel | No cambia el mínimo de PHP | Es más pesado en memoria para periodos largos y suma más superficie de dependencias, según la evaluación del ADR 0017. Requiere igualmente un ADR de dependencia. |
| Mantener PHP 8.2 y forzar OpenSpout 4.28.5 (ignorar o simular la plataforma en Composer) | No cambia el mínimo de PHP | 4.28.5 no declara soporte para PHP 8.5, que usa el equipo. Forzar la plataforma oculta una incompatibilidad real y deja el manifiesto mintiendo sobre el entorno. Se rechaza. |
| Entregar solo PDF (sin Excel) | Cero dependencias nuevas de Excel | No cumple `api-007` (CA-22): el reporte debe exportarse en CSV, Excel y PDF. Se rechaza. |

## Consecuencias

### Positivas
- Habilita OpenSpout ≥5.4 si el ADR 0017 se aprueba.
- El mínimo declarado coincide con el CI principal (PHP 8.4) y con la versión que usa el equipo.
- Alinea la documentación de stack con la versión realmente soportada.

### Riesgos o costos
- **Hosting y equipos:** cualquier entorno que ejecute la API debe tener PHP ≥8.4 (equipos de desarrollo, servidor de pruebas, hosting de la API cuando se defina; ADR 0013 deja el hosting pendiente). Un entorno en PHP 8.2 o 8.3 dejará de instalar dependencias.
- **Consistencia de manifiestos:** `composer.json` y `composer.lock` deben reflejar PHP ^8.4. Al 2026-10-30 el `composer.json` del árbol de trabajo ya lo declara; la verificación del lock y del CI corresponde a la tarea de backend.
- **Workflow residual:** `.github/workflows/cii.yml` todavía prepara PHP 8.2. Queda fuera de este ADR; debe revisarse por separado.
- **Documentación histórica:** las specs y planes ya aprobados que mencionan PHP 8.2+ (por ejemplo, `apps/api/specs/002-initial-db-connection.md`, CA-05) no se reescriben aquí. Su corrección requiere el flujo SDD de su propia app.
- **Cambio de Constitución:** el principio I se actualiza junto con este ADR (ver validación).

## Validación y revisión

- Aprobado por el equipo; aprobación comunicada por Jonathan el 2026-10-30.
- Enmienda la mención de PHP en el principio I de `CONSTITUTION.md`, con la misma convención que el ADR 0013 («Cambio registrado en ADR 0018»). Aplicación pendiente en el archivo raíz: el escritor de documentación no tiene permiso sobre `CONSTITUTION.md`.
- Actualiza la tabla de stack de `README.md`, `AGENTS.md` y `apps/api/AGENTS.md`. Aplicación pendiente por el mismo motivo.
- Añade una nota de actualización a `docs/adr/0001-api-central-laravel.md` sin reescribir su historia (aplicada).
- Relacionado con el ADR 0017 (exportación Excel y PDF), que sigue pendiente de su propia aprobación para las dependencias de exportación.
- Verificación pendiente de backend: `composer validate`, instalación con PHP 8.4 y CI en verde con PHP 8.4. Este documento no afirma que dichas verificaciones hayan pasado.
