# Bitácora de pruebas de ARCA-NB

## Corrida del 25 de noviembre de 2026

Este anexo complementa la [bitácora del 21 de noviembre](03-bitacora-de-pruebas.docx). La corrida se ejecutó localmente con Codex en Windows, sobre la revisión `c448064`, con Node.js 22.13.1 y PHP 8.4.26.

### Resultados automatizados

| Área | Comprobación | Aprobadas | Fallidas | Salida |
| --- | --- | ---: | ---: | ---: |
| API | PHPUnit `Unit` | 15 | 0 | 0 |
| Dashboard | Vitest | 970 | 1 | 1 |
| PWA veterinaria | Vitest | 176 | 0 | 0 |
| Portal | Node Test Runner | 188 | 6 | 1 |
| Móvil | Jest | 493 | 1 | 1 |
| **Total de la corrida** | | **1 842** | **8** | |

Los chequeos de TypeScript del dashboard y del móvil finalizaron correctamente. La repetición aislada de la suite móvil de memorias obtuvo 25 de 26 aprobadas y reprodujo el timeout. Sus resultados no se suman al total de la corrida.

### Comandos de reproducción

Desde la raíz del repositorio, con las dependencias instaladas:

```powershell
npm.cmd run types --workspace=@arca/dashboard
npm.cmd run test --workspace=@arca/dashboard
npm.cmd run test --workspace=apps/pwa
node --test apps/web/src/tests/*.mjs
npm.cmd run test --workspace=apps/mobile -- --runInBand
& ./node_modules/.bin/tsc.cmd --noEmit -p apps/mobile/tsconfig.json
npm.cmd run test --workspace=apps/mobile -- --runInBand --silent visitor-memories.test.tsx
```

Desde `apps/api/src`, con PHP 8.4 disponible en el entorno:

```powershell
php vendor/bin/phpunit --testsuite=Unit --do-not-cache-result
```

En la estación de la corrida se usó la ruta absoluta del ejecutable PHP. El primer intento se detuvo al cargar `vendor/autoload.php`. Con acceso al autoloader, la ejecución final completó **15 pruebas y 4 049 aserciones**. Se registró el resultado de esa ejecución.

### Evidencia de los fallos

- **Dashboard.** `pending-review-badges.test.tsx`, CA-07. La aserción espera un salto de línea LF en el código fuente, que en la copia local usa CRLF. El comportamiento de los avisos al cambiar de sección queda por comprobar en navegador.
- **Portal.** `not-found.test.mjs`, CA-01 a CA-06. La construcción de rutas a partir de la URL del archivo duplica la unidad en Windows (`C:\C:\…`). Queda pendiente verificar el estado HTTP 404 y los destinos desde la página de error.
- **Móvil.** `visitor-memories.test.tsx`, CA-01. La comprobación de «Mis memorias» y la solicitud de permiso de galería superó el límite de cinco segundos de Jest en ambas ejecuciones. La causa sigue sin determinarse.

### Alcance de la evidencia

- **API.** PHPUnit `Unit` valida reglas aisladas. Permisos HTTP, transacciones, auditoría y sincronización contra MySQL quedan sujetos a la ejecución de `Feature` con datos ficticios en `arca_pruebas`.
- **Dashboard.** Vitest y TypeScript aportan evidencia del cliente. La comprobación con perfiles reales de ensayo y la conciliación de un turno requieren el ambiente integrado.
- **PWA veterinaria.** Vitest aporta evidencia sobre sesión, formularios y sincronización simulada. La captura persistente con red intermitente se comprueba en un navegador con el service worker activo y acceso posterior a la API de ensayo.
- **Portal.** Node Test Runner valida aspectos estructurales y comportamientos de JavaScript. El estado HTTP, los enlaces, el foco y la presentación adaptable se comprueban en un servidor y navegador de ensayo.
- **Móvil.** Jest y TypeScript aportan evidencia de la lógica y la interfaz con simulaciones. Cámara, GPS, sensores y notificaciones se comprueban con un dispositivo físico.

### Verificaciones pendientes del plan

La corrida inicial no incluyó PHPUnit `Feature`. Su ejecución posterior se registra al final de este anexo. Los siguientes guiones complementan las fichas del [catálogo vigente](02-casos-de-prueba.docx). Los cuatro casos permanecen pendientes.

#### CP-19 · Permisos de reportes

1. Preparar cuentas de ensayo con los perfiles autorizado y restringido indicados en la ficha.
2. Abrir el reporte con cada perfil y verificar la respuesta correspondiente de la API.
3. Registrar el perfil, la sección visible y el estado HTTP. El perfil autorizado debe poder consultar el reporte y el restringido debe recibir una denegación sin datos del reporte.

