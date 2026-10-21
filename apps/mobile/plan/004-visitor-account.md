# Plan técnico · 004 · visitor-account

- Spec: `apps/mobile/specs/004-visitor-account.md`
- Estado de spec: **Implementada** (2026-10-21; aprobación funcional de Aksel, 2026-10-20)
- Solicitante / responsable funcional: Aksel
- Responsable técnico: Aksel
- Estado del plan: **Aprobado** — Aksel, 2026-10-20
- Dependencias documentales: `apps/api/specs/004-visitor-authentication.md` (Implementada el 2026-10-21), `docs/adr/0011-visitor-identity-and-mobile-session.md` (**Aceptado**, Aksel, 2026-10-21), spec **002** (prototipo visual integrado en la fase simulada)

## Diseño de solución

Integrar la cuenta real del visitante adulto sobre el prototipo visual de la spec 002 (`src/app/(auth)/`, `src/screens/LoginScreen.tsx` y el resto de pantallas de acceso y ajustes). Se mantiene **MVVM**. La red va en un modo visitante nuevo de `@arca/api-client` (Bearer con refresh). No se importa ni se edita el login de personal, `apps/web`, `apps/dashboard` ni `packages/api-client/auth.ts`.

La API (`api-004`) es autoridad de validación, tokens y aviso legal. Este equipo puede añadir esos endpoints cuando `api-004` esté aprobada, con su propio plan y tasks. Mobile presenta formularios, persiste tokens en almacenamiento seguro y reacciona a los códigos HTTP de esa spec. El repositorio en memoria `visitorAccessRepository` se sustituye por `AuthRepository`; no se parte de una interfaz paralela.

### Arquitectura de capas

```text
Expo Router (auth | app)
  → Screens (props puras)
  → ViewModels (hooks de sesión y formularios)
  → AuthRepository (interface)
       → MockAuthRepository (fase 1, RN-08)
       → HttpAuthRepository (fase 2, api-004 + api-client)
  → TokenStorage (expo-secure-store, único acceso a tokens)
  → @arca/api-client (visitor client + refresh single-flight)
```

Las rutas **no** importan repositorios ni `@arca/api-client`. Un **SessionProvider** (contexto + ViewModel de sesión) en el layout raíz expone `status: bootstrapping | guest | authenticated` y coordina arranque (lectura de tokens), logout global y redirección Bienvenida ↔ `(tabs)`.

### Flujo de datos y sesión

1. **Arranque (CA-01, CA-05):** Si no hay tokens en Secure Store → pantalla Bienvenida. Si hay par válido → intentar `GET me` (o confiar en refresh si access expirado) → tabs.
2. **Registro → verificación (CA-02, CA-03):** `register` → 201 sin tokens → pantalla código 6 dígitos + reenvío con cooldown UI según 429/202 de API.
3. **Login (CA-04, CA-05):** Guardar access + refresh en Secure Store; `email_not_verified` → verificación.
4. **401 en cualquier llamada autenticada (CA-06):** El cliente HTTP ejecuta **un solo** `auth/refresh` en vuelo; peticiones concurrentes await la misma promesa; éxito → reintento; fallo/revocado → limpiar Secure Store y navegar a Bienvenida.
5. **Recuperación (CA-07), perfil (CA-08), contraseña (CA-09), borrado (CA-10), logout (CA-11).**
6. **Borrado / logout (CA-10, CA-11):** Además de tokens, invocar un **ScanQueueClearPort** (interfaz vacía o no-op hasta `mobile-005`) para vaciar cola AsyncStorage cuando exista implementación.

### Navegación (Expo Router)

Grupo **`(auth)`** (sin TabBar), accesible en guest:

