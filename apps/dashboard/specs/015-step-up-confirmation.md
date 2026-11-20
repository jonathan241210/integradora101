# 015 · step-up-confirmation

- App dueña: `dashboard` (presentación); la lógica de qué pide contraseña y cuándo vive en `api-021`
- Apps/paquetes afectados: `dashboard` (diálogo de contraseña, manejo de 403 y enrolamiento de cajeros), `packages/api-client` (llamada de confirmación y tipos de los códigos 403). El diálogo vive en `apps/dashboard/src` y no se publica en `packages/ui` (decisión 2026-11-20). Dependencias: `api-021` (dueña de la regla), `dashboard-002` (login, reto y enrolamiento 2FA), `dashboard-005` (venta, historial y precios), `dashboard-012` y `dashboard-013` (recintos y QR), `dashboard-017` (gestión de usuarios, que usa este diálogo). Sin cambios en `apps/pwa`, `apps/web` ni `apps/mobile`.
- Estado: Aprobada
- Solicitante / responsable funcional: Jonathan
- Aprobación funcional: Jonathan, 2026-11-20
- Fecha de redacción: 2026-11-20

## Problema y contexto

`api-021` añade dos reglas en el servidor: el `cashier` necesita 2FA confirmado para operar, y ciertas operaciones piden la contraseña de quien opera (modo «Siempre» o «Ventana» de 10 minutos). El dashboard tiene que mostrar el diálogo de contraseña, enviar la confirmación, reintentar la operación y avisar al cajero que aún no configuró su 2FA. Hoy no existe ningún diálogo de confirmación en el dashboard: las acciones de cancelar, cambiar precios y administrar recintos se ejecutan directamente.

El dashboard no decide qué operación pide contraseña. Reacciona al código `password_confirmation_required` que devuelve la API, cuyo cuerpo indica `mode`: `window` o `always`. Ocultar un botón no sustituye la autorización del servidor (regla del dashboard).

## Objetivos

- Que toda operación que la API marque con 403 `password_confirmation_required` abra un diálogo de contraseña, y que la operación se reintente solo tras una confirmación válida.
- Que el diálogo nunca guarde ni muestre la contraseña fuera de la petición.
- Que un cajero sin 2FA confirmado vea el aviso y el enrolamiento en lugar de la taquilla.
- Que el diálogo sea accesible por teclado y lector de pantalla.

## Fuera de alcance

- Decidir en el cliente qué operación pide contraseña (la decide `api-021`).
- Cualquier cálculo de ventana o de vigencia en el cliente: el cliente no lleva un temporizador como fuente de verdad; la API decide cuándo la ventana expiró. No se muestra temporizador visual (decisión 2026-11-20).
- Código 2FA dentro del diálogo: el diálogo pide solo la contraseña (decisión 2026-11-20).
- Confirmación para la venta, la cotización, la exportación, noticias, eventos, recuerdos, especies, PWA y lecturas (no piden confirmación; ver `api-021`).
- Cambios de roles con 2FA distintos de `cashier` (`api-021` y `api-023`).
- Gestión de usuarios desde el dashboard (`dashboard-017`): usa este diálogo; su diseño está en esa spec.
- Preferencias o almacenamiento local de la contraseña, «recordar contraseña» o desbloqueo por huella.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| `cashier` | Cancelar boletos del día con confirmación; configurar su 2FA antes de operar | Sesión válida; `tickets.cancel`, `tickets.view`, `tickets.create`; 2FA confirmado para operar |
| `admin` | Confirmar contraseña para cambiar precios, restablecer contraseña o 2FA de otra cuenta, cambiar rol, administrar cuentas y recintos, cambiar su propia contraseña | Sesión válida + 2FA confirmado; permisos de cada operación |
| `zoo-admin` | Confirmar contraseña para regenerar o eliminar un recinto | Sesión válida + 2FA confirmado; `enclosures.manage` |
| `veterinarian`, `executive` | No usan el diálogo ni el enrolamiento de cajeros | — |

El diálogo lo ven solo quienes reciben 403 `password_confirmation_required`. La API decide quién lo recibe.

## Historias de usuario

