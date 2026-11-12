export function Spinner({ label }: { label?: string }) {
  return (
    <span className="spinner" role={label ? 'status' : undefined}>
      <span aria-hidden="true" className="spinner-ring" />
      {label && <span className="spinner-label">{label}</span>}
    </span>
  );
}

export function LoadingScreen({ label = 'Cargando…' }: { label?: string }) {
  return (
    <main className="loading-screen">
      <Spinner label={label} />
    </main>
  );
}
