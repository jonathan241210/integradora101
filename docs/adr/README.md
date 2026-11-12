# Registro de decisiones de arquitectura

Los Architecture Decision Records (ADR) documentan el contexto, opciones, decisión y consecuencias de cambios tecnológicos o estructurales. Se numeran con cuatro dígitos y no se borran: una decisión reemplazada se marca como Superseded e indica el ADR que la sustituye. Las propuestas no autorizan dependencias ni implementación.

## Estados

- **Aceptado:** decisión acordada; implementar conforme a sus límites y SDD.
- **Aceptado:** alternativa para revisión; no se considera aprobación.
- **Abierto:** falta una decisión de alcance/tecnología.
- **Propuesto:** decisión redactada y pendiente de aprobación del equipo; no autoriza dependencias ni implementación.

## Índice

- [0001 · API central Laravel](0001-api-central-laravel.md) — Aceptado
- [0002 · SPAs React y Vite](0002-spas-react-vite.md) — Aceptado; router Aceptado
- [0003 · MySQL y PWA offline](0003-mysql-y-pwa-offline.md) — Aceptado
- [0004 · Mobile React Native](0004-mobile-react-native.md) — Aceptado
- [0005 · Videojuego pendiente](0005-videojuego-pendiente.md) — Abierto
- [0006 · Google Cloud portable](0006-hosting-google-cloud-portable.md) — Superseded por 0013
- [0007 · Línea base de arquitectura general](0007-linea-base-arquitectura-general.md) — Aceptado
- [0008 · Integración con el sistema municipal](0008-integracion-sistema-municipal.md) — Abierto
- [0009 · Pagos electrónicos futuros](0009-pagos-electronicos-futuros.md) — Aceptado
- [0010 · MySQL 8.0 y gobierno de cambios de base de datos](0010-mysql-8-0-database-change-governance.md) — Aceptado
- [0011 · Identidad del visitante y sesión móvil](0011-visitor-identity-and-mobile-session.md) — Aceptado
- [0012 · Canal de distribución Android](0012-android-distribution-channel.md) — Aceptado
- [0013 · Aiven como proveedor de MySQL administrado](0013-aiven-managed-mysql.md) — Aceptado
- [0014 · Caché offline y detección de conectividad en la app móvil](0014-mobile-offline-cache-and-connectivity.md) — Aceptado
- [0015 · Renderizado del mapa SVG en la app móvil](0015-mobile-svg-map-rendering.md) — Aceptado
- [0016 · Ubicación GPS con expo-location (mapa V2)](0016-expo-location-gps-blue-dot.md) — Aceptado
- [0017 · Exportación del reporte a Excel y PDF](0017-report-export-excel-pdf.md) — Aceptado
- [0018 · PHP mínimo de la API en 8.4](0018-php-minimum-8-4.md) — Aceptado
- [0019 · Generación del QR del boleto en SVG desde la API](0019-qr-svg-generation-api.md) — Aceptado
- [0020 · Notificaciones por correo electrónico de cambios de precio](0020-price-change-email-notifications.md) — Propuesto — diferido (2026-11-02)
- [0021 · Excepciones a la Constitución en la feature de ventas de boletos](0021-ticket-sales-constitution-exceptions.md) — Aceptado (2026-11-02)
- [0022 · Escaneo QR con expo-camera (mobile-006)](0022-expo-camera-qr-scan.md) — Aceptado
- [0023 · Recorrido guiado 3D y realidad aumentada offline](0023-mobile-ar-3d-camera-threejs.md) — Propuesto
- [0024 · Excepción de arquitectura para el portal público: HTML y JavaScript estático en apps/web](0024-web-static-portal-exception.md) — Aceptado (2026-11-07)
- [0023 · Checklist de despliegue en la Constitución](0023-deployment-checklist-constitution.md) — Propuesto (2026-11-05)
- [0025 · Recorrido guiado 3D y realidad aumentada offline](0025-mobile-ar-3d-camera-threejs.md) — Propuesto
- [0026 · Almacenamiento de imágenes: carpeta de medios versionada para pruebas compartidas](0026-object-storage-s3-images.md) — Aceptado (2026-11-12; enmienda de especies 2026-11-11)
- [0027 · Galería dinámica de «Momentos para recordar» en el portal (excepción acotada a web-010)](0027-dynamic-public-memories-gallery.md) — Propuesto (2026-11-10)
- [0028 · Catálogo dinámico de TulanPedia en el portal (excepción acotada a web-011)](0028-dynamic-tulanpedia-catalog.md) — Aceptado (2026-11-12)

## Plantilla

```markdown
# NNNN · Título

- Estado: Aceptado | Aceptado | Rechazado | Superseded
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

Un ADR Aceptado se aprueba explícitamente por el equipo antes de sumar la dependencia o cambiar el límite arquitectónico. Relaciona el ADR con la spec/plan y la revisión que lo aprueban.
