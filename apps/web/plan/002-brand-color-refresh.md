# Plan técnico · 002 · brand-color-refresh

- Spec: `apps/web/specs/002-brand-color-refresh.md`
- Estado de spec: Aprobada
- Responsable técnico: por identificar
- Estado técnico: Implementado
- Fecha del plan: 2026-10-07

## Diseño de solución

Actualizar únicamente la capa CSS del portal estático. `:root` será la fuente central de los colores semánticos del portal, la tipografía y el tamaño base. Las reglas de componentes y secciones consumirán esas variables en lugar de la paleta verde/vino anterior. Se conservarán los tonos verdes que sean parte de la ilustración del mapa de recintos y no funcionen como color de marca.

Aplicar la paleta documentada:

| Variable CSS | Valor de respaldo | Uso |
|---|---|---|
| `--sidebar` | `#661a2f` | Superficies de marca oscura y capas del hero |
| `--primary` | `#87293a` | Títulos, controles y énfasis institucional |
| `--sidebar-primary` | `#87293a` | Énfasis sobre superficies de marca oscura |
| `--secondary` | `#b79159` | Acentos y superficies secundarias |
| `--footer` / `--footer-background` | `#b79159` | Fondo del pie |
| `--footer-foreground` | `#000000` | Texto legible sobre el fondo del pie |
| `--accent` | `#DEC9A3` | Acentos claros |
| `--foreground` / `--foreground-dark` | `#000000` | Texto en superficies claras |
| `--foreground-light` | `#ffffff` | Texto en superficies oscuras |
| `--font-size-base` | `16px` | Tamaño base |
| `--font-family-base` | `"Lato", sans-serif` | Familia tipográfica con respaldo local |
| `--font-weight-base` | `400` | Peso tipográfico base |

Se añadirán, donde hagan falta, aliases semánticos para superficies, pie, texto y controles en un único bloque `:root`. No se conectará el portal estático a `GET /api/theme`, no se escribirá ni consultará `settings_colores`, y no se agregará una carga de fuentes externa.

La prueba existente comprueba hashes exactos de los archivos relocados, incluido `styles.css`, y por ello no permite el cambio visual. Se actualizarán coherentemente los artefactos `001-relocate-static-portal` para registrar que la feature 002 autoriza la modificación de `styles.css`; la prueba conservará la integridad de HTML, JavaScript y los recursos que no están en alcance y verificará los estilos conforme a CA-01..CA-05.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Portal estático | `apps/web/src/styles.css` | Centralizar tokens de marca y aplicarlos a las superficies existentes, con contraste y modo claro. |
| Pruebas | `apps/web/src/tests/relocation.test.mjs` | Mantener la verificación estructural y añadir tests de paleta, aplicación semántica y contraste sin dependencias externas. |
| Artefactos SDD relacionados | `apps/web/specs/001-relocate-static-portal.md`, `apps/web/plan/001-relocate-static-portal.md`, `apps/web/tasks/001-relocate-static-portal.md` | Registrar que la nueva feature aprobada permite actualizar estilos, manteniendo las otras garantías de la reubicación. |
| Artefactos de feature | `apps/web/specs/002-brand-color-refresh.md`, `apps/web/plan/002-brand-color-refresh.md`, `apps/web/tasks/002-brand-color-refresh.md` | Mantener la trazabilidad CA/T de esta feature. |

## Contrato y datos

- **Endpoints con rutas nombradas, autenticación y permisos:** no aplica; no se crea endpoint.
- **Validación/Form Requests, Actions, Resources y Policies:** no aplica; no hay API ni lógica de negocio.
- **Migraciones, `BaseModel`, auditoría y SoftDeletes:** no aplica; no se toca la base de datos ni `settings_colores`.
- **Errores y compatibilidad:** el tema queda en CSS estático; si Lato no está instalada localmente, el navegador usa `sans-serif`. No se realiza una petición de red para obtener fuentes o tema. Las rutas locales de HTML, CSS y JS siguen relativas a `apps/web/src/`.

## Seguridad, offline y operación

