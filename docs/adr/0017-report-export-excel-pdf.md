# 0017 · Exportación del reporte a Excel y PDF

- Estado: Aceptado
- Fecha: 2026-10-30
- Spec relacionada: `apps/api/specs/007-administration-management.md`

## Contexto

`api-007` (CA-22 y CA-23) define que el reporte de boletos se exporta en CSV, Excel (`.xlsx`) y PDF, con el mismo contenido y totales que el reporte en pantalla. Los archivos los genera la API (`dashboard-003` no genera archivos en el navegador).

CSV se produce con funciones nativas de PHP y no requiere dependencias. Excel y PDF no: el `composer.json` de la API solo trae Laravel 12, Sanctum, Fortify, Spatie Permission y Spatie Activitylog (ADR 0001). Por la Constitución I, toda dependencia nueva necesita un ADR aprobado.

La spec difiere la implementación de Excel y PDF hasta que este ADR se apruebe. El contrato (`GET /api/v1/admin/reports/tickets/export?format=csv|xlsx|pdf`) ya los contempla y responde 422 «Formato de exportación no disponible.» mientras no estén habilitados.

## Decisión

**Decisión vigente (aceptada por el equipo el 2026-10-30):**

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

- Aprobación del equipo: 2026-10-30.
- Plan y tasks que lo referencian: `apps/api/plan/007-administration-management.md`.
- Al aprobarlo: actualizar el estado a Aceptado, registrar versiones fijadas y añadir la tarea de instalación (`composer require`) y de los exportadores.

PHP mínimo: ver ADR 0018 (PHP 8.4+, requerido por OpenSpout ≥5.4).

## Enmienda 2026-10-30

Instalación de las librerías aprobadas (tarea T-39 de `api-007`), desde `apps/api/src` con `composer require ... --no-scripts`, sin actualizar otras dependencias:

| Paquete | Versión | Publicada | Licencia | Requisitos |
|---|---|---|---|---|
| `openspout/openspout` | v5.12.2 | 2026-10-13 | MIT | PHP `~8.4 \|\| ~8.5 \|\| ~8.6`; extensiones zip, xmlreader, xmlwriter, libxml, dom, simplexml, fileinfo, ctype, iconv |
| `dompdf/dompdf` | v3.1.6 | 2026-07-20 | LGPL-2.1 | PHP `^7.1 \|\| ^8.0`; ext-dom, ext-mbstring (gd opcional, solo para imágenes, que no se usan) |

- Se eligió v5.12.2 porque la v5.13.0 (2026-10-27) tenía menos de 7 días al instalar.
- Dependencias transitivas de dompdf: `dompdf/php-font-lib` 1.0.2, `dompdf/php-svg-lib` 1.0.2, `masterminds/html5` 2.12.0 y `sabberworm/php-css-parser` v9.5.0. OpenSpout no agrega otras.
- **PHP mínimo 8.4:** OpenSpout ≥5.4 exige PHP 8.4+ y la v4.28.5 (la última compatible con 8.2) no soporta PHP 8.5, que usa el equipo. Por decisión de Jonathan (2026-10-30), `apps/api/src/composer.json` pasa de `"php": "^8.2"` a `"^8.4"`; ver ADR 0018.
- `.github/workflows/cii.yml` sigue fijando PHP 8.2 (`ci.yml` ya usa 8.4); no se modificó aquí y debe revisarse por separado.
- `composer audit` reporta un aviso previo a esta instalación (PKSA-wtxr-p26d-nn42, CVE-2026-45070, severidad media) en `symfony/mime`; no se actualizó.
- Configuración: `report_export_formats` = `['csv', 'xlsx', 'pdf']`; `report_pdf_max_tickets` = 2000 (límite del PDF, que se arma en memoria; al superarlo la API responde 422 en español).
