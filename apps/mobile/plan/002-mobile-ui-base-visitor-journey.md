# Plan técnico · 002 · mobile-ui-base-visitor-journey

- Spec: `apps/mobile/specs/002-mobile-ui-base-visitor-journey.md`
- Estado de spec: Aprobada
- Aprobación funcional: Solicitante / responsable funcional, 2026-10-09
- Aprobación técnica: Solicitante, 2026-10-09
- Aprobación funcional de enmienda CA-07/RN-09: Solicitante, 2026-10-11
- Estado del plan: Aprobado

## Diseño de solución
Implementación de la capa de interfaz de usuario para el visitante siguiendo el patrón MVVM. La aplicación se divide en capas estrictas para garantizar que la UI sea independiente de la fuente de datos, permitiendo la transición de mocks a API Laravel sin modificar las vistas.

### Flujo de Datos
`Route (Expo Router)` $\rightarrow$ `ViewModel (React Hook)` $\rightarrow$ `Repository` $\rightarrow$ `Mock Data` (utilizando `Model` types)

Las rutas solo orquestan navegación y presentan estado proveniente de ViewModels. No importan Repositories ni mocks. Para conservar inyección y testabilidad sin añadir dependencias, los hooks ViewModel encapsulan la selección del Repository y permiten sustituirlo en pruebas.

### Enmienda propuesta a CA-07: tema móvil institucional

El adaptador React Native existente seguirá siendo el punto único de acceso de la app a `@arca/tokens`. Se alinearán las exportaciones TypeScript del paquete con `docs/04-sistema-de-diseno.md`: `base` `#661a2f`, `primary` `#87293a`, `secondary` `#b79159`, `accent` `#DEC9A3`, texto blanco `#ffffff` y texto negro `#000000`. El token semántico `danger` se alineará con el valor compartido `#c34242`. Los aliases de superficie neutra (`background`, `surface`, `border`, `primarySoft`) usarán los valores equivalentes ya publicados por `tokens.css`. Los consumidores no definirán hex de marca.

Para conservar contraste, los textos sobre `primary` y `base` usarán blanco; sobre `secondary` y `accent`, negro. Los usos de `accent` como color de texto sobre fondos claros se sustituirán por `primary`; `accent` se mantiene para fondos, bordes e iconos con contraste suficiente. `primarySoft` se mapeará a la superficie neutral sutil existente, no a una nueva variante de marca. Los cinco valores mock de `placeholderTint` se conservan: solo colorean el placeholder de un animal cuando falta su fotografía y no representan la identidad institucional. La etiqueta del placeholder usa fondo neutral oscuro y texto blanco para mantener legibilidad con cualquiera de esos tintes.

## Cambios por área
| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| **Rutas** | `src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/*.tsx`, `src/app/animal/[id].tsx` y rutas secundarias | Definición de las cinco pestañas y rutas Home, Map, Scan, Collection, Profile, Search, Animal Detail, Game, Tour 3D, detalles de eventos/misiones/logros y estados QR; sin acceso directo a datos. |
| **ViewModels** | `src/viewmodels/*.ts` | Gestión de estado de presentación y coordinación de acciones. |
| **Repositorios** | `src/repositories/*.ts` | Abstracción de acceso a datos (implementación mock). |
| **Modelos** | `src/models/*.ts` | Entidades y tipos de dominio (Animal, User, etc.). |
| **Vistas** | `src/screens/*.tsx` | Componentes de pantalla props-driven (presentación pura). |
| **Componentes** | `src/components/ui/*.tsx`, `src/components/domain/*.tsx` | Kit UI base, símbolos de `expo-symbols` y componentes especializados por dominio; placeholders de imagen seguros cuando falte una URL. |
| **Tema** | `apps/mobile/src/theme/tokens.ts`, `apps/mobile/src/theme/index.ts`, `packages/tokens/index.ts` | Adaptador nativo y exportaciones institucionales alineadas con los defaults documentados, conservando aliases neutrales y semánticos. |
| **UI móvil** | `apps/mobile/src/components/`, `apps/mobile/src/screens/` | Corregir los usos de tokens de marca y foreground para aplicar la identidad institucional con contraste. |
| **Pruebas y documentación** | `apps/mobile/__tests__/theme.test.ts`, pruebas CA-07, `packages/tokens/README.md`, `apps/mobile/README.md`, `apps/mobile/docs/002-mobile-ui-visitor-journey.md` | Verificar el mapeo y contraste, documentar la fuente de valores y la exclusión de tonos ilustrativos por especie. |
| **Mocks** | `src/mocks/*.ts` | Fuente de datos simulados utilizada por los repositorios. |

