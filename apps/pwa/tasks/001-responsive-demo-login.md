# Tareas · 001 · responsive-demo-login

- Spec: `apps/pwa/specs/001-responsive-demo-login.md`
- Plan: `apps/pwa/plan/001-responsive-demo-login.md`

## Implementación

- [x] **T-01** (CA-04, CA-06): Configurar alias `@/`, Tailwind CSS 4, dependencias locales `@arca/ui`/`@arca/tokens` y Vitest en la app; añadir el comando `npm test` y comprobar que el build continúa funcionando.
- [x] **T-02** (CA-01, CA-02): Crear el ViewModel con estado de login, navegación y errores solo en memoria; mostrar credenciales de demo, error accesible, banner de demostración y acción para salir.
- [x] **T-03** (CA-03): Separar la maqueta actual en las vistas Inicio, Animales, Registrar animal, Registrar diagnóstico y Registrar revisión, mostrando solo la sección seleccionada dentro del shell.
- [x] **T-04** (CA-04, CA-05): Implementar navegación adaptable para computadora/móvil y ajustar grids, campos, listas, contraste y foco visible para teclado.

## Pruebas automatizadas

- [x] **T-05** (CA-01): Añadir una prueba Vitest nombrada `CA-01` que verifique campos accesibles, credenciales ficticias visibles y advertencia de demostración en el login.
- [x] **T-06** (CA-02): Añadir una prueba Vitest nombrada `CA-02` que verifique credenciales correctas e incorrectas, anuncio de error, cierre de sesión y reinicio visual del acceso.
- [x] **T-07** (CA-03): Añadir una prueba Vitest nombrada `CA-03` que verifique la navegación entre las cinco vistas y que solo se muestre la sección activa.
- [x] **T-08** (CA-04): Añadir una prueba Vitest nombrada `CA-04` para breakpoints, layouts adaptables y ausencia de reglas que fuercen desbordamiento horizontal; validar también la aplicación en navegador a 360, 390, 768, 1024 y 1366 px.
- [x] **T-09** (CA-05): Añadir una prueba Vitest nombrada `CA-05` que verifique etiquetas, nombres accesibles, aviso de error, navegación por teclado y reglas de foco visible.
- [x] **T-10** (CA-06): Añadir una prueba Vitest nombrada `CA-06` que compruebe que existen pruebas CA-01 a CA-05.

- [ ] **T-11** (CA-08): Añadir el manifiesto web, nombre, display standalone, metadatos de tema y los iconos públicos requeridos; enlazarlo desde el HTML de entrada.
- [ ] **T-12** (CA-07): Implementar ViewModel y control de instalación para escuchar el prompt nativo, registrar `appinstalled`, detectar modo standalone y mostrar instrucciones manuales cuando el prompt no esté disponible.
- [ ] **T-13** (CA-07): Añadir pruebas Vitest nombradas `CA-07` para prompt disponible, guía manual, modo standalone, resultado de instalación y manejo accesible de error.
- [ ] **T-14** (CA-08): Añadir pruebas Vitest nombradas `CA-08` que validen el manifiesto, los tamaños y las rutas de icono.
- [ ] **T-15** (CA-06): Actualizar la prueba de cobertura para exigir suites CA-01 a CA-05 y CA-07 a CA-08.

## Calidad y entrega

- [ ] **T-16** (CA-01, CA-02, CA-03, CA-04, CA-05, CA-06, CA-07, CA-08): Actualizar el README con ejecución, credenciales ficticias, flujo de navegación, instalación desde navegador, requisito HTTPS y límites de la demo.
- [ ] **T-17** (CA-01, CA-02, CA-03, CA-04, CA-05, CA-06, CA-07, CA-08): Ejecutar pruebas, build, revisión de tipos y `/verify`; comprobar los cinco anchos acordados e inspeccionar la instalación disponible en el navegador de prueba.
