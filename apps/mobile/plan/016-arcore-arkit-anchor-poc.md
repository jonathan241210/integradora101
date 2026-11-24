# Plan técnico · 016 · PoC ARCore/ARKit con anclaje AR

- Spec: `apps/mobile/specs/016-arcore-arkit-anchor-poc.md`
- Estado de spec: Implementada
- Solicitada: 2026-11-21
- Aprobada: 2026-11-21
- ADR: `docs/adr/0032-viroreact-arcore-arkit-poc.md` (Aceptado)
- Responsables: Equipo mobile
- Aprobación técnica: Aprobada

## Diseño de solución

Implementar una PoC aislada usando `@reactvision/react-viro@3.1.1` para abrir una sesión AR nativa en development build. La PoC coexistirá con el AR location-based actual: el usuario podrá probar "AR nativo (PoC)" y, si no está disponible, volver al modo location-based.

La conversión GPS→AR local se tratará como aproximación de PoC: se anclará la posición del usuario como origen local y se colocarán objetos en coordenadas relativas calculadas por distancia/bearing. Se documentará deriva y requisitos de calibración.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Mobile/config | `apps/mobile/package.json`, `apps/mobile/app.json`, `apps/mobile/eas.json` | Agregar dependencia ViroReact y config plugin/build para dev client |
| Mobile/AR | `apps/mobile/src/components/map/ViroArAnchorScene.tsx` (nuevo), `apps/mobile/src/screens/MapScreen.tsx` o pantalla PoC | Escena AR nativa con marcadores PoC |
| Mobile/utilidades | `apps/mobile/src/utils/arGeoAnchor.ts` (nuevo) | Convertir lat/lon a coordenadas locales AR aproximadas |
| Mobile/fallback | `apps/mobile/src/components/map/LocationArScene.tsx`, `ArTourOverlay.tsx` | Mantener fallback location-based |
| Docs/ADR | `docs/adr/0032-*.md`, `apps/mobile/docs/*` | Build, pruebas, limitaciones |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Con excepción controlada | Agrega dependencia nativa nueva; requiere ADR aprobado. No cambia MySQL/infra base. |
| II. La spec manda | Sí | Spec/plan/tasks 016 antes de código. |
| III. Lógica separada de la interfaz | Sí | Conversión geo→AR en utilidades; escena/componente solo render. |
| IV. Un test por criterio | Parcial en PoC | CA técnicos de dispositivo pueden requerir evidencia manual; automatizar lo posible. |
| V. Una sola fuente de verdad para los datos | Sí | No toca BD; usa coords ya existentes. |
| VI. Código en inglés, personas en español | Sí | Código en inglés, UI/docs en español. |

## Riesgos

- Incompatibilidad real de ViroReact 3.1.1 con el proyecto Expo 57 pese a peer deps.
- Build nativa falla en EAS/local por configuración Android.
- Anclaje GPS→AR impreciso; PoC puede no verse mejor que location-based.
- Tamaño/tiempo de build aumenta.

## Orden propuesto

1. Aprobar ADR 0032 y spec/plan/tasks 016.
2. Instalar `@reactvision/react-viro@3.1.1` y configurar plugin/app.json/eas.
3. Crear dev build Android.
4. Implementar escena PoC con un marcador fijo cercano.
5. Integrar marcadores desde recintos/zoo_places cercanos.
6. Comparar con fallback location-based y documentar resultado.