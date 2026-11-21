# 014 · visitor-favorite-species

- App dueña: `mobile`
- Apps/paquetes afectados: `mobile` (corazón, inicio «Animales favoritos», copia local y cierre de sesión); `packages/api-client` (métodos y tipos, sin lógica de negocio); `api` (lista y reglas, spec `api-018`).
- Estado: En progreso
- Solicitante / responsable funcional: Aksel
- Aprobación funcional: Aksel, 2026-11-14
- Dependencias de contrato: `api-018` y DBR-018 (Lista para backend). El plan y las tasks están aprobados (Aksel, 2026-11-16). Aksel confirmó el 2026-11-20 la verificación y el pull (T-16).
- El plan y las tasks están aprobados (Aksel, 2026-11-16). La verificación y el pull quedaron confirmados el 2026-11-20. Esta nota no cambia el estado a Implementada: la definición de hecho de la spec sigue siendo la que cierra ese paso.

## Problema y contexto

`mobile-002` CA-16 guarda el corazón en el teléfono (`visitor.favorite-animal-ids`) y no lo envía al servidor. Esa lista se pierde al cambiar de teléfono y se queda en el aparato si entra otra cuenta.

El id de la ficha es el de la especie publicada (`mapSpeciesToAnimalModel`). Esta spec hace que la cuenta sea la lista de verdad. El teléfono guarda la última respuesta solo para poder mostrarla sin red.

## Objetivos

- Pintar el corazón y «Animales favoritos» del inicio con la lista de la cuenta.
- Subir una sola vez los id numéricos que ya estaban en el teléfono, si el servidor aún no tiene favoritos.
- Al cerrar sesión, borrar la copia local.
- Sin red, mostrar la última copia y no cambiar el corazón.
- Conservar la animación del corazón y dejar Colección sin filtro de favoritos.

## Fuera de alcance

- Decidir qué especie es visible o borrar filas de otra cuenta. Eso es `api-018`.
- Filtro de favoritos en Colección.
- Marcar ejemplares de `animals`.
- Cola de cambios sin red. El toque sin red no se guarda para después.
- Plan técnico y tasks.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante con sesión y correo verificado | Marcar, quitar y ver sus favoritos en este teléfono y en otro | Sesión de `mobile-004` |
| Visitante sin sesión | No envía la lista al servidor | — |

## Historias de usuario

- Como visitante, quiero el mismo corazón en otro teléfono al entrar con mi cuenta.
- Como visitante, quiero que al salir de la cuenta este teléfono olvide mis favoritos.
- Como visitante, quiero seguir viendo la última lista si me quedo sin red, sin marcar otra especie hasta volver a tenerla.

## Criterios de aceptación

- **CA-01 (corazón con la cuenta):** Dada una sesión y un GET con los id `3` y `8`, cuando se abre la ficha de la especie `3`, entonces el corazón sale relleno. En la ficha de una especie que no está en la lista, sale en contorno. Tocarlo con red llama al PUT de `api-018` (`favorite: true` o `false`) y el corazón queda como confirme la API, con la misma animación breve de `mobile-002` CA-16.
- **CA-02 (inicio):** Dado el inicio con sesión, cuando la lista de la cuenta tiene especies del catálogo, entonces el título sigue siendo «Animales favoritos» y solo muestra esas. Si la lista llega vacía, la sección queda vacía. Colección no gana un filtro de favoritos.
- **CA-03 (subida única):** Dado el teléfono con `visitor.favorite-animal-ids` igual a `["4","juan","8"]` y un GET vacío, cuando la app tiene sesión, entonces envía `favorite: true` solo para `4` y `8`. No envía `juan`. Después de una respuesta 200 de cada uno, borra esos id de la lista local antigua y pinta el GET. Si el GET ya trae filas, no sube la lista del teléfono. Un 404 de un id se omite y se sigue con el siguiente.
- **CA-04 (cierre de sesión):** Dada una copia local de la lista, cuando la persona cierra sesión o borra la cuenta (`mobile-004`), entonces la app borra `visitor.favorite-animal-ids` y la copia de la última respuesta. La siguiente cuenta no ve esos corazones hasta leer su propio GET.
- **CA-05 (sin red):** Dada una copia de la última lista y sin red, cuando se abre el inicio o una ficha, entonces se ven esos corazones. Al tocar el corazón, no cambia y se muestra «Sin conexión.». No se llama al PUT.
- **CA-06 (error del PUT):** Dado un PUT que falla con red, cuando responde, entonces el corazón vuelve al estado anterior y se muestra el mensaje de la API, o «No se pudo guardar el favorito.» si no hay mensaje.
- **CA-07 (presentación):** Dado el código nuevo, cuando se revisa, entonces las pantallas no llaman a `fetch` ni al cliente. El ViewModel usa `@arca/api-client`. La app no decide si una especie es visible.
- **CA-08 (cobertura):** Dada la suite de Jest con cliente simulado, cuando se ejecuta, entonces hay al menos una prueba que nombra cada CA-01 a CA-07.

