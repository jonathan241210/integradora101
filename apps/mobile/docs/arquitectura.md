# Arquitectura de `apps/mobile`

## 1. Control

- **Estado:** Vigente; describe el prototipo de UI de la spec **002** y la integración de lectura API y caché de la spec **003**.
- **Capacidades descritas:** rutas, interfaz, mocks, integración de lectura API para catálogo/eventos, caché SWR y pruebas: actual; cuenta persistente, cámara, GPS y 3D: futuros.
- **Spec de referencia:** [002 · mobile-ui-base-visitor-journey](../specs/002-mobile-ui-base-visitor-journey.md) y [003 · api-read-integration](../specs/003-api-read-integration.md).
- **Decisión tecnológica:** [ADR 0004 · Mobile React Native](../../../docs/adr/0004-mobile-react-native.md).

## 2. Propósito, alcance y exclusiones

La aplicación presenta al visitante una experiencia móvil de exploración del zoológico y permite validar sus flujos y diseño.

- **Actual:** cinco pestañas, búsqueda y detalle de animales, colección, perfil, eventos, misiones, logros, resultados QR simulados, acceso visual (Login, registro, recuperación y Ajustes), y consumo real/mock desacoplado de catálogo de especies y eventos con caché SWR de 5 minutos y fallback de imágenes.
- **No incluido en 003:** cuenta real persistente en servidor, cámara/lectura QR real, GPS, mapa interactivo y renderizado 3D.
- **Futuro:** capacidades de dispositivo o persistencia de cuenta/progreso se implementan con alcance aprobado en una spec correspondiente (004 a 008). Roadmap y responsables de specs 003–008: [003-008-roadmap-y-asignacion.md](./003-008-roadmap-y-asignacion.md).

## 3. Actores

| Actor | Necesidad | Confianza |
|---|---|---|
| Visitante | Explorar el contenido educativo y probar los flujos de visitante | Cliente público; no contiene credenciales ni autoridad de negocio |
| Equipo de desarrollo | Ejecutar Expo Go, validar la UI y mantener los contratos del cliente | Acceso al código del monorepo |

## 4. Módulos internos

| Módulo | Estado | Responsabilidad | Fuente de datos |
|---|---|---|---|
| `src/app/` | Actual | Rutas Expo Router y composición de dependencias de presentación | ViewModels |
| `src/screens/` | Actual | Vistas props-driven de cada pantalla | Props y callbacks de rutas |
| `src/viewmodels/` | Actual | Estado y operaciones de presentación | Repositories |
| `src/repositories/` | Actual | Acceso desacoplado a datos simulados | Mocks |
| `src/mocks/`, `src/models/` | Actual | Fixtures y tipos de dominio de UI | Código fuente de Mobile |
| `src/components/`, `src/theme/` | Actual | Componentes compartidos, símbolos y adaptación de tokens | `@arca/tokens`, `expo-symbols` |

## 5. Estructura de `src/`

```text
src/
  app/          # Expo Router y rutas
  components/   # UI y componentes de dominio
  mocks/        # Fixtures
  models/       # Tipos de la UI
  repositories/ # Contratos e implementación mock
  screens/      # Vistas
  theme/        # Adaptador de tokens
  viewmodels/   # Hooks/estado de presentación
```

`apps/mobile/src` es el único árbol de código de la app. No se debe crear otro `apps/src`.

## 6. Patrón MVVM

El flujo actual es `Route → Screen/View → ViewModel hook → Repository → Mock`. Las rutas coordinan navegación y datos de presentación; las pantallas reciben props y callbacks. Los repositorios pueden sustituir los mocks por un origen futuro sin acoplar las vistas.

## 7. Componentes

Las pantallas en `src/screens/` componen controles de `src/components/ui/` y componentes de dominio. `BackButton`, `ScreenContainer`, textos, cards, chips, iconos y placeholders de imagen forman parte del kit compartido móvil.

## 8. Dependencias

- **Internas:** `@arca/tokens` y `@arca/api-client`, desde los workspaces `packages/`.
- **Runtime móvil:** Expo SDK 57, Expo Router, React Native 0.86 y `expo-symbols`.
- **Pruebas/desarrollo:** Jest, `jest-expo`, React Native Testing Library y TypeScript.
- Metro resuelve workspaces desde la raíz del monorepo mediante `metro.config.js`.
- No hay dependencias de cámara, geolocalización, mapas ni motor 3D en el alcance actual.

## 9. Contratos y endpoints

