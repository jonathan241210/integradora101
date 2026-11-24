# 0029 · Push de Android para el visitante (Expo sobre FCM)

- Estado: Aceptado
- Solicitada: 2026-11-14
- Aprobada: 2026-11-14
- Spec relacionada: `apps/api/specs/017-visitor-push-notifications.md`, `apps/mobile/specs/013-visitor-push-notifications.md`
- Planes: `apps/api/plan/017-visitor-push-notifications.md`, `apps/mobile/plan/013-visitor-push-notifications.md` (aprobados técnicamente)
- Aprobado por: Equipo móvil

Aceptado, este ADR autoriza instalar `expo-notifications` en `apps/mobile` cuando se implemente el push. No autoriza código por sí solo: faltan las tasks. No crea el proyecto FCM ni envía avisos reales.

## Contexto

La app del visitante es Android con Expo (ADR 0004) y el canal público previsto es Play Store (ADR 0012). `api-017` y `mobile-013` piden que una noticia, un evento o el resultado de un momento aparezcan en la barra del sistema con la app cerrada.

Hace falta un canal hasta FCM y una librería en el teléfono que obtenga el token y muestre el aviso. La API ya envía correo con el mailer de Laravel, sin SDK de proveedor (ADR 0011). El mismo criterio cabe para el push: HTTP desde Laravel, secreto en `.env`.

## Decisión

1. **Teléfono.** Cuando este ADR se acepte, la app podrá depender de `expo-notifications` para pedir el permiso de Android, crear los canales «Noticias y eventos» y «Momentos», obtener el token de Expo y mostrar el título y el cuerpo que manda la API. El identificador interno de los canales es `news-and-events` y `memories`.
2. **API.** El envío usa `Illuminate\Support\Facades\Http` contra la API HTTP de Expo (`EXPO_PUSH_URL`, por defecto `https://exp.host/--/api/v2/push/send`). No se instala un SDK de Expo ni de Firebase en PHP. `EXPO_ACCESS_TOKEN` vive solo en `.env`.
3. **FCM.** El proyecto de Firebase y la credencial de Android se configuran en el proyecto Expo (EAS), no dentro del repositorio. FCM entrega el mensaje al teléfono. Expo es el intermediario.
4. **Pruebas.** Los tests de la API sustituyen el gateway. Ningún test llama a Expo ni a FCM.
5. **Excepción de esquema.** `visitor_notification_preferences`, `visitor_push_tokens` y `push_dispatches` (DBR-017, Aprobada y Lista para backend) no usan SoftDeletes ni extienden `BaseModel`. Tokens y preferencias se borran físicamente con la cuenta, igual que `visitor_refresh_tokens` (`api-004` RN-08). `push_dispatches` solo guarda el tipo, el id y la clave de transición, para no repetir un aviso. Aceptar este ADR acepta esa excepción de la Constitución V para estas tres tablas. No son datos clínicos ni financieros.

## Alternativas consideradas

| Alternativa | A favor | En contra |
|---|---|---|
| HTTP de Laravel hacia Expo, y `expo-notifications` en el teléfono | Encaja con Expo y con el mailer sin SDK. FCM no se cobra por mensaje. El volumen de un zoológico cabe en ese servicio | Depende de Expo como intermediario y de un build de Play Store. Expo Go no sirve para el público |
| SDK de Firebase en PHP y en la app | Un salto menos | Paquete nuevo en la API, cuenta de servicio en el servidor y más superficie de la que este aviso necesita |
| Correo para noticias, eventos y momentos | El correo del visitante ya existe | Las specs lo dejan fuera. Un correo por cada noticia vacía el cupo del SMTP |
| Solo consultar la app al abrirla | Sin dependencia | No cumple el aviso en la barra con la app cerrada |

## Consecuencias

### Positivas

- El texto lo redacta la API y la barra lo muestra aunque el proceso de la app no esté en memoria.
- La API no gana un SDK. El secreto rota por `.env`, igual en local y en el servidor.
- Los tests no necesitan red.

### Riesgos o costos

- Hace falta un proyecto Expo con credencial FCM, un worker de cola y `schedule:run`. Sin eso el aviso no llega y el contenido publicado sí queda guardado.
- Cambiar de Expo más adelante obliga a sustituir el token y el gateway. La tabla de tokens no guarda datos de negocio, así que se puede vaciar.
- La excepción de SoftDeletes queda limitada a las tres tablas de esta decisión. No se extiende a momentos, noticias ni eventos.

## Validación y revisión

- Aprobación del equipo: registrada. La dependencia se instala con las tasks. FCM sigue fuera del repositorio.
- Revisión: al aceptar, el PR de implementación enlaza este ADR, las dos specs, los dos planes y DBR-017 en `Lista para backend`, y anota en `infra/README.md` el worker, el scheduler y `EXPO_ACCESS_TOKEN`.
- Constitución I: la dependencia móvil no entra al repositorio antes de esta aceptación.
