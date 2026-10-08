# 0004 · Aplicación móvil con React Native

- Estado: Propuesto
- Fecha: 2026-10-03
- Spec relacionada: Por definir al iniciar la implementación

## Contexto
Visitantes necesitan mapa del zoológico, lector QR, contenido pedagógico y visores 3D en dispositivos móviles. El cliente consume la API central sin lógica de negocio propia.

## Decisión propuesta
Usar React Native para `apps/mobile`; Expo es el flujo candidato para desarrollo, compilación y distribución, pendiente de aprobación. Compartir tokens y cliente API donde sea compatible; permisos del dispositivo y representación 3D requieren evaluación por plataforma.

## Alternativas consideradas
- PWA móvil, que puede limitar capacidades de cámara, offline y render 3D según dispositivo.
- Clientes nativos separados por sistema operativo, con mayor costo de mantenimiento.

## Consecuencias
### Positivas
Comparte lenguaje y parte de los contratos con SPAs, con acceso a capacidades nativas.
### Riesgos o costos
Compatibilidad de cámara/QR, bibliotecas 3D, accesibilidad, soporte de plataformas y publicación aún requieren validación.

## Validación y revisión
Confirmar matriz de dispositivos, lector QR, visor 3D, herramienta de compilación y distribución antes de aprobar dependencias.
