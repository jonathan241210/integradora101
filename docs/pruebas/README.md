# Documentación de pruebas de ARCA-NB

Esta carpeta concentra la documentación oficial de planeación, diseño y seguimiento de pruebas del proyecto.

## Regla de documentos vigentes únicos

Para conservar coherencia y un seguimiento continuo entre corridas, **solo los siguientes tres archivos** deben modificarse con nuevas pruebas, hallazgos o campañas de validación:

| Archivo | Código | Contenido | Cómo actualizarlo |
|---|---|---|---|
| `01-plan-de-pruebas.docx` | `PP-ARCA-01` | Estrategia, alcance, criterios de aprobación, ambiente, riesgos y entregables | Incrementar la versión en *Control del documento* y pie de página, registrar el cambio en la *Bitácora de cambios* y actualizar el alcance o las tablas correspondientes. |
| `02-casos-de-prueba.docx` | `CP-ARCA-01` | Catálogo de fichas de prueba (`CP-01` en adelante) | Añadir los casos nuevos de forma consecutiva respetando el formato de ficha, actualizar el *Índice de casos* y reflejar la trazabilidad al criterio `CA-xx`. |
| `03-bitacora-de-pruebas.docx` | `BT-ARCA-01` | Registro cronológico de corridas, resultados, comandos, hallazgos e incidencias | Agregar una nueva sección fechada al final con revisión de Git, entorno, resultados por lote, comandos de reproducción, hallazgos y estado de cierre, sin borrar corridas anteriores. |

### Restricciones
- **No crear copias fechadas** (por ejemplo `01-plan-de-pruebas-YYYY-MM-DD.docx`) ni **anexos separados** (`.md` o `.docx` paralelos).
- Toda evidencia de nuevas ejecuciones debe quedar consolidada dentro de los tres archivos anteriores para mantener una sola fuente de seguimiento.
- El historial de cambios se conserva dentro de cada documento y en Git.
