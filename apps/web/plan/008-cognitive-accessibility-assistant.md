# Plan técnico · 008 · cognitive-accessibility-assistant

- Spec: `apps/web/specs/008-cognitive-accessibility-assistant.md`
- Estado de spec: Implementada
- Estado técnico: Implementado y verificado localmente
- Responsable técnico: Por identificar

## Diseño de solución

Agregar al portal estático un widget de accesibilidad implementado con JavaScript y CSS nativos, cargados desde los recursos ya usados por `index.html`. No convertir la app a React ni agregar dependencias.

El botón flotante abre un panel no modal, etiquetado con `aria-controls` y `aria-expanded`. El cierre con Escape devuelve el foco al botón; al abrir no se atrapa el foco y el resto del sitio permanece operable. En viewport estrecho el panel se limita al ancho y alto visibles y permite desplazamiento interior.

Mantener un estado versionado en memoria con `profile` y los cinco modos. Al iniciar, leer y validar defensivamente una sola entrada JSON de `localStorage`; si su API falla o el contenido no se puede interpretar, usar el estado por defecto y continuar en memoria. Guardar cambios locales bajo una clave específica del widget. “Restablecer” aplica estado inicial y elimina la clave. Los perfiles aplican las combinaciones aprobadas; al cambiar un modo individual el selector muestra “Personalizado”, salvo que el resultado vuelva a coincidir exactamente con un perfil.

Implementar los efectos mediante clases/tokens de estado en `document.documentElement`, evitando reglas globales que oculten o reconstruyan contenido:

- **Modo Foco:** usar la ubicación del puntero o del foco de teclado para identificar el bloque textual actual más cercano (por ejemplo, encabezado, párrafo, elemento de lista o ficha de ubicación), atenuando los otros bloques con escala de grises sin ocultarlos ni reducir su luminancia. Excluir navegación, paneles, controles, formularios, diálogos, contenido embebido y elementos con `aria-hidden`.
- **Lectura para dislexia:** activar una clase con pila tipográfica local disponible y espaciado moderado en contenido legible; no descargar fuentes. No cambiar dimensiones o tipografía de controles de formulario.
- **Bionic Reading:** envolver únicamente texto visible de contenido en marcas visuales que resalten el prefijo de cada palabra. Mantener cada palabra en línea para no partirla ni heredar estilos de etiquetas específicas del portal; guardar y restaurar los nodos originales exactamente al desactivar. Excluir entradas, botones, enlaces interactivos, contenido editable, SVG, scripts, estilos y nodos ocultos. Mantener texto accesible idéntico y conservar intacto el texto seleccionado y copiado.
- **Regla de Lectura:** dibujar una banda fija translúcida de 40 px no interactiva y centrada en el puntero o en el bloque enfocado por teclado; tocar la pantalla reposiciona la banda. Ignorar movimiento sobre el panel, usar `pointer-events: none` y no cambiar la selección.
- **Interfaz Calma:** reducir animaciones/transiciones y estímulos visuales sin rebajar los requisitos de contraste; nunca anular `prefers-reduced-motion`. Se combina con el estilo de la preferencia del sistema.

El botón “Resumir esta página” se renderiza deshabilitado con texto visible “Próximamente”; no registra un controlador de resumen, no lee el contenido, no solicita claves y no realiza peticiones. Ningún modo transforma el contenido fuente o la estructura de navegación.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Portal web | `apps/web/src/index.html` | Añadir el botón de lanzamiento, región del panel, controles semánticos, selector de perfiles, acción restablecer y botón de resumen no disponible. |
| Portal web | `apps/web/src/accessibility.js` | Estado, perfiles, persistencia local tolerante a errores, apertura/cierre, actualización de modos y aplicación/restauración de transformaciones de lectura. |
| Portal web | `apps/web/src/accessibility.css` | Estilos del lanzador/panel, disposición responsive, foco, regla de lectura y efectos visuales reversibles con tokens/clases semánticas ya existentes. |
| Portal web | `apps/web/src/index.html` | Cargar el nuevo archivo JS/CSS local sin recursos o fuentes remotos. |
| Pruebas | `apps/web/src/tests/relocation.test.mjs` | Agregar entorno de prueba de DOM/localStorage/medios/timers con `node:vm` y tests nombrados CA-01..CA-07; no incorporar paquetes. |
| Especificación | `apps/web/specs/008-cognitive-accessibility-assistant.md` | Cambiar a En progreso al iniciar la implementación y registrar evidencia de verificación al finalizar. |

