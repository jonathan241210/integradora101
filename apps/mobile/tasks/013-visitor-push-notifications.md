# Tareas · 013 · visitor-push-notifications

- Spec: `apps/mobile/specs/013-visitor-push-notifications.md` (Aprobada, Aksel, 2026-11-14)
- Plan: `apps/mobile/plan/013-visitor-push-notifications.md` (Aprobado técnicamente, Victor Adrian, 2026-11-14)
- ADR: `docs/adr/0029-visitor-android-push.md` (Aceptado, Aksel, 2026-11-14)
- Depende de: `apps/api/tasks/017-visitor-push-notifications.md` y de DBR-017 en `Lista para backend`
- Estado del checklist: **Aprobado** (Aksel, 2026-11-14). Autoriza el código de estas tareas, incluida `expo-notifications`. No autoriza credenciales FCM ni el PR.

Ninguna tarea añade alcance. Las vistas no importan `@arca/api-client` ni `fetch`. El cliente se simula en Jest. La barra de Android con la app cerrada no se afirma en Jest: queda como evidencia manual del PR de implementación.

## Puerta

- [x] **T-01** (precondición de CA-01 a CA-13): el contrato de la API está implementado.
  - Depende de: tasks de `api-017` aprobadas y hechas, en especial T-26 de esa lista (métodos en `packages/api-client/visitor.ts`) y T-27 (suite verde).
  - Archivos: ninguno en esta tarea.
  - Hecho cuando: `getNotificationPreferences`, `updateNotificationPreferences`, `registerPushToken` y `deletePushToken` existen en el paquete. Si faltan, detenerse. No se instala nada en esta tarea.

## Implementación

- [x] **T-02** (CA-08; RN-01): dependencia y permiso del sistema.
  - Depende de: T-01. Solo se ejecuta cuando este checklist esté aprobado.
  - Archivos: `apps/mobile/package.json`, `apps/mobile/app.json`.
  - Cambios: instalar `expo-notifications` con `npx expo install`, en la línea compatible con Expo SDK 57. Añadir el plugin y el permiso `POST_NOTIFICATIONS` con texto en español. No poner `cameraPermission: false` ni quitar el permiso `CAMERA` del QR. No crear proyecto FCM ni versionar credenciales.
  - Hecho cuando: el paquete está declarado y `app.json` pide el permiso en español. La nota de T-16 cita el texto usado.

- [x] **T-03** (CA-01, CA-02, CA-06; RN-02, RN-06): dos interruptores en Ajustes.
  - Depende de: T-01.
  - Archivos: `apps/mobile/src/screens/SettingsScreen.tsx`, `apps/mobile/src/app/(tabs)/settings.tsx`, `apps/mobile/src/viewmodels/useNotificationPreferences.ts`.
  - Cambios: la pantalla recibe props y no importa el cliente. El hook lee el GET y hace el PATCH. Etiquetas exactas: «Noticias y eventos» y «Estado de mis momentos». Se quedan la cámara, la ubicación, Cuenta, Privacidad, Ayuda, Acerca de y el cierre de sesión. No se añade pestaña, modo oscuro, idioma ni sonidos. La primera lectura pinta el primero apagado y el segundo encendido, salvo que la API responda otra cosa. Si el PATCH falla, el interruptor vuelve al valor anterior y se muestra el error. Apagar uno envía `false` y no da de baja el token si el otro sigue encendido.
  - Hecho cuando: T-07, T-08 y T-12 pasan, y T-18 confirma que la pantalla no importa el cliente.

- [x] **T-04** (CA-03, CA-04, CA-05; RN-02, RN-03, RN-05): permiso, canales y token.
  - Depende de: T-02, T-03.
  - Archivo: `apps/mobile/src/push/pushRegistration.ts`.
  - Cambios: al encender un interruptor, o al entrar con sesión si «Estado de mis momentos» está encendido, pide el permiso. En Android 13 o superior es el diálogo del sistema. En versiones anteriores no se muestra otro diálogo. Si lo niegan, no hay `PUT` y Ajustes explica que los avisos del sistema están apagados y que se activan en los ajustes del teléfono. Si lo conceden, obtiene el token de Expo y llama `registerPushToken` con `platform` `android`, una vez por valor de token. Canales: `news-and-events` con nombre «Noticias y eventos», y `memories` con nombre «Momentos». El token no se escribe en `console`, ni en AsyncStorage, ni en `expo-secure-store`. El handler de presentación deja `shouldShowBanner` y `shouldShowList` en verdadero y no reescribe título ni cuerpo.
  - Hecho cuando: T-09, T-10, T-11 y T-14 pasan.

- [x] **T-05** (CA-07; RN-03): baja del token al salir o al borrar la cuenta.
  - Depende de: T-04.
  - Archivos: `apps/mobile/src/session/accountSession.ts`, y el flujo que ya llama a `logout` y `deleteAccount` (`apps/mobile/src/app/(tabs)/settings.tsx`, `apps/mobile/src/app/(tabs)/delete-account.tsx`).
  - Cambios: antes de `auth/logout` o de `DELETE me`, llama a `deletePushToken` con el token de ese teléfono. Después sigue el flujo de `mobile-004`. Si no hay token registrado, el cierre y el borrado siguen igual.
  - Hecho cuando: T-13 pasa.