| Pantalla | Ruta propuesta | CA |
|---|---|---|
| Bienvenida | `/(auth)/welcome` | CA-01 |
| Registro | `/(auth)/register` | CA-02 |
| Verificación correo | `/(auth)/verify-email` | CA-03, CA-04 |
| Inicio de sesión | `/(auth)/login` | CA-04, CA-05 |
| Recuperación (correo) | `/(auth)/forgot-password` | CA-07 |
| Recuperación (código + nueva clave) | `/(auth)/reset-password` | CA-07 |
| Aviso de privacidad (lectura) | `/(auth)/privacy-notice` o modal desde registro | CA-02, RN-01 |

Grupo **`(tabs)`** existente (002), accesible solo con sesión:

| Pantalla | Ruta / acción | CA |
|---|---|---|
| Edición de perfil | `/(tabs)/account-settings` o stack `account/edit` | CA-08 |
| Cambio de contraseña | `/(auth)/change-password` en stack autenticado o modal bajo cuenta | CA-09 |
| Borrar cuenta | flujo confirmación + contraseña | CA-10 |
| Perfil visitante (gamificación) | `/(tabs)/profile` | Enlazar botón **configuración de cuenta** → edición (spec 008 CA-03) |

**Guard de rutas:** En `_layout.tsx` raíz, `Redirect` según `SessionProvider`: guest no entra a `(tabs)`; authenticated no permanece en `(auth)` salvo flujos explícitos (p. ej. change-password).

### Avatar y RN-02

Catálogo fijo en código (`src/constants/avatarCatalog.ts`) con los 8 códigos aceptados; assets PNG/SVG en `src/assets/avatars/` (placeholders hasta el arte final del zoológico). El registro y `PATCH me` envían `avatar_code` validado en cliente contra el catálogo antes de llamar API.

### Integración `@arca/api-client`

El paquete ya tiene el cliente de personal (`createAuthApi` en `auth.ts`: cookie, CSRF y 2FA). Esta feature no lo modifica. Añade un módulo visitante aparte:

| Módulo nuevo | Responsabilidad |
|---|---|
| Cliente visitante (nombre a fijar en tasks; no vive en `auth.ts`) | Base URL por `EXPO_PUBLIC_API_URL`, timeout, parseo de errores JSON en español |
| Tipos DTO | Alineados a `api-004` (register, verify, resend, login, refresh, logout, forgot, reset, me, password, delete, legal) |
| `Authorization: Bearer` | Inyectado desde callback que lee access token vía `TokenStorage` |
| **Refresh single-flight** | Ante 401 retryable, una promesa compartida de `POST /api/v1/visitor/auth/refresh`; actualiza tokens en storage vía callback |
| Sin reglas de negocio | No calcula mayoría de edad ni valida contraseña más allá de UX previa al envío |

Mobile no usa `fetch`/`axios` fuera del paquete (CA-12). La fase simulada ya usa `MockAuthRepository`. En la fase HTTP los tests de Jest siguen con dobles; el teléfono usa el módulo visitante cuando `EXPO_PUBLIC_API_URL` tiene valor.

### Fases de entrega (RN-08)

| Fase | Condición | Entregable |
|---|---|---|
| **F1 — Mock** | Cumplida. Spec, plan y T-01 a T-30 aprobados e integrados. El ADR 0011 se aceptó después de ese corte, así que `TokenStorage` quedó en memoria. | `MockAuthRepository` y pruebas CA-xx con simulaciones. Las cuentas de prueba y el código `123456` siguen en la app mientras no haya URL de API. |
| **F2 — HTTP** | `api-004` implementada, ADR 0011 aceptado y checklist HTTP (T-31 en adelante) aprobado | Módulo visitante de `@arca/api-client`, `expo-secure-store`, `HttpAuthRepository`, pruebas con cliente simulado y smoke manual contra la API de pruebas |

