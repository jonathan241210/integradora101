# 012 · enclosure-actions-global-search

- App dueña: `dashboard`
- Apps/paquetes afectados: `dashboard` (dueña de la sección Recintos, del buscador del encabezado y de sus estilos); `api` (proveedor: `api-019`, sin cambios en esta spec); `packages/api-client` (métodos y tipos de `api-019`, sin lógica de negocio). `mobile`, `web` y `pwa` no cambian.
- Estado: Implementada
- Solicitada: 2026-11-18
- Aprobada: 2026-11-18
- Aprobación funcional: Aprobada (responsable funcional)
- Dependencias: `api-019` (Borrador; contrato del listado, de estado, de borrado y de búsqueda); DBR-020 (Borrador; necesaria para que el recinto tenga estado y borrado). Reutiliza `ConfirmDialog` y el patrón de paginación de `dashboard-011`.
- **Enmienda propuesta a `dashboard-003` CA-09.** Hoy dice que Recintos «no ofrece eliminar». Al aprobarse esta spec, CA-09 se sustituye por los CA-01 a CA-11 de aquí para la parte de recintos. El resto de CA-09 (crear y renombrar, error de nombre repetido) se conserva. `dashboard-003` no se modifica en esta spec.
- **Enmienda (b), aprobada:** buscador tolerante en el cliente, fragmento `match` con resaltado, grupo «Acciones» con el catálogo de acciones existentes, apertura de acciones desde un resultado cuando la vista lo soporta y manejo del límite de peticiones. Modifica CA-13, CA-15, CA-17, CA-28, RN-06 y RN-07; añade CA-29 a CA-41 y RN-11 a RN-14. Depende de `api-019` enmienda (b). Ver «Enmienda (b)».

## Problema y contexto

- **Recintos.** La sección solo permite crear y renombrar. No hay forma de sacar un recinto de servicio sin perderlo ni de quitar uno que ya no existe. Además, la lista muestra todos los recintos en una sola columna larga.
- **Buscador.** El campo del encabezado (`App.tsx`, clase `.search-box`, etiqueta «Buscar en el panel (demostración)») guarda el texto y no hace nada con él. El personal no puede llegar a un usuario, una noticia, un recinto, una especie o un boleto desde cualquier sección.

## Objetivos

- Desactivar, activar y eliminar un recinto desde su tarjeta, con confirmación clara y el número de animales asignados.
- Mostrar los recintos en cuadrícula de 9 por página, con paginación en el cliente.
- Reemplazar el campo demostrativo por un buscador universal que solo muestra lo que el rol puede ver.
- Llevar al elemento encontrado: cambiar de sección si hace falta, ir a su página, centrarlo y resaltarlo.
- Cubrir cada CA-xx con un test de Vitest que lo nombre.

## Fuera de alcance

- Cambios en los buscadores y filtros internos de Usuarios, Historial de boletos, Momentos y demás secciones. Siguen igual.
- Restaurar recintos eliminados: no existe en el sistema (`api-019` RN-02). Solo desactivar es reversible.
- Reasignar animales de un recinto a otro.
- Buscador en la PWA, la web o la app móvil.
- Historial de búsquedas, sugerencias guardadas, atajos globales de teclado (propuesta futura) y persistencia del resultado.
- Cambios de permisos, de roles o de la navegación del perfil.
- Paginación de noticias u otras listas que no sean Recintos y Eventos.
- Modo oscuro o colores fijos de marca.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Personal con `enclosures.manage` | Gestionar el estado y la eliminación de recintos | `enclosures.manage` (la API lo comprueba, `api-019`) |
| Personal con permisos de búsqueda | Encontrar elementos de sus secciones | Los de cada grupo (`api-019` RN-07) |
| Personal sin permisos de búsqueda | Ver el buscador sin resultados | Ninguno |
| Visitante del panel | No aplica | — |

Ocultar un botón o un grupo no reemplaza la autorización del servidor (`apps/dashboard/AGENTS.md`).

## Historias de usuario

- Como responsable de recintos, quiero desactivar un recinto con un solo clic y una confirmación que me diga cuántos animales tiene, para no dejarlo en servicio por error.
- Como responsable de recintos, quiero ver los recintos de 9 en 9, para encontrarlos sin desplazarme por una lista larga.
- Como personal del panel, quiero escribir un nombre en el encabezado y llegar directamente al usuario, noticia, recinto o boleto que busco.

## Criterios de aceptación

### Recintos

