# Almacenamiento de objetos compatible con S3: propuesta de opción futura

> **Propuesta opcional, no implementada ni aprobada.**
>
> Esta guía **no es una fase del plan de implementación**. No tiene CA ni RN en ninguna spec, no requiere ADR ahora y no autoriza dependencias, proveedor, buckets ni llaves. Describe qué habría que hacer **si** se quiere usar un almacenamiento de objetos. Quien continúe el proyecto elegirá la alternativa que mejor le parezca.

- Estado: opción futura (sin fecha). Decisión del responsable (Jonathan, 2026-11-10): sale del plan de implementación.
- Decisión vigente: la carpeta de medios versionada `apps/api/src/media/` (`docs/adr/0026-object-storage-s3-images.md`, Propuesto; spec `apps/api/specs/013-object-storage-images.md`, Borrador).
- Si alguien decide adoptarlo, se crea un ADR propio (servicio externo y dependencia), una spec nueva o enmienda de `api-013`, y su plan y tareas. Esta guía no sustituye a ninguno de esos documentos.
- Relacionado: ADR 0013 (almacenamiento detrás de discos de Laravel Filesystem), Constitución I (stack portable) y V (la base de datos es la fuente de verdad).

## 1. Contexto y cuándo conviene

Hoy las imágenes de noticias, eventos y momentos viven en `apps/api/src/media/`, que se versiona en git para que los equipos de pruebas vean las mismas fotos tras `git pull`. Esa solución sirve para pruebas con datos de prueba. No sirve para producción.

Conviene estudiar un almacenamiento de objetos cuando se cumpla alguna de estas condiciones:

- Se quiere un servicio compartido de producción con visitantes reales.
- Las fotos de visitantes no deben quedar en el historial de git, ni siquiera para pruebas.
- Se necesitan respaldos, control de acceso al contenido y retirada de contenido publicado.
- El repositorio va a ser accesible para más personas que el equipo de pruebas.
- Se quiere que las fotos pendientes de revisión no tengan ninguna URL pública, ni siquiera difícil de adivinar.

No conviene si el proyecto sigue en pruebas con datos de prueba, si no hay requisito de producción o si no se quiere asumir un servicio externo con coste recurrente.

Costes de adoptarlo: servicio externo (si cae, las imágenes no cargan aunque la API funcione), credenciales que custodiar y rotar, dos buckets por ambiente y una operación de migración de archivos existentes.

## 2. Proveedores compatibles

Cualquier servicio que hable el protocolo S3 puede servir. Esta lista no afirma precios, límites ni regiones: esas condiciones cambian y deben verificarse en la documentación vigente del proveedor **en la fecha de decisión**.

| Opción | Tipo | Qué verificar antes de decidir |
|---|---|---|
| Cloudflare R2 | Servicio gestionado, compatible con S3 | Región (en la documentación figura como `auto`), tarifas de almacenamiento y de salida, capa gratuita vigente, ubicación de los datos. Es la propuesta de trabajo original. |
| Amazon S3 | Servicio gestionado, referencia del protocolo | Región, tarifas de almacenamiento, peticiones y transferencia de salida, condiciones vigentes. |
| DigitalOcean Spaces | Servicio gestionado, compatible con S3 | Región disponible, tarifas, límites y condiciones vigentes. |
| MinIO | Autoalojado, compatible con S3 | No hay coste de proveedor, pero el equipo opera el servidor, sus respaldos, su disponibilidad y su actualización. |

Requisito previo: confirmar si hay una exigencia de ubicación de los datos (país o región) para las fotos de visitantes. Ese requisito puede descartar opciones.

## 3. Diseño propuesto

Esta sección describe un diseño posible. Quien adopte la opción debe validarlo en su propia spec y plan.

**3.1 Dos buckets por ambiente.** Un bucket público (lectura pública) para noticias, eventos y momentos aceptados. Un bucket privado (sin acceso público) para momentos pendientes y rechazados. Los buckets nunca se comparten entre pruebas y producción.

**3.2 Claves de disco por ámbito.** Dos variables eligen el disco de Laravel de cada ámbito:

- `PUBLIC_MEDIA_DISK`: disco del ámbito público. Por defecto `public`.
- `PRIVATE_MEDIA_DISK`: disco del ámbito privado. Por defecto `local`.

