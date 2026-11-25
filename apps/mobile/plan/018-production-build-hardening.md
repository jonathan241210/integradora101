# Plan técnico · 018 · production-build-hardening

- Spec: `apps/mobile/specs/018-production-build-hardening.md`
- Estado de spec: Aprobada
- Solicitada: 2026-11-23
- Aprobada: 2026-11-23
- Responsable técnico: Equipo mobile

## Diseño de solución

Se endurece el cliente para el build de producción en tres frentes, sin cambios de API ni de esquema:

1. **Build y URL de la API.** `eas.json` gana el perfil `production` (sin `EXPO_USE_CLEARTEXT`, con `EXPO_PUBLIC_API_URL` en `https://`). Una función `resolveApiBaseUrl()` en `src/config/runtime.ts` reemplaza los tres respaldos `http://10.0.2.2:8000/api/v1`: con la variable definida la usa; sin ella, en desarrollo y pruebas devuelve la URL local y en producción lanza un error en español. `isMockDataEnabled()` concentra la regla de mocks (`EXPO_PUBLIC_USE_MOCKS=true` o pruebas) y la usan las factorías de repositorios.
2. **Datos reales del visitante.** `useUserViewModel` pasa a leer el progreso real mediante `useVisitorProgress` (repositorio `progressRepository` sobre `/visitor/progress|achievements|missions|collection`) y `useVisitorProfile` (`/visitor/me`). Expone `status` (`loading | guest | error | ready`), `error` y `refresh`. Con un `UserRepository` inyectado o con mocks habilitados conserva el camino de demostración. Los hitos se derivan de los logros obtenidos (no hay endpoint de hitos). Las rutas de inicio, perfil, juego, misiones, logros y colección muestran, según `status`, un estado vacío con «Iniciar sesión» o un error con «Reintentar» mediante la View `VisitorDataGate`/`VisitorDataNotice`. La cuenta usa `/visitor/me` (`useVisitorContentViewModel` ya no lee `MOCK_VISITOR_ACCOUNT` fuera de mocks).
3. **Fichas de recinto.** `getEnclosureAnimalsList` solo usa `ENCLOSURE_ANIMALS_CATALOG` y `MOCK_ANIMALS` cuando los mocks están habilitados; en otro caso devuelve vacío y la ficha muestra «Sin ejemplares para mostrar». Como la API deja de enviar `characteristics`, la curiosidad del ejemplar sale de `fun_fact` de la especie (`api-026`) y, si falta, de la descripción del recinto.

Fuera de alcance: geometría del mapa (`MOCK_MAP_PLACES`) y servicios fijos.

## Cambios por área

En `preview`, `app.config.js` comparte `EXPO_USE_CLEARTEXT` entre el manifiesto de Android y la configuración Expo que consulta `resolveApiBaseUrl()`. Metro incorpora las variables `EXPO_PUBLIC_*` mediante referencias directas a `process.env.VARIABLE`. La prueba CA-02 cubre `preview` compilado con `__DEV__` falso, así como la restricción HTTPS de `production`.

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Mobile / build | `apps/mobile/eas.json`, `apps/mobile/docs/018-production-build-hardening.md` | Perfil `production` y nota de sustitución de la URL en EAS. |
| Mobile / config | `apps/mobile/src/config/runtime.ts`, `repositories/apiAnimalRepository.ts`, `apiMapRepository.ts`, `apiZooRepository.ts`, `repositories/index.ts` | `resolveApiBaseUrl()` e `isMockDataEnabled()`. |
| Mobile / ViewModels | `viewmodels/useUserViewModel.ts`, `viewmodels/useAccessViewModels.ts`, `repositories/visitorAccessRepository.ts` | Datos reales, estados guest/error, cuenta real. |
| Mobile / Views | `components/ui/VisitorDataGate.tsx`, `screens/GameScreen.tsx`, `screens/HomeScreen.tsx`, `app/(tabs)/{index,game,achievements,achievement-detail,mission-detail,profile,collection,account}.tsx` | Estado vacío, error y reintento en español. |
| Mobile / recintos | `utils/enclosureAnimals.ts`, `components/map/EnclosureDetailModal.tsx`, `repositories/mappers.ts` | Sin ejemplares inventados; curiosidad desde `fun_fact`. |
| Mobile / tests | `apps/mobile/__tests__/hardening/**`, ajustes en `mappers.coverage.test.ts` y `enclosureDetailModal.test.tsx` | Un test por CA-xx. |

