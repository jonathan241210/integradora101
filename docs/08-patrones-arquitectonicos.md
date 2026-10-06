# Patrones arquitectónicos

Catálogo normativo para elegir soluciones consistentes. Un patrón se usa por una necesidad comprobada, no como requisito ceremonial. Aplican YAGNI, bajo acoplamiento y la solución más simple que preserve los límites de [arquitectura](02-arquitectura.md).

## API Laravel: MVC y capas

Flujo HTTP preferido:

`Route → Middleware → Form Request → Controller → Action → Model → API Resource`

- **Controller:** adapta HTTP y delega; no contiene reglas.
- **Action:** caso de uso cohesionado y transaccional.
- **Model:** persistencia y relaciones, no orquestación HTTP.
- **Policy:** autorización por recurso; los permisos no se deciden en la UI.
- **Event/Listener:** efectos desacoplados que no deben ocultar el resultado principal.
- **Job:** trabajo diferible, reintentable e idempotente.
- **Adapter:** traduce una integración externa.
- **Strategy:** variantes reales intercambiables con el mismo contrato.

Repository no se añade por defecto sobre Eloquent: se justifica ante una fuente sustituible o consultas complejas que necesiten aislamiento. Service tampoco es una carpeta genérica; se usa solo para una capacidad cohesionada que no sea un caso de uso individual. Evitar capas que solo reenvían llamadas.

## React y React Native: MVVM por feature

Flujo: `View/Page → ViewModel hook → @arca/api-client`.

- La **View** renderiza estado y emite intenciones.
- El hook **ViewModel** coordina estado de presentación, carga y errores; no replica reglas de negocio.
- `@arca/api-client` concentra tipos y transporte.
- Container/Presentational separa coordinación de presentación cuando reduce complejidad.
- Provider comparte dependencias o estado de alcance definido; no sustituye todo estado local.
- Adapter traduce APIs del dispositivo o librerías; composición favorece componentes pequeños.

## PWA offline

Un **Draft Repository** guarda borradores no autoritativos; una **Outbox/Queue** local registra operaciones pendientes; **Retry con backoff** evita tormentas; **Conflict Resolution** exige una política explícita. Todo está sujeto al [ADR 0003](adr/0003-mysql-y-pwa-offline.md) y a una spec que resuelva cifrado, sesión, retención, conflictos y pérdida del dispositivo. No se implementa por anticipado.

## Sistema municipal

Una **Anti-Corruption Layer/Adapter** evita que el dominio adopte el modelo municipal. Tras un cierre confirmado, una **Outbox** permite entrega durable y una clave de idempotencia evita duplicados. El mecanismo (BD directa o servicio interno), autenticación, esquema y conciliación siguen abiertos en el [ADR 0008](adr/0008-integracion-sistema-municipal.md); estos patrones no inventan el contrato.

## Payments futuro: referencia, no autorización

**FUTURO/INACTIVO; V1 solo efectivo.** Una implementación futura podría usar `PaymentGateway` como puerto, Adapter por proveedor, webhook verificado, idempotency key, máquina de estados, Outbox/Event y Strategy. Ninguno existe ni se implementa hasta contar con spec, ADR/proveedor y aprobación. Hoy no hay código, tablas, endpoints, SDK ni feature flag de pagos. Véase [ADR 0009](adr/0009-pagos-electronicos-futuros.md).

## Criterios de decisión

1. Identificar el problema, dueño y calidad requerida.
2. Preferir flujo directo mientras sea testeable y respete límites.
3. Añadir un patrón solo si reduce acoplamiento, riesgo o duplicación demostrable.
4. Documentar alternativas y costo operativo.
5. Exigir spec y pruebas; ADR si cambia tecnología o límites.
6. Eliminar abstracciones especulativas: preparación conceptual no equivale a implementación.
