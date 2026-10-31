# Plan técnico · 003 · api-read-integration

- Spec: `apps/mobile/specs/003-api-read-integration.md`
- Estado de spec: Aprobada
- Responsable técnico: Víctor Adrián (responsable BD / plan técnico); Aksel (revisión móvil)

## Diseño de solución

Este plan técnico implementa la integración de lectura entre la aplicación móvil (`apps/mobile`) y la API central Laravel (`apps/api`) para el catálogo de especies/animales y eventos del zoológico, conforme a la spec aprobada `mobile-003` y los estándares de arquitectura móvil (`apps/mobile/docs/estandares-integracion-api.md`).

### Flujo desacoplado MVVM y Stale-While-Revalidate (SWR):

```mermaid
flowchart TD
    subgraph UI [Capa de Presentación]
        Screen[Screen / Component] -->|Observa estado| VM[ViewModel Hook]
    end

    subgraph Dominio [Capa de Dominio]
        VM -->|Llama método| RepoContract[AnimalRepository / ZooRepository]
        RepoContract --> RepoImpl[ApiAnimalRepository / ApiZooRepository]
    end

    subgraph Infra [Capa de Infraestructura y Red]
        RepoImpl -->|1. Lee de inmediato| Storage[(AsyncStorage Cache)]
        RepoImpl -->|2. Si stale > 5 min| Client[@arca/api-client createHttpClient]
        Client -->|3. HTTP GET| API[Laravel API v1]
        API -->|Respuesta JSON snake_case| Mapper[Mapper Adaptador]
        Mapper -->|Modelo UI camelCase| RepoImpl
        RepoImpl -->|Actualiza| Storage
        RepoImpl -->|Notifica nuevo estado| VM
    end
```

### Principios del diseño:
1. **Desacoplamiento total:** Las vistas (`screens/`) no saben de dónde provienen los datos ni llaman a `fetch`/`axios`/`@arca/api-client`. Solo reciben propiedades y estados desde los ViewModels.
2. **5 Estados en UI:** Todas las vistas asíncronas implementan de forma reactiva `loading`, `success`, `empty`, `error` y `offline`.
3. **Persistencia SWR con TTL:** La caché local en `AsyncStorage` responde inmediatamente (zero latency). Si el dato tiene más de 5 minutos (300 s), se dispara revalidación en segundo plano sin bloquear la navegación.
4. **Respaldo visual:** Las imágenes remotas implementan estados de carga con tinte de respaldo predeterminado (`placeholderTint`) y manejo de fallos para evitar pantallas vacías o roturas de maquetación.
5. **Alternancia ágil Mocks/API:** Una variable de entorno `EXPO_PUBLIC_USE_MOCKS` (o fallback en repositorio) permite alternar entre `MockAnimalRepository`/`MockZooRepository` e implementaciones reales `ApiAnimalRepository`/`ApiZooRepository`.

