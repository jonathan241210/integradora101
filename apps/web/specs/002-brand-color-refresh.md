# 002 · brand-color-refresh

- App dueña: `web`
- Apps/paquetes afectados: `apps/web`
- Estado: Implementada
- Solicitante / responsable funcional: por identificar
- Aprobación funcional: Solicitante, 2026-10-07 (aprobación en esta conversación)

## Problema y contexto

El portal institucional usa una combinación de verdes, tonos crema y vino que no aplica de forma consistente la identidad cromática definida en `docs/04-sistema-de-diseno.md`. La página es actualmente estática y no consume `GET /api/theme`.

## Objetivos

- Aplicar a todo el portal la paleta documentada para la identidad institucional, conservando la jerarquía visual, legibilidad y comportamiento actual.
- Centralizar los valores y su uso semántico en variables CSS; evitar repetir colores de marca en reglas individuales.
- Añadir verificación automatizada de la paleta y de los criterios de aceptación sin incorporar dependencias.

## Fuera de alcance

- Cargar los colores dinámicamente desde `GET /api/theme` o consultar/escribir `settings_colores`.
- Modificar la API, la base de datos, otras aplicaciones o paquetes.
- Migrar el portal a React, TypeScript, Vite o Tailwind.
- Cambiar contenido, imágenes, estructura, navegación o comportamiento del portal.
- Cambiar el modo claro o introducir una paleta para modo oscuro.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante | Leer y navegar el portal con la identidad visual institucional | Ninguno; contenido público |
| Equipo de desarrollo | Mantener colores de marca centralizados y verificables | Acceso al repositorio |

## Historias de usuario

Como visitante, quiero que el portal use los colores institucionales para reconocer su identidad y leer su contenido con claridad.

## Criterios de aceptación

- **CA-01:** Dada la paleta de `docs/04-sistema-de-diseno.md`, cuando se revise el tema central del portal, entonces sus variables CSS contendrán `--sidebar: #661a2f`, `--primary: #87293a`, `--secondary: #b79159`, `--accent: #DEC9A3`, los valores de fuente blanco y negro, el tamaño base de `16px` y Lato 400.
- **CA-02:** Dado el portal completo, cuando se inspeccionen sus superficies, títulos, enlaces, controles y pie, entonces los colores de marca se aplicarán mediante las variables centralizadas con texto apropiado para cada superficie; no quedará la paleta verde anterior como color de marca.
- **CA-03:** Dado el texto y los controles sobre fondos de color sólido, cuando se mida el contraste, entonces cumplirán WCAG 2.1 AA: 4.5:1 para texto normal y 3:1 para texto grande y componentes gráficos pertinentes.
- **CA-04:** Dado el portal antes del cambio, cuando se aplique la paleta, entonces conservará su contenido, estructura, enlaces locales, recursos, diseño adaptable e interacciones existentes; no se cambiarán HTML ni JavaScript salvo ajustes requeridos por una prueba aprobada.
- **CA-05:** Dada la verificación del portal, cuando se ejecute la prueba persistente con `node --test apps/web/src/tests/relocation.test.mjs`, entonces habrá comprobaciones automatizadas que nombren CA-01..CA-05 y no dependerán de paquetes nuevos.

## Reglas de negocio

- **RN-01:** Los valores de referencia y su significado provienen de `docs/04-sistema-de-diseno.md`; el tema de esta página estática usa esos valores localmente como respaldo, sin pretender reflejar cambios dinámicos de la fuente externa.
- **RN-02:** Los colores de marca se definen en un único bloque central de variables CSS y las reglas visuales consumen esas variables semánticas.
- **RN-03:** Los fondos oscuros usan texto claro y las superficies claras usan texto oscuro cuando sea necesario para mantener el contraste requerido.
- **RN-04:** `settings_colores` permanece fuera del alcance y, en cualquier caso, es una fuente externa de solo lectura.

## Datos, privacidad y auditoría

No se crean, consultan ni modifican datos. No se usan datos personales, clínicos o financieros. No se accede a `settings_colores` ni a credenciales.

## Flujos y errores

1. El navegador carga el portal estático y sus estilos locales.
2. Las variables centrales definen los colores institucionales y los estilos las aplican en las superficies correspondientes.
3. Si falta soporte para la familia tipográfica Lato, se usa una familia sans-serif de respaldo.
4. La prueba automatizada verifica valores, mapeo, contraste y conservación estructural del portal; los colores malformados no se reciben desde fuentes dinámicas en este alcance.

## Dependencias, riesgos y preguntas

- Dependencias/ADR: no se agregan dependencias ni se requiere ADR.
- Riesgos: un uso incorrecto del dorado o arena podría reducir la legibilidad; se mitiga con verificación de contraste WCAG 2.1 AA. La página seguirá sin reflejar cambios posteriores de `settings_colores`.
- Preguntas pendientes: ninguna.

## Revisión

- Aprobadores y fecha: Solicitante aprobó el alcance funcional el 2026-10-07 en esta conversación.
- Evidencia/enlaces: Paleta y mapeo descritos en [`docs/04-sistema-de-diseno.md`](../../../docs/04-sistema-de-diseno.md). Los tests CA-01..CA-05 pasan en `node --test apps/web/src/tests/relocation.test.mjs` (12 tests totales, 0 fallos); contraste revisado, referencias locales resueltas y portal comprobado en móvil.
