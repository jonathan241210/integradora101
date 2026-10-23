# Plan técnico · 005 · visitor-progress

- Spec: `apps/api/specs/005-visitor-progress.md`
- Estado de spec: Aprobada (Aksel, 2026-10-22)
- Estado del plan: Aprobado (Aksel, 2026-10-22)
- Responsable técnico: Aksel
- Responsable de BD: Victor Adrian. DBR-004 está en `Lista para backend`. La migración `2026_10_15_000004_visitor_progress_schema.php` ya existe. Este plan no crea ni edita migraciones.

## Diseño de solución

La API calcula el progreso del visitante autenticado con el token `visitor`. El cliente envía el código del QR; el servidor decide las especies, los puntos, el nivel y los logros. No hay tabla de líderes ni premios.

Flujo: `POST discoveries` valida la ventana y el límite, registra el intento en `visitor_scans` y, si el código está activo, descubre las especies en exhibición de ese recinto. Un `client_scan_id` repetido devuelve el mismo `result` sin filas nuevas. Las consultas `progress`, `collection`, `achievements` y `missions` solo leen.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| API / modelos | `VisitorScan`, `VisitorCollection`, `Achievement`, `VisitorAchievement`, `Mission`, `VisitorMissionCompletion`, `VisitorPointEntry`, `EnclosureQrCode` | Tablas de DBR-004. Sin SoftDeletes: el borrado de la cuenta ya es en cascada |
| API / Actions | `RecordVisitorDiscoveryAction`, `EvaluateVisitorProgressAction`, `VisitorProgressQuery` | Descubrimiento, reglas y lecturas |
| API / HTTP | Form Request, Resource y `VisitorProgressController` | Contrato JSON |
| API / config | `config/visitor_progress.php` | 100 puntos y los cinco umbrales de CA-10 |
| API / comando | `arca:generate-qr-codes` | Códigos opacos. No imprime |
| API / seeders | `AchievementSeeder`, `MissionSeeder` | Idempotentes por `code`, a partir de los mocks de la app |
| API / pruebas | `tests/Feature/Visitor/ProgressTest.php` | Un test por CA-01 a CA-13, `DatabaseTransactions` sobre `arca_pruebas` |
| Fuera | `apps/mobile`, migraciones, `auth.ts` | El cliente móvil tiene su propio plan |

## Contrato y datos

Rutas bajo el prefijo ya existente `api/v1`, grupo `visitor`, middleware `auth:sanctum` y `visitor.token`:

| Método y ruta | Nombre | Notas |
|---|---|---|
| `POST /api/v1/visitor/discoveries` | `visitor.discoveries.store` | `throttle:visitor-discoveries` (30/minuto por visitante). 201 `discovered`, 200 `already_discovered`, 422 con `code` |
| `GET /api/v1/visitor/progress` | `visitor.progress.show` | Puntos, nivel, rango, siguiente umbral, descubiertas / total |
| `GET /api/v1/visitor/collection` | `visitor.collection.show` | Especies con `discovered` y `discovered_at` |
| `GET /api/v1/visitor/achievements` | `visitor.achievements.index` | Estado y progreso calculados |
| `GET /api/v1/visitor/missions` | `visitor.missions.index` | Igual que logros, más `objective` |

`RecordVisitorDiscoveryAction` corre en una transacción. Antes de insertar, busca `(visitor_id, client_scan_id)`. Si existe, reconstruye la respuesta con las filas de esa hora (`discovered_at` / `unlocked_at` / `completed_at` iguales a `received_at`) y no inserta nada.

`enclosure_count` (RN-10): recintos distintos del QR que originó cada descubrimiento y que todavía apunta a un recinto.

Errores: `invalid_code`, `inactive_code`, `expired_scan` en 422 y quedan en `visitor_scans`. Más de 30 intentos nuevos por minuto → 429 «Espera {seconds} segundos e inténtalo de nuevo.» Sin token → 401.

DBR-004 está en `Lista para backend`. No hay `BaseModel` en los modelos del visitante; estos siguen el mismo patrón que `Visitor`.

## Seguridad, offline y operación

El visitante solo ve su progreso. El código QR no se registra en logs de aplicación junto con tokens. Los puntos no se aceptan del cliente. MySQL 8.0.x por `.env`. Los tests no migran.

## Mapeo de criterios a pruebas

| Criterio | Prueba | Ubicación |
|---|---|---|
| CA-01 | `test_ca01_visitor_progress_discovery_is_idempotent` | `ProgressTest.php` |
| CA-02 | `test_ca02_visitor_progress_rejects_expired_scan` | `ProgressTest.php` |
| CA-03 | `test_ca03_visitor_progress_limits_scans_per_minute` | `ProgressTest.php` |
| CA-04 | `test_ca04_visitor_progress_awards_points_per_new_species` | `ProgressTest.php` |
| CA-05 | `test_ca05_visitor_progress_discovery_response_shape` | `ProgressTest.php` |
| CA-06 | `test_ca06_visitor_progress_show` | `ProgressTest.php` |
| CA-07 | `test_ca07_visitor_progress_collection` | `ProgressTest.php` |
| CA-08 | `test_ca08_visitor_progress_achievements_and_missions` | `ProgressTest.php` |
| CA-09 | `test_ca09_visitor_progress_rules_and_ledger_are_unique` | `ProgressTest.php` |
| CA-10 | `test_ca10_visitor_progress_level_thresholds` | `ProgressTest.php` |
| CA-11 | `test_ca11_visitor_progress_seeders_are_idempotent` | `ProgressTest.php` |
| CA-12 | `test_ca12_visitor_progress_generates_opaque_qr_codes` | `ProgressTest.php` |
| CA-13 | `test_ca13_visitor_progress_suite_names_every_criterion` | `ProgressTest.php` |

## Constitution Check

| Principio | Cumple | Evidencia |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin dependencia nueva. MySQL por `.env` |
| II. La spec manda | Sí | Spec Aprobada. No agrega líderes, premios ni cámara |
| III. Lógica separada de la interfaz | Sí | Actions. El controlador solo responde JSON |
| IV. Un test por criterio | Sí | Tabla CA-01 a CA-13 |
| V. Una sola fuente de verdad | Sí | DBR-004 `Lista para backend`. Este plan no migra |
| VI. Código en inglés, personas en español | Sí | Campos en inglés. `message` en español |

## Riesgos y decisiones

- Reconstruir la respuesta idempotente con la hora `received_at`, porque `visitor_scans` no tiene columna de payload y este plan no altera la DBR.
- El límite de 30 cuenta filas nuevas de `visitor_scans` del último minuto. El reintento del mismo `client_scan_id` no cuenta.
- ADR 0011 ya aceptado. No hay ADR nuevo.

## Orden y aprobación

1. Spec aprobada por Aksel el 2026-10-22.
2. Este plan, aprobado por Aksel el 2026-10-22.
3. Checklist y después el código en `apps/api/src`.
4. La app móvil consume el contrato cuando su propio plan esté aprobado.

Aprobador funcional: Aksel. Fecha: 2026-10-22.
