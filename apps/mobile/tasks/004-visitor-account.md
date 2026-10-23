# Tareas · 004 · visitor-account

- Spec: `apps/mobile/specs/004-visitor-account.md` (Implementada, 2026-10-21; aprobación funcional de Aksel, 2026-10-20)
- Plan: `apps/mobile/plan/004-visitor-account.md` (Aprobado, Aksel, 2026-10-20)
- Estado del checklist simulado (T-01 a T-30): Aprobado por Aksel, 2026-10-20, e integrado.
- Estado del checklist HTTP (T-31 a T-44): Aprobado por Aksel, 2026-10-21.

## Alcance

T-01 a T-30 están bajo `apps/mobile` y ya están hechas. No hay tarea de base de datos: la app no crea migraciones ni toca DBR.

T-31 a T-44 son la fase HTTP. Además de `apps/mobile`, tocan `packages/api-client` en un módulo nuevo. Aksel las aprobó el 2026-10-21. Sin `EXPO_PUBLIC_API_URL`, Jest y la app siguen con el mock y el doble de tokens en memoria.

## Fuera de este checklist

No se reabren T-01 a T-30. Siguen fuera de las dos fases:

- `apps/web`, `apps/dashboard` y `packages/api-client/auth.ts`. El cliente de personal, sus cookies y su CSRF no cambian.
- `apps/api`: los endpoints de `api-004` ya existen y este checklist solo los consume.
- Migraciones, SQL y `docs/database`.
- `@react-native-async-storage/async-storage` y la cola de escaneos. Eso es `mobile-005`.
- Login con Google, iOS, progreso, QR y mapa.
- Producción y la base `arca_zoo`.

ADR 0011 está aceptado (Aksel, 2026-10-21). `expo-secure-store` entra en T-31, ya con este tramo aprobado. No se instala `@react-native-async-storage/async-storage`.

## Corte 1 · Sesión, login y logout

- [x] **T-01** (RN-02): Crear `src/constants/avatarCatalog.ts` con los códigos `jaguar`, `lion`, `elephant`, `macaw`, `monkey`, `turtle`, `deer` y `wolf`, y placeholders en `src/assets/avatars/`.
- [x] **T-02** (CA-05, RN-04): Crear `src/services/tokenStorage.ts` con la interfaz de lectura, escritura y borrado del par de tokens, más un doble en memoria para pruebas. No agregar la dependencia `expo-secure-store`.
- [x] **T-03** (CA-05, CA-06, CA-11, CA-12): Crear `src/repositories/authRepository.ts` y `src/repositories/mockAuthRepository.ts` (login, logout y refresh de una sola petición en vuelo). La sesión de cuenta deja de usar `visitorAccessRepository`. Sin red.
- [x] **T-04** (CA-01, CA-05, CA-11): Crear `src/session/SessionProvider.tsx` y `src/viewmodels/useSessionViewModel.ts` con estados `bootstrapping`, `guest` y `authenticated`.
- [x] **T-05** (CA-01): Agregar `src/app/(auth)/welcome.tsx` y las guardias en `src/app/_layout.tsx`: sin sesión se muestra la bienvenida y no las pestañas; con sesión se entra a `(tabs)`.
- [x] **T-06** (CA-05, CA-11, RN-06): Integrar login y logout sobre `src/screens/LoginScreen.tsx`, `src/app/(auth)/login.tsx` y el cierre de sesión de ajustes. Quitar «Entrar como invitado». Textos en español.
- [x] **T-07** (CA-04, RN-08): En el ViewModel de login, mostrar en español y de forma accesible el 422 «Correo o contraseña incorrectos.» o la validación, el 403 `email_not_verified` hacia verificación, el 429 con la espera y «Sin conexión» sin encolar credenciales.
- [x] **T-08** (CA-01): Crear `test-ca-01-auth-welcome-redirect` en `__tests__/auth/`: sin sesión se ve la bienvenida y no las pestañas.
- [x] **T-09** (CA-04): Crear `test-ca-04-auth-errors` en `__tests__/auth/` para el login: 422, 403 hacia verificación, 429 y sin conexión.
- [x] **T-10** (CA-05): Crear `test-ca-05-login-stores-tokens` en `__tests__/auth/`: el par queda en el doble de `TokenStorage`, no en almacenamiento común, y la app entra a las pestañas.
- [x] **T-11** (CA-06): Crear `test-ca-06-refresh-single-flight` en `__tests__/auth/`: varias llamadas simuladas con 401 esperan un solo refresh del repositorio; si falla, la sesión vuelve a la bienvenida. El cliente HTTP del paquete no entra en esta prueba.
- [x] **T-12** (CA-11): Crear `test-ca-11-logout` en `__tests__/auth/`: logout borra los tokens y regresa a la bienvenida.

