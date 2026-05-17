const BUILDING_RARITY_PALETTES = {
  common: {
    skyTop: "#eef6e4",
    skyBottom: "#fff6df",
    glow: "rgba(128, 175, 101, 0.28)",
    soil: "#af815d",
    grass: "#89ba67",
    grassShade: "#5d8e4c",
    roof: "#4e7258",
    wall: "#f7f0dd",
    trim: "#c39b6b",
    glass: "#b6d5dc",
    accent: "#d2b06f",
    shadow: "rgba(62, 74, 52, 0.18)",
  },
  rare: {
    skyTop: "#e3f0ff",
    skyBottom: "#f7f0de",
    glow: "rgba(70, 117, 194, 0.28)",
    soil: "#9f7d66",
    grass: "#78a78e",
    grassShade: "#4a7463",
    roof: "#3d587e",
    wall: "#f4ede7",
    trim: "#caa677",
    glass: "#9fc7eb",
    accent: "#5f8ede",
    shadow: "rgba(37, 56, 88, 0.22)",
  },
  epic: {
    skyTop: "#1f3356",
    skyBottom: "#7a4d6c",
    glow: "rgba(249, 208, 111, 0.3)",
    soil: "#7e5061",
    grass: "#597e83",
    grassShade: "#334f5a",
    roof: "#f3d37b",
    wall: "#f6f0ea",
    trim: "#ffd88a",
    glass: "#9fd1eb",
    accent: "#f1b848",
    shadow: "rgba(16, 14, 26, 0.32)",
  },
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function artToken(seed) {
  return String(seed || "art")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}

function getBuildingPalette(rarity) {
  return BUILDING_RARITY_PALETTES[rarity] || BUILDING_RARITY_PALETTES.common;
}

function renderBuildingIllustration(building, seed, variant = "card", customIcon) {
  if (!building) {
    return "";
  }

  // Resolve file-extension icon refs from the shared client-side cache
  let resolvedIcon = customIcon;
  if (customIcon && typeof customIcon === "string" && !customIcon.startsWith("data:") && window._iconCache) {
    resolvedIcon = window._iconCache[building.id] || null;
  }

  if (resolvedIcon) {
    return `<img class="art-img" src="${escapeHtml(resolvedIcon)}" alt="${escapeHtml(building.name)}" />`;
  }

  const palette = getBuildingPalette(building.rarity);
  const token = artToken(`${seed}-${building.id}-${variant}`);
  const cloudOpacity = building.rarity === "epic" ? 0.12 : 0.24;

  return `
    <svg class="art-svg art-svg-${variant}" viewBox="0 0 180 140" aria-hidden="true" role="img">
      <defs>
        <linearGradient id="${token}-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${palette.skyTop}" />
          <stop offset="100%" stop-color="${palette.skyBottom}" />
        </linearGradient>
        <linearGradient id="${token}-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${palette.grass}" />
          <stop offset="100%" stop-color="${palette.grassShade}" />
        </linearGradient>
        <linearGradient id="${token}-soil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${palette.soil}" />
          <stop offset="100%" stop-color="#7b5943" />
        </linearGradient>
        <linearGradient id="${token}-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
          <stop offset="100%" stop-color="${palette.glass}" />
        </linearGradient>
        <filter id="${token}-shadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="${palette.shadow}" />
        </filter>
      </defs>
      <rect x="0" y="0" width="180" height="140" rx="28" fill="url(#${token}-sky)" />
      <ellipse cx="135" cy="26" rx="34" ry="18" fill="${palette.glow}" />
      <g opacity="${cloudOpacity}">
        <ellipse cx="42" cy="28" rx="18" ry="8" fill="#ffffff" />
        <ellipse cx="57" cy="26" rx="14" ry="6" fill="#ffffff" />
        <ellipse cx="122" cy="38" rx="20" ry="9" fill="#ffffff" />
      </g>
      <path d="M0 91 C26 79 58 77 90 81 C126 86 151 82 180 73 V140 H0 Z" fill="url(#${token}-ground)" />
      <path d="M0 111 C44 101 103 102 180 88 V140 H0 Z" fill="url(#${token}-soil)" opacity="0.95" />
      <ellipse cx="90" cy="96" rx="62" ry="15" fill="rgba(255,255,255,0.22)" />
      ${renderBuildingShape(building.id, token, palette)}
      <rect x="1.5" y="1.5" width="177" height="137" rx="26.5" fill="none" stroke="rgba(255,255,255,0.45)" />
    </svg>
  `;
}

function renderBuildingShape(buildingId, token, palette) {
  switch (buildingId) {
    case "teaching_building":
      return `
        <g filter="url(#${token}-shadow)">
          <path d="M42 78 L90 52 L138 78 L132 84 L48 84 Z" fill="${palette.roof}" />
          <rect x="50" y="78" width="80" height="31" rx="8" fill="${palette.wall}" />
          <rect x="74" y="66" width="32" height="13" rx="4" fill="${palette.trim}" />
          <rect x="82" y="88" width="16" height="21" rx="5" fill="${palette.trim}" />
          <g fill="url(#${token}-glass)">
            <rect x="58" y="88" width="11" height="10" rx="2" />
            <rect x="111" y="88" width="11" height="10" rx="2" />
            <rect x="58" y="101" width="11" height="8" rx="2" />
            <rect x="111" y="101" width="11" height="8" rx="2" />
          </g>
          <g fill="rgba(195,155,107,0.82)">
            <rect x="72" y="80" width="4" height="21" rx="2" />
            <rect x="78" y="80" width="4" height="21" rx="2" />
            <rect x="98" y="80" width="4" height="21" rx="2" />
            <rect x="104" y="80" width="4" height="21" rx="2" />
          </g>
          <ellipse cx="60" cy="108" rx="8" ry="5" fill="#5f8e4e" />
          <ellipse cx="120" cy="108" rx="8" ry="5" fill="#5f8e4e" />
        </g>
      `;
    case "college_building":
      return `
        <g filter="url(#${token}-shadow)">
          <rect x="38" y="63" width="40" height="46" rx="9" fill="${palette.wall}" />
          <rect x="102" y="57" width="42" height="52" rx="9" fill="${palette.wall}" />
          <rect x="74" y="74" width="34" height="20" rx="6" fill="${palette.accent}" opacity="0.88" />
          <g fill="url(#${token}-glass)">
            <rect x="44" y="71" width="10" height="10" rx="2" />
            <rect x="58" y="71" width="10" height="10" rx="2" />
            <rect x="44" y="85" width="10" height="10" rx="2" />
            <rect x="58" y="85" width="10" height="10" rx="2" />
            <rect x="108" y="66" width="10" height="10" rx="2" />
            <rect x="122" y="66" width="10" height="10" rx="2" />
            <rect x="108" y="81" width="10" height="10" rx="2" />
            <rect x="122" y="81" width="10" height="10" rx="2" />
            <rect x="108" y="96" width="10" height="10" rx="2" />
            <rect x="122" y="96" width="10" height="10" rx="2" />
          </g>
          <path d="M34 63 H82 L74 56 H44 Z" fill="${palette.roof}" />
          <path d="M98 57 H148 L141 49 H104 Z" fill="${palette.roof}" />
          <rect x="85" y="94" width="12" height="15" rx="3" fill="${palette.trim}" />
          <ellipse cx="30" cy="102" rx="7" ry="12" fill="#6d9a57" />
          <ellipse cx="150" cy="102" rx="7" ry="12" fill="#6d9a57" />
        </g>
      `;
    case "office_building":
      return `
        <g filter="url(#${token}-shadow)">
          <path d="M46 68 H136 L130 58 H54 Z" fill="${palette.roof}" />
          <rect x="48" y="68" width="86" height="41" rx="10" fill="${palette.wall}" />
          <rect x="72" y="83" width="38" height="14" rx="7" fill="${palette.trim}" opacity="0.85" />
          <g fill="url(#${token}-glass)">
            <rect x="58" y="77" width="12" height="8" rx="2" />
            <rect x="74" y="77" width="12" height="8" rx="2" />
            <rect x="90" y="77" width="12" height="8" rx="2" />
            <rect x="106" y="77" width="12" height="8" rx="2" />
            <rect x="58" y="91" width="12" height="8" rx="2" />
            <rect x="106" y="91" width="12" height="8" rx="2" />
          </g>
          <rect x="84" y="90" width="14" height="19" rx="4" fill="${palette.accent}" />
          <path d="M66 109 H117 L112 115 H71 Z" fill="rgba(255,255,255,0.45)" />
          <ellipse cx="44" cy="108" rx="8" ry="5" fill="#729f5a" />
          <ellipse cx="140" cy="108" rx="8" ry="5" fill="#729f5a" />
        </g>
      `;
    case "school_gate":
      return `
        <g filter="url(#${token}-shadow)">
          <path d="M43 109 H137 L131 116 H49 Z" fill="rgba(255,255,255,0.35)" />
          <rect x="49" y="60" width="18" height="46" rx="6" fill="${palette.wall}" />
          <rect x="113" y="60" width="18" height="46" rx="6" fill="${palette.wall}" />
          <rect x="67" y="72" width="46" height="12" rx="4" fill="${palette.roof}" />
          <path d="M67 106 V83 C67 71 75 64 90 64 C105 64 113 71 113 83 V106 Z" fill="${palette.wall}" />
          <path d="M76 106 V86 C76 79 81 75 90 75 C99 75 104 79 104 86 V106 Z" fill="url(#${token}-glass)" />
          <path d="M59 58 L90 45 L121 58 L114 64 H66 Z" fill="${palette.trim}" />
          <circle cx="58" cy="56" r="4" fill="${palette.accent}" />
          <circle cx="122" cy="56" r="4" fill="${palette.accent}" />
        </g>
      `;
    case "leijun_building":
      return `
        <g filter="url(#${token}-shadow)">
          <path d="M89 42 L100 52 L96 52 L101 109 H79 L84 52 H80 Z" fill="${palette.roof}" opacity="0.9" />
          <path d="M70 110 L77 56 H103 L111 110 Z" fill="${palette.wall}" opacity="0.94" />
          <path d="M78 58 H102 L97 26 H83 Z" fill="url(#${token}-glass)" />
          <path d="M72 84 H109" stroke="${palette.trim}" stroke-width="3" stroke-linecap="round" />
          <path d="M74 98 H107" stroke="${palette.trim}" stroke-width="3" stroke-linecap="round" />
          <path d="M89 21 L93 30 L103 31 L95 37 L98 47 L89 41 L80 47 L83 37 L75 31 L85 30 Z" fill="${palette.accent}" />
          <ellipse cx="90" cy="111" rx="25" ry="8" fill="rgba(255,255,255,0.34)" />
        </g>
      `;
    default:
      return `
        <g filter="url(#${token}-shadow)">
          <rect x="60" y="64" width="60" height="42" rx="10" fill="${palette.wall}" />
          <path d="M55 64 H125 L116 54 H64 Z" fill="${palette.roof}" />
          <rect x="84" y="82" width="12" height="24" rx="3" fill="${palette.trim}" />
        </g>
      `;
  }
}

function renderCampusTileIllustration(cell, seed, customIcon) {
  // Resolve file-extension icon refs from the shared client-side cache
  let resolvedIcon = customIcon;
  if (customIcon && typeof customIcon === "string" && !customIcon.startsWith("data:") && window._iconCache) {
    resolvedIcon = window._iconCache[cell.building.id] || null;
  }
  if (!cell.unlocked) {
    return renderLockedMountainIllustration(seed);
  }
  if (cell.building) {
    return renderBuildingIllustration(cell.building, seed, "tile", resolvedIcon);
  }
  return renderOpenLandIllustration(seed);
}

// Seeded pseudo-random for deterministic art variation
function _mtSeed(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h) + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}
function _mtRand(state) {
  state.s = (state.s * 1103515245 + 12345) & 0x7fffffff;
  return state.s / 0x7fffffff;
}

