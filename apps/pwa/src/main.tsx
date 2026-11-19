import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@arca/ui/styles.css';
import '@/styles.css';
import { registerServiceWorker } from '@/offline/register-sw';
import { ToastCenter } from '@/views/ToastCenter';

registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <ToastCenter />
  </React.StrictMode>,
);
