# 001 · admin-dashboard-prototype

- App dueña: `dashboard`
- Apps/paquetes afectados: `apps/dashboard`, `packages/ui` (`@arca/ui`), `packages/tokens` (`@arca/tokens`)
- Estado: Aprobada
- Solicitante / responsable funcional: Solicitante de esta conversación; nombre por identificar
- Aprobación funcional de la versión anterior: Solicitante, 2026-10-08; aprobó interfaces, preparación base del dashboard, `@arca/ui` y después la ampliación a `@arca/tokens`
- Aprobación funcional de esta ampliación: Solicitante, 2026-10-09; aprobó CA-01..CA-12, las credenciales ficticias propuestas y el alcance local sin persistencia.
- Aprobación funcional de login administrativo, paleta institucional y mantenimiento de React/index.html como entrada: Solicitante, 2026-10-09.

## Problema y contexto

El dashboard cuenta con un prototipo navegable para administración y taquilla. La persona solicitante pide ampliarlo con funciones de demostración para modificar recintos, iniciar sesión como personal de taquilla, consultar el historial de boletos y crear usuarios de taquilla desde el perfil administrativo. También solicita documentar el código y que la interfaz sea clara y adecuada para cada perfil.

Se propone conservar el carácter demostrativo y local del prototipo: no conectar autenticación real ni guardar cuentas, recintos o ventas. La solicitud de usar HTML, JavaScript y CSS se interpreta dentro de la aplicación actual React/TypeScript: React genera el HTML de la interfaz, TypeScript aporta la lógica de presentación y CSS mantiene los estilos. No se reemplazará el stack aprobado.

La base React/TypeScript/Vite/Tailwind y los componentes compartidos de `@arca/ui` y `@arca/tokens` pertenecen a la versión anterior aprobada de esta feature. Esta ampliación conserva esas decisiones técnicas.

## Objetivos

- Crear una interfaz interna de demostración coherente con las referencias compartidas.
- Incluir una pantalla de inicio de sesión visual y navegación entre las pantallas administrativas.
- Representar los flujos como prototipo de interfaz adaptable, accesible y en español.
- Separar claramente las opciones del perfil administrativo de las pantallas de taquilla.
- Permitir simular la modificación de recintos y el alta en memoria de usuarios ficticios de taquilla.
- Solicitar credenciales estáticas ficticias al entrar al perfil de taquilla y, tras validarlas localmente, mostrar únicamente sus pantallas de venta e historial.
- Documentar cómo recorrer la demostración, sus credenciales ficticias, sus límites y la organización relevante del código.
- Preparar los paquetes y la configuración mínimos para ejecutar el dashboard y consumir componentes compartidos con tokens semánticos, sin agregar una dependencia de enrutamiento.

## Fuera de alcance

- Autenticación real, autorización, administración de sesiones o protección efectiva de rutas.
- Conexión con API, persistencia, operaciones CRUD reales o envío de formularios a un servidor.
- Guardar usuarios, modificaciones de recintos, ventas o historial entre recargas o sesiones.
- Crear ventas, calcular precios/totales reales, registrar pagos o conectar proveedores de pago.
- Generar reportes a partir de transacciones reales, arqueos o datos financieros operativos.
- Agregar un router o dependencias ajenas a la base React 19/TypeScript/Vite 7/Tailwind CSS 4 aprobada en ADR 0002 y a las herramientas de prueba indicadas por la Constitución.
- Cambiar el portal público `apps/web` u otras aplicaciones.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Personal administrativo de demostración | Recorrer visualmente las interfaces del panel | Ninguno; el acceso no es real ni protege datos |
| Personal de taquilla de demostración | Iniciar sesión con credenciales ficticias y recorrer venta e historial | Ninguno; la validación local es solo una simulación |
| Equipo de desarrollo | Revisar y validar el prototipo antes de definir integraciones | Acceso al repositorio |

## Historias de usuario

Como integrante del equipo del zoológico, quiero recorrer un prototipo del panel y sus pantallas principales para revisar la experiencia administrativa sin realizar operaciones reales.

Como personal administrativo, quiero revisar recintos, simular el alta de usuarios de taquilla y conservar acceso a las herramientas administrativas de demostración.

Como personal de taquilla, quiero iniciar sesión con una cuenta de muestra y ver las opciones de venta e historial sin acceder a herramientas administrativas.

## Criterios de aceptación

