# 003 · api-read-integration

- App dueña: `mobile`
- Apps/paquetes afectados: `mobile`, `packages/api-client`
- Estado: Aprobada
- Solicitante / responsable funcional: Víctor Adrián (redacción spec / responsable BD); Aksel (revisión móvil)
- Aprobación funcional: Víctor Adrián (2026-10-20). Enmienda de inicio (noticias, eventos e imágenes) confirmada con el plan el 2026-11-10.
- Equivalencia en el documento de decisiones previas: 003

## Enmienda 2026-11-10

El inicio deja de volcar la lista completa de eventos y pasa a mostrar una noticia y un evento, con despliegue hasta tres y salida avisada al portal. No hay spec nueva: esta enmienda reescribe el CA-03 y agrega CA-08, CA-09 y CA-10. La API no cambia. Las noticias salen de `GET /api/v1/news?limit=3` y `GET /api/v1/news/{id}`; los eventos, de `GET /api/v1/events?limit=3` y `GET /api/v1/events/{id}`. El orden lo decide la API: la noticia más nueva primero y el evento de inicio más próximo primero. La app no reordena.

## Problema y contexto

Actualmente, la aplicación móvil (`apps/mobile`) muestra el catálogo de animales, especies y eventos del zoológico utilizando datos estáticos simulados (mocks provenientes de `mobile-002`). Esto impide que los visitantes reciban información verídica, fotos actualizadas del catálogo del zoológico, avisos sobre nuevos eventos o detalles de recintos en tiempo real.

Esta especificación define la integración de lectura entre las pantallas de catálogo/eventos de la aplicación móvil y la API central Laravel (`apps/api`) mediante el paquete cliente tipado `@arca/api-client`. Se implementa una estrategia de caché *Stale-While-Revalidate* para permitir la visualización fluida y la continuidad operativa sin conexión (offline) ante la irregularidad de la señal móvil en el parque, con imágenes de respaldo y gestión estricta de estados visuales.

## Objetivos

- Conectar las pantallas de catálogo de animales y eventos con los endpoints públicos de la API mediante Repositorios desacoplados que consumen `@arca/api-client` (usando `createHttpClient`).
- Implementar estrategia de caché local persistente (*Stale-While-Revalidate*) con `AsyncStorage` y un tiempo de frescura (TTL) de 5 minutos para garantizar disponibilidad offline y carga instantánea.
- Proporcionar imágenes de respaldo (fallback/placeholder) mientras cargan los recursos remotos o cuando una imagen falle o no esté disponible.
- Mapear de forma transparente los identificadores de la API (`snake_case`) a los modelos de dominio de la app móvil (`camelCase`).
- Cubrir de forma completa los 5 estados de visualización en la UI: carga (`loading`), éxito (`success`), sin datos (`empty`), error de servicio/red (`error`) y modo sin conexión (`offline`).
- Garantizar que la arquitectura respete estrictamente MVVM sin llamadas directas a red en vistas o componentes, respaldado con pruebas automatizadas unitarias en Jest por cada criterio de aceptación.

## Fuera de alcance

- Registro, autenticación y sesión de visitantes (corresponde a `mobile-004` / `api-004`).
- Estado de descubrimiento y colección del visitante (`isDiscovered`, puntos, escaneo QR y progreso; corresponde a `mobile-005` y `mobile-006`). La UI de catálogo en esta spec trata los datos como catálogo zoológico general sin estado de progreso individual.
- Operaciones de escritura, mutaciones o sincronización de cola de eventos/escaneos (reservado para `mobile-005` y `mobile-006`).
- Mapa interactivo, rutas guiadas y geolocalización (reservado para `mobile-007`).
- Renderizado 3D de modelos animales o realidad aumentada (requiere ADR y spec específica).
- Implementación del backend Laravel o creación de sus controladores/migraciones (esta spec es de consumo del lado cliente móvil; la definición contractual de backend se asume como se especifica en dependencias).

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| **Visitante (Anónimo / Sin autenticar)** | Explorar la lista de especies y animales, ver fotos, consultar detalles biológicos y ver la agenda de eventos del zoológico. | Ninguno (endpoints públicos de solo lectura). |
| **Visitante (Autenticado)** | Consultar el mismo catálogo público y eventos mientras navega por el parque. | Ninguno adicional para esta spec (usa las mismas rutas públicas). |