- **CA-01 (botones y estado):** Dada la sección Recintos con `enclosures.manage`, cuando carga, entonces cada tarjeta muestra la insignia «Activo» o «Inactivo» (texto, no solo color), un botón «Desactivar» (o «Activar» si está inactivo) y un botón «Eliminar». Cada botón tiene un nombre accesible que incluye el nombre del recinto, por ejemplo «Desactivar recinto Lobos». Sin `enclosures.manage` no se muestran.
- **CA-02 (confirmar desactivar):** Dado un recinto activo, cuando se pulsa «Desactivar», entonces se abre `ConfirmDialog` con el texto: «¿Desactivar el recinto «X»? Dejará de mostrarse en el portal y la app de visitantes y no podrá asignarse a animales. No se elimina y puedes reactivarlo cuando quieras.». Si el recinto tiene N ≥ 1 animales, se añade la línea «Tiene N animales asignados.» (con N = 1: «Tiene 1 animal asignado.»). Hasta confirmar no se llama a la API; cancelar no cambia nada y devuelve el foco al botón.
- **CA-03 (confirmar eliminar):** Dado un recinto, cuando se pulsa «Eliminar», entonces se abre `ConfirmDialog` con variante de peligro y el texto: «¿Eliminar el recinto «X»? Desaparecerá del panel, del portal y de la app. Esta acción no se puede deshacer desde el panel.». Si tiene N ≥ 1 animales, se añade la misma línea de CA-02. Solo al confirmar se llama a la API; cancelar no cambia nada.
- **CA-04 (activar con confirmación):** Al pulsar «Activar» en un recinto inactivo, aparece un diálogo centrado con su nombre y el efecto de volver a mostrarlo en el portal y la app de visitantes y permitir asignaciones de animales. «Cancelar» o Escape cierra el diálogo antes del envío. Solo «Activar» en el diálogo envía la solicitud y, al completarse, aparece «Recinto activado.». Se aplican los estados de error de CA-06. Enmienda aprobada por la persona solicitante en la conversación.
- **CA-05 (cliente y hooks):** Dada una acción de estado o de eliminación, cuando se confirma, entonces el ViewModel llama a `api.admin.enclosures.setStatus(id, isActive)` o a `api.admin.enclosures.remove(id)` de `@arca/api-client`. Los componentes no llaman a `fetch` ni a `axios`. La prueba usa un cliente simulado.
- **CA-06 (errores):** Dada una respuesta de error de la API, cuando termina la operación, entonces se muestra el mensaje en español de la respuesta. Un 404 muestra «Recinto no encontrado.»; un 403 muestra «No tienes permiso para realizar esta acción.». La lista se vuelve a cargar y el recinto conserva su estado real.
- **CA-07 (cuadrícula de 9):** Dada una lista con más de 9 recintos, cuando se muestra, entonces cada página tiene como máximo 9 tarjetas, en el orden recibido de la API. Se muestra «Página X de Y», los botones Anterior y Siguiente (deshabilitados en los extremos) y los números de página, con la página actual marcada con `aria-current`.
- **CA-08 (diseño adaptable):** Dada la cuadrícula de Recintos, cuando la pantalla es mayor de 1024 px, entonces tiene 3 columnas; con 1024 px o menos, 2 columnas; con 640 px o menos, 1 columna. Se verifica con las reglas de CSS y con una revisión manual a 360, 768 y 1366 px sin desbordamiento horizontal.
- **CA-09 (ajuste de página):** Dada una página actual, cuando se elimina el último recinto de esa página, entonces se muestra la página anterior. Cuando se crea un recinto, la página se recalcula para que el recinto nuevo quede visible. Desactivar o activar no cambia la página, porque el recinto sigue listado.- **CA-10 (estados de la lista):** Dada una lista vacía, el estado vacío de `dashboard-003` se conserva. Dado un error al cargar, se muestra el mensaje de error con un botón de reintento.
- **CA-11 (crear y renombrar):** Crear y renombrar siguen como en `dashboard-003` CA-09: nombre repetido muestra el error de la API.

### Buscador universal

