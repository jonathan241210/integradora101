# Plan técnico · 014 · species-3d-models

- Spec: `apps/web/specs/014-species-3d-models.md`
- Estado de spec: Aprobada
- Responsable técnico: Por confirmar (sesión actual)

## Diseño de solución

Extender TulanPedia (`#animales`) para mostrar modelo 3D por especie cuando la API entregue `model_3d_url` válida. Se reutiliza `apps/web/src/assets/model-viewer.min.js` y el patrón de botón/toggle previo, adaptado al DOM dinámico actual de `js/animals.js`.

Flujo:
1. `js/api.js` ya consume `/published-species`; no cambia salvo que se requiera normalización (no prevista).
2. `js/animals.js` detecta `model_3d_url` válida (http/https o ruta relativa misma origen) y agrega botón 3D en la tarjeta.
3. Al activar, carga `model-viewer.min.js` con `import()` una sola vez, crea `<model-viewer>` con `src` validado, oculta foto y marca `aria-pressed=true`.
4. Al desactivar o error, restaura foto/marcador.
5. `animals.css` recibe estilos del botón/visor de tarjeta, sin tocar `styles.css`.
6. Contrato API depende de `api-031`.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| API / datos | `api-031` | Exponer `model_3d_url` en published-species |
| Cliente web | `apps/web/src/js/animals.js` | Render de botón 3D, validación URL, toggle inline, lazy-load model-viewer |
| Cliente web | `apps/web/src/animals.css` | Estilos de botón/visor 3D en tarjeta, foco, responsive |
| Cliente web | `apps/web/src/index.html` | Solo si hace falta ajuste mínimo de marcado/contenedor; preferir sin cambios estructurales |
| Pruebas web | `apps/web/src/tests/animals.test.mjs` (o nuevo test específico) | CA-01..CA-08 |
| Docs | `apps/web/docs/tulanpedia-catalogo.md` si existe/actualizar referencia | Documentar comportamiento 3D |

## Contrato y datos

- Endpoint consumido: `GET /api/v1/published-species` (api-015 + api-031).
- Campo nuevo consumido: `model_3d_url` (`string|null`). Si ausente, tratar como sin modelo.
- Validación cliente: aceptar solo `http:`/`https:` o ruta relativa misma origen que empiece por `/` y no `//`; rechazar `javascript:`, `data:`, backslashes. Usar validación equivalente a `safeImageUrl` pero para modelo.
- Sin DBR/migración web. Sin almacenamiento local.

## Seguridad, offline y operación

- No `innerHTML` con datos API. No cargar scripts remotos; solo `./assets/model-viewer.min.js` local.
- No enviar credenciales. Manejar error de carga de modelo con fallback a foto.
- Modelos grandes: carga bajo demanda; no precargar.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | muestra botón solo con `model_3d_url` válida | `apps/web/src/tests/animals.test.mjs` |
| CA-02 | activa visor, lazy-load, aria-pressed/etiqueta | `apps/web/src/tests/animals.test.mjs` |
| CA-03 | cierra/falla y restaura foto | `apps/web/src/tests/animals.test.mjs` |
| CA-04 | rechaza URLs inseguras | `apps/web/src/tests/animals.test.mjs` |
| CA-05 | accesibilidad/responsive smoke estático o DOM | `apps/web/src/tests/animals.test.mjs` |
| CA-06 | no regresión filtros/estados/mapa | `apps/web/src/tests/animals.test.mjs` + existentes |
| CA-07 | contrato API cubierto por api-031 tests | `apps/api/src/tests/Feature/Catalog/...` |
| CA-08 | presencia de pruebas nombradas | suite web/api |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | JS/CSS estático existente, model-viewer local ya presente, sin deps nuevas. |
| II. La spec manda | Sí | `web-014` Aprobada con CA-01..CA-08. |
| III. Lógica separada de la interfaz | Sí | `api.js` red; `animals.js` presentación/DOM; API resuelve URL. |
| IV. Un test por criterio | Sí | Mapeo CA-01..CA-08. |
| V. Una sola fuente de verdad para los datos | Sí | BD/API canónica; web solo consume. |
| VI. Código en inglés, personas en español | Sí | Código/ids en inglés; UI/textos en español. |

## Riesgos y decisiones

- ADR requerido/aprobado: no nuevo; ADR 0028 cubre excepción estática web.
- Riesgos: peso de .glb en móvil; compatibilidad model-viewer; contrato API no desplegado. Mitigar con lazy-load, fallback y dependencia explícita de api-031.
- Alternativa descartada: modal complejo; se elige inline por simplicidad.

## Orden y aprobación

1. Aprobar plan web-014.
2. Aprobar/ejecutar api-031 primero o en paralelo coordinado (contrato).
3. Crear tasks web-014 y api-031.
4. Implementar API, luego web, luego pruebas/verify.