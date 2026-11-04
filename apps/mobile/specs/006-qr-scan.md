# 006 · qr-scan

- App dueña: `mobile`
- Apps/paquetes afectados: `mobile`
- Estado: Implementada (2026-11-01; aprobación funcional 2026-11-01)
- Solicitante / responsable funcional: Aksel
- Aprobación funcional: Aksel, 2026-11-01
- Equivalencia en el documento de decisiones previas: 005

## Problema y contexto

La pestaña «Escanear» del prototipo (`mobile-002`) simula resultados con botones de demostración y rutas mock. Con `mobile-005` implementada, la cola (`submitScan`), la API (`api-005` → `POST /api/v1/visitor/discoveries`) y las pantallas de resultado ya existen; falta leer el QR físico del recinto con la cámara y entregar el código opaco (`enclosure_qr_codes.code`, p. ej. `ARCA-7F3K9Q2M`) a esa cola.

La validación de puntos, especies y estados de resultado la hace el servidor; esta spec no añade endpoints ni migraciones.

## Objetivos

- Escaneo real de QR con cámara en Android (Expo SDK 57), permiso explícito y textos en español.
- Normalizar el payload leído a código opaco y llamar `submitScan(code)` de `mobile-005`.
- Alternativa accesible si se niega la cámara: entrada manual del código.
- Navegar a la pantalla de resultado unificada (`scan-result`) según `ScanPresentation` de la cola.
- Retirar del flujo de producción la simulación mock y las rutas legacy de resultado QR.

## Fuera de alcance

- Lógica de servidor, puntos y reglas (`api-005`).
- Cola offline, reintentos y pantallas de resultado (`mobile-005`).
- Impresión, colocación y reposición física de QR (operación del zoológico; generación con `arca:generate-qr-codes` en `api-005`).
- iOS.
- Nueva spec o endpoints API.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante (cuenta del tutor) | Escanear QR de recinto | Sesión `visitor` activa; permiso `CAMERA` en Android para lectura automática |

Sin sesión autenticada, la pestaña redirige al flujo de inicio de sesión (ADR 0011).

## Historias de usuario

- Como visitante, quiero escanear el QR del recinto con la cámara para registrar el descubrimiento sin escribir el código.
- Como visitante, quiero escribir el código a mano si no puedo usar la cámara, para no quedar bloqueado.
- Como visitante, quiero ver el mismo resultado que ya define la app tras un escaneo válido o inválido.

## Criterios de aceptación

- **CA-01:** Dada la pestaña Escanear con sesión activa, cuando el visitante la abre por primera vez en el dispositivo, entonces la app solicita permiso de cámara con explicación en español (manifest y/o pantalla previa) antes de mostrar la vista en vivo.
- **CA-02:** Dado permiso concedido, cuando la cámara decodifica un QR, entonces la app normaliza el contenido a código opaco: acepta texto plano que coincida con el patrón del zoológico (`ARCA-` + alfanumérico); si el QR es una URL, extrae el último segmento de ruta o el parámetro `code` cuando contenga ese patrón; ignora lecturas duplicadas del mismo código durante ~2 s (debounce).
- **CA-03:** Dado permiso denegado o revocado, cuando el visitante usa Escanear, entonces muestra mensaje accesible en español, opción de abrir ajustes del sistema si está disponible, y un formulario de **entrada manual** (campo + botón «Registrar código») que usa el mismo flujo que CA-02.
- **CA-04:** Dado un código normalizado, cuando se envía, entonces la app llama `submitScan(code)` una sola vez por intento de usuario (indicador de carga mientras procesa); al resolver, navega a `scan-result` con los datos de `ScanPresentation` (`discovered`, `already_discovered`, `invalid_code`, `inactive_code`, `expired_scan`, `pending`, `rate_limited`).
- **CA-05:** Dado el código de la app, cuando se revise, entonces cumple MVVM: ruta/pantalla → ViewModel de escaneo → `submitScan`; la pantalla no llama a la API ni escribe en la cola directamente.
- **CA-06:** Dada la suite Jest, cuando se ejecute, entonces hay pruebas que nombran cada CA-xx: permisos simulados, normalización de payload, envío a `submitScan` mockeado y navegación; el README o comentario de prueba documenta que el simulador no valida la cámara real.
- **CA-07:** Dada la app sin sesión autenticada, cuando el visitante abre Escanear, entonces redirige al inicio de sesión sin abrir la cámara.

## Reglas de negocio

- **RN-01:** Un intento de escaneo o envío manual genera un `client_scan_id` en la cola (`mobile-005`); la app no reutiliza IDs entre intentos distintos.
- **RN-02:** El código enviado a la API debe ser el opaco del recinto; la app no interpreta puntos, especies ni logros.
- **RN-03:** La dependencia de cámara es `expo-camera` (SDK 57), autorizada por ADR 0019; no se instala `react-native-vision-camera`.
- **RN-04:** No se almacenan fotogramas ni imágenes de la cámara; solo el string del código en tránsito hacia la cola.
- **RN-05:** Mensajes y etiquetas en español; identificadores en inglés (Constitución VI).
- **RN-06:** Solo Android; `usesCleartextTraffic=false` se mantiene en builds de producción.
- **RN-07:** En `__DEV__`, pueden conservarse atajos de simulación solo si no sustituyen CA-02 en builds de release.

## Datos, privacidad y auditoría

La cámara procesa el QR en el dispositivo; no se suben imágenes al servidor. El código leído se trata como dato no sensible en tránsito hacia `discoveries`. Los tokens siguen en `expo-secure-store` (spec 004).

## Flujos y errores

1. Sesión activa → Escanear → permiso cámara → lectura → `submitScan` → `scan-result`.
2. Permiso denegado → mensaje + entrada manual → `submitScan` → `scan-result`.
3. Sin red → `submitScan` encola (`pending`) → pantalla de resultado acorde.
4. 401 → refresh de sesión (spec 004); 429 → mensaje de espera en resultado.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** `mobile-004` (sesión), `mobile-005` (`submitScan`, cola, resultados), `api-005` (contrato `discoveries`), ADR 0004, **ADR 0019** (`expo-camera`).
- **Riesgos:** variación de cámara entre dispositivos; QR físicos deben existir y estar activos en BD.
- **Preguntas cerradas (Aksel, 2026-11-01):** entrada manual **sí**; dependencia **`expo-camera`**; impresión/colocación QR fuera de alcance; no se crea spec API adicional.

## Revisión

- Aprobadores y fecha: Aksel, 2026-11-01.
- Cierre: Implementada el 2026-11-01. Suites `__tests__/qr/` y escaneo en navegación en verde; `expo-camera` instalado (ADR 0019). Sin cambios API (`api-005`).
- Evidencia/enlaces: `apps/mobile/specs/005-visitor-progress.md`, `apps/api/specs/005-visitor-progress.md`, `docs/adr/0019-expo-camera-qr-scan.md`.