## Corte 2 · Resto de la cuenta

- [x] **T-13** (CA-02, RN-01, RN-02): Integrar el registro en la pantalla ya existente para pedir correo, nombre, apodo, contraseña y confirmación, la casilla «Soy mayor de 18 años», la aceptación del aviso y el selector de los 8 avatares.
- [x] **T-14** (CA-02, RN-01): Mostrar el aviso desde el repositorio simulado (`version` y contenido) y enviar `privacy_notice_version` al registrarse. Pantalla o modal solo en `src/`.
- [x] **T-15** (CA-03): Agregar `src/app/(auth)/verify-email.tsx` con el código de 6 dígitos y el reenvío con espera cuando el repositorio simulado responde 429.
- [x] **T-16** (CA-07): Integrar `src/app/(auth)/forgot-password.tsx` y `src/app/(auth)/reset-password.tsx`: respuesta genérica de correo, código, nueva contraseña con confirmación y regreso al login.
- [x] **T-17** (CA-08, RN-03): Agregar la edición de cuenta (apodo, nombre y avatar del catálogo) enlazada desde el botón de configuración. El perfil visible del menor sigue mostrando solo apodo y avatar.
- [x] **T-18** (CA-09): Agregar la pantalla de cambio de contraseña (actual, nueva y confirmación) que llama al repositorio simulado y mantiene la sesión actual.
- [x] **T-19** (CA-10, RN-07): Agregar el borrado con confirmación de contraseña: el repositorio simulado responde el borrado, se limpia `TokenStorage`, el puerto de cola local no hace nada todavía y se vuelve a la bienvenida. El aviso de que el borrado es definitivo aparece antes de pedir la contraseña.
- [x] **T-20** (CA-02): Crear `test-ca-02-register-form` en `__tests__/auth/`: campos, casillas, selector de avatar y enlace al aviso.
- [x] **T-21** (CA-03): Crear `test-ca-03-verify-email-flow` en `__tests__/auth/`: tras el alta simulada se muestra la verificación y el reenvío respeta la espera.
- [x] **T-22** (CA-04): Ampliar `test-ca-04-auth-errors` para registro y verificación, con los mismos mensajes en español.
- [x] **T-23** (CA-07): Crear `test-ca-07-password-recovery-flow` en `__tests__/auth/`: olvido, código, nueva contraseña y regreso al login.
- [x] **T-24** (CA-08): Crear `test-ca-08-profile-patch` en `__tests__/auth/`: la edición guarda apodo, nombre y avatar en el repositorio simulado.
- [x] **T-25** (CA-09): Crear `test-ca-09-change-password` en `__tests__/auth/`: el cambio llama al repositorio y la sesión sigue activa.
- [x] **T-26** (CA-10): Crear `test-ca-10-delete-account` en `__tests__/auth/`: borrado, tokens limpios y bienvenida.

## Calidad y entrega

- [x] **T-27** (CA-12): Ampliar `__tests__/architecture.test.ts` con `test-ca-12-auth-mvvm`: las pantallas y ViewModels de cuenta no usan `fetch` ni `axios`, y los tokens solo pasan por `TokenStorage`.
- [x] **T-28** (CA-13): Dejar `usesCleartextTraffic` en `false` en `app.json` y crear `test-ca-13-android-cleartext-config` en `__tests__/auth/`.
- [x] **T-29** (CA-14, RN-06): Confirmar que `__tests__/auth/` nombra CA-01 a CA-14 y ejecutar la suite Jest de `apps/mobile`.
- [x] **T-30**: Actualizar `README.md` y `docs/arquitectura.md` de esta app con el flujo de cuenta simulada y el doble de tokens. La fase HTTP quedó en T-31 a T-44.

Cada CA-01 a CA-14 tiene al menos una tarea de prueba que lo nombra en T-01 a T-30. Esas tareas no salen de `apps/mobile`.

## Fase HTTP · aprobada

Aksel aprobó T-31 a T-44 el 2026-10-21. El contrato es el de `apps/api/plan/004-visitor-authentication.md`: campos en inglés, mensajes `message` en español, par de tokens dentro de `data` (`token_type`, `expires_in`, `access_token`, `refresh_token`, `visitor`) y aviso en `data.version` / `data.content`.