- **CA-12 (reemplazo del campo):** Dado el encabezado, cuando carga, entonces el campo demostrativo se reemplaza por el buscador global. Conserva la clase `.search-box` (que comprueba `administration-quality.test.tsx`). Su etiqueta es «Buscar en el panel», sin «(demostración)». Es un combobox con `role="combobox"`, `aria-expanded`, `aria-controls` y `aria-activedescendant`.
- **CA-13 (mínimo y espera):** Dado un texto de menos de 2 caracteres, cuando se escribe, entonces no se llama a la API y se muestra la ayuda «Escribe al menos 2 caracteres.». Dado un texto de 2 o más caracteres, cuando el visitante deja de escribir durante 300 ms, entonces se llama una sola vez a `api.admin.search(q)`. Una respuesta vieja no sobrescribe a una más reciente. *(Modificado por enmienda (b): si la consulta contiene palabras de una acción, la llamada usa el resto de la consulta; CA-35.)*
- **CA-14 (estados):** Mientras se espera la respuesta, se muestra «Buscando…» en un elemento con `role="status"`. Sin coincidencias, «No encontramos «texto» en el panel.». Si la llamada falla, «No pudimos buscar. Inténtalo de nuevo.».
- **CA-15 (orden de grupos):** Dada una respuesta con grupos, cuando se muestra, entonces el grupo de la sección actual aparece primero con la etiqueta «En esta sección». Los demás grupos llevan «En <Sección>». Las acciones coincidentes aparecen en un grupo «Acciones» (CA-34) y las coincidencias con nombres de secciones permitidas, en un grupo «Secciones», al final. *(Modificado por enmienda (b).)* Si la sección actual no tiene resultados, no aparece su grupo. *(Modificado por enmienda (d): el orden es «En esta sección», los demás grupos de la API por `best_score` descendente —empate: orden de navegación—, «Acciones» y «Secciones»; ver CA-42.)*
- **CA-16 (teclado):** Dado el desplegable abierto, cuando se pulsa ↑ o ↓, entonces el foco visual se mueve entre los resultados; Enter elige el activo; Esc o Tab cierran el desplegable y devuelven el foco al campo. Cada resultado tiene un nombre accesible que incluye su sección.
- **CA-17 (presentación):** Cada resultado muestra el ícono de su sección (con `aria-hidden`) y el texto coincidente resaltado con `<mark>` según la regla de CA-30 (y la línea de CA-29 si hay `match`). *(Modificado por enmienda (b).)* El resaltado se construye con nodos de React, no con `innerHTML`.
- **CA-18 (otra sección):** Dado un resultado de otra sección, cuando se elige, entonces la aplicación cambia a esa sección sin recargar la página y, después, ubica el elemento (CA-20 a CA-22). Si el resultado es de TulanPedia, abre la pestaña según el campo `kind` del elemento: `published-species` → «Publicadas»; `species-request` → «Solicitudes» (`api-019` CA-30; decisión técnica de la sesión principal, pendiente de aprobación del responsable funcional).
- **CA-19 (misma sección):** Dado un resultado de la sección actual, cuando se elige, entonces no se vuelve a pedir la lista de la sección; solo se ubica y se marca el elemento.
- **CA-20 (página correcta):** Dado un resultado de Recintos o de Eventos que está en otra página, cuando se elige, entonces primero se pasa a la página que lo contiene y después se ubica. *(Eventos según `dashboard-011` CA-03.)*
- **CA-21 (historial de boletos):** Dado un resultado de boleto por folio, cuando se elige, entonces Historial de boletos carga ese folio sin modificar el formulario de filtros: los valores y el estado de los filtros son los mismos antes y después.
- **CA-22 (ubicación visual):** Dado un elemento localizado, cuando se ubica, entonces se desplaza al centro con `scrollIntoView({block: "center", behavior: "smooth"})` y recibe la clase `.search-hit` durante unos 4 segundos o hasta el siguiente clic. La clase muestra un contorno grueso y un pulso con el token de acento. Con `prefers-reduced-motion`, no hay pulso y el contorno queda fijo. Una etiqueta flotante muestra «Resultado de tu búsqueda: «texto»» con un botón ✕ (`aria-label` «Quitar resaltado»).
- **CA-23 (aviso accesible):** Tras ubicar un elemento, un aviso con `aria-live="polite"` dice «Mostrando «X» en <Sección>».
- **CA-24 (elemento no disponible):** Dado un resultado que ya no existe al elegirlo (por ejemplo, eliminado después de buscar), cuando se elige, entonces la aplicación vuelve a cargar la lista de la sección y, si el elemento no aparece, muestra «Ese elemento ya no está disponible.». No cambia nada más.
- **CA-25 (la interfaz no decide permisos):** Dada una respuesta de `api-019`, cuando se muestra, entonces se pintan los grupos que llegan, en el orden de la respuesta. Las coincidencias con nombres de sección solo aparecen para secciones que la navegación del perfil (`getNavigationForProfile`) incluye.
- **CA-26 (sin regresión de buscadores internos):** Los buscadores y filtros de Usuarios, Historial de boletos, Momentos y demás secciones conservan su comportamiento; sus pruebas existentes siguen en verde.
- **CA-27 (estilo):** `.search-box` ocupa el 100 % del ancho en pantallas de 640 px o menos. Los estilos nuevos usan solo tokens semánticos y modo claro; no hay colores fijos.
- **CA-28 (cobertura):** Dada la suite de Vitest del dashboard, cuando se ejecuta, entonces hay al menos un `describe("CA-xx enclosure-actions-global-search")` con pruebas para cada CA-01 a CA-44, y la spec 012 queda registrada en `administration-coverage.test.tsx`.

### Buscador tolerante y acciones (enmienda (b), aprobada)

