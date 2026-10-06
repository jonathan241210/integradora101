# Secuencias

## Activa V1: venta solo en efectivo

```mermaid
sequenceDiagram
  actor Cajero
  participant Dashboard
  participant API
  participant Ticketing
  participant Cash as Cash Management
  participant Audit
  Cajero->>Dashboard: Registra venta y efectivo recibido
  Dashboard->>API: Solicita venta en efectivo
  API->>Ticketing: Validar y registrar venta
  Ticketing->>Cash: Registrar movimiento de efectivo
  Cash->>Audit: Registrar trazabilidad
  Ticketing-->>API: Emitir boleto
  API-->>Dashboard: Venta y boleto confirmados
```

## Activa V1: cierre e integración municipal

```mermaid
sequenceDiagram
  actor Cajero
  participant Dashboard
  participant Cash as Cash Management
  participant Outbox
  participant Adapter as Adapter municipal
  participant Municipal as Sistema municipal
  Cajero->>Dashboard: Solicita cierre
  Dashboard->>Cash: Consolidar movimientos de efectivo
  Cash-->>Dashboard: Totales para revisión
  Cajero->>Dashboard: Confirma cierre
  Dashboard->>Cash: Confirmar cierre
  Cash->>Outbox: Preparar ingresos y corte
  Note over Adapter,Municipal: Mecanismo y contrato por confirmar
  Outbox->>Adapter: Entregar cuando la integración sea aprobada
  Adapter->>Municipal: Envío idempotente pendiente de definición
```

El cierre confirmado es el disparador acordado; no se afirma si la conexión será BD directa o servicio interno.

## Escenarios futuros no implementados

Los siguientes diagramas son escenarios de diseño, **no contratos ni autorización de implementación**. Payments está FUTURO/INACTIVO; V1 solo efectivo y hoy no hay código, tablas, endpoints, SDK ni feature flag de pagos.

### Pago online futuro

```mermaid
sequenceDiagram
  actor Visitante
  participant Web
  participant Ticketing
  participant Payments
  participant Gateway as Proveedor futuro
  Visitante->>Web: Inicia compra futura
  Web->>Ticketing: Solicita reserva futura
  Ticketing->>Payments: Solicita intento de pago
  Payments->>Gateway: Crear checkout alojado
  Gateway-->>Payments: Webhook verificado: payment confirmed
  Payments-->>Ticketing: Pago confirmado
  Ticketing-->>Web: Emitir o activar boleto
```

### Tarjeta en taquilla futura

```mermaid
sequenceDiagram
  actor Cajero
  participant Dashboard
  participant Ticketing
  participant Payments
  participant Gateway as Terminal o proveedor futuro
  Cajero->>Dashboard: Inicia cobro con tarjeta
  Dashboard->>Ticketing: Solicita venta futura
  Ticketing->>Payments: Solicita cobro
  Payments->>Gateway: Procesar mediante Adapter
  Gateway-->>Payments: payment confirmed válido
  Payments-->>Ticketing: Confirmación
  Ticketing-->>Dashboard: Emitir boleto
```

### Rechazo o timeout futuro

```mermaid
sequenceDiagram
  participant Client as Web o Dashboard
  participant Ticketing
  participant Payments
  participant Gateway as Proveedor futuro
  Client->>Ticketing: Solicita compra futura
  Ticketing->>Payments: Solicita cobro
  Payments->>Gateway: Procesar
  Gateway-->>Payments: Rechazo o timeout
  Payments-->>Ticketing: No confirmado
  Ticketing-->>Client: No emitir ni activar boleto
```
