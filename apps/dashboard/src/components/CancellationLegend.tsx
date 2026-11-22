import { useState } from "react";
import { Badge, Card } from "@arca/ui";
import type { CancellationLegendDto, CancellationLevelDto } from "@/viewmodels/admin-types";
import {
  legendLevelsFrom,
  readLegendOpen,
  writeLegendOpen,
} from "@/viewmodels/cancellation-legend";

/**
 * Leyenda del semáforo en tabla (dashboard-021 CA-23 a CA-26): niveles, señales con su
 * explicación y límite (de la API) y el aviso en texto visible. Plegable; la preferencia
 * se guarda en el navegador y, sin ella, empieza abierta.
 */
export function CancellationLegend({
  legend,
  levels,
  disclaimer,
}: {
  legend: CancellationLegendDto[];
  levels?: CancellationLevelDto[];
  disclaimer?: string;
}) {
  const [open, setOpen] = useState(readLegendOpen);
  const levelRows = legendLevelsFrom(levels);

  return (
    <Card className="cancellation-legend">
      <details
        className="cancellation-legend__details"
        open={open}
        onToggle={(event) => {
          const next = event.currentTarget.open;

          setOpen(next);
          writeLegendOpen(next);
        }}
      >
        <summary>Cómo funciona el semáforo</summary>
        <div className="cancellation-legend__body">
          {levelRows.length > 0 && (
            <table className="cancellation-legend__table cancellation-legend__levels" aria-label="Niveles del semáforo">
              <thead>
                <tr>
                  <th scope="col">Nivel</th>
                  <th scope="col">Cuándo aparece</th>
                </tr>
              </thead>
              <tbody>
                {levelRows.map((level) => (
                  <tr key={level.code}>
                    <td>
                      <Badge tone={level.tone}>{level.label}</Badge>
                    </td>
                    <td>{level.condition}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="cancellation-legend__scroll">
            <table className="cancellation-legend__table" aria-label="Señales del semáforo">
              <thead>
                <tr>
                  <th scope="col">Señal</th>
                  <th scope="col">Qué significa</th>
                  <th scope="col">Límite</th>
                </tr>
              </thead>
              <tbody>
                {legend.map((item) => (
                  <tr key={item.code}>
                    <td>{item.label}</td>
                    <td>{item.explanation}</td>
                    <td>{item.limit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {disclaimer && (
            <p className="cancellation-legend__disclaimer" role="note">
              {disclaimer}
            </p>
          )}
        </div>
      </details>
    </Card>
  );
}
