# Tareas · 018 · visitor-favorite-species

- Spec: `apps/api/specs/018-visitor-favorite-species.md` (Aprobada, Aksel, 2026-11-14)
- Plan: `apps/api/plan/018-visitor-favorite-species.md` (Aprobado técnicamente, Aksel, 2026-11-16)
- DBR: `docs/database/requests/DBR-018-visitor-favorite-species.md` (Lista para backend, BD Victor Adrian y backend Aksel, 2026-11-14)
- Estado del checklist: **Aprobado** (Aksel, 2026-11-16). Autoriza el código de estas tareas. No autoriza `migrate` ni un PR.

Ninguna tarea añade alcance. Si algo de la lista no está en la spec o en el plan, se para y se pregunta. Los tests usan `DatabaseTransactions` contra `arca_pruebas`, vía `VisitorFeatureTestCase`. Prohibido `RefreshDatabase`, `migrate:fresh` y ejecutar `migrate`. Nunca `arca_zoo`. El nombre del test cita el criterio (`caNN_` en el método, porque PHPUnit no admite guiones) y el docblock cita `CA-NN`. `DeleteVisitorAccountAction` no se modifica.

## Base de datos (solo lectura)

- [x] **T-01** (precondición de CA-01 a CA-09; RN-05, RN-07): comprobar la migración sin aplicarla.
  - Depende de: nada. Solo se ejecuta cuando este checklist esté aprobado.
  - Pasos: desde `apps/api/src`, `php artisan migrate:status`. La migración `2026_11_14_000018_visitor_favorite_species_schema` debe figurar como ejecutada (`Ran`) y `DB_DATABASE` debe ser `arca_pruebas`, sin copiar secretos al repositorio. No ejecutar `migrate` ni escribir otra migración.
  - Archivos: ninguno.
  - Hecho cuando: la salida de `migrate:status` está anotada en el PR. Si no figura como `Ran`, detenerse y reportarlo. El resto del checklist no empieza.
  - Evidencia local 2026-11-16: `2026_11_14_000018_visitor_favorite_species_schema` figura `Ran` en el lote 9 y la base de trabajo es `arca_pruebas`. No se ejecutó `migrate`.

## Implementación

- [x] **T-02** (RN-05, RN-07): modelo de la pareja.
  - Depende de: T-01.
  - Archivo: `apps/api/src/app/Models/VisitorFavoriteSpecies.php`.
  - Cambios: tabla `visitor_favorite_species`. No extiende `BaseModel` y no usa SoftDeletes. La Action asigna `visitor_id` y `species_id`. No hay asignación masiva desde el request. Relaciones hacia `Visitor` y `Species`.
  - Hecho cuando: la clase apunta a la tabla de DBR-018 y no declara `deleted_at`.

- [x] **T-03** (CA-01, CA-02, CA-05; RN-04, RN-06, RN-08): lista propia.
  - Depende de: T-02.
  - Archivos: `apps/api/src/app/Actions/Visitor/ListVisitorFavoriteSpeciesAction.php`, `apps/api/src/app/Http/Resources/Visitor/VisitorFavoriteSpeciesResource.php`.
  - Cambios: filtra por el `visitor_id` de la sesión. La especie visible exige `is_published = 1` y `deleted_at` nulo, escritas en esta consulta, sin llamar a `ListPublishedSpeciesAction`. Si la especie dejó de ser visible, la fila se omite y no se borra. Orden: `created_at` descendente y, a igual fecha, `id` de la fila descendente. El resource solo expone `id` con el `species_id`.
  - Hecho cuando: T-06, T-07 y T-10 pasan.

- [x] **T-04** (CA-03, CA-04, CA-05, CA-06; RN-02, RN-03, RN-05, RN-08, RN-09): marcar y quitar.
  - Depende de: T-03.
  - Archivos: `apps/api/src/app/Actions/Visitor/UpdateVisitorFavoriteSpeciesAction.php`, `apps/api/src/app/Http/Requests/Visitor/UpdateVisitorFavoriteSpeciesRequest.php`, `apps/api/src/app/Http/Controllers/Visitor/VisitorFavoriteSpeciesController.php`, `apps/api/src/routes/api.php`.
  - Cambios: `GET /api/v1/visitor/favorite-species` (`visitor.favorite-species.index`) y `PUT /api/v1/visitor/favorite-species/{species}` (`visitor.favorite-species.update`), dentro del grupo `auth:sanctum`, `visitor.token` y `EnsureVisitorEmailVerified`. El PUT lleva `whereNumber('species')`. `favorite` es booleano obligatorio; el `422` dice «El favorito debe ser sí o no.» y no cambia filas. `favorite: true` usa las dos condiciones de visibilidad y responde `404` con «Especie no encontrada.» si no se cumplen, sin crear fila. `firstOrCreate` por la pareja deja el `created_at` de la primera marca. Una violación del índice único responde `200` con la lista. `favorite: false` borra la pareja sin mirar visibilidad; si no había fila, responde `200` y no crea nada. El PUT exitoso devuelve la misma lista que el GET. El controlador solo delega. No se añade Policy ni permiso Spatie.
  - Hecho cuando: T-08, T-09, T-10 y T-11 pasan.

