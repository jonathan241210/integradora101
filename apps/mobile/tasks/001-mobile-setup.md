# Tareas · 001 · mobile-setup

- Spec: `apps/mobile/specs/001-mobile-setup.md`
- Plan: `apps/mobile/plan/001-mobile-setup.md`

## Implementación

- [x] **T-01** (CA-01): Inicializar el proyecto base de Expo (`package.json`, `app.json`) dentro de `apps/mobile`, asegurando compatibilidad global con Node.js y React 19.
- [x] **T-02** (CA-03): Implementar `expo-router` y la pantalla inicial de bienvenida. La ruta de bienvenida fue posteriormente sustituida por el flujo Home/Tabs de la spec 002.
- [x] **T-03** (CA-02): Configurar la resolución del monorepo integrando reglas en `metro.config.js` y `babel.config.js` para permitir la importación ascendente de `@arca/tokens` y `@arca/api-client` mediante workspaces.
- [x] **T-04** (CA-04): Configurar la infraestructura base de Jest y `@testing-library/react-native` estableciendo el archivo de ambiente `jest.config.js`.

## Pruebas automatizadas y operativas

- [x] **T-05** (CA-01, CA-02, CA-03): Validación manual en Android con Expo Go confirmada por la persona solicitante el 2026-10-09. La ruta inicial actual de visitante abre Home mediante el grupo Tabs de la spec 002.
  - **Evidencia automatizada:** `npx expo install --check`, `npx tsc --noEmit`, `npx expo export --platform android` y las 10 suites/56 pruebas pasan en la validación de la etapa 002.
- [x] **T-06** (CA-04, CA-02): Codificar test automatizado base en `apps/mobile/__tests__/index.test.tsx` garantizando la correcta ejecución de Jest (CA-04) e incluyendo una validación unitaria secundaria comprobando que el front testeado soporte los imports locales.

## Calidad y entrega

- [x] **T-07**: Revisar las herramientas estáticas existentes. No hay scripts de lint/formato configurados; TypeScript, pruebas Jest y Expo install check se ejecutaron como parte de la verificación móvil 002.
- [ ] **T-08**: Enlazar exitosamente los 3 documentos (Spec, Plan, Tasks) al PR de inicialización.