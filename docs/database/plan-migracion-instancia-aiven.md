# Plan de migración de instancia de base de datos · Aiven Cloud MySQL

- **Documento:** Plan de migración y continuidad de base de datos
- **Responsable de BD:** Víctor Adrián
- **Responsable backend / Equipo:** Jonathan, Diego, Ian
- **Fecha de elaboración:** 2026-11-02
- **Rama origen:** `Jona` (incluye esquema normalizado hasta DBR-006)
- **Estado:** Propuesto (Pendiente de ejecución al aproximarse el fin del periodo de prueba de Aiven)

---

## 1. Contexto y objetivo

El entorno de base de datos compartido para desarrollo y pruebas del proyecto (`arca_pruebas`) se encuentra actualmente alojado en una instancia de prueba gratuita de **Aiven Cloud MySQL** (`mysql-230c9986-arcannb.a.aivencloud.com:15280`, ADR 0013).

Debido a que el periodo de prueba gratuito está próximo a concluir, la instancia será discontinuada por el proveedor.

### Objetivo
Realizar una migración planificada, segura y con cero pérdida de información hacia una **nueva instancia/servicio de Aiven**, garantizando:
1. Respaldo íntegro de todos los datos de prueba existentes (cuentas de staff, configuraciones, animales, recintos, boletos y datos transaccionales).
2. Despliegue de la estructura de base de datos canónica actualizada (hasta DBR-006).
3. Restauración consistente de datos sin conflictos de integridad referencial.
4. Transición transparente de variables de entorno (`.env`) para todos los desarrolladores del equipo.

> **IMPORTANTE:** Este documento es un **plan preventivo**. No debe ejecutarse ninguna acción destructiva ni de conmutación hasta que el responsable de base de datos dé la instrucción formal de inicio de ventana de migración.

---

## 2. Inventario de lo que se migra

### 2.1 Esquema oficial de base de datos
El esquema no se reconstruye mediante SQL manual, sino ejecutando la cadena oficial de migraciones Laravel aprobadas en `apps/api/src/database/migrations/`:
1. `2026_10_14_000001_rename_tables_and_columns_to_english.php` (DBR-001)
2. `2026_10_14_000002_staff_authentication_schema.php` (DBR-002: Spatie roles, sessions, activity_log)
3. `2026_10_15_000003_visitor_accounts_schema.php` (DBR-003: visitantes, tokens, códigos)
4. `2026_10_15_000004_visitor_progress_schema.php` (DBR-004: scans, logros, misiones)
5. `2026_10_30_000005_news_events_soft_deletes_and_tickets_index.php` (DBR-005: SoftDeletes e índice)
6. `2026_11_02_000006_ticket_sales_schema.php` (DBR-006: precios, taquilla, avisos)

### 2.2 Datos de prueba esenciales a preservar
- **Personal institucional y autenticación:** `users`, `departments`, `roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `role_has_permissions` (incluyendo las credenciales documentadas en `apps/api/docs/credenciales-desarrollo.md`).
- **Catálogo zoológico:** `species`, `enclosures`, `enclosure_qr_codes`, `animals`, `animal_departures`.
- **Área clínica:** `clinical_evaluations`, `clinical_evaluation_findings`, `animal_restraints`, `lab_samples`.
- **Contenido institucional:** `news`, `events`.
- **Taquilla y financiero:** `tickets`, `ticket_prices`, `staff_notifications`.
- **Visitantes y gamificación:** `visitors`, `visitor_collections`, `visitor_scans`, `achievements`, `missions`, `visitor_point_ledger`.

---

## 3. Estrategia técnica de migración

Se adopta la estrategia **Estructura limpia por migraciones + Inyección de datos (Data Dump)**:

```text
[Instancia Actual Aiven]
       │
       ▼ (1. Respaldo lógico con mysqldump solo datos)
[Archivo arca_pruebas_data_backup.sql]
       │
[Nueva Instancia Aiven]
       │
       ▼ (2. Ejecutar php artisan migrate con nuevo .env)
