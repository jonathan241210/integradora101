# 006 · qr-scan

- App dueña: `mobile`
- Apps/paquetes afectados: `mobile`
- Estado: Borrador
- Solicitante / responsable funcional: Aksel
- Aprobación funcional: pendiente de aprobación
- Equivalencia en el documento de decisiones previas: 005

## Problema y contexto

La pantalla de escáner del prototipo (`mobile-002`) simula resultados con botones. Esta spec implementa el escaneo real de los QR de recinto con la cámara: solicitud de permiso, lectura del código opaco (`enclosure_qr_codes.code`, p. ej. `ARCA-7F3K9Q2M`) y entrega del código a la cola de escaneos de `mobile-005`, que es quien lo envía a la API. La cámara real y la lectura QR requieren dependencias propias por aprobar (regla de `apps/mobile/AGENTS.md`).

## Objetivos

- Escaneo real de QR con cámara en Android, con permiso explícito y alternativa accesible si se niega.
- Entrega del código leído a la cola de `mobile-005` con `scanned_at` y `client_scan_id`.
- Cobertura de los casos: código inválido, ya descubierto, sin permiso de cámara.

## Fuera de alcance

- Validación del código y asignación de puntos (la hace la API, `api-005`).
- La cola de sincronización (spec `mobile-005`): esta spec solo entrega el código.
- Impresión y colocación física de los QR (pregunta abierta).

## Criterios de aceptación (preliminares)

- **CA-01:** Dado el escáner, cuando el visitante lo abre por primera vez, entonces la app solicita el permiso de cámara de forma explícita y explica su uso en español.
- **CA-02:** Dado el permiso concedido, cuando la cámara lee un QR, entonces la app extrae el código y lo entrega a la cola de `mobile-005` con `scanned_at` y un `client_scan_id` UUID.
- **CA-03:** Dado un permiso negado, cuando el visitante rechaza la cámara, entonces la app muestra una alternativa accesible (mensaje y opción de captura manual del código, si se aprueba en el plan).
- **CA-04:** Dados los resultados devueltos por la API, cuando la cola procesa el escaneo, entonces se muestran las pantallas de resultado de `mobile-005` (válido, inválido, ya descubierto, vencido).
- **CA-05:** Dada la suite de Jest, cuando se ejecute, entonces hay pruebas que nombran cada CA-xx dentro de lo que el simulador permita, registrando sus limitaciones.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** `mobile-005` (cola y pantallas de resultado), `api-005` (contrato de `discoveries`), dependencia de cámara/QR por aprobar (p. ej. `expo-camera`), ADR 0004.
- **Riesgos:** comportamiento de la cámara en dispositivos diversos; los QR físicos deben existir y estar vigentes.
- **Preguntas pendientes:**
  - Quién imprime y coloca los QR, y su reposición.
  - Dependencia concreta de lectura QR por aprobar.
  - Si se ofrece captura manual del código como alternativa.

## Revisión

- Aprobadores y fecha: pendiente de aprobación.
- Evidencia/enlaces: `apps/mobile/specs/005-visitor-progress.md`, `apps/api/specs/005-visitor-progress.md`.
