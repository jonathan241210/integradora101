# 012 · monorepo-ci-validation

- App dueña: `mobile` (CI transversal del monorepo)
- Apps/paquetes afectados: `apps/api`, `apps/dashboard`, `apps/pwa`, `apps/mobile`, `.github/workflows/ci.yml`
- Estado: En progreso
- Solicitante / responsable funcional: usuario solicitante
- Aprobación funcional: usuario solicitante, 2026-11-09; alcance y borrador detallado aprobados en este chat

## Problema y contexto

El workflow actual valida pruebas unitarias de API, pruebas móviles con cobertura y build de Dashboard. Hace falta validar también build y pruebas de PWA, y ejecutar las pruebas y comprobaciones de tipos de Dashboard para detectar regresiones antes de integrar cambios.

## Objetivos

- Ejecutar verificaciones separadas por app en pushes y pull requests a `main` y `DevOps`.
- Validar Dashboard y PWA mediante pruebas existentes, build y tipos configurados.
- Mantener API con PHP 8.4 y sus pruebas unitarias, y Mobile con Jest y cobertura.
- Hacer que un fallo de cualquier job requerido deje la ejecución fallida.

## Fuera de alcance

- Web: no tiene manifiesto de paquete en el estado inspeccionado.
- Pruebas end-to-end: no se encontró framework configurado; se difiere para una spec futura.
- Crear dependencias, modificar lógica funcional o reducir umbrales de cobertura.
- Ejecutar pruebas API que requieran una base de datos no configurada en CI.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Desarrollador del monorepo | Detectar fallos de build, pruebas y tipos antes de integrar | Actions con `contents: read`; sin secretos nuevos |

## Historias de usuario

Como desarrollador del monorepo, quiero que CI compile y pruebe Dashboard y PWA, además de las verificaciones existentes, para detectar regresiones por app.

## Criterios de aceptación

- **CA-01:** En push o pull request a `main` o `DevOps`, API instala dependencias con PHP 8.4 y ejecuta su suite unitaria; incompatibilidades de plataforma fallan el job.
- **CA-02:** Dashboard ejecuta pruebas, verificación de tipos y build usando sus scripts existentes.
- **CA-03:** PWA ejecuta pruebas y build usando sus scripts existentes.
- **CA-04:** Mobile conserva Jest con cobertura y publica el reporte como artefacto, sin ocultar fallos.
- **CA-05:** El workflow termina fallido si cualquiera de los jobs requeridos falla; los jobs independientes continúan ejecutándose para reportar resultados completos.
- **CA-06:** No se agregan dependencias ni se introduce un framework E2E; Actions conserva permisos mínimos `contents: read`.

## Reglas de negocio

- **RN-01:** Instalar dependencias con lockfiles existentes (`composer.lock` y `package-lock.json`); no ejecutar `composer update` en CI.
- **RN-02:** Ejecutar comandos declarados en los manifests de cada app y conservar códigos de salida de pruebas, tipos y build.
- **RN-03:** No habilitar DB de producción ni ejecutar migraciones durante las verificaciones.

## Datos, privacidad y auditoría

Los jobs procesan código y reportes técnicos. No requieren datos de visitantes, secretos nuevos, cambios de BD ni permisos adicionales.

## Flujos y errores

1. Cada job instala el runtime y dependencias fijadas para su app.
2. Jobs API, Dashboard, PWA y Mobile ejecutan sus verificaciones de forma independiente.
3. Si falla una prueba, verificación de tipos o build, el job queda en rojo y el workflow falla.
4. Los jobs independientes siguen ejecutándose; el reporte de cobertura móvil se conserva como artefacto diagnóstico.

## Dependencias, riesgos y preguntas

- Dependencias/ADR: no se añaden dependencias ni tecnologías.
- Riesgos: las pruebas que requieran servicios externos o base de datos pueden necesitar configuración adicional, fuera de este alcance.
- Preguntas pendientes: ninguna dentro del alcance aprobado. Los scripts actuales de Web y cualquier E2E quedan para otra fase.

## Revisión

- Aprobadores y fecha: usuario solicitante, 2026-11-09.
- Evidencia/enlaces: `.github/workflows/ci.yml`; manifests de API, Dashboard, PWA y Mobile.

## Evidencia de implementación local — 2026-11-09

Se añadieron los cuatro jobs y se independizó el build de Dashboard. Dashboard aprobó 299 pruebas, tipos y build; PWA aprobó 36 pruebas y build. API aprobó 1 test y 1 aserción con PHP 8.5.12 local. YAML y diff válidos. La ejecución remota de los siete jobs queda pendiente de publicación; no se declara aceptación completa en Actions.