[Esquema canónico 100% verificado]
       │
       ▼ (3. Restaurar arca_pruebas_data_backup.sql con FOREIGN_KEY_CHECKS=0)
[Base arca_pruebas completamente operativa]
       │
       ▼ (4. Verificación con php artisan test y conteo de filas)
```

**Ventajas de esta estrategia:**
- Asegura que la tabla `migrations` de Laravel quede perfectamente sincronizada en la nueva base.
- Previene inconsistencias de índices o tipos de datos entre versiones del motor.
- Garantiza total trazabilidad con el flujo SDD del proyecto.

---

## 4. Fases de ejecución paso a paso

### Fase 1: Aprovisionamiento de la nueva instancia en Aiven

1. **Creación del servicio:**
   - Crear un nuevo servicio **MySQL** en Aiven Cloud.
   - Seleccionar región conveniente (ej. `google-southamerica-west1` o `aws-us-east-1` según disponibilidad en plan).
   - Configurar versión compatible (MySQL 8.0.x / 8.4.x).
2. **Creación de base de datos:**
   - En la consola de Aiven, crear una base de datos con el nombre exacto: `arca_pruebas`.
3. **Descarga del certificado CA SSL:**
   - Descargar el archivo `ca.pem` de la nueva instancia.
   - Guardarlo en el directorio local de certificados (ej. en `apps/api/` fuera del repositorio git o en la ruta que determine el `.env` local).
4. **Parámetros de conexión requeridos:**
   - Host (ej. `mysql-new-instance.aivencloud.com`)
   - Puerto (ej. `15280`)
   - Usuario (ej. `avnadmin`)
   - Contraseña

---

### Fase 2: Respaldo (Backup) de la instancia actual

> Ejecutar desde la máquina del responsable de BD con acceso de red a Aiven.

#### 1. Dump completo de seguridad (Estructura + Datos)
Como salvaguarda absoluta en caso de requerir una recuperación de emergencia:
```bash
mysqldump \
  --host=mysql-230c9986-arcannb.a.aivencloud.com \
  --port=15280 \
  --user=avnadmin \
  --password \
  --ssl-ca="RUTA_DEL_CERTIFICADO_ACTUAL/ca.pem" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --default-character-set=utf8mb4 \
  arca_pruebas > backup_arca_pruebas_full_seguridad.sql
```

#### 2. Dump exclusivo de datos (Sin DDL/CREATE TABLE)
Este archivo se usará para la importación directa sobre las tablas creadas por Laravel:
```bash
mysqldump \
  --host=mysql-230c9986-arcannb.a.aivencloud.com \
  --port=15280 \
  --user=avnadmin \
  --password \
  --ssl-ca="RUTA_DEL_CERTIFICADO_ACTUAL/ca.pem" \
  --no-create-info \
  --single-transaction \
  --quick \
  --complete-insert \
  --ignore-table=arca_pruebas.migrations \
  --default-character-set=utf8mb4 \
  arca_pruebas > arca_pruebas_data_only.sql
```

---

### Fase 3: Conexión y migración de la nueva instancia

1. **Configurar temporalmente `.env` en `apps/api/src/.env`:**
   ```env
   DB_CONNECTION=mysql
   DB_HOST=NUEVO_HOST_AIVEN.aivencloud.com
   DB_PORT=NUEVO_PUERTO_AIVEN
   DB_DATABASE=arca_pruebas
   DB_USERNAME=avnadmin
   DB_PASSWORD=NUEVA_CONTRASENA_AIVEN
   DB_SSL_CA="RUTA_NUEVO_CERTIFICADO/ca.pem"
   ```

2. **Verificar conectividad básica:**
   ```powershell
   cd apps/api/src
   php artisan db:show
   ```

3. **Ejecutar la suite completa de migraciones:**
   ```powershell
   php artisan migrate
   ```

4. **Verificar que todas las migraciones figuren en estado `Ran`:**
   ```powershell
   php artisan migrate:status
   ```

---

### Fase 4: Restauración de los datos respaldados

Dado que la migración `2026_11_02_000006_ticket_sales_schema` siembra dos registros base en `ticket_prices`, y que las claves foráneas pueden validar dependencias cíclicas, la importación se ejecuta con desactivación previa de chequeo de llaves foráneas.

#### Preparación del script de importación:
En la cabecera y pie del archivo `arca_pruebas_data_only.sql`, verificar que incluya (o anteponer/posponer):
```sql
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

