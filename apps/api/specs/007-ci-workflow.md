# 007 · ci-workflow

- App dueña: `api` (cambio transversal de integración continua)
- Apps/paquetes afectados: `api`, `mobile` y configuración de GitHub Actions
- Estado: Aprobada
- Solicitante / responsable funcional: usuario solicitante
- Aprobación funcional: aprobada por el usuario solicitante el 2026-10-26; consolidación en `ci.yml` y retirada del workflow demostrativo solicitadas directamente el 2026-11-10

## Problema y contexto

El repositorio no tiene un workflow de GitHub Actions, por lo que la página Actions no muestra ejecuciones que acrediten verificaciones del proyecto. Se solicita agregar el workflow con nombres y mensajes en español.

Las pruebas Feature de la API usan MySQL (`arca_pruebas`) y las reglas actuales prohíben ejecutar migraciones desde las pruebas. El workflow no debe conectarse a Aiven ni a producción ni cambiar el esquema. El job de API se limitaría a pruebas Unit sin conexión a base de datos; el job móvil ejecutaría Jest con dependencias instaladas desde el lockfile compartido de la raíz.

## Objetivos

- Incorporar un workflow de GitHub Actions cuyos nombres y mensajes visibles estén en español.
- Ejecutar automáticamente las pruebas PHPUnit Unit de la API y Jest de la app móvil.
- Consolidar las verificaciones en un único archivo `.github/workflows/ci.yml`.
- Mostrar el resultado de cada job y del workflow para cada ejecución.

## Fuera de alcance

- Ejecutar pruebas Feature de API que dependan de MySQL.
- Conectarse a Aiven, `arca_pruebas` o `arca_zoo`, ejecutar migraciones o alterar datos/esquemas.
- Corregir pruebas o código de las aplicaciones, agregar dependencias o cambiar sus manifiestos.
- Crear capturas o evidencia de ejecuciones antes de que GitHub ejecute el workflow.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Integrante que abre un pull request | Verificar los cambios antes de integrarlos | Leer el resultado de Actions |
| Integrante que revisa el repositorio | Consultar el resultado de cada job | Leer el resultado de Actions |

## Historias de usuario

Como integrante del equipo, quiero que GitHub ejecute las pruebas automatizadas al proponer o actualizar cambios para detectar fallos antes de integrar.

## Criterios de aceptación

- **CA-01:** Dado un push o pull request hacia `main` o `DevOps`, cuando GitHub Actions procesa el evento, entonces ejecuta el workflow con nombre y textos visibles en español.
- **CA-02:** Dada una ejecución del workflow, cuando se ejecuta el job de API, entonces usa PHP 8.4 y corre únicamente la suite PHPUnit `Unit` sin requerir credenciales ni conexión a una base de datos.
- **CA-03:** Dada una ejecución del workflow, cuando se ejecuta el job móvil, entonces instala dependencias con `npm ci` usando el lockfile compartido de la raíz y corre Jest en modo no interactivo.
- **CA-04:** Dada una falla de una suite, cuando termina el job correspondiente, entonces GitHub reporta el job y el workflow como fallidos e identifica qué verificación falló.
- **CA-05:** Dada una ejecución del workflow, entonces ningún paso se conecta a Aiven o producción ni ejecuta migraciones.
- **CA-06:** Dada la consolidación solicitada, cuando se inspecciona `.github/workflows/`, entonces `ci.yml` es su único workflow; se retiran `main.yml`, `laravel.yml` y `prueba-fallo-controlado.yml`.

## Reglas de negocio

- **RN-01:** El workflow y sus textos visibles se redactan en español.
- **RN-02:** CI no usa secretos de base de datos ni modifica datos o esquemas.
- **RN-03:** El resultado de pruebas fallidas no se oculta ni se transforma en éxito.
- **RN-04:** Las futuras verificaciones de Actions se mantienen en `ci.yml`; se retira la demostración manual de fallo controlado.

## Datos, privacidad y auditoría

El workflow no debe procesar datos de usuarios ni secretos de aplicación. La API se prueba sin conexión a base de datos. No se crea ni modifica esquema; no aplica una DBR.

## Flujos y errores

1. GitHub recibe un push o pull request en las ramas configuradas para ejecutar pruebas.
2. Instala las dependencias declaradas por cada app usando sus lockfiles.
3. Ejecuta PHPUnit Unit y Jest en jobs independientes.
4. GitHub registra estado exitoso o fallido por job y para el workflow.
5. La carpeta de workflows conserva exclusivamente `ci.yml` para evitar ejecuciones duplicadas.

Si falla la instalación o una prueba, el job termina con error y la ejecución se muestra como fallida. La cobertura de pruebas Feature de API queda pendiente de una estrategia de CI aprobada que cumpla las reglas de base de datos.

## Dependencias, riesgos y preguntas

- Dependencias/ADR: GitHub Actions y runtimes compatibles con las versiones declaradas en los lockfiles; no se propone agregar dependencias de aplicación.
- Riesgos: el conjunto actual de pruebas de una app podría fallar al ejecutarse en un entorno limpio; el workflow reflejará ese estado y no está autorizado corregir aplicaciones bajo esta spec.
- Preguntas pendientes:
- Ninguna. El usuario solicitante aprobó PHPUnit Unit de API y Jest móvil sin conexión a base de datos, activación en `main` y `DevOps`, y validará la especificación.

## Revisión

- Aprobadores y fecha: usuario solicitante, 2026-10-26.
- Evidencia/enlaces: pendiente de primera ejecución en GitHub Actions.

## Corrección de compatibilidad — 2026-11-09

La copia residual `.github/workflows/main.yml` también se activa en `DevOps` y conservaba PHP 8.2. Se alinea a PHP 8.4, como ya establece el plan aprobado y el ADR 0018. Esta corrección aplica CA-02 sin agregar dependencias ni cambiar la suite o los lockfiles. El workflow ampliado `ci.yml` mantiene su configuración actual.

## Consolidación solicitada — 2026-11-10

El usuario solicitó conservar únicamente `ci.yml`. Esta instrucción sustituye el antiguo CA-06 de demostración manual y RN-04; se eliminan los otros tres workflows, sin cambiar el contenido de `ci.yml`. Los documentos de `mobile-011` y `mobile-012` siguen describiendo sus pruebas, cobertura, tipos y builds. Las referencias anteriores a los workflows eliminados se conservan como historial de su creación y correcciones.
