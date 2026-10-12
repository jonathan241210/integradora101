# Plan técnico · 002 · mobile-ui-base-visitor-journey

- Spec: `apps/mobile/specs/002-mobile-ui-base-visitor-journey.md`
- Estado de spec: Implementada
- Aprobación funcional: Solicitante / responsable funcional, 2026-10-09
- Aprobación técnica: Solicitante, 2026-10-09
- Estado del plan: Aprobado

## Diseño de solución
Implementación de la capa de interfaz de usuario para el visitante siguiendo el patrón MVVM. La aplicación se divide en capas estrictas para garantizar que la UI sea independiente de la fuente de datos, permitiendo la transición de mocks a API Laravel sin modificar las vistas.

### Flujo de Datos
`Route (Expo Router)` $\rightarrow$ `ViewModel (React Hook)` $\rightarrow$ `Repository` $\rightarrow$ `Mock Data` (utilizando `Model` types)

Las rutas solo orquestan navegación y presentan estado proveniente de ViewModels. No importan Repositories ni mocks. Para conservar inyección y testabilidad sin añadir dependencias, los hooks ViewModel encapsulan la selección del Repository y permiten sustituirlo en pruebas.

## Cambios por área
| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| **Rutas** | `src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/*.tsx`, `src/app/animal/[id].tsx` y rutas secundarias | Definición de las cinco pestañas y rutas Home, Map, Scan, Collection, Profile, Search, Animal Detail, Game, Tour 3D, detalles de eventos/misiones/logros y estados QR; sin acceso directo a datos. |
| **ViewModels** | `src/viewmodels/*.ts` | Gestión de estado de presentación y coordinación de acciones. |
| **Repositorios** | `src/repositories/*.ts` | Abstracción de acceso a datos (implementación mock). |
| **Modelos** | `src/models/*.ts` | Entidades y tipos de dominio (Animal, User, etc.). |
| **Vistas** | `src/screens/*.tsx` | Componentes de pantalla props-driven (presentación pura). |
| **Componentes** | `src/components/ui/*.tsx`, `src/components/domain/*.tsx` | Kit UI base, símbolos de `expo-symbols` y componentes especializados por dominio; placeholders de imagen seguros cuando falte una URL. |
| **Tema** | `src/theme/tokens.ts`, `src/theme/index.ts` | Adaptador para consumir `@arca/tokens`. |
| **Mocks** | `src/mocks/*.ts` | Fuente de datos simulados utilizada por los repositorios. |

## Contrato y datos
Dado que esta Spec es puramente de UI y utiliza mocks, no se definen endpoints de API ni migraciones de base de datos.
- **Mocks:** Se implementarán en `src/mocks/` siguiendo la estructura de datos propuesta en la referencia visual.
- **Contratos:** Los repositorios definirán interfaces que serán compatibles con los DTOs futuros de `@arca/api-client`.

## Seguridad, offline y operación
- **Datos:** No se manejan datos sensibles ni persistencia local en esta fase.
- **Operación:** La app se ejecutará localmente mediante `npx expo start`.
- **Portabilidad:** Se respeta la configuración de Android definida en el ADR 0004.

## Mapeo de criterios a pruebas
| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | `test-ca-01` (análisis estático de imports entre Routes, Views, ViewModels y Repositories) | `apps/mobile/__tests__/` |
| CA-02 | `test-ca-02` (rutas y acciones de las cinco pestañas) | `apps/mobile/__tests__/` |
| CA-03 | `test-ca-03` (correspondencia de rutas secundarias con la pestaña activa) | `apps/mobile/__tests__/` |
| CA-04 | `test-ca-04` (búsqueda, navegación a detalle, estado descubierto y caso inexistente) | `apps/mobile/__tests__/` |
| CA-05 | `test-ca-05` (tres resultados de simulación QR y sus rutas) | `apps/mobile/__tests__/` |
| CA-06 | `test-ca-06-auto` (estructura UI) y `test-ca-06-manual` (Android real o emulador) | `apps/mobile/__tests__/` y evidencia de validación |
| CA-07 | `test-ca-07` (adaptador de tokens y verificación de componentes) | `apps/mobile/__tests__/` |
| CA-08 | `test-ca-08` (Views, ViewModels, Repositories y rutas; cobertura mínima 80% en ViewModels/Repositories) | `apps/mobile/__tests__/` |
| CA-09 | `test-ca-09` (detalle de evento/misión y selección de destino 3D) | `apps/mobile/__tests__/` |
| CA-10 | `test-ca-10` (promoción de aventura, logros, clasificación y vista previa de animales pendientes) | `apps/mobile/__tests__/` |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Conforme al diseño | Expo SDK 57 y RN 0.86.3 según ADR 0004; no se proponen dependencias nuevas. |
| II. La spec manda | Conforme al diseño | Se implementan las pantallas y flujos aprobados, incluyendo CA-09 y CA-10; cámara, GPS/mapa real, 3D real y persistencia quedan fuera. |
| III. Lógica separada de la interfaz | Conforme | `test-ca-01` pasó; Routes y Views no acceden a mocks/Repositories y ViewModels coordinan Repositories. |
| IV. Un test por criterio | Conforme | Criterios CA-01 a CA-10 cubiertos por pruebas automatizadas; CA-06 incluye además la validación manual confirmada en Android con Expo Go. |
| V. Una sola fuente de verdad para los datos | Conforme al diseño | Para esta etapa, mocks accesibles solo mediante Repositories; no hay persistencia local ni remota. |
| VI. Código en inglés, personas en español | Conforme | Identificadores y rutas en inglés; textos de UI y documentación para la persona visitante en español. |

## Riesgos y decisiones
- **Resolución de Metro:** Configuración de `metro.config.js` ya implementada en Spec 001 para soportar workspaces y `@arca/tokens`.
- **Rendimiento Visual:** Riesgo de solapamientos en Android. Mitigación: Uso obligatorio de `react-native-safe-area-context`.
- **Activos de animales:** La referencia no incluye fotos; el UI usará placeholders de forma segura si no hay URL, sin depender de archivos de `arca-ui-reference`.
- **Validación CA-06:** La inspección manual en Android con Expo Go fue confirmada por la persona solicitante el 2026-10-09; queda registrada en T-28.

## Orden y aprobación
1. **T1: Adaptador de Tema y Tokens:** Configurar `src/theme` consumiendo `@arca/tokens`.
2. **T2: Infraestructura MVVM y Mocks:** Crear carpetas `models`, `repositories`, `viewmodels` y `mocks`, con contenido demostrativo extendido para eventos y misiones.
3. **T3: Kit UI Base:** Implementar componentes en `src/components/ui`.
4. **T4: Navegación y Layout:** Configurar `(tabs)/_layout.tsx` y `AppTabBar`.
5. **T5: Pantallas de Exploración:** Home, Search, Animal Detail.
6. **T6: Pantallas de Soporte:** Collection, Game, Profile.
7. **T7: Flujos secundarios:** Scanner, estados QR, Tour 3D, detalles mock de eventos/misiones/logros, filtros de logros y selección visual de destino.
8. **T8: Verificación Final:** Ejecución de todos los tests y validación visual en Android, incluyendo legibilidad, iconografía y desplazamiento.

**Aprobación funcional:** Solicitante / responsable funcional, 2026-10-09.
**Revisión y aprobación técnica:** Solicitante, 2026-10-09.
