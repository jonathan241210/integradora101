# Plan técnico · 007 · map-location

- Spec: `apps/mobile/specs/007-map-location.md`
- Estado de spec: Aprobada (2026-10-22)
- Estado del plan: Aprobado (2026-10-22)
- Responsable técnico: Víctor Adrián
- Revisión móvil: Aksel
- ADR de renderizado: `docs/adr/0015-mobile-svg-map-rendering.md` (Aceptado 2026-10-22)
- Brief del SVG: `apps/mobile/docs/007-svg-brief.md`
- Borrador visual: `apps/mobile/docs/007-map-v1-draft.svg`

## Resumen

La V1 implementa un mapa 2D esquemático del zoológico con un SVG propio, secciones fijas y marcadores obtenidos de un fixture local. No usa GPS, API, proveedor de mapas ni DBR. El objetivo es que el visitante pueda orientarse, consultar puntos de interés, filtrar y encontrar un destino desde la búsqueda.

El mapa no representa calles ni geografía real. El SVG es el fondo; los puntos se superponen como datos.

## Arquitectura

```mermaid
flowchart TD
    Route[app/(tabs)/map.tsx] --> Screen[MapScreen]
    Screen --> VM[useMapViewModel]
    VM --> Repo[MapRepository]
    Repo --> Fixture[MOCK_MAP_PLACES]
    Screen --> SVG[ZooMapSvg]
    Screen --> Marker[MapMarker]
    Screen --> Detail[MapPlaceCard]
    Search[app/(tabs)/search.tsx] -->|focus=placeId| Route
```

- `MapScreen` es una vista de presentación; no importa repositorios ni mocks.
- `useMapViewModel` concentra carga, filtros, selección, error y reintento.
- `MapRepository` abstrae la fuente; en V1 devuelve el fixture y en V1.1 podrá devolver la API.
- `ZooMapSvg` contiene solo el fondo y las secciones.
- `MapMarker` y `MapPlaceCard` son componentes de presentación.

## Cambios por área

| Área | Archivos previstos | Propósito |
|---|---|---|
| Modelos | `apps/mobile/src/models/index.ts` | Sustituir `MapLocation` por `MapPlace`/`MapSection`; posiciones `mapX`/`mapY`; filtros tipados. |
| Fixture | `apps/mobile/src/mocks/zoo.ts` | Crear 8–10 puntos de prueba visibles y secciones; retirar la ruta simulada del mapa. |
| Repositorio | `apps/mobile/src/repositories/index.ts` | Cambiar `MapRepository` a `getPlaces()`; devolver fixture; conservar la interfaz para V1.1. |
| ViewModel | `apps/mobile/src/viewmodels/useMapViewModel.ts` | Exponer `places`, `filteredPlaces`, `selectedPlace`, `isLoading`, `error`, `retry`, `selectPlace`, `setFilter` y `focusPlace`. |
| SVG | `apps/mobile/src/components/map/ZooMapSvg.tsx` | Renderizar el plano esquemático, secciones y resaltado con `react-native-svg`. |
| Marcadores | `apps/mobile/src/components/map/MapMarker.tsx` | Pin accesible posicionado con `mapX`/`mapY`. |
| Detalle | `apps/mobile/src/components/map/MapPlaceCard.tsx` | Tarjeta inferior con nombre, tipo, sección y descripción. |
| Pantalla | `apps/mobile/src/screens/MapScreen.tsx` | Integrar SVG, marcadores, filtros, detalle, estados y búsqueda. |
| Ruta del mapa | `apps/mobile/src/app/(tabs)/map.tsx` | Leer `focus` de la URL y conectar el ViewModel. |
| Búsqueda | `apps/mobile/src/app/(tabs)/search.tsx` | Si `returnTo=map`, volver al mapa con `focus=<animalId>` en lugar de abrir el 3D. |
| Pruebas | `apps/mobile/__tests__/map*.test.ts(x)` | Cobertura de CA-01 a CA-08. |
| Configuración de pruebas | `apps/mobile/jest.setup.js` | Mock de `react-native-svg` si Jest lo requiere. |
| Documentación | `apps/mobile/docs/003-008-roadmap-y-asignacion.md` | Registrar el estado de 007 y el alcance V1. |

## Contrato de datos V1

