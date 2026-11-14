# 013 · visitor-push-notifications

- App dueña: `mobile`
- Apps/paquetes afectados: `mobile` (permiso de Android, preferencias en Ajustes, registro del token y apertura al tocar el aviso); `packages/api-client` (métodos y tipos, sin lógica de negocio); `api` (reglas, texto y envío, spec `api-017`).
- Estado: Aprobada
- Solicitante / responsable funcional: Aksel
- Aprobación funcional: Aksel, 2026-11-14
- Decisiones de alcance confirmadas el 2026-11-14: el aviso sale en la barra del sistema, también con la app cerrada; sin correo y sin bandeja dentro de la app; dos interruptores en Ajustes. «Noticias y eventos» nace apagado y «Estado de mis momentos» nace encendido.
- Dependencias de contrato: `api-017` (Aprobada). No se implementa hasta que el plan técnico esté aprobado por el equipo, con tasks, DBR-017 en `Lista para backend` y el ADR 0029 aceptado.
- Aprobar esta spec no autoriza implementar.

## Problema y contexto

La app del visitante es Android con Expo (ADR 0004) y se distribuirá por Play Store (ADR 0012). Hoy Ajustes no tiene notificaciones (`mobile-002` CA-14) y un momento solo muestra su estado al abrir «Mis momentos» (`mobile-010`).

Esta spec hace que el teléfono muestre el push de `api-017` en la barra del sistema y que, al tocarlo, abra la noticia, el evento o el momento. La API decide el texto y si el aviso corresponde. La app pide el permiso, registra el token y navega.

## Objetivos

- Mostrar en Ajustes dos interruptores: noticias y eventos, y estado de mis momentos.
- Pedir el permiso de notificaciones de Android al encender un interruptor o cuando el de momentos está encendido.
- Registrar el token del teléfono en la API y darlo de baja al cerrar sesión o al borrar la cuenta.
- Mostrar el título y el cuerpo que envió la API en la barra del sistema con la app abierta, en segundo plano o cerrada.
- Al tocar el aviso, abrir la pantalla que corresponde.

## Fuera de alcance

- Decidir cuándo se envía, el texto y las preferencias de otras cuentas. Eso es `api-017`.
- Correo y una pantalla de historial de avisos.
- iOS y Expo Go como canal del público. Hace falta un build de distribución (`mobile-008`).
- Redactar el aviso de privacidad oficial.
- Crear «Mis momentos» si `mobile-010` sigue sin esa pantalla: el toque de un momento espera esa ruta.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante con sesión y correo verificado | Activar cada tipo de aviso, conceder el permiso del teléfono y abrirlo desde la barra | Sesión de `mobile-004`; permiso de notificaciones de Android cuando el sistema lo exige |
| Visitante sin sesión o con correo sin verificar | No registra el teléfono | — |

## Historias de usuario

- Como visitante, quiero activar por separado las noticias y el resultado de mi foto, para no recibir lo que no pedí.
- Como visitante, quiero ver el aviso en la barra del teléfono aunque la app esté cerrada.
- Como visitante, quiero tocar el aviso y llegar a esa noticia, a ese evento o a mi momento.

## Criterios de aceptación

- **CA-01 (interruptores):** Dada Ajustes con sesión, cuando se muestra, entonces aparecen «Noticias y eventos» y «Estado de mis momentos», además de la cámara, la ubicación y las filas que ya existen. La pestaña Perfil sigue activa. No hay modo oscuro, idioma ni sonidos. Enmienda de `mobile-002` CA-14: esa spec dice que Ajustes no tiene notificaciones; al aprobar esta, el «no hay notificaciones» deja de aplicar y el resto de CA-14 se mantiene.
- **CA-02 (valores de la API):** Dada la primera lectura de preferencias, cuando Ajustes las muestra, entonces «Noticias y eventos» está apagado y «Estado de mis momentos» está encendido, salvo que `api-017` responda otra cosa. Cambiar un interruptor llama al `PATCH` de preferencias y deja el valor que la API confirma. Si el `PATCH` falla, el interruptor vuelve al valor anterior y se muestra el error.
- **CA-03 (permiso al encender):** Dado el permiso de notificaciones aún sin decidir, cuando la persona enciende un interruptor, o cuando entra con sesión y «Estado de mis momentos» está encendido, entonces la app pide el permiso de Android. En Android 13 o superior esa petición es el diálogo del sistema. En versiones anteriores, donde el permiso viene con la instalación, no se muestra un diálogo de más.
- **CA-04 (token):** Dado el permiso concedido y la sesión con correo verificado, cuando la app obtiene el token, entonces lo registra con `PUT /api/v1/visitor/push-tokens` y `platform` `android`. No guarda el token en almacenamiento común ni lo escribe en registros de depuración. Un registro repetido del mismo token no deja dos filas (lo resuelve la API, `api-017` CA-01).
- **CA-05 (permiso denegado):** Dado que la persona niega el permiso, cuando vuelve a Ajustes, entonces los interruptores pueden seguir como en la cuenta y un texto explica que los avisos del sistema están apagados y que se activan en los ajustes del teléfono. La app no registra un token.
- **CA-06 (apagar una preferencia):** Dado un interruptor encendido, cuando la persona lo apaga, entonces el `PATCH` guarda `false` y la API deja de incluirla en ese tipo (`api-017` RN-07). Apagar uno no borra el token si el otro sigue encendido.
- **CA-07 (cierre de sesión y borrado):** Dada una sesión que registró el token, cuando cierra sesión o borra la cuenta, entonces la app pide la baja de ese token y, al terminar el flujo de `mobile-004`, el teléfono ya no queda registrado con esa cuenta.
- **CA-08 (barra del sistema):** Dado un push de `api-017`, cuando llega con la app en primer plano, en segundo plano o cerrada, entonces Android lo muestra en la barra del sistema con el título y el cuerpo recibidos, no con un texto armado en la app. Hay dos canales, «Noticias y eventos» y «Momentos», alineados con las dos preferencias. El aviso de un momento no añade motivo ni opinión.
- **CA-09 (toque de noticia o evento):** Dado un aviso con `type` `news` o `event` y un `id`, cuando la persona lo toca, entonces la app abre `/news-detail` o `/event-detail` con ese `id`. Si esa ficha ya no existe, muestra «Ya no está disponible.» y permanece en el inicio.
- **CA-10 (toque de momento):** Dado un aviso con `type` `memory` y un `id`, cuando la persona lo toca, entonces abre esa petición en «Mis momentos» (`mobile-010`). No muestra el motivo en el aviso; el motivo se ve dentro de la pantalla, con sesión.
- **CA-11 (sin bandeja):** Dado el código de las pantallas nuevas, cuando se revisa, entonces no hay una lista de avisos recibidos. El único aviso visible fuera de Ajustes es el del sistema.
- **CA-12 (presentación):** Dado el código nuevo, cuando se revisa, entonces las pantallas no llaman a la API ni a `fetch`. El ViewModel usa `@arca/api-client`. La app no decide si una noticia «toca» enviarse.
- **CA-13 (cobertura):** Dada la suite de Jest con cliente simulado, cuando se ejecuta, entonces hay al menos una prueba que nombra cada CA-01 a CA-07 y CA-09 a CA-12. CA-08 se prueba en lo que el runtime de Jest puede afirmar (canales, título y cuerpo del aviso que se entregaría al sistema). La barra real con la app cerrada queda como evidencia manual en el PR, porque Jest no muestra la barra de Android.