DBR-001 y DBR-003 ya están en `Lista para backend` y aplicadas en `arca_pruebas`. `api-004` tiene plan, tasks y endpoints. F2 espera la aprobación del checklist HTTP. No se conecta a producción ni a `arca_zoo`. No se crean migraciones desde mobile.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| **Rutas** | Evolucionar `src/app/_layout.tsx` y `src/app/(auth)/*` (login, register, forgot-password, reset-password); agregar welcome, verify-email y guards; ampliar `(tabs)` con rutas de cuenta | Integrar el prototipo 002; bienvenida y verificación nuevas; protección de tabs |
| **Sesión** | `src/session/SessionProvider.tsx`, `src/viewmodels/useSessionViewModel.ts` | Estado global guest/authenticated, bootstrap |
| **Almacenamiento** | `src/services/tokenStorage.ts` (wrapper `expo-secure-store`) | Único lugar que lee/escribe tokens (RN-04, CA-05) |
| **Repositorio** | `src/repositories/authRepository.ts`, `mockAuthRepository.ts`, `httpAuthRepository.ts`; dejar de usar `visitorAccessRepository` para la sesión | CA-12; el prototipo en memoria no autentica la cuenta real |
| **ViewModels** | `useRegisterViewModel`, `useLoginViewModel`, `useVerifyEmailViewModel`, `useForgotPasswordViewModel`, `useResetPasswordViewModel`, `useAccountSettingsViewModel`, `useChangePasswordViewModel`, `useDeleteAccountViewModel` | Formularios y estados de carga/error |
| **Vistas** | Evolucionar `src/screens/LoginScreen.tsx` y las pantallas de acceso existentes; agregar las que falten (bienvenida, verificación, ajustes de cuenta) | Presentación en español; se quita «Entrar como invitado» al integrar |
| **Componentes** | Reutilizar `src/components/ui/*`; `AvatarPicker`, `PasswordField`, `LegalCheckbox`, `OtpCodeInput` | CA-02, accesibilidad |
| **Constantes / assets** | `src/constants/avatarCatalog.ts`, `src/assets/avatars/*` | RN-02 |
| **Modelos** | `src/models/visitor.ts`, `AuthTokens`, `PrivacyNotice` | Tipos de dominio cliente |
| **Paquete** | Módulo visitante nuevo en `packages/api-client` (no editar `auth.ts`) | Cliente Bearer del visitante |
| **Config Android** | `app.json` / config plugin Expo: `android.usesCleartextTraffic: false` | CA-13 |
| **Env** | `EXPO_PUBLIC_API_URL` documentado en README; sin secretos en bundle (RN-05) | Desarrollo vs producción HTTPS |
| **Pruebas** | `apps/mobile/__tests__/auth/*.test.ts`, ampliar `architecture.test.ts` | CA-14, CA-12 |
| **Docs** | `apps/mobile/README.md` (auth, env), actualizar `docs/arquitectura.md` sección seguridad | Operación local |

**Fuera de este plan:** `apps/web`, `apps/dashboard`, `api-003` y `packages/api-client/auth.ts`. También progreso/logros (`mobile-005`), QR (`mobile-006`) y catálogo público (`mobile-003`). Solo se define el puerto para limpiar la cola al borrar cuenta. La API visitante se diseña en el plan de `api-004`, después de aprobar esa spec; no en este documento.

## Contrato y datos

Mobile **no** define migraciones ni SQL. Consume el contrato de **`apps/api/specs/004-visitor-authentication.md`**:

| Operación | Método / ruta (referencia api-004) | Uso en mobile |
|---|---|---|
| Registro | `POST /api/v1/visitor/auth/register` | CA-02, CA-03 |
| Verificar correo | `POST .../auth/email/verify` | CA-03 |
| Reenviar código | `POST .../auth/email/resend` | CA-03 |
| Login | `POST .../auth/login` | CA-04, CA-05 |
| Refresh | `POST .../auth/refresh` | CA-06 |
| Logout | `POST .../auth/logout` | CA-11 |
| Forgot password | `POST .../auth/password/forgot` | CA-07 |
| Reset password | `POST .../auth/password/reset` | CA-07 |
| Perfil | `GET/PATCH /api/v1/visitor/me` | CA-08 |
| Cambio contraseña | `PUT /api/v1/visitor/me/password` | CA-09 |
| Borrar cuenta | `DELETE /api/v1/visitor/me` | CA-10 |
| Aviso privacidad | `GET /api/v1/visitor/legal/privacy-notice` | CA-02, RN-01 |

