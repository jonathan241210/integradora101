import { expect, it } from "vitest";
import {
  canConfirmRejection,
  createGeneration,
  describeMemoryError,
  excerpt,
  memoryAcceptCopy,
  memoryStatusLabels,
  resubmittedText,
  sanitizeRejectedFields,
} from "../viewmodels/memory-review-shared";
import { apiError } from "./memory-fixtures";

it("CA-04 memory-shared: fragmento de 120 caracteres; «Sin opinión» si es null; «Reenviada 1 vez» y «Reenviada n veces»", () => {
  expect(excerpt("a".repeat(120))).toBe("a".repeat(120));
  expect(excerpt("a".repeat(121))).toBe(`${"a".repeat(120)}…`);
  expect(excerpt(null)).toBe("Sin opinión");
  expect(excerpt("   ")).toBe("Sin opinión");
  expect(resubmittedText(0)).toBe("");
  expect(resubmittedText(1)).toBe("Reenviada 1 vez");
  expect(resubmittedText(3)).toBe("Reenviada 3 veces");
});

it("CA-09 memory-shared: motivo de 1 a 500 sin espacios sobrantes y al menos una casilla; canConfirmRejection falso en esos casos", () => {
  expect(canConfirmRejection("Foto borrosa", ["image"])).toBe(true);
  expect(canConfirmRejection("  Foto borrosa  ", ["content"])).toBe(true);
  expect(canConfirmRejection("   ", ["image"])).toBe(false);
  expect(canConfirmRejection("", ["image"])).toBe(false);
  expect(canConfirmRejection("Motivo", [])).toBe(false);
  expect(canConfirmRejection("a".repeat(500), ["image"])).toBe(true);
  expect(canConfirmRejection("a".repeat(501), ["image"])).toBe(false);
  // Los 500 se cuentan tras quitar espacios.
  expect(canConfirmRejection(` ${"a".repeat(500)} `, ["image"])).toBe(true);
  expect(memoryAcceptCopy(7).message).toContain("durante 7 días desde la aceptación");
  expect(memoryAcceptCopy(1).message).toContain("durante 1 día desde la aceptación");
});

it("CA-11 memory-shared: mapeo de 401, 403, 404, 422, 5xx y red; 401 sin mensaje propio", () => {
  const unauthorized = describeMemoryError(apiError(401, "No autenticado."), "detail");

  expect(unauthorized.unauthorized).toBe(true);
  expect(unauthorized.retryable).toBe(false);

  expect(describeMemoryError(apiError(403, "x"), "list")).toMatchObject({
    forbidden: true,
    message: "No tienes permiso para revisar momentos.",
  });
  expect(describeMemoryError(apiError(404, "x"), "detail")).toMatchObject({
    notFound: true,
    message: "Petición no encontrada.",
  });

  const field = describeMemoryError(
    apiError(422, "Datos inválidos.", { rejection_reason: ["El motivo es obligatorio."] }),
    "decision",
  );

  expect(field.fieldErrors.rejection_reason).toEqual(["El motivo es obligatorio."]);
  expect(describeMemoryError(apiError(422, "Esta petición ya fue revisada."), "decision").message).toBe(
    "Esta petición ya fue revisada.",
  );
  expect(describeMemoryError(apiError(500, "Boom"), "list")).toMatchObject({
    retryable: true,
    message: "No se pudieron cargar las peticiones.",
  });
  expect(describeMemoryError(apiError(503, "Boom"), "detail")).toMatchObject({
    retryable: true,
    message: "No se pudo cargar la petición.",
  });
  expect(describeMemoryError(new TypeError("Failed to fetch"), "detail").retryable).toBe(true);
});

it("RN-05 memory-shared: rechazo solo con image o content; valores fuera de la lista no pasan", () => {
  expect(sanitizeRejectedFields(["content", "image"])).toEqual(["image", "content"]);
  expect(sanitizeRejectedFields(["image", "image", "otro"])).toEqual(["image"]);
  expect(sanitizeRejectedFields(["otro"])).toEqual([]);
  expect(canConfirmRejection("Motivo", ["otro"])).toBe(false);
});

it("RN-02 memory-shared: etiquetas de estado en español", () => {
  expect(memoryStatusLabels).toEqual({
    submitted: "Enviada",
    in_review: "En proceso",
    accepted: "Aceptada",
    rejected: "Rechazada",
  });

  const generation = createGeneration();
  const first = generation.next();

  generation.next();
  expect(generation.isCurrent(first)).toBe(false);
});
