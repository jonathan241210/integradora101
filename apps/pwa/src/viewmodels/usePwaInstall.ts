import { useEffect, useState } from 'react';

type InstallChoice = {
  outcome: 'accepted' | 'dismissed';
  platform: string;
};

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

export type InstallMode = 'prompt' | 'manual' | 'hidden';
export type InstallPlatform = 'ios' | 'other';

export type PwaInstallController = {
  mode: InstallMode;
  platform: InstallPlatform;
  feedback: string;
  error: string;
  install: () => Promise<void>;
};

export function getInstallMode({
  isStandalone,
  isInstalled,
  hasPrompt,
}: {
  isStandalone: boolean;
  isInstalled: boolean;
  hasPrompt: boolean;
}): InstallMode {
  if (isStandalone || isInstalled) return 'hidden';
  return hasPrompt ? 'prompt' : 'manual';
}

export function getInstallPlatform(
  userAgent: string,
  maxTouchPoints: number,
): InstallPlatform {
  const isAppleMobile = /iPhone|iPad|iPod/i.test(userAgent);
  const isTouchMac = /Macintosh|MacIntel/i.test(userAgent) && maxTouchPoints > 1;

  return isAppleMobile || isTouchMac ? 'ios' : 'other';
}

export function usePwaInstall(): PwaInstallController {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>('other');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const standaloneNavigator = navigator as Navigator & {
      standalone?: boolean;
    };
    const standaloneQuery = window.matchMedia(
      '(display-mode: standalone)',
    );
    const updateStandalone = () => {
      setIsStandalone(
        standaloneQuery.matches || standaloneNavigator.standalone === true,
      );
    };
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setPromptEvent(null);
      setFeedback('ZooHealth se instaló en este dispositivo.');
    };

    setPlatform(
      getInstallPlatform(navigator.userAgent, navigator.maxTouchPoints),
    );
    updateStandalone();
    standaloneQuery.addEventListener('change', updateStandalone);
    window.addEventListener('beforeinstallprompt', captureInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      standaloneQuery.removeEventListener('change', updateStandalone);
      window.removeEventListener('beforeinstallprompt', captureInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  async function install() {
    if (!promptEvent) return;

    setFeedback('');
    setError('');
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;

      setPromptEvent(null);
      setFeedback(
        choice.outcome === 'accepted'
          ? 'Aceptaste la instalación. Sigue las indicaciones del navegador.'
          : 'No se completó la instalación. Puedes intentarlo desde el menú del navegador.',
      );
      if (choice.outcome === 'accepted') setIsInstalled(true);
    } catch (installError) {
      const detail =
        installError instanceof Error
          ? installError.message
          : 'Error desconocido.';
      setError(`No se pudo abrir la instalación del navegador. ${detail}`);
      setPromptEvent(null);
    }
  }

  return {
    mode: getInstallMode({
      isStandalone,
      isInstalled,
      hasPrompt: promptEvent !== null,
    }),
    platform,
    feedback,
    error,
    install,
  };
}
