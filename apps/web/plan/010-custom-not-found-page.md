# Plan técnico · 010 · custom-not-found-page

- Spec: `apps/web/specs/010-custom-not-found-page.md`
- Estado de spec: Aprobada
- Estado técnico: Implementado y verificado, 2026-11-10
- Responsable técnico: Por identificar
- Fecha: 2026-11-10

## Diseño de solución

Mantener el portal HTML/CSS estático aceptado por el ADR 0024 y añadir una página pública autónoma `404.html`. La página reutilizará `styles.css`, los tokens semánticos y el logotipo local; no cargará scripts, API, formularios ni el asistente cognitivo porque su función debe permanecer disponible incluso cuando falle otra parte del portal.

La vista tendrá una cabecera institucional reducida, un único `main` con un solo `h1`, el código visible `404`, una explicación breve y tres enlaces de recuperación con apariencia de botones. Los destinos serán rutas relativas al origen (`/index.html`, `/noticias.html`, `/eventos.html`) para que sigan resolviendo aunque la URL inexistente contenga varios segmentos. El pie conservará la identidad y el año del portal sin duplicar el formulario de demostración.

El servidor integrado de PHP se iniciará con un router explícito: `php -S localhost:8080 -t apps/web/src apps/web/src/router.php`. `router.php` normalizará únicamente la ruta de la petición, comprobará mediante `realpath` que un recurso existente permanezca dentro de `apps/web/src/` y devolverá `false` para que PHP lo sirva normalmente. Para cualquier recurso inexistente responderá con `http_response_code(404)`, `Content-Type: text/html; charset=UTF-8` y el contenido de `404.html`. No redirigirá, no cambiará la URL solicitada y no revelará rutas del sistema.

El hosting de producción sigue sin definirse. Por ello no se añadirá configuración propietaria ni archivos de Nginx/Apache. `infra/README.md` incorporará un checklist verificable: configurar `404.html` como documento de error, confirmar el estado `404` con `curl` y comprobar que los tres enlaces continúan funcionando. Cuando se elija servidor o proveedor, su sintaxis se añadirá mediante el SDD de despliegue correspondiente.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Portal estático | `apps/web/src/404.html` | Presentar el error en español con identidad institucional y tres rutas de recuperación accesibles. |
| Estilos del portal | `apps/web/src/styles.css` | Añadir selectores `not-found-*` adaptables usando exclusivamente tokens existentes. |
| Servidor local | `apps/web/src/router.php` | Servir recursos existentes y responder con `404.html` y estado HTTP `404` para recursos inexistentes. |
| Pruebas | `apps/web/src/tests/not-found.test.mjs` | Cubrir estructura, destinos, accesibilidad, seguridad del router y respuesta HTTP real con `node:test`. |
| Documentación local | `apps/web/README.md` | Actualizar el comando del servidor y documentar una comprobación local con `curl`. |
| Operación | `infra/README.md` | Añadir el requisito portable y la evidencia obligatoria para el futuro servidor de producción. |

## Contrato y datos

- Endpoints con rutas nombradas, autenticación y permisos: no aplica; la página es pública y no crea rutas Laravel ni consume API.
- Contrato HTTP local:
  - recurso existente: lo atiende el servidor PHP integrado con su estado y tipo normales;
  - recurso inexistente: `404 Not Found`, `Content-Type: text/html; charset=UTF-8` y cuerpo equivalente a `apps/web/src/404.html`;
  - no hay redirección a la portada y la URL solicitada permanece visible.
- Validación/Form Requests, Actions, Resources y Policies: no aplica.
- DBR relacionada, migraciones, `BaseModel`, auditoría y SoftDeletes: no aplica; no se crean ni modifican datos.
- Errores y compatibilidad: si `404.html` no puede leerse, el router devolverá un mensaje HTML mínimo en español con estado `404`, sin rutas internas ni traza. La solicitud directa de un archivo existente, incluido `/404.html`, conserva el comportamiento normal del servidor.

## Seguridad, offline y operación

