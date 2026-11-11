# 004 · animal-registration

- App dueña: `pwa`
- Apps/paquetes afectados: `pwa`, API existente `api-003`
- Estado: En progreso
- Aprobación funcional: solicitante, 2026-11-10, autorización explícita para guardar animales en `arca_pruebas`.

## Problema y objetivos

El registro desde la PWA debe compartir la sesión Sanctum y cumplir las restricciones de la tabla existente. `animals.enclosure_id` es obligatorio y no tiene valor predeterminado; por eso el formulario debe permitir seleccionar un recinto válido antes de guardar en `arca_pruebas`.

## Fuera de alcance

- Guardar diagnósticos o revisiones clínicas.
- Guardado offline, sincronización, cambios de esquema o nuevas rutas de API.
- Registrar animales fuera de `arca_pruebas` durante el desarrollo.

## Actores e historia de usuario

Como personal veterinario autenticado, quiero registrar un animal desde ZooHealth para que la API lo almacene y aparezca en el directorio.

## Criterios de aceptación

- **CA-01:** Al enviar datos válidos desde una sesión veterinaria, la PWA envía el formulario a `POST /api/v1/staff/animals` bajo el mismo origen, incluyendo la cookie Sanctum y el token CSRF. Ante la respuesta `201`, muestra confirmación y limpia el formulario.
- **CA-02:** Ante una sesión vencida, validación rechazada o fallo de conexión, la PWA muestra un mensaje en español y no informa éxito; conserva los datos del formulario para permitir corregir o reintentar.
- **CA-03:** La PWA carga los recintos disponibles, exige seleccionar uno y lo envía como `enclosure_id`. La API rechaza recintos faltantes o inexistentes y persiste el animal asociado al recinto elegido.

## Reglas de negocio, datos y privacidad

- **RN-01:** La API conserva autoridad sobre validación y persistencia. El servidor asigna la persona responsable y los valores iniciales del registro.
- **RN-02:** La PWA usa `createHttpClient` compartido con `credentials: include` y CSRF de Sanctum; no almacena credenciales ni tokens.
- **RN-03:** El recinto es obligatorio porque `animals.enclosure_id` no admite nulos ni tiene valor predeterminado. No se asigna un recinto arbitrario; la persona que registra selecciona uno de los recintos existentes.
- **RN-04:** Solo se envían los campos ya definidos por el endpoint. La sesión debe ser de personal activo y la base de desarrollo es `arca_pruebas`.
- **RN-05:** No se guardan datos clínicos de diagnóstico o revisión, ni se promete funcionamiento offline.

## Dependencias y revisión

- Depende del endpoint existente `POST /api/v1/staff/animals`, sus tablas ya disponibles y la configuración local de Sanctum.
- No requiere DBR ni cambios al esquema.
- La aprobación de este alcance no autoriza persistencia de diagnósticos ni revisiones clínicas.