## Contrato y datos

- Endpoints con rutas nombradas, autenticación y permisos: No aplica; el widget no usa la API.
- Validación/Form Requests, Actions, Resources y Policies: No aplica.
- Migraciones, `BaseModel`, auditoría y SoftDeletes: No aplica.
- Persistencia: un único valor JSON versionado en `localStorage`, limitado a estados enumerados y perfil; nunca almacenar contenido de página. Si lectura/escritura/borrado lanza excepción, degradar a estado en memoria y mantener el widget operativo, sin mensajes que filtren detalles técnicos.
- Errores y compatibilidad: navegadores sin `localStorage`, `MutationObserver`, clipboard API u otros métodos opcionales no deben impedir el panel básico; preferir APIs estándar existentes y verificar soporte/fallback. No depender de disponibilidad de proveedores remotos.
- Resumen IA: sin endpoint, claves, almacenamiento, carga de contenido, petición ni evento de éxito ficticio.

## Seguridad, offline y operación

El widget opera localmente, no captura ni transmite contenido del portal, y persiste exclusivamente preferencias no identificables en el perfil aislado del navegador. El contenido generado por fuentes dinámicas se trata como texto y nunca se inserta como HTML no confiable. Evitar almacenar datos de página, parámetros o información de formularios. El resumen no procesa texto. No se agregan permisos, servicios, paquetes, secretos ni dependencias de nube. No requiere sincronización offline ni cambios de base de datos.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | `CA-01 cognitive-accessibility-assistant`: verificar botón, atributos semánticos, apertura/cierre, Escape y retorno de foco sin trapping; comprobar contenido etiquetado. | `web` / `apps/web/src/tests/relocation.test.mjs` |
| CA-02 | `CA-02 cognitive-accessibility-assistant`: probar cada perfil, combinaciones de modos, “Sin perfil”, estado “Personalizado” ante cambios individuales y regreso a perfil exacto. | `web` / `apps/web/src/tests/relocation.test.mjs` |
| CA-03 | `CA-03 cognitive-accessibility-assistant`: verificar aplicación/reversión de cada modo; en especial texto accesible y texto copiado de bionic, foco, regla no interceptora, exclusión de controles y compatibilidad de movimiento reducido. | `web` / `apps/web/src/tests/relocation.test.mjs` |
| CA-04 | `CA-04 cognitive-accessibility-assistant`: verificar carga/guardado/borrado de estados, persistencia tras reinicializar el script y degradación ante storage inválido/no disponible. | `web` / `apps/web/src/tests/relocation.test.mjs` |
| CA-05 | `CA-05 cognitive-accessibility-assistant`: verificar resumen deshabilitado “Próximamente”, ausencia de controlador de resumen, fetch/XHR y acceso a claves. | `web` / `apps/web/src/tests/relocation.test.mjs` |
| CA-06 | `CA-06 cognitive-accessibility-assistant`: verificar reglas responsive y foco visible a 360/390/768/1024/1366 px, ausencia de desbordamiento y presencia/funcionamiento de controles preexistentes. | `web` / `apps/web/src/tests/relocation.test.mjs` |
| CA-07 | `CA-07 cognitive-accessibility-assistant`: verificar cobertura explícita de CA-01..CA-07, uso de builtins Node únicamente y ejecutar suite completa. | `web` / `apps/web/src/tests/relocation.test.mjs` |

La verificación de contraste, capas visuales, regla de lectura y operación por lector de pantalla también requiere prueba manual de navegador; esta complementa los tests automatizados, no los sustituye.

## Registro de ajustes de implementación

