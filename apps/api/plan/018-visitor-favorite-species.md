# Plan técnico · 018 · visitor-favorite-species

- Spec: `apps/api/specs/018-visitor-favorite-species.md`
- Estado de spec: Implementada
- Solicitada: 2026-11-14
- Aprobada: 2026-11-14
- Estado del plan: Aprobado técnicamente. Autoriza las tasks. No autoriza código hasta que esas tasks estén aprobadas.
- Responsable técnico: Equipo de producto móvil
- Dependencias: `api-004` (sesión, ability `visitor`, borrado físico de la cuenta), `api-015` (especie visible), DBR-018 (Lista para backend). Consumidor: `mobile-014`.
- Este documento no aplica migraciones y no modifica `src/`. Las tasks viven en `apps/api/tasks/018-visitor-favorite-species.md`.

## Diseño de solución

La cuenta es la lista. Dos rutas, en el mismo grupo que las preferencias de aviso: sesión Sanctum, ability `visitor` y correo verificado. El controlador delega. La Action decide si la especie se puede marcar y arma la lista. El teléfono (`mobile-014`) solo muestra una copia.

```text
GET  /api/v1/visitor/favorite-species
  → ListVisitorFavoriteSpeciesAction
      → filas de esa cuenta cuya especie sigue visible
PUT  /api/v1/visitor/favorite-species/{species}  { "favorite": true|false }
  → UpdateVisitorFavoriteSpeciesAction
      → true: crea la pareja si la especie es visible
      → false: borra la pareja, haya fila o no
  → la misma lista que devolvería el GET
DELETE /api/v1/visitor/me
  → DeleteVisitorAccountAction (sin cambio)
      → el borrado físico de visitors dispara ON DELETE CASCADE
```

Decisiones de este plan:

- **La visibilidad se repite en la Action, no se delega al listado público.** `ListPublishedSpeciesAction` devuelve el catálogo entero. Aquí la regla es la misma pareja de condiciones: `is_published = 1` y `deleted_at` nulo (líneas 29-30 de esa Action, `api-015`).
- **El PUT exitoso devuelve la lista.** La spec pide `200`. `mobile-014` RN-01 sustituye la copia local con lo que devolvió la API. El cuerpo del PUT es el mismo `{"data":[{"id": <species_id>}]}` del GET, ya con el cambio aplicado. Así el cliente no necesita un segundo GET para el corazón.
- **Marcar de nuevo no mueve la fila.** `firstOrCreate` por (`visitor_id`, `species_id`) deja `created_at` de la primera marca. El índice único es el respaldo si dos peticiones llegan juntas.
- **Quitar no consulta visibilidad.** `favorite: false` borra la pareja de esa cuenta. Si no había fila, responde `200` y no crea nada. También borra una fila cuya especie ya no es visible.
- **El borrado de cuenta no gana código nuevo.** `Visitor` no usa SoftDeletes (`api-004` RN-08). `$visitor->delete()` es físico y la clave de DBR-018 borra las filas. `DeleteVisitorAccountAction` no se modifica.
- **Sin Policy nueva y sin permiso Spatie.** El grupo ya exige el ability `visitor`. La Action solo lee y escribe filas del visitante de la sesión, igual que las preferencias de aviso.

## Contrato y datos

### Endpoints

| Método | Ruta | Nombre | Auth | Éxito | Error |
|---|---|---|---|---|---|
| `GET` | `/api/v1/visitor/favorite-species` | `visitor.favorite-species.index` | `auth:sanctum`, `visitor.token`, `EnsureVisitorEmailVerified` | `200 {"data":[{"id":8}]}` | `401` sin sesión; `403` ability ajena o `email_not_verified` |
| `PUT` | `/api/v1/visitor/favorite-species/{species}` | `visitor.favorite-species.update` | El mismo grupo | `200` con la lista ya actualizada | `401`, `403`, `404`, `422` |

`{species}` lleva `whereNumber('species')`. Un segmento que no es un entero no entra al controlador ni a la consulta de especies: Laravel responde `404`. El mensaje de ese `404` no es «Especie no encontrada.».

El grupo es el de `apps/api/src/routes/api.php` que ya envuelve `notification-preferences` (prefijo `visitor`, nombre `visitor.`, prefijo de aplicación `api/v1`). No se añade `throttle`.

