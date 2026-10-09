# 002 · mobile-ui-base-visitor-journey

- App dueña: `mobile`
- Apps/paquetes afectados: `@arca/tokens`, `@arca/api-client`
- Estado: Implementada
- Solicitante / responsable funcional: Solicitante / responsable funcional (sin registrar nombre personal, según acuerdo en sesión)
- Aprobación funcional: Solicitante / responsable funcional, 2026-10-09

## Problema y contexto
Tras establecer la base técnica en la Spec 001, se requiere implementar la capa de interfaz de usuario (UI) para el visitante. El objetivo es materializar el flujo de navegación y las pantallas definidas en la referencia visual, permitiendo la validación de la experiencia de usuario (UX) y la estructura de navegación antes de integrar la lógica real de negocio y los servicios de hardware (Cámara, GPS, 3D).

## Objetivos
- Implementar la navegación base mediante `expo-router` con un sistema de pestañas (Tabs) fijas.
- Desarrollar las pantallas y flujos de visitante aprobados usando datos simulados (mocks), incluyendo detalles visuales básicos de eventos y misiones.
- Establecer una arquitectura MVVM obligatoria y verificable para desacoplar la UI de la fuente de datos.
- Integrar el sistema de diseño basado en `@arca/tokens`.
- Garantizar que la UI sea adaptable y accesible en dispositivos Android.

## Fuera de alcance
- Implementación real de escaneo de códigos QR (`expo-camera`).
- Integración de mapas interactivos y geolocalización real.
- Renderizado de modelos 3D reales.
- Conectividad con endpoints reales de la API (se usarán Repositorios con mocks).
- Persistencia de datos local o remota (Favoritos, Perfil).
- Estados complejos de carga, error o vacío no definidos en el diseño.

## Actores y permisos
| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante | Navegar por la información del zoo y registrar descubrimientos | Ninguno (en fase de UI/Mocks) |

## Historias de usuario
Como `visitante del zoo`, quiero `navegar por una interfaz intuitiva` para `explorar los animales, ver mi colección y acceder a información del parque`.

## Criterios de aceptación
- **CA-01 (Arquitectura MVVM):** Dado cualquier flujo de pantalla, cuando se analice el código, entonces se debe cumplir estrictamente la jerarquía: `Routes` $\rightarrow$ `ViewModels` $\rightarrow$ `Repositories` $\rightarrow$ `Models`. No debe existir importación de mocks o repositorios directamente en `src/screens/` ni en `app/`.
    - *Prueba:* `test-ca-01`: Análisis estático mediante script de grep/lint para detectar imports prohibidos en las capas de vista y rutas.
- **CA-02 (Navegación por Tabs):** Dado el arranque de la app, cuando se interactúe con la TabBar, entonces se debe navegar correctamente entre las 5 pestañas principales: Home, Mapa, Escanear, Colección y Perfil.
    - *Prueba:* `test-ca-02`: Test de integración con `@testing-library/react-native` verificando el cambio de pantalla al presionar tabs.
- **CA-03 (Rutas Secundarias):** Dado que el usuario navega a rutas como Search, Game, Tour 3D, detalles de eventos/misiones o Resultados QR, entonces la TabBar debe permanecer visible y resaltar la pestaña principal asociada (ej. Game $\rightarrow$ Home, Tour 3D $\rightarrow$ Mapa).
    - *Prueba:* `test-ca-03`: Test de renderizado de `AppTabBar` verificando el estado `active` basado en la ruta actual.
- **CA-04 (Flujo de Exploración):** Dado que el usuario está en Home o Search, cuando seleccione un animal (descubierto o no), entonces debe navegar a la pantalla de Detalle del Animal mostrando su estado de descubrimiento.
    - *Prueba:* `test-ca-04`: Test de navegación mockeando el `router` y verificando la prop `isDiscovered` en la vista de detalle.
- **CA-05 (Simulación de QR):** Dado que el usuario está en la pantalla de Escáner, cuando utilice los botones de prototipo, entonces debe navegar a los estados de resultado: Válido, Inválido o Ya Descubierto.
    - *Prueba:* `test-ca-05`: Test de interacción disparando callbacks de simulación y verificando la llamada a `router.push` con la ruta correcta.
- **CA-06 (Validación Visual Android):** Dado el despliegue en Android, cuando se revisen las pantallas aprobadas y sus rutas secundarias definidas en `apps/mobile/arca-ui-reference/arca-ui-reference/RESUMEN-TECNICO.md`, entonces se debe verificar:
    1. Ausencia de solapamientos con el Status Bar y Navigation Bar (uso de `SafeAreas`).
    2. Correcto renderizado de carruseles horizontales sin cortes abruptos.
    3. Coincidencia de jerarquía visual con la referencia (Header $\rightarrow$ Body $\rightarrow$ Footer).
    - *Prueba:* `test-ca-06-manual`: Validación manual en emulador/dispositivo Android.
    - *Prueba:* `test-ca-06-auto`: Snapshot tests de los componentes base de la UI para asegurar consistencia estructural.
- **CA-07 (Integración de Tokens):** Dado cualquier componente visual, cuando se verifique su estilo, entonces debe utilizar valores provenientes de `@arca/tokens` a través de un adaptador de tema.
    - *Prueba:* `test-ca-07`: Análisis de estilos en componentes seleccionados verificando la procedencia de los valores desde el adaptador.