## Reglas de negocio

- **RN-01 (el sistema muestra, la API redacta):** La app no cambia el título ni el cuerpo. Los muestra tal como llegaron.
- **RN-02 (permiso distinto de la preferencia):** El interruptor es la preferencia de la cuenta. El permiso es del teléfono. Hacen falta los dos para que el aviso aparezca. Negar el permiso no apaga la preferencia guardada (CA-05).
- **RN-03 (un token por teléfono):** La app registra el token del dispositivo donde corre y da de baja ese mismo token al salir de la cuenta.
- **RN-04 (MVVM):** Vistas en pantallas, ViewModel en el hook de preferencias y de la notificación, datos por `@arca/api-client`.
- **RN-05 (sin historial local):** La app no guarda una copia de los avisos en AsyncStorage ni en el almacenamiento seguro. El token de sesión sigue en `expo-secure-store` (`mobile-004`); el token push no se guarda ahí como historial.
- **RN-06 (Ajustes):** Se conservan cámara, ubicación, Privacidad, Ayuda y Acerca de. Se añaden solo los dos interruptores de esta spec.

## Datos, privacidad y auditoría

- La app envía el token push y las dos preferencias a la API. No envía la opinión, el motivo ni la foto en el aviso.
- El token no se muestra en pantalla.
- No requiere DBR propia. La DBR es `docs/database/requests/DBR-017-visitor-push-notifications.md`, abierta en Borrador.
- Antes del público, el aviso de privacidad debe mencionar el token. Esta spec no redacta ese texto (`api-017`).

## Flujos y errores

1. Con sesión, Ajustes lee las preferencias. Si «Estado de mis momentos» está encendido, pide el permiso y, si lo conceden, registra el token.
2. Encender el otro interruptor reutiliza el permiso ya concedido y hace `PATCH`.
3. Negar el permiso muestra el texto de CA-05 y no registra token.
4. Llega un push y Android lo muestra. Tocarlo abre la ficha o «Ya no está disponible.».
5. Cerrar sesión da de baja el token y sigue el flujo de `mobile-004` CA-11.
6. Sin red al guardar un interruptor: el interruptor vuelve al valor anterior y se muestra «Sin conexión.». Sin sesión no se registra el token.

## Dependencias, riesgos y preguntas

- Dependencias: `api-017`. La dependencia nativa `expo-notifications` queda propuesta en el ADR 0029 y no se instala mientras ese ADR siga en Propuesto. El plan de `api-017` fija el envío por HTTP al servicio push de Expo.
- `mobile-010` sigue en Borrador. CA-10 no tiene destino hasta que exista la pantalla de la petición. Si esta spec se implementa antes, el toque de un momento queda bloqueado por esa pantalla y no se inventa otra ruta.
- Riesgos: en un build de desarrollo sin las credenciales FCM el aviso no llega; la evidencia de CA-08 con la app cerrada pide un build de distribución. Quien niega el permiso no verá la barra.
- Preguntas pendientes: ninguna. Aksel confirmó el alcance y los valores iniciales el 2026-11-14.

## Revisión

- Aprobadores y fecha: Aksel, 2026-11-14 (aprobación funcional). La aprobación técnica del plan sigue pendiente.
- Evidencia/enlaces: `apps/api/specs/017-visitor-push-notifications.md`, `apps/mobile/plan/013-visitor-push-notifications.md`, `docs/adr/0029-visitor-android-push.md`, `apps/mobile/specs/002-mobile-ui-base-visitor-journey.md` (CA-14), `apps/mobile/specs/004-visitor-account.md`, `apps/mobile/specs/010-visitor-memory-requests.md`, `docs/adr/0004-mobile-react-native.md`, `docs/adr/0012-android-distribution-channel.md`.
