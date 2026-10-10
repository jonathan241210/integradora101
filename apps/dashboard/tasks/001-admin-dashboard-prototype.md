# Tareas · 001 · admin-dashboard-prototype

- Spec: `apps/dashboard/specs/001-admin-dashboard-prototype.md` (Estado: **Aprobada**)
- Plan: `apps/dashboard/plan/001-admin-dashboard-prototype.md` (Estado técnico: **Aprobado**, solicitante, 2026-10-09)
- Estado del checklist: Aprobado por el solicitante, 2026-10-09
- Estado de implementación: T-23..T-36 y T-38..T-43 completadas; T-37 y T-22 pendientes
- Nueva ampliación (CA-13/CA-14): aprobada por el solicitante, 2026-10-09

## Trazabilidad

| Criterio | Tareas |
|---|---|
| CA-01 | T-05, T-13, T-23, T-26, T-29 |
| CA-02 | T-05, T-14, T-23, T-30 |
| CA-03 | T-06, T-15, T-35 |
| CA-04 | T-07, T-16, T-26, T-35 |
| CA-05 | T-08, T-17, T-35 |
| CA-06 | T-09, T-18, T-35, T-37 |
| CA-07 | T-10, T-19, T-36, T-37 |
| CA-08 | T-01..T-04, T-20, T-37 |
| CA-09 | T-23, T-31 |
| CA-10 | T-26, T-32 |
| CA-11 | T-27, T-33 |
| CA-12 | T-25, T-28, T-34 |

## Implementación

- [x] **T-01** (CA-08; RN-06): crear `packages/tokens/package.json` y `packages/tokens/src/tokens.css` con tokens semánticos de respaldo basados en la documentación existente, sin valores de marca dentro de componentes y sin conexión a API.
- [x] **T-02** (CA-08; RN-06): crear `packages/ui/package.json`, su punto de entrada `packages/ui/src/index.ts`, estilos y componentes accesibles mínimos Button, Field, Select, Card, Badge, Dialog y Alert basados solo en `@arca/tokens`.
- [x] **T-03** (CA-08): crear el manifiesto/configuración mínima de `apps/dashboard` para React 19, TypeScript, Vite 7, Tailwind CSS 4 y Vitest; declarar referencias locales a `@arca/ui` y `@arca/tokens`, y scripts explícitos para dev, build, types y test. No crear workspace global ni añadir router.
- [x] **T-04** (CA-08): preparar el punto de entrada, estilos globales y shell React en `apps/dashboard/src/`; importar tokens semánticos y componentes compartidos, y comprobar que el build compila los paquetes locales.
- [x] **T-05** (CA-01, CA-02; RN-01, RN-02): implementar el login demostrativo y la pantalla Dashboard con fixtures ficticios y aviso persistente; separar vista y estado de presentación en componentes y hook/ViewModel.
- [x] **T-06** (CA-03; RN-01, RN-03): implementar vistas de Noticias y Eventos con campos y tarjetas de muestra; botones con respuesta únicamente visual, sin guardar/publicar/eliminar datos.
- [x] **T-07** (CA-04; RN-01, RN-04): implementar interfaz de Venta de boletos y estados demostrativos de confirmación, procesamiento y venta realizada; no agregar cálculo de totales/precios, campos de tarjeta ni persistencia.
- [x] **T-08** (CA-05; RN-01): implementar Reporte de boletos con indicadores, filtros y filas estáticas ficticias; no descargar ni consultar datos financieros reales.
- [x] **T-09** (CA-06; RN-05): adaptar sidebar, barra superior, formularios, tarjetas, diálogos, tabla y mensajes a móvil/tablet/escritorio; asegurar interacción de teclado, foco visible y `prefers-reduced-motion`.
- [x] **T-10** (CA-07; RN-01..RN-05): implementar navegación efímera entre cinco secciones, menú colapsable móvil y estados de diálogo/proceso; mantener la advertencia de prototipo visible y no usar rutas, API ni almacenamiento persistente.

## Pruebas automatizadas

- [x] **T-11** (CA-08): añadir `CA-08 admin-dashboard-prototype` para validar exports y estilos semánticos de `@arca/ui`/`@arca/tokens`, manifiestos locales, scripts y compilación/type-check.
- [x] **T-12** (CA-07): añadir `CA-07 admin-dashboard-prototype` que comprueba que existen pruebas explícitas CA-01..CA-06, no hay cliente de red/paquetes prohibidos y los flujos están cubiertos.
- [x] **T-13** (CA-01; RN-02): añadir `CA-01 admin-dashboard-prototype` para verificar login y transición demostrativa, sin credenciales enviadas ni validación/autenticación real.
- [x] **T-14** (CA-02; RN-01): añadir `CA-02 admin-dashboard-prototype` para verificar navegación, indicadores, fixtures y rótulo visible de demostración.
- [x] **T-15** (CA-03; RN-03): añadir `CA-03 admin-dashboard-prototype` para comprobar pantallas/campos/listados de Noticias y Eventos, y que las acciones solo muestran feedback ficticio.
- [x] **T-16** (CA-04; RN-04): añadir `CA-04 admin-dashboard-prototype` para recorrer confirmación/procesamiento/resultado y asegurar que no hay cálculo de venta, persistencia ni integración de pagos.
- [x] **T-17** (CA-05; RN-01): añadir `CA-05 admin-dashboard-prototype` para verificar filtros, indicadores y filas exclusivamente estáticos y demostrativos.
- [x] **T-18** (CA-06; RN-05): añadir `CA-06 admin-dashboard-prototype` para comprobar etiquetas, controles accesibles, estados de foco y reglas responsive con los cinco anchos aceptados.

