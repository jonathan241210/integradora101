# 004 · isometric-zoo-map

- App dueña: `web`
- Apps/paquetes afectados: `apps/web`
- Estado: Implementada
- Solicitada: 2026-10-08
- Aprobada: 2026-10-08
- Aprobación funcional: Aprobada
- Enmienda del 24 de noviembre de 2026 aprobada al final del documento.

## Problema y contexto

La sección actual del mapa es un esquema de zonas con formas simples y una lista de servicios identificada principalmente con emojis. La persona solicitante quiere un mapa con presentación visual en perspectiva 3D, similar en composición a una vista aérea, además de iconos claros para reconocer zonas y servicios.

La persona solicitante confirmó que acepta una ilustración aproximada hecha con código, sin proveedor externo ni fotografía satelital, y que deben conservarse las zonas y servicios existentes. También eligió SVG incluidos directamente en el portal con una estética similar a Bootstrap Icons, sin instalar la biblioteca Bootstrap Icons ni otras dependencias. El mapa será demostrativo y no describirá con exactitud la distribución real del zoológico.

El la persona solicitante pidió mejorar el relieve visual 3D e incorporar controles para acercar, alejar y restablecer la vista, además de conservar la selección interactiva de las zonas. Confirmó que se mantenga una ilustración 3D aproximada, no un mapa geográfico real, y aprobó el alcance ampliado.

## Objetivos

- Presentar las zonas actuales como una ilustración de mapa en perspectiva isométrica/3D, con senderos y elementos visuales del recinto creados dentro del portal.
- Mejorar la percepción de relieve y profundidad sin afirmar que la escena sea un modelo geográfico o topográfico exacto.
- Identificar visualmente cada zona y servicio del mapa con iconos SVG propios, consistentes y accesibles.
- Conservar la selección de zonas y servicios y el anuncio de selección existente.
- Permitir acercar, alejar y restablecer la escala visual con controles accesibles, conservando los marcadores y su selección.
- Adaptar el mapa a móvil, mantener controles operables por teclado y evitar desbordamiento horizontal.
- Mostrar como vista 2D la fotografía aérea suministrada y permitir alternarla por el modelo local `assets/mapa_corregido.glb`.
- Dejar explícito que la ilustración es aproximada, no está a escala y no debe usarse para navegación precisa dentro del recinto.

## Fuera de alcance

- Incrustar un mapa satelital real, utilizar imágenes aéreas de Google u otro proveedor, geolocalizar al visitante o ofrecer rutas precisas.
- Agregar Bootstrap, Bootstrap Icons, bibliotecas de iconos, motores 3D, mapas web, fuentes, scripts remotos o dependencias nuevas.
- Afirmar que el mapa reproduce fielmente la distribución física, medidas, orientación o accesos reales del zoológico.
- Modificar servicios y zonas fuera de la lista que actualmente presenta el mapa, contenido de otras secciones o funcionalidades de pagos.
- Modificar la API, base de datos, otras aplicaciones o paquetes.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante | Reconocer de manera visual las zonas y servicios demostrativos del zoológico | Ninguno; contenido público |
| Equipo de desarrollo | Mantener una representación ligera, adaptable y accesible sin servicios externos | Acceso al repositorio |

## Historias de usuario

Como visitante, quiero ver las zonas y servicios del zoológico en un mapa ilustrado con volumen e iconos reconocibles para explorar visualmente el portal antes de visitar.

## Criterios de aceptación

- **CA-01:** Dado el mapa del zoológico, cuando se renderice la sección, entonces mostrará la imagen local `assets/MAPA_2D.svg` con sus controles y configurará la vista 3D para cargar `assets/mapa_corregido.glb`; no cargará imágenes, mapas ni scripts de proveedores externos.
- **CA-02:** La vista 2D muestra el plano completo y un único botón para alternar la vista.
- **CA-03:** Dado que el mapa es aproximado, cuando una persona visitante lo consulte, entonces encontrará un aviso visible y accesible indicando que es ilustrativo, no está a escala y no sirve para orientación precisa dentro del recinto.
- **CA-04:** El botón permite alternar por teclado, toque o clic y comunica la vista activa mediante su etiqueta y estado accesibles.
- **CA-05:** Dado el mapa en anchos de 360, 390, 768, 1024 y 1366 px, cuando se visualice y opere, entonces la ilustración y sus controles permanecerán dentro de la sección, no causarán desbordamiento horizontal y seguirán siendo legibles y alcanzables por teclado.
- **CA-06:** Dada la suite ejecutada mediante `node --test apps/web/src/tests/relocation.test.mjs`, cuando finalice, entonces contendrá tests nombrados para CA-01..CA-07, verificará estructura, iconos SVG, accesibilidad, selección, zoom/restablecimiento y ausencia de proveedores/dependencias nuevos.
- **CA-07:** Al usar la rueda o deslizar un dedo verticalmente sobre el visor 3D, la página admite el desplazamiento normal. El modelo admite rotación intencional.

