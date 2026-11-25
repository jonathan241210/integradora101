# 030 · Baja de especies de prueba

- App dueña: `api`
- Estado: Aprobada
- Solicitante: usuario de la sesión
- Aprobación funcional: el solicitante confirmó los dos registros y pidió el comando para aplicar la baja.

## Alcance

Dar de baja lógica en `arca_pruebas` a Gordo (85) y dfgh (86) para retirarlas del catálogo público y de los selectores internos. La operación puntual queda a cargo de un operador autorizado de la API. Las demás especies quedan fuera del lote.

## Criterios de aceptación

- **CA-01:** El operador puede comprobar la identidad de los dos registros y sus referencias antes de aplicar la baja. La operación se bloquea si cambia la identidad, si alguna especie tiene animales activos o si la conexión no corresponde a `arca_pruebas`.
- **CA-02:** Después de aplicar la baja lógica, Gordo y dfgh quedan fuera del catálogo público y de los selectores activos. La PWA refleja la baja tras sincronizar una copia existente.
- **CA-03:** Se conservan los animales, evaluaciones y demás relaciones históricas. Repetir el comando mantiene las fechas de baja originales y la salida identifica al operador y los IDs afectados.

## Reglas y estado actual

- **RN-01:** La baja se limita a los IDs 85 y 86, validados por nombre, y se aplica en una transacción. Se utiliza `Species` con `SoftDeletes`; no se requieren cambios de esquema ni DBR.
- **RN-02:** No se modifican animales, evaluaciones, solicitudes, colecciones ni favoritos vinculados.
- La consulta de solo lectura mediante Laravel en `arca_pruebas` verificó `species.deleted_at`, que Gordo sigue publicada, que dfgh no está publicada y que ninguna tiene animales activos. Gordo tiene tres animales dados de baja y dfgh tiene uno. `information_schema.KEY_COLUMN_USAGE` identificó referencias desde `animals`, `species_publication_requests`, `visitor_collections` y `visitor_favorite_species`.
- La operación de publicación existente (`api-014`, CA-24 y CA-38) conserva activa la fila de `species`. La baja lógica usa el campo existente de DBR-013 y las reglas de visibilidad de `api-014` RN-22 y `api-015` RN-03.