- **CA-01:** Dado el acceso al prototipo, cuando se muestre la pantalla inicial, entonces permite elegir entre perfil administrativo y perfil de taquilla; ambas opciones solicitan credenciales estáticas ficticias definidas en esta spec antes de abrir su interfaz de demostración. Ningún dato se transmite.
- **CA-02:** Dado el perfil administrativo, cuando se abra el panel, entonces muestra navegación e indicadores de administración identificados como demostrativos, incluyendo opciones para recintos y usuarios de taquilla; no muestra la venta ni el historial de taquilla.
- **CA-03:** Dada la navegación administrativa, cuando se elijan Noticias o Eventos, entonces se muestran sus interfaces de captura y listado, con los campos y tarjetas visuales de las referencias, sin guardar, publicar ni eliminar contenido real.
- **CA-04:** Dado un perfil de taquilla con sesión de demostración válida, cuando abra Venta de boletos, entonces muestra opciones y cantidades ficticias y permite recorrer confirmación, procesamiento y resultado simulado sin cobrar ni guardar transacciones; sin sesión válida no muestra esta sección.
- **CA-05:** Dado el perfil administrativo, cuando abra Reporte de boletos, entonces presenta filtros, indicadores y filas claramente ficticios, sin consultar datos financieros reales ni dar acceso al historial privado de taquilla.
- **CA-06:** Dadas las pantallas del prototipo, cuando se usen a anchos de 360, 390, 768, 1024 y 1366 px y con teclado, entonces la navegación y los controles permanecen operables, legibles, con foco visible y sin desbordamiento horizontal.
- **CA-07:** Dado el conjunto de interfaces, cuando se ejecute la suite de pruebas del dashboard, entonces hay pruebas automatizadas nombradas para todos los criterios CA-01..CA-14, incluyendo roles, flujos demostrativos, límites de sesión, accesibilidad básica, adaptación responsive y tema institucional.
- **CA-08:** Dado el dashboard y los componentes compartidos, cuando se inicialicen para esta feature, entonces los paquetes permiten ejecutar, probar y compilar la SPA, y exportar componentes accesibles con tokens semánticos de la paleta institucional de `docs/04-sistema-de-diseno.md`, sin router ni dependencias ajenas al stack aprobado.
- **CA-09:** Dado el perfil administrativo, cuando abra Modificación de recintos, entonces puede editar los campos ficticios definidos (nombre, descripción y estado) y ver una confirmación visual; los cambios viven solo en memoria y no persisten tras recargar.
- **CA-10:** Dado el perfil de taquilla, cuando ingrese el usuario y contraseña ficticios indicados en esta spec, entonces accede a Venta de boletos e Historial de boletos; credenciales incorrectas muestran un error accesible, y cerrar sesión devuelve al selector de perfil sin dejar visibles estas secciones.
- **CA-11:** Dado el perfil de taquilla autenticado en la demostración, cuando abra Historial de boletos, entonces ve únicamente filas estáticas ficticias de muestra, con filtros de presentación que no consultan ni persisten información.
- **CA-12:** Dado el perfil administrativo, cuando abra Usuarios de taquilla, entonces puede capturar un nombre de muestra, usuario y clave ficticios, crear una cuenta solo en memoria y usar esa cuenta en el login de taquilla durante la misma sesión; la lista y cuenta se reinician al recargar. La guía en español explica este flujo, las credenciales iniciales y las limitaciones del prototipo.
- **CA-13:** Dado el selector de perfiles, cuando la persona elija Administración, entonces se muestra un formulario con usuario y contraseña ficticios; únicamente las credenciales `administrador@demo.local` / `demo1234` permiten entrar al panel de administración de muestra. Credenciales incorrectas muestran un error accesible y ninguna credencial se transmite ni persiste.
- **CA-14:** Dado cualquier perfil del dashboard, cuando se presente la interfaz, entonces el menú lateral, acciones principales, superficies y tipografía usan tokens semánticos mapeados a la paleta institucional de `docs/04-sistema-de-diseno.md` (`#661a2f`, `#87293a`, `#b79159`, `#DEC9A3`, blanco/negro, 16px y Lato 400), en lugar de los acentos azules/verdes actuales. Conserva colores semánticos para estados y foco accesible; no declara hex de marca en vistas, no consulta ni escribe `settings_colores`, y `index.html` continúa como entrada de la SPA React/Vite.

## Reglas de negocio

