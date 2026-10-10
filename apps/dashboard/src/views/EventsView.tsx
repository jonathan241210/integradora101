import { useState, type FormEvent } from "react";
import { Alert, Badge, Button, Card, Field, SelectField, TextAreaField } from "@arca/ui";
import { demoEvents } from "../data/demo-data";
import { DemoBanner } from "../components/DemoBanner";
import { Icon } from "../components/Icon";
import { SectionHeading } from "../components/SectionHeading";

export function EventsView({
  onNotice,
}: {
  onNotice: (message: string) => void;
}) {
  const [notice, setNotice] = useState("");
  const submitDemo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = "Demostración: no se registró ningún evento.";
    setNotice(message);
    onNotice(message);
  };

  return (
    <>
      <SectionHeading
        eyebrow="Administración"
        title="Eventos"
        description="Programa y administra los eventos del zoológico."
      />
      <Card className="form-card">
        <div className="card-heading">
          <div>
            <h2>Registrar evento</h2>
            <p>Define los datos generales, horario y cupo del evento.</p>
          </div>
        </div>
        <DemoBanner />
        <form className="form-grid form-grid--events" onSubmit={submitDemo}>
          <Field id="event-name" label="Nombre del evento" placeholder="Noche de safari nocturno" />
          <Field id="event-location" label="Ubicación" placeholder="Sendero principal · Zona norte" />
          <SelectField id="event-status" label="Estado" defaultValue="scheduled">
            <option value="scheduled">Programado</option>
            <option value="ongoing">En curso</option>
            <option value="finished">Finalizado</option>
          </SelectField>
          <TextAreaField id="event-description" label="Descripción" placeholder="Describe la actividad..." />
          <label className="upload-box" htmlFor="event-image">
            <input id="event-image" type="file" accept="image/png,image/jpeg" />
            <span className="upload-box__icon upload-box__icon--green" aria-hidden="true"><Icon name="plus" /></span>
            <strong>Arrastra una imagen del evento</strong>
            <span>JPG o PNG · máximo 2 MB · demostración</span>
          </label>
          <Field id="event-start-date" label="Fecha de inicio" type="date" defaultValue="2026-03-20" />
          <Field id="event-end-date" label="Fecha de finalización" type="date" defaultValue="2026-03-20" />
          <Field id="event-start-time" label="Hora de inicio" type="time" defaultValue="19:00" />
          <Field id="event-end-time" label="Hora de finalización" type="time" defaultValue="22:00" />
          <Field id="event-cost" label="Costo de muestra" placeholder="$180.00 MXN (demo)" />
          <Field id="event-capacity" label="Cupo de muestra" placeholder="80 personas (demo)" />
          <div className="form-actions">
            <Button type="submit">Registrar evento</Button>
          </div>
        </form>
        {notice && <Alert className="inline-feedback">{notice}</Alert>}
      </Card>

      <section className="content-list" aria-labelledby="events-list-heading">
        <div className="list-heading">
          <div>
            <h2 id="events-list-heading">Próximos eventos</h2>
            <p>7 eventos registrados · 4 programados este mes (demo)</p>
          </div>
        </div>
        <div className="event-card-grid">
          {demoEvents.map((event) => (
            <Card className="event-card" key={event.title}>
              <div className={`event-card__cover event-card__cover--${event.color}`} aria-hidden="true" />
              <div className="event-card__body">
                <Badge tone={event.tone}>{event.status}</Badge>
                <h3>{event.title}</h3>
                <ul className="event-details">
                  <li><Icon name="calendar" />{event.date}</li>
                  <li><Icon name="ticket" />{event.time}</li>
                  <li><Icon name="dashboard" />{event.place}</li>
                </ul>
                <div className="content-card__actions">
                  <Button variant="secondary" onClick={() => onNotice("Demostración: el evento no se modificó.")}>Editar</Button>
                  <Button variant="danger" onClick={() => onNotice("Demostración: el evento no se eliminó.")}>Eliminar</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
