# Contratos compartidos

Estos criterios orientan specs; no crean endpoints por sí mismos.

## API v1

- Prefijo: `/api/v1`.
- Intercambio: HTTPS y JSON UTF-8; nombres técnicos en inglés.
- Fechas: ISO 8601 con zona horaria; importes con representación decimal definida por la spec, nunca float ambiguo.
- Colecciones: paginación con `data`, `meta` y `links`; límites máximos documentados.
- Filtros y orden: parámetros permitidos explícitos; no consultas arbitrarias.
- Errores: forma estable con `code`, `message`, `details` y `correlation_id`; mensajes al usuario en español y sin secretos.
- Permisos: autenticación no implica autorización; cada operación aplica Policy/permiso del servidor.
- Idempotencia: obligatoria cuando una spec permita reintentos de operaciones financieras o integraciones.
- Compatibilidad: cambios aditivos dentro de v1; ruptura requiere nueva versión, migración y aviso.
- `@arca/api-client` es el acceso de los clientes; no habilita contratos no aprobados.

## Contrato municipal pendiente

El evento disparador confirmado es **cierre de caja confirmado**. Su carga conceptual incluye el identificador del cierre, periodo, totales de ingresos y referencia de auditoría. En V1 los ingresos de boletaje provienen solo de efectivo.

Siguen por confirmar: BD directa o servicio interno, protocolo, autenticación, esquema exacto, acuses, disponibilidad, idempotencia, reintentos, conciliación y pruebas. Un Adapter aislará el contrato cuando sea acordado; este documento no afirma que exista una BD o API municipal disponible.

## Contrato conceptual futuro de Payments

**FUTURO/INACTIVO; no es un endpoint aprobado ni implementable.** Una spec futura podría definir capacidades para crear intento, obtener URL o token seguro, consultar estado, recibir webhook verificado, confirmar o rechazar, reembolsar y conciliar. Los nombres exactos, estados, rutas y cargas se decidirán con el proveedor.

V1 opera solo en efectivo. Hoy no hay código, tablas, endpoints, SDK ni feature flag de pagos. El futuro diseño usará `PaymentGateway`; emitirá o activará boleto solo después de confirmación válida y nunca almacenará PAN completo, CVV ni datos sensibles de tarjeta. Checkout alojado o tokenización son preferidos.
