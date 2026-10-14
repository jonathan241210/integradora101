# Inventario inicial de base de datos · ARCA-NB

- **Fecha de inventario:** 2026-10-11
- **Responsable de base de datos:** Victor Adrian
- **Instancia inspeccionada:** Aiven Cloud MySQL (`mysql-230c9986-arcannb.a.aivencloud.com:15280`)
- **Base de datos:** `arca_pruebas`
- **Feature SDD relacionada:** `apps/api/specs/002-initial-db-connection.md` (CA-03)

---

## 1. Parámetros del motor y servidor

| Variable / Parámetro | Valor detectado | Observaciones |
|---|---|---|
| **Versión del motor (`SELECT VERSION()`)** | `8.4.11` | Instancia alojada en Aiven Cloud. |
| **Charset (`@@character_set_database`)** | `utf8mb4` | Soporte completo Unicode / emojis. |
| **Collation (`@@collation_database`)** | `utf8mb4_0900_ai_ci` | Collation por defecto estándar de MySQL 8. |
| **Modo SQL (`@@sql_mode`)** | `ONLY_FULL_GROUP_BY, STRICT_TRANS_TABLES, NO_ZERO_IN_DATE, NO_ZERO_DATE, ERROR_FOR_DIVISION_BY_ZERO, NO_ENGINE_SUBSTITUTION` | Modo estricto estándar activado. |
| **Conexiones abiertas detectadas** | `6` | Verificado con `php artisan db:show`. |
| **Total de tablas detectadas** | `16` (en tinker) / `32` objetos reportados en resumen de Laravel | Ver detalle de tablas abajo. |

---

## 2. Política de compatibilidad: Aiven 8.4.x vs. Presidencia 8.0.x

> **Regla de oro del responsable de BD (Victor Adrian):**
> Aunque la instancia de pruebas en Aiven corra **MySQL 8.4.11**, el entorno de producción institucional en Presidencia opera sobre **MySQL 8.0.x**.
> 
> Por lo tanto:
> 1. **La base normativa de código y migraciones sigue siendo estrictamente compatible con MySQL 8.0.x**.
> 2. Ninguna migración Laravel, consulta SQL ni función/procedimiento puede utilizar sintaxis, palabras reservadas o características introducidas exclusivamente en 8.4.x (por ejemplo, nuevas palabras reservadas como `MANUAL`, privilegios nuevos o cambios en tipos/sintaxis incompatibles con 8.0).
> 3. Todo cambio debe poder ejecutarse idénticamente tanto en Aiven (8.4.x) como en el servidor de Presidencia (8.0.x).

---

## 3. Tablas detectadas en `arca_pruebas`

El comando `SHOW TABLES;` arrojó las siguientes tablas existentes en la instancia inicial:

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

*(Nota: la instancia contiene estructura previa pero sin datos definitivos).*

---

## 4. Próximos pasos (Gobierno DBR)

Conforme a la Constitución y la spec `001-database-change-governance`:
- Este esquema preexistente **no se borra ni se adopta como baseline automáticamente**.
- La adopción o normalización de estas tablas a modelos Laravel (`BaseModel`, SoftDeletes, auditoría, campos en inglés) se canalizará a través de las correspondientes solicitudes DBR aprobadas en `docs/database/requests/`.
- La conexión de la API con Aiven queda verificada y lista para desarrollo.

---

## 5. Esquemas de la instancia y normalización

La instancia aloja dos esquemas con usos distintos:

- **`arca_zoo`:** base de **desarrollo compartido**; es la que configura el `.env` local de `apps/api`.
- **`arca_pruebas`:** base **solo para PHPUnit**; `RefreshDatabase`/`migrate:fresh` pueden borrarla y reconstruirla. El inventario de las secciones 1–3 se levantó sobre esta base.

La normalización del esquema a identificadores en inglés se solicita mediante [DBR-001 · english-schema-normalization](../../../docs/database/requests/DBR-001-english-schema-normalization.md); las columnas y tablas de autenticación del personal mediante DBR-002. Ambas se aplican primero en `arca_zoo` y se verifican en `arca_pruebas`.