- **CA-29 (fragmento de coincidencia):** Dado un resultado de la API con `match`, cuando se muestra, entonces bajo el título aparece «<match.field>: <snippet>» con la coincidencia resaltada en `<mark>`. Sin `match`, no aparece esa línea. El fragmento se pinta con nodos de React, no con `innerHTML`.
- **CA-30 (resaltado tolerante):** Dado un término y un texto (título, fragmento o nombre de sección), cuando se resalta, entonces se marcan las partes que cumplen la regla de `api-019` CA-36 a CA-40: sin mayúsculas ni acentos, prefijos, errores de escritura según la longitud y «contiene» desde 4 letras. Se aplica a los grupos de la API y al grupo «Secciones».
- **CA-31 (paridad de reglas):** Dada la tabla de casos de `api-019` CA-36 a CA-40, cuando se ejecuta la función de cliente, entonces da el mismo resultado sí o no que la regla de la API en cada caso. La tabla vive en el test de Vitest y se copia del criterio de la API.
- **CA-32 (catálogo de acciones):** Dado el catálogo del dashboard, cuando se revisa, entonces cada entrada corresponde a una acción que existe en una vista (su etiqueta aparece en el código de esa vista) y declara sección, permiso, sinónimos y si abre el diálogo. El catálogo es el de la sección «Catálogo de acciones» de esta enmienda. No incluye acciones inexistentes (por ejemplo, «QR»).
- **CA-33 (filtro por permisos):** Dado un perfil, cuando se buscan acciones, entonces solo aparecen las acciones cuyo permiso figura en `profile.permissions`. Es presentación: la API sigue autorizando cada acción (RN-12).
- **CA-34 (grupo «Acciones»):** Dada una búsqueda con acciones coincidentes, cuando se ordena, entonces el grupo «Acciones» aparece después de los grupos de la API y antes de «Secciones». Cada elemento muestra la etiqueta de la acción y su sección («Usuarios», «Recintos», etc.). Sin acciones coincidentes, el grupo no aparece.
- **CA-35 (acción y elemento en una consulta):** Dada la consulta «contraseña juan», cuando una palabra coincide con una acción y el resto no, entonces la aplicación llama a `api.admin.search` solo con el resto («juan»), y el elemento de la sección de la acción muestra «Ir a: Restablecer contraseña». Si el resto tiene menos de 2 caracteres, no hay llamada y solo aparece «Acciones». Si todas las palabras son de acción (por ejemplo, «contraseña»), la llamada usa la consulta completa. Las reglas de palabra de acción están en CA-41.
- **CA-36 (solo acción):** Dada una acción sin elemento (por ejemplo, «contraseña» con la búsqueda de solo acciones), cuando se elige, entonces la aplicación cambia a la sección de la acción (y a la pestaña de TulanPedia si la acción la indica) sin abrir diálogo y sin modificar datos.
- **CA-37 (abrir sin ejecutar):** Dada una acción con elemento, cuando se elige, entonces la aplicación navega, ubica el elemento y abre el diálogo de la acción solo si la vista lo soporta (CA-38). El diálogo pide confirmación. Elegir el resultado no llama a ningún método que cambie datos (`setStatus`, `remove`, restablecer contraseña o 2FA, cancelar boleto).
- **CA-38 (vistas que abren la acción):** Usuarios (desactivar o activar cuenta, restablecer contraseña, restablecer 2FA, eliminar cuenta), Recintos (desactivar o activar, eliminar) e Historial de boletos (cancelar boleto) reciben la acción junto con el foco. Las demás secciones solo navegan y ubican. Las cuentas de Usuarios llevan `data-search-id="users:<id>"`. Si el elemento no está en la página cargada, aplica CA-24.
- **CA-39 (límite de peticiones):** Dada una respuesta 429 de la API, cuando se busca, entonces el buscador muestra el mensaje de la API en lugar de «No pudimos buscar. Inténtalo de nuevo.» y no reintenta solo. *(El texto del mensaje es propuesta de la API, ver `api-019` CA-47.)*
- **CA-40 (sin persistencia de términos):** Los términos buscados no se guardan en `localStorage`, `sessionStorage` ni cookies, y no se escriben en la URL. Se verifica por lectura estática del código de búsqueda.
- **CA-41 (tolerancia en Secciones y Acciones):** Dado un término con errores de escritura, cuando se buscan secciones y acciones, entonces las secciones usan la regla de CA-30. Una palabra reconoce una acción solo por exacta o prefijo, o con un error de escritura si tiene 7 o más letras (distancia 2 o menos). Así, «clara» no activa la acción «Clave» de una cuenta. *(Propuesta de redacción; ver «Preguntas» de la enmienda.)*
- **CA-42 (orden por relevancia de la API, enmienda (d)):** Dada una respuesta con grupos que traen `best_score` (mayor = más relevante; opcional), cuando se ordenan, entonces va primero el grupo de la sección actual («En esta sección», si tiene resultados), luego los demás grupos de la API por `best_score` descendente (empate o ausencia del campo: orden de navegación actual), luego «Acciones» y por último «Secciones».
- **CA-43 (paridad de relevancia, enmiendas (d) y (e)):** Dada la regla vigente de `api-019`, cuando el cliente rankea «Acciones» y «Secciones» y decide coincidencias, entonces ordena por frase literal exacta del título, título que contiene la frase, otro campo que la contiene, más palabras coincidentes, mejor nivel medio y, al final, el orden de navegación o del catálogo; exige todas las palabras con contenido cuando hay de 1 a 3 y, con 4 o más, al menos 3 y al menos el 75 % redondeado hacia arriba. Excepción: en «Acciones» basta con que una palabra coincida con la etiqueta o los sinónimos (se ordenan por relevancia).
- **CA-44 (resaltado de todas las palabras, enmienda (d)):** Dado un término de varias palabras con coincidencia parcial, cuando se resalta, entonces `<mark>` marca todas las palabras del texto que coincidieron, no solo la primera.

