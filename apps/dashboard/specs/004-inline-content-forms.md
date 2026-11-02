# 004 · inline-content-forms

- App dueña: `dashboard`
- Apps/paquetes afectados: `dashboard` (dueña de las vistas Noticias, Eventos y Usuarios); `packages/api-client` (envío con archivo para noticias y eventos, ver `api-008` T-10); `api-008` (contrato de subida de imágenes, dependencia fuerte para noticias y eventos); `api-007` (contrato de cuentas, sin cambios).
- Estado: Borrador
- Solicitante / responsable funcional: Jonathan
- Aprobación funcional: pendiente. Esta spec no está aprobada; no se escribe código hasta su aprobación (Constitución II). Depende de que `api-008` esté aprobada para la parte de imágenes.
- Relación con otras specs: reemplaza parcialmente `dashboard-003` en Noticias, Eventos y Usuarios (formularios en modal, diálogos de confirmación, «sin campo de imagen»). Ver RN-09.

## Problema y contexto

En `dashboard-003`, Noticias, Eventos y Usuarios se gestionan con un botón de crear que abre un formulario en una ventana modal (`Dialog`), y las acciones de eliminar, activar/desactivar, restablecer contraseña y restablecer 2FA pasan por un `ConfirmDialog`. Esa interacción se aleja del diseño anterior, en el que el formulario estaba fijo en la página con su caja de subida de imagen y la lista debajo. Además, `dashboard-003` dejó fuera la subida de imágenes de noticias y eventos (CA-08).

Esta feature devuelve el formulario a la página en las tres secciones, sin ventanas emergentes; añade la subida real de imágenes para noticias y eventos (`api-008`); pide las confirmaciones en línea dentro de cada tarjeta o fila; y permite minimizar o expandir cada formulario.

Afectados: `admin` y `zoo-admin` (quienes publican, editan y administran cuentas). `executive` no ve acciones de edición (`dashboard-003` CA-13).

## Objetivos

- Mostrar el formulario de alta y edición de Noticias, Eventos y Usuarios fijo en la página, sin modales.
- Subir, reemplazar y quitar la imagen de noticias y eventos con una caja de subida con vista previa.
- Pedir confirmación de eliminar, activar/desactivar, restablecer contraseña y restablecer 2FA en línea, dentro de la tarjeta o fila del elemento.
- Permitir minimizar y expandir el panel de formulario de cada sección, visible y expandido por defecto.
- Mostrar miniaturas en la lista de noticias y eventos y los errores 422 por campo, incluido el de `image`.

## Fuera de alcance

- Recintos, Venta e Historial de taquilla: sin cambio de interacción en esta feature.
- Recorte o edición de la imagen y varias imágenes por registro (D2 decidida). Arrastrar y soltar sí entra en alcance (CA-04).
- Generar miniaturas en el servidor o en el navegador más allá de la vista previa local.
- Subir archivos distintos de JPG, PNG o WebP, o de más de 5 MB (lo define `api-008`).
- Cambiar las reglas de Usuarios de `api-007` (alcance por rol, roles asignables, 404, correo único): solo cambia la interacción.
- Recuperación o cambio de contraseña propio (`api-007`).
- GitHub Actions, workflows de CI y pruebas automáticas de CI (las atiende otro compañero; no se tocan `.github/workflows`).
- Dependencias nuevas (librerías de formularios, de subida, de diálogos o de acordeones).
- Cambios en `apps/web`, `apps/pwa` y `apps/mobile`.
- Cambio de permisos o autorización en el cliente (RN-08).

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| `admin` | Crear, editar, subir o quitar imagen, activar/desactivar y eliminar noticias y eventos; gestionar cuentas del personal | `news.manage`, `events.manage`, `users.manage` |
| `zoo-admin` | Lo mismo para noticias y eventos; en Usuarios, solo cuentas de taquilla y veterinaria | `news.manage`, `events.manage`, `operational-staff.manage` |
| `executive` | Solo consulta; sin formularios de edición ni acciones | — (sin acciones de escritura) |

La interfaz solo presenta lo que `me` permite. La autorización real la aplica la API (`api-007`, `api-008`).

## Historias de usuario

- Como `admin` o `zoo-admin`, quiero escribir la noticia, el evento o la cuenta en un formulario fijo en la página, para no perder el contexto de la lista.
- Como `admin` o `zoo-admin`, quiero subir, cambiar o quitar la imagen de una noticia o evento desde ese mismo formulario y ver una vista previa antes de guardar.
- Como `admin` o `zoo-admin`, quiero confirmar en línea antes de eliminar, desactivar, restablecer una contraseña o restablecer un 2FA, para no hacerlo por error.
- Como `admin` o `zoo-admin`, quiero minimizar el formulario cuando solo necesito la lista, y volver a expandirlo sin perder lo escrito.

