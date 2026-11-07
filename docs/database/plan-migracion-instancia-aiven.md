# Plan de migración de instancia de base de datos · Aiven Cloud MySQL

- **Documento:** Plan de migración y continuidad de base de datos
- **Responsable de BD:** Víctor Adrián
- **Responsable backend / Equipo:** Jonathan, Diego, Ian
- **Fecha de elaboración inicial:** 2026-11-02
- **Última actualización:** 2026-11-07 (Actualizado con DBR-008 y ventana de ejecución por vencimiento de prueba de Aiven)
- **Rama origen:** `victor` (incluye esquema canónico normalizado hasta DBR-006 y DBR-008)
- **Estado:** Activo / En ejecución inmediata (vencimiento de instancia gratuita de Aiven: 2026-11-07)

---

## 1. Contexto y objetivo

El entorno de base de datos compartido para desarrollo y pruebas del proyecto (`arca_pruebas`) se encuentra alojado en una instancia de prueba gratuita de **Aiven Cloud MySQL** (`mysql-230c9986-arcannb.a.aivencloud.com:15280`, ADR 0013).

Hoy **2026-11-07** concluye el periodo de prueba gratuito de dicha instancia, por lo que el servicio será suspendido o eliminado por el proveedor en las próximas horas.

### Objetivo
Realizar una migración planificada, segura y con cero pérdida de información hacia una **nueva instancia/servicio de Aiven**, garantizando:
1. **Respaldo inmediato de datos (Paso crítico):** Extraer el dump de datos de `arca_pruebas` antes del corte de red del servicio actual.
2. **Despliegue del esquema canónico completo:** Reconstruir la estructura ejecutando la cadena oficial de migraciones Laravel (DBR-001 a DBR-008).
3. **Restauración consistente de datos:** Importar registros de prueba evitando conflictos de claves foráneas.
4. **Continuidad operativa:** Actualizar las credenciales en `.env` sin romper las suites de pruebas automatizadas.

---

## 2. Inventario de lo que se migra

### 2.1 Cadena oficial de migraciones Laravel
El esquema se construye ejecutando en orden las migraciones versionadas en `apps/api/src/database/migrations/`:

1. `2026_10_14_000001_rename_tables_and_columns_to_english.php` (DBR-001: normalización al inglés de las 16 tablas originales)
2. `2026_10_14_000002_staff_authentication_schema.php` (DBR-002: columnas de autenticación en `users`/`departments`, Spatie roles/permisos, sessions, activity_log)
3. `2026_10_15_000003_visitor_accounts_schema.php` (DBR-003: cuentas de visitante, tokens y códigos de verificación)
4. `2026_10_15_000004_visitor_progress_schema.php` (DBR-004: colección de especies, scans, catálogo de logros y misiones, libro mayor de puntos)
5. `2026_10_30_000005_news_events_soft_deletes_and_tickets_index.php` (DBR-005: SoftDeletes en noticias/eventos e índice `purchased_at` en boletos)
6. `2026_11_02_000006_ticket_sales_schema.php` (DBR-006: tabla `ticket_prices`, columnas de venta/cancelación en `tickets`, tabla `staff_notifications`)
7. `2026_11_03_000008_enclosure_gps_coordinates.php` (DBR-008: columnas `gps_lat`, `gps_lon`, `map_x`, `map_y` en `enclosures` para el mapa móvil `mobile-007`)

### 2.2 Datos de prueba esenciales a preservar
- **Personal institucional y autenticación:** `users`, `departments`, `roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `role_has_permissions` (incluyendo las credenciales documentadas en `apps/api/docs/credenciales-desarrollo.md`).
- **Catálogo zoológico y geolocalización:** `species`, `enclosures` (con sus coordenadas GPS y normalizadas SVG), `enclosure_qr_codes`, `animals`, `animal_departures`.
- **Área clínica:** `clinical_evaluations`, `clinical_evaluation_findings`, `animal_restraints`, `lab_samples`.
- **Contenido institucional:** `news`, `events`.
- **Taquilla y financiero:** `tickets`, `ticket_prices`, `staff_notifications`.
- **Visitantes y gamificación:** `visitors`, `visitor_collections`, `visitor_scans`, `achievements`, `missions`, `visitor_point_ledger`.

---

## 3. Estrategia técnica de migración

Se adopta la estrategia **Estructura limpia por migraciones + Inyección de datos (Data Dump)**:

```text
[Instancia Actual Aiven (Próxima a vencer)]
       │
       ▼ (1. Respaldo urgente con mysqldump solo datos + dump full)
[Archivos locales .sql en máquina del responsable de BD]
       │
[Nueva Instancia Aiven]
       │
       ▼ (2. Ejecutar php artisan migrate con nuevo .env)
[Esquema canónico 100% verificado: DBR-001 a DBR-008]
       │
       ▼ (3. Restaurar arca_pruebas_data_only.sql con FOREIGN_KEY_CHECKS=0)
[Base arca_pruebas completamente restaurada]
       │
       ▼ (4. Verificación con php artisan test, conteo y login de prueba)
