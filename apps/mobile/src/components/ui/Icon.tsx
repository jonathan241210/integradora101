import React from 'react';
import { SymbolView } from 'expo-symbols';
import type { SymbolViewProps } from 'expo-symbols';
import { colors } from '../../theme/tokens';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
}

const symbols: Record<string, SymbolViewProps['name']> = {
  'arrow-back': { android: 'arrow_back', ios: 'arrow.left' },
  bell: { android: 'notifications', ios: 'bell' },
  bookmark: { android: 'bookmark', ios: 'bookmark.fill' },
  'bookmark-outline': { android: 'bookmark_border', ios: 'bookmark' },
  'camera-outline': { android: 'photo_camera', ios: 'camera' },
  camera: { android: 'camera_alt', ios: 'camera.fill' },
  'cube-outline': { android: 'view_in_ar', ios: 'cube.transparent' },
  explore: { android: 'explore', ios: 'safari' },
  'emoji-events': { android: 'emoji_events', ios: 'rosette' },
  'military-tech': { android: 'military_tech', ios: 'medal' },
  'photo-camera': { android: 'photo_camera', ios: 'camera' },
  pets: { android: 'pets', ios: 'pawprint.fill' },
  stars: { android: 'stars', ios: 'star.fill' },
  heart: { android: 'favorite', ios: 'heart.fill' },
  'heart-outline': { android: 'favorite_border', ios: 'heart' },
  home: { android: 'home', ios: 'house.fill' },
  'home-outline': { android: 'home', ios: 'house' },
  'information-circle-outline': { android: 'info_outline', ios: 'info.circle' },
  'location-outline': { android: 'location_on', ios: 'location' },
  location: { android: 'location_on', ios: 'location.fill' },
  lock: { android: 'lock', ios: 'lock.fill' },
  paw: { android: 'pets', ios: 'pawprint.fill' },
  person: { android: 'person', ios: 'person.fill' },
  'person-outline': { android: 'person_outline', ios: 'person' },
  'qr-code': { android: 'qr_code_2', ios: 'qrcode' },
  'restaurant-outline': { android: 'restaurant', ios: 'fork.knife' },
  'sparkles-outline': { android: 'auto_awesome', ios: 'sparkles' },
  water: { android: 'water', ios: 'water.waves' },
  visibility: { android: 'visibility', ios: 'eye' },
};

export function Icon({ name, size = 24, color = colors.text }: IconProps) {
  const symbol = symbols[name];
  if (!symbol) {
    console.warn(`Icono no registrado: ${name}`);
    return null;
  }

  return <SymbolView name={symbol} size={size} tintColor={color} />;
}