La etapa 003 implementa la integración de lectura para el catálogo público y eventos (`GET /species`, `GET /species/{id}`, `GET /events`, `GET /events/{id}`) utilizando `@arca/api-client` (`createHttpClient`) a través de `ApiAnimalRepository` y `ApiZooRepository`.
Los datos de la API en `snake_case` se normalizan a modelos de dominio en `camelCase` mediante `src/repositories/mappers.ts`.
Si la variable `EXPO_PUBLIC_USE_MOCKS` está activa o el entorno no cuenta con API disponible, la fábrica `createAnimalRepository()` y `createZooRepository()` recurre limpiamente a las implementaciones mock de `src/mocks/`.
La arquitectura de conexión, contratos y manejo de errores para las siguientes etapas (004–008) continúa regulada en [estandares-integracion-api.md](./estandares-integracion-api.md).

## 10. Datos y flujo

La etapa 003 incorpora una estrategia de caché local *Stale-While-Revalidate* (SWR) con un tiempo de vida (TTL) de 5 minutos (300,000 ms) a través de una abstracción `KeyValueStorage` (`src/repositories/storage.ts`), persistida con `@react-native-async-storage/async-storage` (ADR 0014).
Cuando hay datos en caché válidos se retornan inmediatamente; si la red falla se conserva el caché disponible. El banner `OfflineBanner` se muestra cuando `expo-network` reporta falta de conexión mediante `useNetworkStatus` (`isConnected === false` o `isInternetReachable === false`), no por un fallo HTTP aislado.
Las pantallas manejan 5 estados de presentación: carga (`loading`), éxito (`success`), error con reintento accesible (`error`), datos vacíos (`empty`) y modo sin conexión (`offline`).
La autoridad de datos de negocio reside en el servidor/API Laravel.
Persistencia de cuenta y sincronización de colecciones/QR pertenecen a las specs futuras 004, 005 y 006.

## 11. Seguridad y privacidad

El prototipo no solicita permisos de cámara ni ubicación y no debe contener secretos o tokens de servicio. El QR y el mapa son simulaciones visuales, no flujos de captura de datos. Login y Ajustes tampoco guardan credenciales: la compuerta de entrada vive solo en memoria y el aviso de privacidad de la app explica esa limitación. La cuenta recuperable en servidor pertenece a la spec `004`.

## 12. Pruebas

Las pruebas Jest cubren arquitectura/imports, rutas, UI, ViewModels y Repositories; `npx tsc --noEmit` comprueba tipos. La revisión visual Android/Expo Go es una validación manual complementaria y se registra en la tarea T-28 de la spec 002.

## 13. Componentes y flujo

```mermaid
flowchart LR
  Route[Expo Router] --> Screen[Screen / View]
  Route --> VM[ViewModel hook]
  Screen -->|acciones/callbacks| Route
  VM --> Repo[Repository]
  Repo --> Mock[Mocks]
  Theme[Theme adapter] --> Tokens[@arca/tokens]
```

## 14. Secuencia de consulta visual

```mermaid
sequenceDiagram
  participant Visitor as Visitante
  participant Route as Ruta
  participant VM as ViewModel
  participant Repo as Repository
  participant Mock as Mock
  Visitor->>Route: Abre una pantalla
  Route->>VM: Solicita datos de presentación
  VM->>Repo: Consulta datos
  Repo->>Mock: Lee fixtures
  Mock-->>Repo: Datos simulados
  Repo-->>VM: Modelos
  VM-->>Route: Estado de UI
  Route-->>Visitor: Renderiza la vista
```

## 15. Riesgos y pendientes

| Pendiente | Tratamiento |
|---|---|
| Iconos de launcher Android/iOS | Agregar recursos PNG finales antes de builds distribuibles |
| Persistencia y favoritos | Definir en una spec futura; no inferir estado persistente de UI temporal |
| Cámara/QR real, GPS/mapa y 3D | Requieren alcance aprobado, permisos, dependencias y validación de dispositivos |
| Retirar referencia visual temporal | `arca-ui-reference` no es una dependencia y se mantiene fuera de Git |
| Confundir enmienda 002 con spec 004 | Ver sección «Límite entre enmienda 002 y spec 004» en [003-008-roadmap-y-asignacion.md](./003-008-roadmap-y-asignacion.md): no añadir secure store, API de cuenta ni flujos 004 hasta spec/ADR aprobados |

## 16. Validación

- La estructura de código queda limitada a `apps/mobile/src`.
- Las capacidades mock y las futuras se identifican explícitamente.
- Expo está aprobado por ADR 0004; las integraciones de hardware no se asumen aprobadas por ese ADR.