- [x] **T-31** (CA-05, RN-04): Instalar solo `expo-secure-store` con `npx expo install expo-secure-store` desde `apps/mobile`. No instalar `@react-native-async-storage/async-storage`. No tocar `apps/api`.
- [x] **T-32** (CA-05, RN-04): En `src/services/tokenStorage.ts`, añadir `createSecureTokenStorage`. Lee, escribe y borra el par con las claves `arca.visitor.access_token` y `arca.visitor.refresh_token`. Conservar `createMemoryTokenStorage` y el singleton en memoria que ya usan las pruebas. No escribir tokens en la consola.
- [x] **T-33** (CA-05): Crear `__tests__/auth/secure-store.test.ts` con `test-ca-05-secure-store-adapter`. Con `expo-secure-store` simulado, el adaptador guarda y borra esas claves. La prueba comprueba que no usa AsyncStorage.
- [x] **T-34** (CA-02, CA-03, CA-04, CA-06, CA-07, CA-08, CA-09, CA-10, CA-11, CA-12): Crear `packages/api-client/visitor.ts` con `createVisitorApi` y exportarlo desde `index.ts`. La base URL llega por argumento. Métodos y rutas: `GET /api/v1/visitor/legal/privacy-notice`, `POST /api/v1/visitor/auth/register`, `POST .../auth/email/verify`, `POST .../auth/email/resend`, `POST .../auth/login`, `POST .../auth/refresh`, `POST .../auth/logout`, `POST .../auth/password/forgot`, `POST .../auth/password/reset`, `GET` y `PATCH /api/v1/visitor/me`, `PUT /api/v1/visitor/me/password`, `DELETE /api/v1/visitor/me`. El access token sale de un callback y viaja en `Authorization: Bearer`. Los errores usan la forma `ApiError` ya existente: estado, `message`, `code`, `errors` y `retryAfterSeconds`. El login recibe `device_name`. No editar `auth.ts` ni el comportamiento de cookies y CSRF de `createHttpClient`.
- [x] **T-35** (CA-06): En ese mismo módulo, un solo `POST /api/v1/visitor/auth/refresh` en vuelo. Las peticiones que reciban 401 esperan esa promesa, guardan el par nuevo por callback y reintentan una vez. Si el refresh falla o responde 401, no hay otro refresh y se avisa para cerrar la sesión. El cuerpo es `{ "refresh_token": "…" }`. La ruta de refresh es pública y no depende del access token vencido.
- [x] **T-36** (CA-06, CA-14): Crear `__tests__/auth/visitor-client.test.ts` con `test-ca-06-visitor-refresh-single-flight`. Con `fetch` simulado, varias llamadas concurrentes que reciben 401 producen un solo refresh y el reintento lleva el access token nuevo. Un refresh fallido no dispara otro.
- [x] **T-37** (CA-02, CA-03, CA-04, CA-07, CA-08, CA-09, CA-10, CA-11, CA-12): Crear `src/repositories/httpAuthRepository.ts`, que implementa `AuthRepository` con `createVisitorApi` y `TokenStorage`. Traduce el `snake_case` del contrato (`first_name`, `avatar_code`, `privacy_notice_version`, envoltura `data`) a los tipos que la app ya usa. El login envía `device_name` con el valor fijo `arca-mobile`. Un fallo de red, un 422, un 403 `email_not_verified` y un 429 se convierten en los resultados que las pantallas ya muestran, incluido «Sin conexión». Este archivo no llama `fetch` ni `axios` y no escribe contraseñas, códigos ni tokens en la consola.
- [x] **T-38** (CA-04, CA-08, CA-10, CA-11): Crear `__tests__/auth/http-auth-repository.test.ts`. Con un cliente simulado, el repositorio guarda el par al entrar, envía `arca-mobile`, traduce perfil y aviso, y en logout y borrado limpia el almacenamiento. Un rechazo de red devuelve «Sin conexión». Los nombres de prueba citan CA-04, CA-08, CA-10 y CA-11.
- [x] **T-39** (CA-01, CA-05, RN-08): En `accountSession`, si `EXPO_PUBLIC_API_URL` está vacía, seguir con el mock y el almacenamiento en memoria. Jest y las cuentas `123456` quedan igual. Si la variable tiene valor, usar `HttpAuthRepository` y `createSecureTokenStorage`. Al arrancar con tokens, llamar `GET me`. Si la sesión no se puede renovar, borrar los tokens y quedar en `guest`. `resetForTests` vuelve al mock y a la memoria.
- [x] **T-40** (CA-01, CA-05): Añadir la prueba del arranque HTTP en `__tests__/auth/`. Con la URL definida y un cliente simulado, `GET me` en 200 deja la sesión autenticada. Si el refresh falla, el estado vuelve a `guest` y el almacenamiento queda vacío. Sin la variable, la suite ya aprobada sigue en el mock. Los nombres de prueba citan CA-01 y CA-05.
- [x] **T-41** (CA-12): Ampliar `test-ca-12-auth-mvvm` en `__tests__/architecture.test.ts`. `httpAuthRepository.ts` y `accountSession.ts` tampoco usan `fetch` ni `axios`. El código de cuenta de `apps/mobile/src` no importa `packages/api-client/auth.ts`.
- [x] **T-42** (CA-13, RN-05): Documentar `EXPO_PUBLIC_API_URL` en `apps/mobile/README.md` como origen de la API de pruebas, sin secretos y sin apuntar a producción ni a `arca_zoo`. Confirmar que `usesCleartextTraffic` sigue en `false` en `app.json`. No versionar `.env`.
- [x] **T-43** (CA-14): Actualizar `packages/api-client/README.md` con el módulo visitante y `apps/mobile/docs/arquitectura.md` con la selección mock/HTTP. Ejecutar la suite Jest de `apps/mobile`. El paquete no tiene script de pruebas: la evidencia es esa suite.
- [x] **T-44**: Smoke manual contra la API de pruebas, nunca contra `arca_zoo`: registro, código, login, una llamada autenticada, refresh y logout. Anotar aquí el resultado al cerrar la tarea. Si la API no está levantada, la tarea sigue abierta. Resultado 2026-10-21, `php artisan serve` en local contra la base de pruebas: registro 201, verificación 200, perfil 200, refresh 200, logout 204 y un login posterior 200. La cuenta de prueba se borró al terminar.

