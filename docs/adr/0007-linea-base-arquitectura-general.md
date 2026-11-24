# 0007 · Línea base de arquitectura general

- Estado: Aceptado
- Solicitada: 2026-10-06
- Aprobada: 2026-11-23
- Spec relacionada: N/A; línea base documental transversal

## Contexto

Cinco apps y paquetes compartidos necesitan límites comunes antes de diseñar features. Sin una línea base, cada equipo podría duplicar reglas, inventar contratos o presentar capacidades futuras como activas.

## Decisión propuesta

Adoptar diez dominios estables: Identity & Access, Ticketing, Payments, Cash Management, Animal Care, Public Content, Visitor Experience, Reporting, Configuration y Audit. Payments queda futuro/inactivo y V1 vende solo en efectivo.

La API usa MVC en límites Laravel con Actions; clientes React/React Native usan MVVM explícito y `@arca/api-client`. Los paquetes compartidos propuestos son `ui`, `tokens`, `api-client`, `config` y `assets`. Cada app documentará su arquitectura mediante la plantilla común y la aprobará por PR. Entidades, tablas, endpoints y clases requieren specs posteriores.

La línea base está reflejada en la estructura del monorepo: las cinco apps, los paquetes `ui`, `tokens`, `api-client`, `config` y `assets`, y los documentos de arquitectura por app.

## Alternativas consideradas

- Permitir diseños independientes por app sin límites transversales.
- Definir de inmediato entidades y endpoints, creando compromisos prematuros.
- Usar un único patrón indistinto para servidor y clientes.

## Consecuencias

### Positivas

Ownership, dependencias y lenguaje arquitectónico coherentes; contratos y excepciones quedan revisables.

### Riesgos o costos

Requiere coordinación y mantener diagramas. Los límites podrían ajustarse mediante ADR antes de implementar.

## Validación y revisión

Revisar la [línea base](../02-arquitectura.md), [vistas](../arquitectura/README.md), [patrones](../08-patrones-arquitectonicos.md) y arquitecturas por app. Este ADR no autoriza por sí mismo implementaciones nuevas: cada feature requiere su spec aprobada.
