import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ContentThumbnail } from "../components/ContentThumbnail";
import { ImageUploadBoxView, createDropHandlers } from "../components/ImageUploadBox";

const styles = readFileSync(resolve(__dirname, "../styles.css"), "utf8");

function rule(selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = styles.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));

  expect(match, `regla ${selector}`).not.toBeNull();

  return match![1];
}

const imageRules = [".content-card__thumb-img", ".upload-box__preview-img"];
const boxRules = [".content-card__thumb", ".upload-box__preview"];

function renderBox(previewUrl: string) {
  const handlers = createDropHandlers({ onSelect: vi.fn(), setDragging: vi.fn() });

  return renderToStaticMarkup(
    <ImageUploadBoxView
      id="img"
      previewUrl={previewUrl}
      previewAlt="Vista previa"
      error=""
      dragging={false}
      handlers={handlers}
      onSelect={vi.fn()}
      onRemove={vi.fn()}
    />,
  );
}

describe("content-image-display", () => {
  it("CA-01 content-image-display: la miniatura usa object-fit contain y no cover", () => {
    const img = rule(".content-card__thumb-img");

    expect(img).toMatch(/object-fit:\s*contain/);
    expect(rule(".content-card__thumb")).not.toMatch(/object-fit/);
    expect(img).not.toMatch(/cover/);
  });

  it("CA-02 content-image-display: la caja de miniatura centra la imagen y usa el fondo --surface-subtle", () => {
    const box = rule(".content-card__thumb");

    expect(box).toMatch(/display:\s*grid/);
    expect(box).toMatch(/place-items:\s*center/);
    expect(box).toMatch(/height:\s*130px/);
    expect(box).toMatch(/background:\s*var\(--surface-subtle\)/);
    expect(rule(".content-card__thumb-img")).toMatch(/object-position:\s*center/);
  });

  it("CA-03 content-image-display: la vista previa es una caja centrada con contain y sin cover", () => {
    const box = rule(".upload-box__preview");
    const img = rule(".upload-box__preview-img");

    expect(box).toMatch(/place-items:\s*center/);
    expect(box).toMatch(/background:\s*var\(--surface-subtle\)/);
    expect(img).toMatch(/object-fit:\s*contain/);
    expect(box + img).not.toMatch(/cover/);

    const html = renderBox("blob:preview");

    expect(html).toMatch(/<span class="upload-box__preview"><img class="upload-box__preview-img" src="blob:preview" alt="Vista previa"/);
    expect(renderBox("")).not.toContain("upload-box__preview");
  });

  it("CA-04 content-image-display: ninguna imagen de contenido se amplía ni usa transform", () => {
    for (const selector of imageRules) {
      const css = rule(selector);

      expect(css).toMatch(/width:\s*auto/);
      expect(css).toMatch(/height:\s*auto/);
      expect(css).toMatch(/max-width:\s*100%/);
      expect(css).toMatch(/max-height:\s*(100%|160px)/);
    }

    expect(imageRules.map(rule).join("") + boxRules.map(rule).join("")).not.toMatch(/transform|scale/);
    expect(styles).not.toMatch(/(content-card__thumb|upload-box__preview)[^{]*:hover/);
  });

  it("CA-05 content-image-display: la miniatura conserva alt y lazy; el marcador sin imagen conserva role img y la misma caja", () => {
    const withImage = renderToStaticMarkup(<ContentThumbnail url="/storage/a.jpg" name="Cartel" />);
    const empty = renderToStaticMarkup(<ContentThumbnail url={null} name="Cartel" />);

    expect(withImage).toContain('class="content-card__thumb"');
    expect(withImage).toContain('class="content-card__thumb-img"');
    expect(withImage).toContain('alt="Imagen de Cartel"');
    expect(withImage).toContain('loading="lazy"');
    expect(empty).toContain('role="img"');
    expect(empty).toContain('aria-label="Sin imagen: Cartel"');
    expect(empty).toContain("content-card__thumb content-card__thumb--empty");
    expect(empty).toContain("Sin imagen</span>");
  });

  it("CA-06 content-image-display: sin desbordamiento, imágenes limitadas al ancho de su caja (verificación manual T-06)", () => {
    for (const selector of imageRules) expect(rule(selector)).toMatch(/max-width:\s*100%/);
    expect(rule(".content-card__thumb")).toMatch(/width:\s*100%/);
    expect(rule(".content-card__thumb")).toMatch(/overflow:\s*clip/);
    expect(rule(".upload-box__preview")).toMatch(/overflow:\s*clip/);
    expect(styles).toMatch(/\.content-card,\s*\.event-card\s*\{[^}]*min-width:\s*0/);
    expect(styles).toMatch(/\.event-card-grid\s*\{[^}]*minmax\(0,\s*1fr\)/s);
  });

  it("CA-07 content-image-display: las reglas de imagen usan var(--surface-subtle) y no contienen hex, rgb() ni cover/fill", () => {
    const css = [...boxRules, ...imageRules].map(rule).join("\n");

    expect(rule(".content-card__thumb")).toContain("var(--surface-subtle)");
    expect(rule(".upload-box__preview")).toContain("var(--surface-subtle)");
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/rgba?\(/);
    expect(css).not.toMatch(/object-fit:\s*(cover|fill)/);
  });

  it("CA-08 content-image-display: conserva los valores fijados por CA-18 de dashboard-004", () => {
    expect(rule(".upload-box__preview")).toMatch(/max-width:\s*260px/);
    expect(rule(".content-card__thumb")).toMatch(/width:\s*100%/);
  });

  it("CA-09 content-image-display: cada criterio tiene su prueba", () => {
    const source = readFileSync(__filename, "utf8");

    for (let n = 1; n <= 8; n += 1) {
      expect(source).toContain(`CA-0${n} content-image-display:`);
    }
  });
});
