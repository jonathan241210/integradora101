import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

async function readPayload() {
    let input = '';
    for await (const chunk of process.stdin) input += chunk;
    if (!input.trim()) return null;
    try {
        return JSON.parse(input);
    } catch {
        return null;
    }
}

function currentBranch(root) {
    try {
        const result = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
            cwd: root,
            encoding: 'utf8',
            timeout: 5000,
        });
        return result.status === 0 && result.stdout.trim()
            ? result.stdout.trim()
            : 'no disponible';
    } catch {
        return 'no disponible';
    }
}

function inProgressSpecs(root) {
    const appsDirectory = path.join(root, 'apps');
    const matches = [];
    try {
        for (const app of readdirSync(appsDirectory, { withFileTypes: true })) {
            if (!app.isDirectory()) continue;
            const specsDirectory = path.join(appsDirectory, app.name, 'specs');
            try {
                for (const file of readdirSync(specsDirectory, { withFileTypes: true })) {
                    if (!file.isFile() || !file.name.endsWith('.md')) continue;
                    const filePath = path.join(specsDirectory, file.name);
                    if (readFileSync(filePath, 'utf8').includes('Estado: En progreso')) {
                        matches.push(`apps/${app.name}/specs/${file.name}`);
                    }
                }
            } catch {
                // Una app sin carpeta specs todavía no tiene artefactos que anunciar.
            }
        }
    } catch {
        // Un repositorio sin carpeta apps todavía puede abrir una sesión.
    }
    return matches.sort();
}

await readPayload();
const root = process.env.DEVIN_PROJECT_DIR || process.cwd();
const specs = inProgressSpecs(root);
const context = [
    `Rama Git actual: ${currentBranch(root)}.`,
    'Obedece CONSTITUTION.md y AGENTS.md; sigue el procedimiento SDD obligatorio antes de cada cambio.',
    specs.length
        ? `Specs en progreso: ${specs.join(', ')}.`
        : 'No hay specs con Estado: En progreso.',
].join(' ');

process.stdout.write(
    `${JSON.stringify({
        hookSpecificOutput: {
            hookEventName: 'SessionStart',
            additionalContext: context,
        },
    })}\n`,
);
