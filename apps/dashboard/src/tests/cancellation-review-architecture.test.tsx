import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");
const testsDirectory = fileURLToPath(new URL(".", import.meta.url));

const views = [
  "components/CancellationTrafficLightTable.tsx",
  "components/CancellationCurrentReview.tsx",
  "components/CancellationLegend.tsx",
  "components/CancellationReviewDialog.tsx",
  "components/CancellationReviewHistory.tsx",
  "views/CancellationReportView.tsx",
  "sections/CancellationReportSection.tsx",
];
const viewModels = ["viewmodels/cancellation-review.ts", "viewmodels/useCancellationReview.ts"];

describe("CA-13 cancellation-review-signals", () => {
  it("test_ca13_views_do_not_call_fetch_and_hooks_use_api_client", () => {
    for (const file of views) {
      const source = read(file);

      expect(source, file).not.toMatch(/\bfetch\s*\(/);
      expect(source, file).not.toMatch(/\baxios\b/);
      expect(source, file).not.toMatch(/@arca\/api-client/);
      expect(source, file).not.toMatch(/@\/services\//);
      expect(source, file).not.toMatch(/localStorage|sessionStorage/);
    }
    expect(read("viewmodels/useCancellationReview.ts")).toContain("adminApi");
    expect(read("services/arca-api.ts")).toContain("@arca/api-client");
    expect(read("viewmodels/cancellation-review.ts")).not.toMatch(/\bfetch\s*\(/);
    expect(read("../../../packages/api-client/admin.ts")).toContain("createCancellationReview");
    expect(read("../../../packages/api-client/admin.ts")).toContain("listCancellationReviews");
  });
});

describe("CA-15 cancellation-review-signals", () => {
  it("test_ca15_new_components_use_semantic_tokens", () => {
    for (const file of [...views, ...viewModels]) {
      expect(read(file), file).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
    const styles = read("styles.css");
    const block = styles.slice(
      styles.indexOf("cancellation-review-signals:start"),
      styles.indexOf("cancellation-review-signals:end"),
    );

    expect(block.length).toBeGreaterThan(0);
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(block).not.toMatch(/\b(?:rgb|hsl)a?\(/);
  });
});

describe("CA-16 cancellation-review-signals", () => {
  it("test_ca16_every_ca_has_a_named_test", () => {
    const source = readdirSync(testsDirectory)
      .filter((filename) => filename.endsWith(".test.tsx"))
      .map((filename) => readFileSync(`${testsDirectory}${filename}`, "utf8"))
      .join("\n");

    for (let number = 1; number <= 34; number += 1) {
      const name = `CA-${String(number).padStart(2, "0")} cancellation-review-signals`;

      expect(source, name).toContain(`describe("${name}"`);

      // El `it` debe estar dentro del describe con el sufijo de la spec, no en cualquier parte.
      const start = source.indexOf(`describe("${name}"`);
      const next = source.indexOf('\ndescribe("', start + 1);
      const block = source.slice(start, next === -1 ? undefined : next);

      expect(block, name).toMatch(new RegExp(`it\\("test_ca${String(number).padStart(2, "0")}_`));
    }
  });
});

describe("CA-17 cancellation-review-signals", () => {
  it("test_ca17_no_physical_ticket_text_in_new_views", () => {
    for (const file of [...views, ...viewModels]) {
      const source = read(file);

      expect(source, file).not.toMatch(/boletos? f[ií]sicos?/i);
      expect(source, file).not.toMatch(/entreg(a|ar|ue)\b[^"\n]*boleto/i);
      // Sin texto de «qué hacer» propio: la acción solo se muestra desde `row.action`.
      expect(source, file).not.toMatch(/Compara el neto|pide al cajero|Qué hacer:/);
    }
    expect(read("components/CancellationTrafficLightTable.tsx")).toContain("row.action");
  });
});
