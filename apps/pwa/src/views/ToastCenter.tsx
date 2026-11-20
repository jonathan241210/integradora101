import { useEffect, useState } from 'react';
import { dismissToast, subscribeToasts, type ToastItem } from '@/offline/notifications';
import { Icon } from '@/components/Icon';

const toneIcons = { info: 'bell', success: 'check', warning: 'alert', error: 'alert' };
const toneLabels = { info: 'Información', success: 'Éxito', warning: 'Advertencia', error: 'Error' };

export function ToastCenter() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setToasts), []);

  return (
    <div aria-live="polite" aria-relevant="additions" className="sync-notices no-print">
      {toasts.map((toast) => (
        <div key={toast.id} className={`sync-notice sync-notice--${toast.tone}`}>
          <span className="sync-notice-icon"><Icon name={toneIcons[toast.tone]} size={18} aria-hidden /></span>
          <div className="sync-notice-message">
            <strong>{toneLabels[toast.tone]}</strong>
            <span>{toast.text}</span>
          </div>
          <button className="sync-notice-close" type="button" onClick={() => dismissToast(toast.id)} aria-label="Cerrar aviso">×</button>
        </div>
      ))}
    </div>
  );
}
