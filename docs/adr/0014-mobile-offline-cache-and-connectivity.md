# 0014 · Caché offline y detección de conectividad en la app móvil

- Estado: Aceptado
- Solicitada: 2026-10-22
- Aprobada: 2026-10-22
- Spec relacionada: `apps/mobile/specs/003-api-read-integration.md`

## Contexto

`mobile-003` exige dos comportamientos que hoy no se cumplen en un dispositivo real:

- **CA-05 / RN-03:** la caché *Stale-While-Revalidate* debe persistir en `AsyncStorage` con TTL de 5 minutos. El código usa `MemoryKeyValueStorage` (un `Map`), así que la caché muere al cerrar la app.
- **CA-04 / RN-04:** sin red y con caché disponible, la UI debe mostrar los datos guardados y el indicador «Modo sin conexión». `HomeScreen` acepta `isOffline`, pero ninguna ruta lo envía, así que el `OfflineBanner` es código muerto.

El ADR 0011 (estado **Aceptado**) ya nombra `@react-native-async-storage/async-storage` como dependencia móvil aprobada, para «cola de escaneos sin conexión y caché no sensible». Este ADR acota ese uso al catálogo público y resuelve la detección de conectividad, que ningún ADR cubre todavía.

La app usa Expo SDK 57 / React Native 0.86 (ADR 0004).

## Enmienda · Favoritos de la cuenta

La lista de verdad es la cuenta (`mobile-014`, `api-018`). El teléfono guarda la última respuesta en `visitor.favorite-species-ids` para mostrarla sin red. La clave anterior `visitor.favorite-animal-ids` solo sirve para una subida única. El cache de catálogo y eventos de esta decisión no cambia.

## Decisión

1. **Persistencia:** agregar `@react-native-async-storage/async-storage` como almacenamiento de la caché SWR del catálogo y los eventos. Solo datos públicos del zoológico; nunca tokens, credenciales ni datos personales.
2. **Conectividad:** agregar `expo-network` para detectar el estado de red y alimentar el estado `offline`. Se prefiere sobre `@react-native-community/netinfo` por ser un módulo del mismo ecosistema Expo, sin configuración nativa adicional.
3. **Un solo origen de verdad:** un hook `useNetworkStatus()` expone `isOffline` y las rutas lo pasan a las pantallas; los repositorios no cambian su contrato (`AnimalRepository`, `ZooRepository`).
4. **Semántica offline:**
   - Con red: SWR normal (caché fresca → devolver; caché vencida → devolver y revalidar en segundo plano).
   - Sin red y con caché: mostrar datos cacheados + `OfflineBanner`.
   - Sin red y sin caché: estado `error` con mensaje en español.
5. **Instalación:** ambas dependencias se fijan con `npx expo install` para respetar las versiones compatibles con SDK 57; no se editan paquetes a mano.
6. **Alcance de datos:** la caché guarda únicamente respuestas de `/species` y `/events`. `expo-secure-store` sigue reservado para tokens de visitante (ADR 0011).
7. **Sin cambios de esquema ni backend:** esta decisión es solo de cliente.

## Alternativas consideradas

| Alternativa | A favor | En contra |
|---|---|---|
| `expo-network` (elegida) | Módulo Expo, coherente con SDK 57, `useNetworkState()` integrado, menos configuración | Menos granularidad que NetInfo para tipos de conexión |
| `@react-native-community/netinfo` | Muy maduro, detecta tipo de red y calidad | Requiere configuración nativa adicional y puede exigir dev build |
| Sin dependencia: derivar `offline` del fallo del repositorio | Cero dependencias | No distingue «sin red» de «servidor caído», obliga a cambiar el contrato de repositorios y no detecta reconexión |
| `navigator.onLine` | Sin dependencias | No es fiable en React Native |
| `react-native-mmkv` en lugar de AsyncStorage | Más rápido | Dependencia nueva no contemplada en ADR 0011; no aporta valor para este volumen |

## Consecuencias

### Positivas

- CA-04, CA-05, RN-03 y RN-04 quedan realizables en dispositivo real.
- La caché sobrevive al cierre de la app, que es el caso normal de uso en el parque.
- La detección de red queda aislada en un hook y no contamina repositorios ni componentes.
- Solo se persisten datos públicos; el riesgo de privacidad es mínimo.

### Riesgos o costos

- ADR 0011 (Aceptado) define la identidad del visitante; este ADR no la altera ni la aprueba por sí mismo.
- Toda dependencia nueva exige actualizar el `plan` y `tasks` de `mobile-003`, y agregar pruebas que simulen red caída.
- `expo-network` debe verificarse en Expo Go antes de fijar la versión; si no está disponible, el equipo deberá optar por NetInfo o por un dev build.
- La caché persistente puede mostrar datos obsoletos hasta que la revalidación termine; se mitiga con el TTL de 5 minutos y el indicador de modo offline.

## Validación y revisión

- Elección de `expo-network` confirmada por el equipo. El ADR se aprobó como conjunto (AsyncStorage + semántica offline) antes de instalar las dependencias.
- La implementación se rige por `apps/mobile/plan/003-api-read-integration.md` y `apps/mobile/tasks/003-api-read-integration.md`: sustitución de `MemoryKeyValueStorage` por AsyncStorage, conexión de `isOffline` en las rutas de catálogo/eventos y pruebas de CA-04/CA-05 con red simulada.
- Aprobación: Equipo ARCA-NB. Revisión móvil: Equipo móvil.
