# DBR-001 · english-schema-normalization

- Estado: Lista para backend
- Feature/spec origen: `apps/api/specs/003-staff-authentication.md`
- Solicitante: Jonathan (backend)
- Responsable de BD: Victor Adrian
- Responsable backend: Jonathan
- Fecha: 2026-10-13

## Problema y justificación

El esquema actual tiene nombres de tablas y columnas en español, lo que contradice el principio VI de la Constitución («Código en inglés, personas en español»): identificadores, tablas, rutas, permisos y commits se escriben en inglés. La feature `api-003` (inicio de sesión del personal) necesita una tabla `users` en inglés, y las features siguientes (tickets, expedientes clínicos, noticias, eventos) consumirán el resto del esquema.

Se solicita un **renombre en sitio** de las 16 tablas existentes y de sus columnas al inglés, conservando estructura y datos (hoy todas están vacías). El renombre se aplica mediante migraciones Laravel creadas por el responsable de BD.

## Estado actual

La instancia contiene 16 tablas con nombres en español y **0 filas** (verificado con `php artisan db:show` / `db:table`; ver `apps/api/docs/inventario-bd-inicial.md`):

1. `animales`
2. `areas`
3. `boleto`
4. `contencion_animal`
5. `especies`
6. `evaluacion_sistemas_hallazgos`
7. `evaluaciones_clinicas`
8. `eventos`
9. `muestras_laboratorio`
10. `noticias`
11. `recintos`
12. `recintos_qr`
13. `salida_animales`
14. `usuarios`
15. `usuarios_admins`
16. `usuarios_coleccion`

Observaciones verificadas:

- El esquema existente **no tiene migraciones Laravel**: fue creado por fuera del flujo de migraciones.
- `areas` solo la referencia `usuarios_admins.id_area`: es el **departamento del empleado**, no una zona del zoológico (los recintos no tienen área). Se renombra a `departments`.
- `usuarios_admins` es la tabla del personal. Hoy no tiene correo, estado, `remember_token`, columnas 2FA, timestamps ni SoftDeletes (esos cambios se piden en DBR-002). Su FK `id_area` está en **ON DELETE CASCADE**: borrar un área eliminaría cuentas.
- `usuarios` guarda las cuentas de visitantes (colección QR de mobile); se renombra a `visitors` para no confundirla con el personal.
- No existen `sessions`, `cache`, las tablas de Spatie ni `activity_log`; se piden en DBR-002.
- La migración por defecto `0001_01_01_000000_create_users_table.php` (users, password_reset_tokens, sessions) **choca** con el renombre propuesto `usuarios_admins → users`; el responsable de BD decide cómo resolver el conflicto.
- Uso de las bases (confirmado): **`arca_zoo` = desarrollo compartido** (`.env` local); **`arca_pruebas` = solo PHPUnit** (`RefreshDatabase`/`migrate:fresh` pueden borrarla y reconstruirla).

## Contrato solicitado

Convenciones de nombrado que debe cumplir el esquema resultante:

- PK `id`; FK `<singular>_id`; booleanos `is_*`/`can_*`; fechas `*_date`; horas `*_time`; timestamps `*_at`.
- Índices y claves foráneas también se renombran: `fk_<tabla>_<columna>` para claves foráneas y `uk_<tabla>_<columna>` para índices únicos.

Renombre de tablas y columnas (actual → nuevo):

