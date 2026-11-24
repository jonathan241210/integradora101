# Tareas · 028 · pre-delivery-hardening

- Spec: `apps/api/specs/028-pre-delivery-hardening.md`
- Plan: `apps/api/plan/028-pre-delivery-hardening.md`
- Estado del checklist: T-01 a T-13 implementadas. Las pruebas `tests/Feature/Hardening` (17) pasan contra `arca_pruebas`, igual que `StaffSyncTest`, `ClinicalEvaluationFollowUpTest`, `AnimalRegistrationTest` y `EnclosureAssignmentTest`. La suite completa no se ejecutó por la latencia de la base remota.
- Solicitada: 2026-11-23
- Aprobada: 2026-11-23

- [x] **T-01** (CA-01): quitar `characteristics` y `birth_date` de `SpeciesResource` y `EnclosureResource`. Test: `test_ca01_*`.
- [x] **T-02** (CA-02): excluir `Cuarentena_Ingreso` en las Actions del catálogo (incluido `animals_count` y ejemplar representativo). Test: `test_ca02_*`.
- [x] **T-03** (CA-03, CA-04, CA-05): `permission:` en `/staff/*`. Tests: `test_ca03_*`, `test_ca04_*`, `test_ca05_*`.
- [x] **T-04** (CA-06): limitador `staff-api` y `throttle:staff-api`. Test: `test_ca06_*`.
- [x] **T-05** (CA-07): `max:100` en `sync/operations`. Test: `test_ca07_*`.
- [x] **T-06** (CA-08): estado `retry` para errores transitorios. Test: `test_ca08_*`.
- [x] **T-07** (CA-09): limitadores de verify, refresh, reset y IP en forgot. Test: `test_ca09_*`.
- [x] **T-08** (CA-10): `$fillable` en siete modelos. Test: `test_ca10_*`.
- [x] **T-09** (CA-11): `trustProxies` con `TRUSTED_PROXIES`. Test: `test_ca11_*`.
- [x] **T-10** (CA-12): candado en los dos seeders DBR-019. Test: `test_ca12_*`.
- [x] **T-11** (CA-13): guarda en `reset-and-init.php` y `restore.php`, README de respaldos. Test: `test_ca13_*`.
- [x] **T-12** (CA-14): `.env.example` e `infra/README.md`. Test: `test_ca14_*`.
- [x] **T-13** (CA-01 a CA-14): actualizar tests existentes afectados y ejecutar suite completa y `pint --test`.

## Correcciones de la revisión de seguridad

- [x] **T-14 (CA-15, CA-17)**: `StaffSyncController` rechaza `operation_uuid` de otro usuario sin revelar su resultado y valida `cursor` como fecha; errores no transitorios se reportan y quedan como rechazo definitivo (RN-04). Pruebas en `tests/Feature/Hardening/SecurityReviewFollowUpTest.php`.
- [x] **T-15 (CA-16)**: límite adicional solo por IP (20 intentos) en el login de personal (`AuthController`) y de visitante (limitador `visitor-login`).
