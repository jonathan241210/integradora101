import React from 'react';
import Svg, { Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { colors } from '../../theme/tokens';

interface ZooMapSvgProps {
  highlightedSectionId?: string | null;
}

interface RectZone {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  fillOpacity: number;
  labelX: number;
  labelY: number;
  labelSize?: number;
}

const rectZones: RectZone[] = [
  { id: 'zone-felines', label: 'FELINOS', x: 70, y: 140, width: 330, height: 330, fill: colors.accent, fillOpacity: 0.55, labelX: 235, labelY: 320 },
  { id: 'zone-birds', label: 'AVES', x: 600, y: 140, width: 330, height: 330, fill: colors.border, fillOpacity: 0.9, labelX: 765, labelY: 320 },
  { id: 'zone-aquatic', label: 'ACUARIO', x: 70, y: 540, width: 330, height: 300, fill: colors.primarySoft, fillOpacity: 1, labelX: 235, labelY: 800 },
  { id: 'zone-reptiles', label: 'REPTILES', x: 600, y: 540, width: 330, height: 300, fill: colors.accent, fillOpacity: 0.4, labelX: 765, labelY: 700 },
  { id: 'zone-herbivores', label: 'HERBÍVOROS', x: 70, y: 920, width: 330, height: 280, fill: colors.border, fillOpacity: 0.75, labelX: 235, labelY: 1080 },
  { id: 'zone-services', label: 'SERVICIOS', x: 600, y: 920, width: 330, height: 280, fill: colors.background, fillOpacity: 1, labelX: 765, labelY: 1080 },
  { id: 'zone-entrance', label: 'ACCESO', x: 350, y: 1180, width: 300, height: 160, fill: colors.accent, fillOpacity: 0.7, labelX: 500, labelY: 1270, labelSize: 26 },
];

export function ZooMapSvg({ highlightedSectionId }: ZooMapSvgProps) {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 1000 1400"
      preserveAspectRatio="xMidYMid meet"
      testID="zoo-map-svg"
      accessible
      accessibilityRole="image"
      accessibilityLabel="Mapa esquemático del zoológico con secciones Acceso, Plaza, Felinos, Aves, Acuario, Reptiles, Herbívoros y Servicios"
    >
      <G id="background">
        <Rect width="1000" height="1400" fill={colors.background} />
        <Rect x="24" y="24" width="952" height="1352" rx="48" fill="none" stroke={colors.border} strokeWidth="4" />
      </G>

      <G id="water">
        <Path
          id="water-pond"
          d="M 120 600 C 190 570 270 590 300 630 C 320 670 260 710 180 700 C 120 690 90 640 120 600 Z"
          fill={colors.primarySoft}
          stroke={colors.secondary}
          strokeWidth="3"
        />
      </G>

      <G id="paths">
        <G id="paths-underlay" fill="none" stroke={colors.border} strokeWidth="42" strokeLinecap="round" strokeLinejoin="round">
          <Path id="path-entrance" d="M 500 1180 L 500 860" />
          <Path id="path-felines" d="M 420 700 L 300 470" />
          <Path id="path-birds" d="M 580 700 L 700 470" />
          <Path id="path-aquatic" d="M 380 760 L 400 760" />
          <Path id="path-reptiles" d="M 620 760 L 600 760" />
          <Path id="path-herbivores" d="M 420 820 L 300 920" />
          <Path id="path-services" d="M 580 820 L 700 920" />
        </G>
        <G id="paths-surface" fill="none" stroke={colors.surface} strokeWidth="32" strokeLinecap="round" strokeLinejoin="round">
          <Path id="path-entrance-surface" d="M 500 1180 L 500 860" />
          <Path id="path-felines-surface" d="M 420 700 L 300 470" />
          <Path id="path-birds-surface" d="M 580 700 L 700 470" />
          <Path id="path-aquatic-surface" d="M 380 760 L 400 760" />
          <Path id="path-reptiles-surface" d="M 620 760 L 600 760" />
          <Path id="path-herbivores-surface" d="M 420 820 L 300 920" />
          <Path id="path-services-surface" d="M 580 820 L 700 920" />
        </G>
      </G>

      <G id="zones">
        {rectZones.map((zone) => {
          const highlighted = highlightedSectionId === zone.id;
          return (
            <G key={zone.id}>
              <Rect
                id={zone.id}
                x={zone.x}
                y={zone.y}
                width={zone.width}
                height={zone.height}
                rx="44"
                fill={zone.fill}
                fillOpacity={zone.fillOpacity}
                stroke={highlighted ? colors.primary : colors.secondary}
                strokeWidth={highlighted ? 8 : 4}
              />
              {highlighted && (
                <Rect
                  testID={`map-zone-highlight-${zone.id}`}
                  x={zone.x}
                  y={zone.y}
                  width={zone.width}
                  height={zone.height}
                  rx="44"
                  fill="none"
                  stroke={colors.primary}
                  strokeWidth="8"
                  strokeDasharray="14 10"
                />
              )}
            </G>
          );
        })}
        <G>
          <Ellipse
            id="zone-plaza"
            cx="500"
            cy="760"
            rx="120"
            ry="100"
            fill={colors.accent}
            fillOpacity={0.8}
            stroke={highlightedSectionId === 'zone-plaza' ? colors.primary : colors.secondary}
            strokeWidth={highlightedSectionId === 'zone-plaza' ? 8 : 4}
          />
          {highlightedSectionId === 'zone-plaza' && (
            <Ellipse
              testID="map-zone-highlight-zone-plaza"
              cx="500"
              cy="760"
              rx="120"
              ry="100"
              fill="none"
              stroke={colors.primary}
              strokeWidth="8"
              strokeDasharray="14 10"
            />
          )}
        </G>
      </G>

      <G id="labels" fill={colors.text} textAnchor="middle" fontWeight="700">
        {rectZones.map((zone) => (
          <SvgText key={`label-${zone.id}`} x={zone.labelX} y={zone.labelY} fontSize={zone.labelSize ?? 28} letterSpacing="1.5">
            {zone.label}
          </SvgText>
        ))}
        <SvgText x="500" y="770" fontSize="24" letterSpacing="1">PLAZA</SvgText>
      </G>
    </Svg>
  );
}