Un único disco `s3` tiene un único bucket. Por eso hacen falta dos discos `s3` en `config/filesystems.php`, uno por bucket. Las Actions nunca nombran un disco: leen la clave de configuración.

**3.3 Variables de `.env`** (solo nombres; los valores reales viven fuera del repositorio):

- `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY`: llaves de mínimo privilegio.
- `AWS_DEFAULT_REGION`: región que indique el proveedor.
- `AWS_BUCKET`: bucket público.
- `AWS_PRIVATE_BUCKET`: bucket privado.
- `AWS_URL`: URL pública del bucket público, en `https`.
- `AWS_ENDPOINT` y `AWS_USE_PATH_STYLE_ENDPOINT`: necesarios para proveedores que no usan el endpoint de AWS. Su valor exacto se toma de la documentación del proveedor.

`.env.example` solo contiene nombres y valores vacíos o de muestra.

**3.4 Dependencia.** El driver de Laravel para S3 necesita `league/flysystem-aws-s3-v3`. Solo se instala después de un ADR de dependencia aprobado (Constitución I). Ningún cliente recibe llaves.

**3.5 URL pública.** `image_url` sale de `AWS_URL` del disco público, no de `APP_URL`. La API nunca construye URLs con el endpoint de la API S3, porque no es público.

**3.6 Momentos pendientes y rechazados.** Viven en el bucket privado y no tienen URL pública. El personal con `memories.review` ve la imagen con una URL temporal firmada que la API genera al pedir el detalle. La propuesta de caducidad es de 10 minutos como máximo. La URL no se guarda en la base de datos ni en Activitylog. Alternativa: una ruta autenticada que entregue el binario por la API, como la de la carpeta versionada. Hay que elegir una antes de aprobar.

**3.7 Escritura.** La API escribe los objetos. No se envían ACL por objeto. El navegador nunca escribe en el almacenamiento.

**3.8 CORS.** Las imágenes públicas se cargan con `<img>`, que no necesita CORS. Si algún cliente leyera el binario con `fetch`, habría que configurar CORS en el bucket para el origen concreto. Eso requiere decisión propia.

**3.9 Aceptar un momento.** La imagen pasa del bucket privado al público con un nombre generado por la API. Propuesta: moverla, para no tener dos copias de un dato personal. La ruta relativa queda en `published_image_path` (DBR-012).

**3.10 Rechazar un momento.** Si el motivo incluye la foto (`image`), se borra el original privado después del commit (`api-010` CA-29). Si el motivo es solo la opinión, el original se conserva para la corrección.

**3.11 Base de datos sin cambios.** La base guarda solo rutas relativas, nunca URLs, nombres de bucket, endpoints ni rutas absolutas. Por eso cambiar de disco no toca el esquema ni requiere DBR.

## 4. Pasos para implementarlo

Checklist ordenado. Cada paso requiere su aprobación. Los agentes no crean buckets, llaves ni copias en producción.