- Como `cashier`, quiero que el sistema me pida mi contraseña antes de cancelar un boleto para confirmar que soy yo quien opera la caja.
- Como `admin`, quiero confirmar mi contraseña cada vez que cambio un precio o restablezco la contraseña o el 2FA de otra cuenta, para que la acción quede protegida.
- Como `cashier` sin 2FA, quiero saber por qué no veo la taquilla y configurar mi segundo factor en el momento.
- Como persona que usa teclado o lector de pantalla, quiero que el diálogo se anuncie, reciba el foco y devuelva el foco al cerrarse.

## Historias de usuario de flujo

- Como usuario, cuando la API pide confirmación de una operación de Ventana, quiero escribir mi contraseña una vez y que la operación continúe sola, sin volver a pulsar el botón (reintento automático una vez; decisión 2026-11-20).
- Como usuario, cuando la API pide contraseña para una operación de Siempre, quiero escribirla en cada operación sin que se guarde.

## Criterios de aceptación

Las pruebas de cliente nombran cada CA-xx (Vitest). Los CA referencian respuestas de `api-021`.

- **CA-01:** Dada una operación que la API responde 403 `password_confirmation_required` con `mode: window`, cuando el usuario la dispara (p. ej. cancelar un boleto del historial), entonces se abre un diálogo modal con un campo de contraseña enfocado, la operación no se ejecuta todavía y no se muestra un error genérico.
- **CA-02:** Dado el diálogo de CA-01, cuando el usuario escribe su contraseña correcta, entonces el cliente llama `POST /api/v1/admin/password-confirmation` con `@arca/api-client`, cierra el diálogo al recibir 200 y reintenta la operación original una vez, automáticamente (decisión 2026-11-20).
- **CA-03:** Dado el diálogo, cuando la API responde 422 «La contraseña no es correcta.», entonces el mensaje aparece junto al campo con `role="alert"`, el campo se vacía, el diálogo sigue abierto y la operación no se reintenta.
- **CA-04:** Dado el diálogo, cuando la API responde 429 con segundos de espera, entonces se muestra el mensaje de la API en español, el botón de confirmar queda deshabilitado durante la espera y no se reintenta de forma automática.
- **CA-05:** Dada una confirmación exitosa, cuando el usuario ejecuta otra operación de Ventana dentro de los 10 minutos, entonces la operación se envía sin diálogo; cuando la API responde de nuevo 403 `password_confirmation_required` después de la ventana, entonces el diálogo vuelve a abrirse. El cliente no calcula la expiración: confía en la respuesta de la API (`api-021` CA-08).
- **CA-06:** Dada una operación con `mode: always`, cuando la API responde 403 `password_confirmation_required`, entonces se abre el diálogo, el cliente reenvía la misma operación con el campo `password` en el cuerpo y no llama a `password-confirmation`. Cada operación de Siempre pide la contraseña de nuevo, aunque exista una confirmación vigente (`api-021` RN-04).
- **CA-07:** Dada cualquier operación con el diálogo, cuando se completa o se cancela, entonces la contraseña no queda en `localStorage`, `sessionStorage`, cookies, la URL, el estado global ni en logs del cliente; el campo se vacía al cerrar el diálogo.
- **CA-08:** Dado el diálogo abierto, cuando el usuario pulsa «Cancelar» o la tecla Escape, entonces el diálogo se cierra, no se envía ninguna petición, la operación no se ejecuta y el foco vuelve al control que la disparó.
- **CA-09:** Dada una respuesta 403 `two_factor_setup_required` en cualquier pantalla de taquilla o administración, cuando el cliente la recibe, entonces muestra el enrolamiento 2FA de `dashboard-002` CA-05 y no muestra Venta ni Historial.
- **CA-10:** Dado un `cashier` sin 2FA confirmado (`GET /api/v1/auth/me` con `two_factor_setup_required: true`), cuando inicia sesión, entonces ve la pantalla «Configura tu segundo factor» con el aviso «Para vender boletos y consultar tu historial, configura tu segundo factor de autenticación. Necesitas una app autenticadora en tu celular.», el QR y la confirmación de `dashboard-002` CA-05, y no ve la sección Venta hasta completarlo. Este aviso reutiliza el flujo actual de configuración obligatoria (decisión 2026-11-20).
- **CA-11:** Dado un `cashier` con 2FA confirmado, cuando inicia sesión, entonces se le pide el reto TOTP o de recuperación (`dashboard-002` CA-04) y no ve el aviso de CA-10.
- **CA-12:** Dada una operación «No pide» de `api-021` (vender, cotizar, exportar reporte, generar el QR de un recinto por primera vez, noticias, eventos, recuerdos, especies, PWA) sin confirmación vigente, cuando la API responde 200 o 201, entonces el cliente no abre el diálogo.
- **CA-13:** Dado el diálogo, cuando se abre, entonces tiene `role="dialog"`, `aria-modal="true"`, un título con `aria-labelledby`, el foco queda atrapado dentro, el campo tiene `type="password"` y `autocomplete="current-password"`, los errores se anuncian con `aria-live` y el foco vuelve al disparador al cerrarse.
- **CA-14:** Dado un cierre de sesión (`dashboard-002`), cuando el usuario vuelve a iniciar sesión y dispara una operación de Ventana, entonces el cliente no conserva ninguna confirmación previa: si la API responde 403, se abre el diálogo.
- **CA-15:** Dados los textos del diálogo, del aviso de 2FA y de los errores, cuando se muestran, entonces están en español; los mensajes de la API se muestran tal cual llegan en español.
- **CA-16:** Dada la suite de Vitest del dashboard, cuando se ejecuta, entonces existe al menos un test que nombra cada CA-01 a CA-15 (CA-06 y CA-05 con respuestas simuladas de la API). Las pruebas no usan contraseñas reales.

