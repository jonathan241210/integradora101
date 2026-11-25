# Plan técnico · 015 · Recorrido AR location-based con recintos, `zoo_places` y ruteo por nodos

- Spec: `apps/mobile/specs/015-spatial-ar-tour.md`
- Estado de spec: Implementada
- Solicitada: 2026-11-20
- Aprobada: 2026-11-20
- Responsable técnico: Por confirmar
- Aprobación técnica: Aprobada

## Diseño de solución

Se evoluciona `mobile-009` a un enfoque **AR location-based**: la cámara muestra puntos azules de recintos (`enclosures`) cuando el usuario apunta en la dirección aproximada y está dentro del rango/FOV definido, usando `gps_lat/gps_lon` de BD, GPS en tiempo real y brújula/orientación del dispositivo. No se usa ARCore/ARKit SLAM en esta fase.

La experiencia se simplifica a **dos modos**: Mapa 2D y AR. Se elimina el modo escena 3D sin cámara y se retira del modo AR la línea azul/flechas/chevrons SVG superpuestos. La lógica de orientación, FOV, rango y renderizado progresivo vive en utilidades/ViewModels; los componentes solo presentan.

Los datos geográficos siguen siendo autoridad de `apps/api`/MySQL. `path_edges` no existe aún; el ruteo mantiene fallback temporal con `zooPaths.ts` (decisión confirmada), mientras `path_nodes` y `zoo_places` se integran como datos de contrato/caché.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| API / datos | `apps/api/src/routes/api/v1.php`, controllers/actions/requests/resources de lectura geográfica, tests PHPUnit | Exponer lectura aprobada de recintos con coords, `zoo_places` y `path_nodes` para mobile; contrato versionado y autorización pública/visitante según spec API |
| Mobile / utilidades | `src/utils/arLocationMath.ts` (nuevo), `src/utils/arFov.ts` (nuevo o integrado), ajustes en `src/utils/arMath.ts`/`tourPlanner.ts` si aplica | Cálculo de bearing relativo, distancia Haversine, filtro FOV/rango, priorización progresiva y estado de baja precisión |
| Mobile / ViewModels | `src/viewmodels/useArTourViewModel.ts` (modificar), posible `useLocationArViewModel.ts` | Estado AR location-based, permisos, GPS/heading, puntos visibles, fallback, limpieza de recursos |
| Mobile / componentes | `src/components/map/ArTourOverlay.tsx` (modificar), `src/components/map/ThreeTourScene.tsx` (retirar/reemplazar), nuevo `src/components/map/LocationArCameraOverlay.tsx` (nombre tentativo), `src/components/map/index.ts` | Renderizar puntos azules AR en cámara; retirar modo 3D sin cámara y overlay SVG antiguo |
| Mobile / pantalla/repos | `src/screens/MapScreen.tsx`, `src/repositories/MapRepository.ts` o repos geográficos, hooks de datos | Solo modos 2D/AR; consumo de datos/caché de recintos/lugares/nodos |
| Mobile / tipos/constantes | `src/types/map.ts`, `src/constants/zooPaths.ts` (fallback), posibles tipos para `ZooPlace`/`PathNode` | Tipado de datos geográficos y compatibilidad transitoria |
| Paquetes/docs | `@arca/api-client` (si se expone contrato), `apps/mobile/docs/*`, ADR si hay dependencia nueva | Contrato tipado y documentación de calibración/fallback/offline |

## Contrato y datos

- **Endpoints previstos (apps/api, lectura):** definir rutas nombradas bajo `api/v1`; candidatos: `GET /api/v1/map/enclosures` (extender DBR-008), `GET /api/v1/map/zoo-places`, `GET /api/v1/map/path-nodes`. Requieren spec/plan/tareas API o ampliación aprobada; no exponer datos innecesarios.
- **Autenticación/permisos:** datos públicos de mapa/visitante solo lectura; validar con política existente. Sin datos sensibles.
- **Validación/Resources:** Resources Laravel con campos mínimos; coordenadas nulas manejadas explícitamente. `zoo_places.is_visible` y `enclosures.is_active`/soft delete respetados.
- **DBR relacionada:** DBR-008 y DBR-019 implementadas. **DBR nueva requerida para `path_edges`** antes de CA-06 completo por BD. No crear migraciones desde mobile.
- **Caché offline:** AsyncStorage/estrategia existente (ADR 0014). Claves versionadas para recintos, zoo_places, path_nodes y payload mínimo de animales por recinto. TTL/versionado a definir; invalidar al cambiar contrato.
- **Fallback ruteo:** mantener `zooPaths.ts` hasta que exista `path_edges` aprobado y consumible. No generar aristas automáticas.

## Seguridad, offline y operación

