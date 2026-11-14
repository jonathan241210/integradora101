# 018 · visitor-favorite-species

- App dueña: `api`
- Apps/paquetes afectados: `api` (dueña de la lista, la visibilidad y el borrado con la cuenta); `mobile` (corazón, inicio y copia local, spec `mobile-014`); `packages/api-client` (métodos y tipos, sin lógica de negocio).
- Estado: Borrador. La aprobación funcional ya está firmada. Pasa a Aprobada cuando el equipo complete la conformidad de abajo.
- Solicitante / responsable funcional: Aksel
- Aprobación funcional: Aksel, 2026-11-14 (alcance, CA y RN)
- Conformidad del equipo: pendiente
- Dependencias: `api-004` (sesión y borrado físico de la cuenta), `api-015` (especie visible: `is_published = 1` y sin `deleted_at`). DBR-015 acompaña a esta spec y sigue en Borrador.
- Ni esta firma ni la conformidad del equipo autorizan tasks ni código. El plan técnico se redacta cuando el estado pase a Aprobada.

## Problema y contexto

El corazón de la ficha guarda el id en el teléfono (`mobile-002` CA-16, clave `visitor.favorite-animal-ids`). Al cambiar de teléfono, reinstalar la app o entrar con otra cuenta, esa lista no viaja con la persona. El id que la app guarda es el de la especie del catálogo, no el del ejemplar de `animals`. `visitor_collections` registra desbloqueos por QR y no es esta lista.

Esta spec pasa la lista a la cuenta. El teléfono puede guardar una copia para mostrarla sin red. La autoridad es la API.

## Objetivos

- Guardar, por cuenta, las especies publicadas que el visitante marcó.
- Devolver solo las de esa cuenta, de la más reciente a la más antigua, y solo si la especie sigue visible.
- Marcar y quitar con la misma ruta.
- Borrar las filas al borrar la cuenta.
- Cubrir cada CA-xx con al menos un test PHPUnit que lo nombre, cuando se implemente.

## Fuera de alcance

- Filtro de favoritos en Colección. Sigue fuera, como en `mobile-002` CA-16.
- Favorito de ejemplar (`animals`). El corazón marca la especie.
- Lista pública o visible para otra cuenta.
- Correo o push al marcar.
- Reutilizar `visitor_collections`.
- Plan técnico y tasks. Empiezan cuando esta spec esté Aprobada y DBR-015 esté en `Lista para backend`.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante con sesión y correo verificado | Ver, marcar y quitar sus especies | Ability `visitor` (`api-004`) y correo verificado |
| Visitante sin sesión o con correo sin verificar | No lee ni cambia la lista | — |
| Otra cuenta o el personal | No lee ni cambia la lista ajena | — |

## Historias de usuario

- Como visitante, quiero que mis animales favoritos sigan en mi cuenta al cambiar de teléfono.
- Como visitante, quiero que otra persona en el mismo teléfono no vea mis corazones.
- Como visitante, quiero quitar un favorito y que deje de salir en el inicio.

## Criterios de aceptación

- **CA-01 (lista propia):** Dada una cuenta con especies marcadas y otra cuenta con marcas distintas, cuando la primera llama `GET /api/v1/visitor/favorite-species`, entonces responde 200 con `{"data":[...]}` solo de sus id, de `created_at` descendente y, a igual fecha, de `id` descendente. Cada elemento es `{"id": <species_id>}`. No incluye nombre, correo ni datos de la especie.
- **CA-02 (lista vacía):** Dada una cuenta sin filas, cuando consulta el GET, entonces responde 200 con `{"data":[]}`.
- **CA-03 (marcar):** Dada una especie visible (`api-015`: `is_published = 1` y `deleted_at` nulo) que esa cuenta no tiene, cuando envía `PUT /api/v1/visitor/favorite-species/{species}` con `{"favorite": true}`, entonces responde 200 y el GET la incluye. Repetir el mismo PUT deja una sola fila.
- **CA-04 (quitar):** Dada una especie marcada, cuando envía el PUT con `{"favorite": false}`, entonces responde 200, borra la fila y el GET ya no la incluye. Quitar una que no estaba marcada responde 200 y no crea fila.
- **CA-05 (especie no visible):** Dado un id que no existe, que no está publicado o que tiene `deleted_at`, cuando se envía `favorite: true`, entonces responde 404 con `{"message": "Especie no encontrada."}` y no crea fila. El GET no devuelve una marcada cuya especie dejó de ser visible; la fila puede seguir guardada.
- **CA-06 (sesión):** Sin sesión, GET y PUT responden 401. Con correo sin verificar, responden 403 `email_not_verified`. Un cuerpo sin `favorite` booleano responde 422 y no cambia filas. Un id no numérico responde 404 sin consultar especies.
- **CA-07 (aislamiento):** La sesión de una cuenta no borra ni lista las filas de otra. La sesión cookie del personal no usa estas rutas.
- **CA-08 (borrado de cuenta):** Dada una cuenta con favoritos, cuando `DELETE /api/v1/visitor/me` borra la cuenta (`api-004` CA-14), entonces sus filas desaparecen. Otra cuenta conserva las suyas.
- **CA-09 (cobertura):** Dada la suite de PHPUnit contra `arca_pruebas`, cuando se ejecuta, entonces hay al menos un test que nombra cada CA-01 a CA-08, usa `DatabaseTransactions` y no usa `RefreshDatabase`. Este CA se cumple al implementar, no con este borrador.

