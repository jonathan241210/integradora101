# 006 · system-settings-section

- App dueña: `dashboard`
- Apps/paquetes afectados: `dashboard`, `packages/api-client` (cliente de ajustes); `api` (dependencia: `apps/api/specs/010-configurable-system-settings.md`, Borrador).
- Estado: Borrador. **Solo documentada: no aprobada, no planificada, sin plan ni tasks.**
- Solicitante / responsable funcional: Jonathan
- Aprobación funcional: pendiente (no aprobada)

> **Cómo aplicar esta spec (qué falta).** Aprobar esta spec y `apps/api/specs/010-configurable-system-settings.md`; aprobar DBR-009; que el responsable de BD aplique la migración; crear plan (`/sdd-plan`) y tasks (`/sdd-tasks`). No se ha dado ninguno de esos pasos.

## Problema y contexto

Hoy el tope de boletos por venta solo cambia con un despliegue. La spec de API `010` describe la opción de que `admin` lo cambie sin desplegar. Esta spec describe la sección de la interfaz que lo haría posible. No se implementa.

## Objetivos

- Mostrar la sección «Ajustes» solo a quien tiene `system-settings.manage`.
- Mostrar el valor vigente del máximo de boletos por venta y su origen.
- Permitir cambiarlo con confirmación, errores por campo y mensajes de la API.

## Fuera de alcance

- Cualquier ajuste distinto de `ticket_sale_max_tickets`.
- Cálculo de rangos o reglas en la interfaz: el rango lo valida la API.
- Cambios en `apps/web`, `apps/pwa` y `apps/mobile`.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos (API) |
|---|---|---|
| `admin` | Leer y cambiar el máximo de boletos por venta | `system-settings.manage`, 2FA confirmado |
| Resto de roles | Sin sección «Ajustes» | — |

## Historias de usuario

- Como `admin`, quiero ver el máximo de boletos por venta y cambiarlo desde «Ajustes», con confirmación.
- Como `admin`, quiero que un mensaje claro me diga si me falta el segundo factor.

## Criterios de aceptación

- **CA-01 (propuesta):** Dada una sesión con `system-settings.manage`, cuando se presenta la navegación, entonces aparece «Ajustes». Sin el permiso, no aparece (la autorización real la aplica la API).
- **CA-02 (propuesta):** Dada la sección «Ajustes», cuando carga, entonces muestra el valor vigente de `ticket_sale_max_tickets` y su origen (guardado o de configuración), tal como lo devuelve la API.
- **CA-03 (propuesta):** Dado el formulario, cuando el `admin` escribe un valor, entonces el control es numérico y accesible con teclado. Los errores 422 se muestran junto al campo con el mensaje de la API. La interfaz no fija el rango en su código.
- **CA-04 (propuesta):** Dado un cambio pendiente, cuando el `admin` pulsa «Guardar», entonces se abre un diálogo de confirmación que nombra el valor anterior y el nuevo. Solo al confirmar se llama a la API. Escape cierra sin llamar.
- **CA-05 (propuesta):** Dada una respuesta 403, cuando llega, entonces la sección muestra el mensaje de la API. Con `two_factor_setup_required`, muestra el mensaje para configurar el segundo factor, con el mismo flujo de `dashboard-002` CA-05.
- **CA-06 (propuesta):** Dado un cambio guardado (200), cuando llega la respuesta, entonces la sección muestra el valor nuevo y confirma con un aviso accesible de la propia sección.
- **CA-07 (propuesta):** Dado un 401 en la sección, cuando lo detecta el estado de sesión, entonces el dashboard vuelve al login con «Tu sesión expiró» (`dashboard-002` CA-08).
- **CA-08 (propuesta):** Dadas las vistas, cuando se revisa el código, entonces ningún componente de `views/` o `components/` usa `fetch`/`axios`, calcula rangos ni permisos, y las llamadas pasan por `@arca/api-client` desde un hook ViewModel (Constitución III).
- **CA-09 (propuesta):** Dada la sección, cuando se usa con teclado y en anchos de 360 a 1366 px, entonces conserva foco visible, diálogo con foco atrapado y cierre con Escape, sin desbordamiento horizontal.
- **CA-10 (propuesta):** Dada la suite de Vitest con cliente simulado, cuando se ejecuta, entonces existe al menos una prueba que nombra cada CA de esta spec.

## Reglas de negocio

- **RN-01 (propuesta):** El mapa permiso → sección es solo presentación. Ocultar «Ajustes» no protege la API.
- **RN-02 (propuesta):** Valor, rango, validación y origen vienen de la API (`apps/api/specs/010`, RN-02 y RN-03). El cliente no reimplementa ninguna regla.
- **RN-03 (propuesta):** Cambiar el ajuste siempre pide confirmación explícita antes de llamar a la API (mismo criterio que `dashboard-003` RN-03).
- **RN-04 (propuesta):** Mensajes y etiquetas en español; identificadores en inglés (Constitución VI).

## Datos, privacidad y auditoría

La sección no almacena nada fuera de la memoria de la página. La auditoría la escribe la API (`apps/api/specs/010` CA-05).

## Flujos y errores

1. `admin` abre «Ajustes» → la sección carga el valor (CA-02).
2. Escribe un valor → «Guardar» → diálogo de confirmación (CA-04) → la API responde.
3. 200 → refresca y confirma (CA-06). 422 → error por campo (CA-03). 403 → mensaje de la API o de 2FA (CA-05). 401 → login (CA-07).

## Dependencias, riesgos y preguntas

- **Dependencias:** `apps/api/specs/010-configurable-system-settings.md` (Borrador); `dashboard-002` (login, 401, 2FA); `dashboard-003` (patrones de administración); DBR-009.
- **Riesgos:** la sección solo tiene sentido después de que la API exista y de que `admin` tenga el permiso en el ambiente (resembrado; `apps/api/specs/010` riesgos).
- **Preguntas abiertas:** (1) ¿el diálogo muestra también el origen anterior (guardado o de configuración)? (2) ¿el texto de confirmación se redacta con el rango de `apps/api/specs/010` RN-03, si se aprueba?

## Revisión

- Aprobadores y fecha: pendiente. No aprobada.
- Evidencia/enlaces: `apps/api/specs/010-configurable-system-settings.md`, `docs/database/requests/DBR-009-system-settings.md`.
