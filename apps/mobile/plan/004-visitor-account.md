# Plan técnico · 004 · visitor-account

- Spec: `apps/mobile/specs/004-visitor-account.md`
- Estado de spec: **Borrador** (pendiente aprobación funcional; este plan no sustituye esa aprobación)
- Solicitante / responsable funcional: Aksel
- Responsable técnico: Aksel
- Estado del plan: **Borrador** — presentar para aprobación técnica tras aprobar la spec
- Dependencias documentales: `apps/api/specs/004-visitor-authentication.md`, `docs/adr/0011-visitor-identity-and-mobile-session.md`, spec **002** implementada

## Diseño de solución

Implementar el flujo completo de cuenta del visitante adulto en Android, manteniendo **MVVM** y delegando toda la red en `@arca/api-client` (modo Bearer con refresh). La API (`api-004`) es autoridad de validación, tokens y aviso legal; Mobile solo presenta formularios, persiste tokens en almacenamiento seguro y reacciona a códigos HTTP documentados en la spec API.

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

Catálogo fijo en código (`src/constants/avatarCatalog.ts`) con los 8 códigos propuestos; assets PNG/SVG en `src/assets/avatars/` (placeholders vectoriales o ilustraciones provisionales hasta arte final). El registro y `PATCH me` envían `avatar_code` validado en cliente contra el catálogo antes de llamar API.

### Integración `@arca/api-client`

El paquete hoy es **propuesta** (`packages/api-client/README.md`). Para esta feature:

| Módulo propuesto | Responsabilidad |
|---|---|
| `createVisitorApiClient(config)` | Base URL por `EXPO_PUBLIC_API_URL`, timeout, parseo de errores JSON en español |
| Tipos DTO | Alineados a `api-004` (register, verify, login, refresh, me, legal) |
| `Authorization: Bearer` | Inyectado desde callback que lee access token vía `TokenStorage` |
| **Refresh single-flight** | Interceptor interno: ante 401 retryable, una promesa compartida de `POST auth/refresh`; actualiza tokens en storage vía callback |
| Sin reglas de negocio | No calcula mayoría de edad ni valida contraseña más allá de UX previa al envío |

Mobile **no** usa `fetch`/`axios` fuera del paquete (CA-12). Hasta que el paquete exista, `MockAuthRepository` simula respuestas; tests usan dobles del cliente.

### Fases de entrega (RN-08)

| Fase | Condición | Entregable |
|---|---|---|
| **F1 — Mock** | Spec mobile-004 aprobada + plan/tasks aprobados | UI completa, `MockAuthRepository`, Secure Store real, tests CA-xx con simulaciones |
| **F2 — HTTP** | `api-004` implementada, DBR en Lista para backend, ADR 0011 aprobado, `@arca/api-client` con contrato visitor | `HttpAuthRepository`, pruebas de integración con cliente simulado + smoke manual contra API de pruebas |

No conectar a producción ni asumir esquema BD hasta que backend confirme contrato estable.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| **Rutas** | `src/app/_layout.tsx`, `src/app/(auth)/*`, guards; ampliar `(tabs)` con rutas de cuenta | Bienvenida, auth flows, protección de tabs |
| **Sesión** | `src/session/SessionProvider.tsx`, `src/viewmodels/useSessionViewModel.ts` | Estado global guest/authenticated, bootstrap |
| **Almacenamiento** | `src/services/tokenStorage.ts` (wrapper `expo-secure-store`) | Único lugar que lee/escribe tokens (RN-04, CA-05) |
| **Repositorio** | `src/repositories/authRepository.ts`, `mockAuthRepository.ts`, `httpAuthRepository.ts` | CA-12; swap mock ↔ HTTP |
| **ViewModels** | `useRegisterViewModel`, `useLoginViewModel`, `useVerifyEmailViewModel`, `useForgotPasswordViewModel`, `useResetPasswordViewModel`, `useAccountSettingsViewModel`, `useChangePasswordViewModel`, `useDeleteAccountViewModel` | Formularios y estados de carga/error |
| **Vistas** | `src/screens/auth/*`, `src/screens/AccountSettingsScreen.tsx`, etc. | Presentación; textos en español |
| **Componentes** | Reutilizar `src/components/ui/*`; `AvatarPicker`, `PasswordField`, `LegalCheckbox`, `OtpCodeInput` | CA-02, accesibilidad |
| **Constantes / assets** | `src/constants/avatarCatalog.ts`, `src/assets/avatars/*` | RN-02 |
| **Modelos** | `src/models/visitor.ts`, `AuthTokens`, `PrivacyNotice` | Tipos de dominio cliente |
| **Paquete** | `packages/api-client/src/visitor/*` (estructura a definir en tasks) | Cliente HTTP compartido |
| **Config Android** | `app.json` / config plugin Expo: `android.usesCleartextTraffic: false` | CA-13 |
| **Env** | `EXPO_PUBLIC_API_URL` documentado en README; sin secretos en bundle (RN-05) | Desarrollo vs producción HTTPS |
| **Pruebas** | `apps/mobile/__tests__/auth/*.test.ts`, ampliar `architecture.test.ts` | CA-14, CA-12 |
| **Docs** | `apps/mobile/README.md` (auth, env), actualizar `docs/arquitectura.md` sección seguridad | Operación local |