```ts
export type MapPlaceKind = 'animal' | 'service' | 'entrance';

export interface MapSection {
  id: string;
  name: string;
  svgZoneId: string;
}

export interface MapPlace {
  id: string;
  name: string;
  kind: MapPlaceKind;
  sectionId: string;
  description?: string;
  mapX: number; // 0..1
  mapY: number; // 0..1
  visible: boolean;
}

export type MapFilter = 'all' | 'animal' | 'service';
```

- `sectionId` coincide con el `id` de la zona del SVG en V1 (`zone-felines`, `zone-birds`, etc.).
- `mapX`/`mapY` son relativos al contenedor del mapa, no píxeles del dispositivo.
- `visible` filtra lo que se muestra; la web del encargado será la fuente en V1.1.
- No se incluyen `latitude`, `longitude` ni `radius` en V1.

## Fixture inicial

Se usarán 8–10 puntos de prueba, por ejemplo:

| id | Nombre | Tipo | Sección | mapX | mapY |
|---|---|---|---|---|---|
| `tiger-habitat` | Hábitat del Tigre | animal | `zone-felines` | 0.23 | 0.25 |
| `bird-aviary` | Aviario | animal | `zone-birds` | 0.77 | 0.25 |
| `penguin-cove` | Cala de Pingüinos | animal | `zone-aquatic` | 0.23 | 0.55 |
| `reptile-house` | Herpetario | animal | `zone-reptiles` | 0.77 | 0.55 |
| `giraffe-area` | Zona de Jirafas | animal | `zone-herbivores` | 0.23 | 0.76 |
| `restrooms` | Baños | service | `zone-services` | 0.77 | 0.76 |
| `food-court` | Comida | service | `zone-services` | 0.70 | 0.82 |
| `main-entrance` | Entrada principal | entrance | `zone-entrance` | 0.50 | 0.90 |

Los valores exactos se ajustan al SVG final. Los IDs de animales pueden coincidir con los del catálogo para que la búsqueda pueda enfocar un punto.

## SVG y marcadores

- `ZooMapSvg` usa `Svg` con `viewBox="0 0 1000 1400"` y `preserveAspectRatio="xMidYMid meet"`.
- Cada sección es una forma cerrada con `id` (`zone-felines`, `zone-birds`, `zone-aquatic`, `zone-reptiles`, `zone-herbivores`, `zone-services`, `zone-entrance`, `zone-plaza`).
- Los colores se toman de `@arca/tokens`; no se fijan colores de marca en el componente.
- La sección enfocada cambia de relleno o borde y recibe un indicador textual/visual, no solo color.
- Los marcadores se renderizan fuera del SVG, en un contenedor con la misma relación de aspecto.
- Cada marcador es un `Pressable` con `accessibilityRole="button"`, `accessibilityLabel` en español y estado seleccionado.
- El SVG no incluye pines, animales, botones ni textos de interfaz.

## Estados de UI

| Estado | Comportamiento |
|---|---|
| `loading` | Indicador de carga mientras el repositorio resuelve. |
| `success` | SVG + marcadores + filtros + búsqueda. |
| `empty` | Sin puntos visibles o filtro sin resultados; mensaje en español y mapa visible. |
| `error` | Error del repositorio; mensaje en español y botón “Reintentar”. |
| `offline` | No aplica una lógica de red en V1; el SVG y el fixture son locales. Si el repositorio falla, se usa `error`. |

No se muestra un estado “sin conexión” artificial porque la V1 no consume red.

## Búsqueda y destino

- El botón “Buscar animales” del mapa abre `/search` con `selectForTour=true` y `returnTo=map`.
- `search.tsx` distingue:
  - `returnTo=map`: al elegir un animal, `router.replace({ pathname: '/map', params: { focus: animal.id } })`.
  - `returnTo=tour-3d`: conserva el flujo actual del recorrido 3D.
- `map.tsx` lee `focus` y llama a `focusPlace(focus)`.
- Si el `focus` no coincide con un punto visible, se muestra un aviso en español y no se resalta nada.
- No se muestran duración, distancia ni pasos de ruta.

## Dependencia y pruebas

