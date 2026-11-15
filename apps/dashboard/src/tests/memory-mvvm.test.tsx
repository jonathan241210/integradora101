import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");
const stripComments = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const presentation = [
  "views/MemoriesView.tsx",
  "views/MemoryReviewDetailView.tsx",
  "components/MemoryImage.tsx",
  "components/MemoryRejectDialog.tsx",
  "components/MemoryStatusBadge.tsx",
  "sections/MemoriesSection.tsx",
  "sections/MemoryDetailSection.tsx",
];
const viewModels = [
  "viewmodels/memory-review-shared.ts",
  "viewmodels/memory-review.ts",
  "viewmodels/useMemoryReviewList.ts",
  "viewmodels/useMemoryReviewDetail.ts",
];
const hooks = ["viewmodels/useMemoryReviewList.ts", "viewmodels/useMemoryReviewDetail.ts"];
const styles = source("styles.css");
const memoryStyles = styles.slice(styles.indexOf("dashboard-008"));

it("CA-14 memory-mvvm: views, components y sections sin fetch, axios, services ni @arca/api-client", () => {
  for (const path of presentation) {
    const text = stripComments(source(path));

    expect(text, path).not.toMatch(/\bfetch\s*\(/);
    expect(text, path).not.toMatch(/axios/i);
    expect(text, path).not.toMatch(/XMLHttpRequest/);
    expect(text, path).not.toMatch(/from\s+["']@\/services/);
    expect(text, path).not.toMatch(/from\s+["']@arca\/api-client/);
    expect(text, path).not.toMatch(/adminApi|memoryReview\./);
  }
});

it("CA-14 memory-mvvm: los hooks solo llaman a adminApi.memoryReview", () => {
  for (const path of hooks) {
    const text = stripComments(source(path));

    expect(text, path).toContain("adminApi");
    expect(text, path).not.toMatch(/\bfetch\s*\(/);
    expect(text, path).not.toMatch(/axios/i);
    expect(text, path).not.toMatch(/createHttpClient|createAdminApi/);
    // Pasan el cliente al ViewModel puro; nunca llaman a otro namespace.
    expect(text, path).not.toMatch(/adminApi\.(?!memoryReview)/);

    const services = [...text.matchAll(/from\s+["'](@\/services\/[^"']+)["']/g)].map((match) => match[1]);

    expect(services, path).toContain("@/services/arca-api");
    expect(services.every((item) => ["@/services/arca-api", "@/services/image-preview"].includes(item)), path).toBe(true);
  }

  // Los ViewModels puros reciben el cliente por contexto: no lo importan.
  for (const path of ["viewmodels/memory-review.ts", "viewmodels/memory-review-shared.ts"]) {
    expect(source(path), path).not.toMatch(/from\s+["']@\/services/);
    expect(source(path), path).not.toMatch(/from\s+["']@arca\/api-client/);
  }
});

it("CA-15 memory-mvvm: sin hex ni rgb() en los archivos nuevos de memory-review", () => {
  for (const path of [...presentation, ...viewModels]) {
    const text = stripComments(source(path));

    expect(text, path).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(text, path).not.toMatch(/\brgba?\(|\bhsla?\(/);
  }

  expect(memoryStyles).toContain(".memory-review__");
  expect(memoryStyles).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  expect(memoryStyles).not.toMatch(/\brgba?\(|\bhsla?\(/);
  expect(memoryStyles).toMatch(/var\(--/);

  // Los cuatro estados se distinguen por texto además del icono (CA-15).
  const badge = source("components/MemoryStatusBadge.tsx");

  expect(badge).toContain("<Icon");
  expect(badge).toContain("memoryStatusLabels[status]");
});

it("RN-07 memory-mvvm: sin localStorage, sessionStorage ni IndexedDB en la sección", () => {
  for (const path of [...presentation, ...viewModels]) {
    expect(source(path), path).not.toMatch(/localStorage|sessionStorage|indexedDB|document\.cookie/i);
  }
});

it("RN-07 memory-mvvm: sin dangerouslySetInnerHTML; la opinión se muestra como texto", () => {
  for (const path of [...presentation, ...viewModels]) {
    expect(source(path), path).not.toContain("dangerouslySetInnerHTML");
    expect(source(path), path).not.toMatch(/\.innerHTML|insertAdjacentHTML/);
  }

  expect(source("views/MemoryReviewDetailView.tsx")).toMatch(
    /<p className="memory-review__opinion">\{data\.opinion \?\? NO_OPINION_TEXT\}<\/p>/,
  );
});

it("RN-01 memory-mvvm: el código no calcula permisos, estados ni plazos", () => {
  for (const path of [...presentation, ...viewModels]) {
    const text = stripComments(source(path));

    expect(text, path).not.toMatch(/\bpermissions\b|memories\.review|\.roles\b/);
    expect(text, path).not.toMatch(/Date\.now|new Date\(|\.getTime\(|setDate|addDays/);
    expect(text, path).not.toMatch(/published_until\s*(?:[<>]=?|===?|!==?)/);
    // Los flags llegan de la API: no se asignan ni se derivan.
    expect(text, path).not.toMatch(/\bis_published\s*=(?![=>])/);
    expect(text, path).not.toMatch(/status\s*:\s*["'](?:in_review|accepted|rejected)["']\s*as\b/);
  }
});

it("RN-08 memory-mvvm: los hooks de memory-review existen y son ViewModels", () => {
  for (const [path, name] of [
    ["viewmodels/useMemoryReviewList.ts", "useMemoryReviewList"],
    ["viewmodels/useMemoryReviewDetail.ts", "useMemoryReviewDetail"],
  ]) {
    const text = source(path);

    expect(text, path).toContain(`export function ${name}`);
    expect(text, path).toMatch(/useReducer|useState/);
    expect(text, path).not.toMatch(/<[A-Z][A-Za-z]*[\s>]|return\s*\(\s*</);
  }

  // Las views son componentes puros por props: ninguna llama a hooks de datos.
  for (const path of presentation.filter((item) => item.startsWith("views/") || item.startsWith("components/"))) {
    expect(source(path), path).not.toMatch(/useMemoryReview|useEffect|useReducer/);
  }
});
