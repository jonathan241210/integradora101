# Plan técnico · 003 · staff-login

- Spec: `apps/pwa/specs/003-staff-login.md`
- Estado de spec: Aprobada
- Aprobación técnica: solicitante, 2026-11-04, en esta conversación.

## Diseño y cambios por área

La PWA consumirá el cliente HTTP y el módulo `auth` de `@arca/api-client` con URL relativa. En desarrollo, Vite reenviará `/api` y `/sanctum` a la API local, siguiendo el patrón del Dashboard. Para servir la PWA fuera de desarrollo, esas rutas se expondrán bajo su mismo origen mediante el servidor anfitrión. El origen local de ZooHealth debe figurar en la configuración de Sanctum de la API.

| Área | Cambio previsto |
|---|---|
| PWA / configuración | Declarar el paquete local existente y configurar el proxy Vite. |
| PWA / `src` | Sustituir el flujo de acceso que espera un token por un hook de sesión. La vista mantiene el formulario y muestra estados de carga y error. |
| API / datos | Reutilizar `api-003`, sus permisos y su auditoría. No se requiere DBR ni cambios al esquema. |
| Documentación | Documentar el origen local, el contrato y los pasos para probar la cuenta veterinaria en `arca_pruebas`. |

## Contrato, seguridad y errores

- Obtener CSRF por `/sanctum/csrf-cookie` y usar `POST /api/v1/auth/login` (`login.store`), `GET /api/v1/auth/me` (`auth.me`) y `POST /api/v1/auth/logout` (`logout`).
- Consultar el perfil al montar y después del login. Mostrar el módulo solo si la API devuelve `home: pwa`. Si el perfil tiene otro destino, cerrar la sesión iniciada por el formulario y explicar el rechazo. Al restaurar una sesión de otro módulo, rechazar el acceso a ZooHealth sin cerrar la sesión de ese módulo.
- Si el login requiere reto 2FA, mantener bloqueado el acceso a ZooHealth. La PWA no añade enrolamiento ni retos al flujo veterinario.
- Mantener la sesión mediante la cookie de Sanctum, sin credenciales ni tokens en almacenamiento del navegador. Distinguir credenciales rechazadas, sesión expirada y fallo de red. Ante un fallo de red durante el cierre de sesión, indicar que el cierre no se confirmó y permitir reintentar.
- Los servicios clínicos quedan fuera de este cambio. La PWA no simulará respuestas de la API ni habilitará operaciones clínicas. La sesión requiere conectividad. Se conserva la portabilidad Aiven/MySQL local de la API.

## Mapeo a pruebas

| Criterio | Verificación |
|---|---|
| CA-01 | Vitest en `apps/pwa/src/tests/staff-login.test.tsx`: login y restauración con perfil `pwa`. Prueba manual desde Vite con la cuenta veterinaria. |
| CA-02 | Misma suite: credenciales rechazadas y fallo de red con reintento. |
| CA-03 | Misma suite: perfil con otro destino, sesión expirada y cierre de sesión. |

## Constitution Check

| Principio | Cumple | Evidencia prevista |
|---|---|---|
| I. Stack mínimo y portable | Sí | Vite, Sanctum y paquete local existente. |
| II. La spec manda | Sí | Spec aprobada. Plan y checklist se validan antes de programar. |
| III. Lógica separada de la interfaz | Sí | El hook consume el cliente compartido y la API entrega destino y permisos. |
| IV. Un test por criterio | Sí | Casos CA-01 a CA-03 definidos arriba. |
| V. Una sola fuente de verdad | Sí | La API conserva sesión y datos. No se modifica el esquema. |
| VI. Código en inglés, personas en español | Sí | Identificadores en inglés y mensajes en español. |

## Orden y aprobación

Revisión técnica del plan, checklist con trazabilidad, configuración del cliente y del proxy, hook de sesión, verificación automatizada y recorrido manual. No se requiere un ADR nuevo.