---

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| **Infraestructura de Red Móvil** | `apps/mobile/src/repositories/apiAnimalRepository.ts`<br>`apps/mobile/src/repositories/apiZooRepository.ts` | Implementaciones reales que consumen `@arca/api-client` mediante `createHttpClient` con persistencia en `AsyncStorage`. |
| **Adaptadores y Mapeo** | `apps/mobile/src/repositories/mappers.ts` | Normalización de payloads de API en `snake_case` a modelos de dominio en `camelCase` (`Animal`, `ZooEvent`). |
| **Contratos de Repositorio** | `apps/mobile/src/repositories/index.ts` | Ampliación de la interfaz `ZooRepository` (`getEventById`) y exportación centralizada mediante factoría según `EXPO_PUBLIC_USE_MOCKS`. |
| **Capa de Presentación / UI** | `apps/mobile/src/components/ui/OfflineBanner.tsx`<br>`apps/mobile/src/components/ui/StateViews.tsx`<br>`apps/mobile/src/components/ui/RemoteImage.tsx` | Componentes reutilizables para banner offline, estados de carga/error/vacío y fallback tolerante a fallos de imágenes. |
| **ViewModels** | `apps/mobile/src/viewmodels/useHomeViewModel.ts`<br>`apps/mobile/src/viewmodels/useAnimalViewModel.ts`<br>`apps/mobile/src/viewmodels/useEventViewModel.ts`<br>`apps/mobile/src/viewmodels/useNetworkStatus.ts` | Exposición tipada de los 5 estados (`ViewState`), reintentos (`retry`) y conectividad (`isOffline`). |
| **Rutas y Vistas** | `apps/mobile/src/screens/HomeScreen.tsx`<br>`apps/mobile/src/screens/CollectionScreen.tsx`<br>`apps/mobile/src/screens/SearchScreen.tsx`<br>`apps/mobile/src/screens/AnimalDetailScreen.tsx`<br>`apps/mobile/src/screens/EventDetailScreen.tsx`<br>`apps/mobile/src/app/(tabs)/index.tsx`<br>`apps/mobile/src/app/(tabs)/collection.tsx`<br>`apps/mobile/src/app/(tabs)/search.tsx`<br>`apps/mobile/src/app/animal/[id].tsx`<br>`apps/mobile/src/app/(tabs)/event-detail.tsx` | Enlace de las pantallas móviles para mostrar los datos reales de animales y eventos con los 5 estados de UI y el banner offline. |
| **Datos de Prueba (Backend/BD)** | `docs/database/fixtures/sample-catalog-events.sql` | Registros de prueba de catálogo y eventos en `arca_pruebas` para pruebas locales y en emulador. |
| **Pruebas Automatizadas** | `apps/mobile/__tests__/apiAnimalRepository.test.ts`<br>`apps/mobile/__tests__/apiZooRepository.test.ts`<br>`apps/mobile/__tests__/catalogUiStates.test.tsx`<br>`apps/mobile/__tests__/networkStatus.test.tsx` | Tests unitarios Jest que cubren `CA-01` a `CA-07` con cliente simulado y `--runInBand`. |

---

## Contrato y datos

### 1. Endpoints consumidos (API v1 Pública)

| Método HTTP | Ruta Contractual | Autenticación | Respuesta exitosa | Modelo UI resultante |
|---|---|---|---|---|
| `GET` | `/species` | Ninguna | `{ data: SpeciesApiResponse[] }` | `Animal[]` |
| `GET` | `/species/{id}` | Ninguna | `{ data: SpeciesDetailApiResponse }` | `Animal` |
| `GET` | `/events` | Ninguna | `{ data: EventApiResponse[] }` | `ZooEvent[]` |
| `GET` | `/events/{id}` | Ninguna | `{ data: EventDetailApiResponse }` | `ZooEvent` |

### 2. Estructura de mapeo real (snake_case a camelCase)

`mappers.ts` tolera el contrato de `api-006` y campos legados:

```typescript
// SpeciesApiResponse -> Animal
{
  id: String(item.id),
  nickname: item.common_name,
  commonName: item.common_name,
  scientificName: item.scientific_name,
  imageUrl: item.image_url ?? item.photo_path ?? undefined,
  category: normalizeCategory(item.category),
  zone: item.zone_name ?? 'Zona General',
  isDiscovered: false, // Fuera de alcance en mobile-003, reservado para mobile-005
  placeholderTint: item.placeholder_tint ?? '#8A9A5B',
  stats: {
    avgWeight: item.avg_weight ?? '',
    size: item.size ?? (item.size_cm ? `${item.size_cm} cm` : ''),
    lifeExpectancy: item.life_expectancy ?? item.longevity ?? '',
  },
  diet: item.diet ?? item.diet_description,
  curiosities: item.curiosities ?? item.characteristics,
  funFact: item.fun_fact,
}

// EventApiResponse -> ZooEvent
{
  id: String(item.id),
  title: item.name ?? item.title ?? 'Evento en el Zoológico',
  date: item.start_date ?? item.date ?? '',
  time: item.start_time ? `${item.start_time.substring(0, 5)} hrs` : item.time ?? '',
  location: item.location ?? 'Nicolás Bravo',
  description: item.description ?? '',
  imageUrls: item.image_path ? [item.image_path] : item.image_urls ?? undefined,
}
```

Los campos que `api-006` no expone (`avg_weight`, `fun_fact`, `placeholder_tint`) quedan vacíos o con el valor por defecto; la UI oculta las estadísticas vacías (por ejemplo, «Peso») en lugar de mostrar tarjetas sin contenido.

### 3. Base de datos y datos de prueba

