# Herramientas de respaldo y restauración · ARCA-NB

Esta carpeta contiene los scripts automatizados para respaldar los datos de desarrollo/pruebas de la base de datos de ARCA-NB y migrarlos hacia una nueva instancia sin depender de herramientas externas complejas.

> **Seguridad:** Los archivos `.sql` generados están ignorados en `.gitignore` para prevenir que datos de prueba o credenciales se suban al repositorio.

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
3. Extrae todas las tablas y genera dos archivos en esta misma carpeta:
   - `backup_arca_pruebas_full_<fecha>.sql` (Estructura + Datos completos de seguridad).
   - `arca_pruebas_data_only_<fecha>.sql` (Solo datos con sentencias `INSERT`, sin `CREATE TABLE`, ideal para inyectar tras las migraciones).
   - Genera también accesos directos `_latest.sql` con la versión más reciente.

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
