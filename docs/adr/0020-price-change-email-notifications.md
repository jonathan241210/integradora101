# 0020 · Notificaciones por correo electrónico de cambios de precio

- Estado: Propuesto — diferido (2026-11-02)
- Fecha: 2026-11-02
- Spec relacionada: `apps/api/specs/009-ticket-sales.md` (RN-10, RN-20 a RN-28, CA-35 a CA-41, preguntas 11 a 17); `apps/dashboard/specs/005-ticket-sales.md` (CA-30, RN-14). Precedente: `apps/api/specs/004-visitor-authentication.md` (RN-09 y CA-20, SMTP nativo por `.env`). DBR-006 (`docs/database/requests/DBR-006-ticket-sales.md`): sin cambio de esquema, según nota de 2026-11-02.

> Estado **Propuesto — diferido (2026-11-02)**: este documento no aprueba proveedor SMTP, credenciales, remitente ni dependencias, y no autoriza implementar CA-35 a CA-41 de `api-009`. La decisión la toma el equipo (Constitución I) junto con la aprobación de la spec 009.

## Diferimiento (2026-11-02)

Jonathan decidió diferir los avisos de cambio de precio (dashboard y correo) a una iteración posterior. Este ADR no cambia de contenido: sigue siendo una propuesta que no autoriza proveedor SMTP, remitente, cola, dependencias ni implementación. Mientras esté diferido, no se abren tareas para `api-009` CA-35 a CA-41.

El índice de ADR no tiene un estado «Diferido»; se usa **Propuesto** con esta marca, que es el estado más cercano. Si el equipo decide descartar la alternativa A, el cierre se registra como un nuevo ADR o como cambio de estado en el índice; este documento no se borra.

## Contexto

- `api-009` RN-19 y `dashboard-005` CA-26 entregan los avisos de cambio de precio dentro del dashboard, por consulta al entrar y cada 60 s. El personal que no tiene el dashboard abierto no se entera del cambio hasta que entra.
- El 2026-11-02, Jonathan decidió que los avisos también se entreguen por correo electrónico. Esto sustituye la regla anterior de `api-009` RN-10 («solo dentro del dashboard»).
- La propuesta del responsable de BD en DBR-006 («Propuesta técnica para backend») recomienda el sistema de notificaciones de Laravel con canal `mail` encolado, sin cambios de esquema.
- Restricciones:
  - Constitución I: stack declarado, nada propietario de la nube en el código, toda dependencia nueva con ADR aprobado; la conexión y los secretos se configuran por `.env` y deben ser portables entre Aiven (ADR 0013) y MySQL local.
  - Constitución VI: mensajes y correos en español.
  - Un envío síncrono bloquearía la petición de cambio de precio y la venta ante la latencia o la caída de un servidor SMTP.
- Estado verificado en el repositorio (2026-11-02): `apps/api/src/config/mail.php` y `config/queue.php` leen `MAIL_MAILER` y `QUEUE_CONNECTION` de `.env`; `.env.example` fija `QUEUE_CONNECTION=database` y `MAIL_MAILER=log`; la migración base `0001_01_01_000002_create_jobs_table.php` crea `jobs`, `job_batches` y `failed_jobs`; `phpunit.xml` fija `MAIL_MAILER=array` y `QUEUE_CONNECTION=sync`. La spec 004 (Implementada) ya usa SMTP nativo por `.env`, sin SDK.
- Corrección a la propuesta de BD: su mención a `['database', 'mail']` no debe aplicarse tal cual, porque el canal `database` de Laravel Notifications crea una tabla `notifications` que DBR-006 no solicita. Además, la propuesta asume una columna de correo verificado en `users` que las migraciones actuales no tienen (ver `api-009` pregunta 15).

## Decisión (propuesta)

