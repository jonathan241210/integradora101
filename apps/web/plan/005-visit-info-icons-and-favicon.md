# Plan técnico · 005 · visit-info-icons-and-favicon

- Spec: `apps/web/specs/005-visit-info-icons-and-favicon.md`
- Estado de spec: Implementada
- Estado técnico: Implementado y verificado; iconos centrados con desplazamiento uniforme de 8 px
- Responsable técnico: Por identificar
- Fecha: 2026-10-08

## Diseño de solución

Mantener el portal estático y realizar el cambio en HTML/CSS local. La franja `.infobar` conservará sus tres bloques y sus textos/enlaces; cada bloque se presentará como columna con icono y texto centrados. Los iconos de `.infobar` tendrán `margin-top: 8px` para desplazarlos ligeramente hacia abajo en los tres bloques, sin alterar la alineación central ni solaparse con el contenido. En anchuras estrechas se conserva el apilado de bloques que ya existe. El favicon apunta a la copia local `apps/web/src/assets/zoo-logo.jpeg`; el original `packages/ui/logo.jpeg` no se modifica ni se elimina.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Portal estático | `apps/web/src/index.html` | Cambiar la referencia rota del favicon por una ruta relativa local a `assets/`. |
| Portal estático | `apps/web/src/styles.css` | Mantener centrado el contenido de los datos de visita y bajar uniformemente 8 px sus iconos. |
| Asset de portal | `apps/web/src/assets/zoo-logo.jpeg` | Incluir copia local del logo proporcionado y preservar intacto el original. |
| Pruebas | `apps/web/src/tests/relocation.test.mjs` | Añadir tests nombrados CA-01..CA-03 para distribución responsive, referencia y existencia del favicon, y preservación de las etiquetas/enlace. |

## Contrato y datos

- Endpoints con rutas nombradas, autenticación y permisos: No aplica; portal público estático.
- Validación/Form Requests, Actions, Resources y Policies: No aplica; no se agrega lógica ni solicitudes HTTP.
- Migraciones, `BaseModel`, auditoría y SoftDeletes: No aplica; no se crean ni modifican datos.
- Errores y compatibilidad: La ruta relativa del favicon debe resolver desde `apps/web/src/` y no depender de la estructura superior del repositorio. El contenido informativo y sus destinos permanecen sin cambios.

## Seguridad, offline y operación

- No se leen ni escriben datos sensibles, credenciales ni configuración del servidor.
- El logo se sirve localmente; no se introducen llamadas a dominios de terceros ni recursos nuevos remotos.
- No se agregan paquetes ni dependencias. La solución usa HTML/CSS y `node:test`.
- El portal conserva comportamiento estático y no requiere conectividad para renderizar esta franja.
- No hay cambios a API, permisos, BD, caché, sincronización ni auditoría.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | `CA-01 visit-info-icons-and-favicon` verifica estructura/estilos de bloque centrado y reglas responsive para las anchuras acordadas. | Node `node:test`; `apps/web/src/tests/relocation.test.mjs`. |
| CA-02 | `CA-02 visit-info-icons-and-favicon` verifica `rel=icon`, ruta local sin escape de directorio y existencia del archivo bajo `src/assets/`. | Node `node:test`; `apps/web/src/tests/relocation.test.mjs`. |
| CA-03 | `CA-03 visit-info-icons-and-favicon` comprueba tests nombrados CA-01..CA-03, los textos/enlaces originales y que la suite usa builtins sin dependencias nuevas. | Node `node:test`; `apps/web/src/tests/relocation.test.mjs`. |
| CA-04 | `CA-04 visit-info-icons-and-favicon` verifica el margen superior de 8 px para los tres iconos y conserva sus reglas de centrado y responsive. | Node `node:test`; `apps/web/src/tests/relocation.test.mjs`. |

La revisión visual en el navegador medirá el ancho del documento y confirmará centrado/alineación de los bloques en 360, 390, 768, 1024 y 1366 px. Se comprobará adicionalmente que el navegador resuelva el recurso del favicon local.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Solo HTML, CSS, JPEG local y `node:test`; no se agrega tecnología. |
| II. La spec manda | Sí | Spec aprobada con CA-04; el plan actualizado espera aprobación técnica antes de implementar el incremento. |
| III. Lógica separada de la interfaz | Sí | Solo presentación estática; no hay cálculos de dominio ni acceso a API. |
| IV. Un test por criterio | Sí, planeado | Se mapearon CA-01..CA-04 a pruebas nombradas en la suite Node local. |
| V. Una sola fuente de verdad para los datos | Sí | No se persisten ni modifican datos. |
| VI. Código en inglés, personas en español | Sí | Selectores/rutas/IDs permanecen en inglés; el contenido visible y la documentación son españoles. |

## Riesgos y decisiones

- ADR requerido/aprobado: No se requiere ADR; no se agrega dependencia ni tecnología.
- Logo fuente: conservar intacto `packages/ui/logo.jpeg` y copiarlo a `apps/web/src/assets/zoo-logo.jpeg`; no referenciar el directorio del paquete desde la página.
- Riesgo visual: el texto largo de ubicación puede ocupar varias líneas; se centra el bloque con ancho flexible y sin truncamiento.
- Riesgo de test: la suite completa puede reportar fallos preexistentes de otras features; ejecutar los tests enfocados además del conjunto completo y distinguir resultados.

## Orden y aprobación

1. Plan y checklist iniciales aprobados por el solicitante el 2026-10-08; incremento CA-04/RN-04 aprobado funcionalmente en la conversación.
2. El incremento del plan fue aprobado por el solicitante el 2026-10-08; aprobar el checklist actualizado antes de implementar.
3. Aplicar solo `margin-top: 8px` a los iconos de `.infobar`; preservar HTML, contenido, enlaces y el logo de origen.
4. Añadir test nombrado para CA-04; ejecutar tests dirigidos, suite completa, `git diff --check` y revisión visual en los viewports de CA-01.
5. La implementación inicial y favicon local siguen verificados. `/verify` informa que `apps/web` no está inicializada al faltar `src/package.json`.
