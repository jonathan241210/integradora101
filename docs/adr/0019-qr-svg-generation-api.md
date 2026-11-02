# 0019 · Generación del QR del boleto en SVG desde la API

- Estado: Propuesto
- Fecha: 2026-11-01
- Spec relacionada: `apps/api/specs/009-ticket-sales.md` (CA-09, RN-07, pregunta 4). Dependencia a considerar en `docs/database/requests/DBR-006-ticket-sales.md`; este ADR no cambia el esquema.

> Estado **Propuesto**: este documento no aprueba ninguna dependencia ni autoriza implementar CA-09 de `api-009`. La decisión la toma el equipo (Constitución I), junto con la revisión de DBR-006 por el responsable de BD y backend.

## Contexto

`api-009` (ventas de boletos) exige que, al registrar una venta, la respuesta incluya `qr_svg`: un documento SVG válido generado por la API a partir del token `tickets.qr_code` (CA-09, RN-07). El SVG no se almacena en la base de datos ni en disco.

Tres restricciones condicionan la decisión:

- **Constitución I:** el stack está declarado (Laravel 12, PHP 8.4+ por ADR 0018, MySQL 8.0.x). Toda dependencia nueva requiere un ADR aprobado y debe ser portable entre Aiven (ADR 0013) y MySQL local.
- **`dashboard-005` RN-07:** el dashboard no añade dependencias para el QR; el SVG llega ya renderizado desde la API. Renderizar en el cliente exigiría un ADR propio.
- **`api-009` pregunta 4:** no se escribe un codificador QR propio. Sin ADR aprobado, CA-09 no se implementa.

El token es aleatorio y único por boleto (RN-07, DBR-006); su formato no depende de la librería elegida.

## Decisión (propuesta)

1. La API genera el QR en formato SVG con **una sola librería PHP**, que se elige entre las candidatas de la sección siguiente. La generación vive en una Action (Constitución III), no en el controlador.
2. El SVG se devuelve en la respuesta de la venta (`201`) y **no se persiste**. Solo se guarda `tickets.qr_code`, como indica DBR-006.
3. No se usan servicios externos de generación de QR. Enviar el token a un tercero expondría un dato del boleto fuera de la infraestructura del zoológico y rompería la portabilidad (Constitución I).
4. Antes de aprobar la librería, el equipo debe verificar, para la versión que se fije:
   - Que la versión publicada tenga más de 7 días, criterio ya usado en ADR 0017.
   - Que el rango de `php` admita PHP 8.4 y que sea compatible con Laravel 12.
   - Que la salida SVG no requiera extensiones de imagen (p. ej. `gd`) ni binarios externos.
   - Licencia, dependencias transitivas y resultado de `composer audit`.
5. La versión exacta se registra al aprobar el ADR, como en la enmienda de ADR 0017.

## Alternativas consideradas

### Candidatas PHP para el SVG

| Candidata | A favor (según lo que el redactor conoce; por verificar) | En contra o pendiente |
|---|---|---|
| **A. `endroid/qr-code`** | Paquete de generación de QR con escritor SVG y API orientada a objetos. Por verificar: que sea de uso habitual en proyectos Laravel. | Por verificar: versión vigente, rango de PHP, dependencias transitivas, licencia y que el escritor SVG no requiera `gd`. |
| **B. `bacon/bacon-qr-code`** | Paquete de generación de QR con backend de imagen SVG. Por verificar: que su backend SVG no requiera extensiones de imagen. | Por verificar: versión vigente, rango de PHP, dependencias transitivas, licencia y mantenimiento reciente. Por verificar: si su API de renderizado es más verbosa que la de A. |

Criterio para elegir (en este orden): compatibilidad verificada con PHP 8.4 y Laravel 12; salida SVG sin extensiones adicionales; menor número de dependencias transitivas; licencia permisiva; mantenimiento reciente; `composer audit` limpio. El redactor no recomienda una candidata sin haber verificado estos puntos.

### Otras alternativas

| Alternativa | Motivo de descarte |
|---|---|
| QR renderizado en el cliente (dashboard o PWA con librería JavaScript) | Añade una dependencia de cliente que exige ADR propio (`dashboard-005` RN-07) y la impresión dependería del navegador. El token ya viaja al cliente, pero la generación queda fuera del servidor. Se puede retomar si el equipo lo prefiere. |
| Sin librería: codificador QR propio | Riesgo alto de errores de codificación y de mantenimiento; contrario a `api-009` pregunta 4. |
| Servicio externo de QR por URL | Envía el token del boleto a un tercero; rompe la privacidad y la portabilidad (Constitución I). Se rechaza. |

## Consecuencias

### Positivas
- Una sola dependencia PHP, sin cambios en el cliente ni en la base de datos.
- El SVG sale de la API en la misma respuesta que el boleto, sin archivos intermedios.
- No hay servicios propietarios ni configuración fuera de `.env`.

### Riesgos o costos
- Una dependencia nueva que mantener y auditar (`composer audit`). El `composer.json` y `composer.lock` de la API cambian; esa tarea es de backend y solo inicia con la spec aprobada.
- El SVG depende de la versión de la librería. Como no se persiste, un cambio de versión solo altera imágenes futuras; las pruebas de CA-09 verifican estructura, no bytes.
- El token queda legible dentro del SVG por diseño: quien tenga la imagen puede leer el `qr_code`. La validación en el torniquete (fuera de alcance de `api-009`) deberá tratarlo como dato sensible.
- Si la librería no soporta SVG con PHP 8.4 y Laravel 12 en la versión vigente, este ADR debe volver a revisión; no se sustituye por un codificador propio.

## Validación y revisión

- Estado actual: **Propuesto**. No hay aprobación del equipo. No se ha instalado ninguna librería ni se ha verificado ninguna versión en este documento.
- Aprobación pendiente: equipo (Constitución I), con revisión de backend (Jonathan) y del responsable de BD (Víctor Adrián, propuesto) junto con DBR-006.
- Al aprobar: fijar la librería y su versión, registrarlas en este ADR, cambiar el estado a Aceptado, y abrir la tarea de instalación y de pruebas de CA-09 en `apps/api/tasks/` cuando `api-009` pase a Aprobada.
- Si el equipo rechaza ambas candidatas, `api-009` CA-09 queda bloqueado y debe reabrirse la pregunta 4 de la spec.
