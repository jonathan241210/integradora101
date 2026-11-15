# DBR-014 · species-feeding-and-animal-identity-fields

- Estado: Lista para backend (aplicada en `arca_pruebas`, 2026-11-13; evidencia detallada pendiente de adjuntar)
- Feature/spec origen: Alineación de alta de animales y perfil en PWA veterinaria (spec por definir; relacionado con `docs/database/alineacion-formularios-pwa-veterinaria.md`)
- Solicitante: Usuario (alineación funcional veterinaria/PWA)
- Responsable de BD: Victor Adrian
- Responsable backend: Victor Adrian
- Fecha: 2026-11-13
- Aprobación registrada: Victor Adrian (BD y backend), 2026-11-13. Aplicación manual en `arca_pruebas` reportada por responsable de BD el 2026-11-13 (pendiente adjuntar `SHOW CREATE TABLE`/conteos de backfill/estado de `tag_number`).

## Problema y justificación

El registro y la ficha de ejemplares mezclan datos de **especie** (señalética/información general) con datos del **ejemplar** en `animals`, lo que genera ambigüedad y duplicación. Además, el alta no está alineada para casos reales (ejemplares sin marca/chip/anillo) y el modelo de edad/nacimiento es impreciso.

Se requiere:
1. Consolidar en `species` la información general de alimentación/longevidad/reproducción y retirar de `animals` los campos ambiguos/duplicados.
2. Permitir registrar ejemplares sin identificador físico cuando no exista.
3. Estandarizar el manejo de nacimiento/edad para soportar fecha conocida y edad estimada.

## Estado actual

Según `docs/database/esquema-ingles.md` y comportamiento actual de la API/PWA:

- **`species`**: no tiene `feeding`/`diet`, ni `longevity`, ni `reproduction` (sí tiene `gestation_period`, `habitat`, etc.).
- **`animals`**: tiene `longevity` (VARCHAR(50), NULL), `reproduction` (VARCHAR(100), NULL), `diet` (TEXT, NULL), `age` (VARCHAR(50), NULL), `tag_number` (VARCHAR(50), UNIQUE, NULL documentado en DBR-011). `birth_date` no existe.
- **Alta PWA/API** (`AnimalFormView`, `AnimalController@store`): no captura longevidad/reproducción/dieta; exige `tag_number`; recibe `birth_date` pero la guarda como texto en `age` (`"Nacimiento: YYYY-MM-DD"`).
- **Diagnóstico intenso (PWA)**: captura “Edad (años)” (`intense-age`), pero el mapeo actual de `ClinicalEvaluationController@storeIntense` **no persiste** ese valor en `clinical_evaluations` (la tabla no tiene columna de edad). Hoy ese dato no se integra a BD.

## Contrato solicitado

### Especie (`species`) — datos generales/señalética
- Agregar `feeding` (TEXT, NULL): alimentación general de la especie.
- Agregar `longevity` (VARCHAR(50), NULL): longevidad/esperanza de vida general de la especie.
- Agregar `reproduction` (VARCHAR(100), NULL): información reproductiva general de la especie.
- La ficha del animal mostrará estos datos desde `species`.

> Nota de nombres: BD en inglés. “Alimentación” se propone como `feeding`.

### Ejemplar (`animals`) — datos del individuo
- Eliminar `longevity`, `reproduction`, `diet` (pasan a ser responsabilidad de `species`).
- `tag_number`: permitir `NULL` cuando el ejemplar no tenga anillo/chip/marca. Mantener unicidad cuando tenga valor; múltiples `NULL` permitidos por MySQL en índice UNIQUE.
- Modelo de nacimiento/edad (propuesta):
  - Agregar `birth_date` (DATE, NULL): fecha de nacimiento conocida.
  - Agregar `estimated_age` (VARCHAR(50), NULL): edad estimada cuando no se conoce la fecha exacta (p. ej. “2 años aprox.”, “juvenil”, rango).
  - Retirar o reemplazar `age` (VARCHAR(50), NULL) para evitar ambigüedad: migrar su contenido a `estimated_age` y/o derivar `birth_date` solo cuando el valor sea inequívocamente una fecha parseable; valores no parseables pasan a `estimated_age`.
  - **Regla de uso:** si existe `birth_date` se puede calcular la edad al mostrar; si no existe, se muestra `estimated_age`. Se permite almacenar ambas cuando aplique (p. ej. se conoce fecha aproximada y se desea conservar la estimación textual), pero la fuente de verdad para cálculo es `birth_date` cuando esté presente.

