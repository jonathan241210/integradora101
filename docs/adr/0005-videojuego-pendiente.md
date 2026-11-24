# 0005 · Tecnología del videojuego Zoopedia

- Estado: Rechazado — fuera de alcance de esta entrega
- Solicitada: 2026-10-03
- Spec relacionada: Por definir; no existe carpeta de juego
- Justificación: no hay motor, contenido ni requisitos verificables definidos. La pestaña de juego de `apps/mobile` es un prototipo visual sin motor (spec mobile-002); no implementa esta decisión.

## Contexto
Zoopedia es la experiencia educativa de juego móvil de baja poligonización que permite desbloquear especies y hábitats durante visitas físicas. Aún no están definidos motor, contenido, dispositivos objetivo ni relación técnica con la app visitante.

## Decisión
Pendiente. No crear una carpeta de juego ni instalar motor o SDK hasta acordar la decisión mediante este ADR y definir requisitos verificables.

## Alternativas por evaluar
Motores multiplataforma 3D, integración con `apps/mobile` o distribución como componente separado. La comparación debe considerar desempeño en dispositivos objetivo, tamaño, accesibilidad, escaneo QR, mantenimiento y capacidad del equipo.

## Consecuencias
La documentación y otras apps pueden diseñar contratos y contenidos de desbloqueo sin depender de un motor todavía no seleccionado.

## Validación y revisión
El equipo y los responsables funcionales revisarán requisitos pedagógicos, operativos y de dispositivos antes de aceptar una alternativa. La aprobación registrará la opción, límites y plan de integración.
