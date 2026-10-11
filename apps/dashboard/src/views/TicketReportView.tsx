import { Alert, Badge, Button, Card, Field, SelectField } from "@arca/ui";
import { useState } from "react";
import { demoSales } from "../data/demo-data";
import { DemoBanner } from "../components/DemoBanner";
import { SectionHeading } from "../components/SectionHeading";

export function TicketReportView() {
  const [notice, setNotice] = useState("");

  return (
    <>
      <SectionHeading
        eyebrow="Administración / Reporte"
        title="Reporte de boletos"
        description="Consulta un resumen demostrativo de ventas de taquilla."
      />
      <DemoBanner />
      <div className="report-metric-grid">
        <Card className="report-metric">
          <span>Boletos vendidos</span>
          <strong>184</strong>
          <small>Total del período de muestra</small>
        </Card>
        <Card className="report-metric">
          <span>Adultos</span>
          <strong>112</strong>
          <small>Boletos de tarifa ficticia</small>
        </Card>
        <Card className="report-metric">
          <span>Niños</span>
          <strong>72</strong>
          <small>Boletos de tarifa ficticia</small>
        </Card>
        <Card className="report-metric">
          <span>Ingresos</span>
          <strong>$3,966.40</strong>
          <small>Importe sin valor financiero real</small>
        </Card>
      </div>

      <Card className="filter-card">
        <form
          className="filter-form"
          onSubmit={(event) => {
            event.preventDefault();
            setNotice("Demostración: no se consultaron transacciones; se conserva la tabla ficticia.");
          }}
          onReset={() => setNotice("Se restablecieron los filtros visuales de muestra.")}
        >
          <Field id="report-start-date" label="Fecha desde" type="date" defaultValue="2026-09-18" />
          <Field id="report-end-date" label="Fecha hasta" type="date" defaultValue="2026-09-21" />
          <SelectField id="report-status" label="Estado" defaultValue="all">
            <option value="all">Todos los estados (demo)</option>
            <option value="complete">Completada</option>
            <option value="cancelled">Cancelada</option>
          </SelectField>
          <div className="filter-actions">
            <Button type="submit">Filtrar</Button>
            <Button type="reset" variant="ghost">Limpiar filtros</Button>
          </div>
        </form>
        {notice && <Alert className="inline-feedback">{notice}</Alert>}
      </Card>

      <Card className="table-card">
        <div className="card-heading">
          <div>
            <h2>Ventas de muestra</h2>
            <p>Registros ficticios · no corresponden a operaciones reales</p>
          </div>
          <Badge tone="warning">Solo demostración</Badge>
        </div>
        <div className="table-scroll">
          <table>
            <caption className="visually-hidden">Tabla demostrativa de ventas de boletos ficticias</caption>
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Hora</th>
                <th scope="col">Adultos</th>
                <th scope="col">Niños</th>
                <th scope="col">Boletos</th>
                <th scope="col">Total de muestra</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {demoSales.map((sale, index) => (
                <tr key={`${sale.date}-${sale.time}-${index}`}>
                  <td>{sale.date}</td>
                  <td>{sale.time}</td>
                  <td>{sale.adults}</td>
                  <td>{sale.children}</td>
                  <td>{sale.tickets}</td>
                  <td>{sale.total}</td>
                  <td>
                    <Badge tone={sale.status === "Completada" ? "success" : "danger"}>
                      {sale.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
