import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../ui';
import { colors, spacing } from '../../theme/tokens';
import type { ArAnchorPoint } from '../../utils/arGeoAnchor';

type ViroModule = typeof import('@reactvision/react-viro');

let viro: ViroModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  viro = require('@reactvision/react-viro') as ViroModule;
} catch {
  viro = null;
}

interface ViroArAnchorSceneProps {
  anchors: ArAnchorPoint[];
  onClose: () => void;
}

function AnchorSceneContent({ anchors }: { anchors: ArAnchorPoint[] }) {
  if (!viro) return null;
  const { ViroARScene, ViroNode, ViroText, ViroBox } = viro as any;
  return (
    <ViroARScene>
      {anchors.map((anchor) => {
        const color = anchor.kind === 'zoo_place' ? '#87293a' : '#2196F3';
        return (
          <ViroNode key={anchor.id} position={[anchor.x, anchor.y, anchor.z]}>
            <ViroBox
              position={[0, 0, 0]}
              scale={[0.2, 0.2, 0.2]}
              materials={[{ diffuseColor: color }]}
            />
            <ViroText
              text={`${anchor.name} (${Math.round(anchor.distanceMeters)}m)`}
              position={[0, 0.35, 0]}
              scale={[0.5, 0.5, 0.5]}
              style={{ fontFamily: 'Arial', fontSize: 20, color: '#FFFFFF', textAlignVertical: 'center', textAlign: 'center' }}
              extrusionDepth={0.1}
              outerStroke={{ type: 'Outline', width: 2, color: '#000000' }}
            />
          </ViroNode>
        );
      })}
    </ViroARScene>
  );
}

export function ViroArAnchorScene({ anchors, onClose }: ViroArAnchorSceneProps) {
  if (!viro) {
    return (
      <View style={styles.fallback}>
        <AppText variant="body" bold color="text">AR nativa no disponible</AppText>
        <AppText variant="caption" color="textMuted" style={styles.message}>
          Esta PoC requiere development build/EAS con @reactvision/react-viro. Expo Go no soporta ARCore/ARKit nativo.
        </AppText>
        <AppText variant="caption" color="primary" onPress={onClose}>Volver</AppText>
      </View>
    );
  }

  const { ViroARSceneNavigator } = viro as any;
  return (
    <View style={styles.container}>
      <ViroARSceneNavigator
        autofocus
        initialScene={{ scene: () => <AnchorSceneContent anchors={anchors} /> }}
        style={styles.ar}
      />
      <View style={styles.topBar}>
        <AppText variant="caption" bold color="textOnPrimary" onPress={onClose}>
          Cerrar AR nativa
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.text },
  ar: { flex: 1 },
  topBar: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.md,
    right: spacing.md,
    padding: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 8,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  message: { textAlign: 'center' },
});