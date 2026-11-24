# DBR-019 · Lugares del zoológico y red de nodos de ruta

- Estado: Aplicada en arca_pruebas (migración verificada con `migrate:status`). Staging y producción: pendiente de despliegue (ver `infra/README.md`).
- Solicitada: 2026-11-17
- Aprobada: 2026-11-17
- Feature/spec origen: pendiente de vincular (contexto relacionado: `apps/mobile/specs/007-map-location.md`, `docs/database/requests/DBR-008-enclosure-gps-coordinates.md`)
- Responsable de BD: Responsable de BD (rol)
- Responsable backend: Backend
- Decisiones confirmadas (solicitante): nombres físicos `zoo_places`/`path_nodes` e `INT UNSIGNED` (PK) correctos; `place_type` y `node_type` como catálogos cerrados documentados (validación en app; en BD según defina el responsable: ENUM, CHECK o tabla catálogo), sin unicidad por `name` (hay repetidos en puntos distintos) y unicidad por `id` estable; `name_original` y soft deletes (`deleted_at`) correctos; `path_edges` diferido a fase 2.

## Problema y justificación

Actualmente la información geográfica disponible para el mapa/navegación está fragmentada: los recintos tienen soporte de coordenadas en `enclosures` (DBR-008), mientras que zonas comunes, servicios (baños, cafetería, comida, boletaje), puntos de referencia (inicio, entradas, vistas) y la red de trayectos (intersecciones, vueltas, caminos, pasillos) solo existen como levantamiento en campo en un JSON (`recintos_zoologico_20261113 (1).json`, 105 puntos con `name`, `gps_lat`, `gps_lon`).

Para mapear y guiar recorridos dentro del zoológico se requiere una fuente de verdad centralizada que:
1. Mantenga los **recintos** en su entidad correspondiente.
2. Incorpore una entidad para **lugares/zonas/servicios/puntos de interés** distintos de recintos.
3. Incorpore una entidad para **nodos de ruta** (intersecciones, vueltas, caminos, pasillos) y, posteriormente, sus **conexiones** para formar un grafo navegable.
4. Almacene coordenadas reales (`gps_lat`, `gps_lon`) y deje preparada la captura de coordenadas de mapa/SVG (`map_x`, `map_y`) cuando el plano definitivo esté disponible.

## Estado actual

- `enclosures`: existe y cuenta con columnas de coordenadas (`gps_lat`, `gps_lon`, `map_x`, `map_y`) según DBR-008. No existe (a nivel de esta solicitud) una carga masiva confirmada de los recintos levantados en campo.
- No existe tabla dedicada para lugares/zonas/servicios del zoológico (baños, cafetería, comida, boletaje, zonas comunes, inicio, etc.) con coordenadas.
- No existe tabla dedicada para nodos de ruta ni para aristas/conexiones de la red peatonal; la app móvil usa actualmente un grafo local en código (`apps/mobile/src/constants/zooPaths.ts`).
- El levantamiento de campo disponible no incluye `map_x/map_y`, identificadores estables, tipo normalizado ni conexiones entre nodos de ruta.

## Contrato solicitado

Se solicita estructurar los datos en tres grupos lógicos (nombres físicos/tablas definitivos a validar por el responsable de BD):

### A. Recintos (`enclosures`, existente)
- **Uso:** recintos/aviarios y puntos que representen exhibiciones de animales.
- **Datos solicitados:** alta/actualización de coordenadas GPS y, cuando aplique, preparación de `map_x/map_y` para los recintos levantados.
- **Campos relevantes:** identificador estable, nombre visible, `gps_lat`, `gps_lon`, `map_x`, `map_y` (nullable), y metadatos que el responsable de BD considere necesarios (visibilidad/estado) alineados al esquema vigente.

### B. Lugares del zoológico (tabla nueva, nombre propuesto: `zoo_places` o equivalente)
- **Uso:** zonas comunes, servicios e instalaciones no-recinto (baños, cafetería/comida, boletaje, zonas comunes, áreas, puntos de referencia/amenidades como fuentes, accesos/escaleras, inicio, etc.).
- **Campos mínimos propuestos:**
  - `id` / clave primaria (recomendado `INT UNSIGNED` como en `enclosures`, a validar por BD)
  - `name` (nombre visible, español)
  - `name_original` (nullable, trazabilidad del levantamiento/JSON de origen)
  - `place_type` VARCHAR(50) NOT NULL, **catálogo cerrado** documentado y validado en app (y en BD según decisión del responsable: `ENUM`, `CHECK` o tabla catálogo). **Propuesto desde el dataset normalizado (`subtype` de `lugares`, 18 filas):** `access`, `amenity`, `common_area`, `food`, `landmark`, `restroom`, `ticketing`, `viewpoint`. Ajustar/confirmar en spec.
  - `gps_lat` DECIMAL(10,8) NULL, `gps_lon` DECIMAL(11,8) NULL
  - `map_x`, `map_y` DECIMAL(5,4) NULL (coordenadas SVG normalizadas 0.0000–1.0000, alineado con DBR-008)
  - `is_visible` TINYINT(1) NOT NULL DEFAULT 1
  - timestamps y `deleted_at` (soft deletes), confirmados
