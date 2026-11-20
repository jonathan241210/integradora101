# Plan técnico · 024 · pending-review-counts

- Spec: `apps/api/specs/024-pending-review-counts.md`
- Estado de spec: Aprobada (Jonathan, 2026-11-20)
- Estado del plan: **Borrador — pendiente de aprobación técnica (equipo/Jonathan)**. No autoriza implementación hasta aprobarse.
- Responsable técnico: Jonathan (backend, según la spec).
- DBR relacionada: ninguna. La feature no crea ni modifica esquema; no hay migraciones ni SQL.
- Consulta de esquema vivo (`arca_pruebas`, solo lectura, 2026-11-20): aportada por la sesión principal y recogida en la spec («Datos, privacidad y auditoría»). `species_publication_requests` y `visitor_memories` tienen `status varchar(20)` y `deleted_at` nullable; índices que empiezan por `status` en ambas tablas. `species.deleted_at` existe. Conclusión de la spec: no hace falta índice ni DBR.
- ADR relacionados: ninguno nuevo. No se añade dependencia de PHP ni de paquetes.
- Dependencias de orden: después de `api-023` (orden acordado 021 → 025 → 022 → 023 → 024). Afecta a `routes/api.php` y `AppServiceProvider` (ver «Orden y aprobación»).

## Diseño de solución

Un endpoint de solo lectura calcula, desde los estados que ya existen, cuántas solicitudes de especie están en `submitted` y cuántos momentos están en `submitted` o `in_review`. La ruta se protege con el grupo `admin` (sesión, `staff.user`, `administrator.two-factor`) y con `permission:species.review|memories.review` (cualquiera de los dos; el mismo patrón OR que ya usa `ticket-prices.current`). La Action decide qué claves devuelve según el permiso de quien llama (RN-05). El controlador solo delega y responde JSON.

Flujo:

1. Middleware del grupo `admin`: sesión (401), perfil de personal (`staff.user`) y 2FA confirmado cuando el rol lo exige (`administrator.two-factor`, api-007).
2. Middleware de ruta `permission:species.review|memories.review`: sin ninguno de los dos, 403 sin cuerpo de cifras (CA-07, RN-06).
3. Middleware `throttle:admin-pending-counts`: 60 por minuto y por usuario (CA-10).
4. Controlador invocable `PendingReviewCountsController`: llama a la Action con el usuario y devuelve el array como JSON `200`.
5. `GetPendingReviewCountsAction`: cuenta con consultas `COUNT` filtradas por estado, borrado lógico y, en solicitudes de especie, especie no eliminada (RN-02, RN-03, RN-04, CA-12). Solo incluye las claves permitidas (RN-05).

Componentes:

- **Action** `app/Actions/Admin/PendingReview/GetPendingReviewCountsAction.php`:
  - `execute(User $user): array<string, int>`.
  - Si `$user->hasPermissionTo('species.review')` (o `can`): añade `species_requests` = `SpeciesPublicationRequest::query()->where('status', SpeciesRequestStatus::Submitted->value)->whereHas('species')->count()`. El `whereHas('species')` respeta el scope de `Species` (SoftDeletes), igual que la cola de `ListSpeciesPublicationRequestsAction` (api-014 CA-12, CA-12 de esta spec).
  - Si tiene `memories.review`: añade `memories` = `VisitorMemory::query()->whereIn('status', [MemoryStatus::Submitted->value, MemoryStatus::InReview->value])->count()`. El scope SoftDeletes de `VisitorMemory` excluye los eliminados (CA-06).
  - Sin permisos devuelve `[]`; no debería llegar porque la ruta ya responde 403, pero la Action no devuelve cifras sin permiso (defensa en profundidad).
  - No escribe nada: sin `LogsActivity`, sin `Activity`, sin transacciones de escritura (CA-09, RN-07).
  - Los valores de estado se toman de `App\Enums\SpeciesRequestStatus` y `App\Enums\MemoryStatus`, no se escriben como literales en la Action (salvo que el enum no lo permita).
