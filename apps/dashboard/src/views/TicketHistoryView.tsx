import { useMemo, useState } from "react";
import { Badge, Card, Field, SelectField } from "@arca/ui";
import { DemoBanner } from "@/components/DemoBanner";
import { SectionHeading } from "@/components/SectionHeading";
import { demoTicketHistory } from "@/data/demo-data";

export function TicketHistoryView() {
  const [folio, setFolio] = useState("");
  const [status, setStatus] = useState("all");
  const sales = useMemo(
    () =>
      demoTicketHistory.filter((sale) => {
        const matchesFolio = sale.id.toLocaleLowerCase().includes(folio.trim().toLocaleLowerCase());
        const matchesStatus = status === "all" || sale.status === status;
        return matchesFolio && matchesStatus;
      }),
    [folio, status],
  );

  return (
    <>
      <SectionHeading
        eyebrow="Taquilla / Historial"
        title="Historial de boletos"
        description="Consulta movimientos ficticios para revisar la presentación del historial."
      />
      <DemoBanner />
      <Card className="ticket-history-filters">
        <Field
          id="history-folio"
          label="Buscar folio de muestra"
          placeholder="Ejemplo: MUESTRA-001"
          value={folio}
          onChange={(event) => setFolio(event.target.value)}
        />
        <SelectField
          id="history-status"
          label="Estado"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="all">Todos los estados</option>
          <option value="Completada">Completada</option>
          <option value="Cancelada">Cancelada</option>
        </SelectField>
        <p>Los filtros solo recorren datos estáticos de esta demostración.</p>
      </Card>
      <Card className="table-card">
        <div className="card-heading">
          <div>
            <h2>Movimientos de muestra</h2>
            <p>Sin transacciones reales · no se guarda información</p>
          </div>
          <Badge tone="warning">Datos ficticios</Badge>
        </div>
        <div className="table-scroll">
          <table>
            <caption className="visually-hidden">
              Historial de boletos ficticio para el perfil de taquilla
            </caption>
            <thead>
              <tr>
                <th scope="col">Folio de muestra</th>
                <th scope="col">Fecha</th>
                <th scope="col">Hora</th>
                <th scope="col">Boletos</th>
                <th scope="col">Importe ficticio</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td>{sale.id}</td>
                  <td>{sale.date}</td>
                  <td>{sale.time}</td>
                  <td>{sale.tickets}</td>
                  <td>{sale.amount}</td>
                  <td>
                    <Badge tone={sale.status === "Completada" ? "success" : "danger"}>
                      {sale.status}
                    </Badge>
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={6}>No hay filas ficticias que coincidan con el filtro.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
