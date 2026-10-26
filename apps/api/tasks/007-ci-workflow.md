# Tareas · 007 · ci-workflow

- Spec: `apps/api/specs/007-ci-workflow.md`
- Plan: `apps/api/plan/007-ci-workflow.md`
- Estado: workflow implementado; publicación remota pendiente por permiso del token

## Implementación

- [x] **T-01** (CA-01, CA-04, CA-05): crear `.github/workflows/verificaciones.yml` con nombre, jobs y pasos en español; activar `push` y `pull_request` para `main` y `DevOps`; permisos `contents: read`; mantener PHPUnit y Jest en jobs separados y no usar `continue-on-error`, secretos de BD, servicios MySQL ni migraciones.
- [x] **T-02** (CA-02): configurar PHP 8.2 y Composer desde `apps/api/src`, instalar según `composer.lock` y ejecutar solo `vendor/bin/phpunit --testsuite=Unit`, sin `.env` ni configuración de conexión.
- [x] **T-03** (CA-03): configurar Node.js 22, ejecutar `npm ci` desde la raíz con `package-lock.json` compartido y correr `npm test --workspace apps/mobile -- --runInBand` en modo CI.

## Calidad y entrega

- [x] **T-04** (CA-01, CA-04, CA-05): validar sintaxis YAML, ramas/eventos, idioma visible, permiso `contents: read`, propagación de fallos (sin `continue-on-error`) y ausencia de variables secretas, servicios DB y migraciones. YAML parseado con `js-yaml`; checks de configuración y `git diff --check` aprobados.
- [x] **T-05** (CA-01, CA-02, CA-03, CA-04): verificar API y Mobile sin instalar dependencias localmente. PHPUnit Unit: 1 prueba y 1 assertion aprobadas en PHP 8.4.26; Jest móvil: 33 suites fallidas antes de ejecutar pruebas porque falta `@react-native-async-storage/async-storage` en el `node_modules` local. El workflow hará `npm ci` desde el lockfile compartido.
- [ ] **T-06** (CA-01, CA-02, CA-03, CA-04, CA-05): publicar el workflow en `DevOps`, comprobar la ejecución en GitHub Actions y enlazar spec, plan, tasks y evidencia en el PR o reporte. El primer `git push` fue rechazado porque el PAT no tiene el permiso `workflow`.

## Aprobación

- Spec aprobada por el usuario el 2026-10-26.
- Plan aprobado por el usuario el 2026-10-26.
- Implementación solicitada directamente por el usuario el 2026-10-26.