## Reglas de negocio

- **RN-01 (solo presentación):** El panel muestra lo que devuelve la API. No decide permisos, orden de datos ni cálculos (`apps/dashboard/AGENTS.md`).
- **RN-02 (confirmación obligatoria):** Desactivar y eliminar siempre piden confirmación (`dashboard-003` RN-03).
- **RN-03 (confirmar cambios de estado):** Activar y desactivar desde la tarjeta del recinto requieren confirmación (CA-02 y CA-04).
- **RN-04 (sin llamadas directas):** Las llamadas van por hooks y `@arca/api-client`. No hay `fetch` ni `axios` en `components/` ni en `views/`.
- **RN-05 (paginación en el cliente):** La paginación de Recintos solo organiza la lista recibida. No cambia la consulta ni el orden de la API, y no reduce los datos transferidos.
- **RN-06 (búsqueda):** Mínimo 2 caracteres, espera de 300 ms antes de llamar, máximo 100 caracteres (límite de la API). El buscador no guarda historial. Ante un 429, muestra el mensaje de la API (CA-39). *(Modificado por enmienda (b).)*
- **RN-07 (clic sin efectos):** Elegir un resultado solo navega y resalta; si lleva una acción, abre su diálogo sin ejecutarla (CA-37, RN-13). No modifica datos. *(Modificado por enmienda (b).)*
- **RN-08 (estilo):** Tokens semánticos, modo claro, sin colores de marca fijos en componentes (`apps/dashboard/AGENTS.md`).
- **RN-09 (textos):** Todos los textos visibles están en español. Identificadores y rutas en inglés.
- **RN-10 (accesibilidad):** Teclado completo, roles y nombres accesibles, foco visible y respeto de `prefers-reduced-motion`.

- **RN-11 (paridad de reglas):** La función de tolerancia del cliente replica la regla vigente de `api-019`, incluidas las enmiendas (d) y (e): relevancia y coincidencia parcial estricta de CA-43 para resaltar y ordenar secciones y acciones. Es presentación: no decide qué elementos existen, lo decide la API. Un cambio de la regla en la API se refleja aquí en el mismo PR.
- **RN-12 (catálogo de acciones):** Es configuración de presentación del dashboard. No sustituye la autorización de la API ni crea acciones: solo lleva a pantallas y diálogos que ya existen.
- **RN-13 (diálogo sin ejecución):** Elegir una acción abre, como máximo, el diálogo o formulario de la vista. No ejecuta la acción; la confirmación sigue siendo obligatoria (RN-02 y `dashboard-003` RN-03).
- **RN-14 (términos):** El buscador no escribe el término en el almacenamiento del navegador, en la URL ni en logs del cliente (CA-40).

## Datos, privacidad y auditoría

- No hay datos nuevos. El buscador muestra solo lo que `api-019` devuelve para el rol del usuario.
- El panel no guarda resultados ni historial en el navegador.
- Las acciones sobre recintos quedan auditadas en la API (`api-019` CA-08).
- No requiere DBR por sí misma. La parte de recintos depende de DBR-020.

## Flujos y errores

### Flujo principal: desactivar un recinto
1. El personal abre Recintos y ve las tarjetas de 9 en 9.
2. Pulsa «Desactivar» en un recinto con 3 animales.
3. Se abre el diálogo con la advertencia «Tiene 3 animales asignados.».
4. Confirma. Se llama a `setStatus(id, false)`. La tarjeta muestra «Inactivo» y el aviso «Recinto desactivado.».

### Flujo principal: buscar y llegar
1. El personal escribe «lobo» en el encabezado. Tras 300 ms se llama a la búsqueda.
2. Aparecen «En esta sección» (si hay resultados aquí) y «En Recintos» o «En Usuarios», según corresponda.
3. Elige un recinto de otra página. La aplicación cambia a Recintos, pasa a la página correcta, centra la tarjeta, la resalta y anuncia «Mostrando «Recinto Lobos» en Recintos».

### Errores esperados
- Búsqueda fallida → «No pudimos buscar. Inténtalo de nuevo.» (CA-14).
- Elemento que ya no existe → «Ese elemento ya no está disponible.» (CA-24).
- Error de la API al desactivar o eliminar → mensaje de la respuesta (CA-06).
- Sin conexión → mismo mensaje de error que la búsqueda o la lista.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** `api-019` (Borrador), DBR-020 (Borrador), `dashboard-003` (CA-09 enmendado; RN-03), `dashboard-011` (paginación de eventos, CA-03; patrón de paginación). No hay dependencias nuevas de npm. No se requiere ADR.
- **Riesgos:**
  - **Carrera entre búsqueda y lista:** el elemento puede cambiar entre la búsqueda y el clic. CA-24 lo cubre.
  - **Navegación del perfil:** si una sección del resultado no está en la navegación, el resultado no se muestra (CA-25). Esto depende de `getNavigationForProfile`.
  - **Complejidad de la sección de búsqueda:** el resaltado, la espera y el foco son la parte más delicada. Se cubre con pruebas.