- [x] **T-05** (RN-01): métodos del cliente compartido, sin reglas.
  - Depende de: T-04.
  - Archivo: `packages/api-client/visitor.ts`.
  - Cambios: `listFavoriteSpecies` y `updateFavoriteSpecies`. El tipo es `{ data: { id: number }[] }`, leído con `raw: true`. No deciden si una especie es visible. Lo consume `mobile-014`.
  - Hecho cuando: el paquete declara las dos llamadas del plan y no contiene la regla de `is_published`.

## Pruebas

- [x] **T-06** (CA-01): test de lista propia y orden.
  - Depende de: T-04.
  - Archivo: `apps/api/src/tests/Feature/Visitor/FavoriteSpeciesTest.php`.
  - Hecho cuando: el test nombra CA-01. Dos cuentas no se mezclan. El orden es `created_at` descendente y, a igual fecha, el id de fila descendente. Cada elemento es `{"id": <species_id>}` y no trae nombre ni correo.

- [x] **T-07** (CA-02): test de lista vacía.
  - Depende de: T-04.
  - Archivo: el mismo `FavoriteSpeciesTest.php`.
  - Hecho cuando: el test nombra CA-02 y la respuesta es `200` con `{"data":[]}`.

- [x] **T-08** (CA-03): test de alta idempotente.
  - Depende de: T-04.
  - Archivo: el mismo `FavoriteSpeciesTest.php`.
  - Hecho cuando: el test nombra CA-03. El PUT de una especie publicada responde `200` con la lista. El segundo PUT deja una fila y el mismo `created_at`.

- [x] **T-09** (CA-04): test de quitar.
  - Depende de: T-04.
  - Archivo: el mismo `FavoriteSpeciesTest.php`.
  - Hecho cuando: el test nombra CA-04. `favorite: false` borra la fila. Quitar una que no estaba marcada responde `200` y no crea fila.

- [x] **T-10** (CA-05): test de especie no visible.
  - Depende de: T-04.
  - Archivo: el mismo `FavoriteSpeciesTest.php`.
  - Hecho cuando: el test nombra CA-05. Un id ausente, uno con `is_published` en `0` y uno con `deleted_at` responden `404` «Especie no encontrada.» al marcar y no crean fila. Una fila ya marcada cuya especie deja de ser visible desaparece del GET y sigue en la tabla.

- [x] **T-11** (CA-06): test de sesión, booleano e id no numérico.
  - Depende de: T-04.
  - Archivo: el mismo `FavoriteSpeciesTest.php`.
  - Hecho cuando: el test nombra CA-06. Sin sesión, `401`. Con correo sin verificar, `403` y `code` `email_not_verified`. Un cuerpo sin `favorite` booleano responde `422` y no cambia filas. `PUT .../abc` responde `404` y el mensaje no es «Especie no encontrada.».

- [x] **T-12** (CA-07): test de aislamiento.
  - Depende de: T-04.
  - Archivo: el mismo `FavoriteSpeciesTest.php`.
  - Hecho cuando: el test nombra CA-07. El PUT de una cuenta no altera las filas de la otra. `actingAs` del personal sobre el guard `web`, como en `IsolationTest`, recibe `403` y las filas siguen.

- [x] **T-13** (CA-08): test de borrado de cuenta.
  - Depende de: T-04.
  - Archivo: el mismo `FavoriteSpeciesTest.php`.
  - Hecho cuando: el test nombra CA-08. `DELETE /api/v1/visitor/me` elimina las filas de esa cuenta. La otra cuenta conserva las suyas. No se edita `DeleteVisitorAccountAction`.

- [x] **T-14** (CA-09): test de cobertura.
  - Depende de: T-06 a T-13.
  - Archivo: `apps/api/src/tests/Feature/Visitor/FavoriteSpeciesCoverageTest.php`.
  - Hecho cuando: el test nombra CA-09, comprueba que CA-01 a CA-08 aparecen por nombre, que la suite usa `DatabaseTransactions` y que no aparece `RefreshDatabase` ni una llamada a `migrate`.

## Calidad y entrega

- [x] **T-15** (CA-09): suite de la feature.
  - Depende de: T-14.
  - Pasos: `php artisan test --filter=FavoriteSpecies` desde `apps/api/src`.
  - Hecho cuando: la salida queda registrada y los tests de T-06 a T-14 pasan.
  - Evidencia 2026-11-16: `php artisan test --filter=FavoriteSpecies` — 9 pruebas, 119 aserciones, en verde.

- [x] **T-16**: estilo de los archivos de la feature.
  - Depende de: T-15.
  - Pasos: Pint sobre los archivos creados o tocados por T-02 a T-05.
  - Hecho cuando: Pint termina limpio en esos archivos.
  - Evidencia 2026-11-16: `vendor/bin/pint --test` sobre modelo, acciones, request, resource, controller, rutas y los dos tests — `passed`.

- [x] **T-17**: enlaces del PR.
  - Depende de: T-15.
  - Hecho cuando: el PR cita `api-018` y enlaza spec, plan, tasks y DBR-018. No se abre ese PR en el corte que solo redacta este checklist. No se redacta el aviso de privacidad oficial.
  - Confirmado por Aksel el 2026-11-20: la verificación y el pull de favoritos ya se hicieron. Esta task no guarda la URL del PR.
