import * as React from "react";

/**
 * Tabla accesible sr-only que acompaña a cada widget visual: lectores de
 * pantalla leen los datos exactos sin depender del gráfico ni del color.
 */
export function WidgetSrTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: string[];
  rows: (string | number)[][];
}) {
  // sr-only va en un <div> contenedor, NO en el <table>: los table respetan mal
  // el forzado width/height:1px del truco sr-only y quedan con caja real (~189×362px),
  // agregando altura fantasma al documento. Eso habilitaba scroll de ventana y
  // rompía el `sticky top-0` del header. El <div> sí clippa correctamente.
  return (
    <div className="sr-only">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) =>
                j === 0 ? (
                  <th key={j} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={j}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