### Cuerpo y respuestas

PUT, JSON:

```json
{ "favorite": true }
```

`favorite` es obligatorio y booleano. `true` y `false` de JSON cumplen la regla. Si falta, es `null` o no es booleano, la respuesta es `422`, con `message` en español («El favorito debe ser sí o no.») y la forma de error de `VisitorFormRequest`. No se inserta ni se borra ninguna fila.

Lista, GET y PUT exitosos:

```json
{ "data": [ { "id": 8 }, { "id": 3 } ] }
```

Cada `id` es `species_id`. No salen el id de la fila, `created_at`, el nombre, el correo ni campos de la especie. Lista vacía: `{"data":[]}`.

Orden de la consulta: `visitor_favorite_species.created_at` descendente y, a igual fecha, `visitor_favorite_species.id` descendente. El `id` del JSON sigue siendo el de la especie.

`404` cuando `favorite` es `true` y el id no existe, no está publicado o tiene `deleted_at`:

```json
{ "message": "Especie no encontrada." }
```

No se crea fila. Los tres casos comparten el mensaje: la respuesta no dice cuál fue.

`401` sin token, el mismo comportamiento de Sanctum que el resto de `/api/v1/visitor`. `403` con `{"message":"Confirma tu correo antes de continuar.","code":"email_not_verified"}` si `email_verified_at` es nulo (`EnsureVisitorEmailVerified`). La sesión cookie del personal, con `actingAs` sobre el guard `web`, recibe `403` de `visitor.token` y no lee ni cambia filas (`IsolationTest` ya cubre ese guard en `visitor/me`).

### Reglas de la Action

`ListVisitorFavoriteSpeciesAction`:

- Filtra `visitor_id` de la sesión.
- Exige la especie visible con las dos condiciones de `api-015`, escritas en esta consulta.
- Omite la fila si la especie dejó de ser visible. No la borra por eso.
- Devuelve solo `species_id`, en el orden de arriba.

`UpdateVisitorFavoriteSpeciesAction`:

- `favorite: true`: busca la especie con esas dos condiciones. Si no está, `404` y ninguna escritura. Si está, `firstOrCreate` de la pareja. Una segunda llamada deja una fila y el mismo `created_at`.
- `favorite: false`: `delete` de esa pareja. Cero filas afectadas sigue siendo `200`.
- Después del cambio, responde con el resultado de la Action de lista.

La pareja única la garantiza `uk_visitor_favorite_species_pair`. Si dos altas coinciden, la Action trata la violación del índice como la fila ya existente y responde `200` con la lista.

### Datos y DBR

- DBR-018 está Aprobada y Lista para backend. La migración `apps/api/src/database/migrations/2026_11_14_000018_visitor_favorite_species_schema.php` ya existe. Este plan no la edita ni la ejecuta.
- Tabla `visitor_favorite_species`: `id`, `visitor_id`, `species_id`, `created_at`, `updated_at`. Sin `deleted_at`, sin `created_by` y sin `updated_by`.
- Modelo `VisitorFavoriteSpecies`. No extiende `BaseModel` y no usa SoftDeletes. La excepción ya está aceptada en DBR-018 (Responsable de BD Adrian y Equipo de producto móvil): es una preferencia de la cuenta, no un dato clínico ni financiero. `updated_at` queda el de la migración; la lista no lo lee.
- `visitors.id` y `species.id` son INT. La migración ya declara esas columnas como `integer`. No se cambia el tipo.
- `ON DELETE CASCADE` hacia `visitors`. `ON DELETE RESTRICT` hacia `species`.
- Los tests crean especies con `Species::query()->create` dentro de `DatabaseTransactions`, como `ProgressTest`, y fijan `is_published` en `1`. No son una migración.

### Errores y compatibilidad

