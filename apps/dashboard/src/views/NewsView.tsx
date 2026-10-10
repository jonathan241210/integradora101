import { useState, type FormEvent } from "react";
import { Alert, Badge, Button, Card, Field, SelectField, TextAreaField } from "@arca/ui";
import { demoNews } from "../data/demo-data";
import { DemoBanner } from "../components/DemoBanner";
import { Icon } from "../components/Icon";
import { SectionHeading } from "../components/SectionHeading";

export function NewsView({
  onNotice,
}: {
  onNotice: (message: string) => void;
}) {
  const [notice, setNotice] = useState("");
  const submitDemo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = "Demostración: no se guardó ni publicó ninguna noticia.";
    setNotice(message);
    onNotice(message);
  };

  return (
    <>
      <SectionHeading
        eyebrow="Administración"
        title="Noticias"
        description="Prepara y administra las noticias del zoológico."
      />
      <Card className="form-card">
        <div className="card-heading">
          <div>
            <h2>Registrar noticia</h2>
            <p>Completa la información para publicar una noticia nueva.</p>
          </div>
        </div>
        <DemoBanner />
        <form className="form-grid form-grid--news" onSubmit={submitDemo}>
          <Field id="news-title" label="Título" placeholder="Nace cría de jaguar en el zoológico" />
          <Field id="news-summary" label="Descripción breve" placeholder="Resumen que se muestra en la tarjeta" />
          <TextAreaField id="news-content" label="Contenido" placeholder="Escribe el contenido completo de la noticia..." />
          <label className="upload-box" htmlFor="news-image">
            <input id="news-image" type="file" accept="image/png,image/jpeg" />
            <span className="upload-box__icon" aria-hidden="true"><Icon name="plus" /></span>
            <strong>Arrastra una imagen o haz clic para subirla</strong>
            <span>JPG o PNG · máximo 2 MB · demostración</span>
          </label>
          <Field id="news-date" label="Fecha de publicación" type="date" defaultValue="2026-03-12" />
          <SelectField id="news-status" label="Estado" defaultValue="published">
            <option value="published">Publicada (demo)</option>
            <option value="draft">Borrador</option>
          </SelectField>
          <div className="form-actions">
            <Button type="submit">Publicar noticia</Button>
          </div>
        </form>
        {notice && <Alert className="inline-feedback">{notice}</Alert>}
      </Card>

      <section className="content-list" aria-labelledby="news-list-heading">
        <div className="list-heading">
          <div>
            <h2 id="news-list-heading">Noticias publicadas</h2>
            <p>18 noticias en total · 14 publicadas, 4 en borrador (demo)</p>
          </div>
        </div>
        <div className="content-card-grid">
          {demoNews.map((item) => (
            <Card className="content-card" key={item.title}>
              <div className={`content-card__cover content-card__cover--${item.color}`} aria-hidden="true" />
              <div className="content-card__body">
                <div className="content-card__meta">
                  <Badge tone={item.tone}>{item.status}</Badge>
                  <time>{item.date}</time>
                </div>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <div className="content-card__actions">
                  <Button variant="secondary" onClick={() => onNotice("Demostración: la noticia no se modificó.")}>Editar</Button>
                  <Button variant="danger" onClick={() => onNotice("Demostración: la noticia no se eliminó.")}>Eliminar</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
