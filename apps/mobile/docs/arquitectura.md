# Arquitectura de `apps/mobile`

## 1. Control

- **Estado:** Vigente al 2026-11-18. Cubre las specs **002** a **006**, las memorias de la **010**, el filtro de catálogo del visitante, los favoritos de la **014** y el cliente de avisos de la **013** tal como están en el código. No cierra el mapa (**007**), el recorrido 3D (**009**) ni la distribución (**008**). La barra con la app cerrada sigue siendo evidencia manual del APK.
- **Capacidades descritas:** rutas, catálogo filtrado, cuenta, progreso, salón de logros, misiones, QR con cámara, memorias y favoritos. El mapa y el 3D quedan fuera de este cierre.
- **Specs de referencia:** [002](../specs/002-mobile-ui-base-visitor-journey.md), [003](../specs/003-api-read-integration.md), [004](../specs/004-visitor-account.md), [005](../specs/005-visitor-progress.md), [006](../specs/006-qr-scan.md), [010](../specs/010-visitor-memory-requests.md), [013](../specs/013-visitor-push-notifications.md) y [014](../specs/014-visitor-favorite-species.md).
- **Decisiones tecnológicas:** [ADR 0004 · Mobile React Native](../../../docs/adr/0004-mobile-react-native.md), [ADR 0011 · Visitor identity and mobile session](../../../docs/adr/0011-visitor-identity-and-mobile-session.md) y [ADR 0014 · Mobile offline cache and connectivity](../../../docs/adr/0014-mobile-offline-cache-and-connectivity.md).

## 2. Propósito, alcance y exclusiones

La aplicación presenta al visitante una experiencia móvil de exploración del zoológico y permite validar sus flujos y diseño.

- **Actual:** cinco pestañas, búsqueda y detalle, colección, perfil, eventos, misiones, salón de logros, QR con cámara o código manual, cola offline de escaneos, cuenta, favoritos, «Mis memorias» y catálogo con caché. Con `EXPO_PUBLIC_API_URL` esas lecturas y escrituras del visitante hablan con la API; sin ella, y en Jest, siguen los mocks de repositorio.
- **Catálogo visible:** una especie entra en Inicio, Colección, Perfil y fichas solo si `GET /published-species` la incluye y algún animal de `GET /enclosures` tiene `can_receive_visits` activo. Si el detalle no pasa ese cruce, la ficha no se abre. Los conteos usan esa lista, no `total_species` de la API. `GET /species` no se modificó.
- **Logros y misiones:** la lista completa se titula «Salón de logros» y se abre con «Ver salón de logros» al final de las misiones. La ficha de una misión no lleva ese botón. «Misión cumplida» y «Maestro de misiones» no se muestran: el seeder los deja con `is_active` falso.
- **Memorias:** entrada «Mis memorias» en Perfil. Con petición abierta no se ofrece otra alta. Al tocarla se ve la opinión y el estado, sin campos. El límite semanal dice «otra memoria». La API no devuelve la foto al visitante. Un aviso abre `/memory-form` con el id: si esa petición no está en memoria, la ruta pide la lista antes de mostrar «Tu memoria».
- **Avatar e icono:** el círculo de perfil, edición y selector usa `src/assets/avatars/<código>.png`. El launcher es `src/assets/icon/iconZoo.png` y el aviso usa la silueta blanca `notification.png`. El nombre visible es ARCA-NB.
- **Ajustes:** los interruptores de cámara y de ubicación leen el permiso del teléfono. Encender pide el permiso; apagar, o un sistema que ya no pregunta, abre los ajustes del sistema.
- **Fuera de este cierre:** mapa (**007**), recorrido 3D (**009**) y distribución (**008**). El cliente de avisos (**013**) está descrito; la entrega con la app cerrada no se da por cerrada.
- **Futuro:** [003-008-roadmap-y-asignacion.md](./003-008-roadmap-y-asignacion.md).

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
| `src/repositories/` | Actual | Acceso desacoplado. La cuenta usa el mock si no hay `EXPO_PUBLIC_API_URL`; con esa variable usa `HttpAuthRepository` | Mocks o `@arca/api-client` |
| `src/mocks/`, `src/models/` | Actual | Fixtures y tipos de dominio de UI | Código fuente de Mobile |
| `src/components/`, `src/theme/` | Actual | Componentes compartidos, símbolos y adaptación de tokens | `@arca/tokens`, `expo-symbols` |

## 5. Estructura de `src/`

```text
src/
  app/          # Expo Router y rutas
  assets/       # Icono, silueta del aviso y PNG de avatares
  components/   # UI y componentes de dominio
  constants/    # Catálogo de avatares y otras constantes
  memories/     # Textos y copia en memoria de las peticiones
  mocks/        # Fixtures
  models/       # Tipos de la UI
  navigation/   # Regreso dentro de las pestañas
  push/         # Registro, canales y toque del aviso
  repositories/ # Contratos, mock de cuenta y HttpAuthRepository
  screens/      # Vistas
  services/     # Almacenamiento del par de tokens
  session/      # Sesión de la cuenta visitante
  theme/        # Adaptador de tokens
  viewmodels/   # Hooks/estado de presentación
```

`apps/mobile/src` es el único árbol de código de la app. No se debe crear otro `apps/src`.

## 6. Patrón MVVM

El flujo es `Route → Screen/View → ViewModel hook → Repository`. Las rutas coordinan navegación y datos de presentación; las pantallas reciben props y callbacks. Sin `EXPO_PUBLIC_API_URL` la cuenta, el catálogo y el progreso usan mock. Con esa variable usan `@arca/api-client`.