- **Controlador** `app/Http/Controllers/Admin/PendingReviewCountsController.php`: invocable (`__invoke(Request $request, GetPendingReviewCountsAction $action): JsonResponse`), sin validación (no hay entrada). Responde `response()->json($action->execute($request->user()))`. No hay Resource: la respuesta son dos enteros de la Action, sin modelo que transformar. Esto sigue la regla «Controladores delgados» sin añadir una clase vacía.
- **Ruta** en `routes/api.php`, dentro del grupo `admin` existente (prefijo `admin`, nombre `admin.`), junto al bloque de api-014 o al final del grupo:
  ```
  Route::get('pending-counts', PendingReviewCountsController::class)
      ->middleware(['permission:species.review|memories.review', 'throttle:admin-pending-counts'])
      ->name('pending-counts.show');
  ```
  Nombre completo: `admin.pending-counts.show` (RN-10). Ruta: `GET /api/v1/admin/pending-counts`.
- **Limitador** `admin-pending-counts` en `App\Providers\AppServiceProvider` (método privado nuevo, p. ej. `registerPendingCountsLimiter()`, llamado desde `boot()` como los demás):
  - Si el usuario tiene `species.review` o `memories.review` (`hasAnyPermission`): `Limit::perMinute(60)->by((string) $user->getAuthIdentifier())`.
  - Si no: `Limit::none()` (no consume cuota a quien va a recibir 403; es el mismo criterio RN-30 que los límites de tickets). Decisión propuesta; ver pregunta 1.
  - Respuesta 429: JSON `{ "message": "..." }` con las cabeceras que da el middleware (incluye `Retry-After`), mismo patrón que `admin-search`.
- **Sin cambios** en `RolesAndPermissionsSeeder`, `config/arca.php`, modelos, migraciones ni `infra/README.md`. Los permisos `species.review` y `memories.review` ya existen en el seeder.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| API / Action | `app/Actions/Admin/PendingReview/GetPendingReviewCountsAction.php` | Conteos por estado, borrado lógico y permiso (CA-01 a CA-06, CA-12) |
| API / HTTP | `app/Http/Controllers/Admin/PendingReviewCountsController.php` | Controlador invocable delgado (CA-01, CA-08) |
| API / rutas | `routes/api.php` (grupo `admin`) | Ruta `pending-counts.show` con permiso OR y throttle (CA-07, CA-10) |
| API / límites | `app/Providers/AppServiceProvider.php` | Limitador `admin-pending-counts` 60/min por usuario (CA-10) |
| API / pruebas | `tests/Feature/Admin/PendingReviewCountsTest.php`, `tests/Feature/Admin/PendingReviewCountsAccessTest.php`, `tests/Feature/Admin/PendingReviewCountsThrottleTest.php`, `tests/Feature/Admin/PendingReviewCountsCoverageTest.php` | Un test por CA (CA-11, Constitución IV) |
| API / documentación | `apps/api/docs/administracion.md` | Endpoint, forma de respuesta y permisos |
| Cliente | `packages/api-client` (ver `apps/dashboard/plan/018-pending-review-badges.md`) | Método y tipo; sin lógica |

Patrón de pruebas: `Tests\Feature\Admin\AdminFeatureTestCase` (extiende `FeatureTestCase`, que usa `DatabaseTransactions` sobre `arca_pruebas`), helper `createAccount(string $role, bool $twoFactor = true, array $attributes = [])` de `Tests\Concerns\CreatesAdministrators`, y fixtures de `Tests\Concerns\CreatesMemoryFixtures` y de `Tests\Feature\SpeciesPublication\SpeciesPublicationTestCase` (revisar sus métodos al implementar; no se inventan aquí).

## Contrato y datos

- **Endpoint:** `GET /api/v1/admin/pending-counts` (nombre `admin.pending-counts.show`).
- **Autenticación y permisos:** `auth:sanctum`, `staff.user`, `administrator.two-factor` (grupo `admin`), y `permission:species.review|memories.review`.
- **Respuesta 200:** objeto JSON plano con solo las claves permitidas, enteros mayores o iguales que 0:
  ```json
  { "species_requests": 2, "memories": 5 }
  ```
  - Con ambos permisos: las dos claves (CA-01). Solo `species.review`: solo `species_requests` (CA-02). Solo `memories.review`: solo `memories` (CA-03). Cero pendientes: `0`, no ausencia (CA-04).
  - No hay envoltorio `data`. Esto sigue la spec aprobada (CA-01 pide las claves en la raíz). Es una divergencia respecto a la convención `{ data }` de otros endpoints; ver pregunta 3.
- **Errores:**
  - 401 sin sesión (`auth:sanctum`).
  - 403 sin 2FA cuando el rol lo exige: lo responde `administrator.two-factor` con `code: two_factor_setup_required` (CA-07).
  - 403 sin `species.review` ni `memories.review`: respuesta estándar de Spatie vía `permission:` (CA-07, sin cifras).
  - 429 con `Retry-After` (CA-10).
  - 5xx estándar. Sin cifras parciales: la Action devuelve el array completo o lanza excepción.