## Contrato y datos
Dado que esta Spec es puramente de UI y utiliza mocks, no se definen endpoints de API ni migraciones de base de datos.
- **Mocks:** Se implementarán en `src/mocks/` siguiendo la estructura de datos propuesta en la referencia visual.
- **Contratos:** Los repositorios definirán interfaces que serán compatibles con los DTOs futuros de `@arca/api-client`.
- **Enmienda de tema:** Se utilizan los defaults documentados como fuente; no se consulta `GET /api/theme`, no se accede ni escribe en `settings_colores`, y no se altera su contrato.

## Seguridad, offline y operación
- **Datos:** No se manejan datos sensibles ni persistencia local en esta fase.
- **Operación:** La app se ejecutará localmente mediante `npx expo start`.
- **Portabilidad:** Se respeta la configuración de Android definida en el ADR 0004.

## Mapeo de criterios a pruebas
| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | `test-ca-01` (análisis estático de imports entre Routes, Views, ViewModels y Repositories) | `apps/mobile/__tests__/` |
| CA-02 | `test-ca-02` (rutas y acciones de las cinco pestañas) | `apps/mobile/__tests__/` |
| CA-03 | `test-ca-03` (correspondencia de rutas secundarias con la pestaña activa) | `apps/mobile/__tests__/` |
| CA-04 | `test-ca-04` (búsqueda, navegación a detalle, estado descubierto y caso inexistente) | `apps/mobile/__tests__/` |
| CA-05 | `test-ca-05` (tres resultados de simulación QR y sus rutas) | `apps/mobile/__tests__/` |
| CA-06 | `test-ca-06-auto` (estructura UI) y `test-ca-06-manual` (Android real o emulador) | `apps/mobile/__tests__/` y evidencia de validación |
| CA-07 | `test-ca-07` (mapeo exacto de defaults institucionales, `danger` compartido, uso de tokens, exclusión de la paleta de marca verde/amarilla y contraste WCAG AA ≥ 4.5:1; conservación de tintes mock por especie) | `apps/mobile/__tests__/theme.test.ts` y pruebas de componentes en `apps/mobile/__tests__/` |
| CA-08 | `test-ca-08` (Views, ViewModels, Repositories y rutas; cobertura mínima 80% en ViewModels/Repositories) | `apps/mobile/__tests__/` |
| CA-09 | `test-ca-09` (detalle de evento/misión y selección de destino 3D) | `apps/mobile/__tests__/` |
| CA-10 | `test-ca-10` (promoción de aventura, logros, clasificación y vista previa de animales pendientes) | `apps/mobile/__tests__/` |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Conforme al diseño | Expo SDK 57 y RN 0.86.3 según ADR 0004; no se proponen dependencias nuevas. |
| II. La spec manda | Conforme al diseño | Se implementan las pantallas y flujos aprobados, incluyendo CA-09 y CA-10; cámara, GPS/mapa real, 3D real y persistencia quedan fuera. |
| III. Lógica separada de la interfaz | Conforme | `test-ca-01` pasó; Routes y Views no acceden a mocks/Repositories y ViewModels coordinan Repositories. |
| IV. Un test por criterio | Conforme al diseño | Criterios CA-01 a CA-10 tienen pruebas; la actualización de CA-07 añade verificación automatizada de valores exactos y contraste WCAG AA antes de cerrar la tarea. |
| V. Una sola fuente de verdad para los datos | Conforme al diseño | Para esta etapa, mocks accesibles solo mediante Repositories; no hay persistencia local ni remota. |
| VI. Código en inglés, personas en español | Conforme | Identificadores y rutas en inglés; textos de UI y documentación para la persona visitante en español. |

## Riesgos y decisiones
- **Resolución de Metro:** Configuración de `metro.config.js` ya implementada en Spec 001 para soportar workspaces y `@arca/tokens`.
- **Rendimiento Visual:** Riesgo de solapamientos en Android. Mitigación: Uso obligatorio de `react-native-safe-area-context`.
- **Activos de animales:** La referencia no incluye fotos; el UI usará placeholders de forma segura si no hay URL, sin depender de archivos de `arca-ui-reference`.
- **Validación CA-06:** La inspección manual en Android con Expo Go fue confirmada por la persona solicitante el 2026-10-09; queda registrada en T-28.
- **Atrás y teclado (enmienda 2026-10-23):** Las pestañas usan `backBehavior="none"`. El gesto atrás no deshace Home → Mapa → Colección. En una ruta secundaria vuelve a la pantalla que la abrió. Los formularios con scroll usan `KeyboardAvoidingView` y Android `softwareKeyboardLayoutMode: resize`. La comprobación en dispositivo queda en T-55; la automática cubre la historia de rutas y las props del contenedor.
- **Paleta móvil desalineada:** `packages/tokens/index.ts` todavía exporta verde/amarillo aunque la guía de diseño y `tokens.css` definen los valores institucionales; la enmienda los alinea y añade comprobaciones del contrato.
- **Contraste de acento:** El acento claro no debe utilizarse como texto sobre superficies blancas; se reemplazará ese uso por el primario y se verificará el contraste de las combinaciones expuestas.

