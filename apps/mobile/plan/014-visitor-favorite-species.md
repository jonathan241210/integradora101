# Plan técnico · 014 · visitor-favorite-species

- Spec: `apps/mobile/specs/014-visitor-favorite-species.md`
- Estado de spec: Aprobada (Aksel, 2026-11-14)
- Estado del plan: Aprobado técnicamente (Aksel, 2026-11-16). Autoriza las tasks. No autoriza código hasta que esas tasks estén aprobadas.
- Responsable técnico: Aksel
- Solicitante funcional: Aksel
- Dependencias: `api-018` (spec Aprobada; plan aprobado por Aksel el 2026-11-16: `apps/api/plan/018-visitor-favorite-species.md`), DBR-018 (Lista para backend)
- Este documento no modifica `src/` y no instala dependencias. Las tasks viven en `apps/mobile/tasks/014-visitor-favorite-species.md`.

## Diseño de solución

La cuenta pasa a ser la lista. El teléfono deja de usar `visitor.favorite-animal-ids` como autoridad. Esa clave solo sirve para una subida única. La copia que se pinta sin red es otra clave, con la última lista que confirmó la API.

MVVM se mantiene. `HomeScreen` y `AnimalDetailScreen` siguen recibiendo props. El hook pide la lista y envía el corazón. La red pasa por `@arca/api-client`, inyectado al hook como en las preferencias de aviso. Las pantallas no importan el cliente ni llaman a `fetch`.

```text
Inicio y ficha (Views)
  → useFavoriteAnimals (ViewModel)
      → cliente inyectado: GET y PUT de api-018
      → AsyncStorage
          visitor.favorite-species-ids   copia de la última respuesta
          visitor.favorite-animal-ids    clave vieja, solo para la subida
Cierre de sesión o borrado de cuenta (mobile-004)
  → borra las dos claves
```

El cache de catálogo, noticias y eventos (`mobile-003`, ADR 0014) no entra en este flujo. `apiAnimalRepository`, `apiZooRepository` y `mediaImageCache` no se modifican.

Decisiones de este plan:

- **El hook recibe el cliente y `isOffline`.** Los tests los sustituyen. La ruta lee `useNetworkStatus` y arma el cliente. La pantalla no hace ninguna de las dos cosas.
- **Sin sesión no hay lista local.** El corazón queda en contorno. El toque no llama al PUT y no escribe ninguna clave. Los id que ya estaban en el teléfono esperan a la subida única, cuando haya sesión y el GET llegue vacío.
- **Los id del hook son cadenas.** El catálogo ya usa `String(species.id)` en `mapSpeciesToAnimalModel`. El inicio sigue filtrando con `includes`. El orden de «Animales favoritos» es el orden del GET.
- **Un toque con red espera la respuesta y entonces cambia el corazón.** La animación actual de `FavoriteHeartButton` reacciona a `active`. No se adelanta el relleno. Si el PUT falla, `active` no cambia.
- **Un segundo toque mientras hay un PUT en curso se ignora.**

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Paquete | `packages/api-client/visitor.ts` | Lo agrega el plan de `api-018`: `listFavoriteSpecies` y `updateFavoriteSpecies`. Este plan los consume y no declara otro cliente |
| Repositorio | `apps/mobile/src/repositories/favoriteAnimals.ts` | Deja de ser la lista de verdad. Guarda y borra las dos claves, lee la clave vieja y publica la copia. `toggle` local desaparece |
| ViewModel | `apps/mobile/src/viewmodels/useFavoriteAnimals.ts` | GET, subida única, PUT, error y cierre de la copia. Recibe el cliente o `null`, el almacén y `isOffline` |
| Rutas | `apps/mobile/src/app/(tabs)/index.tsx`, `apps/mobile/src/app/animal/[id].tsx` | Pasan al hook el cliente de la sesión, `isOffline` y el id. Siguen sin pintar la UI |
| Pantallas | `HomeScreen`, `AnimalDetailScreen` | Sin cambio de contrato visual. El título sigue siendo «Animales favoritos». La animación del corazón se queda |
| Sesión | `apps/mobile/src/session/accountSession.ts` | Al cerrar sesión, y al borrar la cuenta con éxito, borra las dos claves. El `401` del cliente de favoritos también las borra |
| Colección | `CollectionScreen` | Sin filtro ni sección de favoritos |
| Pruebas | `apps/mobile/__tests__/favorites.test.ts` | Se reescribe. Cubre CA-01 a CA-07 con cliente y almacén simulados. Deja de afirmar que el toque solo se guarda en el teléfono |
| Documentación | `apps/mobile/docs/arquitectura.md` y `apps/mobile/docs/002-mobile-ui-visitor-journey.md` | En el PR de implementación, cuando el código ya haga esto. Este plan no las reescribe: hoy todavía describen la lista local, y eso sigue siendo lo que corre |

