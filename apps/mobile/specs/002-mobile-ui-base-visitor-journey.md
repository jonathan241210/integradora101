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
- **CA-02 (Navegación por Tabs):** Dado el arranque de la app, cuando se interactúe con la TabBar, entonces se debe navegar correctamente entre las 5 pestañas principales: Home, Mapa, Escanear, Colección y Perfil. El gesto o botón atrás del sistema no recorre las pestañas principales ya visitadas: en la raíz de una de esas cinco pestañas no deshace el cambio de pestaña. Desde una ruta secundaria, atrás vuelve a la pantalla que la abrió (Ajustes vuelve a Perfil). Enmienda de Aksel, 2026-10-23.
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
    4. El teclado no tapa los campos de contraseña. El contenedor de pantalla desplaza el formulario y Android redimensiona la ventana (`softwareKeyboardLayoutMode: resize`). Enmienda de Aksel, 2026-10-23.
    - *Prueba:* `test-ca-06-manual`: Validación manual en emulador/dispositivo Android.
    - *Prueba:* `test-ca-06-auto`: Snapshot tests de los componentes base de la UI para asegurar consistencia estructural.
- **CA-07 (Integración de Tokens):** Dado cualquier componente visual, cuando se verifique su estilo, entonces debe utilizar valores provenientes de `@arca/tokens` a través de un adaptador de tema.
    - *Prueba:* `test-ca-07`: Análisis de estilos en componentes seleccionados verificando la procedencia de los valores desde el adaptador.
    - **Aclaración aprobada el 2026-10-11:** el adaptador nativo y sus consumidores deben respetar los defaults de `docs/04-sistema-de-diseno.md`: `color-base` `#661a2f`, `color-primario` `#87293a`, `color-secundario` `#b79159`, `color-complemento` `#DEC9A3`, `colorFuenteB` `#ffffff` y `colorFuenteN` `#000000`. Los colores de marca se centralizan en `@arca/tokens`; no se define una paleta verde/amarilla independiente para Mobile. El color semántico de error se alinea con `danger` de los tokens compartidos (`#c34242`). Los cinco tintes mock de placeholders por especie se conservan porque solo ilustran tarjetas y fichas sin fotografía.
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
- **CA-11 (Acceso visual):** Dado el arranque sin sesión, cuando se abre la app, entonces se muestra el inicio de sesión con el panel de marca redondeado, sin el título «Login». Iniciar sesión con correo y contraseña, o Entrar como invitado, abre el inicio. Debajo del botón principal hay un separador «o» y el acceso de invitado en texto más pequeño. ¿Olvidaste tu contraseña? y Regístrate abren sus pantallas. Cerrar sesión en Ajustes vuelve al inicio de sesión. Nada de esto comprueba ni guarda una cuenta.
    - *Prueba:* `test-ca-11`: resolución de la compuerta visual y navegación de Login.
- **CA-12 (Registro visual):** Dada la pantalla de registro, cuando se muestra, entonces pide nombre de usuario, correo, contraseña y confirmación, y advierte que en esta versión la cuenta solo existe en pantalla: si se elimina la aplicación, esa información no se puede restaurar. Crear cuenta válida regresa a Login.
    - *Prueba:* `test-ca-12`: campos, advertencia, confirmación distinta y regreso a Login.
- **CA-13 (Recuperación visual):** Dado el olvido de contraseña, cuando se envía un correo, entonces la app muestra un aviso genérico que no revela si la cuenta existe y continúa a una pantalla con código de 6 dígitos, nueva contraseña y confirmación. Al completarla, vuelve a Login. En la demostración el correo no se envía y cualquier código de 6 dígitos permite continuar.
    - *Prueba:* `test-ca-13`: aviso genérico, código incompleto y regreso a Login.
- **CA-14 (Ajustes):** Dado Perfil, cuando se abre Ajustes desde el botón circular junto al título «Perfil», entonces se ve la ficha de ejemplo, los interruptores de notificaciones y ubicación, y las filas Privacidad, Ayuda y soporte y Acerca de ARCA-NB. La pestaña Perfil permanece activa. Los interruptores solo cambian en pantalla. Cada fila abre su pantalla. No hay modo oscuro, selector de idioma ni interruptor de sonidos. La app permanece en modo claro. Enmienda de Aksel, 2026-10-23.
    - *Prueba:* `test-ca-14`: acceso desde Perfil, interruptores, filas y pestaña activa.
