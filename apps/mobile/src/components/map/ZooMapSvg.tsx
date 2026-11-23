import React, { useMemo } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { ZOO_MAP_CANONICAL_SVG } from '../../data/zooMapCanonicalSvg';
import { MapPlace } from '../../models';
import { SVG_WIDTH, SVG_HEIGHT } from '../../constants/zoo';
import { colors } from '../../theme/tokens';

interface ZooMapSvgProps {
  highlightedSectionId?: string | null;
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

function pinColor(kind: MapPlace['kind']): string {
  if (kind === 'zoo_place') return colors.base;
  return colors.enclosure;
}

function buildMarker(place: MapPlace, selected: boolean): string {
  const cx = (place.mapX * SVG_WIDTH).toFixed(1);
  const cy = (place.mapY * SVG_HEIGHT).toFixed(1);
  const r = selected ? 11 : 9;
  const strokeW = selected ? 3 : 2;
  const color = pinColor(place.kind);
  const fill = selected ? color : colors.surface;
  const inner = selected ? colors.surface : color;
  const labelY = (place.mapY * SVG_HEIGHT + (selected ? 18 : 16)).toFixed(1);
  const name = esc(place.name.length > 18 ? place.name.slice(0, 17) + 'â€¦' : place.name);
  const id = esc(place.sectionId || place.id);
  return `<g id="pin-${id}" data-kind="${esc(place.kind)}">
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${color}" stroke-width="${strokeW}"/>
  <circle cx="${cx}" cy="${cy}" r="${selected ? 3.2 : 2.6}" fill="${inner}"/>
  <text x="${cx}" y="${labelY}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${selected ? 8 : 7}" font-weight="700" fill="${colors.text}" paint-order="stroke" stroke="${colors.background}" stroke-width="2">${name}</text>
</g>`;
}

function injectMarkers(svg: string, places: MapPlace[], highlightedSectionId?: string | null): string {
  if (!places.length) return svg;
  const markers = places
    .filter((p) => typeof p.mapX === 'number' && typeof p.mapY === 'number')
    .map((p) => buildMarker(p, !!highlightedSectionId && (p.sectionId === highlightedSectionId || p.id === highlightedSectionId)))
    .join('\n');
  if (!markers) return svg;
  const layer = `\n<g id="dynamic-markers">\n${markers}\n</g>\n`;
  return svg.replace(/<\/svg>\s*$/, `${layer}</svg>`);
}

function ZooMapSvgComponent({ highlightedSectionId, places = [] }: ZooMapSvgProps) {
  const xml = useMemo(
    () => injectMarkers(ZOO_MAP_CANONICAL_SVG, places, highlightedSectionId),
    [places, highlightedSectionId],
  );

  return (
    <View style={{ width: '100%', height: '100%' }}>
      <SvgXml
        xml={xml}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        testID="zoo-map-svg"
        accessible
        accessibilityRole="image"
        accessibilityLabel="Mapa canÃ³nico del zoolÃ³gico con recintos, lugares y caminos"
      />
      {highlightedSectionId ? (
        <View testID={`map-zone-highlight-${highlightedSectionId}`} style={{ position: 'absolute', width: 0, height: 0 }} />
      ) : null}
    </View>
  );
}

export const ZooMapSvg = React.memo(ZooMapSvgComponent);

