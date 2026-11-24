# ADR 0032 — PoC ARCore/ARKit con ViroReact para anclaje AR en mobile

- Estado: Aceptado
- Solicitada: 2026-11-21
- Aprobada: 2026-11-21
- Responsables: Equipo móvil (funcional)
- Aprobación: Equipo ARCA-NB
- Apps afectadas: `apps/mobile`

## Contexto

La spec `015-spatial-ar-tour` implementó AR location-based (GPS + brújula + cámara) en Expo Go. Funciona para mostrar puntos por dirección/FOV, pero no ofrece anclaje real al mundo: los puntos pueden verse sobrepuestos y moverse con la cámara/heading. El usuario solicitó evaluar/iniciar una implementación con ARCore/ARKit usando solo el teléfono.

## Decisión propuesta

Realizar un **PoC** con `@reactvision/react-viro@3.1.1` para renderizar marcadores AR anclados en sesión AR (ARCore en Android, ARKit en iOS), manteniendo el modo location-based actual como fallback.

### Compatibilidad verificada

- App actual: Expo `~57.0.33`, React Native `0.86.3`, React `19.2.3`.
- ViroReact candidato: `@reactvision/react-viro@3.1.1` declara peer deps `expo >=57 <58` y `react-native >=0.86 <0.87`.

## Alternativas consideradas

1. **Mantener solo location-based**: sin dependencias nativas nuevas; no resuelve anclaje real. Rechazada como única solución.
2. **Expo GL + Three.js + sensor fusion**: posible en Expo Go, pero sigue sin plane detection/hit-test/anchors nativos. Rechazada para anclaje real.
3. **ViroReact (@reactvision/react-viro)**: soporte ARCore/ARKit, Expo config plugin, comunidad activa. Seleccionada para PoC.
4. **SDK nativo propio / otro bridge**: mayor costo y riesgo. Diferida.

## Consecuencias

### Positivas

- Posibilidad de anclaje AR más estable y experiencia “real AR”.
- Mantiene fallback location-based para dispositivos/situaciones no compatibles.

### Negativas / riesgos

- **No funciona en Expo Go**; requiere development build/EAS.
- Dependencia nativa grande; aumenta complejidad de build y mantenimiento.
- Compatibilidad futura con upgrades Expo/RN debe validarse en cada upgrade.
- Mapeo GPS→coordenadas AR locales requiere calibración; puede haber deriva.
- Requiere dispositivos físicos compatibles con ARCore/ARKit.

## Alcance del PoC

- Solo Android/ARCore en primera iteración (si el equipo lo confirma), iOS/ARKit después.
- No reemplaza el modo location-based.
- No incluye edición de contenido AR, persistencia cloud anchors, ni SLAM avanzado fuera del SDK.

## Reglas de implementación

- No instalar dependencia ni cambiar config hasta que este ADR y la spec 016 estén aprobados.
- Registrar pasos de build/dev client en docs.
- Si la PoC falla por compatibilidad o estabilidad, rollback: remover dependencia/plugin y mantener location-based.