## Historias de usuario

- **HU-01 (Catálogo de animales):** Como visitante del zoológico, quiero ver el listado de especies y animales con sus fotos y nombres comunes para identificar los animales que puedo conocer durante mi recorrido.
- **HU-02 (Detalle del animal):** Como visitante, quiero abrir la ficha individual de un animal o especie para conocer su nombre científico, categoría, zona, dieta, curiosidades y datos de interés.
- **HU-03 (Agenda de eventos):** Como visitante, quiero ver en el inicio el próximo evento y, si quiero, hasta tres, para organizar la visita sin salir de la app; y quiero un aviso claro antes de abrir el listado completo en el portal.
- **HU-04 (Detalle de evento):** Como visitante, quiero tocar un evento para ver su descripción extendida, horario exacto y fotografías del evento.
- **HU-06 (Noticias actuales):** Como visitante, quiero ver en el inicio la noticia más reciente, abrir su detalle en la app y, si lo pido, salir avisado hacia el portal para ver todas.
- **HU-05 (Consulta sin conexión):** Como visitante en una zona del zoológico sin cobertura móvil, quiero que la app siga mostrándome el catálogo y los eventos previamente consultados para no perder acceso a la guía del parque.

## Criterios de aceptación

- **CA-01 (Listado de animales desde API):** Dado que la app móvil cuenta con conexión a red, cuando el visitante accede a la pantalla de catálogo de animales, entonces la app consulta `GET /species` mediante `AnimalRepository` y `@arca/api-client`, mapea los datos de `snake_case` a `camelCase` y muestra las especies con sus fotografías por URL y nombres correspondientes.
- **CA-02 (Detalle de animal desde API):** Dado un animal o especie seleccionado con identificador válido, cuando el visitante entra a su vista de detalle, entonces la app consulta `GET /species/{id}` mostrando la ficha completa (nombre común, nombre científico, zona, categoría, estadísticas, dieta y curiosidades) o un estado de recurso no encontrado si el ID no existe.
- **CA-03 (Eventos del inicio):** Dado el inicio con la API disponible, cuando carga la sección «Próximos eventos», entonces consulta `GET /events?limit=3` y muestra solo el primero, en el orden de la API, con su imagen si hay una URL usable (CA-10). Si hay más de uno, «Ver más» despliega hasta tres en la misma pantalla y no vuelve a pedir la lista. «Ver menos» vuelve a dejar solo el primero. «En el portal» muestra el aviso de que se va a salir de la app hacia el portal del zoológico; al aceptar, abre `{EXPO_PUBLIC_PORTAL_URL}/eventos.html`. Sin esa variable, en desarrollo el respaldo es `http://localhost:8080`; fuera de desarrollo el aviso dice que no hay dirección configurada y no abre nada. Al pulsar un evento se consulta `GET /events/{id}` y se muestra su detalle (título, descripción, fecha, horario, ubicación e imágenes) dentro de la app.
- **CA-08 (Noticias actuales):** Dado el inicio, cuando carga, entonces la sección se titula «Noticias actuales», consulta `GET /news?limit=3` y muestra solo la primera, con su imagen si hay una URL usable (CA-10). «Ver más» y «Ver todos» se comportan como en CA-03, y «Ver todos» abre `{portal}/noticias.html`. Si la lista llega vacía, no hay tarjetas. El orden de la pantalla es: animales favoritos, noticias actuales y próximos eventos.
- **CA-09 (Detalle de noticia):** Dada una noticia del inicio, cuando el visitante la toca, entonces la app consulta `GET /news/{id}` y muestra en una pantalla propia el título, la fecha, la imagen y el `content`. No abre el portal. Si la noticia no existe, muestra que no se encontró.
- **CA-10 (Imagen usable):** Dada una noticia o un evento, cuando se pinta su foto, entonces se usa `image_url` si es `http` o `https`; si no lo es y `image_path` es `http` o `https`, se usa esa. Una ruta `news/…` o `events/…` (por ejemplo `events/archivo.jpg`) se abre como `{origen}/storage/` más esa ruta, con el origen de `EXPO_PUBLIC_API_URL`. Si el host es `localhost` o `127.0.0.1`, se sustituye por ese mismo origen. Sin origen no se inventa una dirección y se muestra el respaldo de CA-06. No se altera la API para publicar un enlace externo dentro de `image_url`. Al volver al inicio, las fotos ya mostradas no se desmontan para volver a pedirlas.
- **CA-12 (Misiones en el inicio):** Dado el inicio, cuando el visitante toca «Misiones», entonces en la misma pantalla aparecen las misiones y deja de verse el zoológico del inicio. No hace falta deslizar. Al tocar «Inicio», vuelven los animales, las noticias y los eventos. El título activo lleva una línea del color primario. La frase «Completa misiones y acumula puntos de exploración.» usa el mismo margen lateral que las tarjetas. La tarjeta «Tu próxima aventura te espera» no se muestra entre las noticias y los eventos.
- **CA-11 (Actualizar noticias y eventos):** Dado el inicio ya cargado, cuando el visitante desliza la pantalla hacia abajo, entonces la app vuelve a pedir `GET /news?limit=3` y `GET /events?limit=3` aunque la caché tenga menos de 5 minutos, y sustituye solo esas dos listas. No vuelve a pedir animales ni el progreso. Si la petición falla, siguen visibles las listas anteriores. El indicador usa el color primario del tema.
- **CA-04 (Gestión de los 5 estados de UI):** Dada cualquier pantalla de catálogo o eventos, cuando se realiza la consulta de datos:
  - Mientras la promesa esté pendiente, muestra esqueletos o indicadores de carga (`loading`).
  - Si la API responde con una lista vacía, muestra el mensaje amigable en español correspondiente (`empty`).
  - Si ocurre un error de red o de servidor (códigos HTTP 4xx/5xx o timeout) sin datos previos en caché, muestra el mensaje de error en español y un botón accesible para reintentar (`error`).
  - Si la petición es exitosa, presenta el contenido en pantalla (`success`).
  - Si no hay red pero existen datos cacheados, muestra los datos y un indicador visible de "Modo sin conexión" (`offline`).