- **Restricciones:** unicidad por `id` estable. **Sin unicidad por `name`** ni por (`name`,`place_type`) porque existen nombres repetidos en puntos distintos (p. ej. `Fuente`); solo agregar restricción compuesta si el negocio lo exige. Índices sugeridos: `place_type`, `is_visible`.

### C. Nodos de ruta (tabla nueva, nombre propuesto: `path_nodes` o equivalente)
- **Uso:** intersecciones, vueltas, caminos, pasillos y puntos de trayecto necesarios para la red peatonal.
- **Campos mínimos propuestos:**
  - `id` / clave primaria (recomendado `INT UNSIGNED`, a validar por BD)
  - `name` / etiqueta VARCHAR(255) NULL (opcional si es nodo técnico)
  - `node_type` VARCHAR(50) NOT NULL, **catálogo cerrado** documentado y validado en app (y en BD según decisión del responsable). **Propuesto desde el dataset normalizado (`subtype` de `nodos_ruta`, 24 filas):** `intersection`, `path`, `path_node`, `turn`. Ajustar/confirmar en spec.
  - `gps_lat` DECIMAL(10,8) NULL, `gps_lon` DECIMAL(11,8) NULL
  - `map_x`, `map_y` DECIMAL(5,4) NULL
  - timestamps y `deleted_at` (soft deletes), confirmados
- **Restricciones:** unicidad por `id` estable. Sin unicidad por `name`. Índice sugerido: `node_type`.
- **Relación futura (fase 2):** tabla de aristas `path_edges` (`from_node_id`, `to_node_id`, bidireccionalidad/peso/distancia opcional) para habilitar ruteo. **El levantamiento actual no provee aristas**; no se crea en la migración inicial de esta DBR.

## Elementos afectados

| Tipo | Nombre | Cambio |
|---|---|---|
| tabla (existente) | `enclosures` | carga/actualización de datos de coordenadas para recintos levantados (sin cambio de esquema previsto; sujeto a validación BD) |
| tabla (nueva, propuesta) | `zoo_places` (nombre a confirmar) | crear para lugares/zonas/servicios/POIs con GPS y `map_x/map_y` |
| tabla (nueva, propuesta) | `path_nodes` (nombre a confirmar) | crear para nodos de la red de ruta con GPS y `map_x/map_y` |
| tabla (nueva, propuesta, fase 2) | `path_edges` (nombre a confirmar) | **No incluida en esta migración inicial** (el levantamiento no trae aristas). Crear en DBR o fase posterior cuando exista conectividad aprobada |
| índices | por definir | según diseño final aprobado por responsable de BD (sugeridos: `place_type`, `is_visible`, `node_type`) |

## SQL de referencia (MySQL 8.0)

> **Referencia para revisión; no ejecutar directamente.** El cambio real se implementará como migración(es) Laravel creada(s) por el responsable de BD. Tipos, longitudes, nombres físicos, claves, índices, soft deletes y auditoría deben ajustarse al estándar vigente del esquema (`enclosures`/DBR-001, DBR-008). Para `map_x`/`map_y` se recomienda `DECIMAL(5,4)` (rango 0.0000–1.0000), alineado con DBR-008.

```sql
-- Ejemplo ilustrativo (NO ejecutar). Ajustar nombres/tipos/convenciones.

-- Lugares/zonas/servicios
CREATE TABLE zoo_places (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  name_original VARCHAR(255) NULL,
  place_type VARCHAR(50) NOT NULL,
  gps_lat DECIMAL(10, 8) NULL,
  gps_lon DECIMAL(11, 8) NULL,
  map_x DECIMAL(5, 4) NULL,
  map_y DECIMAL(5, 4) NULL,
  is_visible TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  INDEX idx_zoo_places_type (place_type),
  INDEX idx_zoo_places_visible (is_visible)
);

-- Nodos de ruta
CREATE TABLE path_nodes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NULL,
  node_type VARCHAR(50) NOT NULL,
  gps_lat DECIMAL(10, 8) NULL,
  gps_lon DECIMAL(11, 8) NULL,
  map_x DECIMAL(5, 4) NULL,
  map_y DECIMAL(5, 4) NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  INDEX idx_path_nodes_type (node_type)
);

-- Fase 2 (fuera de esta migración inicial): path_edges cuando existan aristas del levantamiento.
```