- **Puntos abiertos:** ninguno. Un resultado de TulanPedia usa el campo `kind` de `api-019` (CA-23, CA-30) para abrir la pestaña Publicadas (`published-species`) o Solicitudes (`species-request`) y ubicar el elemento como cualquier otro resultado.

## Cambios por área

| Área | Archivos previstos | Propósito |
|---|---|---|
| Recintos | `src/views/EnclosuresView.tsx`, `src/viewmodels/enclosures-management.ts`, `src/viewmodels/useEnclosuresManagement.ts` | Insignia, botones, diálogos y paginación (la implementación se define en el plan) |
| Buscador | `src/components/GlobalSearch.tsx`, `src/viewmodels/useGlobalSearch.ts` | Combobox, espera, estados y navegación (la implementación se define en el plan) |
| Encabezado | `src/App.tsx` | Sustituir el campo demostrativo y aceptar un `focusTarget` |
| Paquete | `packages/api-client` (`admin.ts`, `admin-types.ts`) | Métodos `setStatus`, `remove`, `search` y tipos (sin lógica) |
| Estilos | `src/styles.css` | Cuadrícula de 3/2/1 columnas, `.search-hit`, buscador de ancho completo (solo tokens) |
| Pruebas | `src/tests/` (Vitest) | `describe("CA-xx enclosure-actions-global-search")` y registro en `administration-coverage.test.tsx` |

## Enmienda (b), aprobada

Alcance: buscador tolerante en el cliente (resaltado y reglas de secciones y acciones), fragmento `match`, grupo «Acciones» con el catálogo de acciones existentes, apertura de acciones desde un resultado donde la vista lo soporta y manejo del límite de peticiones. Sin cambios de permisos, de navegación del perfil ni DBR. Depende de `api-019` enmienda (b).

### Cambios frente a la versión aprobada

| Elemento | Cambio |
|---|---|
| CA-13 | La llamada usa el resto de la consulta cuando hay palabras de acción (CA-35). |
| CA-15 | Añade «Acciones» antes de «Secciones» (CA-34). |
| CA-17 | Resaltado con la regla de CA-30 y línea `match` (CA-29). |
| CA-28 | Cobertura CA-01 a CA-41. |
| RN-06 | El 429 muestra el mensaje de la API (CA-39). |
| RN-07 | Elegir una acción abre el diálogo y no la ejecuta (CA-37, RN-13). |
| CA-21 (historial de boletos) | Sin cambio en los filtros. Además, la acción «Cancelar boleto» abre el diálogo de la fila localizada (CA-38). |
| `dashboard-003` | Sin cambio. |

### Catálogo de acciones (CA-32)

Solo acciones que existen en las vistas. Permiso: el que exige la vista o la ruta de la API. «Abre diálogo» indica si la acción puede abrirse desde un resultado (CA-38).

| Acción | Sección | Permiso | Abre diálogo | Sinónimos (ejemplos) |
|---|---|---|---|---|
| Restablecer contraseña | Usuarios | `users.manage` | sí (`reset-password`) | contraseña, contrasena, clave, password, pass |
| Restablecer 2FA | Usuarios | `users.manage` | sí (`reset-two-factor`) | 2fa, dos factores, doble factor, verificación, autenticación, mfa |
| Desactivar o activar cuenta | Usuarios | `users.manage` | sí (`status`) | desactivar, activar, suspender, estado, cuenta |
| Eliminar cuenta | Usuarios | `users.manage` | sí (`delete`) | eliminar, borrar, quitar |
| Editar usuario | Usuarios | `users.manage` | no | editar, modificar, rol, área, correo |
| Crear usuario | Usuarios | `users.manage` | no | nuevo usuario, crear, agregar, alta |
| Crear recinto | Recintos | `enclosures.manage` | no | nuevo recinto, crear, agregar, alta |
| Renombrar recinto | Recintos | `enclosures.manage` | no | renombrar, editar nombre |
| Desactivar o activar recinto | Recintos | `enclosures.manage` | sí (`status`) | desactivar, activar, mantenimiento, cerrar, abrir, estado |
| Eliminar recinto | Recintos | `enclosures.manage` | sí (`delete`) | eliminar, borrar, quitar |
| Crear noticia | Noticias | `news.manage` | no | nueva noticia, crear |
| Editar noticia (incluye imagen) | Noticias | `news.manage` | no | editar, imagen, foto, título, contenido, categoría |
| Activar o desactivar noticia | Noticias | `news.manage` | no | publicar, despublicar, mostrar, ocultar, activar, desactivar |
| Crear evento | Eventos | `events.manage` | no | nuevo evento, crear |
| Editar evento (incluye imagen) | Eventos | `events.manage` | no | editar, imagen, foto, ubicación |
| Activar o desactivar evento | Eventos | `events.manage` | no | publicar, despublicar, mostrar, ocultar, activar, desactivar |
| Cancelar boleto | Historial de boletos | `tickets.cancel` | sí (`cancel`) | cancelar, anular, cancelación |
| Precios de boletos | Precios de boletos | `ticket-prices.manage` | no | precio, precios, tarifa, tarifas, costo, adulto, niño, entrada en vigor |
| Nueva venta | Venta | `tickets.create` | no | venta, vender, cobrar, efectivo, imprimir |
| Exportar reporte de boletos | Reporte de boletos | `reports.view` | no | exportar, descargar, reporte, excel, csv |
| Aceptar momento | Momentos | `memories.review` | no | aceptar, aprobar |
| Rechazar momento | Momentos | `memories.review` | no | rechazar, motivo, denegar |
| Despublicar especie | TulanPedia, pestaña «Publicadas» | `species.review` | no | despublicar, ocultar, quitar del catálogo |
| Republicar especie | TulanPedia, pestaña «Publicadas» | `species.review` | no | republicar, publicar, volver a publicar |
| Eliminar publicación | TulanPedia, pestaña «Publicadas» | `species.review` | no | eliminar publicación, quitar |
| Aceptar y publicar solicitud | TulanPedia, pestaña «Solicitudes» | `species.review` | no | aceptar, publicar, aprobar |
| Aceptar sin publicar | TulanPedia, pestaña «Solicitudes» | `species.review` | no | aceptar, aprobar |
| Rechazar solicitud | TulanPedia, pestaña «Solicitudes» | `species.review` | no | rechazar, motivo |

