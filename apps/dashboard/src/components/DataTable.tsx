import { Fragment, type ReactNode } from "react";

export type DataTableColumn<Row> = {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
};

/**
 * Tabla con desplazamiento propio y, en pantallas angostas, diseño apilado
 * (cada celda muestra su encabezado con `data-label`).
 */
export function DataTable<Row>({
  caption,
  columns,
  rows,
  rowKey,
  rowDetail,
}: {
  caption: string;
  columns: DataTableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string | number;
  /** Contenido a ancho completo bajo la fila (p. ej. una confirmación en línea). */
  rowDetail?: (row: Row) => ReactNode;
}) {
  return (
    <div
      className="table-scroll data-table-scroll"
      role="region"
      aria-label={caption}
      tabIndex={0}
    >
      <table className="data-table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th scope="col" key={column.key}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const detail = rowDetail?.(row);

            return (
              <Fragment key={rowKey(row)}>
                <tr>
                  {columns.map((column) => (
                    <td data-label={column.header} key={column.key}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
                {detail && (
                  <tr className="data-table__detail">
                    <td colSpan={columns.length}>{detail}</td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