- **CA-05 (Caché Stale-While-Revalidate y TTL de 5 minutos):** Dado que existen datos previamente guardados en `AsyncStorage`:
  - Si la última sincronización ocurrió hace menos de 5 minutos (TTL fresco), la app sirve inmediatamente los datos locales sin bloquear la interfaz.
  - Si han transcurrido más de 5 minutos (datos *stale*), la app muestra los datos locales de inmediato y lanza en segundo plano una revalidación contra la API para actualizar la caché local y refrescar la vista al completarse.
  - Si la revalidación en segundo plano falla por desconexión, los datos cacheados permanecen visibles sin interrumpir al usuario.
- **CA-06 (Imágenes con respaldo y tolerancia a fallos):** Dada una imagen de animal o evento cargada por URL remota, cuando la imagen está descargando o si la URL es inválida/inaccesible, entonces el componente visual muestra un placeholder accesible o tinte de respaldo predeterminado sin romper el layout.
- **CA-07 (Arquitectura MVVM y cobertura de pruebas Jest):** Dado el repositorio de pruebas en `apps/mobile`, cuando se ejecute la suite de Jest (`npm test -- --runInBand`), entonces:
  - Ninguna vista (`screens/`) ni componente (`components/`) importa directamente `fetch`, `axios` o `@arca/api-client`.
  - Existe al menos una prueba unitaria automatizada que cita explícitamente cada criterio (`CA-01`, `CA-02`, `CA-03`, `CA-04`, `CA-05`, `CA-06`, `CA-08`, `CA-09`, `CA-10`, `CA-11`, `CA-12`).

## Reglas de negocio

