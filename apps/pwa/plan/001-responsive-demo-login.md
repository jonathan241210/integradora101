# Plan técnico · 001 · responsive-demo-login

- Spec: `apps/pwa/specs/001-responsive-demo-login.md`
- Estado de spec: Aprobada
- Responsable técnico: Por identificar

## Diseño de solución

Convertir la maqueta de varias columnas en una SPA con vistas presentadas por separado y navegación local mediante estado React, sin router. La app inicia en un login de demostración; al validar las credenciales ficticias muestra un shell veterinario con Inicio, Animales, Registrar animal, Registrar diagnóstico y Registrar revisión. Cerrar sesión limpia el estado de acceso en memoria.

El shell usará navegación lateral en anchos amplios y navegación inferior en móvil. Formularios y listados ocuparán una columna en móvil, dos cuando el ancho lo permita y un layout de contenido acotado en escritorio. Los puntos de quiebre se verificarán a 360, 390, 768, 1024 y 1366 px.

La UI consume componentes disponibles de `@arca/ui` y tokens de `@arca/tokens`; el contenido, los fixtures y la credencial de demostración son ficticios. No hay llamadas a servidor ni almacenamiento del navegador.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| PWA: vistas | `src/App.tsx`, `src/views/LoginView.tsx`, `src/views/AppShell.tsx` y vistas para Inicio, Animales y formularios | Separar login, navegación y pantallas visibles |
| PWA: ViewModel | `src/viewmodels/pwaDemo.ts` | Mantener estado efímero de login y pantalla activa; validar exclusivamente la credencial fija de demostración |
| PWA: instalación | `src/viewmodels/usePwaInstall.ts`, `src/views/InstallAppAction.tsx`, `public/manifest.webmanifest`, `public/icons/` e `index.html` | Ofrecer prompt nativo o instrucciones manuales; configurar los metadatos/iconos públicos de instalación |
| PWA: estilos | `src/styles.css` | Layout adaptable, navegación desktop/móvil, foco visible y estilos semánticos |
| PWA: pruebas | `src/tests/login.test.tsx`, `src/tests/screens.test.tsx`, `src/tests/responsive.test.tsx`, `src/tests/accessibility.test.tsx`, `src/tests/install.test.tsx` | Cubrir login, navegación, responsividad, accesibilidad, instalación y manifiesto con Vitest |
| PWA: configuración | `package.json`, `package-lock.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts` | Configurar alias `@/`, componentes/tokens locales, Tailwind CSS 4 y Vitest conforme al stack existente |
| PWA: documentación | `README.md` | Explicar ejecución, acceso ficticio y límites de la demostración |
| API / datos | Sin cambios | La API no está inicializada y la autenticación real está excluida |

## Contrato y datos

- Endpoints con rutas nombradas, autenticación y permisos: ninguno; no se implementa autenticación real ni se usa `@arca/api-client`.
- Validación/Form Requests, Actions, Resources y Policies: no aplican a esta demostración local.
- Migraciones, `BaseModel`, auditoría y SoftDeletes: sin cambios; no hay datos persistidos.
- Credenciales: constante local propuesta en el ViewModel con el valor de RN-01; se muestra en el formulario y nunca se guarda.
- Estado: login, error y pantalla seleccionada permanecen en memoria React; recarga vuelve al login.
- Errores: credenciales incorrectas producen un mensaje asociado al formulario mediante `role="alert"`; no se captura ni oculta error de red porque no hay red.
- Compatibilidad: navegación de cliente por estado local; no se instala React Router ni se usan rutas del servidor.
- Instalación: enlazar desde `index.html` un manifiesto estático en `public/manifest.webmanifest` con nombre, `display: standalone`, colores tomados de tokens y dos iconos SVG con viewBox/cuadrado declarados en 192 y 512 px. No registrar service worker ni caché.
- La UI escuchará `beforeinstallprompt` solo en navegador/contexto compatible, llamará al prompt tras acción directa de la persona y escuchará `appinstalled`; en ausencia de prompt, mostrará una guía accesible para Añadir a pantalla de inicio (iOS/Safari y alternativa por menú de navegador). `display-mode: standalone` oculta la acción.
- La disponibilidad se valida en despliegue HTTPS; localhost se usa únicamente para desarrollo. No se afirma que instalar habilite trabajo offline.

## Seguridad, offline y operación

