/**
 * Red de andadores peatonales del Zoológico Municipal Nicolás Bravo (V3).
 *
 * Modela las intersecciones y pasillos del plano SVG (viewBox 1000 × 1400)
 * como un grafo ponderado no dirigido para el cálculo de rutas peatonales (CA-18, RN-19).
 * Cuando se incorpore la cartografía definitiva de dron, basta con actualizar
 * esta tabla de nodos y aristas sin modificar el motor de pathfinding ni las vistas.
 */

export interface PathNode {
  id: string;
  svgX: number;
  svgY: number;
}

export interface PathEdge {
  from: string;
  to: string;
}

/** Velocidad promedio de caminata familiar en m/s (~4 km/h) (RN-18). */
export const WALKING_SPEED_MPS = 1.1;

/** Factor de conversión de unidades del viewBox SVG (1000 × 1400) a metros reales aproximados. */
export const SVG_UNIT_TO_METERS = 0.42;

export const ZOO_PATH_NODES: PathNode[] = [
  // Acceso principal y corredor sur
  { id: 'entrance-main', svgX: 500, svgY: 1260 },
  { id: 'entrance-north', svgX: 500, svgY: 1180 },
  { id: 'corridor-south-mid', svgX: 500, svgY: 1020 },

  // Glorieta / Plaza Central
  { id: 'plaza-south', svgX: 500, svgY: 860 },
  { id: 'plaza-sw', svgX: 420, svgY: 820 },
  { id: 'plaza-west', svgX: 380, svgY: 760 },
  { id: 'plaza-nw', svgX: 420, svgY: 700 },
  { id: 'plaza-north', svgX: 500, svgY: 660 },
  { id: 'plaza-ne', svgX: 580, svgY: 700 },
  { id: 'plaza-east', svgX: 620, svgY: 760 },
  { id: 'plaza-se', svgX: 580, svgY: 820 },
  { id: 'plaza-center', svgX: 500, svgY: 760 },

  // Ramal Felinos (Noroeste)
  { id: 'felines-gate', svgX: 300, svgY: 470 },
  { id: 'felines-simba', svgX: 310, svgY: 504 },
  { id: 'felines-juan', svgX: 230, svgY: 350 },

  // Ramal Aves (Noreste)
  { id: 'birds-gate', svgX: 700, svgY: 470 },
  { id: 'birds-aviary', svgX: 770, svgY: 350 },

  // Ramal Acuario (Oeste)
  { id: 'aquatic-gate', svgX: 340, svgY: 760 },
  { id: 'aquatic-penguin', svgX: 230, svgY: 770 },

  // Ramal Reptiles (Este)
  { id: 'reptiles-gate', svgX: 660, svgY: 760 },
  { id: 'reptiles-herpetario', svgX: 770, svgY: 770 },

  // Ramal Herbívoros (Suroeste)
  { id: 'herbivores-gate', svgX: 300, svgY: 920 },
  { id: 'herbivores-elephant', svgX: 230, svgY: 1064 },
  { id: 'herbivores-monkey', svgX: 310, svgY: 1162 },

  // Ramal Servicios (Sureste)
  { id: 'services-gate', svgX: 700, svgY: 920 },
  { id: 'services-restrooms', svgX: 770, svgY: 1064 },
  { id: 'services-food', svgX: 700, svgY: 1162 },
];

export const ZOO_PATH_EDGES: PathEdge[] = [
  // Pasillo de entrada a Plaza
  { from: 'entrance-main', to: 'entrance-north' },
  { from: 'entrance-north', to: 'corridor-south-mid' },
  { from: 'corridor-south-mid', to: 'plaza-south' },

  // Anillo perimetral y centro de Plaza
  { from: 'plaza-south', to: 'plaza-sw' },
  { from: 'plaza-sw', to: 'plaza-west' },
  { from: 'plaza-west', to: 'plaza-nw' },
  { from: 'plaza-nw', to: 'plaza-north' },
  { from: 'plaza-north', to: 'plaza-ne' },
  { from: 'plaza-ne', to: 'plaza-east' },
  { from: 'plaza-east', to: 'plaza-se' },
  { from: 'plaza-se', to: 'plaza-south' },
  { from: 'plaza-south', to: 'plaza-center' },
  { from: 'plaza-west', to: 'plaza-center' },
  { from: 'plaza-east', to: 'plaza-center' },
  { from: 'plaza-nw', to: 'plaza-center' },
  { from: 'plaza-ne', to: 'plaza-center' },

  // Conexión a Felinos
  { from: 'plaza-nw', to: 'felines-simba' },
  { from: 'felines-simba', to: 'felines-gate' },
  { from: 'plaza-nw', to: 'felines-gate' },
  { from: 'felines-gate', to: 'felines-juan' },

  // Conexión a Aves
  { from: 'plaza-ne', to: 'birds-gate' },
  { from: 'birds-gate', to: 'birds-aviary' },

  // Conexión a Acuario
  { from: 'plaza-west', to: 'aquatic-gate' },
  { from: 'aquatic-gate', to: 'aquatic-penguin' },

  // Conexión a Reptiles
  { from: 'plaza-east', to: 'reptiles-gate' },
  { from: 'reptiles-gate', to: 'reptiles-herpetario' },

  // Conexión a Herbívoros
  { from: 'plaza-sw', to: 'herbivores-gate' },
  { from: 'herbivores-gate', to: 'herbivores-elephant' },
  { from: 'herbivores-elephant', to: 'herbivores-monkey' },
  { from: 'herbivores-gate', to: 'herbivores-monkey' },

  // Conexión a Servicios
  { from: 'plaza-se', to: 'services-gate' },
  { from: 'services-gate', to: 'services-restrooms' },
  { from: 'services-restrooms', to: 'services-food' },
  { from: 'services-gate', to: 'services-food' },
];
