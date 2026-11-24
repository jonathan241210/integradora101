# Tareas · 005 · visitor-progress

- Spec: `apps/api/specs/005-visitor-progress.md` (Implementada)
- Plan: `apps/api/plan/005-visitor-progress.md` (Aprobado)
- Estado del checklist: Completado
- Solicitada: 2026-10-22
- Aprobada: 2026-10-22

## Base de datos (responsable de BD)

- [x] **T-01** (CA-04, CA-09, RN-06): DBR-004 está en `Lista para backend` y la migración `2026_10_15_000004_visitor_progress_schema.php` ya existe. Este checklist no crea ni edita SQL.

## Implementación

- [x] **T-02** (CA-10, RN-11): Crear `config/visitor_progress.php` con 100 puntos por especie y los umbrales de CA-10.
- [x] **T-03** (CA-04, CA-09): Modelos de escaneo, colección, logros, misiones y libro mayor, sin migración nueva.
- [x] **T-04** (CA-01, CA-02, CA-04, CA-05, CA-09, RN-10): `RecordVisitorDiscoveryAction` y `EvaluateVisitorProgressAction` en una transacción. El reintento del mismo `client_scan_id` no inserta filas.
  - La prueba de CA-09 para descubrimientos anteriores también simula un fallo al acreditar puntos, verifica el rollback y comprueba que las consultas repetidas acreditan el logro una sola vez.
- [x] **T-05** (CA-06, CA-07, CA-08): `VisitorProgressQuery` para progreso, colección, logros y misiones.
- [x] **T-06** (CA-03, CA-05, RN-07): Form Request, Resource, controlador y rutas nombradas. Límite de 30 escaneos nuevos por minuto.
- [x] **T-07** (CA-11): `AchievementSeeder` y `MissionSeeder`, idempotentes por `code`, llamados desde `DatabaseSeeder`.
- [x] **T-08** (CA-12): Comando `arca:generate-qr-codes`. No imprime.

## Pruebas

- [x] **T-09** (CA-01 a CA-14): `tests/Feature/Visitor/ProgressTest.php`. Cada método nombra su CA. `DatabaseTransactions` sobre `arca_pruebas`. Sin `RefreshDatabase`. CA-14: recinto sin animales en exhibición responde `empty_enclosure` y no suma puntos.

## Calidad y entrega

- [x] **T-10**: `php artisan test --filter=ProgressTest` desde `apps/api/src`.
- [x] **T-11**: Nota breve en `apps/api/docs/visitante-autenticacion.md` o un doc de progreso, sin secretos. El PR enlaza spec, plan y tasks.

Cada CA-01 a CA-14 tiene una prueba que lo nombra. Ninguna tarea crea una migración. CA-14 no cambia el esquema: `visitor_scans.result` ya es `varchar(30)`.

## Enmienda · Logros y misiones de especies visitables

- [x] **T-12** (CA-15, CA-16, RN-12): Aplicar el mismo conjunto de especies visitables al listado y a la métrica de descubrimientos por palabra clave.
- [x] **T-13** (CA-15, CA-16): Agregar cobertura de visibilidad, avance, acreditación retroactiva e idempotencia en PHPUnit.
- [x] **T-14** (CA-15, CA-16): Verificar la API y actualizar la referencia de progreso.
  - Evidencia: `ProgressTest.php` aprobó sus 18 pruebas en `arca_pruebas`. Aprobaron también las dos pruebas unitarias y Pint para los archivos PHP modificados.

## Enmienda de QR y logros · 2026-11-24

Alcance y plan aprobados por la persona solicitante. Implementación autorizada en la conversación del 2026-11-24.

- [x] **T-15** (CA-17) Alinear el filtro de escaneo con las especies públicas visitables. PHPUnit y Jest cubren nombres, casos mixtos y reenvíos. En el recinto Águila de `arca_pruebas`, el filtro devuelve Jaguar.
- [x] **T-16** (CA-18) Activar las 24 definiciones y separar la visibilidad de logros de la de misiones. PHPUnit verifica catálogo, acreditaciones y seeder. El catálogo quedó aplicado y con 24 logros activos en `arca_pruebas`.

## Enmienda · Misiones correspondientes a logros

Plan e implementación autorizados por la persona solicitante, 2026-11-24.

- [x] **T-17** (CA-15, CA-19) Aplicar en `VisitorProgressQuery` la excepción de visibilidad para misiones que comparten regla con un logro activo.
- [x] **T-18** (CA-15, CA-16, CA-19) Verificar con PHPUnit la visibilidad, el avance y el estado de las misiones correspondientes. Actualizar la referencia del catálogo.
  - Evidencia: CA-15, CA-16, CA-18 y CA-19 pasaron en `arca_pruebas` (4 pruebas, 73 aserciones). Pasaron las 12 pruebas unitarias y Pint.
