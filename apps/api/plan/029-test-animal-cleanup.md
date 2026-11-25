# Plan técnico · 029 · Limpieza de animales de prueba

- Spec: `apps/api/specs/029-test-animal-cleanup.md`
- Estado de spec: Aprobada
- Aprobación técnica: el solicitante confirmó continuar con el plan el 24 de noviembre de 2026.

## Diseño y operación

Agregar un comando Artisan de uso puntual en la API. Por defecto previsualiza el resultado. Una opción explícita aplica el lote. El acceso se limita al operador autorizado con acceso al entorno de consola de la API. El comando comprueba el nombre efectivo de la base antes de consultar o escribir y solo admite `arca_pruebas`.

Una Action de la API valida los 14 IDs aprobados por nombre y número de marcaje, confirma que los 63 IDs de DBR-019 siguen activos con el origen esperado y detecta cualquier activo fuera de ambas listas. La previsualización incluye cantidades de evaluaciones y egresos y señala discrepancias. La aplicación repite la validación dentro de una transacción con bloqueo del inventario. Cualquier discrepancia cancela el lote. La Action llama al `delete()` de Eloquent solo en los registros activos aprobados.

Se conserva evidencia operativa de la autorización, el operador, los IDs modificados y la fecha de baja. En caso de error de clasificación, el operador autorizado puede restaurar con Eloquent los IDs incluidos en la evidencia, comprobando antes que la marca de baja siga siendo la de esta ejecución. La baja usa `animals.deleted_at`, ya comprobado en `arca_pruebas` y consumido por `Animal::SoftDeletes` y la sincronización del personal. Se mantienen los recintos, especies, fotos y referencias clínicas y de egresos. No se requieren cambios de esquema, DBR, ADR ni dependencias.

## Pruebas y verificación

- **CA-01** · PHPUnit en API cubre previsualización con conteos, discrepancias y ausencia de escrituras en ese modo.
- **CA-02** · PHPUnit en API cubre la baja exclusiva del lote y la conservación de registros ajenos y relaciones clínicas y de egresos.
- **CA-03** · PHPUnit en API cubre conexión ajena, discrepancia de identidad sin baja parcial y reintento idempotente.

Las pruebas de integración usan `DatabaseTransactions` en `arca_pruebas`. El solicitante revisa la previsualización en vivo, aplica una vez y verifica que los 14 registros quedaron dados de baja y que solo siguen activos los 63 del seeder.

## Constitution Check

- **I** · Laravel, Eloquent y MySQL 8.0.x existentes, con la conexión configurada por entorno.
- **II** · Lote y comportamiento limitados a la spec aprobada. El checklist se deriva de este plan tras su aprobación.
- **III** · La Action resuelve validación y persistencia. El comando presenta resultados.
- **IV** · Los tres criterios se cubren con PHPUnit.
- **V** · La API aplica SoftDeletes en MySQL y conserva íntegros los datos clínicos vinculados.
- **VI** · Identificadores de código en inglés y mensajes operativos en español.
