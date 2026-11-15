# Datos de prueba (`arca_pruebas`)

## Propósito
Script manual con datos de ejemplo para poblar las **tablas que estaban sin registros** en `arca_pruebas` (según el análisis realizado), sin tocar `arca_zoo` ni ejecutar cambios automáticamente.

- **Archivo:** `docs/database/ejemplos-datos-negocio.sql`
- **Destino:** solo `arca_pruebas` (revisar antes de ejecutar).
- **Naturaleza:** datos de prueba. Varias tablas normalmente se llenarán mediante flujos/funcionalidades (venta de tickets, notificaciones, actividad de visitantes, recuerdos, solicitudes, etc.), pero se incluyen como carga inicial de prueba porque estaban vacías.

## Qué incluye
Usa IDs `9001+` con `ON DUPLICATE KEY UPDATE` y reutiliza registros existentes (`@u1..@u6`, `@v1..@v3`, animales, misiones y `ticket_prices` vigentes) para respetar llaves foráneas.

Tablas pobladas (vacías al momento del análisis):
- `animal_departures` (5)
- `clinical_evaluations` (5), `clinical_evaluation_findings` (5), `animal_restraints` (5), `lab_samples` (5)
- `staff_notifications` (5) — referencian `ticket_prices` existentes
- `visitor_mission_completions` (3) — referencian misiones/visitantes existentes
- `visitor_memories` (5) y `visitor_memory_reviews` (5)
- `species_publication_requests` (5)

## Qué omite y por qué
- **Ya tenían registros (no se alteran):** `departments`, `users`, `visitors`, roles/permisos, `enclosures`, `enclosure_qr_codes`, `species`, `animals`, `tickets`, `ticket_prices`, `news`, `events`, `achievements`, `missions`, `visitor_collections`, `visitor_scans`, `visitor_point_entries`, `visitor_achievements`, entre otras.
- **Vacías pero técnicas/runtime o pivote sensible (no se precargan):** `cache_locks`, `failed_jobs`, `job_batches`, `jobs`, `model_has_permissions`.
- **Técnicas/framework/auth:** `cache`, `sessions`, `migrations`, tokens/códigos, tablas Spatie, `activity_log`, etc.

Ajusta u omite bloques según el estado real de la BD y las DBRs/columnas aplicadas.

## Cómo ejecutarlo (manual)
1. Confirmar conexión a **`arca_pruebas`** (no `arca_zoo`).
2. Revisar el script y adaptar IDs/valores si es necesario.
3. Ejecutar desde un cliente (DBeaver/Workbench/phpMyAdmin) o consola:

```bash
mysql -u <usuario> -p -h <host> arca_pruebas < docs/database/ejemplos-datos-negocio.sql
```

> El script incluye `START TRANSACTION`/`COMMIT`; valida el resultado y usa `ROLLBACK` si algo no cuadra antes de confirmar en tu cliente.

## ¿Migración o script/ejecución manual?
- **No usar migración para estos datos de prueba.** Las migraciones Laravel son para evolucionar el **esquema** de forma versionada y se ejecutan en todos los ambientes donde corra `migrate`; meter datos de prueba puede afectar otros ambientes, no es idempotente ante datos cambiantes y mezcla responsabilidades. Además, el esquema/migraciones las crea, prueba y aplica el responsable de BD tras una DBR aprobada (Constitución/AGENTS).
- **Recomendado:** mantenerlo como script SQL documentado y ejecutarlo manualmente en `arca_pruebas` (p. ej. DBeaver) cuando se necesite. Alternativa válida: un *seeder* de pruebas ejecutado explícitamente solo en `arca_pruebas` (nunca en producción), gestionado por el responsable de BD/código según el flujo del proyecto.

## Reglas
- No usar `arca_zoo`.
- No crear/ejecutar migraciones ni SQL destructivo desde este flujo sin el proceso/DBR correspondiente.
- No versionar credenciales ni `.env`. Revalidar este documento y el script cuando cambie el esquema o los datos.