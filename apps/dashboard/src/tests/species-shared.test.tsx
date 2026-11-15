import { expect, it } from "vitest";
import {
  CORRECTION_MAX,
  PHOTO_MAX_BYTES,
  categoryLabels,
  createGeneration,
  describeSpeciesError,
  requestStatusLabels,
  requestTypeLabels,
  speciesStatusLabels,
  validateCorrection,
  validateRejectionReason,
  validateSpeciesPhoto,
} from "../viewmodels/species-publication-shared";
import { apiError } from "./species-fixtures";

it("CA-08 species-shared: máximo 150 en correcciones y espacios sobrantes quitados", () => {
  expect(validateCorrection("  Panthera leo  ")).toEqual({ value: "Panthera leo", error: "" });
  expect(validateCorrection("a".repeat(CORRECTION_MAX)).error).toBe("");
  expect(validateCorrection("a".repeat(CORRECTION_MAX + 1)).error).toBe("Máximo 150 caracteres.");
  expect(validateCorrection("   ")).toEqual({ value: "", error: "" });
  expect(validateRejectionReason("  ").error).not.toBe("");
  expect(validateRejectionReason("x".repeat(501)).error).not.toBe("");
  expect(validateRejectionReason(" ok ")).toEqual({ value: "ok", error: "" });
});

it("CA-17 species-shared: mapeo de 403, 404, 5xx y red por sección", () => {
  expect(describeSpeciesError(apiError(403, "x"), "requests").message).toBe(
    "No tienes permiso para revisar solicitudes de especies.",
  );
  expect(describeSpeciesError(apiError(404, "x"), "requests").message).toBe(
    "Solicitud no encontrada.",
  );
  expect(describeSpeciesError(apiError(500, "Falla"), "requests").retryable).toBe(true);
  expect(describeSpeciesError(new TypeError("fetch"), "requests").retryable).toBe(true);
  expect(describeSpeciesError(apiError(401, "x"), "requests").unauthorized).toBe(true);
  expect(describeSpeciesError(apiError(404, "x"), "requests").retryable).toBe(false);

  const field = describeSpeciesError(
    apiError(422, "Inválido", { habitat: ["Hábitat: máximo 150 caracteres."] }),
    "requests",
  );

  expect(field.fieldErrors.habitat).toEqual(["Hábitat: máximo 150 caracteres."]);
  expect(requestStatusLabels).toEqual({
    submitted: "Pendiente",
    accepted: "Publicada",
    rejected: "Rechazada",
  });
  expect(requestTypeLabels.publish).toBe("Primera publicación");
  expect(requestTypeLabels.update).toBe("Actualización");
  expect(speciesStatusLabels.unpublished).toBe("Despublicada");
  expect(categoryLabels.mammal).toBe("Mamífero");
});

it("CA-49 species-shared: foto JPG o PNG de hasta 5 MB; mensajes exactos", () => {
  expect(validateSpeciesPhoto({ type: "image/jpeg", size: 10 })).toBe("");
  expect(validateSpeciesPhoto({ type: "image/png", size: PHOTO_MAX_BYTES })).toBe("");
  expect(validateSpeciesPhoto({ type: "image/webp", size: 10 })).toBe("Elige una imagen JPG o PNG.");
  expect(validateSpeciesPhoto({ type: "image/png", size: PHOTO_MAX_BYTES + 1 })).toBe(
    "La foto no puede superar 5 MB.",
  );
});

it("CA-58 species-shared: mensajes de la sección de publicadas", () => {
  expect(describeSpeciesError(apiError(403, "x"), "published").message).toBe(
    "No tienes permiso para gestionar especies publicadas.",
  );
  expect(describeSpeciesError(apiError(404, "x"), "published").message).toBe(
    "Especie no encontrada.",
  );
  const stale = describeSpeciesError(apiError(422, "Esta especie no está publicada."), "published");

  expect(stale.message).toBe("Esta especie no está publicada.");
  expect(stale.fieldErrors).toEqual({});
});

it("CA-12 species-shared: el contador de generación descarta respuestas tardías", () => {
  const generation = createGeneration();
  const first = generation.next();
  const second = generation.next();

  expect(generation.isCurrent(first)).toBe(false);
  expect(generation.isCurrent(second)).toBe(true);
  expect(generation.isCurrent(generation.peek())).toBe(true);
});
