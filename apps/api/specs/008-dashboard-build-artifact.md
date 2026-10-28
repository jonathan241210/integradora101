# 008 · dashboard-build-artifact

- App dueña: `api` (automatización transversal de CI)
- Apps/paquetes afectados: `dashboard` y GitHub Actions
- Estado: Aprobada
- Solicitante / responsable funcional: usuario solicitante
- Aprobación funcional: aprobada por el usuario solicitante el 2026-10-27

## Problema y contexto

El workflow de CI ejecuta pruebas de API y Mobile, pero no genera un paquete descargable de una aplicación. Para la actividad de DevOps se requiere producir y publicar el build del Dashboard sin modificar el código funcional de la aplicación.

El Dashboard ya cuenta con el comando `npm run build`, que genera una salida estática de producción en `apps/dashboard/dist/`. La compilación debe usar las dependencias del monorepo declaradas en `package-lock.json`.

## Objetivos

- Ejecutar el build de producción del Dashboard en GitHub Actions después de que los jobs de pruebas existentes terminen correctamente.
- Comprobar que la salida incluya `apps/dashboard/dist/index.html`.
- Crear un ZIP de la salida y publicarlo como artefacto descargable con el nombre `dashboard-build`.
- Limitar los cambios de implementación al workflow, sin modificar archivos de la aplicación Dashboard.

## Fuera de alcance

- Modificar `apps/dashboard/src/`, su manifiesto, sus dependencias o su configuración de build.
- Generar APK/AAB, desplegar el sitio, crear un Release de GitHub o publicar en un hosting.
- Empaquetar la API, Mobile, PWA, Web u otras apps del monorepo.
- Añadir secretos, acceso a bases de datos, migraciones o cambios de esquema.
- Corregir fallas de pruebas o de build fuera del alcance aprobado.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Integrante que abre o actualiza un PR | Obtener el build del Dashboard cuando las verificaciones pasen | Leer el resultado de Actions y descargar el artefacto |
| Integrante que revisa el repositorio | Inspeccionar el contenido generado por CI | Leer el resultado de Actions y descargar el artefacto |

## Historias de usuario

Como integrante del equipo, quiero que CI compile y empaquete el Dashboard para descargar el mismo build que produjo la ejecución automatizada.

## Criterios de aceptación

- **CA-01:** Dado un evento `push` o `pull_request` cubierto por el workflow actual, cuando los jobs de pruebas existentes finalicen correctamente, entonces se ejecuta el build del workspace `@arca/dashboard` con las dependencias del lockfile de la raíz.
- **CA-02:** Dada una ejecución del build, cuando termine la compilación, entonces el job comprueba que existe `apps/dashboard/dist/index.html` y falla si no existe.
- **CA-03:** Dado un build exitoso, cuando se empaquete su salida, entonces se crea un archivo ZIP que contiene `apps/dashboard/dist/` y sus recursos generados.
- **CA-04:** Dado el ZIP generado, cuando se publique en GitHub Actions, entonces aparece un artefacto descargable llamado `dashboard-build` que contiene `dashboard-dist.zip`.
- **CA-05:** Dada una falla en cualquiera de los jobs de pruebas, build, empaquetado o publicación, cuando termine el workflow, entonces GitHub Actions muestra la ejecución como fallida y no presenta el artefacto como una entrega exitosa.
- **CA-06:** Dada la implementación de esta feature, cuando se revisen los cambios, entonces no hay modificaciones en código fuente, manifiestos, dependencias ni configuración funcional del Dashboard.

## Reglas de negocio

- **RN-01:** El build se ejecuta solo después de que terminen correctamente los jobs de pruebas existentes.
- **RN-02:** El comando de build es `npm run build --workspace=@arca/dashboard` y utiliza `npm ci` desde la raíz con `package-lock.json`.
- **RN-03:** El nombre del artefacto publicado es `dashboard-build`; el archivo ZIP generado se llama `dashboard-dist.zip`.
- **RN-04:** El workflow no despliega el Dashboard ni publica el artefacto fuera de GitHub Actions.
- **RN-05:** El workflow conserva los permisos mínimos y no accede a secretos ni a bases de datos.

## Datos, privacidad y auditoría

La feature solo procesa archivos estáticos generados durante el build del Dashboard. El artefacto queda asociado a la ejecución de GitHub Actions. No se crean ni consultan datos de negocio, no se procesan datos personales ni secretos y no se requiere DBR.

## Flujos y errores

1. GitHub inicia el workflow según los eventos y ramas configurados actualmente.
2. Los jobs existentes ejecutan las pruebas de API y Mobile.
3. Si ambos jobs pasan, un job independiente instala las dependencias con `npm ci` y ejecuta el build del Dashboard.
4. El job verifica `apps/dashboard/dist/index.html`, crea `dashboard-dist.zip` y lo publica como `dashboard-build`.
5. Si falla una prueba, el build no se ejecuta. Si falla el build o cualquier paso posterior, el job y el workflow terminan en estado fallido.

## Dependencias, riesgos y preguntas

- Dependencias/ADR: usa las dependencias ya declaradas y bloqueadas por `package-lock.json`; usa GitHub Actions `actions/upload-artifact@v4`. No agrega dependencias de la aplicación.
- Riesgos: los jobs de GitHub Actions tienen entornos aislados, por lo que el job de build debe instalar por sí mismo las dependencias del monorepo.
- Preguntas pendientes: ninguna; la app objetivo es Dashboard y la salida acordada es un ZIP de `dist/`.

## Revisión

- Aprobadores y fecha: usuario solicitante, 2026-10-27.
- Evidencia/enlaces: pendiente de implementación y primera ejecución de GitHub Actions.
