# Plan técnico · 001 · mobile-setup

- Spec: `apps/mobile/specs/001-mobile-setup.md`
- Estado de spec: Implementada
- Responsable técnico: Equipo Técnico ARCA-NB

## Diseño de solución
La aplicación móvil en `apps/mobile` usa React Native **0.86.3** con **Expo SDK 57**, conforme al ADR 0004 aprobado. El workspace raíz ya está configurado con `npm workspaces` y un lockfile compartido. `expo-router` resuelve las rutas bajo `src/app`; Metro observa el monorepo y permite resolver las dependencias de runtime anidadas y los paquetes `@arca/*`. Las dependencias de React Native se mantienen alineadas con las versiones que `npx expo install --check` recomienda para SDK 57. El flujo local de inicio es `npx expo start` desde `apps/mobile`.

## Cambios por área
| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| `apps/mobile` | `package.json`, `app.json` | Manifest de dependencias y configuración base para Expo y router. |
| `apps/mobile` | `metro.config.js`, `babel.config.js` | Configurar Metro para resolver rutas del monorepo (usando la estrategia de `npm workspaces`). |
| `apps/mobile` | `src/app/_layout.tsx`, `src/app/(tabs)/index.tsx` | Layout raíz Expo Router y Home actual; la vista de bienvenida inicial fue sustituida por la spec 002. |
| `apps/mobile` | `jest.config.js`, `__tests__` | Base para Jest (Principio IV). |

## Contrato y datos
- **Endpoints con rutas nombradas, autenticación y permisos:** No aplica (fase de esqueleto estructural cliente).
- **Validación/Form Requests, Actions:** Delegados en el servidor; Mobile será solo cliente MVVM (Principio III).
- **Errores y compatibilidad:** Se incluyen Error boundaries automáticos propios de `expo-router` para silenciar crashes duros en rutas inexistentes.

## Seguridad, offline y operación
Esta base no invoca permisos sensibles (ej: cámara, micrófono o geolocalización) ni almacena offline ningún dato temporal. La portabilidad está asegurada utilizando JS estándar de Expo emulado fácilmente desde Expo Go sin requisitos iniciales profundos de Android Studio durante el inicio del UI.

## Mapeo de criterios a pruebas
| Criterio | Prueba autom./manual | App/ubicación |
|---|---|---|
| CA-01 (Inicialización local) | Ejecución real de `npx expo start` levantando la app exitosamente en el emulador Android/Expo Go (Validación operativa). | `apps/mobile/` script dev |
| CA-02 (Integración monorepo) | Ejecución real del bundler Metro verificando la carga en memoria más un test Unitario (Jest) verficando el uso de dependencias locales (`@arca/*`). | Bundler + `apps/mobile/__tests__/index.test.tsx` |
| CA-03 (Ejecución Router sin ex) | **Jest / RNTL:** Valida de forma automatizada que los componentes y rutas se rendericen correctamente en pruebas.<br>**Ejecución real (Expo Go/Android):** Valida la integración real mostrando el nivel del Router mediante la pantalla sin error ("Redbox"). | `apps/mobile/__tests__/` + Emulador Local |
| CA-04 (Infra de pruebas Jest) | Test base automatizado ejecutado exitosamente a través del comando npm correspondiente en CI/Consola local. | `apps/mobile/` (`npm run test`) |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | El arranque ocurre con Expo Go (ADR 0004); entorno no requiere setup nativo complejo en local inicial. |
| II. La spec manda | Sí | Diseño y mapeo cubre las reglas puestas en `001-mobile-setup.md`. |
| III. Lógica separada interfaz | Sí | Presentación pura inicial (¡Hola ARCA-NB!). |
| IV. Un test por criterio | Sí | Pruebas de renderizado y resolución de Metro cubiertas en Jest y smoke tests operativos. |
| V. Fuente de verdad (MySQL) | Sí | Aplazado: no se persiste info offline local en setup base. |
| VI. Inglés/Español | Sí | Código `.tsx` en inglés; UI ("Bienvenido a ARCA-NB", en español). |

Ninguna excepción requerida.

## Riesgos y decisiones
- **Dependencias del Monorepo:** Las versiones de React, React DOM y React Native se fijan en el workspace raíz para que las dependencias peer de Expo compartan un solo runtime; Metro conserva la búsqueda jerárquica para resolver módulos anidados requeridos por React Native.
- **Gestión Expo Go vs Dev-Client:** Debido a que el proyecto inicial carece de módulos de compilación en código nativo (Java/C++), el flujo de este documento utilizará `Expo Go` por su alta portabilidad y se evita temporalmente el binario intermedio.

## Orden y aprobación
1.  **Aprobación técnica:** Registrada conforme al ADR 0004 aprobado.
2.  **Evolución:** La navegación de visitante se desarrolló bajo la spec 002; esta spec conserva el alcance de inicialización y resolución del monorepo.