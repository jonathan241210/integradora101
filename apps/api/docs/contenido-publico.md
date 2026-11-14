# Contenido público: noticias y eventos

Referencia de los endpoints públicos de solo lectura (spec `api-011`, y `api-006` para eventos). Prefijo `/api/v1`, sin autenticación, sin cookies ni `Authorization`.

## Endpoints

| Método | Ruta | Nombre | Descripción |
|---|---|---|---|
| GET | `/news` | `news.index` | Noticias visibles, paginadas, sin `content`. |
| GET | `/news/{news}` | `news.show` | Detalle de una noticia visible, con `content`. |
| GET | `/events` | `events.index` | Eventos vigentes; `limit` opcional. |
| GET | `/events/{event}` | `events.show` | Detalle de un evento vigente. |

## Parámetros

- `GET /news`: `limit` (entero 1 a 50, por defecto 10) y `page` (entero mínimo 1, por defecto 1).
- `GET /events`: `limit` (entero 1 a 50, opcional; sin `limit` devuelve la lista completa y sin `meta`).
- Un valor inválido responde `422` con `message` y `errors.limit` o `errors.page` en español.

## Visibilidad de noticias

Una noticia se muestra si `is_active` es verdadero, no está borrada lógicamente, `published_date` es menor o igual a hoy y `end_date` es nulo o mayor o igual a hoy. Orden: `published_date` descendente y `id` descendente. `has_more` se calcula pidiendo un elemento extra, sin contar el total.

## Zona horaria

«Hoy» se calcula en `America/Mexico_City` (`config('arca.public_timezone')`, `App\Support\PublicCalendar::today()`). `config('app.timezone')` sigue en `UTC`.

## Ejemplo de listado

```json
{
  "data": [
    {
      "id": 3,
      "title": "Nuevo recorrido por el sendero de aves",
      "description": "Desde el sábado, el sendero …",
      "category": "Aviso a visitantes",
      "published_date": "2026-11-05",
      "start_date": null,
      "end_date": "2026-12-05",
      "image_url": "http://localhost:8000/storage/news/0b1c…-….webp"
    }
  ],
  "meta": { "page": 1, "limit": 3, "has_more": true }
}
```

El detalle devuelve `{"data": {...}}` con los mismos campos más `content`. No se exponen `author_id`, `is_active`, `image_path` ni `deleted_at`. `image_url` es `null` si la imagen no está gestionada por `api-008`.

## Errores

- `404` `{"message": "Noticia no encontrada."}` si no existe, no es visible o el identificador no es numérico (sin consultar la BD).
- `404` `{"message": "Evento no encontrado."}` para eventos.
- `422` por `limit` o `page` inválidos.

## CORS

`CORS_ALLOWED_ORIGINS` en `.env` debe incluir el origen exacto del portal. En desarrollo: `http://localhost:8080` (no `127.0.0.1`, que es otro origen). `config/cors.php` no cambia.

## Origen de `image_url`

`image_url` se construye con el disco del ámbito público (`ResolveMediaDiskAction`, `api-013`), que se elige con `PUBLIC_MEDIA_DISK`. La base de datos guarda solo la ruta relativa (`news/<uuid>.<ext>`, `events/<uuid>.<ext>`), nunca la URL, un nombre de disco ni una ruta absoluta; si cambia la URL del disco, cambia `image_url` y no la fila.

- **Valor por defecto (`PUBLIC_MEDIA_DISK` ausente o vacía = `public`):** disco `public` de Laravel con `APP_URL` más `/storage`; requiere `php artisan storage:link`. La imagen solo existe en la máquina o el servidor donde se subió (`api-008`).
- **Carpeta compartida de pruebas (`PUBLIC_MEDIA_DISK=media`; ADR 0026 y `apps/api/specs/013-object-storage-images.md`, D-01 a D-04):** las imágenes se guardan en la carpeta versionada `apps/api/src/media/`, en `news/` y `events/`. `image_url` empieza por `MEDIA_PUBLIC_URL` o, si está vacía, por `APP_URL` más `/media`; el enlace `public/media` lo crea `php artisan storage:link`. El mismo archivo aparece como `.../media/news/<uuid>.<ext>` en lugar de `.../storage/...`.
- **`MEDIA_PUBLIC_URL`:** si tiene valor, sustituye la URL del disco público, sea `public` o `media`.
- **Momentos (`api-010`):** sus imágenes están en `media/memories/`. La API no devuelve `image_url` de un momento pendiente o rechazado en ninguna respuesta (`api-013` RN-16); el archivo es alcanzable por su URL si alguien la conoce (riesgo del ADR 0026). Solo los momentos aceptados tienen `image_url`. Esta referencia detalla noticias y eventos.
- **Visibilidad entre equipos:** un equipo ve la imagen si tiene el archivo (`git pull`) y la API que consulta responde desde una `APP_URL` alcanzable. La API no comprueba que el archivo exista en cada lectura. Solo se usan datos de prueba (`api-013` CA-22).

