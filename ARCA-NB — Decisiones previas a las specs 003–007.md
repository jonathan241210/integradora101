# ARCA-NB — Decisiones previas a las specs 003–007

Oct 9, 2026 · @aksel

## Contexto

Antes de escribir la spec 003 hay que decidir dos cosas: cómo se identifica al visitante y cómo se instala la app en Android. Ambas condicionan el cliente de API, la privacidad y el build de la spec 007.

La spec 002 dejó un prototipo visual con datos mock. El objetivo ahora es que el público pueda usar la app, no necesariamente desde Play Store. Eso exige un build firmado (Expo Go solo sirve para desarrollo), un backend en producción y puntos validados en el servidor.

Los diseños ya suponen identidad: el perfil muestra nombre y avatar, pero la tabla de líderes queda fuera de esta versión: la app solo mostrará puntos y logros que se desbloquean.

Decisiones confirmadas el 12 de octubre de 2026:

* Solo Android, con cuenta de inicio de sesión (método por confirmar); no habrá versión para iPhone en esta versión.
* El responsable del backend y de la firma, y el build, se definen al final.
* Las fotos las sube el zoológico al catálogo web y la app usa esas mismas.
* La duplicación de React ya no existe.
* Hoy solo hay flujo entre pantallas y diseño, sin lógica detrás.
* El botón de favoritos existe pero está oculto hasta una spec posterior.
* Sin tabla de líderes ni premios: la app solo muestra puntos y logros que se desbloquean, y las misiones son contenido estático que no se actualiza.

## Decisión 1: identidad del visitante

Recomiendo la opción B, porque el equipo confirmó el 12 de octubre que habrá cuenta con inicio de sesión. El progreso se guarda en el servidor bajo la cuenta y sobrevive al cambiar de teléfono. Como los puntos no dan premios, no hace falta una validación antifraude sofisticada.

Con cuenta, el visitante entrega datos personales (al menos correo y nombre), así que hacen falta aviso de privacidad, recuperación de acceso y almacenamiento seguro de la sesión en el teléfono. Sin premios ni tabla de líderes, no se muestra nada a otros visitantes y el riesgo se limita a proteger esos datos. Las opciones A y C quedan descartadas, porque no ofrecen inicio de sesión.

||A. Sin cuenta, solo en el dispositivo|B. Cuenta obligatoria|C. Anónimo con ID de la API, cuenta opcional después|
|-|-|-|-|
|Cómo funciona|El progreso vive en el teléfono; la API no sabe quién es el visitante|Registro con correo u otro método antes de usar la app|La API emite un ID anónimo al primer uso; el progreso se guarda en el servidor bajo ese ID|
|Esfuerzo|Bajo|Alto (registro, recuperación de acceso, seguridad)|Medio|
|Fricción para el visitante|Ninguna|Alta: muchos no se registran en una visita corta|Ninguna al inicio|
|Progreso al cambiar o perder el teléfono|Se pierde|Se conserva|Se pierde, salvo que luego se vincule una cuenta|
|Puntos validados en servidor (importa solo si hay premios)|No: el cliente podría manipularlos|Sí|Sí|
|Datos personales|Ninguno|Correo, nombre|Ninguno, o solo un nombre opcional para el perfil|
|Privacidad|Riesgo mínimo|Requiere aviso y manejo de datos personales|Riesgo bajo; no se muestra nada a otros visitantes|

Impacto en la API y el cliente:

* **A** deja el progreso fuera de la API; es aceptable porque los puntos no dan premios y no hay tabla de líderes.
* **B** exige endpoints de registro, sesión y recuperación, además de almacenar credenciales de forma segura en el dispositivo.
* **C** exige un endpoint que emita el ID y un almacén seguro en el dispositivo; el cliente de API manda ese ID en cada petición.

La pantalla de perfil muestra nombre y avatar. Con la opción B el nombre sale de la cuenta; falta decidir si el avatar es elegible o fijo.

### Método de acceso (propuesta, por confirmar)

El equipo aún no decidió cómo se inicia sesión. Lo siguiente es solo una propuesta para decidir; nada de esto está confirmado.

||Google|Correo y contraseña|
|-|-|-|
|Contraseñas que el equipo debe guardar|Ninguna|Sí, con las medidas de la sección de seguridad|
|Esfuerzo de seguridad propio|Menor|Mayor: recuperación de acceso, verificación del correo y límite de intentos|
|Dependencias externas|Google (proyecto con credenciales OAuth)|Un servicio para enviar correos|
|Efecto en el build|Hay que registrar la huella del certificado de firma de la app, que se define al final; puede exigir un build de desarrollo en lugar de Expo Go|Ninguno|
|Visitantes que no pueden usarlo|Quien no tenga cuenta de Google|Casi ninguno|

Propuesta, por confirmar: Google como método principal, por el menor riesgo de seguridad, y correo y contraseña solo si el zoológico quiere que entren visitantes sin cuenta de Google. Como la firma del build se define al final, conviene revisar que no bloquee las pruebas de Google antes de comprometerlo.

## Decisión 2: canal de distribución Android