## Contrato y datos

El hook usa el contrato de `api-018`:

- `GET /api/v1/visitor/favorite-species` → `{ data: { id: number }[] }`
- `PUT /api/v1/visitor/favorite-species/{species}` con `{ favorite: true | false }` → el mismo cuerpo, ya actualizado

Solo se envía un id de especie formado por dígitos, y el booleano. No se envía nombre ni correo.

### Claves en el teléfono

| Clave | Papel |
|---|---|
| `visitor.favorite-species-ids` | Copia de la última lista confirmada. JSON de id en cadena. Se pinta sin red. Se reemplaza con cada GET o PUT exitoso |
| `visitor.favorite-animal-ids` | Clave de `mobile-002`. Ya no se pinta. Solo alimenta la subida única y después se vacía |

### Con sesión y con red

1. El hook pide el GET.
2. Si `data` trae filas, esa lista reemplaza la copia. La clave vieja se borra. No hay subida. Así, un GET vacío más adelante no vuelve a empujar id que el servidor ya superó.
3. Si `data` llega vacío y la clave vieja tiene id, sube solo los que son dígitos. `["4","juan","8"]` envía `4` y `8`. No envía `juan`.
4. Cada `200` quita ese id de la clave vieja y deja la copia en el cuerpo de ese PUT.
5. Un `404` se omite y se sigue con el siguiente. Ese id permanece en la clave vieja. El siguiente arranque, si el GET sigue vacío, lo intenta otra vez.
6. Un fallo que no sea `404` deja ese id y los que aún no se enviaron. Corta la pasada. El próximo arranque con GET vacío continúa por lo que siga en la clave.
7. Al terminar la pasada sin ese corte, un GET de cierre pinta la lista y reemplaza la copia. Si ese GET falla, queda el cuerpo del último `200`.

### Corazón

- Con red y sesión, el toque llama al PUT con `favorite: true` o `false`. El corazón pasa al estado que trae `data`. La animación es la que ya dispara `active` en `FavoriteHeartButton` (`mobile-002` CA-16).
- Si el PUT responde error y hay red, el corazón no cambia. El texto es `message` de la API, o «No se pudo guardar el favorito.» si no viene.
- Un `401` no muestra ese texto. El cliente cierra la sesión como el resto de la app (`mobile-004` CA-06) y este flujo borra las dos claves.
- Sin red (`isOffline` o el cliente con estado `0`), se ve la copia. El toque no llama al PUT, no cambia el corazón y muestra «Sin conexión.».
- Sin sesión, el corazón queda en contorno. El toque no escribe y no llama a la API.

### Inicio y Colección

El inicio sigue titulando la sección «Animales favoritos». Muestra, en el orden de la lista, las fichas del catálogo cuyo id está en esa lista. Si la lista llega vacía, la sección queda sin tarjetas. No se pide otro catálogo: la ficha sale del que ya cargó `mobile-003`. Una especie favorita que ese catálogo aún no tiene no se inventa aquí.

Colección no gana filtro ni sección.

### Cierre de sesión

`accountSession.logout` borra las dos claves aunque falle la red del logout, porque la sesión local termina igual. `deleteAccount` las borra solo cuando el borrado responde bien. El `onSessionExpired` del cliente de favoritos también las borra, junto con el par de tokens que ya limpia el resto de la app.

La cuenta siguiente no ve esos corazones hasta su propio GET.

## Seguridad, offline y operación

