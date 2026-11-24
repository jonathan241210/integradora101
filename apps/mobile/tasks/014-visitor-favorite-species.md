# Tareas · 014 · visitor-favorite-species

- Spec: `apps/mobile/specs/014-visitor-favorite-species.md` (Aprobada)
- Plan: `apps/mobile/plan/014-visitor-favorite-species.md` (Aprobado técnicamente)
- Depende de: `apps/api/tasks/018-visitor-favorite-species.md` y de DBR-018 en `Lista para backend`
- Estado del checklist: **Aprobado**. Autoriza el código de estas tareas. No autoriza un PR. La app no empieza hasta que `api-018` tenga los dos métodos y la suite en verde.
- Solicitada: 2026-11-14
- Aprobada: 2026-11-14

Ninguna tarea añade alcance. Las pantallas no importan `@arca/api-client` ni `fetch`. El cliente, el almacén y `isOffline` se simulan en Jest. No se instala ninguna dependencia. No se toca el cache de catálogo, noticias, eventos ni imágenes (`apiAnimalRepository`, `apiZooRepository`, `mediaImageCache`). Colección no gana filtro. No se redacta el aviso de privacidad oficial.

## Puerta

- [x] **T-01** (precondición de CA-01 a CA-08): el contrato de la API está implementado.
  - Depende de: tasks de `api-018` aprobadas y hechas, en especial T-05 (métodos en `packages/api-client/visitor.ts`) y T-15 (suite verde).
  - Archivos: ninguno en esta tarea.
  - Hecho cuando: `listFavoriteSpecies` y `updateFavoriteSpecies` existen en el paquete. Si faltan, detenerse.

## Implementación

- [x] **T-02** (CA-04, CA-05; RN-01, RN-05): las dos claves dejan de ser la lista de verdad.
  - Depende de: T-01. Solo se ejecuta cuando este checklist esté aprobado.
  - Archivo: `apps/mobile/src/repositories/favoriteAnimals.ts`.
  - Cambios: desaparece el `toggle` que escribía `visitor.favorite-animal-ids` como autoridad. La clave vieja solo se lee para la subida y se borra cuando el plan lo dice. `visitor.favorite-species-ids` guarda la última lista confirmada, como JSON de id en cadena. Hay una función que borra las dos claves y publica la lista vacía.
  - Hecho cuando: T-10 y T-11 pasan.

- [x] **T-03** (CA-01, CA-03, CA-05, CA-06; RN-01, RN-02, RN-03, RN-04, RN-06): el hook habla con la cuenta.
  - Depende de: T-02.
  - Archivo: `apps/mobile/src/viewmodels/useFavoriteAnimals.ts`.
  - Cambios: recibe el cliente o `null`, el almacén e `isOffline`. Los id que publica son cadenas. Sin sesión el corazón queda en contorno, el toque no llama al PUT y no escribe ninguna clave. Con sesión y red pide el GET. Si `data` trae filas, reemplaza la copia, borra la clave vieja y no sube. Si llega vacío, sube solo los id de dígitos de `["4","juan","8"]` (no envía `juan`). Cada `200` quita ese id de la clave vieja y deja la copia en el cuerpo del PUT. Un `404` se omite, ese id permanece y se sigue con el siguiente. Otro fallo corta la pasada y conserva lo que aún no se envió. Al terminar sin corte, un GET de cierre pinta la lista; si ese GET falla, queda el cuerpo del último `200`. El toque con red espera el PUT y entonces cambia el corazón, con la animación que ya dispara `active` en `FavoriteHeartButton`. Un segundo toque durante el PUT se ignora. Si el PUT falla con red, el corazón no cambia y el texto es el `message` de la API, o «No se pudo guardar el favorito.» si no hay. Un `401` no muestra ese texto: borra las dos claves. Sin red, o con estado `0`, se ve la copia, el toque no llama al PUT y el texto es «Sin conexión.». El hook no decide si una especie es visible.
  - Hecho cuando: T-07, T-09, T-11 y T-12 pasan.

- [x] **T-04** (CA-01, CA-02; RN-06, RN-07): inicio y ficha.
  - Depende de: T-03.
  - Archivos: `apps/mobile/src/app/(tabs)/index.tsx`, `apps/mobile/src/app/animal/[id].tsx`. `HomeScreen` y `AnimalDetailScreen` siguen recibiendo props.
  - Cambios: la ruta pasa al hook el cliente de la sesión, `isOffline` de `useNetworkStatus` y el id. El título sigue siendo «Animales favoritos». Las tarjetas son las del catálogo ya cargado, en el orden de la lista. Si la lista llega vacía, la sección queda sin tarjetas. No se pide otro catálogo. Colección no se toca.
  - Hecho cuando: T-07, T-08 y T-13 pasan.