- **Esquema de BD:** Esta spec móvil no altera el esquema. Utiliza las tablas existentes en `arca_pruebas`:
  - `species` (`id`, `common_name`, `scientific_name`, `category`, `distribution`, `conservation_status`, `habitat`, `gestation_period`, `size_cm`, `model_3d_path`).
  - `animals` (`id`, `species_id`, `enclosure_id`, `photo_path`, `longevity`, `diet`, `characteristics`, `entry_date`, `stay_status`).
  - `enclosures` (`id`, `name`).
  - `events` (`id`, `name`, `description`, `image_path`, `start_date`, `end_date`, `start_time`, `end_time`, `location`, `is_active`).
- **Registros de prueba para desarrollo/emulador:**
  Para verificar en emulador y que la pantalla móvil muestre eventos y animales reales, se provee un script SQL de datos de prueba (`docs/database/fixtures/sample-catalog-events.sql`) aplicable en `arca_pruebas` que introduce:
  - 5 especies de prueba con fotos y datos educativos (Jaguar, León, Guacamaya Verde, Cocodrilo de Pantano, Nutria de Río).
  - 3 eventos del zoológico de prueba (Plática Educativa de Felinos, Taller Infantil de Huellas, Alimentación de Aves).

---

## Seguridad, offline y operación

1. **Seguridad y mínimos privilegios:**
   - No se envían credenciales ni cabeceras `Authorization` para estos endpoints.
   - Las URLs base se configuran a través de `process.env.EXPO_PUBLIC_API_URL`.
   - No se exponen claves de base de datos ni tokens en la app móvil.
2. **Estrategia Offline y Almacenamiento Local (ADR 0014):**
   - Persistencia real con `@react-native-async-storage/async-storage`; `MemoryKeyValueStorage` queda disponible solo para inyección en pruebas.
   - Detección de conectividad con `expo-network` mediante `useNetworkStatus` (`isConnected === false` o `isInternetReachable === false`). El estado offline **no** se infiere de un fallo HTTP.
   - Llaves en `AsyncStorage`:
     - `@arca:cache:species_list`
     - `@arca:cache:species:{id}`
     - `@arca:cache:events_list`
     - `@arca:cache:event:{id}`
   - Estructura del registro de caché:
     ```typescript
     interface CacheEnvelope<T> {
       data: T;
       cachedAt: number; // timestamp en milisegundos
       ttlMs: number;    // 300,000 ms (5 minutos)
     }
     ```
   - Algoritmo:
     - Si `Date.now() - cachedAt < ttlMs`: Retornar `data` fresco. Estado: `success`.
     - Si `Date.now() - cachedAt >= ttlMs`: Retornar `data` existente e iniciar `fetch` en segundo plano. Si el `fetch` tiene éxito, actualizar caché. Si falla, retener `data` y mostrar el banner según `useNetworkStatus`.
     - Si no hay caché y el `fetch` falla: Emitir `error` para renderizar pantalla de error con reintento.
   - El banner `OfflineBanner` se muestra en Inicio, Colección, Búsqueda y los detalles de animal y evento cuando `isOffline` es verdadero.
   - Solo se guardan datos públicos del catálogo; nunca tokens, credenciales ni datos personales.

---

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| **CA-01** (Listado de animales desde API vía `@arca/api-client`) | `should fetch and map species list from API using createHttpClient and camelCase format` | `apps/mobile/__tests__/apiAnimalRepository.test.ts` |
| **CA-02** (Detalle de animal desde API) | `should fetch species detail by ID or return null on 404` | `apps/mobile/__tests__/apiAnimalRepository.test.ts` |
| **CA-03** (Listado y detalle de eventos desde API) | `should fetch events list and event detail by ID using ApiZooRepository` | `apps/mobile/__tests__/apiZooRepository.test.ts` |
| **CA-04** (Gestión de los 5 estados de UI: loading, empty, error, success, offline) | `CA-04: OfflineBanner se muestra cuando isOffline es verdadero` + `useNetworkStatus` marca offline con `isConnected: false` | `apps/mobile/__tests__/catalogUiStates.test.tsx`, `apps/mobile/__tests__/networkStatus.test.tsx` |
| **CA-05** (Caché SWR y TTL de 5 minutos) | `should return cached data immediately and revalidate in background when TTL > 5 mins` | `apps/mobile/__tests__/apiAnimalRepository.test.ts` |
| **CA-06** (Imágenes con respaldo y tolerancia a fallos) | `should display placeholder tint and fallback component when image fails or loads` | `apps/mobile/__tests__/catalogUiStates.test.tsx` |
| **CA-07** (Arquitectura MVVM y ejecución Jest `--runInBand`) | `suite passes with no direct fetch in screens and covers all CA-xx tags` | `apps/mobile/__tests__/*` |