Recomiendo empezar con Play Store en pruebas (cerradas o abiertas) y mantener un APK de descarga directa como respaldo. Da instalación y actualizaciones normales sin exigir una publicación completa. Los requisitos actuales de Play Console deben verificarse antes de comprometer fechas, porque han cambiado para cuentas nuevas.

||APK por descarga directa|Distribución interna de EAS|Play Store en pruebas o producción|
|-|-|-|-|
|Instalación por el visitante|Descarga y permiso de “origen desconocido”|Enlace de instalación; mismo aviso de Android|Instalación normal desde la tienda|
|Confianza del visitante|Baja: advertencias del sistema|Baja a media|Alta|
|Actualizaciones|Manuales (el visitante descarga otro APK)|Manuales o por enlace|Automáticas desde la tienda|
|Esfuerzo inicial|Bajo|Bajo a medio|Medio a alto (cuenta de desarrollador, ficha, política de privacidad, revisión)|
|Alcance real|Cualquiera con el enlace|Cualquiera con el enlace|Descubrible en la tienda (en pruebas, solo quien tenga acceso)|
|Firma y claves|Hay que guardar la clave de firma|Gestionada por EAS o propia|Firma de la tienda, con respaldo de la clave de subida|

Impacto en la spec 007:

* Se necesita un build firmado en cualquiera de los tres casos; Expo Go no se puede entregar a los visitantes.
* Hay que fijar y respaldar la clave de firma desde el primer build público, porque cambiarla después rompe las actualizaciones.
* La estrategia de actualización (reinstalar o actualizar sin reinstalar) debe quedar decidida antes del primer build público.
* Una política o aviso de privacidad es necesario en Play Store y recomendable en los otros dos canales.

## Seguridad de la cuenta

Con cuenta hay datos personales y una sesión que proteger. Estas medidas son una propuesta para la spec 004a y aplican con cualquier método de acceso, salvo donde se indique.

* Todo el tráfico va por HTTPS; la app no acepta conexiones sin cifrar.
* La sesión se guarda en el almacenamiento seguro del teléfono, no en almacenamiento común. Para eso suele usarse expo-secure-store, que sería una dependencia nueva y debe aprobarse antes.
* Los tokens de acceso duran poco, y la renovación es algo que el servidor puede revocar al cerrar sesión.
* Correo y contraseña: el servidor guarda solo hashes con un algoritmo moderno (Argon2id o bcrypt), nunca la contraseña; limita los intentos de acceso; la recuperación usa un enlace o código de un solo uso que caduca; y se verifica el correo.
* Google: el servidor valida el token de identidad que recibe y nunca confía en lo que diga la app.
* La app no lleva claves ni secretos con privilegios, porque todo lo que va dentro del paquete puede extraerse.
* Los puntos y descubrimientos se registran en el servidor; el cliente solo los solicita. El servidor limita la frecuencia de escaneos y peticiones.
* No se escriben contraseñas ni tokens en los registros del servidor.
* El visitante puede cerrar sesión y pedir que se borren su cuenta y sus datos. El aviso de privacidad explica qué se guarda y por cuánto tiempo.
* El backend en producción tiene respaldos, entornos separados de prueba y producción, y secretos fuera del repositorio.

## Impacto en las specs 003 a 007

El orden recomendado es: tarea previa, 003, 004a, 004b, 005, 006 y 007. La 006 puede empezar en paralelo con la 004b si ya se eligió el proveedor de mapa.

|Orden|Spec|Alcance ajustado|Depende de|
|-|-|-|-|
|0|Tarea previa|Cerrar las dos decisiones de este documento|Ninguna|
|1|003 Integración con la API|Solo lectura: catálogo de animales y eventos con las fotos del catálogo web (por URL), caché, imagen de respaldo mientras cargan, estados de carga, error, sin conexión y lista vacía. Las misiones salen de esta spec porque tienen progreso por visitante|Decisión 1 (cabeceras y sesión del cliente de API)|
|2a|004a Cuenta e inicio de sesión|Cuenta con inicio de sesión (método por confirmar: Google o correo y contraseña), sesión segura y las medidas de la sección de seguridad|Decisión 1|
|2b|004b Progreso del visitante|Colección, puntos, logros y misiones guardados por cuenta en el servidor. Las misiones son contenido estático, definido una vez y sin actualizaciones posteriores. Sin tabla de líderes|004a|
|3|005 Escaneo QR|Cámara, permisos, validación del código en la API, código inválido, ya descubierto, y alternativa si se niega el permiso. Antes hay que definir qué codifica el QR y quién los imprime y coloca|004b; contrato de la API|
|4|006 Mapa y ubicación|Proveedor de mapa, datos del recinto, GPS con permiso y alternativa sin ubicación. Puede empezar con una versión simple|Decisión 2 (puede exigir un build de desarrollo en lugar de Expo Go)|
|5|007 Build y distribución|Build firmado, canal elegido, íconos y metadatos, privacidad, accesibilidad, pruebas en varios dispositivos y estrategia de actualización|Decisión 2|

Fuera del primer lanzamiento, salvo que sean requisito: recorrido 3D real e iOS. Los botones sin destino definido (notificaciones, configuración de la cuenta y pantalla de juego, esta última sin tabla de líderes) deben entrar en una de estas specs o esconderse antes de publicar. Favoritos ya está oculto y queda para una spec posterior.

