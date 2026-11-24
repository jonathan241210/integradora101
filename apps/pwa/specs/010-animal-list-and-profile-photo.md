# 010 · animal-list-and-profile-photo

- App dueña: `pwa`
- Apps/paquetes afectados: `pwa`, `api` (paginación/orden del listado y carga/actualización de foto en perfil, según contrato), `packages/api-client` (si aplica)
- Estado: Implementada (sin `plan/` ni `tasks/` de esta spec; la implementación se verificó contra `apps/pwa/src/views/AnimalsView.tsx`, `AnimalFormView.tsx` y `AnimalProfileView.tsx`, y sus pruebas)
- Solicitada: 2026-11-19
- Aprobada: 2026-11-23
- Aprobación funcional: Aprobada

## Problema y contexto

La vista **Animales** de la PWA muestra actualmente la lista completa de resultados devueltos (búsqueda existente) sin controles explícitos de orden/filtro por reciente y sin paginación, lo que dificulta la consulta cuando crece el número de registros. Además, la fotografía se captura hoy en el formulario de alta; se requiere priorizar el registro de información esencial y gestionar la foto desde el perfil del animal.

Este cambio debe alinearse con `009-offline-first-sync`: las altas pueden sincronizarse sin foto en la cola offline del MVP y la fotografía se gestiona posteriormente en el perfil (fuera de la cola de adjuntos diferidos).

## Objetivos

- Mostrar por defecto los animales **más recientes creados** y ofrecer control de orden/filtro por más reciente en el listado.
- Paginar el listado mostrando **10 animales por página** con navegación por flechas a la siguiente/anterior página.
- Permitir registrar animales sin fotografía y gestionar (subir/agregar o actualizar) la foto desde el perfil del animal mediante interacción sobre el área de imagen.

## Fuera de alcance

- Subida diferida/offline de fotografías en la cola de sincronización del MVP de `009-offline-first-sync`.
- Reemplazar el buscador existente de animales (se mantiene).
- Galería múltiple de fotos o edición avanzada de imagen (recorte/filtros), salvo que se especifique.
- Cambios de esquema no aprobados por DBR.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Personal veterinario autenticado (staff) | Consultar animales con orden/paginación, registrar sin foto y subir/actualizar foto desde el perfil | Sesión staff válida y permisos API vigentes para listar/consultar animales y cargar/actualizar su foto según contrato aprobado |

## Historias de usuario

- Como personal veterinario, quiero ver el listado de animales ordenado por los más recientes creados y poder cambiar ese orden/filtro, para encontrar ejemplares nuevos rápidamente.
- Como personal veterinario, quiero navegar el listado en páginas de 10 animales con flechas, para consultar sin ver todos los registros a la vez.
- Como personal veterinario, quiero agregar o actualizar la foto del animal desde su perfil (al pasar el cursor sobre el área de imagen), para gestionar la foto después de registrar la información esencial.

## Criterios de aceptación

- **CA-01 (Orden por defecto y control):** Dado el listado de Animales, cuando el usuario ingresa a la vista, entonces los resultados se muestran ordenados por **más recientes creados** por defecto y existe un control para aplicar/alternar el filtro u orden “Más recientes” (manteniendo el buscador existente).
- **CA-02 (Paginación de 10 con flechas):** Dado el listado de Animales, cuando existen resultados, entonces se muestran máximo **10 animales** por página y hay botones de flecha para ir a la página anterior/siguiente (mostrando los siguientes 10), sin mostrar todos los registros simultáneamente.
- **CA-03 (Alta sin foto):** Dado el formulario de registro de animal, cuando el usuario guarda un alta válida sin fotografía, entonces el registro se completa correctamente (según conectividad/reglas vigentes) sin exigir imagen; la foto puede gestionarse después en el perfil.
- **CA-04 (Subir/actualizar foto en perfil):** Dado el perfil de un animal, cuando el usuario coloca el cursor sobre el área de imagen del perfil, entonces se muestra un ícono/acción para subir imagen que permite seleccionar y cargar una foto para ese animal; la UI refleja el resultado (éxito, carga o error) y permite reintentar.
- **CA-05 (Consistencia con offline/sync):** Dado el flujo offline-first, cuando se crea un animal sin foto, entonces su información esencial puede sincronizarse según `009-offline-first-sync`; la carga de fotografía desde el perfil no se encola como adjunto diferido en el MVP y requiere el comportamiento online definido por el contrato.
- **CA-06 (Errores y estados):** Dado un fallo al cargar listado/página, aplicar orden/filtro o subir foto, cuando ocurre, entonces se muestra mensaje en español, no se informa éxito falso y se puede reintentar.
- **CA-07 (Pruebas):** Dada la suite automatizada, entonces existe al menos una prueba por cada CA aplicable.

## Reglas de negocio

