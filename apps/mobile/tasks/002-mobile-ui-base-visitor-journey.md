# Tareas · 002 · mobile-ui-base-visitor-journey

- Spec: `apps/mobile/specs/002-mobile-ui-base-visitor-journey.md`
- Plan: `apps/mobile/plan/002-mobile-ui-base-visitor-journey.md`

## Implementación

### Fase 1: Infraestructura Base y Tokens
- [x] **T-01** (CA-07): Implementar adaptador de tema en `src/theme/tokens.ts` y `src/theme/index.ts` consumiendo `@arca/tokens`.
- [x] **T-02** (CA-07): Crear `test-ca-07` para verificar que los componentes consumen colores desde el adaptador y no mediante hardcoding.
- [x] **T-03** (RN-01): Definir modelos de dominio en `src/models/*.ts` (Animal, User, Mission, Reward, Event).
- [x] **T-04** (RN-01): Implementar mocks de datos en `src/mocks/*.ts` basados en la referencia visual.
- [x] **T-05** (CA-01): Crear repositorios base en `src/repositories/*.ts` que expongan los mocks mediante interfaces desacopladas.

### Fase 2: Componentes y Navegación
- [x] **T-06** (CA-06): Implementar kit de UI base en `src/components/ui/` (AppText, Button, Card, Chip, ProgressBar, SearchBar, ScreenContainer, etc.).
- [x] **T-07** (CA-06): Implementar `test-ca-06-auto` (Snapshots) para los componentes de `src/components/ui/`.
- [x] **T-08** (CA-02, CA-03): Configurar `app/(tabs)/_layout.tsx` y componente `AppTabBar` con soporte para resaltar pestaña activa en rutas secundarias.
- [x] **T-09** (CA-02): Crear `test-ca-02` para verificar la navegación entre las 5 pestañas principales.
- [x] **T-10** (CA-03): Crear `test-ca-03` para validar la pestaña activa en rutas como `/search`, `/game` y `/tour-3d`.

### Fase 3: Pantallas de Exploración (Core)
- [x] **T-11** (CA-01, CA-08): Implementar `AnimalViewModel` y `AnimalRepository` incluyendo la lógica de filtrado/búsqueda basada en mocks.
- [x] **T-12** (CA-04, CA-08): Implementar pantalla `HomeScreen` y su respectivo ViewModel.
- [x] **T-13** (CA-04, CA-08): Implementar pantalla `SearchScreen` y su respectivo ViewModel.
- [x] **T-14** (CA-04, CA-08): Implementar pantalla `AnimalDetailScreen` y su respectivo ViewModel, manejando el estado de descubrimiento y el caso "No encontrado" para IDs inexistentes.
- [x] **T-15** (CA-04): Crear `test-ca-04` verificando la navegación, la prop `isDiscovered` y la vista de "No encontrado".

### Fase 4: Pantallas de Soporte y Gamificación
- [x] **T-16** (CA-01, CA-08): Implementar `UserViewModel` y `UserRepository` para gestión de perfil y colección.
- [x] **T-17** (CA-08): Implementar pantalla `CollectionScreen` y su ViewModel.
- [x] **T-18** (CA-08): Implementar pantalla `GameScreen` y su ViewModel (acceso desde Home).
- [x] **T-19** (CA-08): Implementar pantalla `ProfileScreen` y su ViewModel.
- [x] **T-20** (CA-08): Crear tests unitarios para `UserViewModel` y `UserRepository` (`test-ca-08`).

### Fase 5: Flujo de QR y Tour 3D
- [x] **T-21** (CA-01, CA-08): Implementar `QrViewModel` y `QrRepository` para gestionar los estados de escaneo simulado.
- [x] **T-22** (CA-05, CA-08): Implementar pantalla `QrScannerScreen` y su ViewModel con botones de simulación.
- [x] **T-23** (CA-05, CA-08): Implementar pantallas de resultado con sus rutas: `QrResultScreen` (`/qr-result`), `QrInvalidScreen` (`/qr-invalid`) y `QrAlreadyDiscoveredScreen` (`/qr-already-discovered`).
- [x] **T-24** (CA-05): Crear `test-ca-05` verificando que los botones de prototipo naveguen a los tres estados de resultado y sus rutas correspondientes.
- [x] **T-25** (CA-08): Implementar pantalla `Tour3DScreen` (placeholder visual) y su ViewModel (acceso desde Mapa).
- [x] **T-26** (CA-08): Implementar pantalla `MapScreen` y su ViewModel, integrando la opción de acceso a Tour 3D.

### Fase 6: Verificación Final y Calidad
- [x] **T-27** (CA-01): Ejecutar `test-ca-01` (script de análisis de imports) para asegurar cumplimiento de MVVM.
- [x] **T-28** (CA-06): Validación manual de pantallas y flujos aprobados confirmada por la persona solicitante en Android con Expo Go el 2026-10-09 (SafeAreas, scroll, carruseles, navegación y legibilidad).
- [x] **T-29** (CA-08, CA-09, CA-10): Verificación automatizada tras T-42: 10 suites, 56 tests y 1 snapshot aprobados; cobertura al 100% en statements, branches, functions y lines; `npx tsc --noEmit`, `npx expo install --check` y `npx expo export --platform android` completados.
- [x] **T-30**: Actualizar documentación técnica local y enlazar spec, plan y tasks en la guía de entrega.
- [ ] **T-31**: Enlazar spec, plan y tasks en el PR de entrega cuando el PR exista.
- [x] **T-32** (CA-06): Corregir el desplazamiento vertical/horizontal en Búsqueda y añadir retorno visible a Home; corregir contraste y distribución en Colección, Perfil y Detalle de Animal.
- [x] **T-33** (CA-09): Agregar detalles visuales de eventos y misiones con datos mock y navegación desde Home/Game.
- [x] **T-34** (CA-09): Permitir seleccionar un animal desde Búsqueda iniciada en Mapa/Tour y establecerlo como destino visual del Tour 3D; sustituir nombres de iconos mostrados como texto por símbolos reales multiplataforma sin agregar dependencias al workspace.
- [x] **T-35** (CA-10): Separar la promoción visual de Aventura en el Zoo de la noticia de Home, conservando ambas tarjetas con propósito claro.
- [x] **T-36** (CA-10): Implementar lista y detalle mock de logros, iconos, filtro obtenidos/pendientes, orden por nombre/fecha y accesos desde Game y Perfil con regreso contextual.
- [x] **T-37** (CA-10): Habilitar vista previa de animales por descubrir desde Colección, difuminar imagen, ocultar datos reservados y enlazar CTA con el escáner QR.
- [x] **T-38** (CA-10): Eliminar FlatList anidada dentro del scroll de Aventura y preservar el origen Game/Perfil al regresar desde lista y detalle de logros o misión.
- [x] **T-39** (CA-10): Evitar la lista virtualizada anidada en Logros y usar el historial de navegación para el gesto de regreso de Android.
- [x] **T-40** (CA-06): Unificar las acciones de regreso de pantallas secundarias en un botón reutilizable de flecha con etiqueta accesible contextual.
- [x] **T-41** (CA-06): Ocultar el control de favorito sin persistencia; posponer favoritos compartidos y su filtro en Colección a la siguiente etapa.
- [x] **T-42** (CA-06): Alinear a la izquierda los botones de regreso de detalle de logro y Aventura en el Zoo; añadir regreso contextual a Game.
- [x] **T-43**: Documentar instalación y arquitectura local, sincronizar el estado ADR 0004, retirar la ruta móvil duplicada fuera de su app y excluir artefactos generados.
