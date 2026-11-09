/** Miniatura de una tarjeta (CA-14): imagen con texto alternativo o marcador. */
export function ContentThumbnail({ url, name }: { url: string | null; name: string }) {
  if (!url) {
    return (
      <div className="content-card__thumb content-card__thumb--empty" role="img" aria-label={`Sin imagen: ${name}`}>
        <span aria-hidden="true">Sin imagen</span>
      </div>
    );
  }

  return (
    <div className="content-card__thumb">
      <img className="content-card__thumb-img" src={url} alt={`Imagen de ${name}`} loading="lazy" />
    </div>
  );
}