- **RN-01 (Patrón arquitectónico estricto):** Toda interacción con la API se realiza a través de `AnimalRepository` y `ZooRepository` utilizando instancias configuradas con `createHttpClient` de `@arca/api-client`. Está prohibido el uso directo de APIs de red en componentes visuales.
- **RN-02 (Transformación de atributos):** Los datos devueltos por la API en formato `snake_case` (ej. `scientific_name`, `image_url`, `fun_fact`) deben ser transformados en la capa del repositorio a `camelCase` (ej. `scientificName`, `imageUrl`, `funFact`) antes de exponerse a los ViewModels.
- **RN-03 (Política de frescura de caché):** La caché en `AsyncStorage` tiene una ventana de frescura de 5 minutos (300 segundos). El almacenamiento guarda la estampa de tiempo (`timestamp`) junto al payload. Pasado este tiempo, se aplica revalidación en segundo plano. En el inicio, deslizar hacia abajo vuelve a pedir noticias y eventos aunque esa ventana no haya vencido (CA-11).
- **RN-04 (Degradación elegante ante fallos):** Si la API no está disponible o el dispositivo no tiene red:
  - Con caché existente: Se muestran los datos locales acompañados del estado `offline`.
  - Sin caché existente: Se muestra el estado `error` con acción de reintento. Bajo ninguna circunstancia la aplicación debe quedar en pantalla blanca o crashear.
- **RN-05 (Exclusión de progreso de visitante):** Las propiedades asociadas al progreso personal (tales como `isDiscovered` o puntos) no se consultan ni se alteran en esta spec. El modelo de UI de catálogo presenta los datos puramente zoológicos y educativos de la especie.
- **RN-06 (Textos y localización):** Todos los mensajes informativos, estados vacíos, alertas de error y etiquetas de accesibilidad deben estar redactados en español claro.
- **RN-07 (Inicio acotado):** El inicio no muestra más de tres noticias ni más de tres eventos. «Ver todos» no lista el resto dentro de la app: advierte y abre el portal. El detalle de una noticia o un evento sí permanece en la app.
- **RN-08 (Foto usable):** Al componente de imagen solo llega una URL `http` o `https`. Una ruta `news/` o `events/` se convierte en la URL pública de almacenamiento. El host local se reescribe al origen de la API configurada en la app. Un enlace externo que la API deja solo en `image_path` sí se muestra. Una recarga del inicio no vuelve a montar las fotos que ya están en pantalla.
- **RN-09 (Actualización del inicio):** Deslizar el inicio hacia abajo solo sustituye noticias y eventos. No vuelve a consultar animales ni el progreso del visitante. Si esa petición falla, se quedan las listas que ya estaban en pantalla. El indicador y las secciones usan los colores del tema (`primary`, `secondary`, `accent`, `surface`); no se introducen colores nuevos.

## Datos, privacidad y auditoría

- **Datos consultados:**
  - Especies / Animales: identificador (`id`), nombre común (`name`), nombre científico (`scientific_name`), categoría (`category`), zona de recinto (`zone`), URL de imagen (`image_url`), estadísticas (`stats`), dieta (`diet`), curiosidades (`curiosities`), dato curioso (`fun_fact`).
  - Eventos: identificador (`id`), título (`title`), descripción (`description`), fecha (`date`), horario (`time`), ubicación (`location`), foto usable tomada de `image_url` o, si esa no es `http`/`https`, de `image_path` cuando sí lo es.
  - Noticias: identificador (`id`), título (`title`), descripción (`description`), fecha (`published_date`), categoría (`category`), foto usable (`image_url`) y, solo en el detalle, contenido (`content`).
- **Privacidad y datos personales:** Esta spec maneja exclusivamente información pública institucional del zoológico. No recopila, almacena ni transmite identificadores de dispositivo, cookies de rastreo ni datos personales de los visitantes.
- **Seguridad y tokens:** Los endpoints consumidos son de acceso público; no se envían tokens de autenticación Bearer para estas consultas.
- **Impacto en base de datos:** Ninguno del lado del cliente móvil. No requiere solicitud DBR en esta spec (las tablas `species`, `animals`, `enclosures` y `events` ya existen y fueron estandarizadas en DBR-001 y DBR-004).

## Flujos y errores

