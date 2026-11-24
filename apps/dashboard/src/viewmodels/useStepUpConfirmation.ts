import { useEffect, useMemo, useState } from "react";
import { adminApi } from "@/services/arca-api";
import {
  closedStepUpDialog,
  createStepUpController,
  type StepUpController,
  type StepUpDialogState,
} from "./step-up";

export type StepUpViewModel = {
  dialog: StepUpDialogState;
  runProtected: StepUpController["runProtected"];
  submit: StepUpController["submit"];
  cancel: StepUpController["cancel"];
};

/**
 * ViewModel del diálogo de contraseña (dashboard-015). No persiste nada en el
 * navegador: al desmontar cancela la promesa pendiente (CA-14).
 */
export function useStepUpConfirmation(): StepUpViewModel {
  const [dialog, setDialog] = useState<StepUpDialogState>(closedStepUpDialog);
  const controller = useMemo(
    () =>
      createStepUpController(
        (password) => adminApi.passwordConfirmation.confirm(password),
        setDialog,
      ),
    [],
  );

  useEffect(() => () => controller.dispose(), [controller]);

  return {
    dialog,
    runProtected: controller.runProtected,
    submit: controller.submit,
    cancel: controller.cancel,
  };
}
