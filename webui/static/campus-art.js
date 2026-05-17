const BUILDING_RARITY_PALETTES = {
  // 红砖学院风 — 青灰坡顶 + 红褐砖墙 + 暖色基座
  common: {
    skyTop: "#eaf3e8",
    skyBottom: "#f7f0e0",
    glow: "rgba(180, 140, 100, 0.18)",
    soil: "#8a7a68",
    grass: "#7fa87a",
    grassShade: "#4a7a50",
    roof: "#4a5a4a",
    wall: "#8b4a3a",
    trim: "#d4b896",
    glass: "#b8c8d8",
    accent: "#c4a060",
    shadow: "rgba(50, 48, 40, 0.22)",
  },
  // 石材学院风 — 暖色石材 + 白色线脚 + 深沉屋顶
  rare: {
    skyTop: "#e8eef0",
    skyBottom: "#f2ede4",
    glow: "rgba(160, 170, 150, 0.20)",
    soil: "#8a7a68",
    grass: "#6a9a70",
    grassShade: "#3a6a44",
    roof: "#3a4a3a",
    wall: "#c4a882",
    trim: "#e8d8c0",
    glass: "#a0b8c8",
    accent: "#b09868",
    shadow: "rgba(60, 55, 48, 0.24)",
  },
  // 地标殿堂级 — 琉璃碧瓦 + 朱红墙 + 金饰
  epic: {
    skyTop: "#d8e0e4",
    skyBottom: "#ece4d8",
    glow: "rgba(200, 175, 100, 0.22)",
    soil: "#7a6a58",
    grass: "#4a7a4a",
    grassShade: "#2a5a34",
    roof: "#2a3a2a",
    wall: "#a04030",
    trim: "#d4b860",
    glass: "#90b0c8",
    accent: "#d4a040",
    shadow: "rgba(40, 35, 28, 0.30)",
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
    // ── 教学楼 ──
    // 中西合璧三段式对称立面：青灰坡顶 + 红砖墙 + 拱券门窗 + 石基座
    case "teaching_building":
      return `
        <g filter="url(#${token}-shadow)">
          <!-- 基座台阶 -->
          <path d="M44 112 H136 V118 H44 Z" fill="#9a8a78" />
          <path d="M48 108 H132 V112 H48 Z" fill="#b8a898" />
          <!-- 墙体 -->
          <rect x="48" y="72" width="84" height="36" rx="3" fill="${palette.wall}" />
          <!-- 墙体横向线脚装饰 -->
          <rect x="48" y="86" width="84" height="2" fill="rgba(180,160,130,0.5)" />
          <rect x="48" y="96" width="84" height="2" fill="rgba(180,160,130,0.5)" />
          <!-- 中央拱门入口 -->
          <path d="M76 108 V93 C76 86 84 82 90 82 C96 82 104 86 104 93 V108 Z" fill="#3a2a1a" />
          <path d="M80 108 V95 C80 90 84 87 90 87 C96 87 100 90 100 95 V108 Z" fill="url(#${token}-glass)" />
          <!-- 左右拱窗 -->
          <path d="M56 108 V86 C56 80 62 76 67 76 C72 76 78 80 78 86 V108 Z" fill="#3a2a1a" />
          <path d="M58 108 V88 C58 83 62 80 67 80 C72 80 76 83 76 88 V108 Z" fill="url(#${token}-glass)" />
          <path d="M102 108 V86 C102 80 108 76 113 76 C118 76 124 80 124 86 V108 Z" fill="#3a2a1a" />
          <path d="M104 108 V88 C104 83 108 80 113 80 C118 80 122 83 122 88 V108 Z" fill="url(#${token}-glass)" />
          <!-- 屋檐线脚 -->
          <rect x="46" y="69" width="88" height="4" rx="2" fill="${palette.trim}" />
          <!-- 青灰色坡屋顶 -->
          <path d="M36 69 L90 44 L144 69 L138 72 H42 Z" fill="#4a5a4a" />
          <path d="M42 69 L90 47 L138 69 L132 72 H48 Z" fill="#5a6a5a" />
          <!-- 屋脊装饰 -->
          <path d="M86 44 H94 V42 H86 Z" fill="#3a4a3a" />
          <!-- 屋顶两侧装饰挑檐 -->
          <path d="M36 69 L33 67 L38 64 L42 69 Z" fill="#4a5a4a" />
          <path d="M144 69 L147 67 L142 64 L138 69 Z" fill="#4a5a4a" />
          <!-- 柱子（壁柱装饰） -->
          <rect x="50" y="72" width="4" height="36" fill="rgba(180,160,130,0.6)" />
          <rect x="126" y="72" width="4" height="36" fill="rgba(180,160,130,0.6)" />
          <rect x="72" y="72" width="3" height="36" fill="rgba(180,160,130,0.4)" />
          <rect x="105" y="72" width="3" height="36" fill="rgba(180,160,130,0.4)" />
        </g>
      `;
    // ── 学院楼 ──
    // 带塔楼元素、拱廊柱廊、庄重对称
    case "college_building":
      return `
        <g filter="url(#${token}-shadow)">
          <!-- 基座 -->
          <path d="M34 112 H146 V118 H34 Z" fill="#8a7a68" />
          <path d="M38 108 H142 V112 H38 Z" fill="#b0a090" />
          <!-- 左翼墙 -->
          <rect x="38" y="66" width="40" height="42" rx="3" fill="${palette.wall}" />
          <!-- 右翼墙 -->
          <rect x="102" y="60" width="42" height="48" rx="3" fill="${palette.wall}" />
          <!-- 中央塔楼 -->
          <rect x="72" y="52" width="38" height="56" rx="2" fill="${palette.wall}" />
          <!-- 左翼屋顶 -->
          <path d="M34 66 L58 48 L82 66 L78 69 H38 Z" fill="#4a5a4a" />
          <path d="M38 66 L58 50 L78 66 L74 69 H42 Z" fill="#5a6a5a" />
          <!-- 右翼屋顶 -->
          <path d="M98 60 L123 42 L148 60 L144 63 H102 Z" fill="#4a5a4a" />
          <path d="M102 60 L123 44 L144 60 L140 63 H106 Z" fill="#5a6a5a" />
          <!-- 中央塔楼屋顶（更高） -->
          <path d="M68 52 L91 30 L114 52 L110 55 H72 Z" fill="#3a4a3a" />
          <path d="M72 52 L91 33 L110 52 L106 55 H76 Z" fill="#4a5a4a" />
          <!-- 塔楼装饰尖顶 -->
          <path d="M89 30 H93 V24 H89 Z" fill="#2a3a2a" />
          <circle cx="91" cy="22" r="3" fill="#d4a850" />
          <!-- 墙体线脚 -->
          <rect x="38" y="82" width="40" height="2" fill="rgba(180,160,130,0.5)" />
          <rect x="102" y="78" width="42" height="2" fill="rgba(180,160,130,0.5)" />
          <rect x="72" y="70" width="38" height="2" fill="rgba(180,160,130,0.5)" />
          <rect x="72" y="84" width="38" height="2" fill="rgba(180,160,130,0.5)" />
          <!-- 拱形窗 - 左翼 -->
          <path d="M46 108 V86 C46 82 50 79 54 79 C58 79 62 82 62 86 V108 Z" fill="#3a2a1a" />
          <path d="M48 108 V88 C48 84 51 82 54 82 C57 82 60 84 60 88 V108 Z" fill="url(#${token}-glass)" />
          <!-- 拱形窗 - 右翼 -->
          <path d="M108 108 V84 C108 79 113 76 118 76 C123 76 128 79 128 84 V108 Z" fill="#3a2a1a" />
          <path d="M110 108 V86 C110 82 114 80 118 80 C122 80 126 82 126 86 V108 Z" fill="url(#${token}-glass)" />
          <!-- 塔楼拱窗 -->
          <path d="M84 74 V60 C84 56 87 53 91 53 C95 53 98 56 98 60 V74 H84 Z" fill="#3a2a1a" />
          <path d="M86 74 V62 C86 59 88 57 91 57 C94 57 96 59 96 62 V74 Z" fill="url(#${token}-glass)" />
          <!-- 中央入口 -->
          <rect x="84" y="96" width="14" height="12" rx="3" fill="${palette.trim}" />
          <rect x="88" y="100" width="6" height="8" rx="2" fill="#3a2a1a" />
          <!-- 壁柱装饰 -->
          <rect x="40" y="66" width="3" height="42" fill="rgba(180,160,130,0.5)" />
          <rect x="73" y="66" width="3" height="42" fill="rgba(180,160,130,0.5)" />
          <rect x="106" y="66" width="3" height="42" fill="rgba(180,160,130,0.5)" />
        </g>
      `;
    // ── 行政楼/办公楼 ──
    // 新古典主义三角楣 + 柱廊 + 暖色石材
    case "office_building":
      return `
        <g filter="url(#${token}-shadow)">
          <!-- 基座 -->
          <path d="M40 112 H140 V118 H40 Z" fill="#8a7a68" />
          <path d="M44 108 H136 V112 H44 Z" fill="#b0a090" />
          <!-- 主墙体（暖色石材） -->
          <rect x="44" y="68" width="92" height="40" rx="3" fill="${palette.wall}" />
          <!-- 墙体线脚 -->
          <rect x="44" y="80" width="92" height="2" fill="rgba(200,185,165,0.5)" />
          <rect x="44" y="90" width="92" height="2" fill="rgba(200,185,165,0.5)" />
          <rect x="44" y="100" width="92" height="2" fill="rgba(200,185,165,0.5)" />
          <!-- 三角楣/山花 -->
          <path d="M40 68 L90 46 L140 68 Z" fill="${palette.roof}" />
          <path d="M44 68 L90 49 L136 68 Z" fill="#5a6a5a" />
          <!-- 三角楣内装饰 -->
          <circle cx="90" cy="58" r="4" fill="rgba(220,200,175,0.6)" />
          <!-- 柱廊（6根壁柱） -->
          <rect x="46" y="68" width="3" height="40" fill="rgba(200,185,165,0.6)" rx="1" />
          <rect x="60" y="68" width="3" height="40" fill="rgba(200,185,165,0.6)" rx="1" />
          <rect x="78" y="68" width="3" height="40" fill="rgba(200,185,165,0.6)" rx="1" />
          <rect x="99" y="68" width="3" height="40" fill="rgba(200,185,165,0.6)" rx="1" />
          <rect x="117" y="68" width="3" height="40" fill="rgba(200,185,165,0.6)" rx="1" />
          <rect x="131" y="68" width="3" height="40" fill="rgba(200,185,165,0.6)" rx="1" />
          <!-- 拱窗 -->
          <path d="M52 108 V86 C52 81 56 78 61 78 C66 78 70 81 70 86 V108 Z" fill="#3a2a1a" />
          <path d="M54 108 V88 C54 84 57 82 61 82 C65 82 68 84 68 88 V108 Z" fill="url(#${token}-glass)" />
          <path d="M82 108 V86 C82 81 86 78 90 78 C94 78 98 81 98 86 V108 Z" fill="#3a2a1a" />
          <path d="M84 108 V88 C84 84 87 82 90 82 C93 82 96 84 96 88 V108 Z" fill="url(#${token}-glass)" />
          <path d="M110 108 V86 C110 81 114 78 119 78 C124 78 128 81 128 86 V108 Z" fill="#3a2a1a" />
          <path d="M112 108 V88 C112 84 115 82 119 82 C123 82 126 84 126 88 V108 Z" fill="url(#${token}-glass)" />
          <!-- 中央入口 -->
          <rect x="77" y="94" width="26" height="14" rx="4" fill="${palette.trim}" />
          <rect x="82" y="98" width="16" height="10" rx="3" fill="#3a2a1a" />
        </g>
      `;
    // ── 校门 ──
    // 武大经典牌坊风格：石柱 + 拱券 + 青瓦顶 + 樱花
    case "school_gate":
      return `
        <g filter="url(#${token}-shadow)">
          <!-- 基座 -->
          <path d="M30 112 H150 V118 H30 Z" fill="#8a7a68" />
          <!-- 路面 -->
          <rect x="68" y="112" width="44" height="6" fill="#b8a890" />
          <!-- 左立柱 -->
          <rect x="42" y="64" width="16" height="48" rx="3" fill="${palette.wall}" />
          <!-- 右立柱 -->
          <rect x="122" y="64" width="16" height="48" rx="3" fill="${palette.wall}" />
          <!-- 柱基座装饰 -->
          <rect x="38" y="102" width="24" height="10" rx="2" fill="${palette.trim}" />
          <rect x="118" y="102" width="24" height="10" rx="2" fill="${palette.trim}" />
          <!-- 柱顶装饰 -->
          <rect x="40" y="60" width="20" height="6" rx="2" fill="${palette.trim}" />
          <rect x="120" y="60" width="20" height="6" rx="2" fill="${palette.trim}" />
          <!-- 拱形门券 -->
          <path d="M58 100 V74 C58 60 68 50 90 50 C112 50 122 60 122 74 V100 Z" fill="rgba(60,50,40,0.6)" />
          <path d="M62 100 V76 C62 64 70 56 90 56 C110 56 118 64 118 76 V100 Z" fill="url(#${token}-glass)" opacity="0.5" />
          <!-- 拱券装饰线 -->
          <path d="M58 100 V74 C58 60 68 50 90 50 C112 50 122 60 122 74 V100" fill="none" stroke="${palette.trim}" stroke-width="2" />
          <!-- 横额 -->
          <rect x="58" y="70" width="64" height="8" rx="2" fill="${palette.trim}" opacity="0.8" />
          <!-- 屋顶 -->
          <path d="M34 56 L90 36 L146 56 L140 60 H40 Z" fill="#4a5a4a" />
          <path d="M38 56 L90 39 L142 56 L136 60 H44 Z" fill="#5a6a5a" />
          <!-- 屋脊装饰 -->
          <path d="M86 36 H94 V32 H86 Z" fill="#3a4a3a" />
          <!-- 屋顶挑檐 -->
          <path d="M34 56 L30 54 L36 50 L42 56 Z" fill="#4a5a4a" />
          <path d="M146 56 L150 54 L144 50 L138 56 Z" fill="#4a5a4a" />
          <!-- 石狮子/石鼓（简化） -->
          <ellipse cx="42" cy="110" rx="5" ry="4" fill="#b8a898" />
          <ellipse cx="138" cy="110" rx="5" ry="4" fill="#b8a898" />
          <!-- 左侧樱花 -->
          <g transform="translate(20, 72)">
            <path d="M0 36 L4 20 L8 12 L12 20 L16 36 Z" fill="#c48a8a" opacity="0.8" />
            <path d="M4 20 Q2 16 6 14 Q10 16 8 12" fill="#e8b0b0" opacity="0.9" />
            <path d="M8 12 Q6 8 10 6 Q14 8 12 12" fill="#e8c0c0" opacity="0.7" />
            <circle cx="12" cy="10" r="3" fill="#f0d0d0" opacity="0.8" />
            <circle cx="7" cy="14" r="2" fill="#f0d0d0" opacity="0.8" />
          </g>
          <!-- 右侧樱花 -->
          <g transform="translate(144, 68)">
            <path d="M0 40 L4 24 L8 16 L12 24 L16 40 Z" fill="#c48a8a" opacity="0.8" />
            <path d="M4 24 Q2 20 6 18 Q10 20 8 16" fill="#e8b0b0" opacity="0.9" />
            <path d="M8 16 Q6 12 10 10 Q14 12 12 16" fill="#e8c0c0" opacity="0.7" />
            <circle cx="12" cy="14" r="3" fill="#f0d0d0" opacity="0.8" />
            <circle cx="7" cy="18" r="2" fill="#f0d0d0" opacity="0.8" />
          </g>
        </g>
      `;
    // ── 雷军楼（地标建筑）──
    // 武大老图书馆风格：钟塔 + 歇山顶 + 多层次退台 + 琉璃瓦
    case "leijun_building":
      return `
        <g filter="url(#${token}-shadow)">
          <!-- 基座台阶 -->
          <path d="M30 114 H150 V120 H30 Z" fill="#9a8a78" />
          <path d="M34 110 H146 V114 H34 Z" fill="#b8a898" />
          <!-- 主楼体 -->
          <rect x="52" y="62" width="76" height="48" rx="3" fill="${palette.wall}" />
          <!-- 主楼屋顶（歇山顶） -->
          <path d="M42 62 L90 36 L138 62 L132 66 H48 Z" fill="#3a4a3a" />
          <path d="M48 62 L90 39 L132 62 L126 66 H54 Z" fill="#4a5a4a" />
          <!-- 屋顶装饰脊 -->
          <path d="M86 36 H94 V32 H86 Z" fill="#2a3a2a" />
          <!-- 主楼墙体装饰线脚 -->
          <rect x="52" y="74" width="76" height="2" fill="rgba(180,160,130,0.5)" />
          <rect x="52" y="86" width="76" height="2" fill="rgba(180,160,130,0.5)" />
          <rect x="52" y="96" width="76" height="2" fill="rgba(180,160,130,0.5)" />
          <!-- 中央塔楼（钟塔） -->
          <rect x="72" y="34" width="36" height="28" rx="2" fill="${palette.wall}" />
          <!-- 塔楼屋顶（攒尖顶风格） -->
          <path d="M68 34 L90 14 L112 34 L108 37 H72 Z" fill="#2a3a2a" />
          <path d="M72 34 L90 17 L108 34 L104 37 H76 Z" fill="#3a4a3a" />
          <!-- 塔顶尖顶 -->
          <path d="M88 14 H92 V6 H88 Z" fill="#1a2a1a" />
          <circle cx="90" cy="4" r="4" fill="#d4a850" />
          <!-- 钟塔拱窗 -->
          <path d="M84 38 V32 C84 29 87 27 90 27 C93 27 96 29 96 32 V38 H84 Z" fill="#3a2a1a" />
          <path d="M86 38 V33 C86 31 88 30 90 30 C92 30 94 31 94 33 V38 Z" fill="url(#${token}-glass)" />
          <!-- 塔楼线脚 -->
          <rect x="72" y="44" width="36" height="2" fill="rgba(180,160,130,0.5)" />
          <!-- 塔楼两侧小尖塔装饰 -->
          <path d="M66 34 L70 26 L74 34 Z" fill="#3a4a3a" />
          <path d="M106 34 L110 26 L114 34 Z" fill="#3a4a3a" />
          <!-- 主楼拱形窗排 -->
          <path d="M60 108 V84 C60 80 64 78 68 78 C72 78 76 80 76 84 V108 Z" fill="#3a2a1a" />
          <path d="M62 108 V86 C62 83 65 81 68 81 C71 81 74 83 74 86 V108 Z" fill="url(#${token}-glass)" />
          <path d="M84 108 V84 C84 80 88 78 90 78 C92 78 96 80 96 84 V108 Z" fill="#3a2a1a" />
          <path d="M86 108 V86 C86 83 88 81 90 81 C92 81 94 83 94 86 V108 Z" fill="url(#${token}-glass)" />
          <path d="M104 108 V84 C104 80 108 78 112 78 C116 78 120 80 120 84 V108 Z" fill="#3a2a1a" />
          <path d="M106 108 V86 C106 83 109 81 112 81 C115 81 118 83 118 86 V108 Z" fill="url(#${token}-glass)" />
          <!-- 中央入口大门 -->
          <path d="M78 108 V96 C78 92 84 90 90 90 C96 90 102 92 102 96 V108 Z" fill="#3a2a1a" />
          <path d="M82 108 V98 C82 95 86 94 90 94 C94 94 98 95 98 98 V108 Z" fill="url(#${token}-glass)" />
          <!-- 壁柱装饰 -->
          <rect x="54" y="62" width="3" height="48" fill="rgba(180,160,130,0.5)" />
          <rect x="123" y="62" width="3" height="48" fill="rgba(180,160,130,0.5)" />
          <!-- 栏杆/露台 -->
          <rect x="56" y="60" width="68" height="3" rx="1" fill="rgba(200,185,165,0.6)" />
          <rect x="56" y="60" width="2" height="6" fill="rgba(200,185,165,0.6)" />
          <rect x="122" y="60" width="2" height="6" fill="rgba(200,185,165,0.6)" />
        </g>
      `;
    default:
      return `
        <g filter="url(#${token}-shadow)">
          <!-- 默认通用建筑 -->
          <path d="M46 112 H134 V118 H46 Z" fill="#9a8a78" />
          <rect x="50" y="70" width="80" height="42" rx="3" fill="${palette.wall}" />
          <rect x="50" y="82" width="80" height="2" fill="rgba(180,160,130,0.5)" />
          <rect x="50" y="94" width="80" height="2" fill="rgba(180,160,130,0.5)" />
          <path d="M44 70 L90 48 L136 70 L130 73 H50 Z" fill="#4a5a4a" />
          <path d="M50 70 L90 51 L130 70 L124 73 H56 Z" fill="#5a6a5a" />
          <rect x="80" y="94" width="20" height="18" rx="4" fill="${palette.trim}" />
          <rect x="84" y="98" width="12" height="14" rx="2" fill="#3a2a1a" />
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
  const rng = { s: _mtSeed(seed + "-open") };
  const hasTree = _mtRand(rng) > 0.35;
  const treeSide = _mtRand(rng) > 0.5 ? 'left' : 'right';
  const lampSide = treeSide === 'left' ? 'right' : 'left';

  const tree = hasTree ? (treeSide === 'left' ? `
    <!-- 樱花树 -->
    <g transform="translate(28, 58)">
      <path d="M6 52 L6 20 Q6 14 10 12 Q14 14 14 20 L14 52" fill="none" stroke="#5a4a3a" stroke-width="3" />
      <circle cx="10" cy="10" r="14" fill="#e8b8b8" opacity="0.85" />
      <circle cx="6" cy="8" r="10" fill="#f0c8c8" opacity="0.7" />
      <circle cx="14" cy="6" r="10" fill="#f0c8c8" opacity="0.7" />
      <circle cx="10" cy="4" r="8" fill="#f5d8d8" opacity="0.6" />
      <circle cx="10" cy="10" r="3" fill="#e0a0a0" opacity="0.5" />
    </g>
  ` : `
    <g transform="translate(142, 54)">
      <path d="M6 56 L6 24 Q6 18 10 16 Q14 18 14 24 L14 56" fill="none" stroke="#5a4a3a" stroke-width="3" />
      <circle cx="10" cy="14" r="14" fill="#e8b8b8" opacity="0.85" />
      <circle cx="6" cy="12" r="10" fill="#f0c8c8" opacity="0.7" />
      <circle cx="14" cy="10" r="10" fill="#f0c8c8" opacity="0.7" />
      <circle cx="10" cy="8" r="8" fill="#f5d8d8" opacity="0.6" />
      <circle cx="10" cy="14" r="3" fill="#e0a0a0" opacity="0.5" />
    </g>
  `) : '';

  const lamp = lampSide === 'left' ? `
    <!-- 校园旧式路灯 -->
    <g transform="translate(28, 70)">
      <rect x="4" y="26" width="2" height="34" fill="#4a4a4a" />
      <path d="M0 24 L10 24 L8 26 L2 26 Z" fill="#4a4a4a" />
      <ellipse cx="5" cy="24" rx="6" ry="3" fill="#e8d8a0" opacity="0.7" />
      <ellipse cx="5" cy="22" rx="4" ry="4" fill="#f0e8b8" opacity="0.35" />
    </g>
  ` : `
    <g transform="translate(144, 72)">
      <rect x="4" y="26" width="2" height="34" fill="#4a4a4a" />
      <path d="M0 24 L10 24 L8 26 L2 26 Z" fill="#4a4a4a" />
      <ellipse cx="5" cy="24" rx="6" ry="3" fill="#e8d8a0" opacity="0.7" />
      <ellipse cx="5" cy="22" rx="4" ry="4" fill="#f0e8b8" opacity="0.35" />
    </g>
  `;

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
      ${tree}
      ${lamp}
      <!-- 石板小径 -->
      <ellipse cx="90" cy="118" rx="12" ry="4" fill="rgba(180,165,145,0.5)" />
      <ellipse cx="90" cy="112" rx="8" ry="3" fill="rgba(180,165,145,0.5)" />
      <!-- 零星花瓣 -->
      <circle cx="40" cy="124" r="1.5" fill="#f0c8c8" opacity="0.6" />
      <circle cx="110" cy="128" r="1.5" fill="#f0c8c8" opacity="0.5" />
      <circle cx="150" cy="120" r="1" fill="#f0c8c8" opacity="0.4" />
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