## Criterios de aceptación

### Formularios fijos y paneles

- **CA-01:** Dadas las secciones Noticias, Eventos y Usuarios, cuando se abren, entonces el formulario de alta se muestra en la página, encima de la lista, y no se abre ninguna ventana emergente (`dialog` o modal) para crear, editar, activar/desactivar, eliminar, restablecer contraseña ni restablecer 2FA.
- **CA-02:** Dado un elemento de la lista, cuando se pulsa «Editar», entonces el formulario se carga con sus datos sin salir de la página. En Noticias y Eventos incluye la imagen actual como vista previa. En Usuarios, el correo se muestra en solo lectura. Aparece una acción «Cancelar edición» que vuelve al modo de alta vacío.
- **CA-03:** Dado el panel de formulario de cualquiera de las tres secciones, cuando se muestra, entonces tiene un botón con `aria-expanded` y `aria-controls` que lo minimiza o expande; está expandido por defecto; al minimizarlo se oculta su contenido sin perder lo escrito ni la imagen seleccionada, y la lista sigue visible; el botón se activa con Enter y con Espacio.

### Caja de imagen

- **CA-04:** Dado el formulario de Noticias o Eventos, cuando se muestra la caja de imagen, entonces es un control de archivo con etiqueta accesible, indica «JPG, PNG o WebP · máximo 5 MB», admite elegir el archivo con el selector o arrastrándolo y soltándolo sobre la caja (con indicación visual mientras se arrastra), y al recibir un archivo muestra una vista previa local sin subirlo todavía. El selector sigue disponible con teclado.
- **CA-05:** Dado un archivo elegido que no es JPG, PNG o WebP o que pesa más de 5 MB, cuando se selecciona o se suelta sobre la caja, entonces el archivo no se adjunta al formulario y la interfaz muestra un error en español en la propia caja de imagen (D1). La regla definitiva la aplica la API (`api-008` CA-02).
- **CA-06:** Dado un registro con imagen en edición, cuando se pulsa «Quitar imagen», entonces la vista previa desaparece y al guardar se envía `remove_image` verdadero (`api-008` CA-04). Si después se elige un archivo nuevo, este sustituye la quitada y `remove_image` no se envía como verdadero (`api-008` P4).

### Errores de guardado

- **CA-07:** Dado un formulario de cualquiera de las tres secciones, cuando la API responde 422, entonces muestra cada mensaje junto a su campo (incluido `image` en Noticias y Eventos), conserva lo escrito y el archivo seleccionado, y no sale del modo de edición.

### Confirmación en línea

- **CA-08:** Dado un elemento de Noticias, Eventos o Usuarios, cuando se pulsa «Eliminar», entonces aparece una confirmación en línea dentro de su tarjeta o fila que nombra el elemento y el efecto, con «Confirmar» y «Cancelar». En noticias y eventos el efecto es que el elemento se elimina y deja de mostrarse en la lista, y que su imagen se borra del servidor (`api-008` CA-07, P2). En Usuarios, el efecto es la baja lógica de la cuenta (`api-007`). Solo al pulsar «Confirmar» se llama a la API; «Cancelar» no hace nada.
- **CA-09:** Dado un elemento de Noticias, Eventos o Usuarios, cuando se pulsa «Activar» o «Desactivar», entonces aparece la misma confirmación en línea con el efecto de la acción, y solo al confirmar se llama a la API.
- **CA-10:** Dada una cuenta de Usuarios, cuando se pulsa «Restablecer contraseña», entonces aparece en línea un campo para la nueva contraseña con botón de mostrar/ocultar accesible y las acciones «Confirmar» y «Cancelar». Solo al confirmar se llama a la API. Tras enviarla, la contraseña se descarta de la interfaz (`dashboard-003` RN-07).
- **CA-11:** Dada una cuenta de Usuarios, cuando se pulsa «Restablecer 2FA», entonces aparece la confirmación en línea que nombra la cuenta y explica que su segundo factor se borrará y tendrá que volver a configurarlo; solo al confirmar se llama a la API.
- **CA-12:** Dada una confirmación en línea o un campo de contraseña en línea abierto, cuando se usa el teclado, entonces el foco es visible, «Cancelar» y «Confirmar» se alcanzan con Tab y se activan con Enter, Escape cancela la acción, y solo una acción en línea puede estar abierta a la vez en cada sección.

### Resultado de las operaciones

