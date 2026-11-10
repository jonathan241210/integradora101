# Tareas · 007 · ci-workflow

## Corrección residual — 2026-11-09

- [x] **T-10** (CA-02): corregir `php-version` y el nombre del paso en `.github/workflows/main.yml` a PHP 8.4; aplicar la decisión de runtime aprobada en T-02 sin cambiar dependencias ni lockfiles.
- [x] **T-11** (CA-01, CA-02): validar YAML y comprobar el runtime de los jobs Composer activados en `DevOps`. Los cuatro YAML parsearon sin errores; `ci.yml` y `main.yml` preparan PHP 8.4 y ejecutan PHPUnit Unit. `git diff --check`: exit 0. La corrección no cambia código de aplicación; no se repitieron las suites funcionales. La verificación previa de API en este chat aprobó 1 prueba unitaria con PHP 8.5.12 local.
- [ ] **T-12** (CA-02): confirmar instalación Composer y PHPUnit en la nueva corrida de Actions tras publicar la corrección.

- Spec: `apps/api/specs/007-ci-workflow.md`
- Plan: `apps/api/plan/007-ci-workflow.md`
- Estado: workflow y ejemplo de fallo controlado creados localmente; publicación remota pendiente por permiso del token

## Implementación

- [x] **T-01** (CA-01, CA-04, CA-05): crear `.github/workflows/ci.yml` con nombre, jobs y pasos en español; activar `push` y `pull_request` para `main` y `DevOps`; permisos `contents: read`; mantener PHPUnit y Jest en jobs separados y no usar `continue-on-error`, secretos de BD, servicios MySQL ni migraciones.
- [x] **T-02** (CA-02): configurar PHP 8.4 y Composer desde `apps/api/src`, instalar según `composer.lock` y ejecutar solo `vendor/bin/phpunit --testsuite=Unit`, sin `.env` ni configuración de conexión.
- [x] **T-03** (CA-03): configurar Node.js 22, ejecutar `npm ci` desde la raíz con `package-lock.json` compartido y correr `npm test --workspace apps/mobile -- --runInBand` en modo CI.
- [x] **T-07** (CA-06): crear `.github/workflows/prueba-fallo-controlado.yml` con `workflow_dispatch` como único evento y un paso que imprima el motivo del fallo intencional y termine con código 1.

## Calidad y entrega

- [x] **T-04** (CA-01, CA-04, CA-05): validar sintaxis YAML, ramas/eventos, idioma visible, permiso `contents: read`, propagación de fallos (sin `continue-on-error`) y ausencia de variables secretas, servicios DB y migraciones. YAML parseado con `js-yaml`; checks de configuración y `git diff --check` aprobados.
- [x] **T-05** (CA-01, CA-02, CA-03, CA-04): verificar API y Mobile sin instalar dependencias localmente. PHPUnit Unit: 1 prueba y 1 assertion aprobadas en PHP 8.4.26; Jest móvil: 33 suites fallidas antes de ejecutar pruebas porque falta `@react-native-async-storage/async-storage` en el `node_modules` local. El workflow hará `npm ci` desde el lockfile compartido.
- [ ] **T-06** (CA-01, CA-02, CA-03, CA-04, CA-05): publicar el workflow en `DevOps`, comprobar la ejecución en GitHub Actions y enlazar spec, plan, tasks y evidencia en el PR o reporte. El primer `git push` fue rechazado porque el PAT no tiene el permiso `workflow`.
- [x] **T-08** (CA-06): validar la sintaxis del workflow demostrativo y confirmar que `push` y `pull_request` no estén configurados. La ejecución de GitHub queda pendiente de publicar el archivo.
- [x] **T-09** (CA-01, CA-02, CA-03, CA-04, CA-05): renombrar el workflow principal a `.github/workflows/ci.yml` por solicitud del usuario y actualizar sus referencias en este plan y checklist.

## Aprobación

- Spec aprobada por el usuario el 2026-10-26.
- Plan aprobado por el usuario el 2026-10-26.
- Implementación solicitada directamente por el usuario el 2026-10-26.
- El workflow demostrativo de fallo fue solicitado directamente por el usuario el 2026-10-26; queda aislado a ejecución manual.