- **CA-08 (Pruebas Automatizadas):** Dado el desarrollo de la funcionalidad, entonces se deben implementar y pasar los siguientes tests:
    1. **Views:** Tests de renderizado y disparo de callbacks (Jest + RTL).
    2. **ViewModels:** Tests de transformación de datos y gestión de estado de presentación.
    3. **Repositories:** Tests de retorno de datos mock correctos.
    4. **Navegación:** Tests de resolución de rutas básicas.
    - *Prueba:* `test-ca-08`: Ejecución de `npm test` con reporte de cobertura $\ge 80\%$ en las capas de ViewModel y Repository.
- **CA-09 (Detalles visuales):** Dado que la persona visitante selecciona un evento o misión, entonces verá una pantalla de detalle con la información mock disponible. Eventos muestran título, fecha, horario, ubicación, descripción e imágenes desplazables cuando existan; misiones muestran objetivo, progreso realizado/restante y premio. Desde el mapa o el recorrido 3D, seleccionar un animal en Búsqueda define el destino y regresa al recorrido 3D; la búsqueda iniciada desde Home conserva la ficha normal del animal.
    - *Prueba:* `test-ca-09`: pruebas de navegación y renderizado de detalles de eventos/misiones y selección de destino.
- **CA-10 (Aventura, logros y colección):** La tarjeta de noticias no promociona misiones; una tarjeta separada conduce a Aventura en el Zoo. Los logros obtenidos y pendientes tienen lista y detalle propios, se pueden abrir desde Game y Perfil, filtrar por estado y ordenar por nombre o fecha de obtención. Los animales pendientes abren una vista previa con imagen difuminada y bloqueo de características y curiosidades; la acción invita a escanear el QR.
    - *Prueba:* `test-ca-10`: pruebas automatizadas de navegación, filtros/orden de logros y vista previa de animales pendientes.

## Reglas de negocio
- **RN-01 (MVVM Obligatorio):** 
    - `Model`: Representa las entidades del dominio (Animal, Perfil, etc.). Pueden ser usados por cualquier capa.
    - `Routes (app/)`: Resolver navegación y conectar Views con ViewModels. No contienen lógica de negocio ni acceden a repositorios.
    - `Views (src/screens/)`: Presentación pura; reciben estado y callbacks del ViewModel. No importan mocks ni repositorios.
    - `ViewModels (src/viewmodels/)`: Gestionan el estado de presentación y consumen Repositorios. No dependen de componentes visuales.
    - `Repositories (src/repositories/)`: Abstraen la fuente de datos (en esta Spec usan mocks). Encapsulan la lógica de acceso a datos.
    - `Services (opcional)`: Operaciones reutilizables del cliente que no duplican lógica del backend Laravel.
- **RN-02 (Nombre Oficial):** El nombre de la aplicación será `ARCA-NB` (provisional), centralizado en una constante global.
- **RN-03 (Accesos Especiales):** 
    - El acceso a **Game** se realiza mediante un elemento visual en la pantalla de Home (confirmado funcionalmente el 2026-10-09).
    - El acceso a **Tour 3D** se realiza mediante una opción de cambio de recorrido en la pantalla de Mapa (confirmado funcionalmente el 2026-10-09).
- **RN-04 (Perfil):** Se mostrarán puntos, nivel, rango, logros y estadísticas utilizando datos simulados, sin implementar reglas de cálculo ni persistencia.
- **RN-05 (Animales):** Se permite la consulta de la ficha de cualquier animal desde la búsqueda, independientemente de su estado de descubrimiento.
- **RN-06 (Dependencias):** No se añadirán dependencias externas sin aprobación previa.
- **RN-07 (Contenido demostrativo):** El contenido de eventos y misiones en esta etapa es exclusivamente visual y simulado; los campos descriptivos e imágenes no implican integración con servicios ni reglas de negocio.
- **RN-08 (Revelado gradual):** Los animales no descubiertos permiten abrir una vista previa y navegar al escáner, pero ocultan características, alimentación, curiosidades y datos científicos hasta su descubrimiento. Logros, puntajes, fechas y requisitos son información mock.

## Datos, privacidad y auditoría
En esta fase se utilizan exclusivamente datos simulados (mocks) definidos en `src/mocks/`. No hay persistencia de datos, manejo de sesiones ni acceso a información sensible del usuario.

## Flujos y errores
- **Flujo Principal:** Home $\rightarrow$ Search $\rightarrow$ Animal Detail $\rightarrow$ Map.
- **Flujo de Descubrimiento:** Scan $\rightarrow$ QR Result $\rightarrow$ Animal Detail.
- **Flujo de Progreso:** Collection $\rightarrow$ Animal Detail.
- **Manejo de Errores:** Se implementará una pantalla de "No encontrado" para rutas dinámicas (animal/[id]) donde el ID no coincida con los mocks.

## Dependencias, riesgos y preguntas
- **Dependencias/ADR:** ADR 0004 (Expo/Android), Spec 001 (Setup).
- **Riesgos:** 
    - Conflictos de resolución de módulos en el monorepo al importar `@arca/tokens`.
    - Discrepancias visuales entre el diseño y la renderización real en Android.
- **Preguntas pendientes:** Ninguna. Las decisiones de acceso a Game y Tour 3D fueron confirmadas por la persona solicitante el 2026-10-09.
- **Ajustes visuales aprobados:** Se agregan detalles mock básicos para eventos/misiones, tarjeta independiente de aventura, lista/detalle de logros y vista previa de animales pendientes; se corrigen desplazamiento y legibilidad, y la selección de destino del recorrido 3D queda como flujo visual local. No se agregan dependencias de iconos: la UI usa los símbolos disponibles mediante `expo-symbols`.

## Revisión
- Aprobación funcional: Solicitante / responsable funcional, 2026-10-09.
- Aprobación técnica del plan: Solicitante, 2026-10-09.
- Evidencia/enlaces: Referencia de UI en `apps/mobile/arca-ui-reference`
