import { useCallback, useState } from "react";
import {
  changeTicketPrintSettings,
  defaultTicketPrintSettings,
  loadTicketPrintSettings,
  saveTicketPrintSettings,
  type TicketPrintChange,
  type TicketPrintSettings,
} from "./ticket-print-settings";

export type TicketPrintSettingsViewModel = {
  settings: TicketPrintSettings;
  change: (change: TicketPrintChange) => void;
  reset: () => void;
};

/** Lee la preferencia al montar y la guarda en el equipo al cambiar. */
export function useTicketPrintSettings(): TicketPrintSettingsViewModel {
  const [settings, setSettings] = useState<TicketPrintSettings>(() =>
    loadTicketPrintSettings(),
  );

  const change = useCallback((next: TicketPrintChange) => {
    setSettings((current) => {
      const updated = changeTicketPrintSettings(current, next);
      saveTicketPrintSettings(updated);

      return updated;
    });
  }, []);

  const reset = useCallback(() => {
    const defaults = loadDefaults();
    setSettings(defaults);
    saveTicketPrintSettings(defaults);
  }, []);

  return { settings, change, reset };
}

function loadDefaults(): TicketPrintSettings {
  return {
    ...defaultTicketPrintSettings,
    fields: { ...defaultTicketPrintSettings.fields },
  };
}
