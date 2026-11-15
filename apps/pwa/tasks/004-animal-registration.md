# Tareas · 004 · animal-registration (alineación DBR-014)

- Spec: `apps/pwa/specs/004-animal-registration.md`
- Plan: `apps/pwa/plan/004-animal-registration.md`

> Precondiciones satisfechas para implementar: spec aprobada (2026-11-13), decisiones 1A/2A/3/4 cerradas y DBR-014 “Lista para backend” (aplicada en `arca_pruebas`, evidencia detallada pendiente de adjuntar). T-01 a T-08 del alcance previo quedan completados; las tareas siguientes cubren la alineación.

## Base de datos (responsable de BD)

- [x] **T-11** (DBR-014): DBR aprobada, migración aplicada manualmente en `arca_pruebas` (2026-11-13, Victor Adrian). Pendiente: adjuntar evidencia detallada (`SHOW CREATE TABLE`, backfill/conteos, `tag_number`) y confirmar estado “Lista para backend” en el documento.

## Implementación — API

- [x] **T-12** (CA-01, RN-02): `AnimalController@store` acepta `species_id` existente o `species` (nombre nuevo) y aplica `firstOrCreate` por nombre (reutiliza/crea como ahora); valida selección/nombre.
- [x] **T-13** (CA-02, RN-03): Persiste/expone `birth_date` y `estimated_age` (sin `age`), ambos opcionales/coexistentes según decisión.
- [x] **T-14** (CA-03, RN-04): `tag_number` mantiene comportamiento/validación vigente (requerido, único) y texto/contrato actual.
- [x] **T-15** (CA-05, RN-06): `Animal`/`show`/`index` y recursos (`SpeciesResource`, `EnclosureResource`) alineados a `species.feeding/longevity/reproduction` y a `birth_date/estimated_age`; sin `animals.longevity/reproduction/diet/age`.
- [x] **T-16** (CA-04): Validación de `enclosure_id` obligatorio/existente conservada.

## Implementación — PWA

- [x] **T-17** (CA-01): Formulario carga catálogo (`useSpeciesOptions`/`listSpecies`) y permite elegir especie existente o ingresar nombre nuevo.
- [x] **T-18** (CA-02): Captura/envía `birth_date` (opcional) en el alta; `estimated_age` no se solicita en el formulario pero se mantiene en contrato/BD. El perfil muestra edad calculada desde `birth_date` o `estimated_age` cuando exista.
- [x] **T-19** (CA-03): Identificador mantenido como está (campo, obligatoriedad y texto).
- [x] **T-20** (CA-05): Perfil/cliente/tipos consumen datos de especie (`feeding/longevity/reproduction`) y edad/nacimiento alineados.
- [x] **T-21** (CA-06): Se conserva flujo de `useSaveRequest`/`SaveFeedback` (mensaje en español, sin éxito falso, conserva datos ante error).

## Pruebas automatizadas

- [x] **T-22** (CA-01): API Feature `AnimalRegistrationTest` cubre alta con `species_id` existente y con nombre nuevo (crea/reutiliza especie). PWA `apiClient.test.ts` actualizado al contrato.
- [x] **T-23** (CA-02): API Feature verifica persistencia/exposición de `birth_date`/`estimated_age`; perfil actualizado para cálculo/visualización.
- [x] **T-24** (CA-03): `tag_number` requerido/único mantenido en contrato y pruebas de envío.
- [x] **T-25** (CA-04): API Feature conserva rechazo de recinto faltante/inexistente.
- [x] **T-26** (CA-05): API Feature verifica perfil con `species.feeding/longevity/reproduction` y `birth_date`.
- [x] **T-27** (CA-06): `apiClient.test.ts` conserva casos de error 422 y fallo de conexión sin éxito; flujo de formulario preservado.

## Calidad y entrega

- [ ] **T-28** (CA-07): `/verify`/pruebas ejecutadas parcialmente: `php artisan test --filter=AnimalRegistrationTest` en `apps/api/src` → **3 passed (21 assertions)**. Suite PWA (`vitest`) no ejecutada en este entorno (sin `pnpm/npm` en PATH). Pendiente correr verificación completa de `api` y `pwa` en entorno con dependencias.
- [ ] **T-29**: Pendiente actualizar `docs/database/esquema-ingles.md`/`esquema-espanol.md` con DBR-014 aplicado, adjuntar evidencia detallada en DBR-014 y actualizar docs de PWA si aplica. Decisiones Q1-Q4 cerradas en spec.