```mermaid
flowchart TD
    Start([Usuario abre Catálogo o Eventos]) --> CheckCache{¿Existen datos en caché local?}
    
    CheckCache -- Sí --> CheckTTL{¿Datos tienen menos de 5 min?}
    CheckCache -- No --> FetchAPI[Consultar API vía Repositorio]
    
    CheckTTL -- Sí (Fresco) --> RenderSuccess[Mostrar datos inmediatamente]
    CheckTTL -- No (Stale) --> RenderCached[Mostrar datos cacheados]
    RenderCached --> BackgroundFetch[Revalidar con API en 2º plano]
    
    BackgroundFetch --> NetOk{¿Respuesta exitosa?}
    NetOk -- Sí --> UpdateCache[Actualizar AsyncStorage y UI]
    NetOk -- No --> ShowOfflineBanner[Mantener datos y mostrar estado Offline]
    
    FetchAPI --> ResponseCheck{¿Resultado API?}
    ResponseCheck -- 200 con datos --> SaveCache[Guardar en AsyncStorage] --> RenderSuccess
    ResponseCheck -- 200 lista vacía --> RenderEmpty[Mostrar estado Vacío]
    ResponseCheck -- Error de red / 5xx --> RenderError[Mostrar estado Error con Reintentar]
```

### Casos de error y contingencias:
1. **Dispositivo sin red y sin caché previa:** La vista entra en estado `error`, mostrando el mensaje: *"No fue posible conectar con el zoológico. Revisa tu conexión a internet e intenta nuevamente"* con botón `Reintentar`.
2. **Dispositivo sin red pero con datos en caché:** La vista entra en estado `offline`, mostrando el catálogo guardado y una pastilla informativa: *"Modo sin conexión. Mostrando información guardada"*.
3. **Fallo en carga de imagen individual:** La imagen muestra el componente de fallback con el color temático asignado (`placeholderTint`) y no bloquea el resto del catálogo.
4. **Recurso no encontrado (`404` en detalle):** Si se consulta un animal o evento inexistente, se muestra el estado de error: *"El elemento solicitado no fue encontrado"* y un botón para volver al catálogo.

## Dependencias, riesgos y preguntas

- **Dependencias:**
  - `packages/api-client`: exportación y funcionamiento de `createHttpClient` y tipos `HttpClient`.
  - Contrato de API pública asumido según `apps/mobile/docs/estandares-integracion-api.md`:
    - `GET /api/v1/species`
    - `GET /api/v1/species/{id}`
    - `GET /api/v1/events?limit=3`
    - `GET /api/v1/events/{id}`
    - `GET /api/v1/news?limit=3`
    - `GET /api/v1/news/{id}`
  - Persistencia local: `@react-native-async-storage/async-storage`.
  - Pantallas base de UI de la spec `mobile-002`.
- **Riesgos:**
  - Si el backend de Laravel demora en desplegar formalmente los endpoints públicos (`/species`, `/events`), la implementación móvil dependerá temporalmente de mocks o interceptores de prueba. No obstante, al respetar la interfaz del repositorio, el cambio es instantáneo vía variable de entorno (`EXPO_PUBLIC_USE_MOCKS=false`).
  - Imágenes pesadas servidas por el catálogo web podrían saturar la memoria o tardar en redes celulares 3G/4G del parque. Se mitigará usando componentes optimizados con fallback.
- **Preguntas resueltas:**
  - *¿Cómo se aborda la falta de spec previa en API?* Se redacta la spec cliente asumiendo las rutas estándar documentadas en `estandares-integracion-api.md`.
  - *¿Política de caché?* Stale-While-Revalidate con TTL de 5 minutos en `AsyncStorage`.
  - *¿Alcance de `isDiscovered`?* Excluido; pertenece al progreso del visitante (`mobile-005`).
  - *¿Detalle de eventos?* Incluido formalmente junto con el listado.

## Revisión

- **Aprobadores y fecha:** Aprobada por Víctor Adrián (2026-10-20). Revisión móvil técnica coordinada con Aksel. Enmienda de inicio confirmada con el plan el 2026-11-10: reescribe CA-03 y agrega CA-08, CA-09 y CA-10. El 2026-11-10 se agrega CA-11: deslizar el inicio actualiza solo noticias y eventos. No cubre la petición de fotos del visitante (`mobile-010`).
- **Evidencia/enlaces:**
  - `apps/mobile/docs/estandares-integracion-api.md`
  - `apps/mobile/specs/002-mobile-ui-base-visitor-journey.md`
  - `docs/adr/0004-mobile-react-native.md`
  - `docs/adr/0011-visitor-identity-and-mobile-session.md`
