# 004 · animal-registration (alineación DBR-014)

- App dueña: `pwa`
- Apps/paquetes afectados: `pwa`, `api`
- Estado: Aprobada
- Solicitante / responsable funcional: Victor Adrian (alineación operativa veterinaria)
- Aprobación funcional: Victor Adrian, 2026-11-13 ("ok apruebo eso", con decisiones 1A, 2A, 3 ambos opcionales, 4 identificador como está)

## Problema y contexto

El alta de animales y su ficha deben alinearse con el esquema resultante de DBR-014 (aplicada en `arca_pruebas`, evidencia detallada pendiente de adjuntar): los datos generales de señalética (alimentación, longevidad, reproducción) pertenecen a `species`; `animals` ya no contiene `longevity`, `reproduction`, `diet` ni `age`, y usa `birth_date` + `estimated_age` (coexistentes) con `tag_number` nullable a nivel BD. La implementación actual del registro envía especie como texto libre, guarda nacimiento como texto en `age`, y la ficha/perfil consume campos retirados de `animals`; además la API crea especies implícitamente por nombre.

Se requiere que, al registrar y consultar animales, la información se integre de forma natural y coherente con la BD y el catálogo de especies.

## Objetivos

- Registrar animales seleccionando **especie existente** del catálogo (`species_id`) o **registrando una nueva por nombre** si no existe (mismo comportamiento de creación/reutilización de especie que hoy, sin cargar al veterinario con datos de catálogo), y recinto existente (`enclosure_id`), con contrato y persistencia alineados a DBR-014.
- Capturar nacimiento de forma estandarizada: `birth_date` (cuando se conoce), sin usar `age`. `estimated_age` existe en BD (DBR-014) para casos sin fecha exacta, pero no se captura en el formulario de alta en este alcance.
- Mantener el comportamiento actual del **identificador** (`tag_number`) en la UI/API de alta (campo, obligatoriedad, validación y texto/placeholder) según decisión vigente, sin introducir tipo de identificación en BD.
- Registrar sexo como **Macho/Hembra** (`M/F`) en UI.
- Mostrar en perfil/ficha los datos generales (alimentación, longevidad, reproducción) desde `species` y la edad derivada/estimada desde `animals.birth_date`/`animals.estimated_age`.
- Eliminar del consumo/escritura los campos retirados de `animals` (`longevity`, `reproduction`, `diet`, `age`).

## Fuera de alcance

- Crear o editar especies desde el formulario de alta (salvo decisión explícita posterior); el alta selecciona especies existentes.
- Agregar “tipo de identificación” (marca/anillo/chip) en BD (requeriría DBR).
- Guardado offline/sincronización de registros.
- Persistencia de diagnósticos/revisiones clínicas (cubierto por otra iniciativa) y snapshot de edad en evaluaciones (requiere DBR aparte si se decide).
- Cambios de esquema adicionales (DBR-014 ya aplicado).

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Personal veterinario autenticado (staff) | Registrar animales y consultar su perfil | Sesión Sanctum staff; acceso a endpoints staff de animales y catálogos públicos/permitidos (`/api/v1/species`, `/api/v1/enclosures`) según política vigente |

## Historias de usuario

Como personal veterinario autenticado, quiero registrar un animal seleccionando su especie y recinto existentes y capturando su nacimiento/edad de forma clara, para que el registro se guarde correctamente en la BD alineada.

Como personal veterinario, quiero ver en el perfil del animal su información individual y los datos generales de su especie (alimentación, longevidad, reproducción) y su edad, para consultar una ficha coherente.

## Criterios de aceptación

- **CA-01 (Especie existente o nueva):** Dado el formulario de alta, cuando se carga, entonces presenta las especies disponibles para elegir (desde catálogo) y permite indicar una especie nueva por nombre si no existe. Al enviar un alta válida, si se elige una especie existente se envía su `species_id`; si se indica una nueva, la API la crea/reutiliza por nombre (comportamiento `firstOrCreate`) y persiste el animal con el `species_id` resultante, sin exigir al veterinario completar datos de catálogo.
- **CA-02 (Nacimiento):** Dado el formulario de alta, cuando se captura `birth_date` (o se omite), entonces la API persiste `animals.birth_date` según lo enviado (sin usar `age`); la respuesta/perfil expone `birth_date`/`estimated_age` y la edad mostrada se calcula desde `birth_date` cuando existe, o usa `estimated_age` cuando exista (dato que puede provenir de otros flujos/legado). El alta no captura `estimated_age`.
- **CA-03 (Identificador vigente):** Dado el formulario de alta, cuando se envía, entonces el campo identificador (`tag_number`) mantiene el comportamiento/validación actualmente definido en UI/API (campo, obligatoriedad y texto tal como está), siendo coherente con la restricción de unicidad.
- **CA-04 (Recinto obligatorio):** Dado el formulario de alta, cuando se envía, entonces exige un `enclosure_id` válido existente y la API lo valida/persiste (sin cambios de regla respecto a 004 previo).
- **CA-05 (Perfil alineado a especie):** Dado el perfil de un animal, cuando se consulta, entonces muestra alimentación, longevidad y reproducción desde `species` (no desde `animals`) y no depende de columnas retiradas (`animals.longevity/reproduction/diet/age`).
- **CA-06 (Errores y no éxito falso):** Dado un fallo de validación, sesión o conexión al registrar, cuando ocurre, entonces se muestra mensaje en español, no se informa éxito y se conservan los datos para corregir/reintentar.
- **CA-07 (Pruebas):** Dada la suite automatizada, entonces existe al menos una prueba por cada CA-01 a CA-06 afectado en su app correspondiente.

