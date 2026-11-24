import { Button, Dialog } from '@arca/ui';

/** Confirmación de cierre de sesión con operaciones sin sincronizar (pwa-012 CA-04). */
export function LogoutConfirmDialog({
  pending,
  busy,
  onConfirm,
  onCancel,
}: {
  pending: number | null;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const count = pending ?? 0;
  return (
    <Dialog open={pending !== null} title="Operaciones pendientes" onClose={onCancel}>
      <p role="alert">
        {count === 1
          ? 'Tienes 1 operación sin sincronizar.'
          : `Tienes ${count} operaciones sin sincronizar.`}{' '}
        Si cierras sesión ahora se borrarán de este equipo y se perderán.
      </p>
      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>Cancelar</Button>
        <Button type="button" onClick={onConfirm} disabled={busy}>Cerrar sesión y borrar</Button>
      </div>
    </Dialog>
  );
}
