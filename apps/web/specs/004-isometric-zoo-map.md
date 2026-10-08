# 004 · isometric-zoo-map

- App dueña: `web`
- Apps/paquetes afectados: `apps/web`
- Estado: En progreso
- Solicitante / responsable funcional: Solicitante de esta conversación; nombre por identificar
- Aprobación funcional: Solicitante, 2026-10-08 (aprobación en esta conversación)

## Problema y contexto

La sección actual del mapa es un esquema de zonas con formas simples y una lista de servicios identificada principalmente con emojis. La persona solicitante quiere un mapa con presentación visual en perspectiva 3D, similar en composición a una vista aérea, además de iconos claros para reconocer zonas y servicios.

La persona solicitante confirmó que acepta una ilustración aproximada hecha con código, sin proveedor externo ni fotografía satelital, y que deben conservarse las zonas y servicios existentes. También eligió SVG incluidos directamente en el portal con una estética similar a Bootstrap Icons, sin instalar la biblioteca Bootstrap Icons ni otras dependencias. El mapa será demostrativo y no describirá con exactitud la distribución real del zoológico.

## Objetivos

- Presentar las zonas actuales como una ilustración de mapa en perspectiva isométrica/3D, con senderos y elementos visuales del recinto creados dentro del portal.
- Identificar visualmente cada zona y servicio del mapa con iconos SVG propios, consistentes y accesibles.
- Conservar la selección de zonas y servicios y el anuncio de selección existente.
- Adaptar el mapa a móvil, mantener controles operables por teclado y evitar desbordamiento horizontal.
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

- **CA-01:** Dado el mapa del zoológico, cuando se renderice la sección, entonces mostrará una ilustración original hecha con HTML/SVG/CSS en perspectiva isométrica o visualmente elevada, con senderos y zonas del mapa actual; no cargará mosaicos, imágenes satelitales, mapas ni scripts de proveedores externos.
- **CA-02:** Dadas las zonas y servicios ya presentes, cuando se inspeccionen el mapa y su leyenda, entonces Felinos, Aviario, Reptilario, Primates, Granja, Lago, Entrada, Baños, Alimentos, Bebederos, Áreas de descanso, Enfermería y Tiendas seguirán disponibles y cada elemento tendrá un icono SVG con nombre accesible o texto visible asociado.
- **CA-03:** Dado que el mapa es aproximado, cuando una persona visitante lo consulte, entonces encontrará un aviso visible y accesible indicando que es ilustrativo, no está a escala y no sirve para orientación precisa dentro del recinto.
- **CA-04:** Dado que el visitante activa una zona o servicio por clic, toque o teclado, cuando el mapa reciba la selección, entonces anunciará el elemento seleccionado mediante la región viva existente y resaltará su marcador correspondiente sin perder foco de forma inesperada.
- **CA-05:** Dado el mapa en anchos de 360, 390, 768, 1024 y 1366 px, cuando se visualice y opere, entonces la ilustración y sus controles permanecerán dentro de la sección, no causarán desbordamiento horizontal y seguirán siendo legibles y alcanzables por teclado.
- **CA-06:** Dada la suite ejecutada mediante `node --test apps/web/src/tests/relocation.test.mjs`, cuando finalice, entonces contendrá tests nombrados para CA-01..CA-06, verificará estructura, iconos SVG, accesibilidad, interacción y ausencia de proveedores/dependencias nuevos.

## Reglas de negocio

- **RN-01:** El mapa es una ilustración demostrativa aproximada y no una fuente de datos geográficos u operativos.
- **RN-02:** Se conservan las zonas y servicios actuales; no se agregan POI que pudieran presentarse como existentes sin validación funcional.
- **RN-03:** Los iconos se dibujan como SVG locales propios, con estilo visual similar a iconografía lineal de Bootstrap; no se incorpora ni se carga Bootstrap Icons.
- **RN-04:** La selección de elementos se limita a interacción de interfaz y no requiere API, geolocalización, almacenamiento ni cálculo de rutas.
- **RN-05:** Los botones y sus iconos mantienen nombre accesible, foco visible y uso por teclado; el SVG decorativo no duplica el anuncio del texto.

## Datos, privacidad y auditoría

No se crean, consultan ni modifican datos. No se utiliza ubicación del dispositivo ni se solicitan permisos. No se usa información personal, clínica o financiera; no se accede a la API ni a `settings_colores`.

## Flujos y errores

1. El navegador carga la ilustración vectorial local y los servicios existentes.
2. Si se activa una zona dibujada en el mapa o un elemento de la leyenda, el portal actualiza el estado de selección y anuncia el nombre mediante la región viva.
3. La ilustración escala dentro de su contenedor en pantallas estrechas; los controles conservan un tamaño de interacción usable y foco visible.
4. Si SVG/CSS visual no se muestran como se espera, el nombre visible de cada botón y su función de selección siguen disponibles como alternativa.
5. No hay dependencias de red para el mapa ni un estado de error por caída de proveedor.

## Dependencias, riesgos y preguntas

- Dependencias/ADR: no se agregan dependencias ni se requiere ADR para dibujar SVG local con HTML/CSS existentes.
- Riesgos: el resultado puede parecerse en perspectiva a un mapa aéreo, pero no puede ofrecer el realismo de una fotografía satelital; se mitiga con la etiqueta demostrativa y la exclusión explícita de navegación precisa.
- Riesgos: iconos sin texto alternativo pueden ser ambiguos; se mitiga conservando nombres visibles y marcando los SVG como decorativos cuando el texto asociado ya etiqueta el control.
- Preguntas pendientes: aprobación funcional de esta spec.

## Revisión

- Aprobadores y fecha: Solicitante, 2026-10-08 (alcance aprobado en esta conversación).
- Evidencia/enlaces: Alcance conversado el 2026-10-08; falta aprobación del documento completo. La spec `003-lion-hero-mobile-navigation` cubre separadamente el cambio del hero y menú adaptable.