- `react-native-svg` está instalado con `npx expo install react-native-svg` (versión `15.15.4`).
- Las dependencias transitivas de Expo se alinearon con `expo/bundledNativeModules.json`: `react-native-worklets@0.10.1` y `react-native-reanimated@4.5.1`, mediante `overrides` en el `package.json` raíz. Esto evita que Expo Go cargue versiones nativas incompatibles.
- `expo@57.0.31` y `expo-router@57.0.29` se actualizaron con `npx expo install --fix`; `npx expo install --check` reporta dependencias al día.
- Jest renderiza `react-native-svg` con `jest-expo`; no fue necesario agregar un mock en `jest.setup.js`.
- No se agrega `expo-location`, `expo-camera` ni SDK de mapas.

## Mapeo de criterios a pruebas

| Criterio | Prueba prevista | Ubicación |
|---|---|---|
| **CA-01** Mapa esquemático | Renderiza SVG, secciones y acceso sin red | `apps/mobile/__tests__/mapScreen.test.tsx` |
| **CA-02** Puntos desde datos | Repositorio devuelve visibles; marcador usa `mapX`/`mapY` | `apps/mobile/__tests__/mapRepository.test.ts` y `mapScreen.test.tsx` |
| **CA-03** Detalle del punto | Tocar marcador abre y cierra detalle accesible | `apps/mobile/__tests__/mapScreen.test.tsx` |
| **CA-04** Filtros | “Todo”, “Animales” y “Servicios”; estado vacío | `apps/mobile/__tests__/mapScreen.test.tsx` |
| **CA-05** Destino desde búsqueda | `focus` resalta sección/marcador; no hay ruta simulada | `apps/mobile/__tests__/mapScreen.test.tsx` |
| **CA-06** Offline y errores | Fixture local; error con reintento; vacío | `apps/mobile/__tests__/mapViewModel.test.ts` |
| **CA-07** MVVM, tokens y accesibilidad | Sin imports de repositorio en vistas; etiquetas y contraste | `apps/mobile/__tests__/mapAccessibility.test.tsx` |
| **CA-08** Pruebas por criterio | La suite nombra CA-01 a CA-08 y pasa | Todos los archivos de mapa |

## Constitution Check

| Principio | Cumplimiento |
|---|---|
| **I. Stack mínimo y portable** | Se agrega `react-native-svg`, dependencia compatible con Expo; requiere ADR 0015 aprobado. No hay servicios propietarios ni claves. |
| **II. La spec manda** | Spec aprobada, plan y tasks con el mismo NNN; no se implementa alcance fuera de V1. |
| **III. Lógica separada de la interfaz** | `MapScreen` solo presenta; `useMapViewModel` orquesta; `MapRepository` entrega datos. Sin `fetch` ni lógica de negocio en componentes. |
| **IV. Un test por criterio** | Tabla CA → prueba; se ejecuta Jest con `--runInBand`. |
| **V. Una sola fuente de verdad** | V1 no modifica la BD ni crea DBR; el fixture es datos de presentación temporal. La API/DBR se abrirán en V1.1. |
| **VI. Código en inglés, personas en español** | IDs, tipos y archivos en inglés; UI, mensajes y docs en español. |

## Riesgos y mitigaciones

- **ADR 0015 aceptado:** `react-native-svg` quedó aprobado e instalado; no se agregan SDK de mapas.
- **Desalineación SVG/marcadores:** usar coordenadas normalizadas y un contenedor con relación de aspecto fija.
- **Mapa ambiguo:** etiquetas legibles, leyenda y resaltado con más de un indicador además del color.
- **Búsqueda sin coincidencia:** mostrar aviso claro; no inventar una ubicación.
- **Pruebas de SVG en Jest:** `jest-expo` renderiza `react-native-svg`; no se requirió mock.
- **Alcance:** no agregar GPS, API, DBR, rutas ni 3D durante la implementación.

## Verificación

- `npx jest --runInBand` en `apps/mobile`: 27 suites y 132 pruebas aprobadas (2026-10-22).
- `npx tsc --noEmit` en `apps/mobile`: sin errores.
- Revisión visual en Expo Go/Android con el SVG final: pendiente.
- `/verify` para las apps tocadas.
- Actualizar `apps/mobile/docs/003-008-roadmap-y-asignacion.md` al cerrar.

## Aprobación

- Plan aprobado funcional y técnicamente el 2026-10-22.
- ADR 0015 aceptado el 2026-10-22.
- Implementación V1 ejecutada; revisión técnica de Aksel y validación visual en Android/Expo Go pendientes.