## Reglas de negocio

- **RN-01:** El cliente no decide qué operación pide contraseña. Reacciona al 403 `password_confirmation_required` y usa `mode` del cuerpo (`api-021` RN-02).
- **RN-02:** La contraseña existe solo en el estado local del diálogo durante la petición (CA-07). No se guarda, no se registra y no se reutiliza entre operaciones.
- **RN-03:** El cliente no calcula la ventana de 10 minutos ni la usa como fuente de verdad (CA-05). No se muestra temporizador (decisión 2026-11-20): la regla no se duplica en el cliente.
- **RN-04:** Las llamadas al servidor pasan por hooks (ViewModel) y `@arca/api-client`. Los componentes (View) no usan `fetch` ni `axios`.
- **RN-05:** El aviso de 2FA de CA-10 reutiliza el enrolamiento de `dashboard-002` CA-05. Solo cambia el texto para cajeros y la pantalla de bloqueo de la taquilla.
- **RN-06:** No hay lógica de negocio en el cliente: el diálogo no valida la contraseña más allá de «no vacía» y no decide permisos (`AGENTS.md` del dashboard).
- **RN-07:** Se usan tokens semánticos y modo claro; no se fijan colores de marca en componentes (`/theme-colors`).
- **RN-08:** Los estados del diálogo (`idle`, `submitting`, `wrong-password`, `rate-limited`, `error`, `confirmed`) los gestiona el hook; la vista solo los presenta.
- **RN-09:** El diálogo vive en `apps/dashboard/src` (decisión 2026-11-20): solo lo usa el dashboard, así que no se publica en `packages/ui`.
- **RN-10:** El reintento automático ocurre una sola vez tras una confirmación exitosa (CA-02). Si la operación vuelve a responder 403, el diálogo se abre de nuevo y no hay más reintentos automáticos. No se reintenta una operación ya aceptada (riesgo de repetición).

## Datos, privacidad y auditoría

- El dashboard no guarda la contraseña (CA-07). El cliente envía la contraseña solo a `api-021` por la cookie de sesión y CSRF, igual que en el login (`dashboard-002`).
- El cliente no escribe en auditoría: la auditoría es de la API (`api-021` CA-28). Los eventos `password-confirmation.*` quedan en `activity_log` con la retención general y sin panel nuevo (`api-021` RN-15).
- No hay datos nuevos en el cliente ni en `localStorage`.
- No requiere DBR ni cambio de esquema.

## Flujos y errores

### Flujo 1: cancelar un boleto con ventana expirada