## Reglas de negocio

- **RN-01:** El mapa es una ilustración demostrativa aproximada y no una fuente de datos geográficos u operativos.
- **RN-02:** La vista 2D presenta el SVG suministrado y el botón de cambio de vista.
- **RN-03:** Los iconos se dibujan como SVG locales propios, con estilo visual similar a iconografía lineal de Bootstrap; no se incorpora ni se carga Bootstrap Icons.
- **RN-04:** La selección de elementos se limita a interacción de interfaz y no requiere API, geolocalización, almacenamiento ni cálculo de rutas.
- **RN-05:** Los botones y sus iconos mantienen nombre accesible, foco visible y uso por teclado; el SVG decorativo no duplica el anuncio del texto.
- **RN-06:** El visor 3D reserva el desplazamiento vertical y la rueda para la página.

## Datos, privacidad y auditoría

No se crean, consultan ni modifican datos. No se utiliza ubicación del dispositivo ni se solicitan permisos. No se usa información personal, clínica o financiera; no se accede a la API ni a `settings_colores`.

## Flujos y errores

1. El navegador carga la ilustración vectorial local y los servicios existentes.
2. Si se activa un marcador, el portal actualiza su estado de selección y anuncia su nombre mediante la región viva bajo el mapa.
3. La ilustración escala dentro de su contenedor en pantallas estrechas; los controles conservan un tamaño de interacción usable y foco visible.
4. Si SVG/CSS visual no se muestran como se espera, el nombre visible de cada botón y su función de selección siguen disponibles como alternativa.
5. Los controles de zoom modifican solo la escala de la escena ilustrada; al llegar a un límite comunican el estado deshabilitado cuando corresponda.
6. El control para restablecer recupera la escala inicial sin modificar la zona seleccionada.
7. No hay dependencias de red para el mapa ni un estado de error por caída de proveedor.

## Dependencias, riesgos y preguntas

- Dependencias/ADR: no se agregan dependencias ni se requiere ADR para dibujar SVG local con HTML/CSS existentes.
- Riesgos: el resultado puede parecerse en perspectiva a un mapa aéreo, pero no puede ofrecer el realismo de una fotografía satelital; se mitiga con la etiqueta demostrativa y la exclusión explícita de navegación precisa.
- Riesgos: iconos sin texto alternativo pueden ser ambiguos; se mitiga conservando nombres visibles y marcando los SVG como decorativos cuando el texto asociado ya etiqueta el control.
- Preguntas pendientes: Ninguna de alcance para el incremento de zoom/restablecimiento.

## Revisión

- Aprobación: Aprobada (alcance ampliado).
- Ampliación aprobada por el solicitante: sustituir el dibujo SVG por la fotografía aérea local y cargar un GLB exportado desde Blender.
- Evidencia/enlaces: La persona solicitante confirmó que prefiere conservar la ilustración, mejorar su aspecto 3D y añadir zoom/restablecimiento, no un mapa geográfico real. La spec `003-lion-hero-mobile-navigation` cubre separadamente el cambio del hero y menú adaptable.

La corrección del visor mantiene el contrato de la enmienda aprobada y utiliza el modelo local existente `assets/mapa_corregido.glb`. El portal indica cómo abrirlo cuando se accede directamente como archivo.

## Enmienda aprobada · mapa sin columna lateral

- Aprobación funcional: Aprobada.
- Objetivo: dar todo el ancho de la sección al mapa público y usar la foto suministrada en la vista 2D.
- **CA-01:** La vista 2D usa la imagen suministrada en `apps/web/src/assets/MAPA_2D.svg`.
- **CA-02 / RN-02:** Desaparecen la columna «Zonas y servicios», su lista y el mensaje inicial «Elige una zona o servicio del mapa». Permanecen los siete marcadores que ya están sobre el mapa. Baños, Alimentos, Bebederos, Áreas de descanso, Enfermería y Tiendas salen de esta sección porque solo figuran en la columna.
- **CA-04 / CA-05:** El mapa ocupa el ancho disponible, conserva la selección accesible de sus marcadores y permite alternar entre 2D y 3D.
- Vista pública. La propuesta afecta únicamente la presentación y la fotografía local.

## Enmienda aprobada · plano limpio y desplazamiento

- Aprobación funcional: Aprobada.
- Se retiran los botones sobre el plano y los controles de zoom 2D. El botón de alternar permanece accesible. El visor permite la rotación y cede el desplazamiento vertical a la página.

## Enmienda del 24 de noviembre de 2026 · planos y directorio público