- No cambia `GET /api/v1/published-species` ni `GET /api/v1/species`.
- No usa `visitor_collections`.
- No envía correo ni push.
- El cliente compartido suma dos métodos y no decide visibilidad. Ver el área de paquetes.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Datos | Migración de DBR-018, ya en el repositorio | Este plan no la aplica. La primera task futura comprueba `migrate:status` en `arca_pruebas` y no llama a `migrate` |
| API / modelo | `apps/api/src/app/Models/VisitorFavoriteSpecies.php` (nuevo) | Pareja cuenta–especie. Sin `BaseModel` y sin SoftDeletes |
| API / Actions | `apps/api/src/app/Actions/Visitor/ListVisitorFavoriteSpeciesAction.php` (nuevo) | Lista propia, especies visibles, orden |
| API / Actions | `apps/api/src/app/Actions/Visitor/UpdateVisitorFavoriteSpeciesAction.php` (nuevo) | Alta idempotente o borrado físico, y luego la lista |
| API / validación | `apps/api/src/app/Http/Requests/Visitor/UpdateVisitorFavoriteSpeciesRequest.php` (nuevo) | `favorite` booleano obligatorio. Extiende `VisitorFormRequest` |
| API / Resources | `apps/api/src/app/Http/Resources/Visitor/VisitorFavoriteSpeciesResource.php` (nuevo) | Solo `id` (el de la especie) |
| API / HTTP | `apps/api/src/app/Http/Controllers/Visitor/VisitorFavoriteSpeciesController.php` (nuevo) | `index` y `update` delgados |
| API / rutas | `apps/api/src/routes/api.php` | Las dos rutas en el grupo con `EnsureVisitorEmailVerified`, con `whereNumber` en el PUT |
| API / cuenta | `DeleteVisitorAccountAction` | Sin cambio. El CASCADE cubre CA-08 |
| Paquete | `packages/api-client/visitor.ts` | `listFavoriteSpecies` y `updateFavoriteSpecies`. Tipos en inglés. Devuelven `{ data: { id: number }[] }` con `raw: true`, porque la lista vive en `data` y no debe desempaquetarse a un arreglo suelto |
| API / pruebas | `apps/api/src/tests/Feature/Visitor/FavoriteSpeciesTest.php` (nuevo) | CA-01 a CA-08. Extiende `VisitorFeatureTestCase` |
| API / pruebas | `apps/api/src/tests/Feature/Visitor/FavoriteSpeciesCoverageTest.php` (nuevo) | CA-09: cada CA-01 a CA-08 aparece por nombre, hay `DatabaseTransactions` y no hay `RefreshDatabase` ni `migrate` |
| Cliente móvil | Ninguno en este plan | Lo diseña `apps/mobile/plan/014-visitor-favorite-species.md` |

## Seguridad, offline y operación

- La ruta no es pública. Sin token, `401`. Un token de personal o una cookie de personal no cumplen `visitor.token` y reciben `403`.
- La consulta lleva el `visitor_id` de la sesión. Una cuenta no lista ni borra filas de otra.
- El JSON no incluye correo, nombre ni otros datos de la persona. El id de especie es el del catálogo público.
- No hay Activitylog. No son datos clínicos ni financieros.
- No se añade límite de tasa. El grupo de preferencias tampoco lo tiene. El catálogo de especies del zoológico es pequeño y cada alta es una fila por pareja.
- La API no guarda copia en el teléfono. La copia y el modo sin red son `mobile-014`.
- Portabilidad (ADR 0013): índice único, claves foráneas y `TIMESTAMP` de MySQL 8.0, iguales en Aiven y en local. La conexión sigue en `.env`. `arca_pruebas` es la base de los tests. `arca_zoo` no se usa.
- Antes de los tests, quien implemente comprueba en solo lectura que `2026_11_14_000018_visitor_favorite_species_schema` figura como Ran en `arca_pruebas`. DBR-018 documenta la prueba en un MySQL 8.0 aislado y dice que esa firma no aplicó la migración en `arca_pruebas` ni en `arca_zoo`. Si no está Ran, se detiene y la aplica quien lleva la base. Este plan no ejecuta esa comprobación.

## Mapeo de criterios a pruebas

