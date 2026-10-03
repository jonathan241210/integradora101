# Roles y permisos

Los nombres de roles, permisos, recursos y acciones son identificadores en inglés. Los textos visibles y sus descripciones son en español. La autorización se aplica en la API con Policies y Spatie Permission; ocultar una opción en la interfaz no protege un endpoint.

## Roles

- `admin` — Administrador General (Dirección de Informática); administración del sistema y acceso operativo autorizado.
- `executive` — Altos Directivos; métricas y reportes de solo lectura.
- `cashier` — Cajero; operación de taquilla y cierre de caja.
- `veterinarian` — Médico Veterinario; expedientes y datos clínicos de ejemplares.
- **Visitante anónimo** — consulta de contenido institucional y pedagógico público; no requiere una cuenta interna ni un rol asignado.

## Convención

Cada permiso usa `<resource>.<action>` en inglés, por ejemplo `tickets.create` o `medical-records.view`. Debe ser específico, asignarse según mínimo privilegio y comprobarse en el servidor. Acciones habituales: `view`, `create`, `update`, `delete`, `manage`; `manage` se reserva para administración completa del recurso. Datos financieros y clínicos no se eliminan físicamente: cualquier baja usa SoftDeletes y conserva auditoría.

## Matriz inicial

✓ indica permiso inicial; — indica que no se otorga por defecto. El rol `admin` puede administrar las capacidades privadas aquí enumeradas. La matriz deberá ampliarse mediante una spec aprobada al introducir nuevos recursos.

| Permiso | Etiqueta en español | `admin` | `executive` | `cashier` | `veterinarian` | Anónimo |
|---|---|:---:|:---:|:---:|:---:|:---:|
| `dashboard.view` | Ver panel ejecutivo | ✓ | ✓ | — | — | — |
| `reports.view` | Ver reportes ejecutivos | ✓ | ✓ | — | — | — |
| `tickets.view` | Consultar boletos | ✓ | — | ✓ | — | — |
| `tickets.create` | Registrar venta de boletos | ✓ | — | ✓ | — | — |
| `cash-closings.view` | Consultar cierres de caja | ✓ | — | ✓ | — | — |
| `cash-closings.create` | Crear cierre/arqueo de caja | ✓ | — | ✓ | — | — |
| `medical-records.view` | Consultar expedientes clínicos | ✓ | — | — | ✓ | — |
| `medical-records.create` | Crear expediente clínico | ✓ | — | — | ✓ | — |
| `medical-records.update` | Actualizar expediente clínico | ✓ | — | — | ✓ | — |
| `specimens.view` | Consultar ejemplares | ✓ | — | — | ✓ | — |
| `specimens.update` | Actualizar datos del ejemplar | ✓ | — | — | ✓ | — |
| `users.manage` | Administrar usuarios y permisos | ✓ | — | — | — | — |
| `public-content.view` | Consultar contenido público | ✓ | ✓ | ✓ | ✓ | Público |

La lista no sustituye Policies por registro ni restricciones de datos sensibles. El acceso de visitantes se limita a contenido marcado explícitamente como público; no se le asigna `public-content.view` como permiso de cuenta.
