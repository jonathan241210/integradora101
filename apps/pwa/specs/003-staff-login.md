# 003 · staff-login

- App dueña: `pwa`, consumidora de la autenticación vigente de `api-003`.
- Apps/paquetes afectados: `pwa`, `@arca/api-client`.
- Estado: Implementada
- Solicitada: 2026-11-04
- Aprobada: 2026-11-04
- Responsable funcional para este alcance: solicitante de esta conversación.
- Aprobación funcional: Aprobada (solicitante).

## Problema y objetivos

ZooHealth muestra un formulario que solicita `/api/v1/staff/auth/login`, una ruta ausente en la API. El personal veterinario necesita usar su cuenta institucional en la PWA y recibir mensajes que distingan un fallo de conexión de un rechazo de credenciales. Esta spec sustituye el acceso de demostración de `pwa-001` cuando se apruebe e implemente.

## Fuera de alcance

- Nuevas rutas de autenticación, altas de cuentas, recuperación de contraseñas y cambios de permisos.
- Activar operaciones clínicas, sincronización offline o cambios de esquema. Las operaciones clínicas requieren su propia especificación.

## Actores e historia de usuario

Como integrante del personal veterinario con cuenta activa, quiero iniciar y cerrar sesión con mi cuenta institucional para acceder al módulo veterinario desde un dispositivo de trabajo.

## Criterios de aceptación

- **CA-01:** Con una cuenta veterinaria activa en `arca_pruebas`, iniciar sesión desde ZooHealth permite consultar el perfil y abrir el módulo. Recargar la página conserva una sesión vigente.
- **CA-02:** Ante credenciales inválidas o una cuenta inactiva, se muestra el mensaje de autenticación en español. Cuando la API no responde, se muestra un mensaje de conexión y se permite reintentar.
- **CA-03:** Una cuenta cuyo perfil no tenga destino `pwa` queda fuera del módulo. Al cerrar sesión o vencer la sesión, la interfaz vuelve al formulario.

## Reglas de negocio, datos y privacidad

- **RN-01:** La API conserva la autoridad sobre la identidad, sesión, destino y permisos. La PWA usa el contrato existente de `api-003` mediante `@arca/api-client`.
- **RN-02:** El acceso usa la sesión de Sanctum con protección CSRF. La PWA no conserva contraseñas ni tokens de acceso en el almacenamiento del navegador.
- **RN-03:** La API conserva su auditoría de acceso. El inicio de sesión no crea datos clínicos ni requiere DBR.

## Dependencias, riesgos y revisión

- Depende de `api-003`, de la configuración local de orígenes de Sanctum y de una cuenta veterinaria activa en `arca_pruebas`.
- Las pantallas clínicas actuales llaman a otras rutas ausentes bajo `/api/v1/staff/`. Aprobar el inicio de sesión no habilita esas operaciones.
- Evidencia de aprobación: «apruebo», registrada en la conversación con el solicitante.

## Revisión (aprobada): contador de bloqueo

Cuando la API bloquea el login por intentos (429 con `Retry-After`, disponible como `retryAfterSeconds` en el `ApiError` de `@arca/api-client`), la PWA muestra una cuenta regresiva en lugar de los segundos sueltos de la API. Réplica local de `dashboard-015` CA-21 a CA-25. No renumera CA existentes. El reto 2FA no existe en la PWA (CA-03 lo rechaza), por lo que no aplica.

- **CA-04:** Dado un 429 con `retryAfterSeconds` en el login, entonces se muestra «Demasiados intentos. Podrás intentarlo de nuevo en 9:47» con formato `m:ss` (600 s es «10:00», 42 s es «0:42») y no los segundos de la API.
- **CA-05:** El contador baja cada segundo sin recargar, se calcula contra un instante final (`Date.now() + s*1000`) y el intervalo se limpia al desmontar.
- **CA-06:** Mientras corre, el botón «Iniciar sesión» queda deshabilitado; al llegar a 0 aparece «Ya puedes intentarlo de nuevo.» y el botón se habilita.
- **CA-07:** Un 429 sin `retryAfterSeconds` válido muestra el mensaje de la API tal cual, sin contador.
- **CA-08:** Los dígitos van en `aria-live="off"`; solo se anuncian el aviso inicial y el de fin desde una región `role="status"`.

Evidencia de aprobación: registrada en la conversación con el responsable funcional.

## Nota de revisión (dashboard-020 rev. (d))

- **CA-09:** Dado el contador de bloqueo de CA-04 a CA-08, cuando se revisa el código, entonces `formatCountdown`, `startCountdown`, `useCountdown` y `LockoutNotice` salen de `@arca/ui` (ya no hay réplica local); el comportamiento visible no cambia. Anula la restricción «no se mueve a `packages/`» del plan.
