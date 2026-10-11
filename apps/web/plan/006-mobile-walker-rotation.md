# Plan técnico · 006 · mobile-walker-rotation

- Spec: `apps/web/specs/006-mobile-walker-rotation.md`
- Estado de spec: Aprobada
- Estado técnico: Aprobado para tareas
- Responsable técnico: Por identificar

## Diseño de solución

Conservar la creación actual de los seis animalitos en `animations.js`. Al crear la capa, marcar como no visibles los elementos que no pertenezcan a la pareja activa cuando el viewport sea de hasta 560 px. Un ciclo de temporizador de 8 segundos avanzará entre las tres parejas consecutivas de la lista `ANIMALES` y repetirá el ciclo.

Usar `matchMedia('(max-width: 560px)')` para determinar el modo adaptable y escuchar sus cambios mientras la página permanezca abierta. En móvil, iniciar con la primera pareja; al cambiar a escritorio, cancelar el temporizador y volver a mostrar los seis elementos. Al regresar a móvil, mostrar la primera pareja y reiniciar el ciclo. La visibilidad de los animalitos continúa bajo el contenedor existente, por lo que el control actual, el modo de movimiento reducido y la ocultación al imprimir mantienen su función.

Los animales que no correspondan a la pareja activa se ocultarán con el atributo `hidden`, que la regla global existente `[hidden] { display: none !important; }` ya presenta de forma efectiva. No se requiere modificar `animations.css`; no cambiar las animaciones, contenido, orden, tamaños ni interacciones de los animales.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Cliente web | `apps/web/src/animations.js` | Seleccionar la pareja activa en viewports pequeños, cambiarla cada 8 segundos y responder al paso entre móvil y escritorio. |
| Cliente web | `apps/web/src/styles.css` (regla existente `[hidden]`) | La regla global actual oculta los animales fuera de la pareja activa; no se requiere modificar estilos. |
| Pruebas | `apps/web/src/tests/relocation.test.mjs` | Añadir pruebas nombradas para CA-01..CA-04 sin dependencias nuevas y conservar los tests existentes. |
| Especificación | `apps/web/specs/006-mobile-walker-rotation.md` | Mantener trazabilidad con el alcance aprobado; cambiar su estado a En progreso al comenzar implementación. |

## Contrato y datos

- Endpoints con rutas nombradas, autenticación y permisos: No aplica; cambio de presentación del portal estático.
- Validación/Form Requests, Actions, Resources y Policies: No aplica.
- Migraciones, `BaseModel`, auditoría y SoftDeletes: No aplica; no hay datos persistidos.
- Errores y compatibilidad: No se incorporan llamadas de red ni dependencias. Si `matchMedia` no estuviera disponible, conservar la presentación actual de todos los animales en lugar de ocultar contenido o romper la inicialización.
- Control responsive: el punto de corte de `max-width: 560px` debe coincidir con el breakpoint CSS vigente para el tamaño reducido de los animalitos.

## Seguridad, offline y operación

El cambio opera localmente en elementos decorativos ya existentes. No procesa datos de personas ni clínicos/financieros, no realiza peticiones, no afecta permisos ni almacenamiento, y no requiere cambios de offline, auditoría o secretos. El portal y sus dependencias permanecen sin cambios; la solución es compatible con el alojamiento actual del sitio estático.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | Verificar en entorno de prueba con reloj/viewport simulados que se muestran solo los índices 0–1 inicialmente, cambian a 2–3 y 4–5 cada 8 segundos y el ciclo vuelve a 0–1; confirmar que no hay más de dos elementos visibles durante los cambios. | `web` / `apps/web/src/tests/relocation.test.mjs` |
| CA-02 | Verificar que el modo de escritorio muestra los seis animales, que el temporizador móvil queda detenido y que las propiedades de recorrido actuales se conservan. | `web` / `apps/web/src/tests/relocation.test.mjs` |
| CA-03 | Verificar que el botón existente oculta y restaura el contenedor, que sus atributos y listener siguen presentes, que las transiciones de breakpoint no superponen parejas y que la inicialización sigue omitiendo animales con movimiento reducido; comprobar la regla de ocultación de impresión. | `web` / `apps/web/src/tests/relocation.test.mjs` |
| CA-04 | Ejecutar `node --test apps/web/src/tests/relocation.test.mjs` y verificar que los cuatro tests CA-01..CA-04 están nombrados, no se añaden dependencias y se preservan los tests existentes. | `web` / `apps/web/src/tests/relocation.test.mjs` |