1. **Mailer nativo de Laravel:** los correos se envían con un Mailable o con una Notification que use solo el canal `mail`. No se instala ningún paquete ni SDK de proveedor.
2. **Cola de base de datos:** los envíos se encolan con `QUEUE_CONNECTION` (en esta fase, `database`, con la tabla `jobs` existente). Ningún envío ocurre dentro de la petición de cambio de precio, de venta o de consulta de avisos.
3. **SMTP configurable por `.env`:** `MAIL_MAILER`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` y `MAIL_FROM_ADDRESS` / `MAIL_FROM_NAME`. El proveedor SMTP queda por decidir (ver «Qué requiere aprobación»). Se usa el protocolo SMTP estándar, no una API propietaria, para mantener la portabilidad.
4. **Local y pruebas:** en desarrollo, `MAIL_MAILER=log`. En pruebas, `array` con `Mail::fake()` y `Queue::fake()`; ningún test envía correo real.
5. **Sin cambio de esquema:** se usan `users.email`, `jobs` y `failed_jobs`. No se usa el canal `database` de Laravel Notifications. El aviso en base de datos sigue siendo `staff_notifications`.
6. **Versiones:** esta propuesta no fija ni afirma versiones de paquetes nuevos, porque no añade ninguno. La versión de Laravel ya instalada debe verificarse en `apps/api/src/composer.lock` antes de implementar (por verificar).
7. **Reintentos:** un envío fallido se reintenta de forma acotada (supuesto por defecto en `api-009` RN-24, por confirmar). El fallo no revierte el cambio ni el aviso del dashboard.

## Alternativas consideradas

| Alternativa | A favor | En contra |
|---|---|---|
| **A. Mailer nativo + cola de base de datos + SMTP por `.env` (propuesta)** | Sin dependencia nueva; portable entre Aiven y local; configuración solo por `.env`; ya la usa la spec 004; no bloquea la petición | Requiere un proceso de cola en cada ambiente; el proveedor SMTP y el dominio remitente aún no están definidos |
| B. Servicio de correo propietario con SDK (API HTTP de un proveedor transaccional) | Entregabilidad y estadísticas administradas; no hay que operar una cola de correo | Dependencia propietaria con SDK y credenciales de proveedor: contraria al espíritu de la Constitución I sin ADR específico; más acoplamiento; no se comporta igual en local |
| C. Sin correo (solo dashboard) | Cero dependencias y cero riesgo operativo | No cumple la decisión del 2026-11-02; el personal que no tiene el dashboard abierto no se entera |
| D. Envío síncrono dentro de la petición | Sin cola ni worker | Un SMTP lento o caído bloquea el cambio de precio y el aviso; contrario a `api-009` CA-35 |
| E. Canal `database` de Laravel Notifications | Reutiliza la API de notificaciones de Laravel | Crea la tabla `notifications`, que está fuera de DBR-006, y duplica `staff_notifications` |
| F. Cola en Redis u otro broker | Mayor capacidad de cola | Infraestructura nueva que requiere ADR propio; el volumen de avisos de precio no lo justifica en esta fase |

## Consecuencias

### Positivas

- Ninguna dependencia nueva en Composer y ningún cambio de esquema; DBR-006 no se modifica en su contenido.
- La venta y el cambio de precio no dependen de la disponibilidad del correo.
- La misma configuración funciona en local, en pruebas y en cada ambiente; los secretos viven solo en `.env`.
- Los fallos quedan registrados en `failed_jobs` sin bloquear el dashboard.

### Riesgos o costos

- **Worker obligatorio:** sin un proceso de cola activo no sale ningún correo. Hay que definir su supervisión por ambiente (infraestructura `infra/`, planeada).
- **Entrega no garantizada:** el SMTP acepta el mensaje, pero no confirma la lectura. La entregabilidad depende del proveedor y de la configuración DNS del dominio remitente, que están fuera de la aplicación.
- **Cajeros con retraso en cambios programados:** el correo del cajero se encola en la primera consulta de avisos posterior a `effective_at` (`api-009` pregunta 14). La exactitud a la hora exacta requiere un programador, que cambiaría RN-03 y necesitaría decisión propia.
- **Datos en `failed_jobs`:** el payload serializado de un job incluye el correo del destinatario. Hay que definir su retención (`api-009` pregunta 12).
- **Cola compartida:** la tabla `jobs` la comparten todos los jobs de la aplicación. El volumen de avisos de precio es bajo, pero debe vigilarse.
- **Premisas de la propuesta de BD:** el correo verificado en `users` y el canal `database` no se sostienen tal cual (ver Contexto). Debe confirmarlo el responsable de BD.

## Qué requiere aprobación

Nada de lo siguiente queda decidido en este ADR; cada punto necesita aprobación explícita:

1. Proveedor SMTP y sus credenciales, por ambiente, solo en `.env`. Responsable: por identificar (equipo e infraestructura). Ninguna credencial entra al repositorio.
2. Dirección y nombre del remitente institucional (`MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`).
3. Forma de operar la cola (proceso supervisado) en cada ambiente.
4. Número de reintentos (propuesta: 3) y plazo de retención de `failed_jobs`.
5. Confirmación del responsable de BD de que `jobs` y `failed_jobs` pertenecen a la línea base y de que no hay cambio de esquema (nota en DBR-006).
6. Aprobación de este ADR por el equipo, junto con la spec 009 en estado Aprobada.

## Validación y revisión

- Estado actual: **Propuesto**. No hay aprobación del equipo; no se ha configurado ningún proveedor ni instalado ninguna dependencia.
- Revisión pendiente: backend (Jonathan), responsable de BD (Víctor Adrián, propuesto) y equipo para el proveedor SMTP.
- Al aprobar: registrar el proveedor elegido sin secretos, verificar la versión de Laravel instalada (por verificar), cambiar el estado a Aceptado y abrir las tareas de configuración y de pruebas de CA-35 a CA-41 en `apps/api/tasks/` cuando la spec 009 esté Aprobada.
- Si el equipo rechaza la alternativa A, las opciones que quedan son C (sin correo) o B, que exige un ADR propio y reabrir `api-009` RN-23.
