# Tareas · 010 · public-enclosures-read

- Spec: `apps/api/specs/010-public-enclosures-read.md`
- Plan: `apps/api/plan/010-public-enclosures-read.md`

---

## Base de datos (responsable de BD)

- [x] **T-00** (CA-01, CA-02): Confirmar que la migración `2026_11_03_000008_enclosure_gps_coordinates.php` (`DBR-008`) esté aplicada en `arca_pruebas` con las columnas `gps_lat`, `gps_lon`, `map_x`, `map_y` activas en `enclosures`.

---

## Implementación Backend (`apps/api`)

- [x] **T-01** (CA-01, RN-02): Implementar `App\Actions\Catalog\ListEnclosuresAction` para listar recintos con carga ansiosa de animales y especies (`with(['animals.species'])`).
- [x] **T-02** (CA-02, RN-02): Implementar `App\Actions\Catalog\GetEnclosureAction` para consultar un recinto por ID con sus relaciones.
- [x] **T-03** (CA-01, CA-02, RN-01, RN-03): Implementar `App\Http\Resources\Catalog\EnclosureResource` mapeando `gps_lat`, `gps_lon`, `map_x`, `map_y` como floats, el conteo de animales y la lista simplificada de fauna.
- [x] **T-04** (CA-01, CA-02, CA-03, CA-04): Implementar `App\Http\Controllers\Catalog\EnclosureController` con validación de ID numérico y registrar las rutas públicas nombradas `enclosures.index` y `enclosures.show` en `routes/api.php`.
- [x] **T-05** (CA-01, CA-02, CA-03, CA-04, CA-05): Implementar pruebas Feature en `tests/Feature/Catalog/PublicEnclosuresTest.php` con `DatabaseTransactions` cubriendo cada CA.

---

## Implementación Cliente Móvil (`apps/mobile`)

- [x] **T-06** (CA-21, RN-20): Crear `apps/mobile/src/repositories/apiMapRepository.ts` consumiendo `GET /api/v1/enclosures` y transformando a objetos `MapPlace`.
- [x] **T-07** (CA-22, CA-23): Implementar persistencia en `AsyncStorage` (`@arca:map_places_cache`) con recuperación offline y degradación segura al fixture en caso de desconexión inicial.
- [x] **T-08** (CA-21, RN-21): Actualizar `apps/mobile/src/repositories/index.ts` para resolver `ApiMapRepository` cuando `EXPO_PUBLIC_API_URL` esté configurado.
- [x] **T-09** (CA-21, CA-22, CA-23): Crear suite de pruebas Jest en `apps/mobile/__tests__/apiMapRepository.test.ts`.

---

## Calidad y entrega

- [x] **T-10**: Ejecutar verificación de tipos en mobile (`npx tsc --noEmit`) y pruebas unitarias/feature.
- [x] **T-11**: Completar checklist y actualizar documentación del frente 1.