- **Privacidad:** cámara solo en primer plano; sin captura/grabación/transmisión. Ubicación/brújula solo para orientación; no persistir historial de ubicación.
- **Permisos:** solicitar cámara/ubicación con texto claro en español; degradar a Mapa 2D si faltan.
- **Offline:** usar caché local aprobada. Si no hay caché suficiente, mostrar estado claro y mantener Mapa 2D.
- **Rendimiento:** limitar a 6 puntos simultáneos, throttling de heading/GPS, cancelar listeners/animaciones en cleanup.
- **Portabilidad:** sin dependencias cloud propietarias; MySQL 8.0.x/Aiven/local por `.env`. Location-based usa Expo modules ya compatibles; verificar compatibilidad Expo Go antes de agregar nativos.
- **Observabilidad:** logs dev-only para precisión GPS/heading; sin PII en logs.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 Solo dos modos | Test UI: MapScreen muestra solo controles Mapa 2D y AR; no existe modo 3D sin cámara | `apps/mobile/__tests__/` (screen/component test) |
| CA-02 Sin línea/flechas antiguas | Test UI/snapshot lógico: overlay AR no renderiza ruta azul/chevrons SVG antiguos | `apps/mobile/__tests__/arTourOverlay.test.tsx` o nuevo test |
| CA-03 Puntos AR por location-based | Tests unitarios de FOV/rango/priorización + test componente: solo recintos, progresivo, max 6, sin path_nodes | `apps/mobile/__tests__/arLocationMath.test.ts`, `__tests__/locationArOverlay.test.tsx` |
| CA-04 Calibración location-based | Tests unitarios: bearing relativo, normalización heading, distancia; test UI estado baja precisión | `apps/mobile/__tests__/arLocationMath.test.ts`, test ViewModel |
| CA-04b Cerca de ti | Resolver la selección sobre la lista de puntos cercanos. Test de UI con un recinto fuera del campo de visión | `apps/mobile/__tests__/arTourOverlay.test.tsx` |
| CA-05 Datos zoo_places/path_nodes | Tests repositorio/mapper: consume contrato/caché y normaliza campos; path_nodes no markers AR | `apps/mobile/__tests__/mapRepository*.test.ts` |
| CA-06 Ruteo por nodos/aristas | Test unitario: usa grafo aprobado cuando disponible; con fallback temporal usa `zooPaths.ts` sin inventar aristas | `apps/mobile/__tests__/pathfinding.test.ts` / nuevo test integración ruteo |
| CA-07 Fallback | Test UI: sin permiso/soporte/fallo AR muestra mensaje y Mapa 2D disponible | `apps/mobile/__tests__/arTourOverlay.test.tsx` / screen test |
| CA-08 Privacidad y recursos | Test componente/ViewModel: cleanup al desmontar/cerrar; no llamadas de captura/grabación | `apps/mobile/__tests__/locationArOverlay.test.tsx` |
| CA-09 Offline | Test repositorio/ViewModel: usa caché local para recintos/zoo_places/path_nodes/animales básicos; estado claro sin caché | `apps/mobile/__tests__/mapRepository*.test.ts` |
| CA-10 Pruebas | Verificación de suite: cada CA-xx nombrado en tests; limitaciones dispositivo real documentadas | `apps/mobile/__tests__`, docs/plan/tasks |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | React Native/Expo + módulos existentes (`expo-camera`, `expo-location`, `expo-sensors`). Sin cloud propietaria. Cualquier dependencia nueva requiere ADR aprobado antes de implementar. |
| II. La spec manda | Sí | Spec `015-spatial-ar-tour.md` en estado Aprobada; plan y tasks con mismo NNN. |
| III. Lógica separada de la interfaz | Sí | Cálculos FOV/bearing/distancia/priorización en utils; estado/orquestación en ViewModel; componentes solo render. Sin fetch en componentes. |
| IV. Un test por criterio | Sí | Tabla CA-01..CA-10 con test nombrado previsto; ejecución en Jest. Limitaciones de cámara/GPS real se registran en docs. |
| V. Una sola fuente de verdad para los datos | Sí | MySQL/API autoridad. DBR-008/019 implementadas; `path_edges` requiere DBR nueva. Mobile solo caché temporal. |
| VI. Código en inglés, personas en español | Sí | Identificadores/rutas/código en inglés; UI, mensajes, spec/plan/tasks en español. |

Ninguna excepción se implementa sin revisión y acuerdo requeridos. Si algo no cumple, detenerse y resolverlo antes del código.

## Riesgos y decisiones

- **ADR requerido/aprobado:** No se requiere ADR para location-based con módulos Expo existentes. Si se evalúa SDK AR nativo (ViroReact/munim-xr/ARCore/ARKit), se requiere ADR aprobado antes de agregar dependencia.
- **Riesgo precisión:** GPS/brújula pueden derivar. Mitigar con rango/FOV, suavizado de heading, indicador de baja precisión y máximo de puntos.
- **Riesgo datos:** `path_edges` ausente. Mitigado con fallback temporal `zooPaths.ts` confirmado.
- **Riesgo regresión:** eliminar modo 3D sin cámara puede afectar accesibilidad; Mapa 2D queda como alternativa y se validará en QA.
- **Riesgo contrato API:** endpoints geográficos pueden no existir aún. Plan debe separar tareas mobile de tareas API; mobile puede iniciar con capa repositorio/caché y fixtures tipados solo para desarrollo controlado, pero entrega final depende de contrato aprobado.

## Orden y aprobación

1. Confirmar alcance API/contrato para `enclosures`, `zoo_places`, `path_nodes` (spec/plan API si aplica).
2. Definir/ajustar tipos y repositorios mobile para datos geográficos y caché offline.
3. Implementar utilidades location-based (bearing, FOV, distancia, priorización progresiva) con tests.
4. Actualizar ViewModel AR para modo cámara-only location-based, permisos, GPS/heading y cleanup.
5. Reemplazar overlay AR: quitar línea azul/flechas antiguas y modo 3D sin cámara; renderizar puntos azules de recintos.
6. Integrar MapScreen a solo dos modos y fallback Mapa 2D.
7. Integrar `zoo_places`/`path_nodes` como datos; mantener fallback `zooPaths.ts` para ruteo.
8. Ejecutar pruebas, revisar accesibilidad/privacidad, actualizar docs y registrar limitaciones de dispositivo real.

- **Aprobación requerida:** técnica (equipo) y funcional (Backend). No implementar antes de aprobación del plan.