## 7. Componentes

Las pantallas en `src/screens/` componen controles de `src/components/ui/` y componentes de dominio. `BackButton`, `ScreenContainer`, textos, cards, chips, iconos y placeholders de imagen forman parte del kit compartido móvil.

## 8. Dependencias

- **Internas:** `@arca/tokens` y `@arca/api-client`, desde los workspaces `packages/`.
- **Runtime móvil:** Expo SDK 57, Expo Router, React Native 0.86, `expo-symbols`, `expo-secure-store` (ADR 0011, solo el par de tokens de la cuenta), `@react-native-async-storage/async-storage`, `expo-network` (ADR 0014), `expo-camera` (QR, spec 006), `expo-image-picker` (memorias, ADR 0030), `expo-notifications` (avisos, spec 013, ADR 0029) y `expo-location` (permiso de ubicación en Ajustes; el mapa que lo consume no está cerrado).
- **Pruebas/desarrollo:** Jest, `jest-expo`, React Native Testing Library y TypeScript.
- Metro resuelve workspaces desde la raíz del monorepo mediante `metro.config.js`.

## 9. Contratos y endpoints

La etapa 003 implementa la integración de lectura para el catálogo público y eventos (`GET /species`, `GET /species/{id}`, `GET /events`, `GET /events/{id}`) utilizando `@arca/api-client` (`createHttpClient`) a través de `ApiAnimalRepository` y `ApiZooRepository`.
Los datos de la API en `snake_case` se normalizan a modelos de dominio en `camelCase` mediante `src/repositories/mappers.ts`.
Si la variable `EXPO_PUBLIC_USE_MOCKS` está activa o el entorno no cuenta con API disponible, la fábrica `createAnimalRepository()` y `createZooRepository()` recurre limpiamente a las implementaciones mock de `src/mocks/`.
La arquitectura de conexión, contratos y manejo de errores para las etapas 005–008 continúa regulada en [estandares-integracion-api.md](./estandares-integracion-api.md).

La cuenta de la spec 004 elige el origen al arrancar: sin `EXPO_PUBLIC_API_URL` usa el mock y el almacenamiento en memoria; con esa variable usa `HttpAuthRepository`, `expo-secure-store` y `createVisitorApi` de `@arca/api-client` contra la API de pruebas. Jest no toma esa variable y sigue en el mock, salvo las pruebas que configuran un cliente simulado. No se importa el cliente de personal (`auth.ts`).

## 10. Datos y flujo

La etapa 003 incorpora una estrategia de caché local *Stale-While-Revalidate* (SWR) con un tiempo de vida (TTL) de 5 minutos (300,000 ms) a través de una abstracción `KeyValueStorage` (`src/repositories/storage.ts`), persistida con `@react-native-async-storage/async-storage` (ADR 0014).
Cuando hay datos en caché válidos se retornan inmediatamente; si la red falla se conserva el caché disponible. El banner `OfflineBanner` se muestra cuando `expo-network` reporta falta de conexión mediante `useNetworkStatus` (`isConnected === false` o `isInternetReachable === false`), no por un fallo HTTP aislado.
Las pantallas manejan 5 estados de presentación: carga (`loading`), éxito (`success`), error con reintento accesible (`error`), datos vacíos (`empty`) y modo sin conexión (`offline`).
La autoridad de datos de negocio reside en el servidor/API Laravel.

Los recorridos de exploración que aún no tienen sesión siguen en fixtures de `src/mocks/`. Con sesión, el progreso, la colección por especie, los logros y las misiones salen de `api-005`. Esas pantallas comparten una sola lectura: no la repiten al guardar el perfil ni al abrir Ajustes si la sesión ya está activa, y la descartan al cerrar sesión. El perfil de la cuenta (`GET /me`) también se guarda una sola vez en la sesión: perfil, ajustes y edición leen esa copia, y un `PATCH` la actualiza sin otra lectura. La cola de escaneos vive en AsyncStorage. La cámara sigue en la spec 006. Las pestañas no acumulan historial entre sí; una ruta secundaria vuelve a la pantalla que la abrió.

## 11. Seguridad y privacidad

La app pide la cámara para leer el QR y la ubicación desde Ajustes. No guarda la foto de la memoria. No debe contener secretos de servicio. La cuenta de la spec 004 guarda solo el par de tokens, en almacenamiento seguro cuando hay API y en memoria cuando no la hay. No escribe contraseñas ni códigos.

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
| Icono de launcher y aviso | El PNG a color y la silueta blanca ya están en `src/assets/icon/`. La publicación en tienda sigue en la spec 008, en borrador |
| Favoritos del visitante | El corazón y «Animales favoritos» usan la cuenta (`mobile-014`). Colección no filtra favoritos. Esta nota no cierra un PR |
| Mapa y recorrido 3D | Siguen abiertos (`mobile-007`, `mobile-009`). No se documentan aquí como terminados |
| Retirar referencia visual temporal | `arca-ui-reference` no es una dependencia y se mantiene fuera de Git |
| Confundir enmienda 002 con spec 004 | La cuenta de 004 vive en `src/session`. Sin `EXPO_PUBLIC_API_URL` sigue el mock. Con esa variable, el teléfono usa la API de pruebas y `expo-secure-store`. |

## 16. Validación

- La estructura de código queda limitada a `apps/mobile/src`.
- Las capacidades mock y las futuras se identifican explícitamente.
- Expo está aprobado por ADR 0004; las integraciones de hardware no se asumen aprobadas por ese ADR.