## Reglas de negocio

- **RN-01:** La API es autoridad de validación y persistencia; el cliente solo envía datos y presenta estados.
- **RN-02:** La especie se resuelve por `species_id` existente o, si se indica una nueva, se crea/reutiliza por `common_name` (`firstOrCreate`) sin exigir datos adicionales de catálogo al veterinario.
- **RN-03:** `birth_date` y `estimated_age` pueden coexistir y son opcionales en BD. El formulario de alta captura solo `birth_date` (opcional). Si hay `birth_date` conocida, la edad mostrada se calcula a partir de ella; si no, se muestra `estimated_age` cuando exista. No se usa `animals.age`.
- **RN-04:** `tag_number` conserva su comportamiento actual en este alcance (campo, obligatoriedad, validación y texto vigente), respetando unicidad.
- **RN-05:** `enclosure_id` es obligatorio y debe existir.
- **RN-06:** Datos de señalética (alimentación/longevidad/reproducción) son de `species`, no del ejemplar.
- **RN-07:** El sexo se captura como Macho/Hembra (`M/F`) en UI/API para este alta.

## Datos, privacidad y auditoría

- **`animals`**: `name`, `tag_number`, `sex`, `birth_date`, `estimated_age`, `origin`, `characteristics`, `entry_date`, `enclosure_id`, `species_id`, `responsible_id`, `stay_status` (según contrato final). No se usan `longevity/reproduction/diet/age`.
- **`species`** (lectura/referencia): `feeding`, `longevity`, `reproduction` y datos de catálogo.
- **`enclosures`**: referencia para selección.
- Datos de gestión zoológica (no clínicos/financieros en este alcance). Sin guardado offline.
- DBR asociada: **DBR-014** (`species-feeding-and-animal-identity-fields`), estado **Lista para backend** (aplicada en `arca_pruebas`, 2026-11-13; evidencia detallada pendiente de adjuntar). No hay cambios de esquema adicionales en este alcance.

## Flujos y errores

1. Alta: cargar especies y recintos → capturar datos (incl. nacimiento y/o edad estimada) → enviar → `201` confirma y limpia; validación/sesión/conexión muestran error y conservan datos.
2. Perfil: consultar animal → mostrar datos del ejemplar + especie (alimentación/longevidad/reproducción) + edad calculada/estimada.
3. Casos alternos: catálogo de especies vacío, recinto inválido, `tag_number` duplicado, fecha inválida, ambos nacimiento/edad vacíos (definir regla), sesión expirada.

## Dependencias, riesgos y preguntas

- Dependencias/ADR: DBR-014 Lista para backend (aplicada en `arca_pruebas`); endpoint de catálogo `GET /api/v1/species`; sesión Sanctum staff.
- Riesgos: consumidores aún leyendo `animals.age/diet/longevity/reproduction` (rotura si no se alinean); contrato de alta cambia (soporte `species_id` o nombre nuevo, nacimiento/edad); datos históricos con `age` migrados a `birth_date/estimated_age` según DBR.
- Decisiones resueltas (2026-11-13, Victor Adrian): **1A** especie seleccionable + creación/reuso por nombre si es nueva (como ahora); **2A** sexo solo Macho/Hembra (`M/F`); **3** ajustada: el alta captura solo `birth_date` (opcional); `estimated_age` permanece en BD/contrato para otros casos pero no se pide en el alta; **4** identificador (`tag_number`) igual que actualmente (campo, obligatoriedad, validación y texto).
- Pendiente operativo: adjuntar evidencia detallada de DBR-014 (`SHOW CREATE TABLE`/conteos) en su documento.

## Revisión

- Aprobadores y fecha: Victor Adrian (funcional), 2026-11-13.
- Evidencia/enlaces: `docs/database/requests/DBR-014-species-feeding-and-animal-identity-fields.md`, `docs/database/alineacion-formularios-pwa-veterinaria.md`, implementación previa `004`.