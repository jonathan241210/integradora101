# 009 · expo-sdk57-dependency-alignment

- App dueña: `mobile`
- Apps/paquetes afectados: `mobile`, manifiesto y lockfile npm del monorepo, workflow CI
- Estado: En progreso
- Solicitante / responsable funcional: usuario solicitante
- Aprobación funcional: aprobada por el usuario solicitante, 2026-10-27

## Problema y contexto

La instalación limpia de dependencias en GitHub Actions falla con `npm ci` por un conflicto de peers: el lockfile instala `react-native-reanimated@4.7.1`, que requiere `react-native-worklets@0.13.x`, mientras Expo SDK 57 tiene bloqueado `react-native-worklets@0.10.4`. El workflow no puede ejecutar las pruebas móviles ni el build del Dashboard mientras falle esa instalación. Como las dependencias Expo compartidas se declaran en el manifiesto raíz, npm también resuelve peers en ese contexto; fijar solo las versiones en el workspace Mobile no elimina el conflicto raíz.

Expo publica para SDK 57 la combinación `react-native-reanimated@4.5.1` y `react-native-worklets@0.10.1` en su lista oficial de módulos nativos agrupados: <https://github.com/expo/expo/blob/sdk-57/packages/expo/bundledNativeModules.json>. La tabla de compatibilidad de Reanimated confirma que Reanimated 4.7.x requiere Worklets 0.13.x: <https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/>.

## Objetivos

- Fijar en el manifiesto raíz compartido versiones de Reanimated y Worklets compatibles con Expo SDK 57.
- Regenerar el lockfile de la raíz para que `npm ci` instale dependencias sin desactivar la validación de peers.
- Permitir que CI continúe con las pruebas existentes y el build de Dashboard.

## Fuera de alcance

- Cambiar la versión de Expo, React Native o el SDK de la app.
- Añadir entradas duplicadas en `apps/mobile/package.json`; el par se fija en la raíz donde se resuelven los peers compartidos.
- Modificar pantallas, lógica, configuración nativa o comportamiento funcional de Mobile.
- Usar `--force`, `--legacy-peer-deps` o ignorar conflictos de peers.
- Añadir nuevas capacidades de animación o Worklets a la app.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Desarrollador del monorepo | Instalar dependencias de forma reproducible y ejecutar CI | Sin permisos especiales |

## Historias de usuario

Como desarrollador del monorepo, quiero que las dependencias opcionales de animación resuelvan a versiones compatibles con Expo SDK 57 para que una instalación limpia permita ejecutar las verificaciones de CI.

## Criterios de aceptación

- **CA-01:** Dado el monorepo con Expo SDK 57, cuando se fijen Reanimated y Worklets en el manifiesto raíz compartido, entonces sus versiones coinciden con las recomendadas por el SDK (`4.5.1` y `0.10.1`).
- **CA-02:** Dado el lockfile actualizado, cuando se ejecute `npm ci` desde la raíz con resolución estándar de npm, entonces termina sin `ERESOLVE` y sin flags que ignoren peers.
- **CA-03:** Dada la instalación completa, cuando se ejecuten las pruebas de Mobile y el build del Dashboard, entonces sus comandos existentes completan correctamente.
- **CA-04:** Dado el cambio de dependencias, cuando se revise el diff, entonces solo se modifican el manifiesto raíz y `package-lock.json`; no hay cambios en `apps/mobile/package.json`, código fuente, configuración nativa, Babel, Metro ni pantallas de Mobile.

## Reglas de negocio

- **RN-01:** Las dependencias nativas compartidas de Mobile deben fijarse en el manifiesto raíz con las versiones compatibles publicadas para su Expo SDK.
- **RN-02:** `npm ci` conserva validación estricta de peers y usa únicamente el lockfile raíz como fuente reproducible.
- **RN-03:** La alineación no incorpora una función nueva ni cambia la conducta funcional de la app.

## Datos, privacidad y auditoría

No se crean ni procesan datos de usuario. No hay cambios de base de datos, permisos de dispositivo, secretos ni servicios externos.

## Flujos y errores

1. npm instala la versión de Reanimated y Worklets fijada explícitamente en el manifiesto raíz.
2. El lockfile raíz registra la misma resolución para instalaciones locales y CI.
3. Si `npm ci` aún informa un conflicto, el cambio se detiene para revisar las versiones del SDK y el árbol de dependencias; no se omite la validación con flags.

## Dependencias, riesgos y preguntas

- Dependencias/ADR: reutiliza Expo y React Native aprobados por ADR 0004; no incorpora tecnología nueva.
- Riesgos: cambiar versiones de dependencias nativas puede requerir reconstruir binarios nativos; las versiones propuestas son las que Expo SDK 57 declara como agrupadas.
- Preguntas pendientes: ninguna sobre el objetivo; aprobación formal de esta spec pendiente.

## Revisión

- Aprobadores y fecha: usuario solicitante, 2026-10-27.
- Evidencia/enlaces: error `ERESOLVE` de GitHub Actions compartido por el usuario; lista oficial de módulos de Expo SDK 57 enlazada arriba.