- **CA-13:** Dada una operación exitosa (alta, edición, cambio de estado, eliminación, restablecimiento), cuando termina, entonces la lista se recarga, se muestra un aviso accesible (`role="status"`) en la sección, y si el elemento afectado era el que se editaba, el formulario vuelve al modo de alta.
- **CA-14:** Dada la lista de Noticias o Eventos, cuando muestra un elemento con imagen (`image_url`), entonces muestra una miniatura con texto alternativo que nombra el elemento; sin imagen muestra un marcador sin imagen. El estado activo o inactivo es visible en cada tarjeta, y en Usuarios el estado activo o inactivo es visible en cada fila.
- **CA-15:** Dado un error 403, 404, 422 o de red en cualquiera de las tres secciones, cuando ocurre, entonces el mensaje en español aparece en la sección sin perder la lista ni el formulario. Un 401 sigue el flujo de `dashboard-002` CA-08 («Tu sesión expiró»).

### Calidad

- **CA-16:** Dado el código de las tres secciones, cuando se revisa, entonces ningún archivo de `views/`, `components/` o `sections/` usa `fetch`/`axios` ni importa `@arca/api-client`; el envío del formulario, la vista previa y las acciones pasan por hooks ViewModel y `@arca/api-client` (Constitución III).
- **CA-17:** Dado el `package.json` del dashboard, cuando se compara con la versión anterior, entonces no hay dependencias nuevas.
- **CA-18:** Dadas las vistas nuevas, cuando se usan con teclado y en anchos de 360 a 1366 px, entonces los formularios, las cajas de imagen, las tarjetas y la tabla de Usuarios se apilan o tienen desplazamiento propio sin desbordamiento horizontal de la página, y conservan foco visible.
- **CA-19:** Dado el estilo nuevo (vista previa, confirmación en línea, miniaturas, paneles colapsables, campo de contraseña), cuando se revisa, entonces usa tokens semánticos y no fija colores de marca en hexadecimal.
- **CA-20:** Dada la suite de Vitest, cuando se ejecuta, entonces existe al menos una prueba que nombra cada CA-01 a CA-19 con el bloque `describe("CA-NN inline-content-forms", …)`.

## Reglas de negocio

- **RN-01 (sin ventanas emergentes):** Noticias, Eventos y Usuarios no usan `Dialog` ni modales para alta, edición, activar/desactivar, eliminar, restablecer contraseña ni restablecer 2FA.
- **RN-02 (confirmación en línea):** Las acciones de eliminar, activar/desactivar, restablecer contraseña y restablecer 2FA en esas tres secciones piden confirmación dentro de la tarjeta o fila. Se mantiene la regla de `dashboard-003` RN-03; cambia el mecanismo, no la exigencia.
- **RN-03 (validación de ayuda):** La comprobación de tipo y tamaño en el navegador solo orienta al usuario y evita adjuntar un archivo inválido (CA-05). La regla la aplica la API (`api-008` RN-01, RN-02 y RN-08).
- **RN-04 (datos en memoria):** El archivo seleccionado, su vista previa y la contraseña escrita viven solo en el estado de la sección o del campo. No se guardan en `localStorage`, en la URL ni en consola. La URL de vista previa se libera al cambiar de archivo, al cancelar la edición y al salir de la sección. La contraseña se descarta tras enviarla (`dashboard-003` RN-07).
- **RN-05 (sin cálculo en la interfaz):** Ningún total, periodo, permiso ni regla de negocio se calcula en el cliente (`dashboard-003` RN-02 y RN-04).
- **RN-06 (sin dependencias):** No se añaden librerías de subida, arrastrar y soltar, recorte, diálogos ni acordeones; el arrastrar y soltar usa los eventos nativos del navegador.
- **RN-07 (dependencia de la API):** Noticias y Eventos dependen de `api-008`. Usuarios usa el contrato vigente de `api-007` sin cambios. Mientras una dependencia no esté disponible, el desarrollo usa el cliente simulado (`dashboard-003` RN-08).
- **RN-08 (permisos):** Las acciones se muestran según los permisos de `me`; la API es la autoridad (`dashboard-003` RN-01).
- **RN-09 (reemplazos):** Esta spec reemplaza en Noticias, Eventos y Usuarios: (a) el «sin campo de subida de imagen» de `dashboard-003` CA-08; (b) el uso de diálogo para alta, edición, eliminación, activar/desactivar, restablecer contraseña y restablecer 2FA de `dashboard-003` CA-06 y CA-08 y RN-09 en esas secciones; (c) el `ConfirmDialog` de esas secciones. Recintos, Venta e Historial no cambian.
- **RN-10 (diseño):** Se reutilizan `Card.form-card`, `form.form-grid--events`, `label.upload-box`, la tabla de Usuarios y las tarjetas de lista ya existentes en `styles.css`. Solo se añaden estilos para vista previa, miniatura, confirmación en línea, panel colapsable y campo de contraseña en línea, con tokens.
- **RN-11 (panel colapsable):** El estado expandido o minimizado de cada panel de formulario vive en el ViewModel de su sección. Está expandido al abrir la sección y no se persiste entre visitas.

