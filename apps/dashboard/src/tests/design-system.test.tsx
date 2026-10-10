import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Alert, Badge, Button, Card, Field, SelectField } from "@arca/ui";

const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const dashboardRoot = `${repositoryRoot}/apps/dashboard`;

describe("CA-08 admin-dashboard-prototype", () => {
  it("expone los componentes compartidos y aplica estados semánticos", () => {
    const markup = renderToStaticMarkup(
      <Card>
        <Field label="Título" id="title" />
        <SelectField label="Estado" id="status"><option>Demo</option></SelectField>
        <Badge tone="success">Publicado</Badge>
        <Alert role="status">Prototipo</Alert>
        <Button type="button">Aceptar</Button>
      </Card>,
    );
    expect(markup).toContain('for="title"');
    expect(markup).toContain('for="status"');
    expect(markup).toContain("arca-badge--success");
    expect(markup).toContain('role="status"');
    expect(markup).toContain("Aceptar");
  });

  it("incluye tokens centralizados, manifiestos y scripts base", () => {
    const dashboard = JSON.parse(readFileSync(`${repositoryRoot}/apps/dashboard/package.json`, "utf8"));
    const tokens = readFileSync(`${repositoryRoot}/packages/tokens/src/tokens.css`, "utf8");
    const ui = JSON.parse(readFileSync(`${repositoryRoot}/packages/ui/package.json`, "utf8"));
    expect(dashboard.scripts.build).toBeTruthy();
    expect(dashboard.scripts.types).toBeTruthy();
    expect(dashboard.scripts.test).toBeTruthy();
    expect(ui.exports["./styles.css"]).toBe("./src/styles.css");
    expect(tokens).toMatch(/--sidebar:/);
    expect(tokens).toMatch(/--accent:/);
    expect(tokens).toMatch(/--surface-page:/);
    expect(tokens).toMatch(/--dashboard-primary:/);
    expect(tokens).toMatch(/--dashboard-action:/);
    expect(tokens).toMatch(/--sidebar:\s*#661a2f/);
    expect(tokens).toMatch(/--primary:\s*#87293a/);
  });
});

describe("CA-14 admin-dashboard-prototype", () => {
  it("mapea la paleta institucional desde tokens semánticos en toda la SPA", () => {
    const styles = readFileSync(`${dashboardRoot}/src/styles.css`, "utf8");
    const tokens = readFileSync(`${repositoryRoot}/packages/tokens/src/tokens.css`, "utf8");
    const index = readFileSync(`${dashboardRoot}/index.html`, "utf8");
    const views = readdirSync(`${dashboardRoot}/src/views`)
      .filter((filename) => filename.endsWith(".tsx"))
      .map((filename) => readFileSync(`${dashboardRoot}/src/views/${filename}`, "utf8"))
      .join("\n");

    expect(tokens).toMatch(/--sidebar:\s*#661a2f/i);
    expect(tokens).toMatch(/--primary:\s*#87293a/i);
    expect(tokens).toMatch(/--secondary:\s*#b79159/i);
    expect(tokens).toMatch(/--accent:\s*#dec9a3/i);
    expect(styles).toContain('font-family: "Lato", sans-serif;');
    expect(styles).toContain("font-size: 16px;");
    expect(styles).toContain("--dashboard-sidebar: var(--sidebar);");
    expect(styles).toContain("--dashboard-primary: var(--primary);");
    expect(styles).toContain("--dashboard-action: var(--primary);");
    expect(styles).toContain("--ring: var(--primary);");
    expect(styles).toContain(".sidebar button:focus-visible");
    expect(index).toContain('name="theme-color" content="#661a2f"');
    expect(index).toContain('src="/src/main.tsx"');
    expect(views).not.toMatch(/#[\da-f]{3,8}\b/i);
  });
});