- El banner “Demostración: no autentica ni protege información” aparece en login y panel.
- La validación local de credenciales no se presenta como control de acceso y no protege datos ni operaciones.
- No enviar credenciales o campos de formularios a red, `localStorage`, `sessionStorage`, IndexedDB, cookies ni logs.
- Usar solo fixtures no sensibles; no afirmar que los formularios se guardan.
- Offline, reintentos, sincronización y service worker quedan fuera de alcance.
- La instalación se limita al manifiesto estático, iconos y APIs estándar del navegador; no se agrega `vite-plugin-pwa`, service worker ni publicación en tiendas. El prompt depende del navegador y el contexto seguro.
- La solución usa React, TypeScript y Vite ya presentes; Tailwind CSS 4 y Vitest están en la línea aprobada/documentada y se reutilizan según la configuración del dashboard. `@arca/ui` y `@arca/tokens` ya existen como paquetes locales. No se introduce ADR ni dependencia de autenticación.
- No se agregan dependencias de router, almacenamiento offline o pruebas browser nuevas.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | `describe("CA-01")`: markup del login, labels, credenciales ficticias y aviso de demostración | PWA, `src/tests/login.test.tsx` |
| CA-02 | `describe("CA-02")`: acceso correcto, error con credenciales incorrectas, logout y vuelta al estado inicial | PWA, `src/tests/login.test.tsx` |
| CA-03 | `describe("CA-03")`: vistas permitidas, selección de cada sección y shell con una sola vista activa | PWA, `src/tests/screens.test.tsx` |
| CA-04 | `describe("CA-04")`: comprobar reglas responsive y breakpoints en CSS; además inspeccionar en navegador y registrar el resultado a 360, 390, 768, 1024 y 1366 px | PWA, `src/tests/responsive.test.tsx` y validación visual |
| CA-05 | `describe("CA-05")`: labels, tipos de control, nombres accesibles, región de error y selectores `:focus-visible` | PWA, `src/tests/accessibility.test.tsx` |
| CA-06 | `describe("CA-06")`: confirmar que existen suites con nombres CA-01..CA-05 y CA-07..CA-08 | PWA, `src/tests/acceptance-coverage.test.tsx` |
| CA-07 | `describe("CA-07")`: probar selección entre prompt, guía manual, modo standalone e instalación reportada; inspeccionar visualmente comportamiento de navegador | PWA, `src/tests/install.test.tsx` y validación en navegador |
| CA-08 | `describe("CA-08")`: leer el manifiesto y verificar nombre, modo standalone, rutas públicas y recursos iconográficos en tamaños requeridos | PWA, `src/tests/install.test.tsx` |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | React/TypeScript/Vite; Tailwind CSS 4, Vitest y paquetes locales ya aprobados/documentados. Instalación mediante APIs estándar, sin nueva dependencia ni servicio propietario |
| II. La spec manda | Sí, condicionado | Spec `001-responsive-demo-login` aprobada con ampliación de instalación web; implementar solo ese alcance |
| III. Lógica separada de la interfaz | Sí | No hay lógica clínica, persistencia ni llamadas API; ViewModel solo gestiona estado visual y credencial ficticia |
| IV. Un test por criterio | Sí, condicionado | Prueba nombrada por cada CA; cobertura detallada en el mapeo y ejecución en `/verify` |
| V. Una sola fuente de verdad para los datos | Sí | No se crean ni guardan datos; sin cache offline ni alteración de MySQL |
| VI. Código en inglés, personas en español | Sí | Tipos y símbolos en inglés; labels, errores, documentación y spec en español |

## Riesgos y decisiones

- ADR requerido/aprobado: No se requiere ADR nuevo; no se usa el plugin propuesto no aprobado en ADR 0003 ni se agrega otra dependencia.
- Alternativa descartada: usar las credenciales ficticias como si fueran autenticación real; produciría una falsa garantía de seguridad.
- Riesgo de confusión con sistema operativo: aviso de demostración persistente, fixtures ficticios y ninguna confirmación de guardado.
- Riesgo de navegación inaccesible en móvil: probar teclado, foco y breakpoints indicados antes de cerrar la tarea.

## Orden y aprobación

1. Configurar la base de estilos/tokens, alias, Tailwind CSS 4 y Vitest.
2. Implementar el ViewModel de demostración y las vistas del login y shell navegable.
3. Separar las cinco vistas existentes y aplicar el layout responsive.
4. Añadir manifiesto e iconos y construir la acción de instalación con guía manual adaptable.
5. Añadir tests por criterio y actualizar la guía de ejecución e instalación.
6. Ejecutar pruebas, build, validación de tipos, `/verify` y recorrido visual en los cinco anchos acordados; verificar el manifiesto y contexto HTTPS de instalación.

- Dependencias: los pasos 2 y 3 dependen de la configuración del paso 1; la acción de instalación depende del manifiesto; pruebas y documentación verifican todas las vistas.
- Aprobación funcional: Solicitante, 2026-10-10.
- Aprobación técnica inicial del plan: Solicitante, 2026-10-10.
- Aprobación técnica de la ampliación de instalación: Solicitante, 2026-10-10.
