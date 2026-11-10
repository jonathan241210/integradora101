# 007 · ci-workflow

- App dueña: `api` (cambio transversal de integración continua)
- Apps/paquetes afectados: `api`, `mobile` y configuración de GitHub Actions
- Estado: Aprobada
- Solicitante / responsable funcional: usuario solicitante
- Aprobación funcional: aprobada por el usuario solicitante el 2026-10-26; alcance CA-06 solicitado directamente por el usuario el 2026-10-26

## Problema y contexto

El repositorio no tiene un workflow de GitHub Actions, por lo que la página Actions no muestra ejecuciones que acrediten verificaciones del proyecto. Se solicita agregar el workflow con nombres y mensajes en español.

Las pruebas Feature de la API usan MySQL (`arca_pruebas`) y las reglas actuales prohíben ejecutar migraciones desde las pruebas. El workflow no debe conectarse a Aiven ni a producción ni cambiar el esquema. El job de API se limitaría a pruebas Unit sin conexión a base de datos; el job móvil ejecutaría Jest con dependencias instaladas desde el lockfile compartido de la raíz.

## Objetivos

- Incorporar un workflow de GitHub Actions cuyos nombres y mensajes visibles estén en español.
- Ejecutar automáticamente las pruebas PHPUnit Unit de la API y Jest de la app móvil.
- Proporcionar un workflow manual separado que falle intencionalmente para generar evidencia de una ejecución fallida.
- Mostrar el resultado de cada job y del workflow para cada ejecución.

## Fuera de alcance

- Ejecutar pruebas Feature de API que dependan de MySQL.
- Conectarse a Aiven, `arca_pruebas` o `arca_zoo`, ejecutar migraciones o alterar datos/esquemas.
- Corregir pruebas o código de las aplicaciones, agregar dependencias o cambiar sus manifiestos.
- Crear capturas o evidencia de ejecuciones antes de que GitHub ejecute el workflow.
- Hacer que el workflow de fallo controlado se ejecute automáticamente en `push` o `pull_request`, o que bloquee integraciones normales.

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
- **CA-06:** Dado que una persona ejecuta manualmente el workflow de fallo controlado desde GitHub Actions, entonces este termina fallido con un mensaje que indique que el fallo fue intencional y no afecta los eventos `push` ni `pull_request`.

## Reglas de negocio

- **RN-01:** El workflow y sus textos visibles se redactan en español.
- **RN-02:** CI no usa secretos de base de datos ni modifica datos o esquemas.
- **RN-03:** El resultado de pruebas fallidas no se oculta ni se transforma en éxito.
- **RN-04:** El workflow demostrativo falla solo cuando se inicia manualmente; no se enlaza a eventos de integración continua.

## Datos, privacidad y auditoría

El workflow no debe procesar datos de usuarios ni secretos de aplicación. La API se prueba sin conexión a base de datos. No se crea ni modifica esquema; no aplica una DBR.

## Flujos y errores

1. GitHub recibe un push o pull request en las ramas configuradas para ejecutar pruebas.
2. Instala las dependencias declaradas por cada app usando sus lockfiles.
3. Ejecuta PHPUnit Unit y Jest en jobs independientes.
4. GitHub registra estado exitoso o fallido por job y para el workflow.
5. Para obtener evidencia de fallo, una persona inicia el workflow manual `Prueba de fallo controlado`; su único paso imprime el motivo y termina con código distinto de cero.

Si falla la instalación o una prueba, el job termina con error y la ejecución se muestra como fallida. La cobertura de pruebas Feature de API queda pendiente de una estrategia de CI aprobada que cumpla las reglas de base de datos.

## Dependencias, riesgos y preguntas

- Dependencias/ADR: GitHub Actions y runtimes compatibles con las versiones declaradas en los lockfiles; no se propone agregar dependencias de aplicación.
- Riesgos: el conjunto actual de pruebas de una app podría fallar al ejecutarse en un entorno limpio; el workflow reflejará ese estado y no está autorizado corregir aplicaciones bajo esta spec. El workflow demostrativo debe permanecer manual para no bloquear integraciones rutinarias.
- Preguntas pendientes:
- Ninguna. El usuario solicitante aprobó PHPUnit Unit de API y Jest móvil sin conexión a base de datos, activación en `main` y `DevOps`, y validará la especificación.

## Revisión

- Aprobadores y fecha: usuario solicitante, 2026-10-26.
- Evidencia/enlaces: pendiente de primera ejecución en GitHub Actions.

## Corrección de compatibilidad — 2026-11-09

La copia residual `.github/workflows/main.yml` también se activa en `DevOps` y conservaba PHP 8.2. Se alinea a PHP 8.4, como ya establece el plan aprobado y el ADR 0018. Esta corrección aplica CA-02 sin agregar dependencias ni cambiar la suite o los lockfiles. El workflow ampliado `ci.yml` mantiene su configuración actual.