-- CONTENIDO DEL DUMP (arca_pruebas_data_only.sql)

SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET SQL_MODE=@OLD_SQL_MODE;
```

#### Ejecución de la restauración:
```bash
mysql \
  --host=NUEVO_HOST_AIVEN.aivencloud.com \
  --port=NUEVO_PUERTO_AIVEN \
  --user=avnadmin \
  --password \
  --ssl-ca="RUTA_NUEVO_CERTIFICADO/ca.pem" \
  --default-character-set=utf8mb4 \
  arca_pruebas < arca_pruebas_data_only.sql
```

*(Nota: si existen duplicados por registros sembrados en la migración como `ticket_prices` con id 1 y 2, se recomienda usar `INSERT IGNORE` o limpiar esas dos filas antes de importar).*

---

### Fase 5: Validación e integridad de datos

El responsable de BD verificará los siguientes puntos de control:

1. **Conteo comparativo de filas:**
   Ejecutar la siguiente consulta tanto en la instancia antigua como en la nueva para confirmar que coincidan exactamente:
   ```sql
   SELECT table_name, table_rows
   FROM information_schema.tables
   WHERE table_schema = 'arca_pruebas'
   ORDER BY table_name;
   ```

2. **Verificación de cuentas de personal y login:**
   - Probar que el usuario admin principal y cajero puedan autenticarse vía API:
   ```powershell
   php artisan tinker --execute="dump(App\Models\User::pluck('email'));"
   ```

3. **Verificación de precios vigentes y tickets:**
   ```powershell
   php artisan tinker --execute="dump(DB::table('ticket_prices')->get()); dump(DB::table('tickets')->count());"
   ```

4. **Ejecución de la suite de pruebas de regresión:**
   ```powershell
   php artisan test
   ```
   Todos los tests de integración con base de datos (`DbConnectionTest`, pruebas de autenticación, administración, etc.) deben concluir en verde.

---

### Fase 6: Cutover y comunicación al equipo

Una vez validada la nueva base de datos:

1. **Actualizar el inventario de BD:**
   - Registrar los nuevos datos del host en `apps/api/docs/inventario-bd-inicial.md` (sin contraseñas).
2. **Notificar al equipo (Jonathan, Ian, Diego):**
   - Distribuir de forma segura por el canal privado del equipo los nuevos valores de:
     - `DB_HOST`
     - `DB_PORT`
     - `DB_PASSWORD`
     - Nuevo archivo `ca.pem`
   - Recordarles que **nunca deben commitear `.env` ni los certificados**.

---

### 7. Plan de reversión (Rollback)

Si durante la ventana de migración ocurre cualquier anomalía insalvable:
1. No se elimina ni se apaga la instancia actual de Aiven mientras conserve días de gracia.
2. Cada desarrollador mantiene su `.env` apuntando a la instancia original.
3. Se depura el problema en la nueva instancia y se reprograma la ventana de conmutación.

---

### 8. Checklist rápido para el día de ejecución

- [ ] Nueva instancia creada en Aiven y base `arca_pruebas` provisionada.
- [ ] Nuevo certificado `ca.pem` descargado y almacenado localmente.
- [ ] `mysqldump` full de seguridad generado y verificado.
- [ ] `mysqldump` de solo datos generado.
- [ ] Migraciones Laravel aplicadas con éxito en la nueva instancia (`php artisan migrate`).
- [ ] Datos importados con `FOREIGN_KEY_CHECKS=0`.
- [ ] Conteo de tablas y registros validado contra la base original.
- [ ] Suite de pruebas (`php artisan test`) ejecutada con 100% de éxito.
- [ ] Actualización de credenciales distribuida al equipo de desarrollo.
- [ ] Documento de inventario actualizado.