## Reglas de negocio

- **RN-01 (el servidor manda):** Tras el GET o un PUT exitoso, la copia local se reemplaza con lo que devolvió la API. La clave antigua deja de ser la lista de verdad.
- **RN-02 (una subida):** La subida de CA-03 ocurre solo cuando el GET llega vacío y el teléfono aún tiene id numéricos. No se repite en el siguiente arranque.
- **RN-03 (id numérico):** Solo se sube un id formado por dígitos. Los de demostración se ignoran.
- **RN-04 (sesión):** Sin sesión no hay PUT ni GET. El corazón de la ficha sin sesión no escribe en el servidor.
- **RN-05 (copia y salida):** La copia local existe para pintar sin red (CA-05). Cerrar sesión o borrar la cuenta la elimina (CA-04).
- **RN-06 (MVVM):** Vistas en pantallas, estado en el hook de favoritos, datos por `@arca/api-client`.
- **RN-07 (Colección):** No se añade filtro ni sección de favoritos en Colección.

## Datos, privacidad y auditoría

- La app envía el id de especie y `favorite`. No envía nombre ni correo en esa llamada.
- La copia local son id de especie de la última respuesta, en el teléfono, y se borra al salir de la cuenta.
- No requiere DBR propia. La DBR es `docs/database/requests/DBR-018-visitor-favorite-species.md`.
- El aviso de privacidad oficial, antes del público, debe decir que los favoritos se guardan en la cuenta. Esta spec no redacta ese texto.

## Flujos y errores

1. Con sesión, la app pide el GET. Si viene vacío y hay id numéricos locales, hace la subida de CA-03.
2. El corazón con red hace PUT y sustituye la copia.
3. Sin red, muestra la copia y el toque dice «Sin conexión.».
4. Cerrar sesión borra la copia y sigue el flujo de `mobile-004`.
5. 401 cierra la sesión como el resto de la app (`mobile-004` CA-06).

## Dependencias, riesgos y preguntas

- Dependencias: `api-018`. No hay dependencia nueva. El ADR 0014 conserva el cache de catálogo y deja la lista de favoritos en la cuenta, con la última respuesta en el teléfono para mostrarla sin red. El plan y las tasks están aprobados. Aksel confirmó la verificación y el pull el 2026-11-20.
- Riesgos: si la subida única falla a medias, el siguiente arranque con GET vacío vuelve a intentar los id que sigan en la clave antigua. Un id de demostración no se sube.
- Preguntas pendientes: ninguna. BD y backend aceptaron la tabla sin SoftDeletes en DBR-018 el 2026-11-14. El plan y las tasks están aprobados (Aksel, 2026-11-16). La verificación y el pull quedaron confirmados el 2026-11-20.

## Revisión

- Aprobación funcional: Aksel, 2026-11-14. Alcance, CA y RN de la app.
- Evidencia/enlaces: `apps/api/specs/018-visitor-favorite-species.md`, `docs/database/requests/DBR-018-visitor-favorite-species.md`, `apps/mobile/specs/002-mobile-ui-base-visitor-journey.md` (CA-16), `apps/mobile/src/repositories/favoriteAnimals.ts`, `docs/adr/0014-mobile-offline-cache-and-connectivity.md`.
