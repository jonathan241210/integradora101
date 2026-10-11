# Plan técnico · 007 · header-walker-layer

- Spec: `apps/web/specs/007-header-walker-layer.md`
- Estado de spec: Aprobada
- Estado técnico: Aprobado para tareas
- Responsable técnico: Por identificar

## Diseño de solución

Reubicar la capa `.zoo-walkers` dentro del encabezado sticky existente, sin cambiar los seis elementos, sus animaciones, ni el código de selección responsive implementado en `006-mobile-walker-rotation`. La capa ocupará solo el rectángulo de la cabecera; su `overflow` limitará cualquier parte que sobrepase la altura de la franja. Reducir los SVG mediante CSS en esa capa para que cada dibujo quepa verticalmente en la barra.

Crear un contexto de apilamiento local en `.topbar`. Su fondo actual se conserva; la capa decorativa ocupa un nivel inferior y los elementos interactivos directos de la cabecera (`.brand`, `.menu-toggle`, `.main-nav` y `.top-actions`) se elevan sobre ella. El contenedor no intercepta eventos; los enlaces y botones permanecen en el nivel superior. Mantener `pointer-events` de cada animal para preservar el clic decorativo existente donde no haya un control superpuesto.

El control actual de mostrar/ocultar animalitos permanece fijo en su ubicación vigente fuera de la cabecera. Las preferencias de movimiento reducido, impresión, navegación responsive y rotación de parejas móvil quedan intactas.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Cliente web | `apps/web/src/animations.js` | Insertar la capa decorativa dentro de `.topbar` si existe, con fallback al `body`; conservar pareja móvil, control, temporizadores y eventos de los animales. |
| Cliente web | `apps/web/src/animations.css` | Delimitar la animación a la cabecera, establecer el apilamiento, reducir los SVG dentro de ella y conservar los estilos de rotación y el botón. |
| Pruebas | `apps/web/src/tests/relocation.test.mjs` | Añadir pruebas nombradas para CA-01..CA-05 con el test runner Node existente y sin dependencias. |
| Especificación | `apps/web/specs/007-header-walker-layer.md` | Implementar exactamente el alcance aprobado. |

## Contrato y datos

- Endpoints con rutas nombradas, autenticación y permisos: No aplica; cambio visual en portal estático.
- Validación/Form Requests, Actions, Resources y Policies: No aplica.
- Migraciones, `BaseModel`, auditoría y SoftDeletes: No aplica; no se persisten datos.
- Errores y compatibilidad: si `.topbar` no existe, adjuntar la capa al `body` sin impedir la creación del control actual. Si `matchMedia` no está disponible, conservar el fallback ya aprobado en 006. No añadir solicitudes de red ni dependencias.
- Comportamiento heredado: las seis animaciones de escritorio y el límite de dos animales con cambio cada 8 segundos hasta 560 px permanecen cubiertos por `006-mobile-walker-rotation`.

## Seguridad, offline y operación