#### CP-20 · Conciliación de ingresos

1. Preparar un periodo aislado y registrar ventas en efectivo con importes conocidos. Cancelar una operación según el guion del caso.
2. Comparar los folios, importes y totales esperados con lo que muestra el reporte. Comprobar que la venta cancelada se excluye del ingreso y se conserva para revisión.
3. Adjuntar el cálculo esperado, el periodo, los folios ficticios y la comparación con el reporte. Si se verifica una exportación, conservar también el archivo de ensayo.

#### CP-21 · Captura clínica sin conexión

1. Iniciar sesión con un perfil veterinario de ensayo, confirmar que la PWA está preparada para trabajar sin red y usar un ejemplar ficticio.
2. Cortar la conexión, guardar el borrador y reabrir la PWA para confirmar que persiste. Restablecer la conexión y observar la sincronización.
3. Verificar que el expediente muestra una sola evaluación y que la operación queda sincronizada. Registrar el navegador, los estados de la cola y el identificador de la operación de ensayo.

#### CP-22 · Escaneo de QR

1. Preparar un Android físico, una cuenta de visitante de ensayo y un QR vigente de un recinto aún sin visitar por esa cuenta.
2. Autorizar la cámara, enfocar el código y mantenerlo visible según el guion de la ficha.
3. Confirmar que se muestra el descubrimiento previsto y que la lectura repetida genera un solo envío dentro de la ventana del caso. Registrar el modelo, la versión de Android, el recinto de prueba y el resultado observado.

### Cierre de la corrida

Para repetir un caso, registrar la fecha, revisión, ambiente, rol o dispositivo, resultado esperado, resultado observado y referencia a la evidencia. Los resultados del 21 y 25 de noviembre corresponden a revisiones y entornos distintos. La aprobación de un caso del catálogo se actualiza con evidencia de su propio guion.

La aceptación funcional del ciclo queda pendiente.

## Ejecución posterior de PHPUnit Feature

La API se conectó a MySQL `arca_pruebas` y la consulta de control confirmó el nombre de la base activa. Las ejecuciones de integración se contabilizan por separado de las 1 850 pruebas del lote anterior. Se usó PHP 8.4.26 y PHPUnit 11.5.57 desde `apps/api/src`, con el grupo `smoke` excluido según `phpunit.xml`.

### Primera ejecución

```powershell
$env:APP_ENV = 'testing'
$env:DB_DATABASE = 'arca_pruebas'
php -d memory_limit=1G vendor/bin/phpunit --testsuite=Feature --do-not-cache-result
```

PHPUnit recorrió **916 casos** y realizó **25 720 aserciones** en **6 min 13,873 s**. Reportó **84 errores, 22 fallos de aserción, 3 omisiones y 8 avisos de pruebas riesgosas**, con código de salida **2**. Los avisos de riesgo pueden coincidir con otros resultados.

El reporte agrupó 42 errores que indicaban ausencia de GD y 36 llamadas a `imagecreatetruecolor` sin esa función disponible. PHP tenía el módulo instalado y se comprobó que se podía cargar con `-d extension=gd`. También se observaron dos errores por columnas desconocidas, uno por un campo sin valor por defecto y uno por una ruta de almacenamiento incompatible con Windows.

### Repetición con GD habilitada

```powershell
php -d extension=gd -d memory_limit=1G vendor/bin/phpunit --testsuite=Feature --do-not-cache-result
```

PHPUnit recorrió **916 casos** y realizó **26 369 aserciones** en **6 min 2,516 s**. Reportó **6 errores, 28 fallos de aserción, 3 omisiones y 1 aviso de prueba riesgosa**, con código de salida **2**. El aviso corresponde a uno de los seis errores.

- **Errores.** Tres en administración, dos en catálogo y uno en moderación de memorias. Entre ellos están la ruta Windows construida desde una URL externa, un valor obligatorio `stay_status` ausente en el dato de prueba y dos pruebas del catálogo que intentan usar la columna `longevity`.
- **Fallos de aserción.** 16 en administración, cinco en visitantes, cuatro en catálogo, dos en publicación de especies y uno en medios.
- **Omisiones.** Tres casos de la política de memorias requieren una ejecución posterior conforme a sus precondiciones.

La repetición resolvió los 78 errores de disponibilidad de GD y dejó visibles otros fallos de aserción. Los 916 casos corresponden a la misma suite en ambas ejecuciones. CP-19 a CP-22 conservan su estado pendiente en el plan de aceptación.
