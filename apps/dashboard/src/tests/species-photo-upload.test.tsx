import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { SpeciesFichaForm } from "../components/SpeciesFichaForm";
import { ImageUploadBoxView, createDropHandlers } from "../components/ImageUploadBox";
import { PHOTO_ACCEPT_ATTRIBUTE } from "../viewmodels/species-publication-shared";

const draft = {
  scientific_name: "Panthera onca",
  habitat: "Selva",
  origin: "América",
  category: "mammal",
  fun_fact: "",
  published_fields: [],
} as never;

function form(newPhoto: { file: File | null; previewUrl: string; error: string }) {
  return renderToStaticMarkup(
    <SpeciesFichaForm
      idPrefix="t"
      commonName="Jaguar"
      draft={draft}
      fieldErrors={{}}
      currentPhoto={{ status: "none" } as never}
      newPhoto={newPhoto}
      busy={false}
      error=""
      submitLabel="Guardar cambios"
      onChange={vi.fn()}
      onToggleField={vi.fn()}
      onChoosePhoto={vi.fn()}
      onClearPhoto={vi.fn()}
      onSubmit={vi.fn()}
      onCancel={vi.fn()}
    />,
  );
}

const empty = { file: null, previewUrl: "", error: "" };

it("CA-81 species-photo-upload: zona Elegir imagen, foto actual, vista previa y Quitar imagen nueva", () => {
  const html = form(empty);

  expect(html).toContain("Foto actual");
  expect(html).toContain("upload-box");
  expect(html).toContain("Elegir imagen");
  expect(html).toContain('for="t-photo-input"');
  expect(html).not.toContain("Quitar imagen nueva");

  const withNew = form({ file: null, previewUrl: "blob:x", error: "" });

  expect(withNew).toContain('src="blob:x"');
  expect(withNew).toContain("Cambiar imagen");
  expect(withNew).toContain("Quitar imagen nueva");
});

it("CA-81 species-photo-upload: Noticias y Eventos conservan sus textos por defecto", () => {
  const html = renderToStaticMarkup(
    <ImageUploadBoxView
      id="n"
      previewUrl=""
      previewAlt="x"
      error=""
      dragging={false}
      handlers={createDropHandlers({ onSelect: vi.fn(), setDragging: vi.fn() })}
      onSelect={vi.fn()}
      onRemove={vi.fn()}
    />,
  );

  expect(html).toContain("Imagen (opcional)");
  expect(html).toContain("JPG, PNG o WebP · máximo 5 MB");
});

it("CA-82 species-photo-upload: solo JPG y PNG de hasta 5 MB, errores en español y sin quitar la foto actual", () => {
  const html = form({ file: null, previewUrl: "", error: "La foto no puede superar 5 MB." });

  expect(PHOTO_ACCEPT_ATTRIBUTE).not.toContain("webp");
  expect(html).toContain(`accept="${PHOTO_ACCEPT_ATTRIBUTE}"`);
  expect(html).toContain("JPG o PNG · máximo 5 MB");
  expect(html).toContain("La foto no puede superar 5 MB.");
  expect(html).not.toContain("Quitar foto actual");
});
