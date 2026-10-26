declare const __dirname: string;

const fs = jest.requireActual<{
  readdirSync: (directory: string) => string[];
  readFileSync: (file: string, encoding: string) => string;
}>('fs');
const path = jest.requireActual<{ join: (...parts: string[]) => string }>('path');

const root = path.join(__dirname, '..', '..', 'src');

function filesUnder(dir: string): string[] {
  return fs.readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (name.includes('.')) {
      return name.endsWith('.ts') || name.endsWith('.tsx') ? [full] : [];
    }
    return filesUnder(full);
  });
}

describe('retiro de líderes y contrato de la app', () => {
  const sources = filesUnder(root).map((file) => fs.readFileSync(file, 'utf8'));
  const joined = sources.join('\n');

  it('CA-08 visitor-progress no conserva líderes ni recompensas', () => {
    expect(joined).not.toContain('MOCK_LEADERBOARD');
    expect(joined).not.toContain('MOCK_REWARDS');
    expect(joined).not.toContain('LeaderboardEntry');
    expect(joined).not.toContain('interface Reward');
  });

  it('CA-09 visitor-progress separa pantalla, viewmodel, repositorio y cliente', () => {
    const profile = fs.readFileSync(path.join(root, 'app', '(tabs)', 'profile.tsx'), 'utf8');
    const viewModel = fs.readFileSync(path.join(root, 'viewmodels', 'useVisitorProgress.ts'), 'utf8');
    const repository = fs.readFileSync(path.join(root, 'repositories', 'progressRepository.ts'), 'utf8');
    expect(profile).not.toContain('createVisitorApi');
    expect(profile).not.toContain('fetch(');
    expect(viewModel).toContain('progressRepository');
    expect(repository).toContain('@arca/api-client');
    expect(viewModel).not.toContain('@arca/api-client');
  });

  it('CA-10 visitor-progress nombra cada criterio en la suite', () => {
    const tests = filesUnder(path.join(__dirname)).map((file) => fs.readFileSync(file, 'utf8')).join('\n');
    for (let number = 1; number <= 10; number += 1) {
      expect(tests).toContain(`CA-${String(number).padStart(2, '0')} visitor-progress`);
    }
  });
});