**Fuera de este plan (otras specs):** progreso/logros (`mobile-005`), QR (`mobile-006`), catálogo público (`mobile-003`). Solo se define el **puerto** para limpiar cola al borrar cuenta.

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

**DBR:** `DBR-003-visitor-accounts` (y DBR-001 base) — estado gestionado por API/BD; mobile no avanza F2 hasta **Lista para backend** (RN-08 api y RN-05 mobile).

**Errores:** Mapear cuerpos API a mensajes UI en español (422 validación, 403 `email_not_verified`, 429 con retry-after o texto de espera). No loguear contraseñas, códigos ni tokens.

## Seguridad, offline y operación

- **Tokens:** Solo `expo-secure-store`; claves de storage con prefijo de app; borrado en logout, refresh fallido y delete account.
- **HTTPS:** CA-13 — cleartext deshabilitado en builds release; en desarrollo local, documentar si se usa túnel HTTPS o excepción solo en debug (sin relajar release).
- **Offline:** Registro/login requieren red; mostrar estado accesible «Sin conexión» sin encolar credenciales.
- **Rate limits:** UI respeta 429 (deshabilitar botones reenvío/registro temporalmente).
- **Privacidad:** Aviso desde API; versión aceptada en registro (`privacy_notice_version`).
- **Observabilidad:** Sin PII en logs de consola en producción.
- **Dependencias nuevas (ADR 0011, aún Propuesto):** `expo-secure-store` obligatoria en F1; `@react-native-async-storage/async-storage` solo si F1 implementa el puerto de limpieza de cola (implementación real en 005) — puede quedar como interfaz no-op en 004.

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
| II. La spec manda | **Condicionado** | Spec mobile-004 debe pasar a **Aprobada** antes de implementar; plan no amplía OAuth, iOS ni progreso (005). |
| III. Lógica separada de la interfaz | **Conforme al diseño** | MVVM + AuthRepository; SessionProvider delgado; reglas de negocio en API. |
| IV. Un test por criterio | **Conforme al diseño** | Tabla CA-01–CA-14; refresh concurrente con test dedicado CA-06. |
| V. Una sola fuente de verdad | **Conforme al diseño** | Perfil y tokens autoritativos en API; local solo tokens + estado UI. Mocks solo en F1. |
| VI. Código en inglés, personas en español | **Conforme** | Rutas/archivos en inglés; copy UI en español. |

**Brechas a resolver antes de F2 (código HTTP real):** spec mobile-004 aprobada; ADR 0011 aprobado; `@arca/api-client` implementado; `api-004` + DBR lista.

## Riesgos y decisiones

| Riesgo | Mitigación |
|---|---|
| ADR 0011 aún **Propuesto** | No mergear dependencias Secure Store en main sin aprobación ADR; plan asume aprobación conjunta con specs. |
| `@arca/api-client` no implementado | F1 con mock; definir interfaces en paquete en paralelo con backend. |
| Refresh single-flight incorrecto | Test CA-06 con promesas concurrentes; alinear con pruebas de concurrencia api-004 CA-07. |
| Fricción registro adulto | Formulario corto, aviso legible, reenvío código claro (spec UX). |
| Arte avatares pendiente | Placeholders aceptables en F1; códigos fijos RN-02. |
| Expo Go vs dev build | Auth no requiere cámara; Secure Store funciona en Expo Go; validar en dispositivo real. |
| Perfil 002 mezcla gamificación y cuenta | Separar **Account settings** (004) de **Profile** (005); botón configuración → edición CA-08. |

**ADR requeridos:** 0004 (aprobado), **0011 (pendiente aprobación formal)**.

## Orden y aprobación

### Secuencia de implementación (tasks derivarán T-xx)

1. **Aprobaciones:** Spec mobile-004 funcional → aprobación técnica de **este plan** → `/sdd-tasks`.
2. **Infra sesión:** TokenStorage, SessionProvider, guards de rutas, `(auth)` shell.
3. **UI auth F1:** Welcome, register, verify, login, forgot/reset (MockAuthRepository).
4. **UI cuenta autenticada:** Account settings, change password, delete account, logout; enlace desde perfil.
5. **Legal:** Fetch/mock aviso privacidad en registro.
6. **Pruebas CA-01–CA-14** y ampliación architecture test.
7. **Config CA-13** y documentación README/arquitectura.
8. **Paquete api-client (paralelo permitido):** tipos visitor + refresh single-flight.
9. **F2 HttpAuthRepository** cuando api-004 + DBR listos; smoke manual.

### Aprobaciones pendientes

| Paso | Responsable | Estado |
|---|---|---|
| Aprobación funcional spec 004 | Aksel / equipo | Pendiente |
| Aprobación técnica plan 004 | Aksel / revisor técnico | Pendiente |
| Aprobación ADR 0011 | Equipo / arquitectura | Propuesto |
| Tasks 004 | Tras plan aprobado | No creado |

**No iniciar implementación en `src/`** hasta spec **Aprobada** y plan **Aprobado**, salvo acuerdo explícito del equipo para spike desechable (no recomendado por SDD).
