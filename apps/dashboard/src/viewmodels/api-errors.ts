export type DescribedApiError = {
  message: string;
  fieldErrors: Record<string, string[]>;
  status: number;
  unauthorized: boolean;
  forbidden: boolean;
  notFound: boolean;
};

const networkMessage =
  "No fue posible conectar con el servidor. Revisa tu conexión e intenta de nuevo.";
const genericMessage = "No fue posible completar la solicitud. Intenta de nuevo.";

/**
 * Convierte un `ApiError` de `@arca/api-client` en datos listos para
 * presentar. El 401 lo atiende el manejador global de sesión; aquí solo se
 * marca para que los ViewModels no lo dupliquen (CA-15).
 */
export function describeApiError(error: unknown): DescribedApiError {
  const candidate =
    typeof error === "object" && error !== null
      ? (error as {
          status?: unknown;
          message?: unknown;
          errors?: unknown;
        })
      : {};
  const status = typeof candidate.status === "number" ? candidate.status : 0;
  const apiMessage =
    typeof candidate.message === "string" && candidate.message.trim()
      ? candidate.message
      : "";
  const fieldErrors: Record<string, string[]> = {};

  if (
    typeof candidate.errors === "object" &&
    candidate.errors !== null &&
    !Array.isArray(candidate.errors)
  ) {
    for (const [field, messages] of Object.entries(candidate.errors)) {
      if (Array.isArray(messages)) {
        fieldErrors[field] = messages.filter(
          (message): message is string => typeof message === "string",
        );
      }
    }
  }

  const isApiError = status > 0;

  return {
    message: isApiError ? apiMessage || genericMessage : networkMessage,
    fieldErrors,
    status,
    unauthorized: status === 401,
    forbidden: status === 403,
    notFound: status === 404,
  };
}
