// WHU Neoclassical Color Palette — hand-painted game asset feel, low saturation
export const COLORS = {
  // Roof — grey-green Chinese glazed tiles (琉璃瓦)
  roof: {
    dark: "#3a4a3a",
    mid: "#4a5a4a",
    light: "#5a6a5a",
    ridge: "#2a3a2a",
    edge: "#6a7a5a",
  },
  // Walls — red brick and warm stone
  wall: {
    brick: "#8b4a3a",
    brickLight: "#9a5a4a",
    brickDark: "#6a3a2a",
    stone: "#c4a882",
    stoneLight: "#d4b896",
    stoneDark: "#a08868",
    trim: "#e8d8c0",
  },
  // Base — stone foundation
  base: {
    top: "#b8a898",
    mid: "#a09078",
    bottom: "#8a7a68",
    step: "#9a8a78",
  },
  // Wood — doors, window frames
  wood: {
    dark: "#3a2a1a",
    mid: "#5a4a3a",
    light: "#7a6a5a",
  },
  // Glass — arched window glazing
  glass: {
    light: "#b8c8d8",
    mid: "#90b0c8",
    dark: "#6090a8",
  },
  // Accents — gold details, finials
  accent: {
    gold: "#d4a850",
    goldLight: "#e8c870",
    copper: "#b08840",
  },
  // Landscape
  terrain: {
    grass: "#7fa87a",
    grassDark: "#5a8a54",
    path: "#b8a890",
    pathDark: "#988878",
    dirt: "#8a7a68",
  },
  // Trees
  tree: {
    trunk: "#5a4a3a",
    cherryBlossom: "#e8b8b8",
    cherryLight: "#f0c8c8",
    cherryDark: "#d0a0a0",
    planeLeaf: "#7aac6a",
    planeLight: "#90c080",
  },
  // Sky
  sky: "#eaf3e8",
  lamp: {
    pole: "#4a4a4a",
    glow: "#e8d8a0",
  },
  shadow: "rgba(40,35,28,0.25)",
};

// Geometry constants — all sizes in world units
// Isometric grid: 1 unit = ~1 meter in game scale
export const GEOMETRY = {
  // Building main body
  building: {
    width: 6,
    depth: 4,
    wallHeight: 3,
  },
  // Stone base
  base: {
    height: 0.5,
    overhang: 0.3, // how much base extends beyond walls
    steps: 3,      // number of front steps
    stepHeight: 0.2,
    stepWidth: 0.4,
  },
  // Roof
  roof: {
    baseHeight: 0.3,  // flat base of roof structure
    tier1Height: 0.6,  // lowest tier
    tier2Height: 0.5,  // middle tier
    tier3Height: 0.4,  // top tier
    overhang: 0.6,     // how much roof extends beyond walls
    eaveThickness: 0.1,
  },
  // Tower / bell tower
  tower: {
    width: 2.2,
    depth: 2.2,
    height: 2.5,    // above main roof
    roofHeight: 1.2,
    windowHeight: 0.6,
    windowWidth: 0.4,
  },
  // Arched window
  archWindow: {
    width: 0.6,
    height: 1.0,
    archHeight: 0.3,  // arch top height above straight sides
    depth: 0.08,       // frame depth
    sillHeight: 0.05,
  },
  // Pillars / columns
  pillar: {
    radius: 0.2,
    height: 2.8,
    capitalHeight: 0.15,
    baseHeight: 0.1,
  },
  // Balcony
  balcony: {
    width: 2.0,
    depth: 0.6,
    height: 0.08,    // floor thickness
    railingHeight: 0.5,
    railingSpacing: 0.25,
  },
  // Stairs
  stairs: {
    width: 2.4,
    stepDepth: 0.35,
    stepHeight: 0.18,
    count: 5,
  },
  // Trees
  tree: {
    trunkHeight: 1.2,
    trunkRadius: 0.08,
    crownRadius: 1.5,
    crownLayers: 3,
  },
  // Lamp Post
  lampPost: {
    poleHeight: 2.0,
    poleRadius: 0.04,
    armLength: 0.3,
    lanternRadius: 0.12,
  },
};

// Isometric camera settings
export const CAMERA = {
  position: [8, 8, 8],

  // Isometric means OrthographicCamera (no perspective distortion).
  // Position at equal x/y/z creates the classic 2:1 isometric angle.
  // The look-at target is the center of the scene.
  zoom: 2.2,
  near: 0.1,
  far: 50,
};
