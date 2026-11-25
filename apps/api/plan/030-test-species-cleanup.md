# Plan técnico · 030 · Baja de especies de prueba

- Spec: `apps/api/specs/030-test-species-cleanup.md`
- Aprobación técnica: el solicitante aprobó el plan en esta conversación.

## Operación

Agregar `species:cleanup-test` a Artisan, con previsualización por defecto y `--apply --operator` para ejecutar desde CMD. Una Action valida la conexión efectiva a `arca_pruebas` fuera de producción y verifica los pares ID y nombre 85/Gordo y 86/dfgh. Informa animales activos y archivados y referencias en solicitudes, colecciones y favoritos. Dentro de una transacción, bloquea las dos especies, vuelve a validar el lote y aplica `Species::delete()` si ninguna tiene animales activos. Las especies ya dadas de baja conservan su fecha. El resultado identifica operador, IDs y fechas para la bitácora y una posible restauración.

La API conserva el historial y usa las reglas vigentes de visibilidad. Se verifica que la sincronización incremental entregue la marca de baja de especies y que el cliente la retire de la copia local. El esquema vivo comprobado usa `species.deleted_at` de DBR-013. No se requiere DBR, migración ni dependencia.

## Pruebas y Constitución

- **CA-01:** PHPUnit verifica la previsualización y el rechazo de otra base, identidad incorrecta o animales activos.
- **CA-02:** PHPUnit verifica que ambas especies quedan fuera de las lecturas activas y que la sincronización comunica la baja.
- **CA-03:** PHPUnit verifica que las relaciones históricas permanecen y el segundo intento conserva las fechas.
- **I–VI:** Laravel y MySQL existentes; spec aprobada; lógica en una Action; test por criterio; SoftDeletes sin cambiar el esquema ni tocar los datos clínicos; identificadores en inglés y mensajes en español.
