# Tareas · 008 · dashboard-build-artifact

- Spec: `apps/api/specs/008-dashboard-build-artifact.md`
- Plan: `apps/api/plan/008-dashboard-build-artifact.md`
- Estado: Implementación local lista; validación remota pendiente

## Implementación

- [x] **T-01** (CA-01, RN-01, RN-02): agregar al workflow `.github/workflows/ci.yml` el job `dashboard-build`, dependiente de `api-unit` y `mobile-tests`; configurar Node.js 22, `npm ci` en la raíz y `npm run build --workspace=@arca/dashboard`.
- [x] **T-02** (CA-02): incorporar la comprobación `test -f apps/dashboard/dist/index.html`; confirmar que el job falle cuando no exista la salida.
- [x] **T-03** (CA-03): crear `dashboard-dist.zip` desde `apps/dashboard/dist/`; comprobar integridad con `unzip -t` y verificar que el ZIP incluya `apps/dashboard/dist/index.html`.
- [x] **T-04** (CA-04, RN-03, RN-04): publicar `dashboard-dist.zip` con `actions/upload-artifact@v4`, usando el nombre `dashboard-build` y sin agregar pasos de despliegue o publicación externa.

## Calidad y entrega

- [ ] **T-05** (CA-01): validar en una ejecución de Actions que el job usa los eventos y ramas del workflow existente y solo inicia después de que pasen `api-unit` y `mobile-tests`.
- [x] **T-06** (CA-05, RN-05): verificar automáticamente la configuración de propagación de errores: sin `continue-on-error` ni `if: always()` en los pasos de build/empaquetado/publicación; revisar que una dependencia fallida omita el build y deje el workflow fallido.
- [x] **T-07** (CA-06): revisar el alcance de esta implementación y confirmar que no incluye `apps/dashboard/src/`, `apps/dashboard/package.json` ni `package-lock.json`.
- [ ] **T-08** (CA-01..CA-05): verificar el workflow y el build disponible del Dashboard; ejecutar la suite automatizada de CI mediante GitHub Actions y comprobar que el artefacto `dashboard-build` se descarga y contiene `dashboard-dist.zip`.
- [ ] **T-09**: ejecutar `/verify` para las apps tocadas, revisar `git diff --check` y enlazar spec, plan, tasks y evidencia de Actions en el PR/reporte.

## Aprobación

- Spec funcional aprobada por el usuario solicitante el 2026-10-27.
- Plan técnico aprobado por el usuario solicitante el 2026-10-27.
- Checklist de tareas aprobado por el usuario solicitante el 2026-10-27.

## Evidencia local

- `npm run build --workspace=@arca/dashboard`: correcto; generó `apps/dashboard/dist/index.html`.
- Empaquetado temporal de `apps/dashboard/dist/`: `unzip -t` correcto y el ZIP contiene `apps/dashboard/dist/index.html`.
- YAML de `.github/workflows/ci.yml`: parseado correctamente; el job conserva propagación de fallos predeterminada.
- `vendor/bin/phpunit --testsuite=Unit`: correcto (1 test, 1 assertion).
- Pendiente: una ejecución remota de GitHub Actions para validar los jobs y la descarga del artefacto. El acceso a `github.com` no resolvió desde este entorno.