**Código de migración Laravel (referencia):** preparado para el solicitante. No se crea archivo en `apps/api/src/database/migrations/` ni se ejecuta desde este flujo: la migración la crea, prueba y aplica el responsable de BD tras aprobar la DBR (Constitución V, `docs/database/README.md`). Ver el bloque «Migración Laravel de referencia (DBR-019)» entregado junto con esta solicitud.

## Datos existentes y migración de datos

- **Fuente:** `C:\Users\vic22\Downloads\recintos_zoologico_20261113 (1).json` (105 registros; solo `name`, `gps_lat`, `gps_lon`).
- **Normalización propuesta (corregida):** 63 recintos, 18 lugares, 24 nodos de ruta. Se reclasificaron como nodos de ruta: `Entrada fuente`, `Fin establecimientos de comida`, `Fin zona comun`, `Vuelta1` (solicitado por el usuario).
- **Dataset normalizado preparado:** `C:\Users\vic22\AppData\Local\Temp\opencode\zoo-places-normalized.json` (insumo con `suggested_id`, `name_original`, `type`, `subtype`, `gps_lat`, `gps_lon`, `map_x/map_y` nulos). Debe revisarse/depurarse antes de importación (nombres, typos, duplicados semánticos, visibilidad).
- **`map_x/map_y`:** no disponibles; permanecen `NULL` hasta contar con SVG definitivo y calibración.
- **Backfill/importación:** método (seeder, script de importación controlado, o carga manual) a definir por responsable de BD/backend según política; no ejecutar SQL directo.
- **Aristas (`path_edges`):** no incluidas en el levantamiento; requieren definición de conectividad/orden.

## Privacidad, auditoría y retención

- **Clasificación:** datos geográficos/operativos públicos del zoológico (ubicación de recintos, instalaciones y trazado). No son datos personales ni clínicos ni financieros.
- **Auditoría:** aplicar timestamps y, si corresponde al estándar de la tabla, campos de autoría (`created_by`/`updated_by`) y soft deletes conforme a la Constitución V y políticas de modelos.
- **Retención:** sin requisitos especiales identificados; cambios de ubicación deben quedar trazables por el mecanismo de auditoría adoptado.

## Impacto, rendimiento y reversión

- **Volumen inicial:** bajo (orden de cientos de filas). Impacto de creación de tablas e índices esperado mínimo.
- **Rendimiento:** definir índices según patrones de consulta (listado por tipo/visibilidad, búsqueda por nombre, joins de grafo si se crean aristas).
- **Reversión:** migraciones `down()` deben eliminar en orden seguro (primero tablas dependientes/FK como `path_edges`, luego `path_nodes`/`zoo_places`); documentar respaldo previo por ambiente. La reversión de carga de datos debe considerarse aparte según evidencia.
- **Despliegue:** cambios preferentemente expansivos; consumidores (API/móvil) deben tolerar ausencia de `map_x/map_y`.

## Compatibilidad MySQL 8.0

- Usar tipos y sintaxis compatibles con MySQL 8.0.x (revisión mínima registrada en el gobierno de BD), portable entre Aiven y MySQL Server local. Sin extensiones propietarias.
- Definir precisión de coordenadas y charset/collation alineados al esquema existente.

## Objeto almacenado (si aplica)

No aplica en esta solicitud. Las reglas de negocio y exposición de datos deben permanecer en Actions/controladores de la API; cualquier función/procedimiento requeriría justificación adicional.

## Plan de ejecución y carga de datos

### Fase 0 — Cierre documental (previo a migración)
- [ ] Confirmar/vincular spec origen y responsables (BD, backend) en esta DBR.
- [ ] Cerrar catálogos definitivos de `place_type` (`access, amenity, common_area, food, landmark, restroom, ticketing, viewpoint` propuestos) y `node_type` (`intersection, path, path_node, turn` propuestos) y el mecanismo de validación en BD (ENUM/CHECK/tabla) y en app.
- [ ] Revisar dataset normalizado: depurar nombres/typos, validar reclasificaciones, conservar `name_original`, decidir `is_visible` inicial y mantener `map_x/map_y` en NULL.

### Fase 1 — Migración de esquema (responsable de BD)
- [ ] Responsable de BD crea la migración Laravel (referencia preparada) y la prueba en base MySQL 8.0 aislada / `arca_pruebas`.
- [ ] Evidencia: `SHOW CREATE TABLE zoo_places`, `SHOW CREATE TABLE path_nodes`, verificación de tipos decimales, índices, `deleted_at`, y prueba de `down()` en entorno de prueba sin datos productivos.
- [ ] Registrar resultado en «Pruebas y evidencia» y «Aplicación por ambiente»; pasar DBR a `Verificada por BD en desarrollo/pruebas` y luego `Lista para backend` según flujo.
- [ ] **No** ejecutar SQL manual directo ni migraciones desde tests.

