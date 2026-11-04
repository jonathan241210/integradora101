type TabRouter = {
  back: () => void;
  navigate: (href: string) => void;
};

const ROOT_PATHS = new Set(['/', '/index', '/map', '/scan', '/collection', '/profile']);

let history: string[] = [];

export function normalizeTabPath(pathname: string): string {
  const path = pathname.split('?')[0] || '/';
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path || '/';
}

export function isVisitorTabRoot(pathname: string): boolean {
  return ROOT_PATHS.has(normalizeTabPath(pathname));
}

export function notePathname(pathname: string): void {
  const path = normalizeTabPath(pathname);
  if (isVisitorTabRoot(path)) {
    history = [path];
    return;
  }
  if (history[history.length - 1] === path) return;
  const existing = history.indexOf(path);
  if (existing >= 0) {
    history = history.slice(0, existing + 1);
    return;
  }
  history.push(path);
}

export function resetTabHistoryForTests(): void {
  history = [];
}

export function goBackWithinTabs(router: TabRouter): void {
  if (history.length > 1) {
    history = history.slice(0, -1);
    const parent = history[history.length - 1];
    if (parent) {
      router.navigate(parent);
      return;
    }
  }
  router.back();
}
