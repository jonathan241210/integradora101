# 001 · responsive-demo-login

- App dueña: `pwa`
- Apps/paquetes afectados: `apps/pwa`
- Estado: Aprobada
- Solicitante / responsable funcional: Solicitante de esta conversación; responsable veterinario por identificar
- Aprobación funcional: Solicitante, 2026-10-10; ampliación de instalación desde navegador aprobada por solicitante, 2026-10-10

## Problema y contexto

La PWA veterinaria tiene una maqueta con las pantallas de inicio, registro de animal, diagnóstico, revisión y listado de animales, pero todas aparecen juntas y no se adaptan como una aplicación con un flujo usable en computadora y teléfono. La persona solicitante pide separar y adaptar la interfaz a distintos tamaños e incorporar un inicio de sesión.

La API aún no está implementada. Se propone un acceso de demostración local, con credenciales ficticias visibles y estado solo en memoria. No es autenticación ni protección de datos.

## Objetivos

- Presentar la PWA en pantallas distinguibles y navegables, conservando las funciones visuales incluidas en la maqueta.
- Adaptar navegación, formularios, listados y espacios entre pantallas a computadora, tablet y teléfono, sin desbordamiento horizontal.
- Mostrar un login de demostración antes del panel y permitir salir de la demostración.
- Dejar claro en la interfaz que el acceso y los datos son demostrativos.
- Permitir instalar la PWA desde un navegador móvil compatible o guiar a la persona para añadirla a la pantalla de inicio cuando el navegador no ofrezca un prompt.

## Fuera de alcance

- Autenticación real, autorización, protección de rutas o sesiones seguras.
- Conexión con `apps/api`, Sanctum, `@arca/api-client` o persistencia de datos.
- Guardar formularios, datos clínicos, credenciales o estado de sesión en almacenamiento local o remoto.
- Sincronización offline, IndexedDB, service worker, instalación de dependencias PWA u otras funciones offline.
- Incorporar un router o una dependencia de navegación.
- Publicar la aplicación en Play Store o App Store.
- Convertir los formularios actuales en operaciones veterinarias reales.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Personal veterinario de demostración | Recorrer las pantallas y revisar la experiencia en teléfono y computadora | Ninguno; el acceso local no concede ni protege permisos |
| Equipo del proyecto | Validar visualmente el prototipo | Acceso al repositorio |

## Historias de usuario

Como personal veterinario, quiero iniciar la demostración y navegar por pantallas separadas para revisar el flujo de la PWA desde una computadora o un teléfono.

Como integrante del equipo, quiero que los formularios, la navegación y las listas se adapten a distintos anchos para poder evaluar la interfaz sin desbordamientos ni controles difíciles de usar.

## Criterios de aceptación

- **CA-01:** Dada la pantalla de inicio de sesión, cuando se abra la PWA, entonces muestra campos etiquetados de usuario y contraseña, credenciales ficticias visibles y un aviso persistente de que el acceso es solo una demostración.
- **CA-02:** Dado el formulario de acceso, cuando se envíen las credenciales ficticias definidas en RN-01, entonces se muestra el panel de demostración; cuando las credenciales no coincidan, entonces se conserva el formulario y se presenta un error comprensible y accesible. Salir de la demostración devuelve al login.
- **CA-03:** Dado que se inició la demostración, cuando se use la navegación, entonces se puede mostrar por separado Inicio, Animales, Registrar animal, Registrar diagnóstico y Registrar revisión; no se presentan todos los formularios como una sola página larga.
- **CA-04:** Dadas las pantallas de la PWA, cuando se visualicen a 360, 390, 768, 1024 y 1366 píxeles de ancho, entonces los controles y la navegación siguen siendo legibles y operables, no hay desbordamiento horizontal y los formularios ajustan sus columnas al espacio disponible.
- **CA-05:** Dadas las pantallas de login y del panel, cuando se recorran con teclado, entonces cada control interactivo tiene foco visible, etiquetas asociadas y nombres accesibles en español.
- **CA-06:** Dada la implementación, cuando se ejecute la suite automatizada de la PWA, entonces existen pruebas que nombran y verifican cada criterio CA-01 a CA-05 y CA-07 a CA-08.
- **CA-07:** Dado un navegador móvil compatible con la instalación web y una versión servida por HTTPS, cuando la persona solicite instalar ZooHealth, entonces se ofrece el prompt nativo del navegador; si el navegador no ofrece ese prompt, entonces se muestran instrucciones claras para añadir la página a la pantalla de inicio. En modo de aplicación independiente o después de la instalación en la sesión actual no se muestra una acción de instalar.
- **CA-08:** Dada la PWA desplegada, cuando el navegador lea su manifiesto, entonces encuentra el nombre ZooHealth, modo de presentación independiente y recursos de icono válidos de 192 px y 512 px; el acceso directo abierto muestra la aplicación sin controles de navegación del navegador cuando la plataforma lo soporte.