- [x] **T-05** (CA-04; RN-05): salida de la cuenta.
  - Depende de: T-02.
  - Archivo: `apps/mobile/src/session/accountSession.ts`.
  - Cambios: `logout` borra las dos claves aunque falle la red del logout. `deleteAccount` las borra solo cuando el borrado responde bien. El `onSessionExpired` del cliente de favoritos también las borra.
  - Hecho cuando: T-10 pasa.

## Pruebas

- [x] **T-06** (CA-08): reescribir la suite.
  - Depende de: T-03, T-04, T-05.
  - Archivo: `apps/mobile/__tests__/favorites.test.tsx`.
  - Cambios: se quita la afirmación de que el toque solo se guarda en el teléfono. Cliente, almacén e `isOffline` van simulados.
  - Hecho cuando: los nombres de las pruebas incluyen CA-01 a CA-07 y T-07 a T-13 pasan.

- [x] **T-07** (CA-01): corazón con la cuenta.
  - Depende de: T-06.
  - Archivo: el mismo `favorites.test.tsx`.
  - Hecho cuando: el test nombra CA-01. Con un GET `[3, 8]`, la ficha `3` llega con el corazón activo y la `9` no. El toque con red llama al PUT con el booleano contrario y el corazón queda en lo que devuelve `data`. Sigue usándose `FavoriteHeartButton`.

- [x] **T-08** (CA-02): inicio y Colección.
  - Depende de: T-06.
  - Archivo: el mismo `favorites.test.tsx`.
  - Hecho cuando: el test nombra CA-02. El inicio titula «Animales favoritos» y solo muestra los id de la lista, en ese orden. La lista vacía deja la sección sin tarjetas. La lectura de `CollectionScreen.tsx` comprueba que no se añadió un filtro de favoritos.

- [x] **T-09** (CA-03): subida única.
  - Depende de: T-06.
  - Archivo: el mismo `favorites.test.tsx`.
  - Hecho cuando: el test nombra CA-03. Con la clave vieja `["4","juan","8"]` y un GET vacío hay PUT `favorite: true` solo para `4` y `8`. Tras cada `200` ese id sale de la clave vieja. Un `404` se salta y el otro PUT sigue. Si el GET ya trae filas, no hay PUT y la clave vieja se borra.

- [x] **T-10** (CA-04): cierre de sesión.
  - Depende de: T-06.
  - Archivo: el mismo `favorites.test.tsx`.
  - Hecho cuando: el test nombra CA-04. Cerrar sesión y borrar la cuenta con éxito borran la clave vieja y la copia. La lista publicada queda vacía hasta el siguiente GET.

- [x] **T-11** (CA-05): sin red.
  - Depende de: T-06.
  - Archivo: el mismo `favorites.test.tsx`.
  - Hecho cuando: el test nombra CA-05. Con copia y sin red, el inicio y la ficha muestran esos id. El toque no llama al PUT, no cambia el corazón y el mensaje es «Sin conexión.».

- [x] **T-12** (CA-06): error del PUT.
  - Depende de: T-06.
  - Archivo: el mismo `favorites.test.tsx`.
  - Hecho cuando: el test nombra CA-06. Un PUT fallido con red deja el corazón como estaba. Se muestra el `message` de la API, o «No se pudo guardar el favorito.» si no hay.

- [x] **T-13** (CA-07): presentación.
  - Depende de: T-06.
  - Archivo: el mismo `favorites.test.tsx`.
  - Hecho cuando: el test nombra CA-07. `HomeScreen` y `AnimalDetailScreen` no importan `@arca/api-client` ni `fetch`. El hook es quien llama al cliente inyectado. El test no decide si una especie es visible.

## Calidad y entrega

- [x] **T-14** (CA-08): suite.
  - Depende de: T-07 a T-13.
  - Pasos: Jest sobre `__tests__/favorites.test.tsx`, con el comando que ya usa esta app.
  - Hecho cuando: la salida queda registrada y esa suite pasa. Verificación: 8 pruebas, incluida CA-01 a CA-08, en verde.

- [x] **T-15**: notas de la app y del ADR.
  - Depende de: T-14.
  - Archivos: `apps/mobile/docs/arquitectura.md`, `apps/mobile/docs/002-mobile-ui-visitor-journey.md`, `docs/adr/0014-mobile-offline-cache-and-connectivity.md`.
  - Cambios: las dos notas de la app pasan a decir que la cuenta es la lista y que el teléfono guarda la última respuesta para mostrarla sin red. En el ADR se retira la frase que dice que los favoritos no salen del teléfono. El cache de catálogo y eventos de esa decisión se queda.
  - Hecho cuando: esos tres archivos describen el comportamiento ya implementado.

- [x] **T-16**: enlaces del PR.
  - Depende de: T-14, T-15.
  - Hecho cuando: el PR cita `mobile-014` y enlaza spec, plan y tasks. No se abre ese PR en el corte que solo redacta este checklist.
  - La verificación y el pull de favoritos quedaron confirmados. Esta task no guarda la URL del PR.
