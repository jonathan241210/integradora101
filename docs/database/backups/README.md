# Herramientas de respaldo y restauración · ARCA-NB

Esta carpeta contiene los scripts automatizados para respaldar los datos de desarrollo/pruebas de la base de datos de ARCA-NB y migrarlos hacia una nueva instancia sin depender de herramientas externas complejas.

> **Seguridad:** Los archivos `.sql` generados están ignorados en `.gitignore` para prevenir que datos de prueba o credenciales se suban al repositorio.
>
> **Vigencia del respaldo más reciente (2026-11-23):** El respaldo más reciente (carpeta `2026-11-23_06-45-13/` con `backup_arca_pruebas_full_2026-11-23_06-45-13.sql`, `arca_pruebas_data_only_2026-11-23_06-45-13.sql`, `backup_arca_pruebas_schema_only_2026-11-23_06-45-13.sql` y sus copias `*_latest.sql` en la raíz de `backups/`) corresponde al estado actual de `arca_pruebas` al momento de la exportación. Incluye la estructura y/o datos vigentes hasta las últimas DBR y migraciones presentes en el repositorio en ese momento (p. ej. DBR-019 a DBR-021 y migraciones `2026_11_17_000019_*`, `2026_11_18_000020_*` y `2026_11_18_000021_*` en `apps/api/src/database/migrations/`). Futuros respaldos reflejarán el estado de la base en la fecha en que se generen.

## Historial de respaldos

| Fecha y hora (local) | Base de datos | Tipo(s) | Archivos (conjunto) | Alcance (DBR/migraciones) | Notas |
|---|---|---|---|---|---|
| 2026-11-19 23:09:49 | `arca_pruebas` | Completo, solo datos, solo estructura | `2026-11-19_23-09-49/` (`backup_arca_pruebas_full_2026-11-19_23-09-49.sql`, `arca_pruebas_data_only_2026-11-19_23-09-49.sql`, `backup_arca_pruebas_schema_only_2026-11-19_23-09-49.sql`) + `*_latest.sql` en raíz | Hasta las últimas DBR y migraciones presentes en el repo al momento (p. ej. DBR-019 a DBR-021; migraciones `2026_11_17_000019_*`, `2026_11_18_000020_*`, `2026_11_18_000021_*`) | 50 tablas, 1060 filas exportadas. Primer respaldo con dump de solo estructura. Respaldos intermedios del 2026-11-19 23:06:04 (sin esquema separado) eliminados por ser supersedidos. Los `.sql` están ignorados por Git. |
| 2026-11-23 06:45:13 | `arca_pruebas` | Completo, solo datos, solo estructura | `2026-11-23_06-45-13/` (`backup_arca_pruebas_full_2026-11-23_06-45-13.sql`, `arca_pruebas_data_only_2026-11-23_06-45-13.sql`, `backup_arca_pruebas_schema_only_2026-11-23_06-45-13.sql`) + `*_latest.sql` en raíz | Hasta las últimas DBR y migraciones presentes en el repo al momento (p. ej. DBR-019 a DBR-021; migraciones `2026_11_17_000019_*`, `2026_11_18_000020_*`, `2026_11_18_000021_*`) | 51 tablas, 2423 filas exportadas. Refleja crecimiento de datos y cambios de esquema presentes en `arca_pruebas` respecto al respaldo anterior (p. ej. tabla `cancellation_reviews`, 26 migraciones registradas). Los `.sql` están ignorados por Git. |

---

## 1. ¿Cómo hacer el respaldo antes del corte de Aiven?

Solo tienes que abrir una terminal (PowerShell o CMD) y ejecutar:

### Opción A (PowerShell):
```powershell
cd docs/database/backups
.\backup.ps1
```

### Opción B (PHP directo):
```bash
php docs/database/backups/backup.php
```

### ¿Qué hace automáticamente?
1. Lee las credenciales y el certificado SSL directamente desde `apps/api/src/.env`.
2. Se conecta a la base de datos actual (`arca_pruebas`) en Aiven.
3. Crea una carpeta por ejecución dentro de `docs/database/backups/` con la fecha/hora del respaldo (`YYYY-MM-DD_HH-mm-ss`) y genera ahí tres archivos:
   - `backup_arca_pruebas_full_<fecha>.sql` (Estructura + datos completos de seguridad).
   - `arca_pruebas_data_only_<fecha>.sql` (Solo datos con sentencias `INSERT`, sin `CREATE TABLE`, ideal para inyectar tras las migraciones).
   - `backup_arca_pruebas_schema_only_<fecha>.sql` (Solo estructura: `DROP TABLE` + `CREATE TABLE`, sin datos).
4. Actualiza en la raíz de `docs/database/backups/` los accesos directos `_latest.sql` con la versión más reciente de cada tipo.

---

## 2. ¿Cómo restaurar en la nueva instancia de Aiven?

Una vez creada tu nueva base de datos en Aiven:

1. **Actualiza las variables en `apps/api/src/.env`** con los nuevos datos (`DB_HOST`, `DB_PORT`, `DB_PASSWORD`, y nuevo `ca.pem`).
2. **Crea la estructura limpia ejecutando las migraciones:**
   ```powershell
   cd apps/api/src
   php artisan migrate
   ```
3. **Restaura los datos ejecutando el script:**
   ```powershell
   cd docs/database/backups
   .\restore.ps1
   ```
   *(O mediante `php docs/database/backups/restore.php`).*

4. **Verifica la integridad de datos:**
   ```powershell
   cd apps/api/src
   php artisan test
   ```
