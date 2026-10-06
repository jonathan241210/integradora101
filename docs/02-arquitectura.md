# Arquitectura general de ARCA-NB

- **Estado:** Propuesta
- **Aprobación:** un PR revisado y aprobado por todo el equipo; el merge será la evidencia.

## Objetivo, alcance y exclusiones

Esta línea base define límites comunes para las cinco aplicaciones, paquetes, datos e integraciones. Es una arquitectura documental: no aprueba entidades, tablas, endpoints, clases internas ni infraestructura. Cada capacidad se concreta mediante spec, plan y tasks.

ARCA-NB será un monorepo modular, cliente-servidor JSON. `apps/api` seguirá una API modular en capas y MVC en sus límites Laravel; los clientes se organizarán por features y usarán MVVM explícito. Quedan fuera la implementación de apps, infraestructura, juego y pagos electrónicos.

**V1 vende boletos solo en efectivo. Payments es FUTURO/INACTIVO y hoy no puede activarse:** no hay código, tablas, endpoints, SDK ni feature flag de pagos, ni se crearán ahora.

## Principios y responsabilidades

- La API es la única autoridad de reglas, autorización, auditoría y datos de negocio.
- Los clientes presentan datos y llaman a `@arca/api-client`; no duplican reglas.
- MySQL 8 de `apps/api` es la fuente de verdad. Los borradores offline no son autoritativos.
- Las dependencias apuntan hacia contratos y dominio, no hacia proveedores externos.
- Menor privilegio, trazabilidad e idempotencia en operaciones financieras e integraciones.
- Portabilidad por configuración: ninguna regla depende de servicios propietarios de GCP.

## Componentes principales

| Componente | Estado | Responsabilidad |
|---|---|---|
| `apps/api` | Propuesto | API Laravel, reglas, persistencia, autorización y auditoría |
| `apps/dashboard` | Propuesto | Taquilla en efectivo, caja, métricas y administración |
| `apps/pwa` | Propuesto | Captura veterinaria y borradores offline |
| `apps/web` | Propuesto | Portal institucional público |
| `apps/mobile` | Propuesto | Experiencia de visita, QR, mapa y 3D |
| `packages/api-client` | Propuesto | Contrato tipado para clientes |
| `packages/ui`, `tokens`, `config`, `assets` | Propuesto | Presentación, configuración y recursos autorizados compartidos |
| MySQL 8 | Propuesto | Datos de negocio autoritativos |
| `settings_colores` | Actual externo | Fuente de tema de solo lectura mediante `mysql2` |
| IndexedDB | Propuesto | Borradores temporales de PWA |
| Almacenamiento de archivos | Propuesto | Archivos mediante Laravel Filesystem intercambiable |
| Sistema municipal | Integración pendiente | Recibe ingresos y cortes después de un cierre confirmado; mecanismo por confirmar |
| Proveedor/banco | Futuro/inactivo | Posible procesamiento electrónico, no activo en V1 |

## Dominios y dependencias

| Dominio | Responsabilidad general | Dependencias permitidas |
|---|---|---|
| Identity & Access | Identidad, sesiones, roles y permisos | Configuration, Audit |
| Ticketing | Oferta y emisión de boletos | Cash Management en V1; Identity & Access, Configuration, Audit |
| Payments | **Futuro/inactivo**; límite reservado | Ninguna dependencia activa en V1 |
| Cash Management | Movimientos, arqueos y cierres de efectivo | Identity & Access, Reporting, Audit |
| Animal Care | Expedientes y atención animal | Identity & Access, Audit, Configuration |
| Public Content | Noticias, eventos y fichas públicas | Configuration, Audit |
| Visitor Experience | Mapa, QR, 3D y experiencia móvil | Public Content, Ticketing |
| Reporting | Consultas y proyecciones de lectura | Datos publicados por dominios; no escribe en ellos |
| Configuration | Configuración validada y tema | Sin dependencia de dominios de negocio |
| Audit | Registro transversal inmutable | Sin dependencia inversa hacia consumidores |

Se prohíben accesos directos de clientes a BD, reglas de negocio en UI, escrituras a `settings_colores`, dependencias de dominio hacia UI y acoplamiento de Ticketing a un proveedor de pago. Reporting no modifica los datos que consulta. Las dependencias adicionales requieren spec y, si cambian límites, ADR.

## Comunicación, seguridad y datos

Los clientes consumen JSON versionado bajo `/api/v1` mediante `@arca/api-client`. Las SPAs autenticadas usarán cookie Sanctum con CSRF; mobile usará tokens. Form Requests validan, Policies y permisos autorizan, Controllers delgados delegan en Actions y API Resources serializan. Cada operación sensible registra actor, acción, fecha y correlación sin secretos.

El esquema cambia solo por migraciones. Datos clínicos y financieros usan borrado lógico y auditoría. Las conexiones y secretos se inyectan por entorno. GCP previsto y MySQL Server local deben ejecutar el mismo diseño; almacenamiento queda detrás de Laravel Filesystem.

La PWA puede mantener Draft Repository y Outbox locales, sujetos al [ADR 0003](adr/0003-mysql-y-pwa-offline.md) y a una spec de seguridad, conflicto, retención y reintentos. La API confirma cuándo un cambio es persistente.

## Venta y cierre activos en V1

Ticketing registra la venta **solo en efectivo** y emite el boleto conforme a la regla aprobada. Cash Management registra el movimiento de efectivo y lo incorpora al cierre. Al confirmar el cierre, se prepara el envío de ingresos y cortes al sistema municipal mediante un Adapter. El disparador está confirmado; si será BD directa o servicio interno, así como protocolo y contrato, está por confirmar.

## Payments: extensión futura no implementada

Payments es un límite reservado, no un módulo implementado ni activable. Ticketing nunca dependerá de un proveedor concreto. Una spec futura podrá introducir `PaymentGateway` y un Adapter por proveedor; solicitará el cobro y solo emitirá o activará un boleto tras `payment confirmed` válido.

En ese futuro, Payments gestionaría intentos, estados, referencias, webhooks verificados, reembolsos y conciliación. Se preferirá checkout alojado o tokenización; ARCA-NB nunca almacenará PAN completo, CVV ni datos sensibles de tarjeta. Esa implementación futura creará su propia feature flag apagada por defecto y requerirá proveedor aprobado, sandbox, seguridad, idempotencia, webhooks, conciliación y aprobación operativa. Estar preparado arquitectónicamente no significa estar implementado ni listo para activar.

## Documentación normativa

- [Diagramas y guía de arquitectura](arquitectura/README.md)
- [Patrones arquitectónicos](08-patrones-arquitectonicos.md)
- [Contratos compartidos](arquitectura/contratos.md)
- [ADR 0007 · Línea base](adr/0007-linea-base-arquitectura-general.md)
- [ADR 0008 · Sistema municipal](adr/0008-integracion-sistema-municipal.md)
- [ADR 0009 · Pagos futuros](adr/0009-pagos-electronicos-futuros.md)
- [Plantilla por app](templates/arquitectura-app.md)