No hay una entrada propia «QR»: «qr» y «código qr» son sinónimos de «Nueva venta» (donde se imprime el QR del boleto), solo con `tickets.create` (decisión técnica de la sesión principal, plan D-28). Cuando exista la gestión de QR de recintos (`dashboard-013`), su catálogo se amplía en esa spec.

### Reglas de palabras de acción (CA-35, CA-41)

- Una palabra de la consulta es de acción si coincide con la etiqueta o con un sinónimo de la acción por exacta o prefijo, o con un error de escritura cuando tiene 7 o más letras (distancia 2 o menos). Las palabras de 4 a 6 letras no admiten error en este caso, para evitar falsos positivos como «clara» con «clave».
- El resto de la consulta (las palabras que no son de acción) es la consulta enviada a la API.
- Un elemento de la sección S recibe «Ir a: <acción>» si una palabra de acción coincide con una acción de S que el perfil puede ver. Si hay varias, gana la primera en el orden del catálogo.

### Decisiones de la enmienda (b)

1. ¿Basta con llevar a la sección (sin abrir formulario ni diálogo) en las acciones de imagen, edición, aceptar, rechazar, publicar y exportar? (propuesta: sí).
2. ¿Confirmas que solo Usuarios, Recintos e Historial de boletos abren el diálogo desde un resultado? (propuesta: sí; el resto requiere cambios de vista que no están en esta enmienda).
3. ~~¿«QR» sin acción o a Nueva venta?~~ Resuelta: apunta a Nueva venta (plan D-28).

## Enmienda (c), aprobada junto con `dashboard-013`

Alcance: el catálogo de acciones gana la entrada de QR del recinto, y el aviso de eliminar un recinto menciona sus QR. Sin cambios de permisos, de navegación del perfil ni de DBR. La spec que la usa es `apps/dashboard/specs/013-enclosure-qr-printing.md` (Aprobada). Decisión del responsable funcional.

| Elemento | Antes | Después |
|---|---|---|
| CA-32 (catálogo) | No incluye acciones inexistentes (por ejemplo, «QR»). «qr» y «código qr» son sinónimos de «Nueva venta». | Nueva entrada «QR del recinto» (Recintos, `enclosures.manage`, abre diálogo: sí, sinónimos: qr, código qr, qr recinto, imprimir qr, regenerar qr, generar qr). «qr» pasa a coincidir con «Nueva venta» (`tickets.create`) y con «QR del recinto» (`enclosures.manage`), según los permisos del perfil. |
| CA-38 (vistas que abren la acción) | Recintos: desactivar o activar, eliminar. | Recintos: además «QR del recinto» (ver, imprimir o regenerar según el término; `dashboard-013` CA-18). |
| RN-07 | Elegir una acción abre el diálogo y no la ejecuta. | Sin cambio. «QR del recinto» también abre el diálogo y no imprime ni regenera por sí sola. |
| CA-03 (eliminar recinto, texto del `ConfirmDialog`) | «¿Eliminar el recinto «X»? Desaparecerá del panel, del portal y de la app. Esta acción no se puede deshacer desde el panel.» | Se añade, al final, «Sus códigos QR dejarán de funcionar.» (`dashboard-013` CA-23). El resto del texto no cambia. |
| CA-41 (palabras de acción) | Sin cambio. | Sin cambio: la regla de palabras aplica tal cual a «QR del recinto». |

## Enmienda (d), aprobada

Alcance: orden de los grupos por `best_score`, relevancia y coincidencia parcial del cliente en paridad con `api-019` enmienda (d), y resaltado de todas las palabras coincidentes. Sin cambios de permisos, navegación ni DBR. `best_score?: number` es opcional en `GlobalSearchGroup` (`packages/api-client`, a cargo del agente backend).