**DBR:** `DBR-003-visitor-accounts` y DBR-001 están en `Lista para backend`. Mobile no crea migraciones. F2 espera endpoints de `api-004`, no un cambio de estado de la DBR.

**Errores:** Mapear cuerpos API a mensajes UI en español (422 validación, 403 `email_not_verified`, 429 con retry-after o texto de espera). No loguear contraseñas, códigos ni tokens.

## Seguridad, offline y operación

- **Tokens:** Solo `expo-secure-store`; claves de storage con prefijo de app; borrado en logout, refresh fallido y delete account.
- **HTTPS:** CA-13 — cleartext deshabilitado en builds release; en desarrollo local, documentar si se usa túnel HTTPS o excepción solo en debug (sin relajar release).
- **Offline:** Registro/login requieren red; mostrar estado accesible «Sin conexión» sin encolar credenciales.
- **Rate limits:** UI respeta 429 (deshabilitar botones reenvío/registro temporalmente).
- **Privacidad:** Aviso desde API; versión aceptada en registro (`privacy_notice_version`).
- **Observabilidad:** Sin PII en logs de consola en producción.
- **Dependencias nuevas (ADR 0011, Aceptado el 2026-10-21):** `expo-secure-store` se instala en el checklist HTTP, no en este documento. `@react-native-async-storage/async-storage` queda para `mobile-005`. El puerto de la cola sigue sin implementación en 004.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | `test-ca-01-auth-welcome-redirect` | Guest → welcome; sin tabs |
| CA-02 | `test-ca-02-register-form` | Campos, checkboxes, avatar picker, enlace aviso |
| CA-03 | `test-ca-03-verify-email-flow` | Tras mock 201 register → verify UI; resend cooldown |
| CA-04 | `test-ca-04-auth-errors` | 422 mensajes; 403 → verify; 429 espera |
| CA-05 | `test-ca-05-login-stores-tokens` | Mock Secure Store; navegación a tabs |
| CA-06 | `test-ca-06-refresh-single-flight` | Cliente simulado: N requests + 401 → 1 refresh → retry |
| CA-07 | `test-ca-07-password-recovery-flow` | Forgot 202 → reset → login |
| CA-08 | `test-ca-08-profile-patch` | Account settings + PATCH mock |
| CA-09 | `test-ca-09-change-password` | PUT password mock |
| CA-10 | `test-ca-10-delete-account` | DELETE + clear storage + welcome |
| CA-11 | `test-ca-11-logout` | Logout + clear + welcome |
| CA-12 | `test-ca-12-auth-mvvm` (ampliar `architecture.test.ts`) | Sin fetch en screens/viewmodels; AuthRepository único |
| CA-13 | `test-ca-13-android-cleartext-config` | Assert `app.json` / config Expo |
| CA-14 | Meta: suite `__tests__/auth/` nombrada por CA | Jest + RTL |

Pruebas manuales complementarias: registro feliz y refresh en dispositivo Android (Expo Go o dev build) contra API de pruebas en F2.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | **Conforme al diseño** | Expo/RN ADR 0004; dependencias nuevas limitadas a ADR 0011 (`expo-secure-store`; AsyncStorage diferido a puerto 005). |
| II. La spec manda | **Conforme** | Spec mobile-004 **Implementada** el 2026-10-21 (aprobación funcional de Aksel, 2026-10-20). Este plan no amplía OAuth, iOS ni progreso (005). |
| III. Lógica separada de la interfaz | **Conforme al diseño** | MVVM + AuthRepository; SessionProvider delgado; reglas de negocio en API. |
| IV. Un test por criterio | **Conforme al diseño** | Tabla CA-01–CA-14; refresh concurrente con test dedicado CA-06. |
| V. Una sola fuente de verdad | **Conforme al diseño** | Con `EXPO_PUBLIC_API_URL`, el perfil y los tokens salen de la API; el teléfono solo guarda el par. Sin esa variable, y en Jest, sigue el mock de la fase simulada. |
| VI. Código en inglés, personas en español | **Conforme** | Rutas/archivos en inglés; copy UI en español. |

