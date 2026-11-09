import { useState, type ChangeEvent } from "react";
import { Button } from "@arca/ui";
import {
  IMAGE_ACCEPT_ATTRIBUTE,
  IMAGE_HELP_TEXT,
} from "@/viewmodels/image-field";
import { Icon } from "./Icon";

type DropEventLike = {
  preventDefault: () => void;
  dataTransfer?: { files?: ArrayLike<File> | null } | null;
};

/**
 * Manejadores nativos de arrastrar y soltar de la caja de imagen (CA-04):
 * `dragover`, `dragleave` y `drop`, sin librerías (RN-06).
 */
export function createDropHandlers({
  onSelect,
  setDragging,
}: {
  onSelect: (file: File) => void;
  setDragging: (dragging: boolean) => void;
}) {
  return {
    onDragOver(event: DropEventLike) {
      event.preventDefault();
      setDragging(true);
    },
    onDragLeave() {
      setDragging(false);
    },
    onDrop(event: DropEventLike) {
      event.preventDefault();
      setDragging(false);

      const file = event.dataTransfer?.files?.[0];

      if (file) onSelect(file);
    },
  };
}

type UploadBoxProps = {
  id: string;
  previewUrl: string;
  previewAlt: string;
  error: string;
  onSelect: (file: File) => void;
  onRemove: () => void;
};

/**
 * Marcado de la caja de imagen, sin estado propio: `dragging` y los manejadores
 * llegan por props, así que el efecto de «dragover» se puede comprobar sin DOM.
 */
export function ImageUploadBoxView({
  id,
  previewUrl,
  previewAlt,
  error,
  dragging,
  handlers,
  onSelect,
  onRemove,
}: UploadBoxProps & {
  dragging: boolean;
  handlers: ReturnType<typeof createDropHandlers>;
}) {
  const describedBy = `${id}-help${error ? ` ${id}-file-error` : ""}`;
  const change = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    event.target.value = "";
    if (file) onSelect(file);
  };

  return (
    <div className="image-field">
      <label
        className={`upload-box${dragging ? " upload-box--dragging" : ""}`}
        htmlFor={`${id}-input`}
        onDragOver={handlers.onDragOver}
        onDragLeave={handlers.onDragLeave}
        onDrop={handlers.onDrop}
      >
        <input
          id={`${id}-input`}
          type="file"
          accept={IMAGE_ACCEPT_ATTRIBUTE}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          onChange={change}
        />
        {previewUrl ? (
          <span className="upload-box__preview">
            <img className="upload-box__preview-img" src={previewUrl} alt={previewAlt} />
          </span>
        ) : (
          <span className="upload-box__icon" aria-hidden="true">
            <Icon name="plus" />
          </span>
        )}
        <strong>{previewUrl ? "Cambiar imagen" : "Imagen (opcional)"}</strong>
        <span id={`${id}-help`}>
          {dragging ? "Suelta la imagen aquí" : IMAGE_HELP_TEXT}
        </span>
      </label>
      {error && (
        <p className="field-error" id={`${id}-file-error`} role="alert">
          {error}
        </p>
      )}
      {previewUrl && (
        <Button type="button" variant="secondary" onClick={onRemove}>
          Quitar imagen
        </Button>
      )}
    </div>
  );
}

/**
 * Caja de imagen de Noticias y Eventos: selector (operable con teclado),
 * arrastrar y soltar, vista previa local y «Quitar imagen». No sube nada: el
 * archivo viaja al guardar el formulario.
 */
export function ImageUploadBox(props: UploadBoxProps) {
  const [dragging, setDragging] = useState(false);
  const handlers = createDropHandlers({ onSelect: props.onSelect, setDragging });

  return <ImageUploadBoxView {...props} dragging={dragging} handlers={handlers} />;
}
