export function getUserScope(userId: number | string): string {
  return `user:${String(userId)}`;
}

export function getAnonymousScope(): string {
  return 'user:anonymous';
}