Opción futura, no implementada ni aprobada: `docs/propuestas/almacenamiento-objetos-s3.md`.

El formato de la respuesta no cambia: el campo sigue siendo una URL absoluta o `null`. La base de datos guarda solo la ruta relativa, nunca la URL.

## Momentos publicados

Endpoint de `api-012` (consumidor: `web-010`). Solo lectura, sin autenticación.

- Ruta: `GET /api/v1/memories`; nombre `memories.index`.
- Parámetros: `limit` (entero 1 a 50, por defecto 10) y `page` (entero desde 1, por defecto 1). `has_more` se calcula pidiendo un elemento más, sin `COUNT(*)`.
- Errores `422`: «El límite debe ser un número entero entre 1 y 50.» (`errors.limit`) y «La página debe ser un número entero mayor o igual a 1.» (`errors.page`).
- Visibilidad: `status` igual a `accepted`, sin `deleted_at` y `published_until` posterior a la hora actual. La vigencia se calcula al consultar; no se escribe nada. Con `published_until` nulo no se lista.
- Orden: `published_at` descendente y `id` descendente.
- Campos (lista blanca): `id`, `opinion` (texto plano, `null` si no hay), `image_url` y `published_at` (ISO 8601 en UTC). Nunca datos del visitante ni de revisión, ni rutas.
- `image_url`: URL del disco público configurado (`filesystems.media_scopes.public`; `MEDIA_PUBLIC_URL` o `APP_URL` más `/media`). Es `null` si la ruta publicada no está bajo `memories/` o si el archivo no existe en el disco; la respuesta no falla.
- CORS: igual que noticias y eventos (`CORS_ALLOWED_ORIGINS`).

Ejemplo:

```json
{
  "data": [
    {
      "id": 12,
      "opinion": "Un día inolvidable",
      "image_url": "http://localhost:8000/media/memories/0b9c....jpg",
      "published_at": "2026-11-13T12:00:00+00:00"
    }
  ],
  "meta": { "page": 1, "limit": 10, "has_more": false }
}
```

`EXPLAIN` de la consulta en `arca_pruebas` (solo lectura, 2026-11-13, MySQL 8.4.11 con 5 filas en la tabla): `type=ref`, `possible_keys` con `idx_visitor_memories_status_publication` e `idx_visitor_memories_status_created`, `key=idx_visitor_memories_status_created`, `rows=2`, `Extra: Using where; Using filesort`. Con tan pocas filas el optimizador eligió el índice por `status`; el filtro usa `status` como prefijo y el orden requiere `filesort`, aceptable con el volumen previsto. Riesgo anotado: reevaluar con volumen real; no se crea ningún índice sin DBR.

## Precondición

DBR-005 aplicada en el ambiente (`deleted_at` en `news` y `events`).

## Especies publicadas (api-015)

`GET /api/v1/published-species` (nombre `published-species.index`). Público, solo lectura, sin paginación. Lista solo las especies con `species.is_published = 1` y sin `deleted_at`; no lee `species_publication_requests`. No sustituye a `GET /api/v1/species` (`api-006`), que sigue para la app móvil.

### Parámetros (opcionales)

| Parámetro | Regla | Coincidencia | Mensaje 422 |
|---|---|---|---|
| `habitat` | 1 a 150 caracteres tras quitar espacios | igualdad, sin distinguir mayúsculas ni acentos distintos (`Sélva` no es `Selva`); solo entre especies que publican `habitat` | El hábitat debe tener de 1 a 150 caracteres. |
| `name` | 1 a 150 caracteres tras quitar espacios | contiene el texto; `%` y `_` son literales | El nombre debe tener de 1 a 150 caracteres. |
| `category` | `mammal`, `bird`, `reptile`, `amphibian`, `fish` o `invertebrate` | igualdad | Tipo de animal no válido. |

Los filtros se combinan con «y». Un parámetro desconocido se ignora. El error 422 trae `message` y `errors.<parámetro>`. Orden: `common_name` y luego `id`. Sin resultados: `200` con `{"data": []}`.

### Campos

Siempre: `id`, `common_name`, `category` (`null` si no tiene) e `image_url`. Además, según `species.published_fields`: `scientific_name`, `origin` (se lee de `species.distribution`) y `habitat`, con `null` si no hay dato. Cualquier otra clave de `published_fields` se ignora. No se devuelven `image_path`, `is_published`, `published_fields` ni datos de personal.

`image_url` es la URL pública del archivo en `species/` del disco público de medios (`ResolveMediaDiskAction`), o `null` si `image_path` es `null`, no está bajo `species/` o el archivo no existe.

```json
{"data": [{"id": 3, "common_name": "Jaguar", "category": "mammal", "image_url": "http://localhost:8000/media/species/<archivo>.jpg", "scientific_name": "Panthera onca", "origin": "Sureste de México", "habitat": "Selva tropical"}]}
```

Precondición: DBR-013 aplicada en el ambiente. CORS: el origen del portal debe estar en `CORS_ALLOWED_ORIGINS`.