## Reglas de negocio

- **RN-01 (la cuenta es la autoridad):** La lista vive en la API. El teléfono solo muestra una copia.
- **RN-02 (especie publicada):** Solo se puede marcar una especie visible según `api-015`. El corazón de la ficha usa ese id, no el de `animals`.
- **RN-03 (una fila por pareja):** La pareja `visitor_id` + `species_id` es única. Marcar de nuevo no duplica.
- **RN-04 (orden):** El GET ordena por `created_at` descendente y `id` descendente.
- **RN-05 (quitar es borrado físico):** `favorite: false` borra la fila. No hay SoftDeletes.
- **RN-06 (ocultar lo no visible):** El GET omite especies que ya no son visibles. No las borra por eso.
- **RN-07 (borrado de cuenta):** Las filas se borran físicamente con la cuenta (`api-004` RN-08), por la clave `ON DELETE CASCADE` de DBR-015.
- **RN-08 (arquitectura):** Controlador delgado → Form Request → Action → API Resource. La visibilidad se comprueba en la Action, con la misma regla que el catálogo público.
- **RN-09 (rutas):** En inglés y con nombre, bajo `/api/v1/visitor`: `visitor.favorite-species.index` y `visitor.favorite-species.update`. Sin Inertia ni Wayfinder.

## Datos, privacidad y auditoría

- Se guarda la pareja cuenta–especie y `created_at`. No se guarda el nombre del animal ni una nota.
- La lista no se expone a otras cuentas ni al portal.
- No son datos clínicos ni financieros.
- Sin SoftDeletes y sin `BaseModel`. Es una preferencia de la cuenta, igual que el borrado físico de `api-004`. DBR-015 deja esa excepción para que BD y backend la acepten o la cambien. Esta spec no da por aceptada la excepción.
- Requiere DBR: sí. `docs/database/requests/DBR-015-visitor-favorite-species.md` (Borrador). Esta spec no incluye SQL ejecutable.

## Flujos y errores

1. Con sesión, la app lee el GET y pinta el corazón y el inicio.
2. El corazón envía `favorite: true` o `false`.
3. Borrar la cuenta elimina las filas.
4. 401 sin sesión. 403 `email_not_verified`. 404 «Especie no encontrada.» 422 si `favorite` no es booleano.

## Dependencias, riesgos y preguntas

- Dependencias: `api-004`, `api-015`, DBR-015. No hay paquete nuevo ni ADR nuevo. AsyncStorage sigue siendo la copia local (`mobile-014`); la enmienda del ADR 0014 que dice que los favoritos no salen del teléfono queda señalada como reemplazo propuesto, sin cambiar ese ADR hasta que esta spec se apruebe.
- Riesgos: una especie despublicada desaparece del GET y el corazón deja de verla, aunque la fila siga. Volver a publicarla la muestra otra vez.
- Preguntas pendientes:
  1. ¿BD y backend aceptan la tabla sin SoftDeletes? La propuesta está en DBR-015. No se responde en esta spec.

## Revisión

- Aprobación funcional: Aksel, 2026-11-14. Alcance, CA y RN.
- Conformidad del equipo, antes de pasar el estado a Aprobada:

| Rol | Nombre | Fecha | Resultado |
|---|---|---|---|
| Equipo | | | Pendiente |
- Evidencia/enlaces: `apps/mobile/specs/014-visitor-favorite-species.md`, `docs/database/requests/DBR-015-visitor-favorite-species.md`, `apps/mobile/specs/002-mobile-ui-base-visitor-journey.md` (CA-16), `apps/api/specs/015-public-species-read.md`, `apps/api/specs/004-visitor-authentication.md`, `docs/adr/0014-mobile-offline-cache-and-connectivity.md`.
