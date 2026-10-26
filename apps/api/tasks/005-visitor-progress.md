# Tareas · 005 · visitor-progress

- Spec: `apps/api/specs/005-visitor-progress.md` (Aprobada, Aksel, 2026-10-22)
- Plan: `apps/api/plan/005-visitor-progress.md` (Aprobado, Aksel, 2026-10-22)
- Estado del checklist: Aprobado por Aksel, 2026-10-22

## Base de datos (responsable de BD)

- [x] **T-01** (CA-04, CA-09, RN-06): DBR-004 está en `Lista para backend` y la migración `2026_10_15_000004_visitor_progress_schema.php` ya existe. Este checklist no crea ni edita SQL.

## Implementación

- [x] **T-02** (CA-10, RN-11): Crear `config/visitor_progress.php` con 100 puntos por especie y los umbrales de CA-10.
- [x] **T-03** (CA-04, CA-09): Modelos de escaneo, colección, logros, misiones y libro mayor, sin migración nueva.
- [x] **T-04** (CA-01, CA-02, CA-04, CA-05, CA-09, RN-10): `RecordVisitorDiscoveryAction` y `EvaluateVisitorProgressAction` en una transacción. El reintento del mismo `client_scan_id` no inserta filas.
- [x] **T-05** (CA-06, CA-07, CA-08): `VisitorProgressQuery` para progreso, colección, logros y misiones.
- [x] **T-06** (CA-03, CA-05, RN-07): Form Request, Resource, controlador y rutas nombradas. Límite de 30 escaneos nuevos por minuto.
- [x] **T-07** (CA-11): `AchievementSeeder` y `MissionSeeder`, idempotentes por `code`, llamados desde `DatabaseSeeder`.
- [x] **T-08** (CA-12): Comando `arca:generate-qr-codes`. No imprime.

## Pruebas

- [x] **T-09** (CA-01 a CA-13): `tests/Feature/Visitor/ProgressTest.php`. Cada método nombra su CA. `DatabaseTransactions` sobre `arca_pruebas`. Sin `RefreshDatabase`.

## Calidad y entrega

- [x] **T-10**: `php artisan test --filter=ProgressTest` desde `apps/api/src`.
- [x] **T-11**: Nota breve en `apps/api/docs/visitante-autenticacion.md` o un doc de progreso, sin secretos. El PR enlaza spec, plan y tasks.

Cada CA-01 a CA-13 tiene una prueba que lo nombra. Ninguna tarea crea una migración.
