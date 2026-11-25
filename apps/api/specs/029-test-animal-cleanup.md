# 029 · Limpieza de animales de prueba

- App dueña: `api`
- Estado: Aprobada
- Solicitante: usuario de la sesión
- Aprobación funcional: el solicitante pidió conservar exclusivamente los animales de DBR-019 el 25 de noviembre de 2026. El solicitante ejecutará la baja.

## Problema y alcance

El inventario activo de `arca_pruebas` incluye altas de prueba hechas desde la PWA. La carga del seeder contiene ejemplares que el solicitante quiere conservar para pruebas. Se solicita una baja lógica puntual por parte de un operador autorizado de la API. La operación se limita a `arca_pruebas` y no agrega una ruta HTTP ni modifica pantallas.

## Lote propuesto

- Dar de baja los 14 animales activos ajenos al lote DBR-019, IDs 5, 38–41, 46–47, 98–99, 166–168 y 326–327. El alcance incluye todo el inventario ajeno a ese seeder, independientemente del origen del alta.
- Conservar los 63 registros del seeder con origen `Prueba DBR-019` (IDs 101–163).

## Criterios de aceptación

- **CA-01:** Un operador autorizado puede previsualizar el lote, las referencias clínicas y de egresos y cualquier diferencia respecto al inventario aprobado antes de aplicar la baja.
- **CA-02:** Al aplicar el lote validado en `arca_pruebas`, los 14 IDs aprobados reciben una baja lógica. Las evaluaciones, egresos y demás datos relacionados permanecen intactos. Los únicos animales activos son los IDs 101–163.
- **CA-03:** Una conexión a otra base o un registro cuya identidad u origen ya no coincida con el lote esperado impide aplicar cambios. Repetir la operación sobre un lote ya dado de baja no modifica sus fechas de baja.

## Reglas de negocio y auditoría

- **RN-01:** La selección se fija por ID y se coteja con el nombre, identificador u origen previamente verificado. La baja del lote es transaccional.
- **RN-02:** Se registra quién autorizó y ejecutó la baja, cuándo, qué IDs se afectaron y cómo revertirla si se confirma un error de clasificación.

## Estado actual de los datos

El 25 de noviembre de 2026 una consulta de solo lectura confirmó 63 activos de DBR-019 y 14 activos fuera de esa carga, incluidos los cuatro del lote anterior.

La consulta de solo lectura del 24 de noviembre de 2026 mediante Laravel confirmó 76 animales activos, la columna `animals.deleted_at` y las referencias directas en `animal_departures` y `clinical_evaluations` consultadas en `information_schema.KEY_COLUMN_USAGE`. La carga de los IDs 101–163 coincide con la marca de origen del seeder DBR-019. `jona` tiene dos egresos y dos evaluaciones, y `diego_prueba2` tiene una evaluación. La baja propuesta usa el campo existente del modelo `Animal` con `SoftDeletes` y no requiere cambios de esquema ni DBR.
