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

Vigente hoy: `image_url` sale del disco `public` de Laravel con `APP_URL` y `/storage`, y requiere `php artisan storage:link`. La imagen solo existe en la máquina o el servidor donde se subió (`api-008`).

**Carpeta compartida de pruebas (decisión del responsable, pendiente de aprobación formal del equipo; ADR 0026 y `apps/api/specs/013-object-storage-images.md`, D-01 a D-04):** las imágenes de noticias y eventos se guardan en la carpeta versionada `apps/api/src/media/`, en `news/` y `events/` (disco `media`, con `PUBLIC_MEDIA_DISK=media` en el `.env` de cada equipo de pruebas). `image_url` sale de `MEDIA_PUBLIC_URL` o, si está vacía, de `APP_URL` más `/media`, y el enlace `public/media` lo crea `php artisan storage:link`. Con esa configuración, el mismo archivo aparece como `.../media/news/<uuid>.<ext>` en lugar de `.../storage/...`. Toda la carpeta `media/` se versiona, y eso incluye `memories/` (momentos); esta referencia cubre solo noticias y eventos. Un equipo ve la imagen si tiene el archivo (`git pull`) y la API que consulta responde desde una `APP_URL` alcanzable. Las imágenes de momentos (`api-010`) están en `media/memories/`; la API no les devuelve `image_url` mientras no estén aceptadas (`api-013` RN-16), pero el archivo es alcanzable por su URL si alguien la conoce (riesgo del ADR 0026). Solo se usan datos de prueba (`api-013` CA-22).

Opción futura, no implementada ni aprobada: `docs/propuestas/almacenamiento-objetos-s3.md`.

El formato de la respuesta no cambia: el campo sigue siendo una URL absoluta o `null`. La base de datos guarda solo la ruta relativa, nunca la URL.

## Precondición

DBR-005 aplicada en el ambiente (`deleted_at` en `news` y `events`).
