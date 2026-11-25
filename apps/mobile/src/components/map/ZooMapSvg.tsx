import React, { useMemo } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { ZOO_MAP_CANONICAL_SVG } from '../../data/zooMapCanonicalSvg';
import { MapPlace } from '../../models';
import { SVG_WIDTH, SVG_HEIGHT } from '../../constants/zoo';
import { colors } from '../../theme/tokens';

interface ZooMapSvgProps {
  highlightedSectionId?: string | null;
  selectedPlaceId?: string | null;
  routeTargetId?: string | null;
  places?: MapPlace[];
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildMarker(place: MapPlace, selected: boolean, showHalo: boolean): string {
  const cx = (place.mapX * SVG_WIDTH).toFixed(1);
  const cy = (place.mapY * SVG_HEIGHT).toFixed(1);
  const r = selected ? 11 : 9;
  const strokeW = selected ? 3 : 2;
  const color = place.kind === 'service' || place.isVisitorService ? colors.base : colors.enclosure;
  const fill = selected ? color : colors.surface;
  const inner = selected ? colors.surface : color;
  const id = esc(place.id);
  const halo = showHalo
    ? `<circle cx="${cx}" cy="${cy}" r="16" fill="${colors.info}" fill-opacity="0.22" stroke="${colors.info}" stroke-width="2"/>`
    : '';
  return `<g id="pin-${id}" data-kind="${esc(place.kind)}">
  ${halo}
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${color}" stroke-width="${strokeW}"/>
  <circle cx="${cx}" cy="${cy}" r="${selected ? 3.2 : 2.6}" fill="${inner}"/>
</g>`;
}

function injectMarkers(
  svg: string,
  places: MapPlace[],
  selectedPlaceId?: string | null,
  routeTargetId?: string | null,
): string {
  if (!places.length) return svg;
  const markers = places
    .filter((p) => typeof p.mapX === 'number' && typeof p.mapY === 'number')
    .map((p) => buildMarker(p, p.id === selectedPlaceId, p.id === selectedPlaceId && p.id !== routeTargetId))
    .join('\n');
  if (!markers) return svg;
  const layer = `\n<g id="dynamic-markers">\n${markers}\n</g>\n`;
  return svg.replace(/<\/svg>\s*$/, `${layer}</svg>`);
}

function ZooMapSvgComponent({ highlightedSectionId, selectedPlaceId, routeTargetId, places = [] }: ZooMapSvgProps) {
  const xml = useMemo(
    () => injectMarkers(ZOO_MAP_CANONICAL_SVG, places, selectedPlaceId, routeTargetId),
    [places, selectedPlaceId, routeTargetId],
  );

  return (
    <View pointerEvents="none" style={{ width: '100%', height: '100%' }}>
      <SvgXml
        xml={xml}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        testID="zoo-map-svg"
        accessible
        accessibilityRole="image"
        accessibilityLabel="Mapa canónico del zoológico con recintos, lugares y caminos"
      />
      {highlightedSectionId ? (
        <View testID={`map-zone-highlight-${highlightedSectionId}`} style={{ position: 'absolute', width: 0, height: 0 }} />
      ) : null}
    </View>
  );
}

export const ZooMapSvg = React.memo(ZooMapSvgComponent);