| Actual | Nuevo | Columnas (actual → nueva) |
|---|---|---|
| `usuarios_admins` | `users` | id_empleado→id, nombre→first_name, primer_apellido→last_name, segundo_apellido→second_last_name, id_area→department_id, ultimo_acceso→last_login_at, contrasena_hash→password |
| `areas` | `departments` | id_area→id, nombre_area→name, descripcion→description |
| `usuarios` | `visitors` | id_usuario→id, nickname, correo_electronico→email, nombre→first_name, primer_apellido→last_name, segundo_apellido→second_last_name, contrasena_hash→password, estado_actividad→is_active |
| `usuarios_coleccion` | `visitor_collections` | id_coleccion→id, fecha_desbloqueo→unlocked_date, id_recinto_qr→enclosure_qr_code_id, id_usuario→visitor_id |
| `recintos` | `enclosures` | id_recinto→id, nombre_recinto→name |
| `recintos_qr` | `enclosure_qr_codes` | id_recinto_qr→id, codigo→code, activo→is_active, id_recinto→enclosure_id |
| `especies` | `species` | id_especie→id, nombre_especie→common_name, nombre_cientifico→scientific_name, distribucion→distribution, estatus_conservacion→conservation_status, habitat, gestacion_periodo→gestation_period, talla_cm→size_cm, modelo_3d_ruta→model_3d_path |
| `animales` | `animals` | id_animal→id, no_marcaje→tag_number, id_empleado→responsible_id, nombre_animal→name, sexo→sex, edad→age, origen→origin, longevidad→longevity, reproduccion→reproduction, dieta→diet, caracteristicas→characteristics, ruta_fotografia→photo_path, fecha_entrada→entry_date, hora_entrada→entry_time, id_recinto→enclosure_id, id_especie→species_id, puede_recibir_visitas→can_receive_visits, estatus_estancia→stay_status |
| `salida_animales` | `animal_departures` | id_salida→id, id_animal→animal_id, fecha_salida→departure_date, hora_salida→departure_time, estado_salida→departure_status |
| `evaluaciones_clinicas` | `clinical_evaluations` | id_evaluacion→id, id_animal→animal_id, id_empleado_mvz→veterinarian_id, tipo_evaluacion→evaluation_type, motivo_evaluacion→evaluation_reason, dictamen_destino→destination_ruling, motivo_valoracion→assessment_reason, fecha→evaluation_date, hora_entrada→start_time, hora_salida→end_time, temperatura_c→temperature_c, frecuencia_cardiaca→heart_rate, frecuencia_respiratoria→respiratory_rate, tiempo_llenado_capilar→capillary_refill_time, peso_kg→weight_kg, actitud→attitude, condicion_corporal_puntaje→body_condition_score, diagnostico_presuntivo→presumptive_diagnosis, diagnostico_definitivo→definitive_diagnosis, recomendaciones→recommendations, optimo_liberacion_silvestre→is_fit_for_wild_release |
| `evaluacion_sistemas_hallazgos` | `clinical_evaluation_findings` | id_hallazgo→id, id_evaluacion→clinical_evaluation_id, sistema_organico→organ_system, estado→status, descripcion_hallazgo→description |
| `contencion_animal` | `animal_restraints` | id_contencion→id, id_evaluacion→clinical_evaluation_id, tipo_movilizacion→mobilization_type, metodo_fisico→physical_method, medicamento→drug, dosis_mg_kg→dose_mg_per_kg, dosis_ml→dose_ml, hora_aplicacion→administered_time, observaciones→notes |
| `muestras_laboratorio` | `lab_samples` | id_muestra→id, id_evaluacion→clinical_evaluation_id, tipo_muestra→sample_type, ruta_archivo→file_path, resultado_observaciones→result_notes |
| `noticias` | `news` | id_noticia→id, titulo→title, descripcion→description, contenido→content, ruta_imagen→image_path, fecha_publicacion→published_date, fecha_inicio→start_date, fecha_fin→end_date, categoria→category, estado→is_active, id_empleado→author_id |
| `eventos` | `events` | id_evento→id, nombre_evento→name, descripcion→description, imagen_evento→image_path, fecha_inicio→start_date, fecha_fin→end_date, hora_inicio→start_time, hora_fin→end_time, ubicacion→location, estado→is_active, id_empleado→author_id |
| `boleto` | `tickets` | no_folio→id, boleto_adulto→adult_quantity, boleto_nino→child_quantity, costo_total→total_amount, fecha_compra→purchased_at, codigo_qr→qr_code, id_empleado→cashier_id |

Las columnas sin «→» conservan su nombre (ya cumplen la convención o no tienen equivalente mejor).

## Elementos afectados

| Tipo | Nombre | Cambio |
|---|---|---|
| tabla | `usuarios_admins` → `users` | renombrar tabla y columnas |
| tabla | `areas` → `departments` | renombrar tabla y columnas |
| tabla | `usuarios` → `visitors` | renombrar tabla y columnas |
| tabla | `usuarios_coleccion` → `visitor_collections` | renombrar tabla y columnas |
| tabla | `recintos` → `enclosures` | renombrar tabla y columnas |
| tabla | `recintos_qr` → `enclosure_qr_codes` | renombrar tabla y columnas |
| tabla | `especies` → `species` | renombrar tabla y columnas |
| tabla | `animales` → `animals` | renombrar tabla y columnas |
| tabla | `salida_animales` → `animal_departures` | renombrar tabla y columnas |
| tabla | `evaluaciones_clinicas` → `clinical_evaluations` | renombrar tabla y columnas |
| tabla | `evaluacion_sistemas_hallazgos` → `clinical_evaluation_findings` | renombrar tabla y columnas |
| tabla | `contencion_animal` → `animal_restraints` | renombrar tabla y columnas |
| tabla | `muestras_laboratorio` → `lab_samples` | renombrar tabla y columnas |
| tabla | `noticias` → `news` | renombrar tabla y columnas |
| tabla | `eventos` → `events` | renombrar tabla y columnas |
| tabla | `boleto` → `tickets` | renombrar tabla y columnas |
| índice / clave foránea | todas las existentes | renombrar a `fk_<tabla>_<columna>` / `uk_<tabla>_<columna>` |

