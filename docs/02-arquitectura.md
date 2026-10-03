# Arquitectura

## Límites de responsabilidad

- `apps/api` es la API central Laravel 12, única dueña del esquema de negocio, reglas, autorizaciones, auditoría y escrituras en MySQL. Los controladores HTTP validan y delegan las reglas en Actions.
- `apps/dashboard`, `apps/pwa` y `apps/web` son SPAs independientes en React 19 + TypeScript + Vite. El portal presenta contenido público; dashboard y PWA requieren permisos. Ningún cliente replica reglas de negocio.
- `apps/mobile` es el cliente React Native para visitantes. El videojuego no tiene carpeta hasta decidirse su tecnología.
- `packages/api-client` ofrece el contrato tipado común a los clientes; `packages/ui`, `packages/tokens` y `packages/config` centralizan presentación y configuración compartida.

## Comunicación y autenticación

Los clientes consumen endpoints JSON bajo `/api`. La API define rutas Laravel con nombres (`->name()`); los clientes no dependen de Inertia ni Wayfinder y llaman a través de `@arca/api-client` y hooks. Las SPAs autenticadas usan Sanctum con autenticación de cookie y protección CSRF. Mobile usa tokens Sanctum; nunca se colocan credenciales de servicio en la app pública. Fortify se configura en modo headless para flujos de autenticación que correspondan.

Los endpoints aplican Form Requests, Policies y permisos de Spatie; responden con API Resources consistentes. Cada endpoint de escritura llama a una Action de negocio y registra los eventos auditables pertinentes.

## Datos y tema

La BD principal es MySQL 8 estándar, gestionada inicialmente como servicio administrado de Google Cloud (por ejemplo, Cloud SQL). Solo `apps/api` modifica sus tablas, mediante migraciones Laravel. `settings_colores` es una fuente externa de solo lectura en una conexión separada llamada `mysql2`; su lectura puede usar `mysql2`, nunca se migra ni se escribe desde ARCA-NB. La API entrega los valores validados y su mapeo mediante `GET /api/theme`.

Todas las conexiones se configuran exclusivamente con variables de entorno. No se utilizan extensiones propietarias de Cloud SQL ni SDK de GCP en reglas de negocio. Archivos, si se almacenan en la nube, usan discos/interfaz de Laravel Filesystem configurables. Así, la futura migración a MySQL Server local requiere configurar `.env` y el destino de archivos, no reescribir el dominio. La portabilidad debe verificarse frente a MySQL 8 estándar.

## Conectividad de la PWA

La PWA conservará borradores de captura veterinaria en IndexedDB y los sincronizará al recuperar conexión. `vite-plugin-pwa` e `idb` son propuestas sujetas al ADR 0003. Los datos locales no son autoridad: la API valida, resuelve conflictos según una política aprobada y confirma la sincronización antes de considerar persistido un cambio.

## Diagrama

```mermaid
flowchart LR
  Web[apps/web<br/>React SPA] --> SDK[@arca/api-client]
  Dash[apps/dashboard<br/>React SPA] --> SDK
  PWA[apps/pwa<br/>React PWA + borradores] --> SDK
  Mobile[apps/mobile<br/>React Native] --> SDK
  SDK --> API[apps/api<br/>Laravel 12 JSON API]
  API --> DB[(MySQL 8<br/>Cloud SQL administrado)]
  API -.lectura.-> Theme[(mysql2<br/>settings_colores)]
  API -.Filesystem disk.-> Files[(Almacenamiento cloud intercambiable)]
  Local[(MySQL Server local)] -.cambio de configuración .env.-> API
```

## Estructura de cada app

```text
apps/<app>/
  AGENTS.md
  docs/       documentación local de la app
  specs/      requisitos e historias NNN-slug.md
  plan/       solución técnica NNN-slug.md
  tasks/      checklist de trabajo NNN-slug.md
  src/        único lugar para el código fuente
```

El número NNN se asigna por app. Las decisiones tecnológicas pendientes se documentan en [ADRs](adr/README.md).
