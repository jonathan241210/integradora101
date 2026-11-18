import { ImageSourcePropType } from 'react-native';

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

export const AVATAR_IMAGES: Record<AvatarCode, ImageSourcePropType> = {
  jaguar: require('../assets/avatars/jaguar.png'),
  lion: require('../assets/avatars/lion.png'),
  elephant: require('../assets/avatars/elephant.png'),
  macaw: require('../assets/avatars/macaw.png'),
  monkey: require('../assets/avatars/monkey.png'),
  turtle: require('../assets/avatars/turtle.png'),
  deer: require('../assets/avatars/deer.png'),
  wolf: require('../assets/avatars/wolf.png'),
};