## Reglas de negocio

- **RN-01:** El acceso es ficticio, validado solo en el cliente y no protege datos. Credenciales propuestas para la demostración: usuario `veterinario@demo.local` y contraseña `demo1234`.
- **RN-02:** El estado de login vive solo en memoria; recargar la página vuelve al login. No se guardan credenciales ni estado en almacenamiento del navegador.
- **RN-03:** La navegación solo controla qué vista presenta la demostración; no concede permisos reales.
- **RN-04:** La interfaz no enviará credenciales o formularios a ningún servidor, ni afirmará que un registro clínico fue guardado.
- **RN-05:** La UI usa contenido en español, tokens semánticos y componentes compartidos disponibles cuando existan; no añade colores de marca fijos en componentes.
- **RN-06:** La instalación se realiza por las capacidades del navegador mediante un manifiesto web, sin publicar en tiendas y sin agregar service worker, caché offline, IndexedDB ni sincronización.
- **RN-07:** La opción de instalación solo se ofrece en contextos seguros donde sea soportada. Cuando no existe prompt instalable, la UI presenta las instrucciones manuales de la plataforma y no simula que la instalación fue exitosa.

## Datos, privacidad y auditoría

Solo se muestran datos ficticios estáticos. Las credenciales propuestas son públicas y exclusivas de demostración, no deben reutilizarse como contraseñas reales. No se recopilan ni persisten datos personales o clínicos, no se registra actividad en servidor y no se afirma que el login proporcione seguridad. La interfaz debe mostrar el carácter demostrativo de forma clara. El manifiesto y los iconos son recursos públicos; fuera de localhost, la instalación requiere que el sitio esté servido mediante HTTPS. Esta feature no crea ni configura hosting o certificado.

## Flujos y errores

1. Al abrir la aplicación, se presenta el login y la advertencia de demostración.
2. Las credenciales ficticias correctas muestran el panel; las incorrectas producen un mensaje visible y asociado al formulario.
3. Desde el panel se navega entre Inicio, Animales y los tres formularios existentes. Cada vista se presenta separada y el diseño de navegación se adapta al ancho disponible.
4. Salir regresa al login. Recargar también devuelve al login porque no hay persistencia.
5. En móvil, los campos se apilan cuando sea necesario y la navegación permanece disponible; en tablet y computadora se aprovecha el ancho sin reducir la legibilidad.
6. En navegadores compatibles, la acción de instalar solicita al navegador mostrar el prompt nativo y refleja si la persona lo aceptó o lo descartó.
7. En iOS/Safari u otros navegadores sin prompt nativo, la opción abre instrucciones de “Compartir” y “Añadir a pantalla de inicio”; en modo independiente o si ya está instalada no se presenta como disponible.

## Dependencias, riesgos y preguntas

- Dependencias/ADR: ADR 0002 acepta React, TypeScript y Vite para SPAs; no se agrega router. No se usa `vite-plugin-pwa` ni se instala dependencia; esta ampliación usa manifiesto y eventos estándar del navegador, sin service worker.
- Riesgos: El login local podría confundirse con autenticación real; se mitiga con aviso persistente y credenciales visibles de demostración.
- Riesgos: La disponibilidad del prompt depende del navegador y de servir por HTTPS; se mitiga con instrucciones de instalación manual y documentación de requisitos.
- Preguntas pendientes: Aprobar la ampliación de instalación desde navegador, sus instrucciones manuales y los recursos de icono definidos en esta spec.

## Revisión

- Aprobación funcional inicial: Solicitante, 2026-10-10 (login de demostración y responsive).
- Aprobación funcional de instalación desde navegador: Solicitante, 2026-10-10; responsable veterinario por identificar.
- Evidencia/enlaces: Referencia visual adjunta en la conversación.
