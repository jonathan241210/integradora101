# Plan técnico · 013 · visitor-push-notifications

- Spec: `apps/mobile/specs/013-visitor-push-notifications.md`
- Estado de spec: Implementada
- Solicitada: 2026-11-14
- Aprobada: 2026-11-14
- Estado del plan: Aprobado técnicamente. No autoriza código ni instalar `expo-notifications` hasta contar con tasks aprobadas. El ADR 0029 está Aceptado y DBR-017 está en `Lista para backend`.
- Responsable técnico: Frontend
- Dependencias: `api-017` (spec Aprobada; plan aprobado), ADR 0029 (Aceptado), DBR-017 (Lista para backend)

## Diseño de solución

La app registra el teléfono, muestra dos interruptores en Ajustes y abre la pantalla que indica el push. La API (`api-017`) decide el texto y si el aviso sale. Android muestra la barra del sistema con la app abierta, en segundo plano o cerrada, porque el título y el cuerpo vienen en el payload.

MVVM se mantiene: `SettingsScreen` recibe props; un hook lee y guarda preferencias y otro traduce el toque en una ruta. La red pasa por `@arca/api-client`. No hay lista de avisos.

`expo-notifications` se instala en el corte de implementación, cuando las tasks estén aprobadas. El ADR 0029 ya está Aceptado, el plan de `api-017` también, y DBR-017 está en `Lista para backend`. Este documento no instala la dependencia.

```text
Ajustes (View)
  → useNotificationPreferences (ViewModel)
      → @arca/api-client (GET/PATCH preferencias, PUT/DELETE token)
      → módulo de permiso (expo-notifications, tras el ADR)
Toque del sistema
  → usePushNavigation
      → /news-detail, /event-detail o la petición de mobile-010
```

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Paquete | `packages/api-client/visitor.ts` | `getNotificationPreferences`, `updateNotificationPreferences`, `registerPushToken`, `deletePushToken`. Tipos en inglés. Sin reglas |
| Pantalla | `apps/mobile/src/screens/SettingsScreen.tsx` | Dos interruptores: «Noticias y eventos» y «Estado de mis momentos». Cámara, ubicación y filas actuales se quedan |
| ViewModel | `apps/mobile/src/viewmodels/useNotificationPreferences.ts` (nuevo) | Lee el GET, hace PATCH, revierte el interruptor si falla y pide el permiso |
| Permiso y token | `apps/mobile/src/push/pushRegistration.ts` (nuevo) | Pide el permiso, crea los dos canales y registra el token. No se escribe el token en `console` ni en AsyncStorage |
| Navegación | `apps/mobile/src/push/usePushNavigation.ts` (nuevo) | Lee `data.type` y `data.id` y abre la ruta. Texto de sistema intacto |
| Sesión | Flujo de cierre y de borrado de `mobile-004` | Antes de `auth/logout` o `DELETE me`, llama a `deletePushToken` con el token de ese teléfono |
| Configuración | `app.json`, solo cuando el ADR esté aceptado | Plugin de notificaciones y el permiso `POST_NOTIFICATIONS` con texto en español |
| Pruebas | `apps/mobile/__tests__/push-notifications.test.tsx` | CA-01 a CA-07 y CA-09 a CA-12 con cliente y permiso simulados |
| Documentación | `apps/mobile/docs/` una nota de permisos, en el PR de implementación | Cómo se pide el permiso y qué build hace falta |

## Contrato y datos

La app consume las rutas de `api-017`:

- `GET /api/v1/visitor/notification-preferences`
- `PATCH /api/v1/visitor/notification-preferences` con `news_and_events` y `memory_status`
- `PUT /api/v1/visitor/push-tokens` con `{ token, platform: "android" }`
- `DELETE /api/v1/visitor/push-tokens` con `{ token }`

La primera lectura pinta «Noticias y eventos» apagado y «Estado de mis momentos» encendido (CA-02). Esos valores los confirma la API (RN-03 de `api-017`).

Canales Android, creados al preparar el registro:

- `news-and-events`, nombre visible «Noticias y eventos»
- `memories`, nombre visible «Momentos»

El identificador del canal coincide con `channelId` del plan de `api-017`.