La animación es local, decorativa y no accede a datos, API, storage u operaciones offline. La cabecera y todos sus controles continúan accesibles por teclado y puntero; no se cambian permisos, ni se almacenan datos ni secretos. No hay dependencia de plataforma o proveedor y el cambio es portable entre los alojamientos del portal.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | Verificar que la capa se inserta dentro del encabezado existente, no al final del `body`, y que CSS la limita a la franja sin posicionarla en la parte inferior. | `web` / `apps/web/src/tests/relocation.test.mjs` |
| CA-02 | Verificar el contexto de apilamiento: capa de animales debajo de marca, botón hamburguesa, navegación, buscador y compra; verificar reducción de SVG dentro de la cabecera. | `web` / `apps/web/src/tests/relocation.test.mjs` |
| CA-03 | Verificar que la capa es no interceptora y que siguen definidos los listeners de clic de los animales y de los controles existentes; revisar selección por navegador que botones/enlaces cubran el área superpuesta. | `web` / `apps/web/src/tests/relocation.test.mjs` |
| CA-04 | Verificar en los modos móvil/escritorio que se conserva el selector `max-width: 560px`, pareja máxima, temporizador de 8000 ms y los contratos del menú responsive ya existentes. | `web` / `apps/web/src/tests/relocation.test.mjs` |
| CA-05 | Verificar que existe un test explícitamente nombrado para CA-01..CA-05 y que el archivo usa solo módulos Node integrados. | `web` / `apps/web/src/tests/relocation.test.mjs` |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Usa CSS/JavaScript y pruebas Node ya disponibles; no se agrega tecnología ni dependencia. |
| II. La spec manda | Sí | La spec `007-header-walker-layer` está Aprobada con ubicación, capas, interacción y comportamiento heredado definidos. |
| III. Lógica separada de la interfaz | Sí | No se añade lógica de negocio ni llamadas a API; solo presentación e interacción decorativa ya existente. |
| IV. Un test por criterio | Sí, previsto | Se implementará un test nombrado por CA-01..CA-05 en la suite integrada de Node. |
| V. Una sola fuente de verdad para los datos | Sí | No hay persistencia ni acceso a datos del sistema. |
| VI. Código en inglés, personas en español | Sí | Selectores y código siguen en inglés; especificación y textos públicos permanecen en español. |

No se proponen excepciones.

## Riesgos y decisiones

- ADR requerido/aprobado: No se requiere ADR; no hay dependencia o tecnología nueva.
- Alternativas y mitigaciones:
  - Una capa `position: fixed` con z-index inferior a `.topbar` quedaría oculta por el fondo del encabezado. Se adjunta la capa dentro de `.topbar` y se establece jerarquía local de apilamiento.
  - SVG grandes podrían invadir el hero o cubrir otros controles. La capa se limita a los límites de la cabecera y los SVG se reducen con CSS dentro de ella.
  - Dar `pointer-events: none` a los propios animales eliminaría la interacción decorativa por clic. Se conserva su interacción, mientras la capa queda por debajo de los controles; se verifica que los controles reciban el evento.
  - El menú mobile abierto puede cambiar la altura del encabezado; la capa se extiende al rectángulo actual del header, y su contenido sigue debajo de los controles.

## Orden y aprobación

1. Cambiar `animations.js` para añadir la capa dentro de `.topbar` sin variar la creación de animales ni su rotación.
2. Cambiar `animations.css` para limitar y apilar la capa, y reducir visualmente los SVG en el encabezado.
3. Añadir pruebas CA-01..CA-05 en el test Node existente.
4. Ejecutar pruebas enfocadas y suite completa; comprobar escritorio, móvil, menú abierto, foco, clics y superposición en navegador.
5. Ejecutar `/verify` para `apps/web`, registrar si la app no está inicializada, ejecutar `git diff --check` y actualizar estados/evidencias.

Dependencias: T-01 cubre el montaje simulado antes de validar cambios al DOM; T-02 y T-03 preceden a T-04..T-08; validación visual browser depende del código y pruebas. El solicitante aprobó el plan técnico el 2026-10-08. Responsable técnico por identificar; no se asigna una persona no confirmada.

Evidencia de implementación: la capa se monta en `.topbar` con clase `is-header-layer` y queda limitada a 76 px; los controles directos usan z-index 2 sobre la capa z-index 1. El contenedor no intercepta puntero, los dibujos se limitan a 48 px de alto, y los elementos conservan su evento click. En navegador, 390/768/1024/1366 px sin desbordamiento horizontal; menú móvil, enlace de navegación, campo de búsqueda y acción de boletos utilizables. Las 5 pruebas específicas pasan. La suite general tiene un fallo previo fuera del alcance: CA-04 de `visit-info-icons-and-favicon` espera una declaración ausente en `styles.css`. `apps/web` no está inicializada con npm.