## Contrato y datos

- Endpoints existentes de `api-004` y `api-005` (`/visitor/me`, `/visitor/progress`, `/visitor/achievements`, `/visitor/missions`, `/visitor/collection`) mediante `@arca/api-client`. Sin endpoints nuevos.
- Sin cambios de esquema ni DBR.
- El valor `https://api.example.invalid/api/v1` del perfil `production` es un marcador que se sustituye por la URL pública de la API en EAS; no se inventa el dominio real.

## Seguridad, offline y operación

- Los tokens siguen en `expo-secure-store`; no se versionan secretos.
- Sin conexión se reutiliza la caché en memoria de `useVisitorProgress`; si no hay, se muestra el error con reintento.
- El build de producción no admite HTTP en claro.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | Lee `eas.json`: perfil `production` sin cleartext y con API `https://` | `__tests__/hardening/build-config.test.ts` |
| CA-02 | `resolveApiBaseUrl` en desarrollo/producción y ausencia de `10.0.2.2` en `src` | `__tests__/hardening/build-config.test.ts` |
| CA-03 | ViewModel con sesión devuelve nombre, progreso, misiones, logros y colección | `__tests__/hardening/visitor-data.test.tsx` |
| CA-04 | ViewModel `guest` sin datos y compuerta con «Iniciar sesión» | `__tests__/hardening/visitor-data.test.tsx` |
| CA-05 | Error de red en español y reintento; compuerta con «Reintentar» | `__tests__/hardening/visitor-data.test.tsx` |
| CA-06 | Ruta de cuenta con `/visitor/me` simulado | `__tests__/hardening/account-and-enclosure.test.tsx` |
| CA-07 | Ficha de recinto vacío y `fun_fact` sin `characteristics` | `__tests__/hardening/account-and-enclosure.test.tsx` |
| CA-08 | `isMockDataEnabled` y mocks disponibles en pruebas | `__tests__/hardening/build-config.test.ts`, `visitor-data.test.tsx`, `account-and-enclosure.test.tsx` |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin dependencias nuevas; la URL de la API solo por variable de entorno. |
| II. La spec manda | Sí | Spec `018-production-build-hardening.md` Aprobada; plan y tasks con el mismo NNN. |
| III. Lógica separada de la interfaz | Sí | Estado y derivaciones en ViewModels y `config/`; las Views solo presentan; sin `fetch` en `components/` ni `app/`. |
| IV. Un test por criterio | Sí | CA-01..CA-08 con pruebas Jest que los nombran. |
| V. Una sola fuente de verdad para los datos | Sí | El visitante ve solo datos de la API; sin esquema nuevo. |
| VI. Código en inglés, personas en español | Sí | Identificadores en inglés; UI, mensajes y documentación en español. |

## Riesgos y decisiones

- **ADR requerido/aprobado:** ninguno; sin dependencias nuevas.
- **Marcador de URL de producción:** si no se sustituye, el build abre pero no conecta. Se documenta en `docs/018-production-build-hardening.md`.
- **Hitos:** se derivan de logros obtenidos; si aparece un endpoint de hitos se reemplaza la derivación.
- **Módulos de sesión sin URL:** `accountSession` y `progressRepository` siguen su regla previa (simulado/nulo sin `EXPO_PUBLIC_API_URL`); el perfil `production` siempre define la URL.

## Orden y aprobación

1. `src/config/runtime.ts` y reemplazo de respaldos.
2. Perfil `production` en `eas.json` y docs.
3. ViewModels de datos del visitante y cuenta.
4. Views/rutas con estados vacío, error y reintento.
5. Fichas de recinto sin datos inventados.
6. Tests CA-01..CA-08 y verificación.

- **Aprobación requerida:** técnica y funcional, aprobadas por el equipo junto con spec y tasks.
