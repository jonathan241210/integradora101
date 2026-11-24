# Plan técnico · 028 · pre-delivery-hardening

- Spec: `apps/api/specs/028-pre-delivery-hardening.md` (Aprobada)
- Estado de spec: Aprobada
- Solicitada: 2026-11-23
- Aprobada: 2026-11-23
- Estado del plan: Aprobado por el equipo junto con la spec.
- DBR relacionada: ninguna. No hay cambio de esquema; `species.is_published` y `animals.stay_status` ya existen en `arca_pruebas` (consulta de solo lectura con `db:table` y `migrate:status`: sin migraciones pendientes).
- ADR relacionados: ninguno nuevo. ADR 0013 (portabilidad Aiven/local).

## Diseño de solución

Endurecimiento sin cambio de contrato visible: se recorta lo que sale por el catálogo público, se exige permiso y límite en `/staff/*`, se hace tolerante a fallos transitorios la sincronización y se bloquean scripts y seeders destructivos en producción.

## Cambios por área

1. **Catálogo público (CA-01, CA-02).** `ListSpeciesAction`, `GetSpeciesAction` y `ListEnclosuresAction` restringen la relación `animals` (y el `withCount`) a `stay_status != 'Cuarentena_Ingreso'`. `SpeciesResource` y `EnclosureResource` dejan de emitir `characteristics` y `birth_date`; conservan `age` y `origin`.
2. **Permisos y límite en `/staff/*` (CA-03 a CA-06).** En `routes/api.php`, lecturas con `permission:medical-records.view`, escrituras con `permission:medical-records.create` y `throttle:staff-api`. `auth/login`, `auth/session` y `auth/logout` quedan sin permiso. El limitador `staff-api` se registra en `AppServiceProvider` (por usuario, 120 por minuto; sin cupo para quien no tiene permiso, como los demás limitadores de personal; las pruebas lo configuran a un valor bajo con `config('arca.staff_api_limit')`).
3. **Sincronización (CA-07, CA-08).** `StaffSyncController@operations` limita a `max:100`. Los errores transitorios (`QueryException`, `PDOException`, deadlock) devuelven estado `retry` sin crear registro `rejected`; las operaciones `rejected` por validación o regla de negocio no cambian (RN-04).
4. **Límites de visitante (CA-09).** Nuevos limitadores `visitor-verify`, `visitor-refresh`, `visitor-reset`; `visitor-forgot` suma un límite por IP.
5. **Modelos (CA-10).** `$fillable` explícito en `Animal`, `ClinicalEvaluation`, `Species`, `ClinicalEvaluationFinding`, `LabSample`, `AnimalRestraint` y `Department`, derivado de las columnas del esquema vivo y de las escrituras existentes.
6. **Proxies de confianza (CA-11).** `AppServiceProvider::configureTrustedProxies()` llama `TrustProxies::at(...)` (equivale a `trustProxies(at: …)`, pero lee la configuración ya cargada; en `bootstrap/app.php` el `.env` aún no está disponible) con `config('arca.trusted_proxies')`, que lee `TRUSTED_PROXIES` (lista separada por comas o `*`); vacío: ninguno.
7. **Seeders (CA-12).** `Dbr019MapCoordinatesSeeder` y `Dbr019InsertEnclosuresAndTestAnimalsSeeder` abortan con `RuntimeException` en producción o en `arca_zoo`, igual que `DemoStaffSeeder`.
8. **Scripts de base (CA-13).** `docs/database/backups/reset-and-init.php` y `restore.php` abortan con código 1 si `DB_DATABASE=arca_zoo` o `APP_ENV=production` antes de conectar; en otra base piden por STDIN escribir el nombre de la base. La guarda vive en `docs/database/backups/guard.php`, que ambos incluyen. `README.md` de la carpeta se actualiza.
9. **Entorno (CA-14, CA-11).** `.env.example`: `APP_DEBUG=false`, `LOG_LEVEL=warning`, host de ejemplo genérico y `TRUSTED_PROXIES`. `infra/README.md` suma `TRUSTED_PROXIES`, `APP_DEBUG=false`, `LOG_LEVEL=warning` y las cabeceras CSP, HSTS, X-Frame-Options y Referrer-Policy en el proxy.

## Impacto en clientes

- Móvil: lee `characteristics` como `funFact` en `apps/mobile/src/utils/enclosureAnimals.ts`; dejará de recibirlo del catálogo de recintos (el dato curado sigue en `fun_fact` de `/published-species`). Sin cambio en este PR.
- PWA: debe tratar `retry` como pendiente (ver `apps/pwa/src/offline/sync-manager.ts`). Sin cambio en este PR.

## Mapeo de criterios a pruebas

| Criterio | Prueba | Ubicación |
|---|---|---|
| CA-01 | `test_ca01_*` | `tests/Feature/Hardening/PublicCatalogHardeningTest.php` |
| CA-02 | `test_ca02_*` | `tests/Feature/Hardening/PublicCatalogHardeningTest.php` |
| CA-03, CA-04, CA-05, CA-06 | `test_ca03_*` a `test_ca06_*` | `tests/Feature/Hardening/StaffRoutesHardeningTest.php` |
| CA-07, CA-08 | `test_ca07_*`, `test_ca08_*` | `tests/Feature/Hardening/StaffSyncHardeningTest.php` |
| CA-09 | `test_ca09_*` | `tests/Feature/Hardening/VisitorThrottleHardeningTest.php` |
| CA-10 | `test_ca10_*` | `tests/Feature/Hardening/ModelFillableTest.php` |
| CA-11 | `test_ca11_*` | `tests/Feature/Hardening/TrustedProxiesTest.php` |
| CA-12 | `test_ca12_*` | `tests/Feature/Hardening/SeederLockTest.php` |
| CA-13 | `test_ca13_*` | `tests/Feature/Hardening/MaintenanceScriptsGuardTest.php` |
| CA-14 | `test_ca14_*` | `tests/Feature/Hardening/EnvExampleTest.php` |

Pruebas de feature con `DatabaseTransactions` sobre `arca_pruebas`; nunca `arca_zoo`, nunca migraciones desde tests.

## Constitution Check

| Principio | Cumple | Evidencia |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin dependencias nuevas; `TRUSTED_PROXIES` por `.env`. |
| II. La spec manda | Sí | Spec 028 Aprobada; plan y tasks con el mismo NNN-slug. |
| III. Lógica separada de la interfaz | Sí | Filtros de catálogo en Actions; controladores delgados. Sin cambios en clientes. |
| IV. Un test por criterio | Sí | Mapeo CA-01 a CA-14 (tabla). |
| V. Una sola fuente de verdad para los datos | Sí | Sin cambio de esquema ni DBR; los scripts no se ejecutan contra producción. |
| VI. Código en inglés, personas en español | Sí | Identificadores y rutas en inglés; mensajes en español. |

## Riesgos y decisiones

- Un usuario de personal sin `medical-records.*` pierde acceso a la PWA; solo `veterinarian` los tiene.
- El estado `retry` es nuevo para la PWA; se reporta como seguimiento.