- El router obtiene la ruta desde `REQUEST_URI`, descarta query y fragmento, decodifica de forma controlada y usa `realpath` más comparación de prefijo para impedir servir rutas fuera de `apps/web/src/`.
- No se interpolará la URL solicitada en el HTML, evitando reflejar contenido no confiable.
- La página no usa JavaScript, cookies, almacenamiento, credenciales, datos personales ni recursos remotos; funciona sin API y sin conexión después de haber sido servida.
- No se agregan dependencias, manifiestos, secretos ni tecnología de proveedor.
- La ejecución local conserva `localhost:8080`, requerido por el CORS vigente de noticias y eventos.
- El checklist de producción exigirá evidencia con `curl -I` o `curl -i`: una URL inexistente debe mostrar `404`, mientras `/index.html`, `/noticias.html` y `/eventos.html` deben continuar en `200`.
- No se modifica Aiven, MySQL, almacenamiento Laravel ni configuración de producción.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | `CA-01 custom-not-found-page` lee `404.html` y verifica identidad local, código `404`, mensaje en español, referencia a `styles.css` y ausencia de recursos remotos. | Node `node:test`; `apps/web/src/tests/not-found.test.mjs`. |
| CA-02 | `CA-02 custom-not-found-page` comprueba los tres textos y destinos `/index.html`, `/noticias.html` y `/eventos.html`, y confirma que cada archivo existe. | Node `node:test`; `apps/web/src/tests/not-found.test.mjs`. |
| CA-03 | `CA-03 custom-not-found-page` verifica `lang="es"`, título descriptivo, un solo `h1`, `main`, orden de enlaces y regla global `:focus-visible`; la revisión visual comprueba 360, 768 y 1366 px. | Node `node:test` y revisión visual; `apps/web/src/tests/not-found.test.mjs`. |
| CA-04 | `CA-04 custom-not-found-page` inicia temporalmente el servidor PHP con `router.php`, solicita un recurso inexistente y archivos existentes, y valida estados, `Content-Type`, cuerpo y ausencia de redirección. | Integración Node/PHP; `apps/web/src/tests/not-found.test.mjs`. |
| CA-05 | `CA-05 custom-not-found-page` verifica que `infra/README.md` exija documento de error, estado `404` y evidencia de recursos válidos en `200`, sin afirmar un proveedor no decidido. | Node `node:test`; `apps/web/src/tests/not-found.test.mjs`. |
| CA-06 | `CA-06 custom-not-found-page` comprueba que la suite nombre CA-01..CA-05, use solo módulos integrados y no exista un manifiesto nuevo en `apps/web/src/`. | Node `node:test`; `apps/web/src/tests/not-found.test.mjs`. |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Solo HTML, CSS, PHP 8.4 ya declarado y `node:test`; no se agrega dependencia ni configuración propietaria. El router local es portable y producción queda como requisito neutral hasta definir hosting. |
| II. La spec manda | Sí | `apps/web/specs/010-custom-not-found-page.md` está Aprobada por Gregorio el 2026-11-10; este plan y las tasks compartirán `010-custom-not-found-page`. |
| III. Lógica separada de la interfaz | Sí | No hay lógica de negocio ni acceso a datos. El portal estático conserva la excepción aceptada en ADR 0024; el router solo resuelve archivos y estado HTTP. |
| IV. Un test por criterio | Sí, planeado | CA-01..CA-06 están mapeados explícitamente a `not-found.test.mjs`; CA-04 incluye integración HTTP real con PHP. |
| V. Una sola fuente de verdad para los datos | Sí | No se leen, crean ni modifican datos o esquema; no aplica DBR. |
| VI. Código en inglés, personas en español | Sí | Archivo, selectores e identificadores se nombran en inglés; UI, mensajes, spec y documentación permanecen en español. |

No se propone ninguna excepción nueva a la Constitución.

## Riesgos y decisiones

- ADR requerido/aprobado: no se requiere uno nuevo. ADR 0024 mantiene el portal estático y ADR 0023 exige anotar requisitos de despliegue en `infra/README.md`.
- Servidor de producción: no se elige en esta feature; configurar Nginx, Apache o un proveedor ahora violaría el alcance aprobado y la portabilidad.
- Rutas profundas: se eligen destinos relativos al origen (`/...`) en lugar de `index.html` relativo al segmento actual, para evitar que `/ruta/inexistente` produzca `/ruta/index.html`.
- Seguridad de archivos: el router no concatena y sirve una ruta solicitada sin validación; `realpath` y el prefijo del document root limitan los recursos servidos.
- Disponibilidad: `404.html` evita scripts y API. Si el archivo no está disponible, el router conserva el código `404` con un cuerpo mínimo seguro.
- Prueba HTTP: la suite reservará un puerto local efímero, esperará a que PHP acepte conexiones y terminará el proceso en limpieza aunque falle una aserción.
- Diseño: se reutiliza `styles.css` y sus tokens. Los selectores nuevos no alterarán las páginas actuales y se verificarán en tamaños móvil, tableta y escritorio.

## Orden y aprobación

1. Aprobación técnica otorgada por Gregorio el 2026-11-10.
2. Redactar y aprobar `apps/web/tasks/010-custom-not-found-page.md` con trazabilidad CA/RN.
3. Crear primero las pruebas CA-01..CA-06 y confirmar que fallen por la ausencia de la feature.
4. Implementar `404.html` y los estilos institucionales adaptables.
5. Implementar `router.php` con confinamiento al document root y fallback seguro.
6. Actualizar `apps/web/README.md` e `infra/README.md`.
7. Ejecutar la suite enfocada, las suites existentes del portal, comprobaciones HTTP, `git diff --check`, revisión visual y `/verify`.
8. Ejecutar `/constitution-check`, cerrar las tasks y cambiar la spec a Implementada únicamente si todos los criterios quedan verificados.

Aprobación funcional: Gregorio, 2026-11-10. Aprobación técnica del plan: Gregorio, 2026-11-10.