1. El cajero pulsa «Cancelar boleto» en Historial (`dashboard-005`).
2. La API responde 403 `password_confirmation_required` con `mode: window`.
3. Se abre el diálogo; el usuario escribe su contraseña.
4. `POST /api/v1/admin/password-confirmation` → 200; el diálogo se cierra y la cancelación se reintenta una vez, automáticamente.
5. El boleto queda cancelado (`api-009` CA-10).

### Flujo 2: cambiar un precio (Siempre)

1. El admin confirma el cambio en la sección Precios (`dashboard-005`).
2. La API responde 403 `password_confirmation_required` con `mode: always`.
3. Se abre el diálogo; el cliente reenvía el cambio con `password`.
4. Si la contraseña es correcta, la API responde 201 y la sección Precios muestra el nuevo precio.

### Flujo 3: contraseña incorrecta

1. El diálogo muestra «La contraseña no es correcta.» junto al campo; el campo se vacía (CA-03).
2. El usuario reintenta o cancela (CA-08).

### Flujo 4: cajero sin 2FA

1. Inicia sesión; `me` devuelve `two_factor_setup_required: true`.
2. El dashboard muestra la pantalla de enrolamiento con el aviso (CA-10).
3. Al confirmar su 2FA, entra a Venta e Historial.

### Errores

- 403 `password_confirmation_required`: abre el diálogo (CA-01, CA-06).
- 422 «La contraseña no es correcta.»: error en el diálogo (CA-03).
- 429: mensaje con segundos y botón deshabilitado (CA-04).
- 403 `two_factor_setup_required`: enrolamiento (CA-09).
- 401: sesión expirada; el dashboard vuelve al login (`dashboard-002`), sin diálogo.
- Error de red o 5xx: mensaje genérico de error del diálogo; la operación no se reintenta.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** `api-021` (regla y contrato), `dashboard-002` (login, reto y enrolamiento), `dashboard-005` (venta, historial y precios), `dashboard-012` y `dashboard-013` (recintos y QR), `dashboard-017` (gestión de usuarios), `packages/api-client`. Ningún ADR ni dependencia nueva.
- **Riesgos:**
  - Los cajeros sin 2FA quedan fuera de la taquilla hasta enrolarse (`api-021` RN-14). El aviso a taquilla se da fuera del sistema unos días antes del despliegue.
  - Si el reintento automático se hace sin cuidado, una operación podría repetirse; RN-10 lo limita a una vez y no reintenta operaciones ya aceptadas.
  - Pruebas de `dashboard-005` que simulan cajeros sin 2FA deberán actualizarse en el plan.
- **Decisiones 2026-11-20** (las preguntas de la versión Borrador quedan cerradas):
  1. **Reintento tras confirmar (CA-02).** Decisión 2026-11-20: la operación se reintenta sola una vez tras una confirmación correcta (RN-10).
  2. **Código 2FA en el diálogo.** Decisión 2026-11-20: no. El diálogo pide solo la contraseña (`api-021` decisión 2).
  3. **Texto y alcance del aviso para cajeros (CA-10).** Decisión 2026-11-20: el aviso reutiliza el flujo actual de configuración obligatoria (RN-05). El cajero se avisa fuera del sistema unos días antes del despliegue; desde el despliegue el 2FA es obligatorio, sin fecha de corte en código (`api-021` RN-14). El texto de CA-10 se mantiene tal como está en esta spec.
  4. **Temporizador visual.** Decisión 2026-11-20: no se muestra (RN-03).
  5. **Diálogo compartido.** Decisión 2026-11-20: queda en `apps/dashboard/src` (RN-09).

## Revisión

- Aprobadores y fecha: Jonathan (responsable funcional), 2026-11-20.
- Evidencia/enlaces: `apps/api/specs/021-staff-step-up-confirmation.md`, `apps/dashboard/specs/002-real-staff-login.md`, `apps/dashboard/specs/005-ticket-sales.md`, `apps/dashboard/AGENTS.md`, `docs/templates/spec.md`.

## Decisiones finales 2026-11-20 (Jonathan)
- **Excepción a `dashboard-004` RN-01 (sin modales en Usuarios).** El diálogo de confirmación de contraseña es la única excepción permitida: se muestra como diálogo modal accesible también en Usuarios. Las demás interacciones de Usuarios siguen sin modales.
