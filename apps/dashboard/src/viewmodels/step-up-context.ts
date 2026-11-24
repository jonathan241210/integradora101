import { createContext, useContext } from "react";
import { runUnprotected, type RunProtected } from "./step-up";

/**
 * Canal de `runProtected` hacia los ViewModels de cada módulo. Fuera del
 * proveedor ejecuta la operación sin diálogo (pruebas y vistas aisladas).
 */
export const StepUpContext = createContext<RunProtected>(runUnprotected);

export function useRunProtected(): RunProtected {
  return useContext(StepUpContext);
}
