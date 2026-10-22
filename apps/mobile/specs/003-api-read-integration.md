# 003 · api-read-integration

- App dueña: `mobile`
- Apps/paquetes afectados: `mobile`, `packages/api-client`
- Estado: Borrador
- Solicitante / responsable funcional: Víctor (redacción spec); equipo móvil ARCA-NB
- Aprobación funcional: pendiente de aprobación
- Equivalencia en el documento de decisiones previas: 003

## Problema y contexto

La app muestra el catálogo de animales y eventos con datos simulados (spec `mobile-002`). Esta spec conecta esas pantallas de solo lectura con la API: catálogo de animales y eventos con las fotos que el zoológico sube al catálogo web (servidas por URL), caché, imagen de respaldo mientras cargan y estados de carga, error, sin conexión y lista vacía. Las misiones salen de esta spec porque tienen progreso por visitante (`mobile-005`).

## Objetivos

- Sustituir los mocks de animales y eventos por llamadas de solo lectura a la API vía `@arca/api-client`.
- Caché local del catálogo para uso sin conexión, con imagen de respaldo mientras cargan las fotos.
- Estados de carga, error, sin conexión y lista vacía en las pantallas de lectura.
- Conservar MVVM: pantallas → ViewModels → Repositorios → `@arca/api-client`.

## Fuera de alcance

- Escritura o progreso del visitante (specs `mobile-004`/`mobile-005`).
- Definición de los endpoints del catálogo público (requiere una spec de API pendiente).
- Escaneo QR, mapa/ubicación y 3D real.

## Criterios de aceptación (preliminares)

- **CA-01:** Dado el catálogo de animales, cuando la app carga la lista, entonces consume el endpoint público de la API vía `@arca/api-client` y muestra las fotos del catálogo web por URL con imagen de respaldo mientras cargan.
- **CA-02:** Dados los eventos, cuando la app abre su listado y detalle, entonces muestra los datos de la API (título, fecha, horario, ubicación, descripción e imágenes) en lugar de los mocks.
- **CA-03:** Dada una consulta, cuando hay carga, error, sin conexión o lista vacía, entonces la app muestra el estado correspondiente en español y accesible.
- **CA-04:** Dado el catálogo ya descargado, cuando no hay conexión, entonces la app sirve el contenido desde caché local.
- **CA-05:** Dada la suite de Jest, cuando se ejecute, entonces hay pruebas que nombran cada CA-xx con cliente simulado.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** ADR 0011 (decisión de identidad: cabeceras y sesión del cliente de API), spec de API del catálogo público (pendiente), `mobile-002` (pantallas base).
- **Riesgos:** el catálogo público de la API aún no tiene spec; las fotos por URL dependen del catálogo web.
- **Preguntas pendientes:**
  - Endpoints del catálogo público para esta spec (spec de API pendiente).
  - Política de caché (tiempo de vida, invalidación).

## Revisión

- Aprobadores y fecha: pendiente de aprobación.
- Evidencia/enlaces: `apps/mobile/specs/002-mobile-ui-base-visitor-journey.md`, `docs/adr/0011-visitor-identity-and-mobile-session.md`.
