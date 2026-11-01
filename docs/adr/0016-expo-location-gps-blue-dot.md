# 0016 — Ubicación GPS en tiempo real con expo-location (mapa V2)

- Estado: Aceptado
- Fecha: 2026-10-29
- Aprobado por: Víctor Adrián (2026-10-29)
- Spec relacionada: `apps/mobile/specs/007-map-location.md` (V2, aún no redactada)
- Autor: Víctor Adrián

---

## Contexto

La V1 de `mobile-007` implementó un mapa 2D esquemático SVG sin GPS ni servicios externos (ADR 0015). El visitante puede consultar recintos, filtrarlos y ubicarlos en el plano, pero no sabe dónde está él en el mapa.

La V2 requiere:

1. **Punto azul** — mostrar la posición real del visitante sobre el SVG a medida que camina.
2. **Detección de llegada a un recinto** — notificar cuando el visitante está a menos de N metros de un recinto de destino (geocerca de radio fijo, primer plano únicamente).
3. **Posición de entrada** — si el GPS no tiene señal suficiente o el usuario acaba de abrir la app dentro del zoológico, mostrar el marcador de posición en la entrada principal como punto de partida seguro.

Para esto se necesita acceder al GPS del dispositivo. Las opciones son:

| Alternativa | Pro | Contra |
|---|---|---|
| `expo-location` | Ya en el ecosistema Expo SDK 57; sin configuración nativa extra; permiso declarativo en `app.json` | Solo GPS; sin ruteo externo |
| `react-native-geolocation-service` | Más preciso en Android | Requiere config nativa, incompatible con Expo Go sin dev-build |
| Proveedor de mapas (Google Maps, Mapbox) | Incluye GPS + ruteo | Costo, llave de API, dependencia externa, viola principio de autonomía offline |

La restricción del proyecto (Expo Go SDK 57, sin dev-build aún, offline-first) elimina las dos últimas opciones para la V2.

---

## Decisión

**Adoptar `expo-location` (SDK 57 compatible) como único proveedor de GPS** para la V2 del mapa móvil.

### Alcance de este ADR

- Instalar `expo-location` como dependencia de `apps/mobile`.
- Declarar `ACCESS_FINE_LOCATION` en `app.json` → `android.permissions`.
- Solicitar permiso **solo en primer plano** (`requestForegroundPermissionsAsync`); no se pedirá ubicación en segundo plano ni se registrarán tareas de fondo.
- El mapa sigue siendo funcional si el permiso es denegado (modo V1 sin punto azul).
- **No** se integra ningún proveedor de ruteo externo ni tile de mapa.

### Transformación GPS → coordenadas SVG

El SVG usa `viewBox="0 0 1000 1400"` con coordenadas relativas. Para superponer el punto azul se necesita mapear latitud/longitud a `(svgX, svgY)`.

**Estrategia: transformación afín de bounding-box (4 esquinas)**

```
svgX = (lon - lonMin) / (lonMax - lonMin) * SVG_WIDTH
svgY = (latMax - lat) / (latMax - latMin) * SVG_HEIGHT
```

Esto requiere medir en campo las coordenadas GPS de las **4 esquinas del zoológico Nicolás Bravo**. Hasta que se tengan esas mediciones, el punto azul usa la coordenada de la entrada principal como valor por defecto.

La función vivirá en `src/utils/geoTransform.ts` con tests unitarios (no requiere GPS real en Jest).

### Detección de llegada ("punto de interés alcanzado")

Se implementa como una **geocerca de radio fijo por software**, sin APIs de fondo:

```
distancia = haversine(userLat, userLon, poiLat, poiLon)   // metros
if distancia < ARRIVAL_RADIUS_METERS → disparar evento "arrived"
```

- `ARRIVAL_RADIUS_METERS` = 10 m (configurable en el ViewModel).
- El cálculo corre en el ViewModel (`useMapViewModel`) al recibir cada actualización de posición.
- Solo activo cuando hay un destino seleccionado por el usuario.
- No usa `startGeofencingAsync` (requiere tarea de fondo y permisos adicionales).

### Posición inicial en la entrada

Hasta que el GPS tenga precisión aceptable (`accuracy < 20 m`):
- El marcador se muestra en las coordenadas de la **entrada principal del zoológico** (constante en `src/constants/zoo.ts`).
- Se muestra un indicador visual de "buscando ubicación…" en lugar del punto azul sólido.

---

## Alternativas consideradas

1. **No hacer V2 y mantener mapa estático** — No satisface el caso de uso de orientación en tiempo real.
2. **`expo-task-manager` + geofencing nativo** — Requiere permisos de fondo, dev-build y un ADR adicional. Fuera de alcance para V2.
3. **Google Maps SDK / Mapbox** — Costo, llave API, elimina modo offline. Incompatible con los principios del proyecto.

---

## Consecuencias

### Positivas
- Sin dependencias externas de pago ni claves de API.
- Funciona en Expo Go SDK 57 sin dev-build.
- Modo degradado automático si el permiso es rechazado (el mapa V1 sigue funcionando).
- `geoTransform.ts` es pura lógica matemática → fácil de testear con coordenadas sintéticas.

### Riesgos o costos
- **Precisión GPS en interiores / bajo techo:** Los recintos cubiertos del zoológico pueden perder señal. Mitigación: indicador de precisión baja y posición anclada al último punto conocido.
- **Calibración de coordenadas real requiere visita al campo.** Hasta entonces, el SVG y los POIs usarán coordenadas de prueba y el punto azul se colocará en la entrada.
- **El SVG actual es de prueba**, no a escala real; la transformación afín no será precisa hasta tener el SVG definitivo y las coordenadas reales del zoológico.
- `expo-location` añade ~20 KB al bundle y aumenta el tiempo de arranque en ~50 ms (despreciable).
- Requiere declarar el permiso en `app.json`; el usuario verá el diálogo de permisos la primera vez.

### Dependencias con otras decisiones
- **ADR 0015** — El SVG y las coordenadas `mapX/mapY` normalizadas ya están definidas; `geoTransform.ts` produce valores del mismo tipo.
- **Spec 007 V2** — Este ADR es condición previa a su redacción. La spec definirá los CA de punto azul, geocerca y posición inicial.
- **SVG definitivo** — La calibración real depende del plano final del zoológico Nicolás Bravo (pendiente del área de diseño/encargado).
- **Coordenadas GPS reales** — Requieren medición física en el zoológico (4 esquinas + entrada principal).

---

## Validación y revisión

- [ ] Aprobación de Aksel (equipo móvil / revisión técnica)
- [ ] Confirmación de que `expo-location` ^17.x es compatible con SDK 57 (`npx expo install expo-location`)
- [ ] Medición de coordenadas GPS en campo (4 esquinas + entrada)
- [ ] Test unitario de `geoTransform.ts` con coordenadas sintéticas pasa en verde
- [ ] Spec 007 V2 redactada y aprobada antes de iniciar implementación

---

> **Nota sobre el SVG de prueba:** El plano SVG actual (`ZooMapSvg`) es un esquema de referencia sin escala real. Todas las coordenadas `mapX/mapY` de los POIs y la función `geoTransform` trabajarán con valores de prueba hasta que exista el SVG definitivo y las mediciones de campo. Esto no bloquea el desarrollo del punto azul; sí bloquea la precisión real.
