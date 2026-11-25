# 014 · species-3d-models

- App dueña: `web`
- Apps/paquetes afectados: `web` (TulanPedia `#animales`: tarjeta de especie, visor 3D, carga perezosa de `model-viewer`, estilos y pruebas); `api` (debe exponer la URL/ruta del modelo 3D en `GET /api/v1/published-species`; requiere spec/plan/tasks de API aprobados antes de implementar el contrato); `docs/adr/0028-dynamic-tulanpedia-catalog.md` (sigue vigente; no se modifica).
- Estado: Aprobada
- Solicitante / responsable funcional: Usuario (sesión actual)
- Aprobación funcional: Aprobada por usuario en sesión (2026-11-25), con recomendaciones de la spec

## Problema y contexto

La TulanPedia (`#animales`) muestra especies publicadas desde `GET /api/v1/published-species` (`web-011`, `api-015`). En `web-011` se retiró el modelo 3D de la jirafa y todo el código de tarjetas con `data-model`/visor 3D. Ahora existen especies con `model_3d_path` en BD (campo `species.model_3d_path`) y se necesita volver a mostrar modelos 3D en el portal web cuando la especie tenga uno disponible.

Los modelos 3D serán archivos `.glb` subidos por el equipo al almacenamiento público de la API (`apps/api/src/storage/app/public/models/`) y registrados en `species.model_3d_path` con ruta relativa tipo `models/<archivo>.glb`.

## Objetivos

- Mostrar un acceso a modelo 3D en la tarjeta de una especie publicada cuando tenga modelo 3D disponible.
- Cargar el visor 3D de forma perezosa, sin afectar la carga inicial de la sección.
- Mantener seguridad de contenido: sin HTML inyectado desde API, sin URLs arbitrarias.
- Mantener accesibilidad, diseño adaptable y compatibilidad con el patrón estático actual de `apps/web/src`.

## Fuera de alcance

- Visor 3D del mapa (`#mapModelToggle`, `Mapa.glb`) — no cambia.
- Carrusel, galería múltiple o varios modelos por especie.
- Subida de modelos desde el portal web; la carga es operativa/administrativa.
- Edición del modelo 3D desde dashboard/pwa en esta spec (salvo que se defina en spec aparte).
- Conversión de formatos, compresión, CDN o streaming avanzado.
- Soporte offline/PWA de modelos 3D.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante del portal | Ver/interactuar con el modelo 3D de una especie cuando exista | Ninguno; contenido público |
| Visitante con lector de pantalla/teclado | Activar o cerrar el visor 3D y recibir estado comprensible | Ninguno |
| Equipo operativo | Subir el archivo `.glb` y registrar la ruta en BD | Acceso operativo a storage/BD según proceso aprobado |
| Equipo del portal/API | Implementar contrato y UI | Acceso al repositorio |

## Historias de usuario

Como visitante, quiero ver el modelo 3D de una especie cuando esté disponible, para conocer mejor al animal desde la TulanPedia.

## Criterios de aceptación

- **CA-01 (disponibilidad):** Dada una especie publicada cuya respuesta incluye un modelo 3D válido, cuando se renderiza su tarjeta en `#animales`, entonces la tarjeta muestra un control visible para “Ver modelo 3D” con nombre accesible que incluye la especie. Si la especie no tiene modelo 3D, no se muestra el control.
- **CA-02 (activación):** Dado el control de modelo 3D, cuando el visitante lo activa por teclado o puntero, entonces se carga `model-viewer` solo si aún no se ha cargado, se muestra el visor 3D de esa tarjeta con la URL del modelo, y el control pasa a estado activo (“Ver foto”/cerrar) con `aria-pressed`/estado equivalente actualizado.
- **CA-03 (cierre/fallback):** Dado un visor 3D activo, cuando el visitante vuelve a activar el control o el modelo falla al cargar, entonces la tarjeta vuelve a mostrar la foto/marcador de la especie sin romper la sección; el error no muestra HTML de la API.
- **CA-04 (seguridad de URL):** Dado un valor de modelo 3D proveniente de la API, cuando el portal lo procesa, entonces solo acepta URLs/rutas permitidas por la política definida (misma origen o URL pública de la API/storage esperada). Valores `javascript:`, `data:` no permitidos, o rutas inválidas no activan el visor.
- **CA-05 (accesibilidad y responsive):** Dado el visor 3D, cuando se usa en 360/390/768/1024/1366 px y con teclado/lector, entonces no hay desbordamiento horizontal, el control tiene foco visible, el visor tiene etiqueta accesible y no impide navegar la tarjeta.
- **CA-06 (no regresión):** Dado el portal actual, cuando se carga la sección, entonces siguen funcionando carga/empty/error/filtros de `web-011`, el mapa 3D existente no cambia y no se agregan dependencias/build externos.
- **CA-07 (contrato API):** Dado el endpoint `GET /api/v1/published-species`, cuando una especie tiene modelo 3D registrado, entonces la respuesta incluye el dato necesario para renderizarlo (campo y formato a definir en spec API). El cambio de contrato se implementa con spec/plan/tasks/tests de API aprobados.
- **CA-08 (pruebas):** Existe al menos una prueba automatizada por CA-01 a CA-07, o evidencia documentada cuando el CA sea de contrato cross-app.

