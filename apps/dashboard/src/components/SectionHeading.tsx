export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <div className="section-heading">
      {eyebrow && <p className="section-heading__eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
