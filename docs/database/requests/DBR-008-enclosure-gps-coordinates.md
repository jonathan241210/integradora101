# DBR-008 · enclosure-gps-coordinates

- Estado: Aprobada
- Feature/spec origen: `apps/mobile/specs/007-map-location.md` (Enmienda V2 — GPS y mapa)
- Solicitante: Víctor Adrián (mobile)
- Responsable de BD: Víctor Adrián
- Responsable backend: Víctor Adrián
- Fecha: 2026-11-03
- Depende de: DBR-001 (`english-schema-normalization`), ya aplicada

## Problema y justificación

El mapa 2D del visitante (`mobile-007`) posiciona los marcadores de recintos con coordenadas
normalizadas `mapX`/`mapY` hardcodeadas en un fixture local de la app móvil. Esto tiene dos
problemas:

1. **Posición no real:** los marcadores no corresponden a la ubicación física de cada recinto
   dentro del zoológico, por lo que la línea de navegación (V2.1 `DestinationRouteLine`) y el
   cálculo de distancia Haversine (≤ 10 m para detección de llegada) trabajan con datos
   sintéticos que no servirán en producción.

2. **Sin fuente de verdad centralizada:** si las coordenadas cambian (remodelación, nuevo
   recinto), hay que actualizar la app y lanzar una nueva versión. Con las coordenadas en la
   base de datos, basta con actualizar la fila del recinto.

La solución es agregar `gps_lat` y `gps_lon` directamente a la tabla `enclosures`, ya que la
relación es 1:1 (un recinto tiene una sola ubicación física principal). Las coordenadas SVG
normalizadas `map_x`/`map_y` se añaden también como respaldo para el período de transición
antes de que el SVG cartográfico definitivo esté disponible.

## Estado actual

La tabla `enclosures` (renombrada de `recintos` en DBR-001) tiene las siguientes columnas:

| Columna | Tipo | Notas |
|---|---|---|
| `id` | int unsigned | PK, AUTO_INCREMENT |
| `name` | varchar | nombre del recinto |

No existe ninguna columna de coordenadas geográficas ni de posición en el SVG. Los 3
registros existentes en `arca_pruebas` tienen solo `id` y `name`.

## Contrato solicitado

### `enclosures` — columnas nuevas

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `gps_lat` | DECIMAL(10, 8) | NULL, sin default | Latitud GPS del centro del recinto |
| `gps_lon` | DECIMAL(11, 8) | NULL, sin default | Longitud GPS del centro del recinto |
| `map_x` | DECIMAL(5, 4) | NULL, sin default | Posición normalizada horizontal en el SVG (0.0–1.0) |
| `map_y` | DECIMAL(5, 4) | NULL, sin default | Posición normalizada vertical en el SVG (0.0–1.0) |

**Precisión elegida:**
- `DECIMAL(10, 8)` para latitud: hasta ±90.00000000, con 8 decimales (~1.1 mm de precisión).
- `DECIMAL(11, 8)` para longitud: hasta ±180.00000000, con 8 decimales (~1.1 mm de precisión).
- `DECIMAL(5, 4)` para `map_x`/`map_y`: rango 0.0000–1.0000, cuatro decimales suficientes.

Todas las columnas son **NULL** para no romper los registros existentes y porque las
coordenadas reales del zoológico se cargarán en campo una vez que se cuente con el SVG
cartográfico definitivo (fotos/video con dron).

### Consumo esperado

- El endpoint `GET /api/v1/map/enclosures` (a definir en la spec de API correspondiente)
  devolverá los recintos con `gps_lat`, `gps_lon`, `map_x` y `map_y`.
- La app móvil aplicará `geoTransform(gps_lat, gps_lon)` para obtener `{ svgX, svgY }` y
  posicionar el marcador en el mapa cuando las coordenadas GPS estén disponibles; de lo
  contrario usará `map_x`/`map_y` directamente.
- El cálculo de distancia Haversine entre la posición del visitante y el recinto destino usará
  `gps_lat`/`gps_lon` del recinto para detectar llegada (≤ 10 m).

## Elementos afectados

| Tipo | Nombre | Cambio |
|---|---|---|
| columna | `enclosures.gps_lat` | agregar (DECIMAL(10,8) NULL) |
| columna | `enclosures.gps_lon` | agregar (DECIMAL(11,8) NULL) |
| columna | `enclosures.map_x` | agregar (DECIMAL(5,4) NULL) |
| columna | `enclosures.map_y` | agregar (DECIMAL(5,4) NULL) |

