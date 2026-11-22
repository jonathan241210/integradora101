# @arca/ui

**Estado:** workspace sin runner propio; los componentes se prueban desde las apps (Vitest, entorno `node`).

Paquete de componentes de interfaz para `apps/dashboard`, `apps/pwa` y `apps/web`. Referencia visual: shadcn/ui estilo `new-york`, primitivas accesibles Radix, iconos Lucide y Tailwind CSS v4. Mantiene API de componentes reutilizable; no conoce reglas de negocio ni realiza llamadas directas a endpoints.

Los componentes usan tokens semánticos de `@arca/tokens`, textos recibidos en español, estados accesibles y composición por props. Los cambios deben cubrir comportamiento, teclado, foco y contraste con tests apropiados. No copiar componentes ni hardcodear colores de marca en las apps consumidoras.

La selección de dependencias requiere spec/plan/tasks y ADR cuando aplique. No se añaden dependencias sin ADR aprobado.

## Estilos

Cada app carga `@arca/ui/styles.css` (el dashboard desde su `styles.css`, la PWA desde `main.tsx`). Los estilos de los componentes compartidos viven ahí y usan solo tokens.

## Componentes compartidos (dashboard-020 rev. (d))

Lo que usa más de una app vive aquí y las apps no conservan copias locales.

### `Pagination`

Paginador accesible (`nav` con `aria-label="Paginación"`). Props: `page`, `onPageChange` y, o bien `lastPage` + `total` (con total), o bien `hasMore` (respaldo); `busy` opcional.

- Con total: «Página N de M · T en total», «Anterior», números y «Siguiente». Con más de 7 páginas muestra primera, última y la actual con vecinas, separadas por «…». La página actual lleva `aria-current="page"`.
- Solo `hasMore`: «Página N», «Anterior» y «Siguiente».
- Extremos deshabilitados; todo se deshabilita con `busy`. Foco visible con `--ring`.
- La lógica pura (`buildPagination`, `pageItems`, tipos `PaginationInput`, `PaginationModel`) está en `src/pagination.ts` y no importa React.
- Clases `pagination-bar*`; cada app puede ajustar espaciado en su propia hoja.

### Contador de bloqueo

Para respuestas 429 con `Retry-After`.

- `formatCountdown(seconds)`: `m:ss`.
- `rateLimitText`, `rateLimitedPrefix`, `rateLimitEndedText`, `validRetryAfter`: textos y validación.
- `startCountdown(seconds, onTick, clock?)`: cuenta contra un instante final; devuelve la función que la detiene.
- `useCountdown(seconds)`: hook que devuelve `{ remaining, running, finished }`.
- `LockoutNotice`: aviso con dígitos en `aria-live="off"` y región `role="status"` oculta (`arca-visually-hidden`) para el anuncio inicial y el final. Acepta `id` y `alertClassName` para que la app ubique el aviso.
- La lógica pura está en `src/countdown.ts` (sin React) y el hook en `src/useCountdown.ts`.

### `ConfirmDialog`

Diálogo de confirmación explícita sobre `Dialog`. Props: `copy` (`title`, `message`, `confirmLabel`, `danger`; `null` lo cierra), `idleTitle`, `busy`, `confirmDisabled`, `error` (nodo ya resuelto por la app), `onConfirm`, `onCancel`, `children` y `className`. No conoce avisos ni `ActionError`: el dashboard lo envuelve en `components/ConfirmDialog.tsx` para presentar el error según su regla de mensajes.

### Esqueletos de carga (dashboard-020 rev. (e))

Estados de carga con la forma de la pantalla real. No agregan dependencias, usan solo tokens y medidas en `rem`.

- `Skeleton`: bloque suelto. `variant`: `text` (por defecto), `title`, `avatar`, `image` y `button`; `width`, `height` y `aspectRatio` opcionales. Siempre `aria-hidden="true"`.
- `SkeletonRegion`: contenedor con `aria-busy="true"` y un texto oculto (`label`, por defecto «Cargando…») con `role="status"`. Los bloques van dentro de un `div aria-hidden`.
- `SkeletonTable`: `columns` (textos o `{ header, className }`), `rows` (5), `caption`, `className` (envoltura, p. ej. la del desplazamiento) y `tableClassName` (clase del `table`). Repite el encabezado y el número de columnas de la tabla real y pone `data-label` en cada celda, así que hereda su alto de fila y su diseño apilado.
- `SkeletonCards`: `count`, `image`, `imageRatio` o `imageHeight`, `lines`, `actions`, `className` (rejilla) y `cardClassName` (tarjeta); cada app pasa las clases de su rejilla real.
- `SkeletonForm`: `fields`, `buttons` y `columns` (1 o 2).
- Las tres composiciones aceptan `label` y `region={false}` para anidarlas dentro de otra región sin repetir el aviso.
- Animación: brillo suave solo bajo `prefers-reduced-motion: no-preference`; con «reducir movimiento» queda un bloque estático.
- `useDelayedFlag(active, delayMs = 150)` y la lógica pura `startDelayedFlag(delayMs, onElapsed, scheduler?)` (en `src/delayedFlag.ts`, sin React) devuelven `true` solo cuando la carga lleva más de `delayMs`; así una carga rápida no hace parpadear el esqueleto. `SKELETON_DELAY_MS` vale 150.
