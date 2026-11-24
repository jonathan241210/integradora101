# 011 · loading-notices-and-animal-view

- App dueña: `pwa`
- Apps/paquetes afectados: `pwa`
- Estado: Implementada
- Solicitada: 2026-11-19
- Aprobada: 2026-11-19
- Aprobación funcional: Aprobada (confirmada por el solicitante en la conversación).

## Problema y objetivos

El personal veterinario necesita identificar cuándo una pantalla o una acción sigue en curso y leer con facilidad los avisos de la PWA. En el directorio, el control «Orden» comparte el bloque del buscador. La foto del perfil sirve para identificar al animal y actualmente se muestra en tamaño reducido.

## Actores y permisos

El personal veterinario usa el directorio, consulta perfiles y recibe avisos con los permisos vigentes. Los indicadores de carga también se aplican a las pantallas públicas de acceso cuando corresponde.

## Historias de usuario

- Como veterinario, quiero reconocer cuándo la PWA está cargando o guardando y distinguir el resultado de una operación.
- Como veterinario, quiero encontrar el control de orden en un lugar propio y ampliar la foto del animal desde su perfil.

## Criterios de aceptación

- **CA-01.** Al esperar la carga de sesión, datos, fotos o una acción como guardar o generar un PDF, los estados existentes usan indicadores visualmente coherentes y conservan un mensaje en español. La etiqueta sigue disponible para lectores de pantalla y el indicador respeta la preferencia de movimiento reducido.
- **CA-02.** Al recibir un aviso interno de sincronización, su contenido y variante se distinguen en móvil y escritorio. Se puede cerrar con teclado o toque y los lectores de pantalla lo anuncian. Se conservan los mensajes, disparadores y tiempos de los avisos vigentes.
- **CA-03.** En «Animales», el selector «Orden» aparece alineado a la derecha en una fila propia, entre el bloque de búsqueda y el listado. En una pantalla estrecha queda en esa misma posición del flujo y es operable al tacto. Mantiene las opciones actuales «Más recientes creados» y «Nombre (A-Z)» y su interacción con la búsqueda y la paginación.
- **CA-04.** Cuando la foto del perfil cargó correctamente, se puede pulsar, tocar o activar con teclado para verla ampliada, completa y ajustada al espacio visible. Se puede cerrar con un botón o con Escape y devolver el foco a la foto. La acción de cambiar foto sigue disponible por separado. Si falta la foto o falla la carga, la ampliación queda indisponible y se conserva la opción vigente para gestionar la imagen.

## Reglas de negocio

- **RN-01.** Los indicadores, avisos y ampliación son estados de presentación. La API conserva la autoridad sobre los datos y el resultado de las operaciones.
- **RN-02.** Se mantienen el comportamiento de sincronización y el aislamiento de avisos por sesión de `009-offline-first-sync`.
- **RN-03.** El alcance sobre el directorio y la foto se limita a la ubicación del control existente y la visualización ampliada. `010-animal-list-and-profile-photo` mantiene el alcance de paginación y gestión de fotos.

## Datos, privacidad y auditoría

Se reutiliza la foto que ya recibe el perfil y se conservan los permisos vigentes. La ampliación y los avisos son efímeros. El cambio es visual y no requiere DBR, cambios de contrato ni almacenamiento adicional.

## Flujos y errores

Cuando una carga termina, la pantalla presenta su contenido o el error y las acciones de recuperación que ya correspondan. La ampliación está disponible si la foto ya se pudo cargar, también durante una desconexión. Los avisos de sincronización se rigen por `009`.

## Fuera de alcance

- Web Push, correo, avisos del sistema e historial persistente.
- Cambios de API, orden de resultados, subida de archivos o datos clínicos.

## Dependencias, riesgos y preguntas

- Dependencias: comportamiento existente de `009`. Se usa el stack vigente.
- Riesgos por verificar: espacio de los avisos en pantallas pequeñas, foco de la foto ampliada y preferencia de movimiento reducido.

## Revisión

- El solicitante confirmó el alcance de los avisos internos y la ubicación propuesta del control «Orden».
- Implementación y verificaciones locales registradas en `apps/pwa/tasks/011-loading-notices-and-animal-view.md`. Queda pendiente enlazar el PR de entrega.