## Reglas de negocio

- **RN-01 (solo lectura):** El portal solo consume el modelo 3D; no lo sube ni lo modifica.
- **RN-02 (texto/URL segura):** Todo dato de API se trata como texto; URLs de modelo se validan antes de usarse.
- **RN-03 (carga perezosa):** `model-viewer` se carga solo ante interacción/uso de 3D, no en la carga inicial de la página.
- **RN-04 (fuente canónica):** La ruta canónica del modelo se registra en `species.model_3d_path`; la exposición pública la define la API.
- **RN-05 (sin dependencia nueva):** No agregar paquetes/build; reutilizar `apps/web/src/assets/model-viewer.min.js` o el activo local ya aprobado.

## Datos, privacidad y auditoría

- Datos consultados: campos públicos de species ya existentes y el nuevo campo/URL de modelo 3D.
- No se exponen datos personales, clínicos ni de caja.
- No requiere consentimiento adicional del visitante.
- BD: `species.model_3d_path` ya existe; no se prevé cambio de esquema. Si se requiere cambio, deberá tramitarse DBR aprobada antes de migración.

## Flujos y errores

1. Carga de TulanPedia: igual que hoy.
2. Tarjeta con modelo: muestra botón 3D.
3. Click/tap/Enter/Espacio en botón: carga visor, muestra modelo, oculta foto.
4. Click/tap de nuevo: vuelve a foto.
5. Error al cargar modelo o URL inválida: vuelve a foto/marcador y mantiene tarjeta usable.
6. API sin campo de modelo: tarjeta sin botón 3D.

## Dependencias, riesgos y preguntas

- Dependencias/ADR: `web-011`, `api-015`, ADR 0028, `model-viewer.min.js` local existente. Requiere definir/actualizar contrato API para `model_3d_path` o `model_3d_url`.
- Riesgos: modelos pesados afectan móvil/datos; URLs mal validadas; inconsistencia entre `model_3d_path` y archivo real; cambio de contrato API puede afectar consumidores.
- Decisiones confirmadas (2026-11-25, usuario aprobó recomendaciones):
  1. Control 3D en la tarjeta, botón sobre la foto (patrón anterior).
  2. Visor inline en la tarjeta: reemplaza foto al activar; vuelve al cerrar/fallar.
  3. API devuelve `model_3d_url` resuelta/validada por Action; `null` si no existe/inválida (patrón `image_url`).
  4. Contrato API se cubre con spec API nueva (siguiente libre al momento de planear, previsto `api-031`) y su SDD completo.
  5. Solo `.glb` en esta fase.
  6. API resuelve existencia/validez y devuelve `null` si no corresponde; el portal no muestra botón sin URL válida.
  7. Visibilidad: solo especies publicadas (`species.is_published=1`) aparecen en TulanPedia; el 3D solo aplica a esas especies publicadas. `is_published` se controla por el flujo de publicación/BD existente, no por el portal.

## Revisión

- Aprobadores y fecha: Pendiente
- Evidencia/enlaces: `apps/web/specs/011-dynamic-tulanpedia.md`, `apps/api/specs/015-public-species-read.md`, `apps/web/src/assets/model-viewer.min.js`, DB campo `species.model_3d_path`.