## Orden y aprobación
1. **T1: Adaptador de Tema y Tokens:** Configurar `src/theme` consumiendo `@arca/tokens`.
2. **T2: Infraestructura MVVM y Mocks:** Crear carpetas `models`, `repositories`, `viewmodels` y `mocks`, con contenido demostrativo extendido para eventos y misiones.
3. **T3: Kit UI Base:** Implementar componentes en `src/components/ui`.
4. **T4: Navegación y Layout:** Configurar `(tabs)/_layout.tsx` y `AppTabBar`.
5. **T5: Pantallas de Exploración:** Home, Search, Animal Detail.
6. **T6: Pantallas de Soporte:** Collection, Game, Profile.
7. **T7: Flujos secundarios:** Scanner, estados QR, Tour 3D, detalles mock de eventos/misiones/logros, filtros de logros y selección visual de destino.
8. **T8: Verificación Final:** Ejecución de todos los tests y validación visual en Android, incluyendo legibilidad, iconografía y desplazamiento.
9. **Enmienda CA-07 (aprobada técnicamente el 2026-10-11):** Alinear `@arca/tokens` para React Native con los defaults institucionales, conservar tintes de placeholders por especie, alinear el color semántico `danger`, corregir usos de acento con contraste insuficiente, ampliar `test-ca-07` y actualizar documentación móvil y del paquete.

**Aprobación funcional:** Solicitante / responsable funcional, 2026-10-09.
**Revisión y aprobación técnica:** Solicitante, 2026-10-09.
**Enmienda CA-07/RN-09:** Aprobada funcionalmente y técnicamente por la persona solicitante el 2026-10-11.

## Enmienda 2026-10-15 · Acceso y ajustes visuales

La persona solicitante confirmó cuatro pantallas de demostración y que las filas de Ajustes navegan. No se implementa la spec `004`.

| Pantalla | Ruta | Comportamiento |
|---|---|---|
| Login | `/login` | Panel de marca, correo, contraseña, olvido, separador «o», invitado en texto y registro. Abrir la app sin sesión llega aquí. |
| Registro | `/register` | Nombre de usuario, correo, contraseña y confirmación. Advierte que borrar la app no restaura esta demostración. Volver a Login. |
| Olvido | `/forgot-password` | Correo y aviso genérico, alineado a `api-004` CA-10. |
| Nueva contraseña | `/reset-password` | Código de 6 dígitos, nueva contraseña y confirmación. En la demostración cualquier código de 6 dígitos continúa. |
| Ajustes | `/settings` | Ficha de ejemplo e interruptores visuales de notificaciones y ubicación. Pestaña Perfil activa. Sin modo oscuro, idioma ni sonidos. |
| Mi cuenta | `/account` | Nombre y correo de ejemplo, con la misma advertencia. |
| Privacidad | `/privacy` | Cuatro secciones: datos, finalidad, protección y derechos. Texto de demostración. |
| Ayuda | `/help` | Cómo entrar, crear cuenta, recuperar contraseña y qué hacen los interruptores. |
| Acerca de | `/about` | ARCA-NB 1.0.0 y Zoológico Municipal Nicolás Bravo, Tulancingo. |

La compuerta vive en memoria (`signedOut` / `entered`). No usa almacenamiento seguro ni la API. Mayoría de edad, avatar, verificación real de correo y borrado de cuenta quedan en la spec `004`.

## Mapeo de criterios a pruebas
| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-11 | `test-ca-11` | `apps/mobile/__tests__/access.test.tsx` |
| CA-12 | `test-ca-12` | `apps/mobile/__tests__/access.test.tsx` |
| CA-13 | `test-ca-13` | `apps/mobile/__tests__/access.test.tsx` |
| CA-14 | `test-ca-14` y `test-ca-03` | `apps/mobile/__tests__/access.test.tsx`, `navigation.test.tsx` |
| CA-15 | `test-ca-15` | `apps/mobile/__tests__/access.test.tsx` |

## Constitution Check de la enmienda

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Conforme | Sin dependencias nuevas. `TextInput` y `Switch` pertenecen a React Native. |
| II. La spec manda | Conforme | CA-11 a CA-15 acotan la demostración. La cuenta real sigue fuera, en spec `004`. |
| III. Lógica separada de la interfaz | Conforme | Rutas y pantallas no importan repositorios ni mocks. La validación de formulario vive en el ViewModel. |
| IV. Un test por criterio | Conforme | Cada CA nuevo tiene una prueba que lo nombra. |
| V. Una sola fuente de verdad para los datos | Conforme | El estado visual vive en un repositorio en memoria y se pierde al recargar. No hay segunda base de datos. |
| VI. Código en inglés, personas en español | Conforme | Rutas e identificadores en inglés. Textos de interfaz en español. |
