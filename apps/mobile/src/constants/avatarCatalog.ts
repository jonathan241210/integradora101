export const AVATAR_CODES = [
  'jaguar',
  'lion',
  'elephant',
  'macaw',
  'monkey',
  'turtle',
  'deer',
  'wolf',
] as const;

export type AvatarCode = (typeof AVATAR_CODES)[number];

export function isAvatarCode(value: string): value is AvatarCode {
  return (AVATAR_CODES as readonly string[]).includes(value);
}

export const AVATAR_LABELS: Record<AvatarCode, string> = {
  jaguar: 'Jaguar',
  lion: 'León',
  elephant: 'Elefante',
  macaw: 'Guacamaya',
  monkey: 'Mono',
  turtle: 'Tortuga',
  deer: 'Venado',
  wolf: 'Lobo',
};

export function avatarLabel(code: string): string {
  return isAvatarCode(code) ? AVATAR_LABELS[code] : code;
}