Todas en `apps/api/src/tests/Feature/Visitor/FavoriteSpeciesTest.php`, sobre `VisitorFeatureTestCase` (`DatabaseTransactions`, `arca_pruebas`). Sin `RefreshDatabase`, sin `migrate:fresh` y sin migraciones desde el test.

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | `test_ca01_returns_only_that_account_newest_first`: dos cuentas, orden por `created_at` y por id de fila, JSON solo con `id` de especie | `FavoriteSpeciesTest.php` |
| CA-02 | `test_ca02_empty_account_returns_empty_data` | El mismo archivo |
| CA-03 | `test_ca03_mark_is_idempotent_and_returns_the_list`: especie publicada, un segundo PUT deja una fila y el mismo `created_at` | El mismo archivo |
| CA-04 | `test_ca04_unmark_deletes_and_unmark_missing_stays_empty` | El mismo archivo |
| CA-05 | `test_ca05_hidden_species_is_not_marked_and_disappears_from_the_list`: id ausente, `is_published` en `0` y `deleted_at` con fila previa que el GET omite y no borra | El mismo archivo |
| CA-06 | `test_ca06_session_boolean_and_non_numeric_id`: `401`, `403` `email_not_verified`, `422` sin cambiar filas, `404` de `abc` cuyo mensaje no es «Especie no encontrada.» | El mismo archivo |
| CA-07 | `test_ca07_other_account_and_staff_cookie_do_not_touch_rows`: el PUT de una cuenta no altera la otra; `actingAs` del personal recibe `403` y las filas siguen | El mismo archivo |
| CA-08 | `test_ca08_deleting_the_account_removes_only_its_rows`: `DELETE /api/v1/visitor/me` y la otra cuenta conserva las suyas | El mismo archivo |
| CA-09 | `test_ca09_suite_names_every_criterion_and_uses_database_transactions` | `FavoriteSpeciesCoverageTest.php` |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Laravel, Sanctum y MySQL 8.0. Sin paquete nuevo. Sin SQL propietario. `.env` no cambia |
| II. La spec manda | Sí, en este documento | Spec Aprobada por Equipo de producto móvil. Plan aprobado por Equipo de producto móvil. Las tasks quedan pendientes de su propia aprobación. No hay código de la feature |
| III. Lógica separada de la interfaz | Sí | Visibilidad, unicidad y borrado viven en Actions. El controlador delega. `@arca/api-client` solo declara los dos métodos |
| IV. Un test por criterio | Sí, al implementar | La tabla cubre CA-01 a CA-09. Los tests no se escriben en este corte |
| V. Una sola fuente de verdad para los datos | Excepción ya aceptada | DBR-018 está Lista para backend. La tabla no usa SoftDeletes ni `BaseModel`. BD (Responsable de BD Adrian) y backend (Equipo de producto móvil) lo aceptaron. No es dato clínico ni financiero. La autoridad de la lista es esta API |
| VI. Código en inglés, personas en español | Sí | Rutas, clases y columnas en inglés. «Especie no encontrada.» y el `422` en español |

Ninguna excepción nueva. La de SoftDeletes ya está firmada en DBR-018. El plan ya está aprobado. El código espera la aprobación de las tasks.

## Riesgos y decisiones

- ADR: no hay ADR nuevo. La enmienda del ADR 0014 que deja los favoritos en el teléfono sigue vigente hasta la implementación. Este plan no cambia esa decisión; la nota de conformidad del equipo se corrige porque `api-018` ya está Aprobada.
- Alternativa descartada: reutilizar `visitor_collections`. La spec la deja fuera. Esa tabla es el desbloqueo por QR.
- Alternativa descartada: SoftDeletes en la pareja. Contradice RN-05 y la DBR ya aceptada.
- Una especie despublicada sale del GET y la fila sigue. Al volver a `is_published = 1` y con `deleted_at` nulo, el GET la muestra otra vez. CA-05 lo fija y el test lo cubre.
- El aviso de privacidad oficial, antes del público, debe decir que los favoritos se guardan en la cuenta. Esta feature no redacta ese texto.
- Si la migración no está aplicada en `arca_pruebas`, los tests no pueden correr. No se aplica desde aquí.

## Orden y aprobación

1. Aprobación técnica de este plan: Equipo de producto móvil.
2. Tasks de `api-018`, con la puerta de `migrate:status` en `arca_pruebas` y sin `migrate`. Esperan su propia aprobación antes del código.
3. Implementación de la API y de los dos métodos del cliente, solo con esas tasks aprobadas.
4. El plan de `mobile-014` consume ese contrato y espera, para su código, a que los métodos existan.

La aprobación funcional de la spec es de Equipo de producto móvil. La aprobación técnica de este plan es de Equipo de producto móvil.