- **RN-01:** Orden por defecto: animales **más recientes creados**. El criterio técnico exacto (p. ej. `id` descendente, `created_at` o `entry_date`) debe definirse en el plan según campos disponibles/contrato API.
- **RN-02:** Paginación de 10 elementos por página con navegación por flechas; el buscador existente se combina con el orden/paginación sin perder resultados esperados.
- **RN-03:** La fotografía es opcional al registrar y gestionable desde el perfil del animal (subir/agregar o actualizar) mediante la acción en el área de imagen.
- **RN-04:** La API es autoridad de validación, persistencia y almacenamiento de imágenes; el cliente solo presenta estados y consume contratos aprobados.
- **RN-05:** La fotografía de perfil no forma parte de la cola offline de adjuntos del MVP (`009`).

## Datos, privacidad y auditoría

- **Datos:** listado de animales y metadatos de paginación/orden; archivo de imagen al cargar foto desde perfil.
- **Contrato/API (a detallar en plan):** soporte de orden y paginación en listado staff de animales (p. ej. parámetros de página/límite/orden) y endpoint/flujo para cargar/actualizar foto de un animal existente (multipart). Debe definirse respuesta y permisos.
- **Esquema/DB:** sin cambios previstos; cualquier índice/campo requerido requiere DBR.
- **Privacidad:** imágenes y datos solo para usuarios staff autorizados; sin exposición en logs.

## Flujos y errores

1. **Listado:** entrar a Animales → ver página 1 (10) ordenada por más recientes creados → usar buscador y/o control “Más recientes” → navegar con flechas entre páginas.
2. **Alta sin foto:** registrar datos esenciales sin imagen → guardar → registro disponible; foto se agrega luego en perfil.
3. **Foto en perfil:** abrir perfil → hover sobre área de imagen → mostrar ícono de subir imagen → seleccionar archivo → cargar (online) → actualizar vista; en error, mostrar mensaje y permitir reintento.
4. **Errores:** fallo de red/carga, página inválida, archivo no permitido/tamaño excedido, sesión expirada, error de servidor.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** `apps/pwa/specs/004-animal-registration.md`, `apps/pwa/specs/009-offline-first-sync.md`; endpoints actuales `GET/POST /api/v1/staff/animals`, `GET /api/v1/staff/animals/{id}`.
- **Riesgos:** cambio de contrato de listado (paginación/orden) puede impactar consumidores actuales; definición de “más reciente creado” depende de campos disponibles; interacción hover debe tener alternativa accesible (teclado/táctil) en la implementación.
## Decisiones

- **Orden «Más recientes»:** Se optó por ordenar por `id` descendente, que es lo implementado (`AnimalsView.tsx`, `sort === 'recent'`), porque el identificador crece con cada alta y no requiere un campo nuevo.
- **Paginación:** Se optó por paginación en cliente, de 10 por página, con el componente `Pagination` de `@arca/ui` (`AnimalsView.tsx`), porque el listado ya llega completo desde la búsqueda existente y no se cambió el contrato de listado.
- **Campo de foto en el alta:** Se optó por mantener la foto opcional en el formulario de registro además de la acción en el perfil (`AnimalFormView.tsx`, la foto se adjunta solo si se elige), para no obligar a una imagen en el alta (CA-03).
- **Endpoint de foto:** Se optó por `POST /api/v1/staff/animals/{id}/photo` con multipart (`services/apiClient.ts`, `uploadAnimalPhoto`); la API es la autoridad de validación y almacenamiento (RN-04).
- **Acción sin hover:** Se optó por un botón con foco visible sobre el área de imagen (`profile-photo-trigger` en `AnimalProfileView.tsx`), que funciona con teclado y táctil sin depender del cursor (CA-04 y el riesgo de la interacción hover).

## Revisión

- Aprobación: Aprobada.
- Evidencia/enlaces: `apps/pwa/src/views/AnimalsView.tsx`, `apps/pwa/src/views/AnimalFormView.tsx`, `apps/pwa/src/views/AnimalProfileView.tsx`, `apps/pwa/src/services/apiClient.ts`, specs `004`, `009`.

## Nota de revisión (paginador compartido)

La paginación de 10 por página de CA-02 (RN-02) se presenta con `Pagination` de `@arca/ui` en modo con total y paginación en cliente (`page`, `lastPage`, `total`), en lugar de los botones «← Anterior» / «Siguiente →» y el texto «Página X de Y» hechos a mano con estilos en línea. El comportamiento no cambia: 10 por página, vuelve a la página 1 al buscar u ordenar, flechas siguiente/anterior (ahora «Anterior» y «Siguiente» más números de página). Cubierto por `apps/dashboard/src/tests/shared-components-and-total-pagination.test.tsx` (dashboard-020 CA-55), que además detecta paginadores hechos a mano en `dashboard` y `pwa`. Estado de la spec sin cambio.