1. [ ] Registrar la decisión de adoptar la opción y quién es su responsable.
2. [ ] Verificar las condiciones vigentes del proveedor elegido (tarifas, salida, región, capa gratuita, ubicación de datos).
3. [ ] Aprobar un ADR de adopción (servicio externo, proveedor, dependencia) y un ADR de dependencia para `league/flysystem-aws-s3-v3` (Constitución I).
4. [ ] Crear o aprobar la spec que sustituya o amplíe `api-013` con CA y RN propios del diseño elegido. Crear plan y tasks con el mismo NNN-slug (`docs/05-flujo-sdd.md`).
5. [ ] Crear la cuenta, los dos buckets por ambiente y las llaves de mínimo privilegio, fuera del repositorio. Definir rotación, respaldos y versionado. Lo hace infraestructura.
6. [ ] Instalar la dependencia con `composer require league/flysystem-aws-s3-v3`, solo tras los ADR y la spec aprobados.
7. [ ] Añadir los dos discos `s3` (público y privado) en `config/filesystems.php`, leyendo sus valores de `.env`.
8. [ ] Actualizar `.env.example` con nombres y valores vacíos. Comprobar con las pruebas que ninguna Action, Form Request, Resource ni Model nombra un disco o un proveedor.
9. [ ] Copiar los archivos públicos existentes (`news/` y `events/`) con la misma ruta relativa. Orden: simulación, copia real y verificación. La copia es idempotente: si el archivo ya existe con el mismo tamaño y hash, no se sube ni se sobrescribe. No borra el origen. Informa cuántos archivos copió, cuántos ya estaban y cuántas filas apuntan a archivos que faltan.
10. [ ] Limpiar los metadatos (EXIF) al copiar, con el recorte de `api-008` RN-13, porque las imágenes anteriores a esa regla pueden conservarlos. Un bucket público con metadatos los expone.
11. [ ] Mover los momentos pendientes y rechazados al bucket privado. Nunca se copian al público.
12. [ ] Retirar `media/memories/` del repositorio y de su historial de git antes de cualquier uso fuera de pruebas. Es un procedimiento aparte que hay que coordinar con los clones existentes. Git conserva el contenido aunque el archivo se borre.
13. [ ] Cambiar `.env` en el ambiente de pruebas: `PUBLIC_MEDIA_DISK` y `PRIVATE_MEDIA_DISK` apuntan a los discos `s3`, y se completan las variables `AWS_*`.
14. [ ] Verificar en el ambiente de pruebas: una imagen subida desde un equipo responde 200 con `image/*` desde otro equipo, sin sesión. La URL de un pendiente no entrega el objeto. Una URL temporal caducada se rechaza y el dashboard pide el detalle de nuevo. Los tests PHPUnit pasan y el test de humo (grupo excluido de la suite normal) se ejecuta contra el ambiente de pruebas. Se registra la evidencia sin llaves ni URLs firmadas.
15. [ ] Actualizar `infra/README.md` (checklist del ambiente), los docs de la app y el estado de los ADR y specs. Solo con la aprobación correspondiente.
16. [ ] Definir la copia de respaldo fuera del proveedor. El proveedor no es un respaldo por sí solo. Hacerlo antes de producción.
17. [ ] Cambiar `.env` de producción solo después de los pasos 11 y 12 y con su propio registro de despliegue.

## 5. Riesgos

- **Coste recurrente y transferencia de salida.** Dependen del proveedor y cambian. Verificar antes de decidir.
- **Servicio externo.** Si el proveedor cae, las imágenes no cargan aunque la API responda.
- **Credenciales.** Llaves de mínimo privilegio, custodia fuera del repositorio y rotación. Dos buckets por ambiente duplican la configuración y las llaves.
- **Migración.** Copiar archivos existentes exige una operación controlada, con verificación. Las imágenes antiguas pueden tener metadatos.
- **Respaldo.** El proveedor no sustituye a una copia de respaldo.
- **Retirada de contenido.** Las cachés del navegador o de una CDN retrasan la retirada de una foto publicada.
- **URLs temporales.** Caducan. Si caducan con la vista abierta, el dashboard tiene que pedir el detalle otra vez.
- **Producción desde desarrollo.** Buckets separados por ambiente, igual que las bases de datos (`arca_pruebas` y `arca_zoo`).
- **Historial de git.** Si antes se versionaron medios de visitantes, siguen en el historial hasta reescribirlo (paso 12).
- **Constitución I.** El protocolo S3 nace de un estándar de un proveedor. Se usa detrás de un disco de Laravel y no de un SDK del proveedor, pero el equipo debe decidir si lo acepta como cumplimiento o si requiere enmienda.

## 6. Esfuerzo

| Cambio | Esfuerzo | Por qué |
|---|---|---|
| Pasar de la carpeta `media/` a almacenamiento S3 | Bajo-Medio | Técnicamente son pocos cambios: una dependencia tras ADR, dos discos en configuración, URL temporal para pendientes, copia con limpieza de metadatos y retirada del historial. Lo más pesado es administrativo: cuenta, dos buckets por ambiente, llaves, ADR y verificación de condiciones. |
| Cambiar entre la carpeta local y S3 | Bajo | Copiar los archivos con la misma ruta relativa y cambiar `.env`. La base de datos no cambia porque guarda rutas relativas. |
| Cambiar de un proveedor S3 compatible a otro | Bajo | Cambiar `.env` y copiar los objetos. El dominio y la base de datos no cambian. |
| Cambiar la base de datos de Aiven a MySQL local | Bajo técnico; Medio por coordinación y datos | Solo `.env` (`DB_HOST`, `DB_*`, y quitar `DB_SSL_CA`) y volcado con restauración. No requiere DBR nueva porque no cambia el esquema. Es independiente del almacenamiento de imágenes. |

