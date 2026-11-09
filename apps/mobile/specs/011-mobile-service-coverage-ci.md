# 011 · mobile-service-coverage-ci

- App dueña: `mobile`
- Apps/paquetes afectados: `apps/mobile`, `.github/workflows/ci.yml`
- Estado: Implementada
- Solicitante / responsable funcional: usuario solicitante
- Aprobación funcional: usuario solicitante, 2026-11-09

## Problema y contexto

El pipeline actual ejecuta la suite Jest de Mobile, pero no genera un informe de cobertura ni lo conserva como artefacto. La configuración Jest recoge cobertura de algunos ViewModels y repositorios, pero no incluye de forma sistemática los servicios de `apps/mobile/src/services/`. Esto dificulta conocer qué partes de sincronización, cola de escaneo y almacenamiento de tokens están cubiertas por pruebas.

## Objetivos

- Ejecutar en CI las pruebas de Mobile con cobertura de servicios y repositorios.
- Publicar el reporte generado como artefacto descargable de la ejecución.
- Hacer visibles los porcentajes de líneas, funciones, ramas y sentencias en los logs de Actions.

## Fuera de alcance

- Cambiar lógica de negocio, interfaces o dependencias de producción.
- Incorporar cobertura de API Laravel o de otras apps.
- Cambiar requisitos de cobertura global de todo el código Mobile.
- Subir cobertura a un servicio externo.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Desarrollador del monorepo | Revisar automáticamente la cobertura de servicios de Mobile en cada cambio | Ninguno adicional; Actions usa `contents: read` y almacena artefactos de la ejecución |

## Historias de usuario

Como desarrollador del monorepo, quiero que CI mida y archive la cobertura de los servicios de Mobile para detectar código sin pruebas y revisar el reporte después de cada ejecución.

## Criterios de aceptación

- **CA-01:** Dado un push o pull request hacia `main` o `DevOps`, cuando termina el job móvil, entonces Jest ejecuta la suite con cobertura para los archivos de `src/services/` y `src/repositories/`, e imprime el resumen de porcentajes en Actions.
- **CA-02:** Dada una ejecución del job móvil, cuando Jest genera el reporte, entonces Actions publica un artefacto descargable que contiene el reporte HTML y el archivo LCOV.
- **CA-03:** Dado que una prueba falla, cuando termina el job, entonces el job queda en rojo y no presenta el reporte como evidencia de una suite aprobada; si el reporte fue generado, puede conservarse para diagnóstico.
- **CA-04:** Dado el reporte de cobertura, cuando se inspeccionan sus archivos fuente, entonces se pueden identificar cobertura por archivo para cada servicio y repositorio incluidos, sin incluir archivos generados ni dependencias.

## Reglas de negocio

- **RN-01:** Las pruebas de CI usan las dependencias fijadas por `package-lock.json` mediante `npm ci`.
- **RN-02:** El reporte se produce con Jest y se almacena únicamente como artefacto de GitHub Actions; no se envía a un servicio externo.
- **RN-03:** La cobertura se limita inicialmente a servicios y repositorios Mobile. No se añaden umbrales nuevos; se conservan los umbrales preexistentes de Jest para los archivos que ya los tienen configurados.

## Datos, privacidad y auditoría

La cobertura contiene nombres de archivos, líneas ejecutadas y métricas técnicas; no incorpora datos de visitantes, secretos ni resultados de producción. No hay cambios de base de datos, retención de datos de negocio ni permisos nuevos.

## Flujos y errores

1. GitHub Actions instala dependencias desde la raíz usando `npm ci`.
2. Jest ejecuta la suite móvil con cobertura de servicios y repositorios.
3. Si la suite genera reporte, el workflow lo carga como artefacto `mobile-coverage-report`.
4. Si las pruebas fallan, el job queda fallido; el reporte, si existe, se identifica como diagnóstico y no como evidencia de éxito.

## Dependencias, riesgos y preguntas

- Dependencias/ADR: no se añaden dependencias; se usan Jest y `actions/upload-artifact@v4` ya disponibles en el proyecto.
- Riesgos: los servicios no cubiertos todavía pueden tener pruebas insuficientes; incluirlos no aumenta por sí solo la cobertura real si no existen casos de prueba.
- Preguntas pendientes: ninguna. Aprobado el alcance de `src/services/` y `src/repositories/` y el inicio sin umbral global bloqueante.

## Revisión

- Aprobadores y fecha: usuario solicitante, 2026-11-09.
- Evidencia/enlaces: [ejecución de GitHub Actions 42703309235](https://github.com/jonathan241210/integradora101/actions/runs/42703309235); workflow `.github/workflows/ci.yml`; configuración Jest `apps/mobile/jest.config.js`; servicios `apps/mobile/src/services/`.
