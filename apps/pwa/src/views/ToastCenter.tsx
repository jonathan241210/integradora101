import { useEffect, useState } from 'react';
import { dismissToast, subscribeToasts, type ToastItem } from '@/offline/notifications';

export function ToastCenter() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div aria-live="polite" aria-atomic="false" style={{ position: 'fixed', right: 12, bottom: 12, display: 'grid', gap: 8, zIndex: 9999, maxWidth: 360 }}>
      {toasts.map((toast) => (
        <div key={toast.id} role="status" className="form-card" style={{ padding: '10px 12px', borderLeft: `4px solid ${toast.tone === 'error' ? 'var(--danger, #b91c1c)' : toast.tone === 'success' ? 'var(--success, #15803d)' : 'var(--primary)'}` }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span>{toast.text}</span>
            <button type="button" onClick={() => dismissToast(toast.id)} aria-label="Cerrar aviso">×</button>
          </div>
        </div>
      ))}
    </div>
  );
}