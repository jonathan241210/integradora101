import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const styles = read("../styles.css");
const block = styles.slice(
  styles.indexOf("/* cancellation-report:start"),
  styles.indexOf("/* cancellation-report:end"),
);

describe("CA-24 ticket-cancellation-report", () => {
  it("test_ca24_new_components_and_styles_use_semantic_tokens_without_brand_hex", () => {
    expect(block.length).toBeGreaterThan(300);
    expect(block).not.toMatch(/#[\da-f]{3,8}\b/i);
    expect(block).not.toMatch(/\b(?:rgb|rgba|hsl)\(/i);

    for (const file of [
      "../views/CancellationReportView.tsx",
      "../components/CancelTicketDialog.tsx",
    ]) {
      expect(read(file), file).not.toMatch(/#[\da-f]{3,8}\b/i);
      expect(read(file), file).not.toMatch(/style=\{\{[^}]*color/i);
    }
  });
});