Las pruebas usarán únicamente módulos integrados de Node. Para comprobar los intervalos y cambios de viewport, se evaluará el script existente con un entorno DOM/timers controlado dentro del propio test, sin instalar un navegador ni una biblioteca de DOM. La prueba CA-03 verifica que el estilo global `[hidden]` hace efectivos los cambios de visibilidad; por ello no se edita `animations.css`.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Se conserva el portal estático existente; no se agregan tecnologías, dependencias, servicios ni configuración específica de nube. |
| II. La spec manda | Sí | La spec `006-mobile-walker-rotation` está Aprobada y delimita el breakpoint, número de animales, intervalo y alcance. |
| III. Lógica separada de la interfaz | Sí | No hay reglas de negocio ni solicitudes a la API; solo se controla la presentación de elementos decorativos. |
| IV. Un test por criterio | Sí, previsto | Cada CA-01..CA-04 tendrá un test con su identificador en `apps/web/src/tests/relocation.test.mjs`. |
| V. Una sola fuente de verdad para los datos | Sí | No se leen ni escriben datos, base de datos o `settings_colores`. |
| VI. Código en inglés, personas en español | Sí | Los nombres técnicos y las pruebas permanecen en inglés; la spec y cualquier texto visible permanecen en español. |

No se proponen excepciones a la Constitución.

## Riesgos y decisiones

- ADR requerido/aprobado: No se requiere ADR; no se añade dependencia o tecnología.
- Alternativas y mitigaciones:
  - Ocultar animales únicamente con CSS podría no coordinarse con el ciclo de parejas y dejar más de dos visibles; la selección se administrará en el mismo flujo que crea los animales.
  - Si el viewport cambia mientras la página está abierta, el listener de `matchMedia` cancelará o reiniciará el ciclo y actualizará la visibilidad de inmediato.
  - El temporizador podría continuar cuando el visitante oculta el conjunto; verificar en la implementación que el temporizador no cause regresiones y que el botón siga ocultando todos los animales. No se altera el estado ni el comportamiento del control.

Decisión confirmada durante implementación: se usa la regla `[hidden]` ya existente en `styles.css`; no se añade una regla duplicada en `animations.css`.

## Orden y aprobación

1. Implementar el selector de pareja y manejo de cambios de viewport en `animations.js`.
2. Confirmar que la regla global existente para `[hidden]` garantiza que los animales no activos no se rendericen; no cambiar `animations.css` si se mantiene esa cobertura.
3. Añadir pruebas automatizadas de todos los criterios en `relocation.test.mjs`.
4. Ejecutar las pruebas dirigidas, la suite Node de la app y `/verify`; revisar cambios con `git diff --check`.
5. Actualizar `specs/006-mobile-walker-rotation.md` y crear/actualizar las tareas enlazadas antes de terminar la implementación.

Dependencias: T-01 (pruebas de control del entorno de navegador) precede a la selección adaptativa; la prueba de aceptación final sigue a cambios de código y estilos. La persona solicitante aprobó el plan técnico el 2026-10-08. La aprobación técnica queda registrada con esa aprobación; no se asigna un responsable del equipo no identificado.

Evidencia de implementación: el script usa `matchMedia('(max-width: 560px)')`, atributos `hidden` y un único intervalo cancelable de 8000 ms. El controlador se prueba con el reloj/viewport simulados; en navegador se comprobó la transición entre 1024 px y 390 px, el límite visible, el botón y la ausencia de desbordamiento. No se modificó `animations.css`; el estilo global `[hidden]` ya cumple el propósito. La app web sigue sin manifiesto `apps/web/src/package.json`; la suite manual de Node pasa las pruebas específicas, pero tiene un fallo preexistente ajeno a esta feature.