- Las marcas de Bionic Reading fuerzan formato en línea y heredan las propiedades tipográficas del texto contenedor para evitar que reglas preexistentes como `.location-item span` o `.location-item strong` dividan prefijos y sufijos en líneas separadas o alteren mayúsculas/tamaño.
- La Regla de Lectura usa una banda suave en lugar de una línea de 3 px, se centra en la coordenada de seguimiento y no se reposiciona mientras el puntero está dentro del panel.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | HTML/CSS/JS y test runner Node existentes; sin paquetes, fuentes externas ni servicios propietarios. |
| II. La spec manda | Sí | Spec 008 aprobada por la persona solicitante e implementada conforme a sus CA/RN. |
| III. Lógica separada de la interfaz | Sí | No hay reglas de negocio ni peticiones API; JS se limita a presentación e interacción local. |
| IV. Un test por criterio | Sí | Hay un test automatizado nombrado para cada CA-01..CA-07; los siete tests enfocados pasan. |
| V. Una sola fuente de verdad para los datos | Sí | No se crean ni editan datos del sistema; preferencias privadas del navegador no son datos de negocio y nunca se sincronizan con servidor. |
| VI. Código en inglés, personas en español | Sí | Identificadores de código en inglés; UI, perfiles, instrucciones y mensajes en español. |

No se proponen excepciones. Si el comportamiento de texto biónico no puede preservar semántica accesible y copia sin alterar el texto, se debe resolver en implementación de forma compatible con CA-03 o detenerse y proponer una revisión de la spec antes de reducir el criterio.

## Riesgos y decisiones

- ADR requerido/aprobado: No se requiere ADR; no se añaden dependencias, proveedor o integración externa.
- Alternativas y mitigaciones:
  - Cargar OpenDyslexic desde una CDN introduciría un proveedor y una dependencia externa; se rechaza. Usar una pila local disponible y conservar reversión.
  - Cambiar `textContent` para Bionic dañaría copia, lectores y dinámicas; se guardan/restauran nodos originales, se ocultan las marcas visuales a AT y se comprobó en navegador que la selección copiada conserva exactamente el texto.
  - El desenfoque global puede oscurecer controles; delimitarlo a bloques legibles elegibles con escala de grises y comprobar foco, contraste y navegación.
  - Fallos de almacenamiento local no deben impedir el uso de controles; mantener estado en memoria durante la vida de la página.
  - El resumen IA podría parecer disponible aunque no lo esté; deshabilitar explícitamente y usar “Próximamente”, sin estados falsos ni mensajes de API key.

## Orden y aprobación

1. Crear entorno de pruebas local Node que modele controles, listeners, estados, `localStorage` y recargas del controlador.
2. Añadir marcado del lanzador y el panel en `index.html`, con controles accesibles, estados iniciales y resumen deshabilitado.
3. Implementar estado/perfiles/persistencia y controlador accesible en `accessibility.js`.
4. Implementar estilos responsive, foco visible y efectos reversibles en `accessibility.css`.
5. Añadir tests CA-01..CA-07 y ejecutar primero pruebas enfocadas, luego la suite completa.
6. Verificar en navegador los viewports definidos, los cinco modos, perfil/restablecer, contraste, texto copiado y uso de teclado/lector de pantalla; ejecutar `/verify` y `git diff --check`.

## Evidencia de verificación

- `node --check apps/web/src/accessibility.js`: aprobado.
- `node --test --test-name-pattern='cognitive-accessibility-assistant' apps/web/src/tests/relocation.test.mjs`: 7/7 aprobados.
- Suite completa `node --test apps/web/src/tests/relocation.test.mjs`: 44/45 aprobados; persiste el fallo preexistente `CA-04 visit-info-icons-and-favicon baja 8 px los tres iconos sin alterar el centrado`, ajeno a esta feature.
- Navegador: panel dentro del viewport y sin overflow horizontal a 360, 390, 768, 1024 y 1366 px; foco y Escape devuelven el foco al lanzador; el árbol accesible anuncia región y controles etiquetados; selección Bionic coincide con el texto original; la regla es una banda de 40 px con `pointer-events: none`. No se ejecutó una sesión con lector de pantalla real.
- `/verify`: `apps/web` aún no inicializada porque no existe `apps/web/src/package.json`; no se instalaron herramientas ni se creó un manifiesto.
- `git diff --check`: aprobado.

Dependencias: T-01 precede a implementación y tests; T-02 precede a controlador y verificaciones semánticas; T-03/T-04 preceden a pruebas de flujo y responsive. La persona solicitante aprobó funcionalmente la spec y el plan técnico el 2026-10-08. No se asigna responsable técnico no identificado.