- No se procesan datos sensibles, ni se usan credenciales o configuración de base de datos.
- No se modifica la fuente externa `settings_colores`; el alcance elegido es una aplicación estática de los defaults documentados.
- Los valores CSS se declaran en el repositorio, no se construyen desde entrada dinámica.
- No hay cambios de conectividad u operación offline; no se agregan dependencias, servicios, SDK o archivos de manifiesto.
- Portabilidad: CSS, HTML y JavaScript estáticos, servibles con el servidor PHP de desarrollo o cualquier servidor estático compatible.
- Contraste: los pares de tokens utilizados para texto normal deben medir al menos 4.5:1; los pares aprobados para texto grande y componentes gráficos, al menos 3:1. La prueba implementará el cálculo WCAG 2.1 para los pares explícitos de primer plano/fondo.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| **CA-01** | `CA-01 centraliza los valores de marca y tipografía`: comprueba los valores exactos de las variables CSS requeridas. | `apps/web/src/tests/relocation.test.mjs` |
| **CA-02** | `CA-02 aplica los tokens a la interfaz`: comprueba los mapeos semánticos de los selectores de títulos, navegación, controles, secciones y pie, y rechaza las antiguas variables de marca. | `apps/web/src/tests/relocation.test.mjs` |
| **CA-03** | `CA-03 conserva contraste WCAG`: calcula contraste WCAG 2.1 para cada par semántico de texto/fondo usado en componentes sobre colores sólidos. | `apps/web/src/tests/relocation.test.mjs` |
| **CA-04** | `CA-04 conserva contenido y comportamiento`: conserva los hashes de `index.html`, `script.js` y assets fuera de alcance; comprueba referencias locales y reglas responsivas del CSS. | `apps/web/src/tests/relocation.test.mjs` |
| **CA-05** | `CA-05 verifica criterios sin dependencias`: comprueba que el test nombra CA-01..CA-05 y solo importa módulos `node:` aprobados, sin `package.json`. | `apps/web/src/tests/relocation.test.mjs` |

Además, se abrirá la página en navegador a escritorio y móvil para una comprobación visual de jerarquía y comportamiento adaptable. Esta inspección complementa, pero no reemplaza, los tests automatizados.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| **I. Stack mínimo y portable** | Sí | Solo se actualizan CSS, documentación y pruebas con `node:test`; no se agrega tecnología ni dependencia. El portal continúa estático conforme a la decisión registrada en spec 001. |
| **II. La spec manda** | Sí | La spec `002-brand-color-refresh` está aprobada; esta implementación se limita a su paleta, pruebas y actualización documental vinculada. |
| **III. Lógica separada de la interfaz** | Sí | No se añade lógica de negocio, API ni solicitud de datos desde la interfaz. |
| **IV. Un test por criterio** | Sí | El runner integrado de Node ejecuta tests nombrados CA-01..CA-05 en `apps/web/src/tests/relocation.test.mjs`. |
| **V. Una sola fuente de verdad para los datos** | Sí | No hay persistencia. `settings_colores` no se consulta ni modifica. Los valores CSS son defaults visuales estáticos expresamente aprobados para esta página. |
| **VI. Código en inglés, personas en español** | Sí | Variables CSS y nombres de tests en inglés; contenido y documentación de aceptación en español. |

Ninguna excepción se implementa sin revisión y acuerdo requeridos.

## Riesgos y decisiones

- **ADR requerido/aprobado:** ninguno; no se incorporan dependencias o tecnologías.
- **Fuente de valores:** defaults de `docs/04-sistema-de-diseno.md` y `packages/tokens/README.md`; no hay conexión dinámica a API en esta spec.
- **Decisión tipográfica:** declarar `Lato, sans-serif` localmente; no agregar descarga externa ni nuevo archivo de fuente.
- **Riesgo de contraste:** el dorado y la arena no se usarán como primer plano de texto normal sobre fondos claros; los pares efectivos se fijarán en las variables de foreground y se medirán en tests.
- **Riesgo de prueba de reubicación:** la prueba 001 originalmente exige hashes idénticos para CSS; se ajustarán sus expectativas y artefactos SDD para autorizar exclusivamente el CSS actualizado y seguir protegiendo HTML, JavaScript, rutas y assets.

## Orden y aprobación

1. Obtener aprobación técnica de este plan antes de crear tasks o implementar.
2. Crear `apps/web/tasks/002-brand-color-refresh.md` con tareas enlazadas a CA-01..CA-05.
3. Actualizar los artefactos SDD 001 de la reubicación para documentar que esta feature aprobada modifica estilos; mantener intactos sus criterios estructurales no afectados.
4. Actualizar `styles.css` y el test persistente, sin modificar HTML, JavaScript, assets, API ni base de datos.
5. Ejecutar `node --test apps/web/src/tests/relocation.test.mjs`, revisar contraste, comprobar `git diff --check` y abrir el portal en escritorio/móvil.
6. Verificar la app con `/verify` y revisar que solo se hayan tocado los archivos declarados.
7. Solicitante aprobó alcance y plan técnico el 2026-10-07 en esta conversación. No se infiere identidad nominal del aprobador ni se crea commit como parte del plan.

**Estado técnico:** Implementado. Plan aprobado por el solicitante el 2026-10-07; pruebas CA-01..CA-05 verificadas con el runner Node integrado, 12 tests totales y 0 fallos.
