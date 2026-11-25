# Plan técnico · 013 · Permiso de visitas

- [Spec aprobada](../specs/013-animal-stay-and-visits.md)
- Ejecución autorizada por el solicitante con verificación local pendiente.

La PWA incorpora un selector obligatorio. El valor viaja en JSON, multipart o en la operación offline existente, según el flujo. El borrador conserva la selección sin cambiar los índices de IndexedDB.

Las rutas nombradas `animals.store` y `sync.operations` comparten la validación del campo opcional de visitas. Aceptan 0 o 1, incluida su representación multipart. Para clientes y borradores antiguos, una omisión deja que MySQL aplique su valor vigente de visitas. La API asigna cuarentena de ingreso en ambas rutas. Se conservan autenticación, permisos y manejo de errores de cada ruta.

Se reutilizan columnas de DBR-001. La inspección local está bloqueada por SQLSTATE 2002. La verificación integrada queda pendiente de que MySQL esté disponible.

## Constitution Check

- **I.** Stack y configuración MySQL existentes.
- **II.** Spec aprobada y tareas trazadas por criterio.
- **III.** La API valida y persiste. La PWA presenta y transporta valores.
- **IV.** Vitest cubre CA-01. PHPUnit cubre CA-02 a CA-05 y la PWA prueba el envío offline.
- **V.** MySQL conserva la autoridad y se reutiliza la persistencia de animales.
- **VI.** Identificadores en inglés y textos de usuario en español.