CA-01 a CA-14 siguen cubiertos por las pruebas de T-08 a T-29. T-33, T-36, T-38, T-40, T-41 y T-43 añaden la evidencia de la fase HTTP. `auth.ts`, la web y el dashboard no se editan.

Cierre 2026-10-21: Jest de `apps/mobile` en verde (95 pruebas) y `npx tsc --noEmit` sin errores. La spec quedó en Implementada. El PR enlaza spec, plan y tasks.

- [x] **T-45** (CA-01, CA-05): Enmienda 2026-10-23. Un segundo toque en la bienvenida no apila otra ruta. Login, registro, verificación, reenvío, olvido y restablecimiento ignoran otro toque mientras la petición sigue, desactivan el botón y tapan la pantalla. `test-ca-05-login-ignores-a-second-tap` cubre el doble toque del login.
- [x] **T-46** (CA-08, CA-09, CA-10, CA-11): Enmienda 2026-10-23. Guardar perfil, guardar contraseña, borrar cuenta y cerrar sesión ignoran otro toque mientras la petición sigue, desactivan el botón y tapan la pantalla. La validación local no enciende el indicador. Cada acción tiene una prueba de doble toque.
- [x] **T-47**: Enmienda 2026-10-23. Si la sesión ya está autenticada, `bootstrap()` no vuelve a pedir el perfil. Ajustes sigue leyéndolo una vez para mostrar nombre y correo. La prueba está en `__tests__/auth/http-bootstrap.test.ts`.
- [x] **T-48** (CA-01, CA-10, CA-11): Enmienda UX 2026-10-23. `nextGateRoute` y logout/borrado van a `/login`; `/welcome` redirige; spec y pruebas de compuerta actualizadas.
- [x] **T-49** (CA-08): Enmienda UX 2026-10-23. Guardar perfil sin cambios muestra aviso y no llama `PATCH`. Prueba `test-ca-08-profile-unchanged`.
- [x] **T-50** (CA-08, CA-09): Enmienda UX 2026-10-23. `useFocusEffect` limpia avisos y contraseñas al salir de edición de perfil y cambio de contraseña. Pruebas `test-ca-08-profile-focus-reset` y `test-ca-09-password-focus-reset`.
- [x] **T-51** (CA-04): Enmienda UX 2026-10-23. Placeholder de contraseña en login en texto claro («Escribe tu contraseña»).
- [x] **T-52** (CA-08, escenario 7): Enmienda 2026-10-23. Caché de perfil con una sola petición en vuelo en `accountSession`: `peekProfile`, `getProfile`, llenado en bootstrap HTTP, login y verificación, y actualización con el perfil del `PATCH`. Logout, borrado, refresh fallido y `resetForTests` vacían la copia.
- [x] **T-53** (CA-08, escenario 7): Enmienda 2026-10-23. Hook `useVisitorProfile`. Perfil, ajustes y edición leen la copia. Ajustes no inicia con la ficha de demostración. Editar rellena el formulario desde la copia y solo pide `GET /me` si está vacía.
- [x] **T-54** (CA-08, escenario 7): Enmienda 2026-10-23. `test-ca-08-profile-single-load` y `test-ca-08-settings-sin-ficha-demo` en `__tests__/auth/profile-single-load.test.tsx`. Dos consumidores comparten un `GET`; el `PATCH` actualiza la interfaz sin otro `GET`. Con la API simulada, Ajustes muestra el perfil real y no «María García».