### Permiso

En Android 13 o superior, encender un interruptor o entrar con sesión mientras «Estado de mis momentos» está encendido llama a la petición del sistema (CA-03). En versiones anteriores el permiso viene con la instalación y no se muestra otro diálogo. Si la persona lo niega, los interruptores conservan el valor de la cuenta y la pantalla muestra que los avisos del sistema se activan en los ajustes del teléfono (CA-05). En ese caso no hay `PUT`.

Con el permiso concedido, el módulo obtiene el token de Expo y hace `PUT` una vez por valor de token (CA-04).

Apagar un interruptor solo hace `PATCH` en `false`. El token se queda si el otro interruptor sigue encendido (CA-06). Si ambos quedan apagados, el token puede seguir registrado: la API ya no encola esos tipos (`api-017` RN-07).

### Barra y toque

El handler de presentación deja el aviso visible también en primer plano (`shouldShowBanner` y `shouldShowList` en verdadero), para que la barra del sistema lo muestre con la app abierta (CA-08). El título y el cuerpo no se reescriben.

Al tocar:

- `type` `news` abre `/news-detail` con `id`.
- `type` `event` abre `/event-detail` con `id`.
- Si el detalle responde que ya no existe, la app muestra «Ya no está disponible.» y se queda en el inicio (CA-09).
- `type` `memory` abre `/memory-form` con `id` (`mobile-010`). Enmienda: la ruta espera la lista si el id no está en memoria. Si sigue ausente, muestra «Tu momento». No se crea otra pantalla de bandeja.

No se añade una pantalla de historial (CA-11). Las vistas no importan `fetch` ni el cliente HTTP (CA-12).

### Cierre de sesión

El flujo de `mobile-004` CA-11 y el de borrado de cuenta llaman antes a `DELETE /visitor/push-tokens` con el token de ese aparato. Si no hay token local, el cierre sigue. Un fallo de red en esa baja no bloquea el cierre: la API, al borrar la cuenta, elimina todos los tokens (CA-13 de `api-017`). En un cierre de sesión normal el token queda huérfano solo si el `DELETE` no llegó; el siguiente inicio de sesión en ese teléfono vuelve a hacer `PUT` del mismo token y la fila sigue siendo una (CA-01 de la API).

## Seguridad, offline y operación

- El token push no se muestra en pantalla, no se guarda en AsyncStorage y no se escribe en registros de depuración. La sesión sigue en `expo-secure-store` (`mobile-004`).
- Sin sesión no se registra el token.
- Sin red al cambiar un interruptor, el control vuelve al valor anterior y el texto es «Sin conexión.»
- El aviso con la app cerrada depende de un build con credenciales FCM del proyecto Expo (ADR 0029 y ADR 0012). Expo Go no es la prueba de CA-08 en dispositivo real.
- Jest no pinta la barra de Android. CA-08 se afirma por los canales y por el título y el cuerpo que el módulo entregaría al sistema. La barra con la app cerrada queda como evidencia manual del PR de implementación.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | Ajustes muestra los dos interruptores y conserva cámara, ubicación y filas; Perfil sigue activo | `apps/mobile/__tests__/push-notifications.test.tsx` |
| CA-02 | Valores iniciales del GET y reversión si el PATCH falla | El mismo archivo |
| CA-03 | Encender un interruptor, o entrar con momentos encendido, llama al permiso simulado | El mismo archivo |
| CA-04 | Con permiso concedido se llama `registerPushToken` con `platform` `android` | El mismo archivo |
| CA-05 | Permiso denegado muestra el texto de ajustes del teléfono y no registra token | El mismo archivo |
| CA-06 | Apagar un interruptor envía `false` y no llama a la baja del token si el otro sigue encendido | El mismo archivo |
| CA-07 | Cerrar sesión llama a `deletePushToken` antes del logout | El mismo archivo, sobre el flujo de sesión simulado |
| CA-08 | El módulo declara los dos canales y conserva título y cuerpo del payload | El mismo archivo. La barra con la app cerrada es evidencia manual del PR |
| CA-09 | Un payload `news` o `event` navega al detalle; el caso agotado muestra «Ya no está disponible.» | El mismo archivo |
| CA-10 | Un payload `memory` abre `/memory-form` con ese `id`. Si la lista no lo trae, se muestra «Tu momento» | El mismo archivo para la ruta. La pantalla vacía está en `apps/mobile/__tests__/visitor-memories.test.tsx` |
| CA-11 | No existe una pantalla de lista de avisos en el árbol cubierto por la prueba | El mismo archivo |
| CA-12 | `SettingsScreen` no importa el cliente HTTP | El mismo archivo, revisión del módulo de pantalla |
| CA-13 | Los nombres de las pruebas incluyen CA-01 a CA-07 y CA-09 a CA-12 | El mismo archivo |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | El ADR 0029 está Aceptado. `expo-notifications` se instala con las tasks, no con este plan. El resto del cliente sigue en Expo (ADR 0004) |
| II. La spec manda | Sí, en este documento | Spec aprobada. Plan aprobado. Las tasks quedan en borrador hasta su aprobación. No hay código |
| III. Lógica separada de la interfaz | Sí | La pantalla no decide envíos ni redacta el aviso. El hook llama a `@arca/api-client` |
| IV. Un test por criterio | Sí, al implementar | La tabla cubre los CA automatizables. CA-08 en dispositivo cerrado queda manual, como dice la spec |
| V. Una sola fuente de verdad para los datos | Sí | No hay DBR móvil. Preferencias y tokens viven en la API (DBR-017) |
| VI. Código en inglés, personas en español | Sí | Archivos, canales internos y tipos en inglés. Etiquetas de Ajustes y el texto de permiso denegado en español |

