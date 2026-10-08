# Plan técnico · 001 · mobile-setup

- Spec: `apps/mobile/specs/001-mobile-setup.md`
- Estado de spec: Aprobada
- Responsable técnico: Equipo Técnico ARCA-NB

## Diseño de solución
Inicialización de la aplicación móvil en `apps/mobile` empleando React Native y **Expo** (SDK estable actual). Se creará el esqueleto inicial con la estructura de archivos requerida, configurando **`expo-router`** para el enrutamiento base y **Jest** con `@testing-library/react-native` para las automatizadas. Dado que en la raíz del repositorio aún no se ha inicializado formalmente un `package.json` raíz ni un lockfile, se adoptará **`npm workspaces`** como la estrategia a configurar para el entorno de dependencias. Esta configuración de monorepo se establecerá explícitamente durante la implementación del proyecto, salvo que la estructura real del repositorio demande lo contrario durante su integración. El empaquetador Metro (`metro.config.js`) se preparará explícitamente para subir hacia la carpeta `/node_modules` del nivel superior, admitiendo la validación de los paquetes `@arca/tokens` y `@arca/api-client`. La ejecución local se probará a través de **Expo Go**, dejando la instrumentación con `expo-dev-client` (y compilación nativa) para el momento en el que se incorporen dependencias nativas.

## Cambios por área
| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| `apps/mobile` | `package.json`, `app.json` | Manifest de dependencias y configuración base para Expo y router. |
| `apps/mobile` | `metro.config.js`, `babel.config.js` | Configurar Metro para resolver rutas del monorepo (usando la estrategia de `npm workspaces`). |
| `apps/mobile` | `app/_layout.tsx`, `app/index.tsx` | UI inicial ("¡Hola ARCA-NB!") soportada por `expo-router`. |
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
- **Dependencias del Monorepo:** Documentado formalmente que se proveerá configuración para `npm workspaces` durante el setup para subsanar configuraciones implícitas previas, a menos que se restrinja otra estrategia al momento del enlazado local.
- **Gestión Expo Go vs Dev-Client:** Debido a que el proyecto inicial carece de módulos de compilación en código nativo (Java/C++), el flujo de este documento utilizará `Expo Go` por su alta portabilidad y se evita temporalmente el binario intermedio.

## Orden y aprobación
1.  **Aprobación técnica:** (Listo para Aprobación Técnica).
2.  **Continuación:** Pasar a `/sdd-tasks` una vez lograda la aprobación y completada la validación de estructura raíz.