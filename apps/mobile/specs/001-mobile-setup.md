# 001 · mobile-setup

- App dueña: `mobile`
- Apps/paquetes afectados: `@arca/api-client`, `@arca/tokens`
- Estado: Implementada
- Solicitante / responsable funcional: Equipo Técnico (Arquitectura ARCA-NB)
- Aprobación funcional: Equipo Técnico, 2026-10-08

## Problema y contexto
Se requiere establecer la base estructural para la aplicación móvil nativa de ARCA-NB, destinada a los visitantes del parque. Conforme a las decisiones del ADR 0004, se utilizará React Native y Expo como marco de trabajo. Es necesario proveer un entorno mínimo configurado en el monorepo y compatible con el estándar local de desarrollo, preparando el terreno para las futuras funcionalidades, sin desarrollar aún el lado de negocio.

## Objetivos
- Inicializar el entorno React Native + Expo en `apps/mobile` (plataforma **Android**).
- Implementar el enrutamiento base soportado por **`expo-router`**.
- Configurar el entorno de pruebas automatizadas con **Jest** y **`@testing-library/react-native`** para dar cumplimiento al Principio IV desde el día uno.
- Garantizar que la app pueda ejecutarse y probarse localmente sin depender de la nube.
- Configurar la resolución correcta para importar dependencias locales del monorepo (`@arca/api-client` y `@arca/tokens`).
- Establecer configuraciones bases alineadas con los requisitos mínimos de hardware aprobados.

## Fuera de alcance
- Implementación de mapas, lector QR, o visor 3D (requieren sus propias specs posteriores).
- Evaluación real de rendimiento gráfico/memoria o estrés, la cual se trasladará a la spec del visor 3D/QR donde existirá carga real que medir.
- Módulo de Zoopedia y funcionalidades reales de negocio.
- Compilación final y distribución en tiendas de apps / EAS build completo final.
- Soporte e inicialización para iOS.

## Actores y permisos
| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Desarrollador | Entorno base funcional para desarrollo móvil local | N/A |

## Historias de usuario
Como `desarrollador de ARCA-NB`, quiero `contar con un esqueleto base en Expo con Router y Jest configurados` para `implementar gradualmente las características del visitante respetando la Constitución del proyecto`.

## Criterios de aceptación
- **CA-01 (Inicialización local):** Dado un entorno de desarrollo local, cuando se levante el entorno de Expo, la aplicación base deberá servir exitosamente en un dispositivo o emulador Android sin requerir la nube.
- **CA-02 (Integración en monorepo):** Dada la estructura la app, cuando un componente importe desde `@arca/tokens` o `@arca/api-client`, el empaquetador Metro debe resolver y renderizar el contenido sin errores de resolución de módulo ("Module not found").
- **CA-03 (Ejecución del Router sin excepciones):** Dado el proceso de arranque de la aplicación, cuando se carga la ruta inicial `/` configurada en `expo-router`, entonces se despliega un mensaje de bienvenida visible sin disparar pantallas de error nativo ("Redbox") ni excepciones en consola.
- **CA-04 (Pruebas unitarias vinculadas):** Dada la infraestructura local inicial, cuando se ejecute el comando automatizado de pruebas, Jest debe detectar y pasar exitosamente al menos un test unitario que compruebe los componentes de la vista principal.

## Reglas de negocio
- **RN-01:** La arquitectura deberá regirse bajo los lineamientos del Principio I (stack mínimo) y el ADR 0004.
- **RN-02:** No se solicitarán permisos de hardware base en el manifiesto (`app.json`) que no sean comprobables y necesarios para el entorno vacío.
- **RN-03:** Cada componente agregado a partir de este punto debe contar con un test explícito verificable por Jest (Principio IV).

## Datos, privacidad y auditoría
En esta etapa estructural no se manipula información clínica o de usuarios ni se instalan almacenes offline o integraciones API definitivas; cualquier futura retención será parte de otra spec.

## Flujos y errores
- **Gestión de dependencias del monorepo:** Se debe configurar y mitigar explícitamente el fallo del empaquetador Metro de React Native al resolver bibliotecas empaquetadas (workspaces/symlinks) en un monorepo.

## Dependencias, riesgos y preguntas
- **Dependencias/ADR:** ADR 0004 (Aprobado).
- **Riesgos:** Retrasos técnicos configurando el enlazado local (Workspaces) con el empaquetador Metro y Jest, ya que requiere plugins y resoluciones particulares en monorepos.
- **Preguntas pendientes:** Ninguna; las decisiones de router y testing están resueltas.

## Revisión
- Aprobadores y fecha: Equipo Técnico ARCA-NB, 2026-10-08
- Evidencia/enlaces: (PR asociado en el futuro)

## Evolución

La pantalla de bienvenida de CA-03 cumplió el propósito de validar la inicialización del Router en la spec 001. La navegación visitante y Home actuales la sustituyen conforme a la spec 002; no se debe recrear una ruta de bienvenida separada.
