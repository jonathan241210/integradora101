# 0015 · Renderizado del mapa SVG en la app móvil

- Estado: Aceptado
- Fecha: 2026-10-22
- Spec relacionada: `apps/mobile/specs/007-map-location.md`
- Aprobación funcional registrada: Víctor Adrián (2026-10-22)
- Revisión técnica: Aksel (equipo móvil), pendiente de firma

## Contexto

`mobile-007` necesita un mapa 2D del zoológico para la primera versión funcional. El alcance aprobado no incluye GPS, proveedor de mapas, calles, satélite ni imágenes aéreas. El mapa será un plano esquemático de bajo detalle con secciones y puntos de interés.

El mapa actual de `mobile-002` usa `View`s y posiciones porcentuales. Para la V1 se necesita renderizar un SVG propio que:

- funcione sin conexión;
- no dependa de claves ni servicios de mapas;
- permita resaltar secciones;
- use colores de `@arca/tokens`;
- se pueda probar en Expo Go y en Android.

## Decisión

1. **Dependencia:** usar `react-native-svg` para renderizar el mapa.
2. **Implementación:** construir el fondo como un componente `ZooMapSvg.tsx` con primitivas SVG (`Svg`, `G`, `Rect`, `Path`, `Ellipse`, `Text`). El SVG de Figma/Claude es una referencia visual y se traduce al componente para poder cambiar colores y resaltar secciones.
3. **Sin proveedor de mapas:** no se agregan Google Maps, Mapbox, MapLibre ni SDK de mapas. El plano es propio y no geográfico.
4. **Sin GPS:** esta decisión no incluye `expo-location` ni permisos de ubicación.
5. **Marcadores fuera del SVG:** los puntos se superponen como componentes de React Native a partir de datos (`MapPlace`), no se dibujan dentro del SVG.
6. **Instalación:** fijar la versión compatible con Expo SDK 57 mediante `npx expo install react-native-svg`; no editar versiones a mano.

## Alternativas consideradas

| Alternativa | A favor | En contra |
|---|---|---|
| `react-native-svg` + componente (elegida) | Offline, sin claves, colores por tokens, resaltado dinámico, compatible con Expo | Dependencia nativa nueva; el SVG debe traducirse a componente |
| Google Maps / Mapbox / MapLibre | Calles, satélite y zoom reales | No se necesitan calles; claves, costos, configuración y posible desarrollo build |
| Imagen PNG del plano | Cero dependencia de SVG; simple | No escala bien, no permite resaltar secciones ni recolorear con tokens |
| WebView con el SVG | Aísla el dibujo | Más memoria, puente WebView, accesibilidad y pruebas más difíciles |
| `react-native-svg-transformer` | Importa archivos `.svg` como componentes | Configuración adicional de Metro; menos control para resaltar secciones y usar tokens |

## Consecuencias

### Positivas

- El mapa funciona sin red y sin costos de proveedor.
- No se solicitan permisos de ubicación en V1.
- Las secciones pueden resaltarse cuando el visitante busca un destino.
- Los colores se mantienen alineados con `@arca/tokens`.
- La app conserva una arquitectura MVVM y pruebas Jest sin SDK de mapas.

### Riesgos o costos

- `react-native-svg` debe verificarse en Expo Go y en el build Android antes de fijar la versión.
- El SVG de Figma/Claude puede requerir traducción manual a primitivas; se mitiga manteniendo el plano de bajo detalle.
- Si el zoológico cambia la distribución, hay que actualizar el componente y recalibrar los `mapX`/`mapY`.
- Esta decisión no resuelve el mapa geográfico ni el GPS; eso queda para una spec posterior.

## Validación y revisión

- Aprobación funcional de la dependencia registrada por Víctor Adrián el 2026-10-22.
- ADR aprobado por Víctor Adrián el 2026-10-22; la revisión técnica de Aksel queda registrada como pendiente de firma.
- Al aprobarse: instalar `react-native-svg` con `npx expo install`, crear `ZooMapSvg.tsx`, integrar el mapa y ejecutar pruebas de CA-01 a CA-08.
- Si el equipo rechaza la dependencia, la V1 debe replantearse con un PNG estático y perderá el resaltado dinámico de secciones.
