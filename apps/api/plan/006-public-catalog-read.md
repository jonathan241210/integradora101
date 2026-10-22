# Plan técnico · 006 · public-catalog-read

- Spec: `apps/api/specs/006-public-catalog-read.md`
- Estado de spec: Aprobada (Víctor Adrián, 2026-10-22)
- Responsable técnico: Víctor Adrián (API); revisión backend pendiente
- Consumidores: `mobile-003` (`apps/mobile`)

## Diseño de solución

La API expone cuatro rutas públicas de solo lectura bajo `/api/v1` para el catálogo y la cartelera. No hay autenticación, escrituras ni cambios de esquema: se leen las tablas existentes `species`, `animals`, `enclosures` y `events` de `arca_pruebas`.

El contrato no calca las tablas: la ficha móvil necesita foto, longevidad, dieta, características y zona, que viven en `animals` y `enclosures`. `SpeciesResource` **compone** la respuesta con el animal representativo de cada especie (el primero con `photo_path`, o el de menor `id` si ninguno la tiene) y el nombre de su recinto. La regla es determinista: la relación `Species::animals()` ordena por `id`.

La cartelera solo muestra eventos activos y vigentes: `is_active = 1` y `end_date` nulo o mayor o igual a la fecha actual. La misma regla aplica al detalle para que un evento terminado no sea accesible por ID directo.

Flujo: ruta nombrada → controlador delgado → Action → API Resource. Sin lógica de negocio en el controlador ni en el cliente.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Rutas | `apps/api/src/routes/api.php` | Registrar `species.index`, `species.show`, `events.index`, `events.show` con validación numérica en el controlador |
| Modelos | `app/Models/Species.php`, `Animal.php`, `Enclosure.php`, `Event.php` | Relaciones Eloquent de solo lectura; `animals()` ordenada por `id` |
| Actions | `app/Actions/Catalog/ListSpeciesAction.php`, `GetSpeciesAction.php`, `ListEventsAction.php`, `GetEventAction.php` | Consultas con carga anticipada y filtros de vigencia |
| HTTP | `app/Http/Controllers/Catalog/SpeciesController.php`, `EventController.php` | Controladores JSON delgados y `404` en español |
| Resources | `app/Http/Resources/SpeciesResource.php`, `EventResource.php` | Contrato `snake_case` estable |
| Pruebas | `tests/Feature/Catalog/PublicCatalogTest.php` | Un test por CA-01…CA-08 contra `arca_pruebas` |
| Documentación | `apps/api/specs/006-public-catalog-read.md`, `apps/api/plan/006-public-catalog-read.md`, `apps/api/tasks/006-public-catalog-read.md` | Trazabilidad SDD |
| Cliente | `apps/mobile` (sin cambios) | Solo consume el contrato; el mapper ya existe |

## Contrato y datos

### Endpoints

| Método | Ruta | Nombre | Auth | Éxito | Error |
|---|---|---|---|---|---|
| `GET` | `/api/v1/species` | `species.index` | Ninguna | `200 {"data":[...]}` | `500` si la BD falla |
| `GET` | `/api/v1/species/{id}` | `species.show` | Ninguna | `200 {"data":{...}}` | `404` «Especie no encontrada.» |
| `GET` | `/api/v1/events` | `events.index` | Ninguna | `200 {"data":[...]}` | `500` si la BD falla |
| `GET` | `/api/v1/events/{id}` | `events.show` | Ninguna | `200 {"data":{...}}` | `404` «Evento no encontrado.» |

`{id}` se valida con `ctype_digit` en el controlador; un valor no numérico responde `404` con mensaje en español antes de consultar la BD.

### `SpeciesResource`

```json
{
  "id": 1,
  "common_name": "Jaguar",
  "scientific_name": "Panthera onca",
  "category": "mammal",
  "distribution": "Sureste de México y Centroamérica",
  "conservation_status": "Casi amenazado",
  "habitat": "Selva tropical y bosques húmedos",
  "gestation_period": "93-105 días",
  "size_cm": "180",
  "model_3d_path": "models/jaguar.glb",
  "photo_path": "https://...",
  "longevity": "12-15 años...",
  "diet": "Carnívoro estricto...",
  "characteristics": "Pelaje dorado...",
  "zone_name": "Zona de Felinos y Sabana"
}
```

Los campos derivados son `null` cuando la especie no tiene animales. `avg_weight`, `fun_fact` y `placeholder_tint` no existen en el esquema y no se exponen (decisión de spec 006).

### `EventResource`

```json
{
  "id": 1,
  "name": "Plática Educativa de Felinos",
  "description": "...",
  "image_path": "https://...",
  "start_date": "2026-10-22",
  "end_date": "2026-10-29",
  "start_time": "12:00:00",
  "end_time": "12:45:00",
  "location": "Recinto de Felinos Mayores",
  "is_active": true
}
```

### Filtros

