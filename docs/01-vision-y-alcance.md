# Visión y alcance

## Propósito
ARCA-NB digitaliza procesos del Zoológico Municipal Nicolás Bravo, centro de rescate, conservación y rehabilitación de fauna silvestre de la Presidencia Municipal de Tulancingo. Apoya la gestión de decomisos, maltrato y tráfico ilegal, y mejora los servicios a visitantes sin sustituir el criterio de las personas responsables.

## Necesidades
1. **Administrativa y financiera:** registrar la venta digital de boletos en taquilla y generar automáticamente el cierre/arqueo diario, con reportes para la Dirección de Ingresos.
2. **Médico-veterinaria:** conservar en la nube expedientes clínicos de cada ejemplar (vacunas, dietas y tratamientos). La herramienta debe tolerar el trabajo de campo: el equipo puede usar papel y transcribir la información después.
3. **Experiencia del visitante:** relacionar recintos físicos con contenido digital mediante QR, fichas pedagógicas y modelos 3D. Zoopedia añade una experiencia de juego educativo que desbloquea especies y hábitats al visitar el zoológico.

## Componentes y usuarios
- Portal institucional público (`apps/web`): noticias, eventos y catálogo.
- Administración interna (`apps/dashboard`): caja, cierre, panel ejecutivo y tareas administrativas.
- Captura veterinaria (`apps/pwa`): expedientes, trabajo adaptable a conectividad limitada y sincronización de borradores.
- App visitante (`apps/mobile`): mapa, escaneo QR y visualización 3D.
- API única (`apps/api`) y paquetes compartidos `@arca/*`.
- Zoopedia: alcance pedagógico identificado; motor y plataforma se decidirán mediante ADR 0005, sin crear aún una app.

Roles de negocio: `admin`, `executive`, `cashier`, `veterinarian` y visitante anónimo. El significado y los permisos están en [roles y permisos](03-roles-y-permisos.md).

## Alcance inicial
- Definir fuentes de datos, permisos, contratos de API y procesos mediante SDD antes de implementar.
- Mantener MySQL 8 estándar, API central y configuración por entorno, compatible con Google Cloud y una futura instalación de MySQL Server local.
- Entregar interfaz en español y persistir identificadores de código en inglés.
- Permitir borradores veterinarios offline que se sincronizan; la API y MySQL mantienen la autoridad final.

## Fuera de alcance o pendiente
- No se decide todavía el framework del juego (ADR 0005 abierto).
- La PWA no permite mutaciones offline autoritativas: resguarda borradores sujetos a sincronización y validación de la API.
- Infraestructura y despliegue no están implementados; Docker Compose se planeará para desarrollo local.
- Este repositorio está en fase inicial: los directorios de apps son espacios de trabajo, no aplicaciones instaladas.

## Criterio de evolución
Cada feature debe tener spec aprobada, plan y tareas vinculadas, con criterios verificables, responsable funcional identificado y aprobación registrada. La guía está en [flujo SDD](05-flujo-sdd.md).
