# Guía de validación · 002 · Experiencia visitante

La implementación móvil de esta etapa usa Expo Router, datos simulados y las vistas en `src/screens/`. La especificación define el alcance funcional y el plan describe su arquitectura:

- [Spec 002](../specs/002-mobile-ui-base-visitor-journey.md)
- [Plan 002](../plan/002-mobile-ui-base-visitor-journey.md)
- [Tareas 002](../tasks/002-mobile-ui-base-visitor-journey.md)
- [Guía de instalación](../README.md)
- [Arquitectura móvil](./arquitectura.md)

## Navegación

| Pantalla | Ruta | Acceso |
|---|---|---|
| Home | `/` | Pestaña Home |
| Mapa | `/map` | Pestaña Mapa |
| Escáner QR | `/scan` | Pestaña Escanear |
| Colección | `/collection` | Pestaña Colección |
| Perfil | `/profile` | Pestaña Perfil |
| Búsqueda | `/search` | Acción «Ver todo» en Home |
| Detalle | `/animal/[id]` | Tarjetas de Home, búsqueda y colección |
| Game | `/game` | Acción «Cómo conseguir puntos» en Home |
| Tour 3D | `/tour-3d` | Acción del recorrido en Mapa |
| Detalle de evento | `/event-detail?id=...` | Tarjeta de evento en Home |
| Detalle de misión | `/mission-detail?id=...` | Misión activa en Game |
| Logros | `/achievements` | Game («Ver todos») y Perfil («Ver todos») |
| Detalle de logro | `/achievement-detail?id=...` | Insignia o fila de logro |
| Resultados QR | `/qr-result`, `/qr-invalid`, `/qr-already-discovered` | Botones de simulación en desarrollo |

Las rutas secundarias conservan la barra de pestañas y resaltan la pestaña asociada; Detalle se presenta sin ella. Las pantallas secundarias usan `BackButton`, el control circular con flecha compartido con el detalle de animal, alineado a la izquierda, y mantienen una etiqueta accesible contextual. Aventura en el Zoo también ofrece regreso a la ruta anterior. El gesto/botón de regreso de Android sigue el historial de pantallas visitadas y no fuerza la navegación a Home; en el nivel raíz de una pestaña no debe cambiar de pantalla. La pestaña activa de Game sigue CA-03 de la spec (Home), aunque la referencia visual contiene un mapeo distinto.

Los eventos incluyen detalle mock con título, fecha, horario, ubicación, descripción y carrusel horizontal de imágenes si existe contenido; si no, muestran un placeholder. El detalle de misión incluye objetivo, progreso restante y premio. Buscar animales desde Mapa o Tour 3D abre búsqueda en modo de selección y establece el destino visual del recorrido; el botón de regreso conserva la ruta de origen y, desde Home, la búsqueda conserva la navegación a la ficha animal. Los iconos usan `expo-symbols` (Material Symbols en Android y SF Symbols en iOS), disponible en el workspace.

La noticia de Home permanece como contenido informativo independiente de la tarjeta «Tu próxima aventura te espera». Game y Perfil muestran logros recientes/destacados con iconos y acceso a `/achievements`; el listado permite filtrar obtenidos o pendientes y ordenar los obtenidos por fecha o nombre. Los detalles muestran descripción, puntos, acción/requisito y fecha cuando aplica. La lista de logros ocupa el área de contenido sin anidarse en el `ScrollView` vertical de `ScreenContainer`; el historial de Tabs conserva la navegación de regreso por gesto de Android. Los controles visibles de regreso en logros restauran Game o Perfil según el origen, y el detalle de misión regresa a Game. El carrusel de logros de Game usa un `ScrollView` horizontal con una colección pequeña. Los animales pendientes abren una vista previa con imagen difuminada y datos descriptivos bloqueados; el CTA lleva al escáner QR simulado.

Para ejecutar pruebas y comprobar el umbral de cobertura de ViewModels y Repositories:

```powershell
npm test -- --runInBand
npm run test:coverage -- --runInBand
npx tsc --noEmit
```

La verificación manual de Android con Expo Go fue confirmada por la persona solicitante el 2026-10-09. La suite automatizada pasó con 10 suites, 56 tests y 1 snapshot; cobertura al 100% en las cuatro métricas configuradas; TypeScript sin errores; dependencias compatibles con Expo y export Android generado correctamente. La prueba `user_logic.test.tsx` todavía imprime advertencias React `act(...)`, pero no provoca fallos.

## Límites de esta etapa

- Los datos de animales, perfil, eventos, mapa y escaneo son mocks accesibles mediante Repositories y ViewModels.
- El mapa y el recorrido 3D son placeholders. No se solicita ubicación, cámara, linterna ni renderizado 3D real.
- Los botones para simular resultados QR solo aparecen en builds de desarrollo.
- Las fotos no vienen incluidas en la referencia; las tarjetas muestran placeholders si falta una URL. La app no carga recursos desde `arca-ui-reference`.
- No hay persistencia de favoritos o perfil.
- Los favoritos quedan fuera de esta etapa; su estado compartido/persistente y un filtro propio en Colección se definirán en 003. El botón «Ver todo» de Animales Destacados en Home ya abre la búsqueda general; los animales destacados por contenido no deben confundirse con los favoritos del visitante.

## Verificación manual (Android)

La persona solicitante confirmó haber completado la validación en Android con Expo Go el 2026-10-09. El modelo de dispositivo y evidencia gráfica no se registraron.

La lista de comprobación aplicada fue:

Con la app iniciada mediante `npx expo start` y abierta en Android/Expo Go o un emulador:

1. Revisar Home, Mapa, Escáner, Colección y Perfil; confirmar safe areas y pestaña activa.
2. Desde Home, abrir Búsqueda, abrir detalles de animales descubiertos y no descubiertos, y entrar a Game.
3. Desde Colección, abrir un animal descubierto y confirmar que uno bloqueado no navega.
4. Desde Mapa, abrir Tour 3D y regresar a Mapa 2D.
5. En desarrollo, probar los tres botones QR: válido, inválido y ya descubierto; verificar «Ver detalles», «Reintentar», Colección y «Seguir explorando».
6. Abrir el detalle de un evento en Home y una misión en Game; revisar texto, progreso, navegación de regreso y placeholder/carrusel del evento.
7. Desde Mapa y desde Tour 3D, buscar un animal y confirmar que la selección regresa al recorrido 3D con ese destino; desde Home, comprobar que búsqueda sigue abriendo la ficha.
8. Abrir la vista previa de un animal pendiente desde Colección, confirmar difuminado, información oculta y CTA de QR; desde el escáner, regresar a la vista previa.
9. Desde Game y Perfil, abrir todos los logros y detalles; comprobar filtros, orden por fecha/nombre, iconos y regreso a la pantalla de origen. Desde Home, entrar por la tarjeta de aventura y comprobar el mismo listado sin advertencias de listas anidadas.
10. Probar el gesto de regreso de Android después de navegar Home → Game → Logros y Game → Detalle de misión; confirmar que vuelve a la acción/pantalla previa y que estando en la raíz de una pestaña el gesto no cambia a Home.
11. Confirmar iconos gráficos, que no aparece `source.uri should not be an empty string`, que carruseles y listas se desplazan, que los textos no se comprimen y que no hay solapamiento con barras del sistema.
