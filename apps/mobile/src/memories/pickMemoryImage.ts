import * as ImagePicker from 'expo-image-picker';

export type MemoryFile = {
  uri: string;
  name: string;
  mimeType: string;
  size: number | null;
};

export type PickMemoryImageResult =
  | { ok: true; file: MemoryFile }
  | { ok: false; reason: 'denied' | 'canceled' };

function fileNameFrom(uri: string, mimeType: string): string {
  const leaf = uri.split('/').pop()?.split('?')[0];
  if (leaf && /\.(jpe?g|png|webp)$/i.test(leaf)) return leaf;
  if (mimeType.includes('png')) return 'momento.png';
  if (mimeType.includes('webp')) return 'momento.webp';
  return 'momento.jpg';
}

export async function pickMemoryImage(): Promise<PickMemoryImageResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { ok: false, reason: 'denied' };

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
    allowsMultipleSelection: false,
  });

  if (result.canceled || result.assets.length === 0) return { ok: false, reason: 'canceled' };
  const asset = result.assets[0];
  const mimeType = asset.mimeType ?? 'image/jpeg';
  return {
    ok: true,
    file: {
      uri: asset.uri,
      name: asset.fileName ?? fileNameFrom(asset.uri, mimeType),
      mimeType,
      size: asset.fileSize ?? null,
    },
  };
}