**Estado de la enmienda: Implementada.** El 24 de noviembre de 2026 la persona solicitante confirmó ambos catálogos y la disposición en escritorio y celular.

Como visitante, quiero consultar el plano y los nombres de los recintos y lugares de interés registrados en el zoológico desde la misma sección. La persona solicitante aportó un plano PNG de 1600 × 1200 píxeles y el generador de Blender `mapa_zoo_v3_blender.py`. El directorio incluye los recintos activos y los lugares públicos de los catálogos que también alimentan el mapa móvil.

- **CA-01 y CA-02 revisados.** Al abrir el mapa se ve completo el PNG aportado en su proporción original. Al activar el control 3D se muestra la escena exportada del archivo de Blender, incluidos sus recintos y rótulos. El mismo control permite volver al plano.
- **CA-05 revisado.** En escritorio el directorio aparece a la derecha del mapa en ambas vistas. En móvil aparece debajo, con los nombres legibles y sin desplazamiento horizontal.
- **CA-08.** El panel muestra por nombre los elementos de las listas públicas de recintos y lugares de interés, agrupados por procedencia. Incluye también los registros que carecen de coordenadas. Al volver a cargar la página se reflejan los cambios publicados en los catálogos.
- **CA-09.** Cada grupo distingue la carga, una lista vacía y un error de consulta. Si falla un grupo, el otro puede mostrar sus resultados. El cambio entre vistas del mapa sigue disponible aunque falle el directorio.
- **RN-07.** Las fuentes del directorio son `GET /api/v1/enclosures` y `GET /api/v1/zoo-places`, de lectura anónima. El servidor determina la visibilidad. Los rótulos de los archivos gráficos son parte de la ilustración. La identidad de cada registro del directorio la determina su catálogo y su identificador, incluso si dos registros comparten nombre.

Los criterios vigentes sobre el aviso del plano ilustrativo, el uso del control por teclado y el desplazamiento vertical en 3D siguen aplicando. El alcance se limita al portal público, los dos recursos visuales y la lectura de los catálogos existentes.

### Estado actual de los datos

El 24 de noviembre de 2026 se consultó el esquema de `arca_pruebas` con `php artisan db:table enclosures` y `php artisan db:table zoo_places`. Se confirmaron `id`, `name`, `is_active` y `deleted_at` para recintos, así como `id`, `name`, `place_type`, `is_visible` y `deleted_at` para lugares. Los campos necesarios concuerdan con el diccionario de datos, las DBR-019 y DBR-020 y sus migraciones. El directorio consume el contrato público existente y no requiere DBR.

La evidencia de la revisión funcional y las pruebas de los criterios queda registrada en las tareas T-26 a T-28. [Resultados de web-004](../tasks/004-isometric-zoo-map.md)

## Zoom en los mapas 2D y 3D · 24 de noviembre de 2026

La persona solicitante pidió incorporar zoom a las dos vistas de esta misma feature. Esta enmienda recupera los controles de acercar, alejar y restablecer y los hace aplicables al plano y al modelo actuales.

- **CA-02 y CA-10.** El plano y el modelo disponen de controles accesibles de zoom, un porcentaje visible y la acción Restablecer. Cada vista abre al 100 % y conserva su propio nivel al alternar. Los controles indican sus límites. Al ampliar el plano se pueden recorrer sus bordes dentro del marco.
- **CA-07 y CA-11.** El zoom del modelo conserva la rotación y respeta el desplazamiento vertical de la página. Si el modelo está cargando se espera a que esté listo para ampliar. Si falla, vuelve a estar disponible el zoom del plano.

## Sustitución del plano 2D por SVG

Por solicitud expresa, CA-01 muestra el SVG mejorado suministrado, con su área de dibujo de 1600 × 1200.

## Marcadores públicos del plano

**CA-12.** A petición de la persona solicitante, los marcadores del plano 2D muestran el nombre y la posición publicados por la API. Cada uno se identifica por catálogo e ID. Los registros sin posición válida se conservan en el directorio.

## Modelo de Blender y arrastre del plano

Por solicitud expresa, **CA-13** incorpora zoo_3d(3).blend al visor y representa los nombres y coordenadas públicos en la escena. **CA-14** permite arrastrar el plano ampliado con el botón principal del mouse en ambos ejes.

## Exploración desde el directorio

**CA-15.** El visitante puede buscar por nombre, filtrar por tipo y localizar un resultado en la vista activa. Los registros sin coordenadas indican que su ubicación está pendiente.

## Inicio junto a Boletaje

**CA-16.** En ambos mapas del portal, Inicio aparece junto a Boletaje y el directorio permite localizarlo en esa misma posición.

## Visibilidad de los accesos

**CA-17.** Entrada y Boletaje tienen rótulos completos y separados, visibles sin interacción en los dos mapas incluso si el catálogo está vacío o falla.