| Elemento | Antes | Después |
|---|---|---|
| CA-15 (orden de grupos) | Sección actual, demás grupos en el orden de la respuesta, «Acciones», «Secciones». | Sección actual, demás grupos por `best_score` descendente (empate: navegación), «Acciones», «Secciones» (CA-42). |
| CA-25 (orden de la respuesta) | Se pintan los grupos que llegan en el orden de la respuesta. | Se pintan los grupos que llegan; su orden lo define CA-42. Los permisos siguen siendo de la API. |
| CA-30, CA-31, CA-41 y RN-11 (regla de tolerancia) | Todas las palabras debían coincidir; sin criterio de relevancia. | Con 1 o 2 palabras, todas; con más, al menos ceil(n/2). Relevancia: frase literal exacta del título > título contiene la frase > otro campo la contiene > más palabras > mejor nivel medio > orden alfabético de la API / navegación o catálogo en el cliente (CA-43). La tabla de casos de CA-31 con 1 o 2 palabras no cambia. |
| CA-17 y CA-30 (resaltado) | Marca las coincidencias de cada palabra. | Marca todas las palabras coincidentes, también con coincidencia parcial (CA-44). |
| CA-28 | Cobertura CA-01 a CA-41. | Cobertura CA-01 a CA-44. |

## Revisión

- Aprobadores: responsable funcional. Decisiones registradas: activar sin confirmación, texto en singular para un animal, recálculo de página tras crear, grupo «Secciones» al final; sin restauración de recintos eliminados. Decisión técnica de la sesión principal, pendiente de aprobación del responsable funcional: pestaña de TulanPedia según `kind` (CA-18).
- Evidencia/enlaces: `apps/api/specs/019-enclosure-status-and-global-search.md`, `docs/database/requests/DBR-020-enclosure-status-soft-delete.md`, `apps/dashboard/specs/003-administration-sections.md` (CA-06, CA-09, RN-03), `apps/dashboard/specs/011-collapsible-menu-event-pagination.md` (CA-03).

## Enmienda (e), aprobada

Pedida por el responsable funcional: «busco una noticia y salen primero eventos; solo toma algunas palabras».

- **Palabras vacías** (a, al, con, de, del, el, en, es, la, las, lo, los, o, para, por, que, se, su, sus, un, una, unas, unos, y): no se exigen ni cuentan como coincidencia; sí forman parte de la frase literal (CA-50 a CA-52). Si la consulta solo tiene palabras vacías, se usan todas. Implementado en `ItemMatcher` (API) y `search-tolerance.ts` (cliente, paridad).
- **Coincidencia parcial más estricta** (modifica CA-37 y la regla de ceil(n/2) de la enmienda d): con 1 a 3 palabras con contenido se exigen todas; con 4 o más, al menos 3 y al menos el 75 % (redondeado hacia arriba).
- **Sección nombrada en la consulta** (dashboard, `viewmodels/search-intent.ts`): si la consulta incluye una palabra de sección (noticia/s, nota/s; evento/s, actividad/es; recinto/s; usuario/s, cuenta/s, empleado/s, personal; momento/s, recuerdo/s; especie/s, tulanpedia; boleto/s, folio/s), esa palabra no se envía a la API (si queda texto suficiente) y el grupo de esa sección se muestra primero, antes que el de la sección actual.
- **Palabras de sección y vacías no son acciones** (dashboard, `splitSearchQuery`): antes una palabra como «noticia» se reconocía como parte de una acción («Publicar noticia») y se quitaba de la consulta enviada a la API, por lo que la búsqueda usaba una sola palabra. Ahora esas palabras siempre llegan a la búsqueda.
- **Grupo «Acciones» solo con palabras sin resultados** (`orderSearchGroups`): las acciones se buscan solo con las palabras de la consulta que no aparecen en ningún resultado de la API (título, subtítulo o fragmento), sin palabras vacías ni de sección; si no queda ninguna, no se muestran acciones. Evita acciones ajenas por sinónimos («nuevo» → «Crear…») cuando la palabra es parte del contenido buscado. «contraseña juan» sigue mostrando «Restablecer contraseña». **Excepción, verbo explícito:** si la consulta incluye de forma exacta el verbo inicial de una acción (Crear, Renombrar, Eliminar, Desactivar, Activar, Cancelar, Restablecer, Aceptar, Rechazar, Publicar/Despublicar/Republicar, Editar, Exportar) o un sinónimo en infinitivo («borrar», «cambiar»…), esa palabra siempre se usa para «Acciones», aunque aparezca en los resultados.
- **Resaltado:** usa la consulta completa sin palabras vacías, para marcar todas las palabras que coinciden.
- **Tests:** actualizados para CA-37, CA-41 y CA-43 del dashboard; la verificación completa queda registrada en tasks. La cobertura de API CA-50 a CA-54 se verifica en su propia suite.

- Nota (c): la paginación de esta pantalla usa el componente único `Pagination` (`dashboard-020` CA-43 a CA-48); su comportamiento (tamaño de página, reinicio al filtrar) y los CA de esta spec no cambian.
