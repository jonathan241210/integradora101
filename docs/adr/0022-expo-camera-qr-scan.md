# 0022 — Escaneo QR con expo-camera (mobile-006)

- Estado: Aceptado
- Fecha: 2026-11-01
- Aprobado por: Aksel (2026-11-01)
- Spec relacionada: `apps/mobile/specs/006-qr-scan.md`
- Autor: Aksel

---

## Contexto

`mobile-005` expone `submitScan(code)` y consume `POST /api/v1/visitor/discoveries` (`api-005`). La pestaña Escanear aún simula lecturas con mocks (`mobile-002`). `mobile-006` debe leer códigos opacos de recinto con la cámara trasera en Android.

ADR 0004 ya orienta hacia `expo-camera` frente a `react-native-vision-camera`, pero no autoriza por sí solo la instalación ni los permisos de esta feature.

## Alternativas consideradas

| Alternativa | Pro | Contra |
|---|---|---|
| `expo-camera` (SDK 57) | Permisos centralizados en `app.json`, barcode scanning integrado, alineado con Expo Go | Menos control de bajo nivel que vision-camera |
| `react-native-vision-camera` | Rendimiento | Config nativa extra; rechazado en ADR 0004 |
| Escaneo solo manual | Sin permiso cámara | Peor UX; no cumple objetivo principal |
| Librería JS pura sobre fotos | Sin permiso en vivo | Requiere disparar shutter; peor accesibilidad |

## Decisión

**Adoptar `expo-camera` (~57.x, compatible con Expo SDK 57 del monorepo) para lectura de códigos QR en primer plano.**

### Alcance

- Dependencia en `apps/mobile` únicamente.
- Plugin y permiso `CAMERA` en `app.json` con mensaje en español.
- Uso de `CameraView` con detección de barcode; sin grabación de video ni almacenamiento de frames.
- Entrada manual del código cuando el permiso es denegado (spec `mobile-006` CA-03).
- **No** se añaden endpoints API; el contrato sigue en `api-005`.

### Fuera de alcance de este ADR

- iOS.
- Escaneo en segundo plano.
- Generación o impresión de QR (comando `arca:generate-qr-codes` en API).

## Consecuencias

### Positivas

- Permisos y preview unificados con el stack Expo existente (`expo-location` ya configurado en la misma app).
- El visitante completa el flujo real hacia la cola de `mobile-005`.

### Riesgos o costos

- Comportamiento del lector puede variar entre dispositivos Android; mitigación con debounce y entrada manual.
- Expo Go debe ser compatible con SDK 57 y el módulo de cámara; si un dispositivo falla, la entrada manual sigue disponible.

## Validación y revisión

Aprobado por Aksel el 2026-11-01 junto con la spec `mobile-006`. La implementación sigue plan y tasks de la misma spec.