```

---

## 4. Fases de ejecución paso a paso

### ⚠️ PASO 1 (URGENTE): Respaldo de la base actual antes del corte

> **Ejecutar de inmediato** desde la terminal con acceso a la red de Aiven para asegurar los datos:

#### A. Dump completo de seguridad (Estructura + Datos)
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

#### B. Dump exclusivo de datos (Sin CREATE TABLE)
Este archivo se utilizará para importar los datos limpios sobre las tablas creadas por las migraciones Laravel:
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

### PASO 2: Aprovisionamiento de la nueva instancia en Aiven

1. **Crear el nuevo servicio MySQL** en la consola de Aiven (cuenta nueva o con nuevo crédito).
2. **Crear la base de datos** con el nombre exacto: `arca_pruebas`.
3. **Descargar el nuevo certificado CA SSL** (`ca.pem`) y guardarlo en el equipo local.
4. Anotar las nuevas credenciales:
   - Host
   - Puerto
   - Usuario (`avnadmin`)
   - Contraseña

---

### PASO 3: Conexión y migración de la nueva estructura

1. **Configurar el archivo `.env` en `apps/api/src/.env` con la nueva instancia:**
   ```env
   DB_CONNECTION=mysql
   DB_HOST=NUEVO_HOST_AIVEN.aivencloud.com
   DB_PORT=NUEVO_PUERTO_AIVEN
   DB_DATABASE=arca_pruebas
   DB_USERNAME=avnadmin
   DB_PASSWORD=NUEVA_CONTRASENA_AIVEN
   DB_SSL_CA="RUTA_DEL_NUEVO_CERTIFICADO/ca.pem"
   ```

2. **Verificar conectividad básica:**
   ```powershell
   cd apps/api/src
   php artisan db:show
   ```

3. **Ejecutar las migraciones en la nueva base (DBR-001 a DBR-008):**
   ```powershell
   php artisan migrate
   ```

4. **Verificar que todas las 7 migraciones figuren en estado `Ran`:**
   ```powershell
   php artisan migrate:status
   ```

---

### PASO 4: Restauración de los datos respaldados

Dado que la migración de tickets (DBR-006) siembra automáticamente precios iniciales y las tablas tienen claves foráneas activas, la importación se ejecuta con desactivación de verificación de llaves foráneas:

#### Envolver el script de datos (`arca_pruebas_data_only.sql`):
Asegurar que la importación contenga al inicio y al final:
```sql
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

-- CONTENIDO DEL ARCHIVO arca_pruebas_data_only.sql

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
  --ssl-ca="RUTA_DEL_NUEVO_CERTIFICADO/ca.pem" \
  --default-character-set=utf8mb4 \
  arca_pruebas < arca_pruebas_data_only.sql
```

*(Si `ticket_prices` tiene conflicto por los IDs 1 y 2 creados en el migrate, se pueden limpiar antes de importar o usar `INSERT IGNORE`).*

---

### PASO 5: Validación e integridad de datos

El responsable de BD ejecutará los siguientes controles:

1. **Conteo comparativo de filas:**
   ```sql
   SELECT table_name, table_rows 
   FROM information_schema.tables 
   WHERE table_schema = 'arca_pruebas' 
   ORDER BY table_name;
   ```

2. **Verificación de coordenadas GPS en `enclosures` (DBR-008):**
   ```powershell
   php artisan tinker --execute="dump(DB::table('enclosures')->select('id', 'name', 'gps_lat', 'gps_lon', 'map_x', 'map_y')->get());"
   ```

3. **Verificación de usuarios de prueba (login):**
   ```powershell
   php artisan tinker --execute="dump(App\Models\User::pluck('email'));"
   ```

4. **Verificación de tickets y precios vigentes:**
   ```powershell
   php artisan tinker --execute="dump(DB::table('ticket_prices')->get()); dump(DB::table('tickets')->count());"
   ```

5. **Ejecución de la suite de pruebas automatizadas:**
   ```powershell
   php artisan test
   ```
   Todas las pruebas deben concluir en verde.

---

### PASO 6: Cutover y comunicación al equipo

Una vez validada la nueva base:
1. **Actualizar el inventario de BD:** Registrar el nuevo host en `apps/api/docs/inventario-bd-inicial.md` (sin contraseñas).
2. **Notificar a Jonathan, Ian y Diego:** Compartir de forma segura por el canal privado los nuevos parámetros:
   - `DB_HOST`
   - `DB_PORT`
   - `DB_PASSWORD`
   - Nuevo archivo `ca.pem`
3. Recordar al equipo que **nunca deben commitear `.env` ni certificados SSL**.

---

## 5. Checklist de ejecución (Día de corte: 2026-11-07)

- [ ] **Dump de seguridad urgente realizado** (`backup_arca_pruebas_full_seguridad.sql`).
- [ ] **Dump de solo datos realizado** (`arca_pruebas_data_only.sql`).
- [ ] Nuevo servicio MySQL y base `arca_pruebas` creados en Aiven.
- [ ] Nuevo certificado `ca.pem` descargado localmente.
- [ ] Variables de `.env` actualizadas con la nueva conexión.
- [ ] `php artisan db:show` confirma conexión exitosa.
- [ ] `php artisan migrate` ejecutado con éxito (DBR-001 a DBR-008 en estado `Ran`).
- [ ] Datos de prueba restaurados con `FOREIGN_KEY_CHECKS=0`.
- [ ] Verificación de tablas (`enclosures` con GPS, `tickets`, `users`).
- [ ] Suite de pruebas (`php artisan test`) ejecutada al 100% en verde.
- [ ] Nuevas credenciales distribuidas al equipo de desarrollo por canal privado.
