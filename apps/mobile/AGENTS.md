# App móvil — reglas de la app

Lee `../../CONSTITUTION.md`, `../../AGENTS.md` y `../../docs/05-flujo-sdd.md` antes de trabajar.

## Carpetas
- `specs/`: alcance visitante, historias y CA-xx/RN-xx.
- `plan/`: diseño móvil, permisos del dispositivo y contratos.
- `tasks/`: pasos T-xx vinculados con criterios de aceptación.
- `docs/`: referencia local y manual de uso.
- `src/`: único lugar de código de esta app.
Los artefactos comparten `NNN-slug.md`; trabaja solo con spec aprobada y tareas.

## Reglas de cliente móvil
- Cliente React Native; la API central conserva negocio, datos y autorización.
- Usa `@arca/api-client` para contratos permitidos y `@arca/tokens` para diseño compartido.
- El alcance previsto incluye mapa, escáner QR y visores 3D cuando los aprueben sus specs.
- Solicita permisos de cámara explícitamente y minimiza el acceso al dispositivo.
- Ofrece alternativas accesibles cuando una función dependa de sensores o cámara.
- Expo/React Native está aprobado por el ADR 0004; respeta el alcance de la spec vigente. Cámara real, lectura QR y renderizado 3D requieren dependencias y specs aprobadas propias.
- No incluir secretos ni tokens de servicio; conserva solo datos públicos necesarios.
- Zoopedia tiene ADR 0005 abierto: no crear carpeta, motor ni SDK antes de una decisión.
- Escribe UI/mensajes en español; valida accesibilidad y compatibilidad de dispositivos.
- Prueba cada CA-xx en el nivel automatizado disponible y registra limitaciones del simulador.
- No usar Inertia ni Wayfinder.
- Actualiza documentación local para permisos y flujos móviles duraderos.
- No inicializar manifests ni dependencias sin SDD y aprobación.