- [x] **T-06** (CA-09, CA-10; RN-01): toque del aviso.
  - Depende de: T-04.
  - Archivo: `apps/mobile/src/push/usePushNavigation.ts`.
  - Cambios: `type` `news` abre `/news-detail` con `id`. `type` `event` abre `/event-detail` con `id`. Si el detalle ya no existe, muestra «Ya no está disponible.» y se queda en el inicio. `type` `memory` abre `/memory-form` con ese `id`. Enmienda 2026-11-18: esa ruta espera la lista si el id no está en memoria y, si sigue ausente, muestra «Tu memoria». No se crea otra bandeja. El título y el cuerpo del sistema no se cambian, y el aviso del momento no añade motivo ni opinión.
  - Hecho cuando: T-15 y T-16 pasan.

## Pruebas

Las pruebas viven en `apps/mobile/__tests__/push-notifications.test.tsx`, con cliente y permiso simulados. Cada una nombra su CA en el título.

- [x] **T-07** (CA-01): Ajustes con sesión muestra «Noticias y eventos» y «Estado de mis momentos», además de la cámara, la ubicación y las filas que ya existen. No aparecen modo oscuro, idioma ni sonidos.
- [x] **T-08** (CA-02): la primera lectura pinta el primer interruptor apagado y el segundo encendido. Un cambio llama al PATCH y deja el valor que la API confirma. Si el PATCH falla, el interruptor vuelve al valor anterior y se muestra el error.
- [x] **T-09** (CA-03): con el permiso sin decidir, encender un interruptor o entrar con «Estado de mis momentos» encendido pide el permiso. El doble distingue Android 13 o superior del caso en el que el permiso ya viene con la instalación.
- [x] **T-10** (CA-04): con el permiso concedido, el registro llama `registerPushToken` con `platform` `android`. El test revisa que el módulo no escribe el token en almacenamiento común ni en un registro de depuración.
- [x] **T-11** (CA-05): negar el permiso deja los interruptores como en la cuenta, muestra el texto de los ajustes del teléfono y no registra token.
- [x] **T-12** (CA-06): apagar un interruptor envía `false`. Si el otro sigue encendido, no llama a `deletePushToken`.
- [x] **T-13** (CA-07): cerrar sesión y borrar la cuenta llaman a `deletePushToken` antes de terminar el flujo de `mobile-004`.
- [x] **T-14** (CA-08): el módulo declara los canales `news-and-events` y `memories` con los nombres visibles de la spec, y conserva el título y el cuerpo del payload. La barra con la app cerrada no se afirma aquí.
- [x] **T-15** (CA-09): un payload `news` o `event` navega al detalle de ese `id`. Si la ficha no existe, se muestra «Ya no está disponible.» y la app permanece en el inicio.
- [x] **T-16** (CA-10): un payload `memory` abre `/memory-form` con ese `id`. Enmienda 2026-11-18: la pantalla «Tu memoria» se afirma en `visitor-memories.test.tsx` cuando la petición no está.
- [x] **T-17** (CA-11): el árbol cubierto por la prueba no tiene una pantalla de lista de avisos.
- [x] **T-18** (CA-12): `SettingsScreen` no importa `@arca/api-client` ni `fetch`. La prueba no decide si una noticia se envía.

T-07 a T-18 son las pruebas. T-01 a T-06 son la puerta y la implementación.

## Calidad y entrega

- [x] **T-19** (CA-13): suite.
  - Depende de: T-07 a T-18.
  - Pasos: la suite Jest de `apps/mobile` que cubre `__tests__/push-notifications.test.tsx`.
  - Hecho cuando: hay al menos una prueba que nombra cada CA-01 a CA-07 y CA-09 a CA-12, y CA-08 afirma canales, título y cuerpo.

- [ ] **T-20**: evidencia manual de la barra.
  - Depende de: T-02, T-04. No se ejecuta en Jest.
  - Hecho cuando: el PR de implementación adjunta la evidencia de CA-08 con la app en primer plano, en segundo plano y cerrada, en un build de distribución. Sin credenciales FCM, el PR lo dice y no presenta esa captura como si el aviso hubiera llegado.

- [x] **T-21**: nota de permisos.
  - Depende de: T-02.
  - Archivo: `apps/mobile/docs/013-permiso-notificaciones.md`.
  - Hecho cuando: la nota dice cómo se pide el permiso, el texto en español de `POST_NOTIFICATIONS` y que el push no funciona en Expo Go.

- [ ] **T-22**: enlaces del PR.
  - Depende de: T-19, T-20, T-21.
  - Hecho cuando: el PR cita `mobile-013` y enlaza spec, plan, tasks, ADR 0029, DBR-017 y las tasks de `api-017`. No se abre ese PR en el corte que solo redacta este checklist.