- **CA-15 (Aviso de privacidad de demostración):** Dada Privacidad, cuando se muestra el aviso, entonces explica qué datos recopila la demostración, para qué se utilizarían, cómo se protegerían y cómo ejercer derechos. El texto se identifica como explicación de demostración; el aviso oficial lo publicará el zoológico.
    - *Prueba:* `test-ca-15`: presencia de las cuatro secciones del aviso. La prueba comparte el caso de filas de `test-ca-14`.

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
- **RN-09 (Paleta institucional):** Los tokens móviles de marca derivan exclusivamente de los valores iniciales documentados en `docs/04-sistema-de-diseno.md`. El token semántico `danger` usa el valor compartido `#c34242`; los tintes mock específicos de especie se conservan solo como placeholders ilustrativos, no como colores de marca. No se consulta ni modifica `settings_colores`.
- **RN-10 (Acceso solo visual):** Login, registro, recuperación, ajustes y cierre de sesión no crean sesión, no envían correo y no guardan credenciales ni preferencias. La cuenta real, la verificación de mayoría de edad, el avatar y el aviso oficial siguen en la spec `004`, todavía en borrador.
- **RN-11 (Recuperación prevista):** La recuperación visual sigue el flujo ya descrito para la API: correo con respuesta genérica, código de 6 dígitos y nueva contraseña con confirmación. Esta versión no entrega el código.
- **RN-12 (Preferencias de pantalla):** Los interruptores no activan notificaciones del sistema, no cambian el tema y no solicitan ubicación. La app permanece en modo claro.
- **RN-13 (Aviso de demostración):** El texto de Privacidad explica el tratamiento de esta versión y el previsto al conectar la cuenta. No sustituye el aviso que debe proveer el zoológico.

## Datos, privacidad y auditoría
En esta fase se utilizan exclusivamente datos simulados (mocks) definidos en `src/mocks/`. La compuerta de Login vive en memoria y desaparece al recargar. No hay persistencia, tokens ni envío de credenciales. El aviso de Privacidad describe ese límite y el tratamiento previsto cuando la spec `004` conecte la cuenta.

## Flujos y errores
- **Flujo Principal:** Home $\rightarrow$ Search $\rightarrow$ Animal Detail $\rightarrow$ Map.
- **Flujo de Descubrimiento:** Scan $\rightarrow$ QR Result $\rightarrow$ Animal Detail.
- **Flujo de Progreso:** Collection → Animal Detail.
- **Flujo de acceso visual:** Login → Inicio, por sesión de demostración o como invitado. Login → Registro → Login. Login → Olvido de contraseña → Nueva contraseña → Login. Perfil → Ajustes → Mi cuenta, Privacidad, Ayuda o Acerca de. Ajustes → Cerrar sesión → Login.
- **Manejo de Errores:** Se implementará una pantalla de "No encontrado" para rutas dinámicas (animal/[id]) donde el ID no coincida con los mocks. Los formularios de acceso muestran en español si faltan datos, el correo no tiene forma válida, las contraseñas no coinciden o el código no tiene 6 dígitos.

## Dependencias, riesgos y preguntas
- **Dependencias/ADR:** ADR 0004 (Expo/Android), Spec 001 (Setup).
- **Riesgos:** 
    - Conflictos de resolución de módulos en el monorepo al importar `@arca/tokens`.
    - Discrepancias visuales entre el diseño y la renderización real en Android.
- **Preguntas pendientes:** Ninguna para la enmienda de CA-07/RN-09, aprobada funcionalmente el 2026-10-11. Las decisiones de acceso a Game y Tour 3D fueron confirmadas por la persona solicitante el 2026-10-09.
- **Ajustes visuales aprobados:** Se agregan detalles mock básicos para eventos/misiones, tarjeta independiente de aventura, lista/detalle de logros y vista previa de animales pendientes; se corrigen desplazamiento y legibilidad, y la selección de destino del recorrido 3D queda como flujo visual local. No se agregan dependencias de iconos: la UI usa los símbolos disponibles mediante `expo-symbols`.

## Revisión
- Aprobación funcional: Solicitante / responsable funcional, 2026-10-09.
- Aprobación técnica del plan: Solicitante, 2026-10-09.
- **Enmienda CA-07/RN-09:** Aprobada funcional y técnicamente el 2026-10-11; implementación y verificación completadas.
- **Cierre de entrega:** PR aprobado e integrado vía DevOps / rama principal (confirmado equipo, 2026-10-14). Spec en estado **Implementada**.
- **Enmienda de acceso y ajustes (CA-11 a CA-15, RN-10 a RN-13):** Confirmada por la persona solicitante el 2026-10-15. Agrega Login, registro, recuperación y Ajustes como interfaz de demostración, sin sustituir la spec `004`. El mismo día el equipo retiró Idioma y Sonidos y efectos: no forman parte del alcance.
- Evidencia/enlaces: Referencia de UI en `apps/mobile/arca-ui-reference`; spec, plan y tasks en `apps/mobile/specs|plan|tasks/002-*`; guías en `apps/mobile/docs/002-mobile-ui-visitor-journey.md` y `apps/mobile/README.md`.
