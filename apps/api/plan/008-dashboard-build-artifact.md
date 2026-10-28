# Plan técnico · 008 · dashboard-build-artifact

- Spec: `apps/api/specs/008-dashboard-build-artifact.md`
- Estado: Aprobado
- Estado de spec: Aprobada
- Aprobación del plan: aprobada por el usuario solicitante el 2026-10-27
- Responsable técnico: pendiente de revisión del equipo

## Diseño de solución

Agregar al workflow existente `.github/workflows/ci.yml` un job `dashboard-build` que dependa de los jobs `api-unit` y `mobile-tests`. Así, el Dashboard solo se compila y publica cuando ambas suites terminan correctamente. El job usará Node.js 22, ejecutará `npm ci` desde la raíz con `package-lock.json` y llamará `npm run build --workspace=@arca/dashboard`.

El job verificará la salida `apps/dashboard/dist/index.html`, empaquetará `apps/dashboard/dist/` en `dashboard-dist.zip` y publicará ese archivo con `actions/upload-artifact@v4`, nombre de artefacto `dashboard-build`. La compilación solo genera archivos estáticos; no despliega el Dashboard ni modifica la aplicación. La salida se conserva como artefacto de la ejecución y no se versiona en Git.

Los jobs existentes de PHPUnit y Jest se mantienen sin cambios. Cada job corre en un runner aislado, por lo que el job de build necesita su propio paso `npm ci` aunque Mobile ya instale las dependencias.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| GitHub Actions | `.github/workflows/ci.yml` | Agregar el job de build, validación de salida, empaquetado ZIP y publicación del artefacto |
| Dashboard | `apps/dashboard/dist/` (salida generada en el runner) | Producir los recursos estáticos de producción sin cambiar fuentes ni manifiestos |
| Monorepo | `package-lock.json` (solo lectura) | Instalar las dependencias fijadas de los workspaces con `npm ci` |
| API, Mobile y documentación | Sin cambios de implementación previstos | Conservar las verificaciones existentes y limitar la feature a CI |

## Contrato y datos

- Endpoints con rutas nombradas, autenticación y permisos: no aplica.
- Validación/Form Requests, Actions, Resources y Policies: no aplica.
- DBR relacionada, migraciones, `BaseModel`, auditoría y SoftDeletes: no aplica; el workflow no se conecta a bases de datos ni altera datos o esquemas.
- Salida del build: `apps/dashboard/dist/`.
- Archivo publicado: `dashboard-dist.zip`, bajo el nombre de artefacto `dashboard-build`.
- Errores y compatibilidad: cualquier falla de prueba, instalación, compilación, validación, compresión o publicación conserva un código de salida fallido; no se enmascaran errores.

## Seguridad, offline y operación

- Mantener los permisos mínimos existentes del workflow (`contents: read`); publicar artefactos no requiere permiso de escritura al repositorio.
- No usar secretos, servicios MySQL, `.env`, conexiones a Aiven ni acceso a producción.
- No ejecutar migraciones, seed ni comandos de escritura de datos.
- Instalar desde el lockfile compartido mediante `npm ci`; no modificar manifiestos ni agregar dependencias de aplicación.
- Usar el runner Ubuntu ya empleado por CI y la versión Node.js 22 ya establecida.
- El artefacto se limita a recursos estáticos del Dashboard y no representa un APK ni un despliegue completo del sistema.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | Ejecución del workflow: `dashboard-build` tiene `needs: [api-unit, mobile-tests]` y solo inicia cuando ambos jobs pasan | GitHub Actions, `.github/workflows/ci.yml` |
| CA-02 | Paso `test -f apps/dashboard/dist/index.html`; el job falla si la salida no existe | GitHub Actions, job `dashboard-build` |
| CA-03 | `unzip -t dashboard-dist.zip` y comprobación de que la lista incluye `apps/dashboard/dist/index.html` | GitHub Actions, job `dashboard-build` |
| CA-04 | Paso `actions/upload-artifact@v4` y verificación del artefacto `dashboard-build` en una ejecución completada | GitHub Actions, `.github/workflows/ci.yml` y página de la ejecución |
| CA-05 | Propagación de errores por defecto; una ejecución de build fallida no llega al paso de publicación, verificado en la ejecución de Actions | GitHub Actions, job `dashboard-build` |
| CA-06 | Comparación automatizada de rutas modificadas en la rama de la feature para confirmar que no se tocaron `apps/dashboard/src/`, su manifiesto ni `package-lock.json` | Verificación de entrega con `git diff --name-only` contra la base de la feature |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Usa Node.js 22, Vite y dependencias ya declaradas; no agrega dependencia al producto ni cambia su stack. GitHub Actions es el CI ya establecido por `api-007`; `upload-artifact@v4` se limita a almacenar el resultado de la ejecución. |
| II. La spec manda | Sí | Spec `api-008`, plan y checklist aprobados por el usuario antes de la implementación. |
| III. Lógica separada de la interfaz | Sí | No cambia lógica de negocio ni código de UI. |
| IV. Un test por criterio | Sí, con evidencia de integración | Los CA se cubren con aserciones de salida, integridad y contenido del ZIP, dependencias entre jobs, estado del paso de publicación y revisión de rutas modificadas. La ejecución de GitHub Actions aporta la evidencia de integración. |
| V. Una sola fuente de verdad para los datos | Sí | No hay acceso a datos ni cambios de esquema. |
| VI. Código en inglés, personas en español | Sí | Identificadores técnicos `dashboard-build` y `dashboard-dist.zip`; nombres de pasos visibles en español; documentación SDD en español. |

Ninguna excepción se implementa sin revisión y acuerdo requeridos. Si algo no cumple, detenerse y resolverlo antes del código.

## Riesgos y decisiones

- ADR requerido/aprobado: no se agrega tecnología de aplicación ni dependencia de runtime. `actions/upload-artifact@v4` es una acción auxiliar del servicio GitHub Actions ya aprobado para CI por la spec `api-007`; no se propone un ADR de producto.
- Alternativas y mitigaciones:
  - Un fallo en API o Mobile omite el build y el artefacto; esto evita publicar un resultado de una ejecución con pruebas en rojo.
  - Cada job es aislado; ejecutar `npm ci` también en el job de build evita depender de archivos de otro runner.
  - GitHub envolverá el archivo subido como descarga del artefacto; al descargar `dashboard-build`, primero se obtiene un ZIP externo que contiene `dashboard-dist.zip`.
  - La prueba móvil local ha fallado por un módulo ausente en el `node_modules` local; CI vuelve a instalar dependencias desde el lockfile. La publicación del artefacto debe esperar la primera ejecución real en GitHub.

## Orden y aprobación

1. Plan y checklist aprobados por el usuario.
2. Implementar el job de build, las verificaciones del ZIP y la publicación, dejando intactos los archivos funcionales del Dashboard.
3. Ejecutar verificaciones locales y revisar la primera ejecución de GitHub Actions; la aprobación técnica corresponde al equipo según su proceso, sin asignar un integrante por nombre.
