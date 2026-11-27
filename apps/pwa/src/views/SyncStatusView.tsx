import { Spinner } from '@/views/Spinner';
import { Button, Card } from '@arca/ui';
import { useEffect, useMemo, useState } from 'react';
import { getSyncSnapshot, syncNow } from '@/offline/sync-manager';
import type { OutboxItem } from '@/offline/types';
import { toUserSyncMessage } from '@/offline/utils';

type Snapshot = Awaited<ReturnType<typeof getSyncSnapshot>>;

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  blocked: 'Bloqueado (espera dependencia)',
  synced: 'Sincronizado',
  error: 'Error',
  conflict: 'Conflicto',
};

function typeLabel(type: OutboxItem['entityType']) {
  return type === 'animal' ? 'Animal' : 'Diagnóstico';
}

export function SyncStatusView({ userScope }: { userScope: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setSnapshot(await getSyncSnapshot(userScope));
  }

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 3000);
    return () => clearInterval(timer);
  }, [userScope]);

  const rows = useMemo(() => {
    if (!snapshot) return [];
    const animalName = new Map(snapshot.animals.map((a) => [a.localId, a.name]));
    return snapshot.outbox.map((item) => {
      const ref = item.entityType === 'animal'
        ? (animalName.get(item.entityLocalId) ?? item.entityLocalId)
        : item.entityLocalId.slice(0, 8);
      return { ...item, ref };
    });
  }, [snapshot]);

  async function handleSync() {
    setBusy(true);
    try {
      await syncNow(userScope, { force: true });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page-section">
      <div className="page-intro">
        <p className="eyebrow">Sincronización</p>
        <h2>Sync</h2>
        <p>Registros pendientes y estado de subida. Al detectar conexión se suben automáticamente: primero animales y después diagnósticos dependientes.</p>
      </div>

      <Card className="form-card">
        <div className="sync-toolbar">
          {snapshot && <span className="sync-toolbar__count">{rows.filter((r) => r.status !== 'synced').length} pendiente(s)</span>}
          <Button onClick={() => void handleSync()} disabled={busy} type="button">
            {busy ? <Spinner label="Sincronizando…" /> : 'Sincronizar ahora'}
          </Button>
        </div>

        {!snapshot ? <Spinner label="Cargando cola…" /> : rows.length === 0 ? (
          <p>No hay registros en la cola de sincronización.</p>
        ) : (
          <div className="table-scroll">
            <table className="profile-table responsive-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Referencia</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Intentos</th>
                  <th>Último resultado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Tipo">{typeLabel(row.entityType)}</td>
                    <td data-label="Referencia">{row.ref}</td>
                    <td data-label="Fecha">{new Date(row.createdAt).toLocaleString('es-MX')}</td>
                    <td data-label="Estado">{row.status === 'syncing' ? <Spinner label="Subiendo…" /> : (statusLabels[row.status] ?? row.status)}</td>
                    <td data-label="Intentos">{row.attempts}</td>
                    <td data-label="Último resultado">{row.lastError ? toUserSyncMessage(row.lastError) : (row.status === 'synced' ? 'Subido correctamente' : '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </section>
  );
}
