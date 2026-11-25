# 016 · PoC ARCore/ARKit con anclaje AR para recintos/zoo_places (`arcore-arkit-anchor-poc`)

- App dueña: `mobile`
- Apps/paquetes afectados: `apps/mobile`, `docs/adr/0032-viroreact-arcore-arkit-poc.md`
- Estado: Implementada
- Solicitada: 2026-11-21
- Aprobada: 2026-11-21
- Aprobación funcional: Aprobada

## Problema y contexto

La spec 015 entrega AR location-based (GPS + brújula + cámara). Los puntos aparecen por dirección/FOV, pero pueden verse sobrepuestos y moverse con la cámara porque no hay anclaje AR nativo. Se requiere un PoC para evaluar ARCore/ARKit en dispositivo físico y determinar si puede ofrecer anclaje más estable para recintos/`zoo_places`.

El 25 de noviembre de 2026 se retiró temporalmente el acceso a la PoC desde el mapa tras el reporte de un cierre de la app. `Iniciar AR` abre el modo por ubicación y el control `Volver al mapa 2D` permite salir de la vista de cámara.

## Objetivos

- Validar técnicamente `@reactvision/react-viro@3.1.1` en un development build de Expo 57/RN 0.86.
- Mostrar un PoC de marcadores AR en sesión AR nativa (ARCore primero, si se aprueba).
- Mantener el modo location-based actual como fallback.
- Documentar limitaciones, compatibilidad y pasos de build.

## Fuera de alcance

- Reemplazar completamente el modo location-based.
- Soporte garantizado en Expo Go.
- Cloud anchors, persistencia multiusuario, o mapeo SLAM avanzado.
- Ruteo por `path_edges` (sigue bloqueado por DBR).
- Publicación a tiendas.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante/prueba en campo | Ver marcadores AR anclados en PoC | Cámara, ubicación en primer plano; sensores según SDK |
| Desarrollador | Construir y probar dev build | Entorno Android/EAS, dispositivo ARCore compatible |

## Criterios de aceptación

- **CA-01 (ADR y SDD):** Dado que se introduce una dependencia/tecnología nueva, cuando se inicia la PoC, entonces existe ADR borrador/aprobado y spec/plan/tasks 016 antes de instalar dependencias.
- **CA-02 (Dev build):** Dado el stack Expo 57/RN 0.86, cuando se configura la PoC, entonces el proyecto puede generar un development build/EAS con la configuración de ViroReact documentada; Expo Go queda explícitamente no soportado para la PoC.
- **CA-03 (Sesión AR nativa):** Dado un dispositivo compatible con ARCore, cuando el usuario abre la PoC AR, entonces se inicia una sesión AR nativa y la cámara muestra la escena AR sin bloquear la app.
- **CA-04 (Marcadores PoC):** Dado coordenadas GPS de prueba/recintos cercanos, cuando la sesión AR está activa, entonces la PoC intenta colocar marcadores/objetos 3D en posiciones correspondientes; si la precisión/anclaje no es confiable, muestra estado claro.
- **CA-05 (Fallback):** Durante la suspensión temporal de la PoC, al tocar `Iniciar AR` se abre el modo por ubicación sin mostrar `AR nativa PoC` ni la etiqueta `AR`. `Volver al mapa 2D` cierra la vista de cámara.
- **CA-06 (Pruebas/documentación):** Dado la entrega del PoC, cuando se cierre, entonces existe documentación de instalación/build, limitaciones encontradas, y cada CA tiene evidencia o test/manual check nombrado.

## Reglas de negocio

- **RN-01 (Fallback obligatorio):** location-based no se elimina durante la PoC.
- **RN-02 (Sin Expo Go para PoC):** la PoC nativa se prueba en dev build/EAS.
- **RN-03 (Privacidad):** cámara solo en primer plano; sin grabación/transmisión de frames.
- **RN-04 (Dependencia aprobada):** no agregar `@reactvision/react-viro` sin ADR/spec aprobados.
- **RN-05 (Alcance PoC):** la PoC no modifica esquema MySQL ni contratos API existentes.

## Dependencias y riesgos

- Dependencia: `@reactvision/react-viro@3.1.1` (candidata).
- Riesgo alto: compatibilidad real con Expo 57/RN 0.86/New Arch en el proyecto.
- Riesgo alto: calibración GPS→AR local.
- Riesgo medio: tamaño de app/build y configuración Android.

## Revisión

- **Aprobación funcional:** Pendiente.
- **Aprobación técnica:** Pendiente.
