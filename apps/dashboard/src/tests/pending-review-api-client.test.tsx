import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createAdminApi, createHttpClient } from "@arca/api-client";
import { describe, expect, it } from "vitest";

const srcDirectory = fileURLToPath(new URL("..", import.meta.url));

describe("CA-13 pending-review-badges", () => {
  it("CA-13 pending-review-badges: MVVM y api-client", async () => {
    const calls: string[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      calls.push(`${init?.method ?? "GET"} ${String(input)}`);

      return new Response(JSON.stringify({ species_requests: 2, memories: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    const api = createAdminApi(createHttpClient({ baseUrl: "", fetchImpl }));

    // La forma va en la raíz, sin `data` (api-024 CA-01).
    expect(await api.pendingCounts()).toEqual({ species_requests: 2, memories: 0 });
    expect(calls).toEqual(["GET /api/v1/admin/pending-counts"]);

    for (const folder of ["components", "views"]) {
      for (const file of readdirSync(`${srcDirectory}${folder}`).filter((name) => name.endsWith(".tsx"))) {
        expect(readFileSync(`${srcDirectory}${folder}/${file}`, "utf8"), `${folder}/${file}`).not.toMatch(/\bfetch\(|axios/);
      }
    }
    expect(readFileSync(`${srcDirectory}viewmodels/usePendingReviewCounts.ts`, "utf8")).toContain("adminApi");
  });
});