function renderOpenLandIllustration(seed) {
  const token = artToken(`${seed}-open`);
  return `
    <svg class="art-svg art-svg-tile" viewBox="0 0 180 140" aria-hidden="true" role="img">
      <defs>
        <linearGradient id="${token}-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#eef7e8" />
          <stop offset="100%" stop-color="#fff8e3" />
        </linearGradient>
        <linearGradient id="${token}-hill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#8ec676" />
          <stop offset="100%" stop-color="#4e8d54" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="180" height="140" rx="28" fill="url(#${token}-sky)" />
      <ellipse cx="126" cy="24" rx="28" ry="12" fill="rgba(255, 214, 137, 0.36)" />
      <path d="M0 95 C34 71 66 70 95 80 C124 90 150 85 180 68 V140 H0 Z" fill="url(#${token}-hill)" />
      <path d="M0 108 C46 96 99 97 180 88 V140 H0 Z" fill="#8a6549" opacity="0.75" />
      <path d="M69 113 C76 102 82 95 90 90 C100 95 106 102 112 114" fill="none" stroke="#ede4cb" stroke-width="8" stroke-linecap="round" />
      <path d="M49 95 L57 78 L65 95 Z" fill="#5f8e4e" />
      <path d="M122 100 L132 78 L142 100 Z" fill="#5f8e4e" />
      <rect x="52" y="95" width="4" height="10" rx="2" fill="#745842" />
      <rect x="129" y="100" width="4" height="10" rx="2" fill="#745842" />
      <rect x="1.5" y="1.5" width="177" height="137" rx="26.5" fill="none" stroke="rgba(255,255,255,0.46)" />
    </svg>
  `;
}