## SQL de referencia (MySQL 8.0)

> **Referencia para revisión; no ejecutar directamente.** El cambio real se implementará como migración Laravel creada por el responsable de BD.

```sql
-- propuesta ilustrativa
RENAME TABLE usuarios_admins TO users;
ALTER TABLE users RENAME COLUMN id_empleado TO id;
ALTER TABLE users RENAME COLUMN id_area TO department_id;
ALTER TABLE users RENAME COLUMN contrasena_hash TO password;

RENAME TABLE areas TO departments;
ALTER TABLE departments RENAME COLUMN id_area TO id;
```

## Datos existentes y migración de datos

Todas las tablas están vacías (0 filas): no se requiere backfill ni transformación de datos; el cambio es solo de metadatos.

**Pregunta abierta — defaults con texto en español:** existen valores por defecto en español: `animales.estatus_estancia` (→ `animals.stay_status`) con `Cuarentena_Ingreso` y `evaluaciones_clinicas.motivo_evaluacion` (→ `clinical_evaluations.evaluation_reason`) con `Revision_Rutinaria`. Se propone cambiarlos a códigos en inglés (`intake_quarantine`, `routine_check`) y mostrar la etiqueta en español en la UI. Queda como **pregunta abierta para el responsable de BD**.

## Privacidad, auditoría y retención

- El renombre no cambia la clasificación de los datos. `users` (personal) y `visitors` contendrán datos personales; su tratamiento de privacidad se detalla en DBR-002.
- **Fuera de alcance:** SoftDeletes y auditoría (`created_by`/`updated_by`, Activitylog) de las tablas clínicas y financieras (`clinical_evaluations`, `tickets`, etc.). Cada feature (tickets, expedientes) los pedirá en su propia DBR.

## Impacto, rendimiento y reversión

- Las tablas están vacías; `RENAME TABLE` y `ALTER TABLE ... RENAME COLUMN` en MySQL 8.0 son operaciones de metadatos sin copia de datos, por lo que no se esperan bloqueos relevantes.
- **Reversión:** el `down()` de la migración invierte los renombres (nuevo → actual) en orden inverso. Respaldo previo según la política de gobierno.
- **Reproducibilidad de los tests:** se recomienda (1) una migración baseline que cree el esquema legado **solo si no existe** y (2) la migración de renombre. En `arca_zoo`, (1) no hace nada y (2) renombra; en `arca_pruebas` limpia, `migrate:fresh` reconstruye todo. El responsable de BD también resuelve el choque con la migración por defecto `0001_01_01_000000_create_users_table.php`.

## Compatibilidad MySQL 8.0

`RENAME TABLE` y `ALTER TABLE ... RENAME COLUMN` son compatibles con MySQL 8.0.x (`RENAME COLUMN` existe desde 8.0). Sin extensiones propietarias ni sintaxis exclusiva de 8.4.

## Objeto almacenado (si aplica)

No aplica.

## Orden de despliegue

- Esta DBR va **antes** que DBR-002 (`staff-authentication`), que agrega columnas y tablas sobre los nombres nuevos.
- Se aplica en `arca_zoo` (desarrollo compartido) y se verifica en `arca_pruebas` (solo PHPUnit).
- Hoy ningún código consume los nombres viejos, así que el impacto del renombre es bajo.

## Pruebas y evidencia

- Pruebas de esquema/objeto ejecutadas por BD en base MySQL 8.0/8.4 aislada (`arca_pruebas`): Ejecutadas exitosamente.
- Resultado y evidencia (sin secretos ni datos sensibles):
  - Migración `2026_10_14_000001_rename_tables_and_columns_to_english.php` ejecutada sin errores (39s).
  - 16 tablas y todas sus columnas renombradas al inglés.
  - Check constraints actualizados a inglés (`chk_animals_can_receive_visits`, `chk_animals_stay_status`, `chk_clinical_evaluations_evaluation_type`, `chk_clinical_evaluations_body_condition_score`).
  - Verificación `php artisan db:show` confirmó las 16 tablas en inglés en `arca_pruebas`.
  - Suite de pruebas PHPUnit: 7 passed (21 assertions).
  - Suite de gobernanza Node: 10 passed (10 tests).
- Pruebas integradas del backend: lista para consumo.

## Aprobaciones

| Rol | Nombre | Fecha | Resultado |
|---|---|---|---|
| Responsable de BD | Victor Adrian | 2026-10-14 | Aprobada |
| Responsable backend | Jonathan | 2026-10-14 | Aprobada |

## Aplicación por ambiente

| Ambiente | Estado | Fecha | Evidencia |
|---|---|---|---|
| desarrollo/pruebas (`arca_pruebas`) | aplicada | 2026-10-14 | Migración 2026_10_14_000001 ejecutada y verificada |
| staging | pendiente | | |
| producción | pendiente | | |
