# Tareas · 012 · monorepo-ci-validation

- Spec: `apps/mobile/specs/012-monorepo-ci-validation.md`
- Plan: `apps/mobile/plan/012-monorepo-ci-validation.md`
- Spec y plan aprobados por: usuario solicitante, 2026-11-09
- Estado: Implementada; checklist aprobado por el usuario solicitante, 2026-11-09

## Implementación

- [x] **T-01** (CA-02, CA-05; RN-01, RN-02): agregar jobs independientes `dashboard-types` y `dashboard-tests` en `.github/workflows/ci.yml`, con Node 22, caché npm, `npm ci`, timeout de 20 minutos y scripts existentes; pruebas con `CI: true`.
- [x] **T-02** (CA-03, CA-05; RN-01, RN-02): agregar jobs independientes `pwa-tests` y `pwa-build` con la misma preparación Node; ejecutar scripts existentes y comprobar `apps/pwa/dist/index.html` en build.
- [x] **T-03** (CA-02, CA-05): eliminar `needs` de `dashboard-build`; conservar su build y comprobación/publicación del ZIP; mantener códigos de salida sin tolerancia a fallos.

## Pruebas automatizadas y verificaciones

- [x] **T-04** (CA-02): ejecutar scripts de tipos, pruebas y build de Dashboard con las dependencias disponibles; registrar resultados y fallos existentes.
- [x] **T-05** (CA-03): ejecutar pruebas y build de PWA con las dependencias disponibles; comprobar la salida generada cuando el build pase.
- [x] **T-06** (CA-01, CA-04, CA-06): validar YAML con herramientas disponibles y revisar que API conserve PHP 8.4, Composer sin scripts y PHPUnit Unit; Mobile conserve Jest con cobertura y su artefacto; permisos sigan siendo `contents: read`; manifests y lockfiles no cambien por esta feature.
- [x] **T-07** (CA-05): comprobar configuración independiente de los siete jobs y ausencia de `continue-on-error`; si se publica el cambio, verificar en Actions los estados individuales y la conclusión agregada, sin introducir un fallo deliberado.

## Calidad y entrega

- [x] **T-08** (CA-01..CA-06): ejecutar `/verify` para las apps afectadas y `git diff --check`; registrar comandos disponibles, resultados y límites. No instalar dependencias ni modificar producción.
- [x] **T-09** (CA-01..CA-06): actualizar spec/plan/tasks con evidencia local y limitaciones; conservar como pendientes las verificaciones remotas que no se hayan realizado.

## Aprobación

- Checklist: aprobado por el usuario solicitante, 2026-11-09.
- No hay tareas de BD, dependencias nuevas, Web ni E2E en esta feature.
- El trabajo local existente de otras features no forma parte de este checklist.

## Evidencia local — 2026-11-09

| Verificación | Resultado |
|---|---|
| Dashboard `npm run types --workspace=@arca/dashboard` | Exit 0 |
| Dashboard `npm run test --workspace=@arca/dashboard` | Exit 0; 25 archivos, 299 pruebas aprobadas |
| Dashboard `npm run build --workspace=@arca/dashboard` | Exit 0; salida `dist/index.html` comprobada |
| PWA `npm run test --workspace=apps/pwa` | Exit 0; 9 archivos, 36 pruebas aprobadas |
| PWA `npm run build --workspace=apps/pwa` | Exit 0; salida `dist/index.html` comprobada |
| API PHPUnit Unit | Exit 0; 1 test, 1 aserción; PHP 8.5.12 local (CI conserva PHP 8.4) |
| YAML | Parseado con la biblioteca `yaml` ya instalada; sin errores ni claves duplicadas |
| Configuración CI | 7 jobs independientes, sin `needs` ni `continue-on-error`; permisos y gates existentes comprobados |
| `git diff --check` | Exit 0 |

### Aplicación de `/verify`

Los manifiestos JS están en la raíz de cada app, no en `src/package.json` como espera la skill; se ejecutaron directamente los scripts workspace existentes de Dashboard y PWA. No se considera que esas apps estén sin inicializar. Dashboard tiene `types`; PWA verifica tipos mediante `tsc -b` dentro del build. No hay scripts `lint` ni `format:check` en estas apps. API no declara `composer lint` ni `composer test`; se ejecutó PHPUnit Unit disponible. Mobile no cambió sus comandos en esta feature y no se repitió su suite local, que tiene trabajo en curso de otra feature. Se comprobó su configuración de cobertura en YAML.

No se instalaron dependencias ni se modificaron manifests, lockfiles o datos por esta feature. Los builds produjeron sus salidas locales ignoradas por Git. Los resultados corresponden al árbol local actual, que contiene trabajo previo de otras features.

T-07 tiene su comprobación local aprobada; queda pendiente la corrida en GitHub Actions y su conclusión agregada. La evidencia remota se registrará tras publicar el workflow y estos artefactos SDD. No se declara la feature Implementada hasta contar con esa evidencia.

## Cierre de T-07 — 2026-11-09

[Actions 42762293501](https://github.com/jonathan241210/integradora101/actions/runs/42762293501), commit `e59793b`: conclusión `success`, los siete jobs aprobaron independientemente. Se confirmó la publicación de `mobile-coverage-report` y su contenido HTML/LCOV. La comprobación remota antes pendiente queda completada.
