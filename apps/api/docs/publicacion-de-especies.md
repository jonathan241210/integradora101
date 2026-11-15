# Publicación de especies

Referencia de la API de solicitudes de publicación de especies (spec `api-014`). Prefijo `/api/v1`. No incluye la lectura pública (`api-015`). Sin secretos ni valores de entorno.

## Flujo

1. El veterinario envía una solicitud de primera publicación (`publish`) o de actualización (`update`) sobre una especie existente. La solicitud nunca crea ni borra filas de `species` (CA-24).
2. La Dirección (permiso `species.review`, solo `zoo-admin`, con 2FA confirmado) revisa, edita, acepta o rechaza.
3. Solo al aceptar cambian las columnas de publicación de la especie: `is_published`, `published_at`, `unpublished_at`, `image_path` y `published_fields` (CA-31).
4. La Dirección también puede despublicar, republicar, editar una especie despublicada y eliminar la publicación.

Estado derivado de la especie: `not_published`, `published`, `unpublished` o `pending` (con solicitud viva). Solo puede existir una solicitud viva por especie (CA-34).

## Rutas

| Método | Ruta | Nombre | Quién |
|---|---|---|---|
| GET | `/veterinarian/species` | `veterinarian.species.index` | Veterinario: selector con estado de publicación |
| GET | `/veterinarian/species-publication-requests` | `veterinarian.species-publication-requests.index` | Veterinario: «Mis solicitudes» |
| POST | `/veterinarian/species-publication-requests` | `veterinarian.species-publication-requests.store` | Veterinario: envío (multipart si lleva foto) |
| GET | `/admin/species-publication-requests` y `/{id}` | `admin.species-publication-requests.*` | `species.review` |
| GET | `/admin/species-publication-requests/{id}/image` | | `species.review` |
| PATCH | `/admin/species-publication-requests/{id}` | | Editar antes de decidir; con foto, `POST` multipart con `_method=PATCH` |
| POST | `/admin/species-publication-requests/{id}/accept` | | Parámetro `publish` opcional |
| POST | `/admin/species-publication-requests/{id}/reject` | | `rejection_reason` obligatorio, hasta 500 caracteres |
| GET | `/admin/published-species` | `admin.published-species.index` | Publicadas y despublicadas, 10 por página |
| GET | `/admin/species/{id}/image` | `admin.species.image` | Foto publicada o 404 |
| GET, PATCH, DELETE | `/admin/species/{id}/publication` | `admin.species.publication.*` | Ver, editar despublicada, eliminar publicación |
| POST | `/admin/species/{id}/unpublish` y `/republish` | | Despublicar y republicar |

Los nombres exactos están en `apps/api/src/routes/api.php`. Los errores de validación responden `422` en español; una solicitud inexistente o eliminada, `404` con «Solicitud no encontrada.»; sin permiso, `403`.

## Archivos de fotos

- Disco `media`, dos carpetas: `species-requests/` (foto pendiente) y `species/` (foto publicada). El nombre es siempre un UUID generado por el servidor.
- JPEG o PNG, hasta 5 MB. Al aceptar, la foto pendiente se copia a `species/`.
- Ningún archivo original se borra antes del commit. Si la transacción falla, solo se borra la copia nueva. Si el borrado falla tras el commit, la respuesta sigue siendo `200` y se registra un aviso técnico sin la ruta (CA-39).
- La API nunca borra rutas fuera de las dos carpetas.

## Concurrencia

Cada Action bloquea primero la especie y después su solicitud, y comprueba el estado dentro del bloqueo (CA-19, CA-41). Una restricción única de la base impide dos solicitudes vivas por especie. Los tests son secuenciales; la concurrencia real queda como deuda (R5 del plan).

## Auditoría

Cada decisión registra una entrada de actividad en español (por ejemplo «Especie publicada por {admin}»). Las propiedades llevan identificadores, nunca rutas de archivos.

## Pruebas

`apps/api/src/tests/Feature/SpeciesPublication/` y `Staff/SeedersTest.php`. `SpeciesPublicationCoverageTest` verifica que CA-01 a CA-41 tengan un test con nombre, que se use `arca_pruebas` y que no se use `RefreshDatabase`.

## Despliegue

Ver el checklist de `infra/README.md`: permisos `species.review` y `memories.review` (seeder), carpetas de medios y límites de subida.