- **Validación, Form Requests, Policies:** no hay entrada ni recurso por propietario. No se añade Policy ni Form Request.
- **Compatibilidad:** endpoint nuevo, aditivo. No cambia `api-014`, `api-010`, listados ni estados.
- **Auditoría:** ninguna. La lectura no se registra (spec, «Datos, privacidad y auditoría», y CA-09).

## Seguridad, offline y operación

- **Mínimo privilegio:** la comprobación es del servidor (permiso de ruta + 2FA). Ocultar el puntito en el panel no sustituye esta comprobación.
- **Privacidad:** solo enteros (CA-08). No se devuelven identificadores, nombres de especie, visitantes, veterinarios, correos ni URLs. No se registran en logs.
- **Carga:** consultas `COUNT` con índices existentes: `(status, created_at)` en ambas tablas, y `(species_id, status)` en solicitudes para el `whereHas`. El límite de 60/min por usuario acota el sondeo del panel (sin caché persistente, según RN-01).
- **Offline:** no aplica. Es un endpoint del panel web de personal.
- **Observabilidad:** sin métricas nuevas. Si hace falta, se valorará en una spec posterior.
- **Portabilidad Aiven/local (MySQL 8.0.x):** solo Eloquent estándar (`count`, `whereIn`, `whereHas`). Sin funciones, vistas, triggers ni SQL crudo. Sin variables de entorno nuevas.
- **Secretos:** ninguno.

## Mapeo de criterios a pruebas

Todas las pruebas usan `DatabaseTransactions` (vía `FeatureTestCase`) sobre `arca_pruebas`. Docblock `/** CA-xx pending-review-counts */` y método `test_caNN_...`, según el nombre de la spec.

| Criterio | Prueba automatizada | App/ubicación | Tareas |
|---|---|---|---|
| CA-01 | `test_ca01_counts_both_keys_for_both_permissions` | API `tests/Feature/Admin/PendingReviewCountsTest.php` | T-02, T-03, T-05 |
| CA-02 | `test_ca02_only_species_key_without_memories_permission` | `PendingReviewCountsTest.php` | T-02, T-03 |
| CA-03 | `test_ca03_only_memories_key_without_species_permission` | `PendingReviewCountsTest.php` | T-02, T-03 |
| CA-04 | `test_ca04_zero_when_nothing_pending` | `PendingReviewCountsTest.php` | T-03 |
| CA-05 | `test_ca05_counts_only_pending_states_and_matches_lists` | `PendingReviewCountsTest.php` (compara con `GET /api/v1/admin/species-publication-requests?status=submitted` y `GET /api/v1/admin/memories?status=submitted` y `in_review`, recorriendo páginas) | T-04 |
| CA-06 | `test_ca06_soft_deleted_rows_are_not_counted` | `PendingReviewCountsTest.php` | T-04 |
| CA-07 | `test_ca07_403_without_either_permission_and_no_data` (y 401 y 2FA) | `tests/Feature/Admin/PendingReviewCountsAccessTest.php` | T-05, T-07 |
| CA-08 | `test_ca08_response_contains_only_integer_counts` | `PendingReviewCountsTest.php` | T-08 |
| CA-09 | `test_ca09_read_only_no_rows_or_activity_changed` | `PendingReviewCountsTest.php` (snapshot de `species_publication_requests`, `species`, `visitor_memories`, `visitor_memory_reviews` y conteo de Activitylog antes y después) | T-08 |
| CA-10 | `test_ca10_throttle_per_user_returns_429` | `tests/Feature/Admin/PendingReviewCountsThrottleTest.php` | T-06, T-09 |
| CA-11 | `test_ca11_every_ca_is_named_and_suite_uses_database_transactions` | `tests/Feature/Admin/PendingReviewCountsCoverageTest.php` (busca los `test_caNN_` en los archivos de esta feature y `DatabaseTransactions`; sin `RefreshDatabase`) | T-10 |
| CA-12 | `test_ca12_species_request_of_soft_deleted_species_is_not_counted` | `PendingReviewCountsTest.php` | T-04 |
| (Comunicación, RN-08; CA-01 y CA-02 con el rol) | `test_comunicacion_sees_both_keys` | `PendingReviewCountsTest.php`; solo cuando `api-023` esté mergeada | T-11 |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin dependencias nuevas (no requiere ADR). Solo Eloquent y el limitador de Laravel. Sin variables de nube. |
| II. La spec manda | Sí | Spec 024 Aprobada (2026-11-20). Plan y tasks con el mismo `024-pending-review-counts`. El plan queda en borrador hasta su aprobación. |
| III. Lógica separada de la interfaz | Sí | El cálculo vive en `GetPendingReviewCountsAction`; el controlador delega; el dashboard solo presenta (ver plan del dashboard). |
| IV. Un test por criterio | Sí (pendiente de evidencia) | Mapeo CA-01 a CA-12 con `test_caNN_` (ver tabla). CI en verde: pendiente de evidencia de la sesión principal. |
| V. Una sola fuente de verdad para los datos | Sí | Sin tabla, columna ni caché nuevos (RN-01). Los conteos salen de los estados existentes. Se respetan SoftDeletes (CA-06, CA-12). Sin auditoría de lectura porque no es decisión. |
| VI. Código en inglés, personas en español | Sí | Identificadores y ruta en inglés (`pending-counts`, `species_requests`, `memories`). Mensajes de 429 y 403 en español. |