---

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| **I. Stack mínimo y portable** | SÍ | Se utiliza el stack declarado (React Native / Expo con TypeScript, `@arca/api-client`) y dos dependencias aprobadas por el ADR 0014: `@react-native-async-storage/async-storage` y `expo-network`. La BD es MySQL 8.0.x compatible, en Aiven o local, sin dependencias propietarias de nube. |
| **II. La spec manda** | SÍ | La spec `apps/mobile/specs/003-api-read-integration.md` está en estado **Aprobada**. Este plan cubre exactamente su alcance sin añadir funcionalidades no contempladas. |
| **III. Lógica separada de la interfaz** | SÍ | Las pantallas (`screens/`) no realizan llamadas HTTP. Toda la comunicación con la API se delega en Repositorios y `@arca/api-client`. Los ViewModels gestionan el estado y las vistas solo renderizan. |
| **IV. Un test por criterio** | SÍ | Cada criterio `CA-01` a `CA-07` tiene asignada una prueba unitaria específica en Jest nombrada con el código del criterio. |
| **V. Una sola fuente de verdad para los datos** | SÍ | La base de datos MySQL en `apps/api` es la única autoridad de datos. La app móvil almacena en `AsyncStorage` solo copias de lectura transitorias para disponibilidad offline. |
| **VI. Código en inglés, personas en español** | SÍ | Métodos, tipos, variables, rutas y commits en inglés (`ApiAnimalRepository`, `getEventById`, `cachedAt`). Textos de interfaz, mensajes de error y estados de UI en español. |

---

## Riesgos y decisiones

- **ADRs aplicables:**
  - [ADR 0004](../../../docs/adr/0004-mobile-react-native.md): React Native y Expo para aplicación de visitantes.
  - [ADR 0011](../../../docs/adr/0011-visitor-identity-and-mobile-session.md): Desacoplamiento de cliente público y arquitectura de sesión.
  - [ADR 0014](../../../docs/adr/0014-mobile-offline-cache-and-connectivity.md): caché offline con AsyncStorage y detección de conectividad con `expo-network` (Aceptado, 2026-10-22).
- **Riesgo:** Si los endpoints Laravel aún no están desplegados en el backend mientras se prueba la UI en dispositivo.
  - **Mitigación:** La arquitectura conserva el switch `EXPO_PUBLIC_USE_MOCKS`. Si la variable está en `true`, la app utiliza los mocks locales; si está en `false`, conecta a la API real. De este modo el desarrollo no se bloquea.
- **Riesgo:** Concurrencia de hilos en pruebas Jest bajo entorno Windows.
  - **Mitigación:** Ejecutar Jest en serie mediante el parámetro `--runInBand` (`npm test -- --runInBand`).

---

## Orden y aprobación

### Secuencia de implementación técnica:
1. **Fase 1: Capa de Red y Mapeadores:**
   - Crear mappers `snake_case` → `camelCase`.
   - Implementar `ApiAnimalRepository` y `ApiZooRepository` con `createHttpClient` y caché `AsyncStorage` (TTL 5 min).
   - Crear tests unitarios para los repositorios (`CA-01`, `CA-02`, `CA-03`, `CA-05`).
2. **Fase 2: Componentes de Estado y UI:**
   - Crear componentes de UI reutilizables para `OfflineBanner`, `StateViews` (error, vacío, loading) y `RemoteImage` con fallback (`CA-04`, `CA-06`).
   - Crear tests de componentes de UI.
3. **Fase 3: Integración en Pantallas y ViewModels:**
   - Actualizar `useHomeViewModel`, `useAnimalViewModel` y `HomeScreen`, `AnimalDetailScreen`, `event-detail`.
   - Conectar fábricas de repositorios en `repositories/index.ts`.
4. **Fase 4: Fixtures de BD y Verificación Integral:**
   - Registrar script SQL con datos de prueba de eventos y especies en `docs/database/fixtures/`.
   - Ejecutar suite completa con `/verify` (`npm test -- --runInBand`).

### Aprobación:
- **Aprobador funcional y técnico:** Víctor Adrián (2026-10-20)
- **ADR 0014 (caché y conectividad):** aceptado por Víctor Adrián (2026-10-22)
- **Coordinación móvil:** Aksel