Sin cambios en índices, FK ni otras tablas.

## SQL de referencia (MySQL 8.0)

> **Referencia para revisión; no ejecutar directamente.** El cambio real se implementará
> como migración Laravel creada por el responsable de BD.

```sql
ALTER TABLE enclosures
  ADD COLUMN gps_lat DECIMAL(10, 8) NULL AFTER name,
  ADD COLUMN gps_lon DECIMAL(11, 8) NULL AFTER gps_lat,
  ADD COLUMN map_x   DECIMAL(5, 4)  NULL AFTER gps_lon,
  ADD COLUMN map_y   DECIMAL(5, 4)  NULL AFTER map_x;
```

## Datos existentes y migración de datos

Los 3 registros actuales en `arca_pruebas` (`enclosures`) conservarán `NULL` en las cuatro
columnas nuevas. No requiere backfill. `ADD COLUMN ... NULL` en MySQL 8.0 es un cambio de
metadatos instantáneo (< 1 ms) sin reescritura de filas.

Los valores reales de `gps_lat`/`gps_lon` se capturarán en campo con GPS de precisión una vez
que el zoológico entregue el material fotográfico/de dron. Los valores de `map_x`/`map_y` se
calcularán a partir de las coordenadas GPS usando `geoTransform` y se persisten como caché
SVG.

## Privacidad, auditoría y retención

- Las coordenadas GPS de los recintos son **datos geográficos públicos** del zoológico (no
  datos personales). No aplica retención diferenciada.
- La trazabilidad de quién cargó o modificó coordenadas la proveerá el Activitylog de Laravel
  al implementar el endpoint de administración.
- No se almacenan coordenadas del visitante en esta DBR.

## Impacto, rendimiento y reversión

- Tabla `enclosures` actualmente con 3 filas: el `ALTER TABLE` es instantáneo.
- Las columnas son `NULL`able y sin índice: no impactan queries existentes.
- Sin FK ni triggers: sin efecto en cascada.
- **Reversión (`down()`):**

```sql
ALTER TABLE enclosures
  DROP COLUMN map_y,
  DROP COLUMN map_x,
  DROP COLUMN gps_lon,
  DROP COLUMN gps_lat;
```

## Compatibilidad MySQL 8.0

`DECIMAL` con precisión y escala explícitas es sintaxis estándar de MySQL 8.0.x, portable
entre Aiven y MySQL Server local sin ajuste.

## Objeto almacenado (si aplica)

No aplica.

## Orden de despliegue

1. Responsable de BD crea la migración Laravel y la prueba en `arca_pruebas`.
2. Con la DBR en `Lista para backend`, el responsable backend implementa:
   - El endpoint `GET /api/v1/map/enclosures` en `apps/api`.
   - El modelo `Enclosure` actualizado con los cuatro campos.
3. La app móvil actualiza su `MapRepository` para consumir el endpoint en lugar del fixture
   cuando `EXPO_PUBLIC_API_URL` esté configurado.
4. **Nota:** cambio expansivo (columnas nullable). El código consumidor puede desplegarse
   antes o después de la migración sin riesgo de rotura.

## Pruebas y evidencia

> Pendiente de ejecución — campos a completar por el responsable de BD.

- **Migración Laravel:** `apps/api/src/database/migrations/2026_11_03_000008_enclosure_gps_coordinates.php`.
- **Ejecución de migración:** Implementada en archivo de migración Laravel conforme al gobierno de BD.
- **Verificación de esquema:**
  - `enclosures.gps_lat` DECIMAL(10, 8) NULL
  - `enclosures.gps_lon` DECIMAL(11, 8) NULL
  - `enclosures.map_x` DECIMAL(5, 4) NULL
  - `enclosures.map_y` DECIMAL(5, 4) NULL

## Aprobaciones

| Rol | Nombre | Fecha | Resultado |
|---|---|---|---|
| Responsable de BD | Víctor Adrián | 2026-11-03 | Aprobada |
| Responsable backend | Víctor Adrián | 2026-11-03 | Aprobada |

## Aplicación por ambiente

| Ambiente | Estado | Fecha | Evidencia |
|---|---|---|---|
| desarrollo/pruebas | pendiente | | |
| staging | pendiente | | |
| producción | pendiente | | |