### API/PWA (consumidores, posterior a “Lista para backend”)
- Alta: aceptar `tag_number` nulo; enviar `birth_date` y/o `estimated_age` según corresponda (dejar de usar `age` ambiguo).
- Perfil: leer `feeding/longevity/reproduction` desde `species`; mostrar edad calculada desde `birth_date` o `estimated_age`.
- Diagnósticos: definir si la “edad” capturada en intenso/rápido es solo visual/derivada del animal o si debe persistirse como snapshot (ver decisiones abiertas).

## Elementos afectados

| Tipo | Nombre | Cambio |
|---|---|---|
| columna | `species.feeding` | Agregar `TEXT NULL` (alimentación general de la especie) |
| columna | `species.longevity` | Agregar `VARCHAR(50) NULL` |
| columna | `species.reproduction` | Agregar `VARCHAR(100) NULL` |
| columna | `animals.longevity` | Eliminar (dato pasa a `species`) |
| columna | `animals.reproduction` | Eliminar (dato pasa a `species`) |
| columna | `animals.diet` | Eliminar (alimentación general pasa a `species.feeding`; dieta individual/historial fuera de este alcance) |
| columna | `animals.birth_date` | Agregar `DATE NULL` |
| columna | `animals.estimated_age` | Agregar `VARCHAR(50) NULL` (reemplazo semántico de `age` ambiguo) |
| columna | `animals.age` | Eliminar o dejar en desuso tras migración a `birth_date`/`estimated_age` (definir en implementación) |
| columna/contrato | `animals.tag_number` | Asegurar `VARCHAR(50) NULL` + UNIQUE; alinear API/UI para aceptar nulo (esquema ya lo documenta nullable) |

## SQL de referencia (MySQL 8.0)

> **Referencia para revisión; no ejecutar directamente.** El cambio real se implementará como migración Laravel creada/probada/aplicada por el responsable de BD.

```sql
-- species: agregar datos generales/señalética
ALTER TABLE species
  ADD COLUMN feeding TEXT NULL AFTER habitat,
  ADD COLUMN longevity VARCHAR(50) NULL AFTER feeding,
  ADD COLUMN reproduction VARCHAR(100) NULL AFTER longevity;

-- animals: nacimiento y edad estimada
ALTER TABLE animals
  ADD COLUMN birth_date DATE NULL AFTER sex,
  ADD COLUMN estimated_age VARCHAR(50) NULL AFTER birth_date;

-- backfill desde animals.age
UPDATE animals SET birth_date = STR_TO_DATE(SUBSTRING(age, 13), '%Y-%m-%d')
  WHERE age LIKE 'Nacimiento: ____-__-__';
UPDATE animals SET estimated_age = age
  WHERE age IS NOT NULL AND age NOT LIKE 'Nacimiento: ____-__-__';

-- animals: retirar campos movidos/ambiguos (tras validar backfill y consumo)
ALTER TABLE animals
  DROP COLUMN longevity,
  DROP COLUMN reproduction,
  DROP COLUMN diet,
  DROP COLUMN age;

-- tag_number: relajar a NULL si el ambiente lo tuviera NOT NULL
ALTER TABLE animals MODIFY tag_number VARCHAR(50) NULL;
```

## Migración Laravel de referencia (DBR-014)