Notas sobre el cambio de base de datos:

- Una sola fuente de verdad. Si Aiven y la instancia local reciben escrituras a la vez, divergen. Hay que congelar una durante el volcado.
- Las migraciones las aplica y registra el responsable de BD por ambiente (`docs/database/README.md`).
- Si el volcado y la carpeta de medios no corresponden al mismo punto, las filas apuntan a archivos que no existen. Deben hacerse juntos.
- `RolesAndPermissionsSeeder` se ejecuta siempre con `--class`. `DemoStaffSeeder` no se ejecuta fuera de pruebas.
- Sesiones, tokens y 2FA no viajan con el volcado, salvo decisión explícita.
- `settings_colores` es una fuente externa con sus propias credenciales. No se migra.
- Revisar la versión de MySQL 8.0.x y la collation con el inventario de `infra/README.md`.
- Producción (`arca_zoo`) no forma parte de este cambio y ningún agente la usa.

## 7. Alternativas

1. **Disco persistente en el servidor de la API.** Mantener `storage/app/public` en un volumen persistente incluido en los respaldos y servir desde `APP_URL`. Sin servicio nuevo ni dependencia. Ata las imágenes a un servidor y complica varios nodos y una migración de hosting. Es el plan de respaldo si no se adopta S3 para producción.
2. **Carpeta `media/` versionada en git.** Es la decisión vigente, solo para pruebas compartidas (ADR 0026).
3. **CDN o dominio propio delante del bucket público.** Complementa, no sustituye. Cambia `AWS_URL`. Requiere su propio ADR si se contrata.
4. **Servicio de medios con transformaciones (por ejemplo, Cloudinary).** Acopla el dominio a un proveedor. Hoy no hay necesidad de transformaciones: `api-008` excluye miniaturas y recortes.
5. **Binarios en MySQL (BLOB).** Descartada: infla la base administrada (ADR 0013), complica respaldos y exige DBR (Constitución V).
6. **Otros proveedores de nube con interoperabilidad S3.** El ADR 0013 dejó Google Cloud fuera como destino del sistema. Cualquier otro proveedor es una decisión aparte.

## 8. Preguntas que decidir al adoptarlo

1. ¿Qué proveedor se elige (Cloudflare R2, Amazon S3, DigitalOcean Spaces u otro) y cuáles son sus condiciones vigentes en esa fecha?
2. ¿Hay requisito de ubicación de los datos (país o región) para las fotos de visitantes?
3. ¿Cuánto dura la URL temporal de revisión (propuesta: 10 minutos como máximo) o se usa una ruta autenticada que entregue el binario?
4. Al aceptar, ¿la foto se mueve del bucket privado al público o se copia? (propuesta: mover)
5. ¿Se limpian los metadatos de las imágenes existentes al copiarlas? (propuesta: sí)
6. ¿Quién crea los buckets y las llaves, y se usan llaves separadas para el bucket público y el privado si el proveedor lo permite? (propuesta: infraestructura; dos buckets por ambiente)
7. ¿Qué retención de versiones y qué copia de respaldo fuera del proveedor se exigen?
8. ¿Qué procedimiento se aplica para retirar `media/memories/` del historial de git antes de producción?
9. ¿Se acepta la tensión con la Constitución I (protocolo S3 de origen de proveedor) o requiere enmienda?

## Referencias

- `docs/adr/0026-object-storage-s3-images.md` (decisión vigente: carpeta `media/`).
- `apps/api/specs/013-object-storage-images.md` (spec de la carpeta `media/`).
- `apps/api/specs/008-event-news-images.md` (RN-13, metadatos; disco público).
- `apps/api/specs/010-visitor-memory-requests.md` (CA-29, archivo al rechazar).
- `docs/database/requests/DBR-012-visitor-memories.md` (`image_path`, `published_image_path`).
- `docs/adr/0013-aiven-managed-mysql.md`.
- `CONSTITUTION.md` (I y V).
- `infra/README.md` (checklist de despliegue).
