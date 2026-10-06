# 0009 · Pagos electrónicos futuros

- Estado: Propuesto
- Fecha: 2026-10-06
- Spec relacionada: Futura; no existe autorización de implementación

## Contexto

V1 venderá boletos **solo en efectivo**. Se contempla a futuro pago online desde `apps/web` y tarjeta en taquilla desde `apps/dashboard`, pero no se ha seleccionado proveedor o banco.

## Decisión propuesta

Reservar Payments como dominio **FUTURO/INACTIVO**. Hoy no hay código, tablas, endpoints, SDK ni feature flag de pagos, ni se crearán ahora. Este ADR define dirección futura, no autoriza implementación ni hace activable la capacidad.

Una spec futura, después de seleccionar proveedor, introducirá una interfaz `PaymentGateway` y Adapter por proveedor. Esa implementación deberá crear una feature flag apagada por defecto. Solo podrá activarse después de validar sandbox, credenciales y proveedor, seguridad, webhooks verificados, idempotencia, conciliación y aprobación operativa.

Ticketing solicitará el pago sin acoplarse al proveedor y solo emitirá o activará el boleto tras `payment confirmed` válido. Payments gestionará intentos, estados, referencias, webhooks, reembolsos y conciliación. Se preferirá checkout alojado o tokenización; ARCA-NB nunca almacenará PAN completo, CVV ni datos sensibles de tarjeta.

## Criterios para seleccionar proveedor

- Operación y soporte en México.
- Pago online y, si aplica, terminal/API de taquilla.
- Sandbox representativo y documentación mantenida.
- Webhooks firmados, idempotencia y consulta de estado.
- SLA, soporte, comisiones y calendario de liquidaciones.
- Reembolsos, cancelaciones, contracargos y conciliación.
- Alcance y evidencia de cumplimiento PCI DSS; reducción del alcance mediante checkout alojado/tokenización.

## Alternativas consideradas

- Acoplar Ticketing a un proveedor específico, descartado por dependencia prematura.
- Capturar tarjeta directamente, descartado por riesgo y alcance PCI.
- Implementar un esqueleto o flag ahora, descartado porque simularía una capacidad activable sin contrato.

## Consecuencias

### Positivas

El límite futuro evita acoplamiento y establece controles de emisión, seguridad y operación.

### Riesgos o costos

Proveedor, comisiones, estados, expiración, reservas, reembolsos y chargebacks requieren specs. Confirmación, liquidación y conciliación no deben confundirse.

## Validación y revisión

El equipo puede aceptar esta dirección futura sin autorizar código. Antes de implementar se exige spec aprobada, proveedor seleccionado, diseño de amenazas, contratos, plan, tasks y pruebas. Antes de activar: sandbox exitoso, webhooks e idempotencia verificados, conciliación y aprobación operativa documentada.