> **Referencia para el responsable de BD; no creada/aplicada por agente.** Copiar como archivo de migración en `apps/api/src/database/migrations/` (sugerido: `2026_11_13_000014_species_feeding_and_animal_identity_fields.php`), revisarla, probarla en MySQL 8.0 aislada y ejecutarla manualmente. Ajustar orden/nombre según convención del entorno. Verificar datos existentes antes de `DROP`.

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * DBR-014: consolida datos de especie y estandariza identidad/edad de ejemplares.
     */
    public function up(): void
    {
        if (Schema::hasTable('species')) {
            Schema::table('species', function (Blueprint $table) {
                if (! Schema::hasColumn('species', 'feeding')) {
                    $table->text('feeding')->nullable()->after('habitat');
                }
                if (! Schema::hasColumn('species', 'longevity')) {
                    $table->string('longevity', 50)->nullable()->after('feeding');
                }
                if (! Schema::hasColumn('species', 'reproduction')) {
                    $table->string('reproduction', 100)->nullable()->after('longevity');
                }
            });
        }

        if (Schema::hasTable('animals')) {
            Schema::table('animals', function (Blueprint $table) {
                if (! Schema::hasColumn('animals', 'birth_date')) {
                    $table->date('birth_date')->nullable()->after('sex');
                }
                if (! Schema::hasColumn('animals', 'estimated_age')) {
                    $table->string('estimated_age', 50)->nullable()->after('birth_date');
                }
            });

            // Backfill desde animals.age (formato actual: "Nacimiento: YYYY-MM-DD" o texto libre)
            if (Schema::hasColumn('animals', 'age')) {
                DB::table('animals')
                    ->whereNull('birth_date')
                    ->where('age', 'like', 'Nacimiento: ____-__-__')
                    ->update([
                        'birth_date' => DB::raw("STR_TO_DATE(SUBSTRING(age, 13), '%Y-%m-%d')"),
                    ]);

                DB::table('animals')
                    ->whereNull('estimated_age')
                    ->whereNotNull('age')
                    ->where('age', 'not like', 'Nacimiento: ____-__-__')
                    ->update([
                        'estimated_age' => DB::raw('age'),
                    ]);
            }

            // Asegurar tag_number nullable (idempotente; conserva UNIQUE si existe)
            if (Schema::hasColumn('animals', 'tag_number')) {
                Schema::table('animals', function (Blueprint $table) {
                    $table->string('tag_number', 50)->nullable()->change();
                });
            }

            // Retirar campos movidos/ambiguos (validar datos/migración previa en arca_pruebas)
            Schema::table('animals', function (Blueprint $table) {
                $drop = [];
                foreach (['longevity', 'reproduction', 'diet', 'age'] as $column) {
                    if (Schema::hasColumn('animals', $column)) {
                        $drop[] = $column;
                    }
                }
                if ($drop !== []) {
                    $table->dropColumn($drop);
                }
            });
        }
    }

    /**
     * Reversión con posible pérdida semántica (restaura estructura; no reconstruye datos consolidados).
     */
    public function down(): void
    {
        if (Schema::hasTable('animals')) {
            Schema::table('animals', function (Blueprint $table) {
                if (! Schema::hasColumn('animals', 'age')) {
                    $table->string('age', 50)->nullable()->after('sex');
                }
                if (! Schema::hasColumn('animals', 'diet')) {
                    $table->text('diet')->nullable();
                }
                if (! Schema::hasColumn('animals', 'reproduction')) {
                    $table->string('reproduction', 100)->nullable();
                }
                if (! Schema::hasColumn('animals', 'longevity')) {
                    $table->string('longevity', 50)->nullable();
                }
            });

            if (Schema::hasColumn('animals', 'estimated_age') && Schema::hasColumn('animals', 'age')) {
                DB::table('animals')->whereNull('age')->update(['age' => DB::raw('estimated_age')]);
            }
            if (Schema::hasColumn('animals', 'birth_date') && Schema::hasColumn('animals', 'age')) {
                DB::table('animals')
                    ->whereNull('age')
                    ->whereNotNull('birth_date')
                    ->update(['age' => DB::raw("CONCAT('Nacimiento: ', DATE_FORMAT(birth_date, '%Y-%m-%d'))")]);
            }

            Schema::table('animals', function (Blueprint $table) {
                $drop = [];
                foreach (['estimated_age', 'birth_date'] as $column) {
                    if (Schema::hasColumn('animals', $column)) {
                        $drop[] = $column;
                    }
                }
                if ($drop !== []) {
                    $table->dropColumn($drop);
                }
            });
        }

        if (Schema::hasTable('species')) {
            Schema::table('species', function (Blueprint $table) {
                $drop = [];
                foreach (['reproduction', 'longevity', 'feeding'] as $column) {
                    if (Schema::hasColumn('species', $column)) {
                        $drop[] = $column;
                    }
                }
                if ($drop !== []) {
                    $table->dropColumn($drop);
                }
            });
        }
    }
};
```

## Datos existentes y migración de datos

- **`animals.longevity/reproduction/diet`**: antes de eliminar, evaluar si existen valores no nulos en `arca_pruebas`. Si son datos generales de especie, migrarlos a la `species` correspondiente (`animals.species_id`); si son notas particulares, documentar destino (p. ej. `characteristics`) o descartar con aprobación. Si no hay datos, solo eliminar columnas.
- **`animals.age`**: contiene valores heterogéneos (texto libre y cadenas como `"Nacimiento: YYYY-MM-DD"` generadas por la API actual). Propuesta de backfill:
  - Parseable como fecha de nacimiento → poblar `birth_date` (y opcionalmente conservar representación en `estimated_age` solo si se decide).
  - No parseable → copiar a `estimated_age`.
  - Nulos permanecen nulos.
- **`tag_number`**: no backfill; permitir nulos. Verificar que no existan duplicados no nulos.
- Respaldo previo recomendado antes de `DROP COLUMN`.

## Privacidad, auditoría y retención

- `animals` y `species` son datos de catálogo/gestión zoológica (no clínicos ni financieros en estos campos). Sin cambios de SoftDeletes ni de auditoría específicos por esta DBR, salvo lo ya definido en los modelos/tablas. `birth_date` es dato del ejemplar; no es dato personal de visitantes/personal.

## Impacto, rendimiento y reversión

- Tablas de tamaño esperado pequeño/medio (`animals`, `species`); `ADD/DROP/MODIFY COLUMN` en MySQL 8.0 puede requerir reconstrucción según caso, con bloqueo breve aceptable en ambientes de prueba (validar en ventana controlada para producción).
- **Reversión (`down`)**: re-crear columnas eliminadas y volver a poblar desde `species`/`estimated_age` cuando sea posible; no es totalmente reversible sin pérdida semántica si se consolidó información o se descartaron valores ambiguos. Realizar respaldo antes de aplicar.
- Consumidores (API/PWA) deben desplegarse compatibles con el nuevo contrato tras “Lista para backend”.

## Compatibilidad MySQL 8.0

- `ADD COLUMN`, `MODIFY`, `DROP COLUMN`, `DATE`, `TEXT`, `VARCHAR`, índices UNIQUE con múltiples NULL son compatibles con MySQL 8.0.x. Evitar funciones propietarias fuera del estándar soportado.

## Orden de despliegue

1. Aprobación de DBR (BD y backend) y definición de regla de migración de datos.
2. Responsable de BD crea y prueba migración en base MySQL 8.0 aislada; aplica en `arca_pruebas` y registra evidencia → estado “Lista para backend”.
3. Backend actualiza modelos/controladores/validaciones y recursos (`Animal`, `Species`, `AnimalController`, perfiles).
4. PWA actualiza alta, perfil y manejo de edad/identificador.
5. Pruebas integradas y `/verify`.
6. Cambios destructivos (`DROP COLUMN`) preferiblemente después de confirmar que no hay consumidores del esquema anterior (o en migración expansiva/contractiva según se acuerde).

## Pruebas y evidencia

- Pruebas de esquema/objeto ejecutadas por BD en base MySQL 8.0 aislada: pendiente de registrar.
- Resultado y evidencia (sin secretos ni datos sensibles): migración aplicada manualmente en `arca_pruebas` por Victor Adrian (2026-11-13), según confirmación. **Pendiente adjuntar:** `SHOW CREATE TABLE species;`, `SHOW CREATE TABLE animals;`, conteos de backfill (`birth_date`/`estimated_age` desde `age`), verificación de `tag_number` nullable/único y confirmación de columnas retiradas.
- Pruebas integradas del backend: pendientes tras alinear consumidores.

## Decisiones registradas (aprobación 2026-11-13)

1. **`species.feeding`**: confirmado como nombre de columna para alimentación general de la especie.
2. **Longevidad y reproducción**: se agregan en `species` (`longevity`, `reproduction`) y se eliminan de `animals` junto con `diet` (consolidación a nivel especie/señalética).
3. **Nacimiento/edad en `animals`**: se estandariza con `birth_date` (DATE, NULL) y `estimated_age` (VARCHAR(50), NULL), permitiendo **coexistir ambas formas**. Regla: si existe `birth_date` se calcula la edad al mostrar (edad exacta solo cuando la fecha es conocida y confiable); si no existe, se usa `estimated_age`. `age` actual se migra y se elimina tras validar backfill y compatibilidad de consumidores.
4. **`tag_number`**: se permite `NULL` para ejemplares sin anillo/chip/marca (unicidad cuando tenga valor).
5. **Edad en diagnóstico intenso/rápido**: el campo “Edad (años)” (`intense-age`) hoy no se persiste en `clinical_evaluations`. Por defecto se tomará/derivará del animal (`birth_date`/`estimated_age`); si se requiere guardar como *snapshot* histórico en la evaluación, se tramitará en DBR adicional de tablas clínicas.
6. **Datos existentes**: antes de `DROP COLUMN` de `animals.longevity/reproduction/diet`, el responsable de BD verificará en `arca_pruebas` si hay valores a migrar a `species` o a conservar según corresponda (evidencia en la aplicación).

## Aprobaciones

| Rol | Nombre | Fecha | Resultado |
|---|---|---|---|
| Responsable de BD | Victor Adrian | 2026-11-13 | Aprobada |
| Responsable backend | Victor Adrian | 2026-11-13 | Aprobada |

> Estado posterior a aprobación: pendiente de creación/prueba/aplicación de la migración por el responsable de BD y registro de evidencia en “Aplicación por ambiente”. Pasará a “Lista para backend” solo cuando exista evidencia de aplicación. Ningún agente crea ni aplica migraciones/SQL.

## Aplicación por ambiente

| Ambiente | Estado | Fecha | Evidencia |
|---|---|---|---|
| desarrollo/pruebas (`arca_pruebas`) | aplicada (evidencia detallada pendiente) | 2026-11-13 | Confirmación de aplicación manual por Victor Adrian; adjuntar `SHOW CREATE TABLE` y conteos de backfill |
| staging | pendiente | | |
| producción (`arca_zoo`) | pendiente | | |