- `ListEventsAction`: `where('is_active', true)` y `(whereNull('end_date') or where('end_date', '>=', today()))`, orden `start_date`, `start_time`.
- `GetEventAction`: `where('is_active', true)` y la misma condición de vigencia antes de `find`.
- `ListSpeciesAction`: `with(['animals.enclosure'])`, orden `common_name`.
- `GetSpeciesAction`: `with(['animals.enclosure'])` por `id`.

### Datos y DBR

- **Sin DBR y sin migraciones.** El esquema existe y no se altera.
- No se crean ni modifican filas; los tests usan `DatabaseTransactions` y hacen rollback.
- `enclosures` solo tiene `id` y `name`; no se usa `zone`.

### Errores y compatibilidad

- `404` con `{"message": "..."}` en español.
- Colección vacía: `200 {"data": []}`.
- `APP_DEBUG=true` en local muestra traza en el `404`; no afecta el contrato y no se versiona.
- El contrato es compatible con el mapper de `mobile-003` (`photo_path`, `longevity`, `diet`, `characteristics`, `zone_name`).

## Seguridad, offline y operación

- Rutas públicas de solo lectura; no se envían ni aceptan tokens. No se exponen `author_id`, `responsible_id` ni datos de auditoría.
- Sin datos personales, clínicos ni financieros; no hay escritura ni auditoría.
- Sin rate limit específico en esta spec: el catálogo es pequeño y público. Si el tráfico crece, se evalúa en una spec de operación.
- Sin caché de servidor ni CDN; la caché offline es responsabilidad de `mobile-003` (ADR 0014).
- Portabilidad: solo Eloquent y `.env`; funciona igual en Aiven y MySQL local (ADR 0013). `arca_pruebas` es la única base usada por tests.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | `CA-01 public-catalog-read`: lista ordenada por `common_name` y estructura completa | `tests/Feature/Catalog/PublicCatalogTest.php` |
| CA-02 | `CA-02 public-catalog-read`: detalle existente y `404` con mensaje | `tests/Feature/Catalog/PublicCatalogTest.php` |
| CA-03 | `CA-03 public-catalog-read`: solo activos y vigentes, ordenados | `tests/Feature/Catalog/PublicCatalogTest.php` |
| CA-04 | `CA-04 public-catalog-read`: detalle activo/vigente y `404` si terminó o está inactivo | `tests/Feature/Catalog/PublicCatalogTest.php` |
| CA-05 | `CA-05 public-catalog-read`: animal representativo, zona y `null` sin animales | `tests/Feature/Catalog/PublicCatalogTest.php` |
| CA-06 | `CA-06 public-catalog-read`: ID no numérico → `404` sin consultas | `tests/Feature/Catalog/PublicCatalogTest.php` |
| CA-07 | `CA-07 public-catalog-read`: acceso anónimo sin cookies ni campos internos | `tests/Feature/Catalog/PublicCatalogTest.php` |
| CA-08 | `CA-08 public-catalog-read`: cada CA-01…CA-07 tiene un test nombrado | `tests/Feature/Catalog/PublicCatalogTest.php` |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Laravel 12/PHP 8.4, Eloquent y MySQL existente; sin dependencias nuevas ni servicios propietarios |
| II. La spec manda | Sí | Spec `api-006` **Aprobada**; este plan y sus tasks usan el mismo identificador |
| III. Lógica separada de la interfaz | Sí | Controladores delgados; consultas y composición en Actions/Resources; el móvil solo consume |
| IV. Un test por criterio | Sí | CA-01…CA-08 mapeados a `PublicCatalogTest` |
| V. Una sola fuente de verdad para los datos | Sí | Solo lectura de tablas existentes; sin migraciones, sin DBR, sin escritura |
| VI. Código en inglés, personas en español | Sí | Rutas, clases y campos en inglés; mensajes `404` y documentación en español |

Sin excepciones: no se requiere ADR nuevo ni DBR.

## Riesgos y decisiones

- **ADR/DBR:** ninguno. Se apoyan ADR 0001 (API Laravel), 0010 (gobierno de BD) y 0013 (Aiven).
- **Riesgo:** una especie sin animales devuelve campos derivados en `null`; la UI debe tolerarlo (ya lo hace con `Optional`).
- **Riesgo:** latencia de Aiven en frío (20–25 s); se mitiga con la caché de `mobile-003`.
- **Riesgo:** sin paginación el listado crece con el catálogo; hoy son 5 especies. Se reevalúa si supera ~100.
- **Decisión:** los eventos vencidos también responden `404` en el detalle, por consistencia con la cartelera.
- **Decisión:** `/news` queda fuera; requiere spec y datos propios.

## Orden y aprobación

1. Modelos y relaciones (incluido el orden determinista de `animals`).
2. Actions de especies y su Resource.
3. Actions de eventos con filtro de vigencia y su Resource.
4. Rutas nombradas y controladores.
5. Tests CA-01…CA-08 y ajuste de `end_date` en los tests existentes si aplica.
6. `php artisan test`, `vendor/bin/pint --test` y `/verify`.

Aprobación funcional: Víctor Adrián (2026-10-22). Aprobación técnica del plan: pendiente de revisión backend antes del merge.
