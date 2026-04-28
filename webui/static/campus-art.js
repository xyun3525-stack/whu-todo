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

function artToken(seed) {
  return String(seed || "art")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}

function getBuildingPalette(rarity) {
  return BUILDING_RARITY_PALETTES[rarity] || BUILDING_RARITY_PALETTES.common;
}

function renderBuildingIllustration(building, seed, variant = "card") {
  if (!building) {
    return "";
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

function renderCampusTileIllustration(cell, seed) {
  if (!cell.unlocked) {
    return renderLockedMountainIllustration(seed);
  }
  if (cell.building) {
    return renderBuildingIllustration(cell.building, seed, "tile");
  }
  return renderOpenLandIllustration(seed);
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

function renderLockedMountainIllustration(seed) {
  const token = artToken(`${seed}-locked`);
  return `
    <svg class="art-svg art-svg-tile" viewBox="0 0 180 140" aria-hidden="true" role="img">
      <defs>
        <linearGradient id="${token}-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#d6ebdd" />
          <stop offset="100%" stop-color="#8fb57c" />
        </linearGradient>
        <linearGradient id="${token}-ridge-a" x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stop-color="#9bb577" />
          <stop offset="100%" stop-color="#5e7845" />
        </linearGradient>
        <linearGradient id="${token}-ridge-b" x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stop-color="#789562" />
          <stop offset="100%" stop-color="#415738" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="180" height="140" rx="28" fill="url(#${token}-sky)" />
      <ellipse cx="133" cy="28" rx="26" ry="14" fill="rgba(245, 241, 219, 0.5)" />
      <path d="M0 94 L40 58 L64 80 L95 40 L129 78 L155 56 L180 87 V140 H0 Z" fill="url(#${token}-ridge-a)" />
      <path d="M0 106 L32 76 L56 97 L89 58 L120 94 L148 76 L180 100 V140 H0 Z" fill="url(#${token}-ridge-b)" />
      <g fill="#3e5335">
        <path d="M26 116 L33 94 L40 116 Z" />
        <path d="M42 122 L50 98 L58 122 Z" />
        <path d="M118 118 L126 92 L134 118 Z" />
        <path d="M140 122 L148 99 L156 122 Z" />
      </g>
      <rect x="1.5" y="1.5" width="177" height="137" rx="26.5" fill="none" stroke="rgba(255,255,255,0.34)" />
    </svg>
  `;
}
