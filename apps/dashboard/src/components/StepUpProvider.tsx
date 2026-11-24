import type { ReactNode } from "react";
import { StepUpContext } from "@/viewmodels/step-up-context";
import { useStepUpConfirmation } from "@/viewmodels/useStepUpConfirmation";
import { StepUpConfirmationDialog } from "./StepUpConfirmationDialog";

/**
 * Monta un solo diálogo de contraseña para todo el panel autenticado y
 * entrega `runProtected` a los ViewModels. Se monta con `key` del perfil para
 * que un cierre de sesión descarte cualquier estado (CA-14).
 */
export function StepUpProvider({ children }: { children: ReactNode }) {
  const stepUp = useStepUpConfirmation();

  return (
    <StepUpContext.Provider value={stepUp.runProtected}>
      {children}
      <StepUpConfirmationDialog
        dialog={stepUp.dialog}
        onSubmit={stepUp.submit}
        onCancel={stepUp.cancel}
      />
    </StepUpContext.Provider>
  );
}