## Datos, privacidad y auditoría

- El formulario maneja datos institucionales de noticias y eventos y la imagen seleccionada, y datos del personal (nombre, apellidos, correo, área y rol) en Usuarios. No almacena nada fuera de la sesión de la página (RN-04).
- Las contraseñas nuevas no se guardan ni se muestran tras el envío (RN-04). Las contraseñas y secretos de 2FA no cambian de tratamiento.
- La auditoría la escribe la API (`api-007` CA-26, `api-008` CA-12).
- No requiere DBR ni cambio de esquema. La interfaz no toca la base de datos.

## Flujos y errores

1. Al abrir Noticias, Eventos o Usuarios se carga la lista; el formulario muestra el modo de alta vacío y expandido.
2. Alta: el usuario escribe, opcionalmente elige una imagen (vista previa local) o, en Usuarios, elige área y rol sugerido, y pulsa guardar. La API responde y la lista se recarga con aviso (CA-13).
3. Edición: «Editar» carga el registro en el formulario; en noticias y eventos se puede reemplazar o quitar la imagen; «Cancelar edición» vuelve al alta.
4. Eliminar, activar/desactivar, restablecer contraseña y restablecer 2FA: confirmación en línea en la tarjeta o fila; solo «Confirmar» llama a la API.
5. Minimizar el panel: se oculta el formulario y se conserva el contenido; expandir lo muestra de nuevo.
6. Errores: 422 junto a cada campo (CA-07); 403, 404 o red en la sección (CA-15); 401 al login.
7. Archivo no válido en el navegador: error en la caja de imagen y el archivo no se adjunta (CA-05); el servidor también lo rechaza.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** `api-008` (subida, `image_url` y borrado del archivo de imagen al eliminar, P2; el texto de CA-08 depende de ello), `api-007` (rutas, permisos y contrato de cuentas), `dashboard-003` (contenedores, sesión y tokens), `dashboard-002` (manejo de 401). Ningún ADR: no hay dependencias nuevas.
- **Riesgos:**
  - **Dependencia de la API:** la subida real no puede validarse de punta a punta hasta que `api-008` esté implementada. Mitigación: cliente simulado y una pasada manual en `arca_pruebas`.
  - **Reglas duplicadas:** el límite de 5 MB y los tipos aparecen en la interfaz como ayuda y en la API como regla. Un cambio en uno exige cambiar el otro en el mismo PR.
  - **Límites HTTP:** un archivo que supera el límite del servidor puede llegar como error de red o como respuesta sin el formato de la API. Mitigación: aviso genérico de error y prueba manual (`api-008` T-21).
  - **Confirmaciones dentro de la lista:** en pantallas estrechas, la confirmación y el campo de contraseña ocupan espacio en la tarjeta o fila. Mitigación: diseño apilado y desplazamiento propio de la tabla (CA-18).
  - **Contraseñas en pantalla:** el campo de restablecer contraseña muestra el texto si se pulsa «Mostrar». Mitigación: el botón vuelve a ocultarlo al confirmar o cancelar.
- **Decisiones tomadas (2026-11-01):**
  - **D1 (archivo no válido):** no se adjunta; se muestra un error en español en la caja de imagen (CA-05).
  - **D2 (alcance de la caja de imagen):** con arrastrar y soltar (eventos nativos, cambio solicitado el 2026-11-01), sin recorte y sin varias imágenes.
  - **D3 (Usuarios):** «sin modales» aplica también a Usuarios (RN-01, RN-09); Usuarios recibe formulario fijo, edición en línea y confirmación en línea.
  - **Panel colapsable (requisito nuevo del usuario, 2026-11-01):** cada formulario de Noticias, Eventos y Usuarios puede minimizarse y expandirse (CA-03), visible y expandido por defecto.
- **Preguntas pendientes:** ninguna en esta ronda.

## Revisión

- Aprobadores y fecha: pendiente. Ninguna aprobación registrada.
- Evidencia/enlaces: `apps/dashboard/specs/003-administration-sections.md`, `apps/dashboard/plan/003-administration-sections.md`, `apps/api/specs/008-event-news-images.md`, `apps/api/specs/007-administration-management.md`, `apps/dashboard/specs/002-real-staff-login.md`.
- Origen: plan de trabajo aprobado por el usuario el 2026-11-01 (fuera del repositorio), y decisiones D1 a D3 y del panel colapsable comunicadas por la sesión principal el mismo día.