**Código HTTP:** ADR 0011 está aceptado y el checklist T-31 a T-44 lo aprobó Aksel el 2026-10-21. `api-004` quedó Implementada el mismo día. El módulo visitante vive en `@arca/api-client` sin tocar `auth.ts`. Las DBR ya están aplicadas en `arca_pruebas`.

## Riesgos y decisiones

| Riesgo | Mitigación |
|---|---|
| Instalar `expo-secure-store` antes de ADR y checklist | ADR 0011 está aceptado y T-31 a T-44 están aprobadas. AsyncStorage sigue fuera, en la spec 005. |
| Reutilizar el cliente de personal | Prohibido. Módulo visitante nuevo; `auth.ts`, web y dashboard no se editan. |
| Refresh single-flight incorrecto | Test CA-06 con promesas concurrentes; alinear con pruebas de concurrencia api-004 CA-07. |
| Fricción registro adulto | Formulario corto, aviso legible, reenvío código claro (spec UX). |
| Arte avatares pendiente | Placeholders aceptables en F1; códigos fijos RN-02. |
| Expo Go vs dev build | Auth no requiere cámara; Secure Store funciona en Expo Go; validar en dispositivo real. |
| Perfil 002 mezcla gamificación y cuenta | Separar **Account settings** (004) de **Profile** (005); botón configuración → edición CA-08. |

**ADR requeridos:** 0004 (aprobado), **0011 (Aceptado, Aksel, 2026-10-21)**.

## Orden y aprobación

### Secuencia de implementación (tasks derivarán T-xx)

1. **Hecho:** spec mobile-004, spec api-004 y este plan, por Aksel el 2026-10-20. El plan, las tasks y los endpoints de `api-004` quedaron listos el 2026-10-21. Ambas specs quedaron Implementadas el 2026-10-21.
2. **Primer corte de tasks:** sesión, login y logout sobre las pantallas 002 (`TokenStorage`, `SessionProvider`, guards, `MockAuthRepository`). Se retira el acceso de invitado en este corte.
3. **Resto de la misma spec:** registro, verificación, recuperación, aviso, perfil, contraseña y borrado.
4. **Pruebas CA-01–CA-14** y ampliación del test de arquitectura, repartidas en esos cortes.
5. **Config CA-13** y documentación README/arquitectura.
6. **Checklist HTTP** en `tasks/004-visitor-account.md` (T-31 en adelante): módulo visitante de `@arca/api-client`, sin editar `auth.ts`, y `HttpAuthRepository`. Aprobado por Aksel el 2026-10-21.
7. **Implementar F2** tras esa aprobación. Smoke manual contra la API de pruebas, nunca contra `arca_zoo`.

### Aprobaciones

| Paso | Responsable | Estado |
|---|---|---|
| Aprobación funcional spec mobile-004 | Aksel | Aprobada, 2026-10-20. Implementada, 2026-10-21 |
| Aprobación funcional spec api-004 | Aksel | Aprobada, 2026-10-20. Plan y tasks aprobados el 2026-10-21. Implementada, 2026-10-21 |
| Aprobación técnica plan mobile-004 | Aksel | Aprobado, 2026-10-20 |
| Aprobación ADR 0011 | Aksel | Aceptado, 2026-10-21. Autoriza las dependencias. Este documento no las instala |
| Tasks fase simulada (T-01 a T-30) | Aksel | Aprobadas, 2026-10-20, e integradas |
| Tasks fase HTTP (T-31 en adelante) | Aksel | Aprobadas, 2026-10-21, e implementadas |

**La fase simulada está integrada.** La fase HTTP quedó aprobada e implementada el 2026-10-21. `apps/web` y `apps/dashboard` quedan fuera.
