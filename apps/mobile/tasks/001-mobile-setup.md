# Tareas · 001 · mobile-setup

- Spec: `apps/mobile/specs/001-mobile-setup.md`
- Plan: `apps/mobile/plan/001-mobile-setup.md`

## Implementación

- [x] **T-01** (CA-01): Inicializar el proyecto base de Expo (`package.json`, `app.json`) dentro de `apps/mobile`, asegurando compatibilidad global con Node.js y React 19.
- [x] **T-02** (CA-03): Implementar `expo-router` desarrollando el diseño raíz (`app/_layout.tsx`) y la pantalla inicial (`app/index.tsx`) con un texto de bienvenida en español ("¡Bienvenido a ARCA-NB!").
- [x] **T-03** (CA-02): Configurar la resolución del monorepo integrando reglas en `metro.config.js` y `babel.config.js` para permitir la importación ascendente de `@arca/tokens` y `@arca/api-client` mediante workspaces.
- [x] **T-04** (CA-04): Configurar la infraestructura base de Jest y `@testing-library/react-native` estableciendo el archivo de ambiente `jest.config.js`.

## Pruebas automatizadas y operativas

- [ ] **T-05** (CA-01, CA-02, CA-03): Realizar validación operativa manual arrancando el bundler de Metro (`npx expo start`) para confirmar que el entorno emulado inicia (CA-01), procesa la vista raíz sin excepciones (CA-03) y resuelve exitosamente durante la compilación en ejecución real las dependencias locales del monorepo (`@arca/*`) (CA-02).
- [x] **T-06** (CA-04, CA-02): Codificar test automatizado base en `apps/mobile/__tests__/index.test.tsx` garantizando la correcta ejecución de Jest (CA-04) e incluyendo una validación unitaria secundaria comprobando que el front testeado soporte los imports locales.

## Calidad y entrega

- [ ] **T-07**: Ejecutar únicamente las herramientas de verificación estática (lint y formato) que ya existan y se encuentren previamente definidas a nivel repositorio, sin incorporar nuevas dependencias de calidad.
- [ ] **T-08**: Enlazar exitosamente los 3 documentos (Spec, Plan, Tasks) al PR de inicialización.