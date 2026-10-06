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

function commandText(payload) {
    const value = payload?.tool_input?.command ?? payload?.command;
    return typeof value === 'string' ? value : '';
}

function commandSegments(command) {
    return command.split(/&&|\|\||[;|\n\r]/).map((part) => part.trim());
}

function isRecursiveForceRm(segment) {
    const tokens = segment.split(/\s+/);
    const index = tokens.findIndex((token) => /^(?:sudo\s+)?rm$/i.test(token));
    if (index === -1) return false;
    const flags = tokens.slice(index + 1).filter((token) => token.startsWith('-'));
    const short = flags.filter((flag) => !flag.startsWith('--')).join('');
    const recursive = /r/i.test(short) || flags.includes('--recursive');
    const force = /f/.test(short) || flags.includes('--force');
    return recursive && force;
}

function hasDangerousCommand(command) {
    for (const segment of commandSegments(command)) {
        if (isRecursiveForceRm(segment)) return 'comando rm -rf';
        if (/\bgit\s+push\b[^\n]*(?:--force(?:-with-lease)?\b|\s-[a-z]*f[a-z]*(?:\s|$))/i.test(segment)) return 'git push forzado';
        if (/\bgit\s+reset\b[^\n]*\s--hard(?:\s|$)/i.test(segment)) return 'git reset --hard';
        if (/\bgit\s+clean\b[^\n]*\s-(?:[a-z]*f[a-z]*d[a-z]*|[a-z]*d[a-z]*f[a-z]*)(?:\s|$)/i.test(segment)) return 'git clean -fd';
        if (/\bmigrate:(?:fresh|reset)\b/i.test(segment)) return 'migración destructiva';
        if (/\bdb:wipe\b/i.test(segment)) return 'db:wipe';
        if (/\bdrop\s+(?:table|database)\b/i.test(segment)) return 'DROP TABLE/DATABASE';
    }
    return null;
}

function hasForbiddenEnvReference(command) {
    const references = command.match(/(?:^|[^A-Za-z0-9_-])\.env(?:\.[A-Za-z0-9_-]+)?/gi) || [];
    return references.some((reference) => !reference.trim().toLowerCase().endsWith('.env.example'));
}

const payload = await readPayload();
if (!payload || typeof payload !== 'object') process.exit(0);

const command = commandText(payload);
let reason = null;
if (/PLANTILLA_V4_Con colores/i.test(command)) {
    reason = 'No se permite leer ni modificar PLANTILLA_V4_Con colores/.';
} else if (hasForbiddenEnvReference(command)) {
    reason = 'No se permite ejecutar comandos que referencien archivos .env distintos de .env.example.';
} else {
    reason = hasDangerousCommand(command);
}

if (reason) {
    process.stdout.write(`${JSON.stringify({ decision: 'block', reason })}\n`);
    process.exitCode = 2;
}