### Fase 2 — Carga/importación controlada (por ambiente, método aprobado)
- [ ] Definir método controlado (seeder, comando/artisan, script de importación o carga asistida), nunca SQL ad hoc en producción. Respaldo previo del ambiente.
- [ ] **`enclosures` (63 recintos del levantamiento):** mapear registros del dataset a filas existentes de `enclosures` por identificador estable acordado (id/nombre oficial); actualizar solo `gps_lat`/`gps_lon` (y `map_x/map_y` si aplica) sin cambiar esquema. Resolver coincidencias/duplicados manualmente antes de cargar.
- [ ] **`zoo_places` (18):** insertar con `name`, `name_original`, `place_type` (catálogo cerrado), `gps_lat`, `gps_lon`, `map_x/map_y` NULL, `is_visible` definido. Repetidos nominales (p. ej. `Fuente`) se cargan como filas distintas con `id` distinto (puntos distintos por coordenadas).
- [ ] **`path_nodes` (24):** insertar con `name` (nullable si técnico), `node_type` (catálogo cerrado), coordenadas y `map_x/map_y` NULL.
- [ ] Validaciones post-carga: conteos (63/18/24 según dataset aprobado), rangos GPS, `place_type`/`node_type` dentro del catálogo, sin registros huérfanos conceptuales, y registro de evidencia (conteos/consulta de verificación sin secretos).

### Fase 3 — Consumo y fases posteriores
- [ ] Con `Lista para backend`: exponer datos por API según spec (modelos/Actions/endpoints) y consumo móvil/web; tolerar `map_x/map_y` NULL.
- [ ] Fase 2 futura: definir y levantar `path_edges` (aristas, pesos/bidireccionalidad) en DBR/migración separada cuando exista conectividad.
- [ ] Completar `map_x/map_y` cuando exista SVG definitivo y calibración (actualización de datos, sin cambio de esquema si columnas ya existen).

## Orden de despliegue

1. Aprobación de esta DBR y definición final de nombres/campos/catálogos por responsable de BD.
2. Responsable de BD crea y prueba migración(es) en `arca_pruebas` (MySQL 8.0 aislada) con evidencia.
3. Estado `Lista para backend`: actualización de modelos/contratos/endpoints (API) para exponer recintos/lugares/nodos según spec correspondiente.
4. Carga/importación de datos aprobada por ambiente (desarrollo/pruebas → staging → producción) con registro en esta DBR.
5. Consumo móvil/web tras disponibilidad del contrato; `map_x/map_y` podrán completarse en iteración posterior sin cambio de esquema si las columnas ya existen.

## Pruebas y evidencia

- Pruebas de esquema/objeto ejecutadas por BD en base MySQL 8.0 aislada: pendiente de detallar (se recomienda adjuntar `SHOW CREATE TABLE zoo_places;`, `SHOW CREATE TABLE path_nodes;`, validación de índices/`deleted_at`/decimales y prueba de `down()` en entorno de prueba).
- Resultado y evidencia (sin secretos ni datos sensibles): migración aplicada en `arca_pruebas` por el responsable de BD. Salida reportada:
  - `php artisan migrate` → `INFO Running migrations.` / `2026_11_17_000019_zoo_places_and_path_nodes_schema ... 1s DONE`
- Pruebas integradas del backend: pendiente (tras `Lista para backend` y spec/implementación asociada).
- Validación de datos fuente: conteo 105, clasificación propuesta 63/18/24, duplicados nominales identificados (`Recinto codorniz 4` x2, `Fuente` x2) como puntos distintos por coordenadas; catálogos propuestos desde dataset (`zoo_places.place_type`: access, amenity, common_area, food, landmark, restroom, ticketing, viewpoint; `path_nodes.node_type`: intersection, path, path_node, turn). Carga/importación de datos: pendiente (fase 2 del plan).

## Aprobaciones

| Rol | Resultado | Evidencia |
|---|---|---|
| Responsable de BD | Migración implementada en `arca_pruebas` (aprobación formal de diseño pendiente de registrar si aplica) | Registro de esta DBR |
| Backend | Pendiente | |

## Aplicación por ambiente

| Ambiente | Estado | Evidencia |
|---|---|---|
| `arca_pruebas` | Aplicada en arca_pruebas | `php artisan migrate`: `2026_11_17_000019_zoo_places_and_path_nodes_schema ... 1s DONE` (responsable de BD). Detalle de esquema (`SHOW CREATE TABLE`) pendiente de adjuntar. |
| staging | Pendiente de despliegue (ver checklist de `infra/README.md`) |  |
| producción | Pendiente de despliegue (ver checklist de `infra/README.md`) |  |