## Riesgos y decisiones

- El ADR 0029 ya está Aceptado. La dependencia y el plugin de `app.json` entran al implementar las tasks, no antes.
- CA-10 abre `/memory-form` con `id`. Enmienda: espera la lista antes de decir que la petición falta. No se crea otra bandeja.
- Sin credenciales FCM en el build de EAS el teléfono no muestra la barra, aunque la API encole el job.
- Quien niega el permiso conserva la preferencia de la cuenta y no recibe la barra (RN-02).

## Orden y aprobación

1. El plan y el ADR 0029 quedaron aprobados y aceptados.
2. `api-017` tiene su plan aprobado y DBR-017 en `Lista para backend`. Los endpoints se despliegan al implementar las tasks de la API.
3. Las tasks de esta app se redactan en borrador. `expo-notifications`, los tests y la nota de permisos entran cuando esas tasks estén aprobadas.
4. La evidencia manual de la barra con la app cerrada se adjunta al PR, con un build de distribución.

Aprobación funcional de la spec: Aprobada. Aprobación técnica de este plan: Aprobada.

## Enmienda de actualización de Inicio · 2026-11-24

- Estado del plan de la enmienda: Aprobado por la persona solicitante, 2026-11-24.
- En la capa móvil de push, observar recepción y apertura de avisos públicos con `type` e `id` validados. Conectar la señal al ViewModel de Inicio mediante una suscripción que se retire al desmontar. Respetar la navegación existente de las aperturas. Usar las señales existentes de primer plano y reconexión para comprobar la vigencia de noticias y eventos.
- Reutilizar `ZooRepository` y las rutas públicas `GET /api/v1/news?limit=3` y `GET /api/v1/events?limit=3`. La respuesta de la API determina la vigencia. Al recibir un aviso público, pedir datos recientes aunque la caché siga vigente. El regreso a primer plano y la reconexión respetan la vigencia de caché. Agrupar señales simultáneas y conservar las listas visibles si falla la consulta. Los avisos de momentos siguen su navegación y no provocan esa recarga.
- CA-14: Jest para recepción y apertura de aviso público, regreso a primer plano, reconexión, preferencia apagada, aviso de momento y error de red. Verificación Android con suscripción activa y APK de pruebas.
- Constitución I–VI: Expo Notifications, AppState y conectividad existentes, alcance y plan de CA-14 aprobados, consultas en repositorio y control de sesión existente, pruebas de señales y estado, sin cambio de persistencia ni DBR, identificadores en inglés y estados en español.
- Orden aprobado: desglosar tareas, implementar y probar con el APK y la API de pruebas.