Ninguna excepción nueva. El texto del 429 es una propuesta en español (pregunta 2).

## Riesgos y decisiones

- **ADR requerido/aprobado:** ninguno. No hay dependencia nueva.
- **Riesgo de sondeo:** el panel consulta al cambiar de pantalla; mitigado por el límite de 60/min por usuario y por el intervalo de 15 s del cliente (dashboard, RN-07).
- **Cifras que no cuadran con los listados:** mitigado con CA-05 (compara con los listados filtrados) y con la misma fuente de estados (enums).
- **Cambios en `api-023`:** si un rol gana o pierde `species.review` o `memories.review`, la ruta y los conteos cambian sin tocar esta feature (RN-08).
- **Consultas con `whereHas`:** el `EXISTS` sobre `species` es barato con la clave primaria de `species`; no hace falta índice nuevo (verificado en la consulta de 2026-11-20).
- **Alternativas descartadas:**
  - Tabla de avisos o contador persistente: contradice RN-01 y la Constitución V sin necesidad.
  - Caché de conteos: la spec la excluye en esta versión y el límite de frecuencia basta.
  - Rate limit antes del permiso para usuarios sin permiso: consumiría cuota a quien no puede ver nada; se usa `Limit::none()` (ver pregunta 1).

## Preguntas abiertas para la revisión técnica

1. **Límite para quien no tiene permiso:** ¿`Limit::none()` (propuesta: no consume cuota y recibe 403) o un límite general por usuario? Confirmar antes de implementar T-06.
2. **Texto del 429:** propuesta «Demasiadas consultas. Espera un minuto e inténtalo de nuevo.», en línea con `admin-search`. ¿Se aprueba?
3. **Forma de respuesta:** la spec aprobada pide las claves en la raíz (sin `data`). ¿Se mantiene así aunque otros endpoints usan `data`? Este plan la mantiene porque la spec es la fuente.

## Orden y aprobación

Dependencias y secuencia:

1. `api-021` (2FA y confirmación), `api-025` (zona única), `api-022` (cancelaciones, DBR-024) y `api-023` (roles y consola) antes que esta feature (orden acordado). Esta feature toca `routes/api.php` y `AppServiceProvider`: rebase sobre lo mergeado y no rediseñar esas partes.
2. Action y pruebas de conteo (T-02 a T-04).
3. Controlador, ruta y limitador (T-05, T-06), y pruebas de acceso y frecuencia (T-07, T-09).
4. Pruebas de forma y lectura (T-08), cobertura (T-10), Comunicación cuando `api-023` esté mergeada (T-11).
5. Documentación, `/verify` y PR (T-12 a T-14).
6. El cliente (`packages/api-client`) y la UI van en `apps/dashboard/plan/018-pending-review-badges.md`. Pueden empezar con mocks cuando este contrato esté aprobado.

- Revisión técnica: pendiente (Jonathan).
- Aprobador funcional: Jonathan, spec aprobada el 2026-11-20.
- Evidencias: pendientes de la sesión principal (salida de `php artisan test --filter PendingReview` contra `arca_pruebas`, Pint y `migrate:status` sin migraciones nuevas). Esta sesión no tiene shell y no afirma que pasen.
