# Tareas · 019 · offline-sync

- Spec: `apps/api/specs/019-offline-sync.md` (Aprobada, 2026-11-18)
- Plan: `apps/api/plan/019-offline-sync.md`
- Estado: En progreso (implementación inicial realizada; pruebas y refinamiento pendientes)

## Tareas

- [x] **T-00** Precondiciones: verificar DBR-020/021 aplicadas en `arca_pruebas` y spec 019/pwa-009 aprobadas. (Evidencia: DBR en estado Lista para backend/aplicadas según documentos; migraciones presentes en repo)
- [x] **T-01** Crear `SyncOperation` model y alinear `Animal`/`Enclosure` con SoftDeletes y `updated_at` para delta/tombstones (CA-02, CA-03, RN-02, RN-03).
  - Rutas: `apps/api/src/app/Models/SyncOperation.php`, `apps/api/src/app/Models/Animal.php`, `apps/api/src/app/Models/Enclosure.php`
- [x] **T-02** Implementar endpoint bootstrap staff con perfil/catálogos/cursor (CA-01).
  - Rutas: `apps/api/src/app/Http/Controllers/Api/StaffSyncController.php`, `apps/api/src/routes/api.php`
- [x] **T-03** Implementar endpoint delta/cambios con tombstones y cursor (CA-02, CA-03).
  - Rutas: `apps/api/src/app/Http/Controllers/Api/StaffSyncController.php`
- [x] **T-04** Implementar endpoint batch de operaciones idempotentes con confirmación individual y resolución de dependencias animal→evaluación (CA-04, CA-05, CA-06, CA-07, RN-02, RN-04).
  - Rutas: `apps/api/src/app/Http/Controllers/Api/StaffSyncController.php`, `apps/api/src/routes/api.php`
- [x] **T-05** Alinear cliente PWA (bootstrap/delta/operaciones batch, fallback y manejo de resultados) (CA-01..CA-07 soporte cliente).
  - Rutas: `apps/pwa/src/services/apiClient.ts`, `apps/pwa/src/offline/bootstrap.ts`, `apps/pwa/src/offline/sync-manager.ts`
- [ ] **T-06** Refactor a Form Requests/Actions/Resources según convenciones API y endurecer validaciones/mensajes en español (Constitución III, RN-01/RN-04).
- [ ] **T-07** Agregar pruebas Feature por CA-01..CA-08 en `apps/api/src/tests/Feature/*` con `DatabaseTransactions` sobre `arca_pruebas` (CA-08).
- [ ] **T-08** Agregar/ajustar pruebas PWA para contrato de sync e idempotencia donde aplique.
- [ ] **T-09** Ejecutar `/verify` y suites (PHPUnit/Vitest), corregir regresiones y adjuntar evidencia.
- [ ] **T-10** Actualizar documentación operativa/contrato y enlazar spec/plan/tasks/DBR en PR; ajustar estado de spec según evidencia.

## Notas

- No se crean migraciones en esta implementación (DBR-020/021 ya aplicadas). Cambios de esquema futuros requieren DBR aprobada y responsable de BD.
- La implementación actual de `StaffSyncController` es un MVP funcional; requiere endurecimiento (errores HTTP diferenciados, paginación robusta, permisos/policies específicos si se definen) y pruebas automatizadas.
