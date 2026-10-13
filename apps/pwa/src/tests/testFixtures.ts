import type { PwaInstallController } from '@/viewmodels/usePwaInstall';

export const manualInstallController: PwaInstallController = {
  mode: 'manual',
  platform: 'other',
  feedback: '',
  error: '',
  install: async () => undefined,
};
