# Plan técnico · 013 · visitor-push-notifications

- Spec: `apps/mobile/specs/013-visitor-push-notifications.md`
- Estado de spec: Aprobada (Aksel, 2026-11-14)
- Estado del plan: Pendiente de aprobación del equipo. Este documento no autoriza código, tasks ni instalar `expo-notifications`.
- Responsable técnico: por identificar
- Solicitante funcional: Aksel
- Dependencias: `api-017` (spec Aprobada; su plan sigue pendiente), ADR 0029 (Propuesto), DBR-014 (Borrador)

## Diseño de solución

La app registra el teléfono, muestra dos interruptores en Ajustes y abre la pantalla que indica el push. La API (`api-017`) decide el texto y si el aviso sale. Android muestra la barra del sistema con la app abierta, en segundo plano o cerrada, porque el título y el cuerpo vienen en el payload.

MVVM se mantiene: `SettingsScreen` recibe props; un hook lee y guarda preferencias y otro traduce el toque en una ruta. La red pasa por `@arca/api-client`. No hay lista de avisos.

`expo-notifications` no se instala mientras el ADR 0029 siga en Propuesto. El plan deja el punto de integración; la implementación espera la aceptación del ADR, el plan de `api-017` y DBR-014 en `Lista para backend`.

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
- `type` `memory` abre la petición en «Mis momentos». Esa pantalla la define `mobile-010`, que sigue en Borrador. Hasta que exista la ruta, la tarea de CA-10 no se implementa y no se inventa otra pantalla (CA-10).

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
| CA-10 | Un payload `memory` pide la ruta de «Mis momentos» | El mismo archivo, con la ruta inyectada. Si `mobile-010` no tiene pantalla, el test queda fuera de la implementación hasta esa ruta |
| CA-11 | No existe una pantalla de lista de avisos en el árbol cubierto por la prueba | El mismo archivo |
| CA-12 | `SettingsScreen` no importa el cliente HTTP | El mismo archivo, revisión del módulo de pantalla |
| CA-13 | Los nombres de las pruebas incluyen CA-01 a CA-07 y CA-09 a CA-12 | El mismo archivo |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Pendiente del ADR | `expo-notifications` no se instala con este plan. El ADR 0029 está Propuesto. El resto del cliente sigue en Expo (ADR 0004) |
| II. La spec manda | Sí, en este documento | Spec Aprobada por Aksel el 2026-11-14. Este plan no está aprobado. No hay tasks ni código |
| III. Lógica separada de la interfaz | Sí | La pantalla no decide envíos ni redacta el aviso. El hook llama a `@arca/api-client` |
| IV. Un test por criterio | Sí, al implementar | La tabla cubre los CA automatizables. CA-08 en dispositivo cerrado queda manual, como dice la spec |
| V. Una sola fuente de verdad para los datos | Sí | No hay DBR móvil. Preferencias y tokens viven en la API (DBR-014) |
| VI. Código en inglés, personas en español | Sí | Archivos, canales internos y tipos en inglés. Etiquetas de Ajustes y el texto de permiso denegado en español |

## Riesgos y decisiones

- ADR 0029 debe aceptarse antes de añadir la dependencia o el plugin de `app.json`.
- CA-10 depende de la pantalla de `mobile-010`. No se crea una ruta provisional.
- Sin credenciales FCM en el build de EAS el teléfono no muestra la barra, aunque la API encole el job.
- Quien niega el permiso conserva la preferencia de la cuenta y no recibe la barra (RN-02).

## Orden y aprobación

1. El equipo aprueba este plan y acepta el ADR 0029.
2. `api-017` tiene su plan aprobado, DBR-014 en `Lista para backend` y los endpoints desplegados en el ambiente de pruebas.
3. Se instala `expo-notifications` en el corte de implementación, se escriben las tasks y los tests, y se actualiza la nota de permisos.
4. La evidencia manual de la barra con la app cerrada se adjunta al PR, con un build de distribución.

Aprobación funcional de la spec: Aksel, 2026-11-14. Aprobación técnica de este plan: pendiente.
