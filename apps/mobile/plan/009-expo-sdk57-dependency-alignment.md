# Plan técnico · 009 · expo-sdk57-dependency-alignment

- Spec: `apps/mobile/specs/009-expo-sdk57-dependency-alignment.md`
- Estado de spec: Aprobada
- Estado del plan: Aprobado por el usuario solicitante, 2026-10-27
- Responsable técnico: pendiente de revisión del equipo

## Diseño de solución

Declarar `react-native-reanimated` y `react-native-worklets` como dependencias directas de `package.json` en la raíz, usando exactamente `4.5.1` y `0.10.1`, respectivamente, que son las versiones incluidas en la matriz oficial de Expo SDK 57. El monorepo ya declara sus dependencias Expo compartidas en la raíz. Fijar el par allí evita que npm auto-instale un segundo par incompatible para el contexto de peers raíz. Ejecutar `npm install` desde la raíz para actualizar `package-lock.json` con la resolución compartida del monorepo.

El cambio reemplaza la resolución accidental de Reanimated 4.7.1 con el par compatible del SDK. Se conserva `npm ci` con validación estricta de peers; no se añaden flags de omisión, overrides ni cambios en la configuración de npm. No se modifican fuentes, Babel, Metro, configuración nativa ni comportamiento de pantallas.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Monorepo | `package.json` | Fijar Reanimated 4.5.1 y Worklets 0.10.1 junto a las dependencias Expo compartidas para resolver peers desde la raíz |
| Monorepo | `package-lock.json` | Registrar la resolución reproducible que debe instalar `npm ci` |
| CI | `.github/workflows/ci.yml` | Mantener instalación estricta y ejecutar Mobile tests y Dashboard build/artifact con el lockfile actualizado |
| Fuera de alcance | `apps/mobile/src/`, `apps/mobile/app.json`, Babel/Metro y archivos nativos | No alterar UI ni configuración funcional |

## Contrato y datos

- Endpoints, autenticación y permisos: no aplica.
- Persistencia, DBR, migraciones y auditoría: no aplica.
- Dependencias nativas: los dos paquetes se fijan a las versiones de Expo SDK 57; no se introduce una tecnología nueva.
- Errores y compatibilidad: `npm ci` debe resolver el lockfile con el comportamiento predeterminado de npm y fallar si reaparece un conflicto de peers.

## Seguridad, offline y operación

- No se agregan secretos, servicios, permisos del dispositivo ni código de acceso a datos.
- Se conserva la instalación reproducible por lockfile en instalaciones locales y CI.
- No se ignoran errores de resolución usando `--force` o `--legacy-peer-deps`.
- Expo SDK 57 declara `react-native-reanimated@4.5.1` y `react-native-worklets@0.10.1` en su [matriz oficial](https://github.com/expo/expo/blob/sdk-57/packages/expo/bundledNativeModules.json); la [tabla de compatibilidad de Reanimated](https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/) muestra el peer requerido por la versión 4.7.x actualmente resuelta.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada/verificación | App/ubicación |
|---|---|---|
| CA-01 | `npm ls react-native-reanimated react-native-worklets --depth=0` y comparación contra las versiones exactas declaradas | npm, raíz del monorepo |
| CA-02 | `npm ci` desde la raíz sin flags especiales | Monorepo, instalación limpia en CI |
| CA-03 | `npm run test --workspace=apps/mobile -- --runInBand` y `npm run build --workspace=@arca/dashboard` | Mobile y Dashboard |
| CA-04 | Revisión de rutas del diff: solo `package.json` y `package-lock.json`; sin cambios en Mobile | Git diff |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Usa dependencias de Expo/React Native ya aprobadas por ADR 0004; no agrega tecnología. |
| II. La spec manda | Sí, sujeto a re-aprobación del plan | La ubicación del pin raíz se ajusta según la resolución comprobada de peers; no cambia el objetivo ni los criterios de la spec `mobile-009`. |
| III. Lógica separada de la interfaz | Sí | No se modifica código ni lógica de UI. |
| IV. Un test por criterio | Sí, con verificaciones automatizadas | Cada CA tiene una comprobación reproducible documentada en la tabla. |
| V. Una sola fuente de verdad para los datos | Sí | No se accede ni modifica datos o esquemas. |
| VI. Código en inglés, personas en español | Sí | Identificadores npm en inglés; documentación SDD en español. |

## Riesgos y decisiones

- ADR requerido/aprobado: no se requiere ADR nuevo; Expo y React Native están aprobados por ADR 0004 y no se incorpora una tecnología nueva.
- Riesgo: una instalación limpia puede revelar otros conflictos ocultos una vez corregido el primero. Si sucede, detenerse y revisar contra Expo SDK 57; no añadir flags para saltarse el error.
- Impacto de dependencias: el manifiesto raíz declarará dos paquetes que hoy aparecen transitivamente en el lockfile. Esto estabiliza la matriz de animación que Expo SDK 57 publica; no se cambia código que los consuma ni la configuración nativa.

## Orden y aprobación

1. La spec `mobile-009` fue aprobada por el usuario solicitante el 2026-10-27.
2. Aprobar la revisión técnica de este plan y el checklist actualizado.
3. Editar el manifiesto raíz y regenerar el lockfile; validar instalación, tests y build.
