import type { CSSProperties, ReactNode } from "react";

export type SkeletonVariant = "text" | "title" | "avatar" | "image" | "button";

/** Bloque de relleno. Siempre `aria-hidden`: el aviso de carga lo da el contenedor. */
export function Skeleton({
  variant = "text",
  width,
  height,
  aspectRatio,
  className = "",
  style,
}: {
  variant?: SkeletonVariant;
  /** Cualquier medida CSS (preferir `rem` o `%`). */
  width?: string;
  height?: string;
  /** Solo para `image`, por ejemplo `"4 / 3"`. */
  aspectRatio?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`arca-skeleton arca-skeleton--${variant} ${className}`.trim()}
      aria-hidden="true"
      style={{ width, height, aspectRatio, ...style }}
    />
  );
}

/**
 * Contenedor de una carga: `aria-busy="true"` y un texto oculto con `role="status"`.
 * Los bloques de adentro quedan fuera del árbol de accesibilidad.
 */
export function SkeletonRegion({
  label = "Cargando…",
  className = "",
  children,
}: {
  label?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`arca-skeleton-region ${className}`.trim()} aria-busy="true">
      <p className="arca-visually-hidden" role="status">
        {label}
      </p>
      {children !== undefined && children !== null && <div aria-hidden="true">{children}</div>}
    </div>
  );
}

function Wrap({
  region,
  label,
  className,
  children,
}: {
  region: boolean;
  label: string;
  className: string;
  children: ReactNode;
}) {
  if (region) {
    return (
      <SkeletonRegion label={label} className={className}>
        {children}
      </SkeletonRegion>
    );
  }

  return (
    <div className={className} aria-hidden="true">
      {children}
    </div>
  );
}

const TEXT_WIDTHS = ["72%", "56%", "84%", "48%", "64%"];

export type SkeletonTableColumn = string | { header: string; className?: string };

/**
 * Tabla de relleno: mismo encabezado, mismo número de columnas y mismas clases que la real
 * (`className` envuelve la tabla y `tableClassName` va en el `table`).
 */
export function SkeletonTable({
  columns,
  rows = 5,
  caption = "Cargando tabla",
  label = "Cargando…",
  className = "",
  tableClassName = "",
  region = true,
}: {
  columns: ReadonlyArray<SkeletonTableColumn>;
  rows?: number;
  caption?: string;
  label?: string;
  className?: string;
  tableClassName?: string;
  /** `false` para anidarla dentro de otra región de carga sin repetir el aviso. */
  region?: boolean;
}) {
  const heads = columns.map((column) =>
    typeof column === "string" ? { header: column, className: undefined } : column,
  );

  return (
    <Wrap region={region} label={label} className={`arca-skeleton-table ${className}`.trim()}>
      <table className={tableClassName}>
        <caption className="arca-visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {heads.map((head) => (
              <th scope="col" key={head.header} className={head.className}>
                {head.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, row) => (
            <tr key={row}>
              {heads.map((head, column) => (
                <td data-label={head.header} key={head.header} className={head.className}>
                  <Skeleton width={TEXT_WIDTHS[(row + column) % TEXT_WIDTHS.length]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Wrap>
  );
}

/** Rejilla de tarjetas de relleno; la rejilla real la ponen `className` y `cardClassName`. */
export function SkeletonCards({
  count = 6,
  image = true,
  imageRatio,
  imageHeight,
  lines = 3,
  actions = 0,
  label = "Cargando…",
  className = "",
  cardClassName = "",
  region = true,
}: {
  count?: number;
  /** Muestra el bloque de imagen arriba de cada tarjeta. */
  image?: boolean;
  /** Proporción de la imagen, por ejemplo `"4 / 3"`. */
  imageRatio?: string;
  /** Alto fijo de la imagen (alternativa a `imageRatio`), por ejemplo `"8.125rem"`. */
  imageHeight?: string;
  lines?: number;
  /** Cantidad de botones al pie de cada tarjeta. */
  actions?: number;
  label?: string;
  className?: string;
  cardClassName?: string;
  region?: boolean;
}) {
  return (
    <Wrap region={region} label={label} className={`arca-skeleton-cards ${className}`.trim()}>
      {Array.from({ length: count }, (_, index) => (
        <div className={`arca-skeleton-card ${cardClassName}`.trim()} key={index}>
          {image && (
            <Skeleton
              variant="image"
              className="arca-skeleton-card__image"
              aspectRatio={imageHeight ? undefined : (imageRatio ?? "4 / 3")}
              height={imageHeight}
            />
          )}
          <div className="arca-skeleton-card__body">
            <Skeleton variant="title" width="70%" />
            {Array.from({ length: lines }, (_, line) => (
              <Skeleton key={line} width={TEXT_WIDTHS[(index + line) % TEXT_WIDTHS.length]} />
            ))}
            {actions > 0 && (
              <div className="arca-skeleton-card__actions">
                {Array.from({ length: actions }, (_, action) => (
                  <Skeleton key={action} variant="button" />
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </Wrap>
  );
}

/** Formulario de relleno: etiqueta y campo por cada `fields`, y `buttons` botones al pie. */
export function SkeletonForm({
  fields = 4,
  buttons = 2,
  columns = 1,
  label = "Cargando…",
  className = "",
  region = true,
}: {
  fields?: number;
  buttons?: number;
  columns?: 1 | 2;
  label?: string;
  className?: string;
  region?: boolean;
}) {
  return (
    <Wrap region={region} label={label} className={`arca-skeleton-form ${className}`.trim()}>
      <div className={`arca-skeleton-form__fields arca-skeleton-form__fields--${columns}`}>
        {Array.from({ length: fields }, (_, index) => (
          <div className="arca-skeleton-form__field" key={index}>
            <Skeleton width="30%" />
            <Skeleton variant="button" className="arca-skeleton-form__control" />
          </div>
        ))}
      </div>
      {buttons > 0 && (
        <div className="arca-skeleton-form__buttons">
          {Array.from({ length: buttons }, (_, index) => (
            <Skeleton key={index} variant="button" />
          ))}
        </div>
      )}
    </Wrap>
  );
}
