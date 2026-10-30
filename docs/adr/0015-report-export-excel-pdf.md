# 0015 · Exportación del reporte a Excel y PDF

- Estado: Propuesto
- Fecha: 2026-10-30
- Spec relacionada: `apps/api/specs/007-administration-management.md`

## Contexto

`api-007` (CA-22 y CA-23) define que el reporte de boletos se exporta en CSV, Excel (`.xlsx`) y PDF, con el mismo contenido y totales que el reporte en pantalla. Los archivos los genera la API (`dashboard-003` no genera archivos en el navegador).

CSV se produce con funciones nativas de PHP y no requiere dependencias. Excel y PDF no: el `composer.json` de la API solo trae Laravel 12, Sanctum, Fortify, Spatie Permission y Spatie Activitylog (ADR 0001). Por la Constitución I, toda dependencia nueva necesita un ADR aprobado.

La spec difiere la implementación de Excel y PDF hasta que este ADR se apruebe. El contrato (`GET /api/v1/admin/reports/tickets/export?format=csv|xlsx|pdf`) ya los contempla y responde 422 «Formato de exportación no disponible.» mientras no estén habilitados.

## Decisión

**Pendiente de aprobación del equipo.** Recomendación del plan:

1. **Excel:** `openspout/openspout` (escritura en streaming de `.xlsx`).
2. **PDF:** `dompdf/dompdf` (PHP puro, sin binarios externos).
3. Las versiones exactas se fijan al instalar, usando versiones publicadas hace más de 7 días, y se registran en este ADR al aprobarlo.
4. Se agregan solo después de aprobar este ADR y de abrir su tarea en `apps/api/tasks/`; cada formato lleva su propio exportador detrás de `config('arca.report_export_formats')`.

## Alternativas consideradas

| Alternativa | A favor | En contra |
|---|---|---|
| OpenSpout (Excel) | Streaming con memoria baja, sin extensiones PHP exóticas, licencia MIT | Sin fórmulas ni estilos avanzados (no los necesitamos) |
| PhpSpreadsheet (Excel) | Muy completo, lee y escribe formatos | Más pesado en memoria para periodos largos; más superficie de dependencias |
| Dompdf (PDF) | PHP puro, portable entre Aiven/local, sin binarios | Maquetación CSS limitada; lento con tablas muy largas |
| `barryvdh/laravel-dompdf` | Integración con Laravel | Capa extra sobre Dompdf que no necesitamos |
| Snappy / wkhtmltopdf o Browsershot | Maquetación fiel | Requiere binarios o Chrome en el servidor: rompe la portabilidad (Constitución I) |
| Generar archivos en el cliente | Sin dependencias en la API | Mueve lógica de negocio al cliente (Constitución III) y duplica totales |
| Entregar solo CSV | Cero dependencias | No cumple lo pedido por el responsable funcional |

## Consecuencias

### Positivas
- Excel y PDF salen del mismo cálculo que la pantalla, sin duplicar lógica.
- Sin binarios del sistema: corre igual en el proveedor administrado y en local.
- El contrato del endpoint no cambia al habilitarlos.

### Riesgos o costos
- Dompdf puede ser lento con reportes de varios miles de filas; mitigación: el PDF resume totales y desglose diario y pagina o limita el listado detallado.
- Dos dependencias más que mantener y auditar (`composer audit`).
- Hasta la aprobación, el dashboard muestra los botones de Excel y PDF y recibe el error del servidor.

## Validación y revisión

- Aprobación del equipo: pendiente.
- Plan y tasks que lo referencian: `apps/api/plan/007-administration-management.md`.
- Al aprobarlo: actualizar el estado a Aceptado, registrar versiones fijadas y añadir la tarea de instalación (`composer require`) y de los exportadores.
