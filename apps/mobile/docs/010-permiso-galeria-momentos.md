# Permiso de galería para «Mis momentos»

Spec `apps/mobile/specs/010-visitor-memory-requests.md`. Plan y tasks del mismo número. Selector autorizado por el ADR 0030 (Aceptado).

El título de la sección es «Mis momentos». El portal sigue llamando a la galería pública «Momentos para recordar».

## Cuándo se pide

La app pide el acceso a las fotos solo cuando el visitante pulsa «Elegir foto» en el formulario. Abrir Perfil o «Mis momentos» no pide el permiso. No se abre la cámara y no se recorre el álbum.

El texto del sistema está en `apps/mobile/app.json`, plugin `expo-image-picker`: «La app necesita acceder a tus fotos para que elijas la imagen de tu momento.»

## Si se niega

El formulario sigue en pantalla y muestra: «Para elegir la foto, permite el acceso a tus fotos en los ajustes del teléfono.» Sin archivo no hay envío.

## Después de enviar

Un aviso de momento abre `/memory-form` con ese id. Si la petición aún no está en memoria, la ruta pide la lista antes de decir que falta. Si después no está, la pantalla «Tu momento» ofrece «Ver mis momentos» o «Reintentar».

«Mis momentos» vuelve a pedir el estado al abrirse y cuando la app regresa a primer plano. Con una petición abierta no aparece «Enviar un momento». Al tocar esa petición se ve la opinión y el estado, sin campos ni botón de envío. La API no entrega la foto al visitante, así que la ficha no la muestra. El límite semanal dice «Podrás enviar otro momento a partir del…». La corrección de una rechazada pregunta «¿Seguro que quieres enviar la corrección?» y, al confirmar, regresa a esa lista.

## Casilla de consentimiento

El formulario muestra el texto de referencia de `api-010` RN-08. Ese texto no está aprobado por el zoológico. La app no se publica con él hasta que el zoológico lo redacte (`mobile-010` RN-07).
