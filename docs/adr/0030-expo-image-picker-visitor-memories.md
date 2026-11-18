# 0030 · Selector de galería para momentos del visitante (expo-image-picker)

- Estado: Aceptado
- Fecha: 2026-11-14
- Spec relacionada: `apps/mobile/specs/010-visitor-memory-requests.md` (Aprobada, Aksel, 2026-11-14)
- Plan: `apps/mobile/plan/010-visitor-memory-requests.md` (Aprobado, Aksel, 2026-11-14)
- Solicitante: Aksel
- Aprobado por: Aksel, 2026-11-14

Aceptado, este ADR autoriza instalar `expo-image-picker` en `apps/mobile` y declarar el permiso de galería cuando se implemente `mobile-010`. No autoriza código por sí solo: la implementación espera las tasks de ese plan. No abre la cámara.

## Contexto

`mobile-010` pide que el visitante elija una foto de la galería del teléfono para «Momentos para recordar». La API (`api-010`) recibe el archivo, le quita los metadatos y lo guarda en `apps/api/src/media/memories/`. La app no escribe en esa carpeta y no abre la cámara.

ADR 0004 adopta Expo y React Native. ADR 0022 adopta `expo-camera` para el QR. Ninguno cubre un selector de imágenes de la galería.

## Alternativas consideradas

| Alternativa | A favor | En contra |
|---|---|---|
| `expo-image-picker`, solo galería, compatible con Expo SDK 57 | El mismo canal de permisos que el resto de Expo; una foto por vez; sin leer el álbum completo | Dependencia nueva; hay que aceptarla antes de instalarla |
| `expo-camera` para tomar la foto | Ya está aceptado para el QR | `mobile-010` deja la cámara fuera de alcance |
| Un módulo nativo propio | Control fino del permiso | Otra superficie que ADR 0004 no prevé |

## Decisión

La app usa `expo-image-picker` solo para elegir una imagen JPG, PNG o WebP de la galería, en el momento en que el visitante pulsa el control de la foto.

- La dependencia vive en `apps/mobile`.
- El permiso de fotos se declara en `app.json` con un texto en español y se pide al elegir la imagen, no al abrir Perfil.
- No se usa la cámara, no se graba video y no se recorre la galería.
- Si la persona niega el permiso, el formulario sigue visible y explica que la foto se elige desde los ajustes del teléfono. No hay envío sin archivo.
- La API sigue siendo quien valida el tipo, el tamaño de 5 MB y quien guarda el archivo.

## Consecuencias

- El control de la foto de `mobile-010` puede usar esta dependencia en la implementación.
- Esta aceptación no publica la app con el texto de consentimiento de referencia: eso lo sigue frenando `mobile-010` RN-07 hasta que el zoológico apruebe el texto.

## Validación y revisión

- Aprobado por: Aksel, 2026-11-14.
- Evidencia: `apps/mobile/specs/010-visitor-memory-requests.md`, `docs/adr/0004-mobile-react-native.md`, `docs/adr/0022-expo-camera-qr-scan.md`, `apps/api/specs/010-visitor-memory-requests.md`.