- **RN-01:** Todas las credenciales, cantidades, precios, ventas, indicadores, filtros y filas son datos ficticios de muestra; no representan operación real del zoológico.
- **RN-02:** El login solo simula la transición entre pantallas. Nunca solicita o envía credenciales reales ni debe presentarse como mecanismo de seguridad.
- **RN-03:** Las acciones de noticias/eventos solo simulan estados visuales; no publican, persisten ni eliminan contenido.
- **RN-04:** La venta y sus estados son una demostración; no se procesan pagos ni se ejecutan cálculos contables o de precios en el cliente.
- **RN-05:** No se agregan dependencias, rutas de cliente ni integraciones externas sin la aprobación requerida.
- **RN-06:** Los componentes compartidos consumen valores semánticos de `@arca/tokens`; las vistas no fijan colores de marca.
- **RN-07:** La elección de perfil administra qué pantallas presenta el prototipo, pero no equivale a autorización. Las credenciales y las cuentas se comprueban solo en memoria en el cliente y no protegen datos ni operaciones.
- **RN-08:** La cuenta inicial de taquilla es ficticia y se muestra junto al formulario para facilitar la demostración: usuario `taquilla@demo.local`, contraseña `demo1234`. Las cuentas creadas desde administración solo existen en memoria hasta recargar.
- **RN-12:** Administración también requiere login ficticio local: usuario `administrador@demo.local`, contraseña `demo1234`. Estas credenciales son públicas en el cliente, no constituyen autenticación y no protegen rutas ni datos.
- **RN-13:** Los tokens del dashboard se mapean de forma centralizada en `apps/dashboard/src/styles.css` a los valores y roles de `docs/04-sistema-de-diseno.md`; no modificar `settings_colores`, no agregar lecturas de API en esta demo y no fijar colores de marca en componentes.
- **RN-09:** Los recintos, cuentas, ventas e historiales son fixtures ficticios o estados efímeros; no se guardan en almacenamiento local, cookies, servidor ni base de datos.
- **RN-10:** Los formularios de recintos y usuarios tienen etiquetas, validación de campos requeridos y feedback accesible; esta validación solo mejora la demostración y no representa reglas operativas.
- **RN-11:** Los comentarios del código se limitan a aclarar comportamiento no obvio; la guía de la app documenta ejecución, perfiles, flujos y límites del prototipo sin describirlo como sistema real.

## Datos, privacidad y auditoría

No se consulta ni persiste información. Usar solo datos ficticios estáticos o estados efímeros en memoria definidos para el prototipo. Las credenciales visibles de administración y taquilla son exclusivamente de demostración; no solicitar datos personales reales, claves reutilizadas ni datos de tarjetas. No se crea una autorización efectiva: ocultar secciones sin el estado local de login es solo una decisión de presentación. Cualquier versión operativa deberá definir autenticación y permisos del servidor mediante una spec separada o una ampliación aprobada.

## Flujos y errores

1. El prototipo presenta un selector de perfil. Administración y Taquilla presentan formularios separados con credenciales iniciales ficticias visibles.
2. Un inicio de sesión correcto para el perfil elegido habilita solo las secciones de ese perfil durante la demostración. Administración acepta `administrador@demo.local` / `demo1234`; Taquilla acepta `taquilla@demo.local` / `demo1234` y las cuentas efímeras creadas en esa carga. Credenciales incorrectas conservan el formulario y muestran feedback; salir devuelve al selector y elimina el estado de acceso local.
3. La navegación administrativa permite abrir Dashboard, Noticias, Eventos, Reporte de boletos, Modificación de recintos y Usuarios de taquilla.
4. Noticias y Eventos muestran formularios y tarjetas; los botones solo producen una respuesta visual de demostración y no persisten cambios.
5. Modificación de recintos presenta recintos ficticios editables y un feedback de éxito demostrativo; no persiste cambios.
6. Usuarios de taquilla presenta la cuenta inicial y permite crear cuentas efímeras con usuario y clave ficticios, que pueden iniciar sesión mientras la página siga cargada.
7. Venta de boletos recorre confirmación, procesamiento simulado y resultado ficticio; se puede cancelar antes del resultado.
8. Historial de boletos y Reporte muestran datos distintos, ficticios y estáticos para sus perfiles; filtros solo cambian la presentación y no consultan ni descargan datos reales.
9. La guía local explica estos recorridos, cómo ejecutar y verificar el proyecto, y advierte qué datos desaparecen al recargar.
10. En pantallas pequeñas, la navegación se adapta sin ocultar el acceso a las secciones ni provocar desbordamiento.

## Dependencias, riesgos y preguntas

- Dependencias/ADR: ADR 0002 acepta React 19, TypeScript, Vite 7 y Tailwind CSS 4 para SPAs; React Router permanece fuera de alcance. La persona solicitante aprobó preparar la base del dashboard y los paquetes mínimos `@arca/ui` y `@arca/tokens`. Las pruebas usarán Vitest conforme a la Constitución.
- Riesgos: Una interfaz de login o pago de demostración puede confundirse con un sistema real; se mitiga con rótulos persistentes de demostración y datos ficticios.
- Preguntas pendientes: Ninguna. Se aclaró que `index.html` debe seguir como entrada React/Vite; la interfaz permanece en la SPA y sus módulos HTML/CSS/TypeScript. La persona solicitante aprobó `administrador@demo.local` / `demo1234` para el login ficticio administrativo y la paleta institucional en todo el dashboard, sustituyendo sus acentos azules/verdes de marca.

## Revisión

- Aprobadores y fecha de la versión anterior: Solicitante, 2026-10-08; aprobó el alcance inicial de pantallas, la base React del dashboard, los componentes mínimos de `@arca/ui` y tokens semánticos mínimos de `@arca/tokens`.
- Aprobadores y fecha de esta ampliación: Solicitante, 2026-10-09.
- Aprobación de esta ampliación (CA-13/CA-14): Solicitante, 2026-10-09.
- Evidencia/enlaces: Referencias visuales adjuntas en esta conversación.