/**
 * Render a 3D topographic mountain for locked cells.
 *
 * Design: isometric-style layered peak with illuminated left face,
 * shadowed right face, elevation contours, rock outcrops, and
 * tree clusters — creating a "topographic wilderness" feel.
 */
function renderLockedMountainIllustration(seed) {
  const token = artToken(`${seed}-locked`);

  // Seeded randomness for per-cell variation
  const rng = { s: _mtSeed(seed + "-mtn") };
  const peakHeight = 18 + _mtRand(rng) * 24;       // 18–42px peak Y offset
  const peakShift = (_mtRand(rng) - 0.5) * 18;      // -9..+9 horizontal offset
  const ridgeDepth = 0.3 + _mtRand(rng) * 0.4;      // ridge steepness
  const snowLine = 0.3 + _mtRand(rng) * 0.2;         // snow cap threshold
  const hasSnow = _mtRand(rng) > 0.45;
  const treeCount = 2 + Math.floor(_mtRand(rng) * 4); // 2–5 trees

  const cx = 90 + peakShift;
  const cy = 24 + peakHeight;                       // peak apex
  const bL = [10 + _mtRand(rng) * 14, 112];          // base-left
  const bR = [170 - _mtRand(rng) * 14, 112];         // base-right
  const bC = [90, 118];                               // base-center

  const midL = [(cx + bL[0] * 2) / 3, ((cy + bL[1]) / 3) * 2 - 6];
  const midR = [(cx + bR[0] * 2) / 3, ((cy + bR[1]) / 3) * 2 - 6];

  // Left face (illuminated)
  const leftFace = `M${cx},${cy} Q${(cx+bL[0])/2},${cy+10} ${bL[0]},${bL[1]} Q${(bL[0]+bC[0])/2},${bC[1]-8} ${bC[0]},${bC[1]} Q${(bC[0]+midL[0])/2},${bC[1]-10} ${midL[0]},${midL[1]} Q${(midL[0]+cx)/2},${cy+6} ${cx},${cy}Z`;

  // Right face (shadowed)
  const rightFace = `M${cx},${cy} Q${(cx+bR[0])/2},${cy+10} ${bR[0]},${bR[1]} Q${(bR[0]+bC[0])/2},${bC[1]-8} ${bC[0]},${bC[1]} Q${(bC[0]+midR[0])/2},${bC[1]-10} ${midR[0]},${midR[1]} Q${(midR[0]+cx)/2},${cy+6} ${cx},${cy}Z`;

  // Snow cap
  const snowH = cy + (bL[1] - cy) * snowLine;
  const snowW = (cx - bL[0]) * (1 - snowLine) * 0.8;
  const snowCap = hasSnow
    ? `<path d="M${cx},${cy} Q${cx},${snowH} ${cx-snowW},${snowH+6} Q${cx-snowW*0.4},${snowH-4} ${cx},${snowH+2} Q${cx+snowW*0.4},${snowH-4} ${cx+snowW},${snowH+6} Q${cx},${snowH} ${cx},${cy}Z" fill="#eaf3e6" opacity="0.85" />`
    : '';

  // Contour lines
  const contourSteps = 3;
  let contours = '';
  for (let i = 1; i <= contourSteps; i++) {
    const t = i / (contourSteps + 1);
    const cy2 = cy + (bL[1] - cy) * t;
    const lx = cx - (cx - bL[0]) * t * 0.85;
    const rx = cx + (bR[0] - cx) * t * 0.85;
    const wobble = 2 + _mtRand(rng) * 3;
    contours += `<path d="M${lx},${cy2} Q${cx},${cy2 - wobble} ${rx},${cy2}" fill="none" stroke="rgba(60,90,50,0.20)" stroke-width="1.5" />`;
  }

  // Trees at base — 3 cones clustered
  let trees = '';
  const treePositions = [];
  for (let i = 0; i < treeCount; i++) {
    const side = _mtRand(rng) > 0.5 ? 'left' : 'right';
    const baseX = side === 'left'
      ? bL[0] + _mtRand(rng) * (bC[0] - bL[0]) * 0.6
      : bC[0] + _mtRand(rng) * (bR[0] - bC[0]) * 0.6;
    const baseY = bL[1] - 4 + _mtRand(rng) * 6;
    const size = 6 + _mtRand(rng) * 8;
    treePositions.push({ x: baseX, y: baseY, size });
  }
  for (const t of treePositions) {
    trees += `<path d="M${t.x},${t.y + t.size * 0.1} L${t.x - t.size * 0.4},${t.y + t.size * 0.1} L${t.x},${t.y - t.size * 0.6} L${t.x + t.size * 0.4},${t.y + t.size * 0.1} Z" fill="#3a6430" />`;
    // Tree highlight
    trees += `<path d="M${t.x},${t.y + t.size * 0.1} L${t.x - t.size * 0.15},${t.y + t.size * 0.1} L${t.x},${t.y - t.size * 0.5} Z" fill="#5a9040" opacity="0.7" />`;
  }

  // Rock outcrops
  const rocks = [];
  for (let i = 0; i < 2; i++) {
    const side = _mtRand(rng) > 0.5 ? 'left' : 'right';
    const rx = side === 'left'
      ? bL[0] + _mtRand(rng) * (cx - bL[0]) * 0.7
      : cx + _mtRand(rng) * (bR[0] - cx) * 0.7;
    const ry = bL[1] - 10 - _mtRand(rng) * 20;
    const rw = 4 + _mtRand(rng) * 6;
    const rh = 3 + _mtRand(rng) * 4;
    rocks.push({ x: rx, y: ry, w: rw, h: rh });
  }
  let rockEls = '';
  for (const r of rocks) {
    rockEls += `<path d="M${r.x},${r.y} L${r.x + r.w},${r.y - r.h * 0.3} L${r.x + r.w * 1.3},${r.y + r.h * 0.4} L${r.x + r.w * 0.3},${r.y + r.h} Z" fill="#7a6a5a" opacity="0.6" />`;
  }

  // Atmospheric fog overlay at the base
  const fogGradId = `${token}-fog`;
  const fog = `<rect x="0" y="${bL[1] - 16}" width="180" height="${140 - bL[1] + 16}" fill="url(#${fogGradId})" />`;

  return `
    <svg class="art-svg art-svg-tile mountain-3d" viewBox="0 0 180 140" aria-hidden="true" role="img">
      <defs>
        <linearGradient id="${token}-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#c8dfcd" />
          <stop offset="100%" stop-color="#8fb57c" />
        </linearGradient>
        <linearGradient id="${token}-peak-left" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#a8cc8a" />
          <stop offset="100%" stop-color="#7baa60" />
        </linearGradient>
        <linearGradient id="${token}-peak-right" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#689552" />
          <stop offset="100%" stop-color="#3a6630" />
        </linearGradient>
        <linearGradient id="${token}-base-left" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#8aba6e" />
          <stop offset="100%" stop-color="#5d914b" />
        </linearGradient>
        <linearGradient id="${token}-base-right" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#558344" />
          <stop offset="100%" stop-color="#2f5428" />
        </linearGradient>
        <linearGradient id="${fogGradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#8fb57c" stop-opacity="0" />
          <stop offset="100%" stop-color="#6d9460" stop-opacity="0.55" />
        </linearGradient>
        <filter id="${token}-drop-shadow" x="-10%" y="-10%" width="120%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="rgba(40,60,30,0.28)" />
        </filter>
      </defs>

      <rect x="0" y="0" width="180" height="140" rx="28" fill="url(#${token}-sky)" />

      <!-- Atmosphere glow -->
      <ellipse cx="${cx}" cy="${cy}" rx="44" ry="22" fill="rgba(235,248,220,0.24)" />

      <!-- Ground shadow cast by mountain -->
      <ellipse cx="${bC[0]}" cy="${bC[1]}" rx="62" ry="10" fill="rgba(30,50,25,0.18)" filter="blur(3px)" />

      <!-- Mountain body -->
      <g filter="url(#${token}-drop-shadow)">
        <!-- Illuminated left face (upper slope) -->
        <path d="${leftFace}" fill="url(#${token}-peak-left)" />
        <!-- Shadowed right face (upper slope) -->
        <path d="${rightFace}" fill="url(#${token}-peak-right)" />

        <!-- Base left face (lower slope, warmer green) -->
        <path d="M${midL[0]},${midL[1]} Q${(midL[0]+bL[0])/2},${midL[1]+12} ${bL[0]},${bL[1]} Q${(bL[0]+bC[0])/2},${bC[1]-8} ${bC[0]},${bC[1]} Q${bC[0]},${bC[1]-8} ${midL[0]},${midL[1]}Z" fill="url(#${token}-base-left)" />
        <!-- Base right face -->
        <path d="M${midR[0]},${midR[1]} Q${(midR[0]+bR[0])/2},${midR[1]+12} ${bR[0]},${bR[1]} Q${(bR[0]+bC[0])/2},${bC[1]-8} ${bC[0]},${bC[1]} Q${bC[0]},${bC[1]-8} ${midR[0]},${midR[1]}Z" fill="url(#${token}-base-right)" />
      </g>

      ${snowCap}
      ${contours}

      <!-- Rocks -->
      ${rockEls}

      <!-- Trees -->
      ${trees}

      <!-- Atmospheric fog -->
      ${fog}

      <rect x="1.5" y="1.5" width="177" height="137" rx="26.5" fill="none" stroke="rgba(255,255,255,0.32)" />
    </svg>
  `;
}