## Calidad y entrega

- [x] **T-19** (CA-01..CA-07): ejecutar la suite Vitest del dashboard y validar en navegador integrado flujo completo, teclado y `scrollWidth <= innerWidth` a 360, 390, 768, 1024 y 1366 px.
- [x] **T-20** (CA-08): ejecutar `npm run build`, `npm run types` y `npm test` desde `apps/dashboard`; registrar código de salida por script y verificar que packages locales se compilan/consumen.
- [x] **T-21**: ejecutar `/verify` para `apps/dashboard`, `packages/ui` y `packages/tokens`, `git diff --check`, revisar que no se agregaron integraciones reales ni dependencias no autorizadas y registrar resultados.

## Ampliación aprobada: implementación

- [x] **T-23** (CA-01, CA-02; RN-02, RN-07): actualizar el selector de perfil y la shell para separar navegación administrativa de taquilla; mantener etiquetas de demostración y limitar el menú administrativo a su perfil.
- [x] **T-24** (CA-09; RN-09, RN-10): crear `EnclosuresView` con fixtures ficticios y edición local de nombre, descripción y estado; mostrar feedback accesible y conservar cambios solo en memoria.
- [x] **T-25** (CA-12; RN-08..RN-10): crear `TicketUsersView` para mostrar la cuenta ficticia y capturar cuentas efímeras con campos requeridos; mantenerlas en memoria al cambiar de perfil y permitir usarlas en el login de taquilla durante esa carga.
- [x] **T-26** (CA-01, CA-04, CA-10; RN-02, RN-07..RN-09): implementar el login local de taquilla con credenciales de la spec, estados de error accesibles, acceso visual condicionado a sesión de demo y cierre de sesión que vuelve al selector sin borrar cuentas creadas.
- [x] **T-27** (CA-11; RN-01, RN-07, RN-09): crear `TicketHistoryView` con filas ficticias y filtros de presentación; hacer que solo esté disponible en el perfil de taquilla con sesión de demostración.
- [x] **T-28** (CA-12; RN-11): crear `apps/dashboard/docs/manual-demo.md` en español con instrucciones de ejecución, perfiles, credenciales, alta de usuario, recintos, venta, historial, pruebas y límites/no persistencia; crear `apps/dashboard/docs/arquitectura.md` con la plantilla oficial, distinguiendo claramente el prototipo actual de las futuras funciones operativas.

## Ampliación aprobada: pruebas automatizadas

- [x] **T-29** (CA-01; RN-02, RN-07): añadir o actualizar `CA-01 admin-dashboard-prototype` para probar selector, elección de cada perfil y transición administrativa sin envío de datos.
- [x] **T-30** (CA-02; RN-01, RN-07): añadir o actualizar `CA-02 admin-dashboard-prototype` para comprobar menú e indicadores administrativos y ausencia de venta/historial de taquilla.
- [x] **T-31** (CA-09; RN-09, RN-10): añadir `CA-09 admin-dashboard-prototype` para probar edición de campos, feedback y estado temporal de recintos sin persistencia.
- [x] **T-32** (CA-10; RN-02, RN-07, RN-08): añadir `CA-10 admin-dashboard-prototype` para probar credenciales correctas/incorrectas, gating de vistas, cierre de sesión y ocultamiento de venta/historial.
- [x] **T-33** (CA-11; RN-01, RN-09): añadir `CA-11 admin-dashboard-prototype` para verificar historial ficticio, filtros de presentación y separación del reporte administrativo.
- [x] **T-34** (CA-12; RN-08..RN-11): añadir `CA-12 admin-dashboard-prototype` para probar campos requeridos, alta de cuenta en memoria, login de la cuenta creada dentro de la misma sesión y contenido de la guía.
- [x] **T-35** (CA-03, CA-04, CA-05, CA-06; RN-01, RN-03, RN-04, RN-07): mantener o ampliar pruebas nombradas para verificar que Noticias/Eventos, Venta, Reporte y todas las vistas nuevas conservan sus límites por perfil, responsive y feedback accesible.
- [x] **T-36** (CA-07; RN-01..RN-11): actualizar `CA-07 admin-dashboard-prototype` en `acceptance-coverage.test.tsx` para exigir una prueba nombrada para cada CA-01..CA-14 y verificar que no se incorporen red, persistencia o dependencias no aprobadas. Mantener la extensión `.tsx` para que la prueba quede dentro del patrón Vitest configurado.

