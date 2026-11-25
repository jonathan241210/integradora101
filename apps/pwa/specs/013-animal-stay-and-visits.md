# 013 · Permiso de visitas en el alta de animales

- App dueña: `pwa`
- Apps afectadas: `pwa`, `api`
- Estado: Aprobada
- Aprobación de alcance: solicitante, 2026-11-24

## Problema y objetivo

El formulario de alta no permite indicar si el ejemplar puede recibir visitas. La API fija el estatus en cuarentena de ingreso y deja que MySQL resuelva el permiso de visitas. El personal autorizado necesita registrar el permiso de visitas con conexión y en altas sin foto encoladas offline.

Este cambio amplía [pwa-004](004-animal-registration.md) y [pwa-009](009-offline-first-sync.md). La edición posterior del animal y las fotos offline quedan fuera del alcance.

## Actores y permisos

El personal veterinario con el permiso vigente de alta puede capturar el permiso de visitas. La API valida los permisos y los datos al recibir el alta directa o la operación de sincronización.

## Criterios de aceptación

- **CA-01.** Al abrir «Registrar animal», el formulario muestra «¿Puede recibir visitas?» con opciones Sí y No.
- **CA-02.** Al registrar con conexión, con o sin foto, la API guarda el valor de visitas, incluido un No explícito.
- **CA-03.** Al registrar sin conexión y sin foto, el borrador conserva la selección al reabrir la app y la sincronización guarda el mismo valor una vez recuperada la conexión.
- **CA-04.** Si se envía un valor de visitas inválido, la API rechaza el alta sin crear el animal y la PWA informa el motivo por la vía de error de cada flujo.
- **CA-05.** Un borrador anterior sin este campo puede sincronizarse con el comportamiento de alta compatible que se confirme en el esquema vivo.

## Reglas de negocio

- **RN-01.** La API asigna `Cuarentena_Ingreso` al registrar un animal.
- **RN-02.** Visitas se guarda como `1` para Sí y `0` para No.
- El alcance es la captura y persistencia en el alta. Las reglas de lectura del catálogo público se rigen por sus specs vigentes.

## Datos, privacidad y verificación

Se usan `animals.stay_status` y `animals.can_receive_visits`. La [DBR-001](../../../docs/database/requests/DBR-001-english-schema-normalization.md) y la migración `2026_10_14_000001` documentan ambas columnas. La PWA conserva el permiso de visitas en el borrador del usuario con la retención vigente. La API confirma el alta.

**Estado actual (2026-11-24).** Se revisaron DBR-001, la migración, la validación de las dos rutas y el formulario. Se localizó PHP 8.4.26 fuera del PATH. Con la API apuntando a `arca_pruebas` en `127.0.0.1:3306`, `php artisan db:table animals` y `php artisan migrate:status` devolvieron `SQLSTATE[HY000] [2002]`. Tampoco se detectó un servicio escuchando en ese puerto en la revisión posterior a la aprobación. Queda pendiente confirmar columnas, restricciones y valores por defecto en el esquema vivo. Si el esquema coincide, la captura no requiere DBR nueva.