- Sin sesión no hay GET ni PUT.
- La copia son id de especie, no el nombre ni el correo. Se borra al salir de la cuenta.
- El cache SWR del catálogo, las noticias, los eventos y las imágenes sigue como está. Este plan no cambia su TTL ni su almacén.
- No hay cola de toques sin red. El toque perdido no se reintenta.
- No hay dependencia nueva. AsyncStorage y `expo-network` ya están aceptados (ADR 0014).
- Jest simula el cliente, el almacén y `isOffline`. No hace falta dispositivo para CA-01 a CA-07.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | Con un GET `[3, 8]`, la ficha `3` llega con el corazón activo y la `9` no. El toque con red llama al PUT con el booleano contrario y el corazón queda en lo que devuelve `data`. El componente del corazón sigue siendo `FavoriteHeartButton` | `apps/mobile/__tests__/favorites.test.ts` |
| CA-02 | El inicio titula «Animales favoritos» y solo muestra los id de la lista, en ese orden. Lista vacía: la sección queda sin tarjetas. `CollectionScreen` no incorpora un filtro de favoritos | El mismo archivo, más lectura de `CollectionScreen.tsx` |
| CA-03 | Clave vieja `["4","juan","8"]` y GET vacío: hay PUT `favorite: true` solo para `4` y `8`. Tras cada `200` ese id sale de la clave vieja. Un `404` se salta y el otro PUT sigue. Si el GET ya trae filas, no hay PUT y la clave vieja se borra | El mismo archivo |
| CA-04 | Cerrar sesión y borrar la cuenta con éxito borran la clave vieja y la copia. La lista publicada queda vacía hasta el siguiente GET | El mismo archivo, sobre `accountSession` con repositorio simulado |
| CA-05 | Con copia y sin red, el inicio y la ficha muestran esos id. El toque no llama al PUT, no cambia el id y el mensaje es «Sin conexión.» | El mismo archivo |
| CA-06 | Un PUT fallido con red deja el corazón como estaba. Se muestra el `message` de la API, o «No se pudo guardar el favorito.» si no hay | El mismo archivo |
| CA-07 | `HomeScreen` y `AnimalDetailScreen` no importan `@arca/api-client` ni `fetch`. El hook es quien llama al cliente inyectado. El test no decide si una especie es visible | El mismo archivo, leyendo el fuente de las dos pantallas |
| CA-08 | Los nombres de las pruebas incluyen CA-01 a CA-07 | El mismo archivo |

CA-08 de la spec pide esa cobertura. La fila de la tabla lo deja en la misma suite.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin dependencia nueva. AsyncStorage y la detección de red siguen en el ADR 0014, ya aceptado |
| II. La spec manda | Sí, en este documento | Spec Aprobada por Aksel el 2026-11-14. Plan aprobado por Aksel el 2026-11-16. Las tasks quedan pendientes de su propia aprobación. No hay código |
| III. Lógica separada de la interfaz | Sí | La pantalla no llama a la red. El hook usa el cliente inyectado. Quién puede marcar la especie lo decide `api-018` |
| IV. Un test por criterio | Sí, al implementar | La tabla cubre CA-01 a CA-08. Los tests no se escriben en este corte |
| V. Una sola fuente de verdad para los datos | Sí | La autoridad es la API (DBR-018). La copia del teléfono solo pinta sin red y se borra al salir. La clave vieja deja de ser la lista |
| VI. Código en inglés, personas en español | Sí | Claves, métodos y archivos en inglés. «Sin conexión.» y «No se pudo guardar el favorito.» en español |

Ninguna excepción nueva. El plan ya está aprobado. El código espera la aprobación de las tasks.

## Riesgos y decisiones

- ADR: no hay ADR nuevo. La enmienda del ADR 0014 sigue vigente hasta que este cambio se implemente. El cache de catálogo y eventos de esa decisión no se toca.
- Alternativa descartada: seguir pintando la clave vieja antes de iniciar sesión. Volvería a hacer del teléfono la lista de verdad, que es lo que esta spec reemplaza.
- Alternativa descartada: encolar el toque sin red. La spec lo deja fuera.
- Si la subida se corta, el siguiente arranque con GET vacío retoma los id que sigan en la clave vieja. Un id de demostración no se envía.
- Si el GET de una cuenta ya tiene filas, borrar la clave vieja evita que, al dejar la cuenta en cero más tarde, esos id vuelvan a subirse.
- El aviso de privacidad oficial debe decir que los favoritos se guardan en la cuenta. Este plan no redacta ese texto.
- El código de la app espera a que las tasks de `api-018` estén hechas y los dos métodos presentes en `@arca/api-client`. El plan de la API ya está aprobado.

## Orden y aprobación

1. Aprobación técnica de este plan y del plan de `api-018`: Aksel, 2026-11-16.
2. Tasks de la API, métodos del cliente y tests de `api-018`. Esperan su propia aprobación antes del código.
3. Tasks de esta app. También esperan aprobación antes del código.
4. Implementación móvil: repositorio, hook, sesión y la suite Jest. En ese PR se actualizan las dos notas de `apps/mobile/docs/` citadas arriba.
5. Recién al implementar se retira, en el ADR 0014, la frase que dice que los favoritos no salen del teléfono.

La aprobación funcional de la spec es de Aksel (2026-11-14). La aprobación técnica de este plan es de Aksel (2026-11-16).