## Ampliación aprobada: login administrativo y tema institucional

- [x] **T-38** (CA-01, CA-13; RN-02, RN-07, RN-12): agregar el login administrativo local con `administrador@demo.local` / `demo1234`, feedback accesible para credenciales incorrectas y gating de su perfil; conservar el flujo/login existente de taquilla.
- [x] **T-39** (CA-08, CA-14; RN-06, RN-13): centralizar el mapeo de tokens de la SPA a la paleta de `docs/04-sistema-de-diseno.md`, sustituyendo los colores azules/verdes de marca, y conservar tokens semánticos de estados, foco, contraste, tamaño y tipografía.
- [x] **T-40** (CA-13; RN-12): añadir pruebas nombradas para login administrativo correcto/incorrecto, visibilidad de secciones y cierre de sesión; ampliar la cobertura CA-07 hasta CA-14.
- [x] **T-41** (CA-14; RN-13): probar los valores/fuentes de tokens del tema institucional, ausencia de hex de marca en vistas y persistencia de colores semánticos de estado/foco.
- [x] **T-42** (CA-01, CA-08, CA-12, CA-13, CA-14; RN-11..RN-13): actualizar README, manual, arquitectura, notas SDD y la documentación de tokens para documentar credenciales administrativas ficticias, paleta y rol de `index.html` como entrada de React/Vite.
- [x] **T-43** (CA-06..CA-08, CA-13, CA-14): ejecutar verificaciones automatizadas disponibles, types, build, tests y `git diff --check`; registrar la limitación de inspección visual/teclado por falta de navegador.

## Calidad y cierre

- [ ] **T-37** (CA-06..CA-08): ejecutar pruebas responsive en 360, 390, 768, 1024 y 1366 px, `npm run types`, `npm run build`, `npm test`, `/verify` y `git diff --check`; registrar resultados. Verificaciones automatizadas completadas; queda pendiente la inspección visual y de teclado en navegador en esos cinco anchos.
- [ ] **T-22**: actualizar estado de spec, plan y tasks a Implementada solo al cumplir todos los CA y verificaciones; enlazar `dashboard-001` en PR/commit conforme a las convenciones.

## Evidencia de verificación

- Desde `apps/dashboard`, `npm run types`, `npm run build` y `npm test` terminaron con código 0; Vitest reportó 11 archivos y 30 tests aprobados.
- Se añadió `apps/dashboard/README.md` con instalación, ejecución, comandos disponibles, perfiles de muestra y enlaces a la arquitectura y al manual.
- Las pruebas automatizadas revisan los estilos responsive y el indicador de foco visible. No se pudo completar la inspección visual/teclado en navegador para 360, 390, 768, 1024 y 1366 px porque el navegador integrado y Chromium local no están disponibles.
- El servidor de vista previa en `http://127.0.0.1:4173/` respondió con HTML de la SPA e incluyó el metadato de tema institucional `#661a2f`.
- El manifiesto real está en `apps/dashboard/package.json`; no existe `apps/dashboard/src/package.json`. Según la convención estricta del skill `/verify`, el dashboard queda marcado como "app aún no inicializada" por faltar ese manifiesto bajo `src/`; se ejecutaron los scripts válidos del proyecto desde `apps/dashboard`. `format:check` y `lint` no están definidos.
- En esta revisión, `npm run types`, `npm test` (11 archivos, 30 tests), `npm run build` y `git diff --check` terminaron con código 0. Un primer intento de npm desde la raíz del monorepo falló porque no hay `package.json` allí; los comandos correctos se ejecutaron desde `apps/dashboard`.
- `git diff --check` revisa cambios rastreados; el README nuevo aún no está rastreado por Git.
- T-22 sigue pendiente de enlazar y cerrar el PR/commit. La spec está Aprobada; T-37 sigue pendiente de inspección visual/teclado en navegador a los cinco anchos indicados.

## Dependencias

- T-01 precede T-02; T-02 y T-03 preceden T-04.
- T-04 precede T-05..T-10.
- Cada tarea de prueba depende de su tarea de implementación correspondiente y puede desarrollarse junto con las pruebas restantes después de integrar la shell.
- T-23 depende de T-05 y T-10; T-24 y T-25 dependen de T-23.
- T-26 depende de T-23 y T-25; T-27 depende de T-23 y T-26; T-28 depende de T-23..T-27.
- T-29 depende de T-23; T-30 de T-23; T-31 de T-24; T-32 de T-25 y T-26; T-33 de T-27; T-34 de T-25 y T-28; T-35 de T-23..T-27; T-36 de T-29..T-35.
- T-37 y T-22 (cierre/documentación final) dependen de T-01..T-21 y T-23..T-36.
- T-40 depende de T-38, T-41 de T-39, T-42 de T-38/T-39 y T-43 de T-38..T-42.

No se crean endpoints, migraciones, autorización ni pagos. El login es solo una simulación local; no configura React Router. No se alteran otras apps ni se crea configuración global del monorepo.
