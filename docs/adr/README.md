# Registro de decisiones de arquitectura

Los Architecture Decision Records (ADR) documentan el contexto, opciones, decisión y consecuencias de cambios tecnológicos o estructurales. Se numeran con cuatro dígitos y no se borran: una decisión reemplazada se marca como Superseded e indica el ADR que la sustituye. Las propuestas no autorizan dependencias ni implementación.

## Estados

- **Aceptado:** decisión acordada; implementar conforme a sus límites y SDD.
- **Propuesto:** alternativa para revisión; no se considera aprobación.
- **Abierto:** falta una decisión de alcance/tecnología.

## Índice

- [0001 · API central Laravel](0001-api-central-laravel.md) — Aceptado
- [0002 · SPAs React y Vite](0002-spas-react-vite.md) — Aceptado; router propuesto
- [0003 · MySQL y PWA offline](0003-mysql-y-pwa-offline.md) — Propuesto
- [0004 · Mobile React Native](0004-mobile-react-native.md) — Aceptado
- [0005 · Videojuego pendiente](0005-videojuego-pendiente.md) — Abierto
- [0006 · Google Cloud portable](0006-hosting-google-cloud-portable.md) — Superseded por 0013
- [0007 · Línea base de arquitectura general](0007-linea-base-arquitectura-general.md) — Propuesto
- [0008 · Integración con el sistema municipal](0008-integracion-sistema-municipal.md) — Abierto
- [0009 · Pagos electrónicos futuros](0009-pagos-electronicos-futuros.md) — Propuesto
- [0010 · MySQL 8.0 y gobierno de cambios de base de datos](0010-mysql-8-0-database-change-governance.md) — Aceptado
- [0011 · Identidad del visitante y sesión móvil](0011-visitor-identity-and-mobile-session.md) — Aceptado
- [0012 · Canal de distribución Android](0012-android-distribution-channel.md) — Propuesto
- [0013 · Aiven como proveedor de MySQL administrado](0013-aiven-managed-mysql.md) — Aceptado
- [0014 · Caché offline y detección de conectividad en la app móvil](0014-mobile-offline-cache-and-connectivity.md) — Aceptado
- [0017 · Exportación del reporte a Excel y PDF](0017-report-export-excel-pdf.md) — Aceptado
- [0018 · PHP mínimo de la API en 8.4](0018-php-minimum-8-4.md) — Aceptado

## Plantilla

```markdown
# NNNN · Título

- Estado: Propuesto | Aceptado | Rechazado | Superseded
- Fecha: AAAA-MM-DD
- Spec relacionada: `apps/<app>/specs/NNN-slug.md` o N/A

## Contexto
## Decisión
## Alternativas consideradas
## Consecuencias
### Positivas
### Riesgos o costos
## Validación y revisión
```

Un ADR propuesto se aprueba explícitamente por el equipo antes de sumar la dependencia o cambiar el límite arquitectónico. Relaciona el ADR con la spec/plan y la revisión que lo aprueban.
