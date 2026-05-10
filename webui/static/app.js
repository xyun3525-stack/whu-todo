const uiState = {
  data: null,
  activeView: "today",
  taskView: "planned",
  editingTaskId: null,
  selectedBuildingId: null,
  pendingReward: null,
  heroQuoteIndex: 0,
  heroQuoteTimer: null,
};

// Client-side cache for icon data:URLs fetched from GET /api/icons/{id}
const _iconCache = {};

async function _ensureIcon(buildingId, iconRef) {
  if (!iconRef) return null;
  if (iconRef.startsWith("data:")) return iconRef;
  if (_iconCache[buildingId]) return _iconCache[buildingId];
  try {
    const data = await api(`/api/icons/${encodeURIComponent(buildingId)}`, "GET");
    _iconCache[buildingId] = data.__icon__;
    return _iconCache[buildingId];
  } catch { return null; }
}

let BUILDINGS = [];

async function initStaticBuildings() {
  try {
    const data = await api("/api/static-buildings", "GET");
    BUILDINGS = data.buildings || [];
  } catch {
    BUILDINGS = [];
  }
}

const HERO_QUOTES = [
  {
    line: "山路并不催人赶路，它只是安静地等你一步一步走完。",
    note: "许多进步都不轰烈，今天肯做一点，明天就会亮一点。",
  },
  {
    line: "把日子过成格子间里的微光，也能慢慢照见远处的山。",
    note: "人不必时时沸腾，稳定地向前，本身就是一种力量。",
  },
  {
    line: "风来时先整理衣襟，雨落时先照看脚下。",
    note: "生活教我们的，常常不是飞得多高，而是怎样稳稳落地。",
  },
  {
    line: "有些答案不在远方，就藏在认真做完今天这件小事里。",
    note: "当你愿意把当下过细，未来就不会总是空白。",
  },
  {
    line: "树影会移动，花会晚开，很多事都在自己的时辰里成熟。",
    note: "别急着和别人比较节奏，先把自己的步子走稳。",
  },
  {
    line: "愿你在琐碎里保有耐心，在重复里仍看见生活的新意。",
    note: "真正让人变强的，往往不是冲刺，而是长期温柔而坚定的坚持。",
  },
];

document.addEventListener("DOMContentLoaded", async () => {
  await initStaticBuildings();
  bindEvents();
  initHeroQuoteRotation();
  refreshState();
});

function bindEvents() {
  // Keyboard shortcuts: n=new task, /=focus search, Escape=cancel edit, Ctrl+Z=undo delete
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !e.target.matches("input, textarea")) {
      e.preventDefault();
      document.getElementById("task-search-input")?.focus();
      return;
    }
    if (e.key === "n" && !e.target.matches("input, textarea")) {
      e.preventDefault();
      document.getElementById("task-title")?.focus();
      return;
    }
    if (e.key === "Escape") {
      if (uiState.editingTaskId) { resetTaskForm(); return; }
      const modal = document.querySelector(".modal.active");
      if (modal) { modal.remove(); return; }
      document.getElementById("task-search-input")?.blur();
      return;
    }
    // Ctrl+Z: undo recent soft-delete
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.target.matches("input, textarea")) {
      const undoId = uiState._lastDeleteUndoId;
      const undoTs = uiState._lastDeleteUndoTs;
      if (undoId && Date.now() - undoTs < 5500) {
        (async () => {
          try {
            await api(`/api/tasks/${undoId}/undo`, "POST");
            uiState._lastDeleteUndoId = null;
            showToast("已恢复任务。");
          } catch { showToast("撤销已过期。"); }
        })();
      }
    }
  });

  document.querySelectorAll(".tab-link").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  document.querySelectorAll(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      uiState.taskView = button.dataset.taskView;
      renderTasks();
    });
  });

  document.getElementById("task-search-input").addEventListener("input", () => renderTasks());
  document.getElementById("task-priority-filter").addEventListener("change", () => renderTasks());

  document.getElementById("quick-add-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = document.getElementById("quick-task-title").value.trim();
    if (!title) {
      showToast("请输入任务标题。");
      return;
    }
    await mutate("/api/tasks", "POST", {
      title,
      scheduled_for_today: true,
    });
    document.getElementById("quick-task-title").value = "";
    showToast("已加入今日。");
  });

  document.getElementById("task-form").addEventListener("submit", submitTaskForm);
  document.getElementById("task-form-reset").addEventListener("click", resetTaskForm);

  document.getElementById("campus-name-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = document.getElementById("campus-name-input").value.trim();
    if (!name) {
      showToast("校园名称不能为空。");
      return;
    }
    await mutate("/api/campus/rename", "POST", { name });
    showToast("校园名称已更新。");
  });

  document.getElementById("reset-data-btn").addEventListener("click", async () => {
    const confirmed = window.confirm("确认重置全部本地数据吗？该操作不可撤销。");
    if (!confirmed) {
      return;
    }
    await mutate("/api/reset", "POST", {});
    uiState.editingTaskId = null;
    uiState.selectedBuildingId = null;
    resetTaskForm();
    showToast("本地数据已重置。");
  });

  document.getElementById("add-building-type-btn").addEventListener("click", () => {
    showBuildingForm(null);
  });

  document.getElementById("export-building-types-btn").addEventListener("click", handleExportBuildings);
  document.getElementById("import-building-types-btn").addEventListener("click", () => {
    document.getElementById("import-building-types-file").click();
  });
  document.getElementById("import-building-types-file").addEventListener("change", handleImportBuildings);
}

async function refreshState() {
  try {
    const response = await api("/api/state", "GET");
    hydrate(response);
  } catch (error) {
    showToast(error.message);
  }
}

async function submitTaskForm(event) {
  event.preventDefault();
  const wasEditing = Boolean(uiState.editingTaskId);

  const payload = {
    title: document.getElementById("task-title").value.trim(),
    priority: document.getElementById("task-priority").value,
    deadline: document.getElementById("task-deadline").value || null,
    estimated_minutes: Number(document.getElementById("task-minutes").value),
    repeat_rule: document.getElementById("task-repeat").value,
    scheduled_for_today: document.getElementById("task-today").checked,
  };

  if (!payload.title) {
    showToast("任务标题不能为空。");
    return;
  }

  const endpoint = uiState.editingTaskId
    ? `/api/tasks/${uiState.editingTaskId}`
    : "/api/tasks";
  const method = uiState.editingTaskId ? "PUT" : "POST";

  try {
    await mutate(endpoint, method, payload);
    resetTaskForm();
    showToast(wasEditing ? "任务已更新。" : "任务已创建。");
  } catch (error) {
    showToast(error.message);
  }
}

async function mutate(path, method, payload) {
  const response = await api(path, method, payload);
  hydrate(response.state);
  return response;
}

async function api(path, method, payload) {
  const options = { method, headers: {} };
  if (payload !== undefined && method !== "GET") {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(payload);
  }
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "请求失败。");
  }
  return data;
}

function hydrate(data) {
  uiState.data = data;
  renderAll();
}

function renderAll() {
  if (!uiState.data) {
    return;
  }
  renderHero();
  renderByView(uiState.activeView);
  renderGrowth();
}

function renderByView(view) {
  switch (view) {
    case "today":   renderToday(); break;
    case "tasks":  renderTasks(); break;
    case "campus": renderCampus(); break;
    case "settings": renderSettings(); break;
  }
}

function switchView(view, rerender = true) {
  uiState.activeView = view;
  document.querySelectorAll(".tab-link").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  document.querySelectorAll(".view").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === view);
  });
  if (rerender && uiState.data) {
    renderHero();
    renderByView(view);
    renderGrowth();
  }
}

function renderHero() {
  const stats = [
    { label: "校园", value: uiState.data.settings.campus_name },
    { label: "等级", value: `${uiState.data.growth.level} 级` },
    { label: "连续", value: `${uiState.data.growth.streak_days} 天` },
    { label: "繁荣度", value: uiState.data.today.summary.campus_progress },
  ];

  document.getElementById("hero-stats").innerHTML = stats
    .map(
      (item) => `
        <div class="hero-stat">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(String(item.value))}</strong>
        </div>
      `
    )
    .join("");
}

function initHeroQuoteRotation() {
  renderHeroQuote(uiState.heroQuoteIndex);
  if (uiState.heroQuoteTimer) {
    window.clearInterval(uiState.heroQuoteTimer);
  }
  uiState.heroQuoteTimer = window.setInterval(() => {
    const nextIndex = (uiState.heroQuoteIndex + 1) % HERO_QUOTES.length;
    transitionHeroQuote(nextIndex);
  }, 5200);
}

function transitionHeroQuote(nextIndex) {
  const card = document.getElementById("hero-quote");
  if (!card) {
    return;
  }
  card.classList.add("is-swapping");
  window.setTimeout(() => {
    renderHeroQuote(nextIndex);
    card.classList.remove("is-swapping");
  }, 220);
}

function renderHeroQuote(index) {
  const quote = HERO_QUOTES[index];
  const line = document.getElementById("hero-quote-line");
  const note = document.getElementById("hero-quote-note");
  const dots = document.getElementById("hero-quote-dots");
  if (!quote || !line || !note || !dots) {
    return;
  }

  uiState.heroQuoteIndex = index;
  line.textContent = quote.line;
  note.textContent = quote.note;
  dots.innerHTML = HERO_QUOTES.map(
    (_, itemIndex) =>
      `<span class="hero-quote-dot ${itemIndex === index ? "active" : ""}"></span>`
  ).join("");
}

function renderToday() {
  const summary = uiState.data.today.summary;
  document.getElementById("today-summary-title").textContent = `${summary.campus_name} 的今日推进`;
  document.getElementById(
    "today-summary-meta"
  ).textContent = `今日共 ${summary.today_count} 项，已完成 ${summary.completed_today} 项。`;

  document.getElementById("today-pills").innerHTML = [
    `连续 ${summary.streak_days} 天`,
    `本周 ${summary.weekly_completed}/${summary.weekly_target}`,
    `繁荣度 ${summary.campus_progress}`,
  ]
    .map((text) => `<span class="pill">${escapeHtml(text)}</span>`)
    .join("");

  renderTaskCollection("today-task-list", uiState.data.today.tasks, {
    allowEdit: false,
    showCompleted: false,
  });
}

function renderTasks() {
  document.querySelectorAll(".segment").forEach((button) => {
    button.classList.toggle("active", button.dataset.taskView === uiState.taskView);
  });

  const searchTerm = (document.getElementById("task-search-input")?.value || "").toLowerCase().trim();
  const priorityFilter = document.getElementById("task-priority-filter")?.value || "";

  let tasks = uiState.data.tasks[uiState.taskView] || [];
  if (searchTerm) {
    tasks = tasks.filter((t) => t.title.toLowerCase().includes(searchTerm));
  }
  if (priorityFilter) {
    tasks = tasks.filter((t) => t.priority === priorityFilter);
  }

  renderTaskCollection("task-list", tasks, {
    allowEdit: true,
    showCompleted: uiState.taskView === "completed",
  });
}

async function renderCampus() {
  const campus = uiState.data.campus;
  document.getElementById("campus-name-heading").textContent = campus.name;
  document.getElementById("campus-name-input").value = campus.name;
  document.getElementById("campus-stats").innerHTML = [
    `繁荣度：${campus.prosperity}`,
    `地块：${campus.unlocked_cells}/${campus.total_cells}`,
    `网格：${campus.grid_size} x ${campus.grid_size}`,
    `区域：${campus.regions.map(formatRegion).join(" / ")}`,
  ]
    .map((item) => `<div class="pill">${escapeHtml(item)}</div>`)
    .join("");

  const selectedBuilding = campus.inventory_stacks.find(
    (building) => building.id === uiState.selectedBuildingId
  );
  document.getElementById("selected-building-label").textContent = selectedBuilding
    ? `当前选择：${selectedBuilding.name}，点击空地即可放置`
    : "当前未选择建筑";

  const customIcons = uiState.data.settings.custom_icons || {};

  // Pre-fetch all icons needed for inventory and grid (parallel)
  const allNeeded = new Set(Object.keys(customIcons).filter((k) => customIcons[k] && !customIcons[k].startsWith("data:")));
  const fetchPromises = [...allNeeded].map((id) => _ensureIcon(id, customIcons[id]));
  await Promise.all(fetchPromises);

  const inventoryList = document.getElementById("inventory-list");
  if (!campus.inventory_stacks.length) {
    inventoryList.innerHTML = `<div class="empty-state">背包里还没有建筑掉落。</div>`;
  } else {
    inventoryList.innerHTML = campus.inventory_stacks
      .map(
        (building) => `
          <button
            class="inventory-item rarity-${escapeHtml(building.rarity)} ${building.id === uiState.selectedBuildingId ? "active" : ""}"
            type="button"
            data-building-id="${escapeHtml(building.id)}"
          >
            <div class="inventory-art">
              ${renderBuildingIllustration(building, `inventory-${building.id}`, "card", customIcons[building.id])}
            </div>
            <div class="inventory-meta">
              <div class="inventory-title-row">
                <strong>${escapeHtml(building.name)}</strong>
                <span class="rarity-chip rarity-${escapeHtml(building.rarity)}">${escapeHtml(formatRarity(building.rarity))}</span>
              </div>
              <small class="inventory-description">${escapeHtml(building.description || "校园建筑")}</small>
              <div class="meta-line">
                <span class="meta-chip">数量 ${building.count}</span>
                <span class="meta-chip">${escapeHtml(formatEffects(building.effects))}</span>
              </div>
            </div>
          </button>
        `
      )
      .join("");
  }

  inventoryList.querySelectorAll("[data-building-id]").forEach((button) => {
    button.addEventListener("click", () => {
      uiState.selectedBuildingId = button.dataset.buildingId;
      renderCampus();
    });
  });

  const grid = document.getElementById("campus-grid");
  grid.style.gridTemplateColumns = `repeat(${campus.grid_size}, minmax(0, 1fr))`;
  grid.innerHTML = campus.grid_cells
    .map((cell) => {
      const classes = [
        "campus-cell",
        cell.unlocked ? "unlocked" : "locked",
        cell.building ? "occupied" : "",
        cell.building ? `rarity-${cell.building.rarity}` : "",
        cell.unlocked && !cell.building && uiState.selectedBuildingId ? "can-place" : "",
      ]
        .filter(Boolean)
        .join(" ");

      const label = cell.building
        ? `${cell.building.name}`
        : cell.unlocked
          ? uiState.selectedBuildingId
            ? "点击放置"
            : "可建空地"
          : "山体";
      const status = cell.building
        ? formatRarity(cell.building.rarity)
        : cell.unlocked
          ? uiState.selectedBuildingId
            ? "可放置"
            : "可建设"
          : "未解锁";

      return `
        <button
          class="${classes}"
          type="button"
          data-x="${cell.x}"
          data-y="${cell.y}"
          data-unlocked="${cell.unlocked}"
          data-occupied="${Boolean(cell.building)}"
        >
          <div class="cell-art-wrap">
            ${renderCampusTileIllustration(cell, `cell-${cell.key}`, cell.building ? customIcons[cell.building.id] : undefined)}
          </div>
          <div class="cell-label-wrap">
            <span class="cell-status">${escapeHtml(status)}</span>
            <span class="cell-label">${escapeHtml(label)}</span>
          </div>
        </button>
      `;
    })
    .join("");

  grid.querySelectorAll("[data-x]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!uiState.selectedBuildingId) {
        showToast("先从背包里选择一个建筑。");
        return;
      }
      if (button.dataset.unlocked !== "true") {
        showToast("这里还是山体，先升级解锁后再建设。");
        return;
      }
      if (button.dataset.occupied === "true") {
        showToast("这个地块已经有建筑了。");
        return;
      }
      try {
        await mutate("/api/campus/place", "POST", {
          building_id: uiState.selectedBuildingId,
          x: Number(button.dataset.x),
          y: Number(button.dataset.y),
        });
        uiState.selectedBuildingId = null;
        renderCampus();
        showToast("建筑已放置。");
      } catch (error) {
        showToast(error.message);
      }
    });
  });
}

function renderGrowth() {
  const growth = uiState.data.growth;
  document.getElementById("growth-level").textContent = `${growth.level} 级`;
  document.getElementById("growth-xp").textContent = `经验 ${growth.xp}`;
  document.getElementById("growth-streak").textContent = `${growth.streak_days} 天`;
  document.getElementById(
    "growth-weekly"
  ).textContent = `本周 ${growth.weekly_completed}/${growth.weekly_target}`;
  document.getElementById("growth-catalog").textContent = `${growth.catalog_count}`;
  document.getElementById(
    "growth-inventory"
  ).textContent = `背包 ${growth.inventory_count}`;
  document.getElementById("growth-progress-fill").style.width = `${growth.xp_ratio * 100}%`;
}

function renderSettings() {
  const settings = uiState.data.settings;
  document.getElementById("settings-summary").innerHTML = [
    ["校园", settings.campus_name],
    ["等级", `${settings.level} 级`],
    ["经验", settings.xp],
    ["金币", settings.coins],
    ["背包", settings.inventory_count],
    ["图鉴", settings.catalog_count],
  ]
    .map(
      ([label, value]) => `
        <div class="setting-item">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(String(value))}</strong>
        </div>
      `
    )
    .join("");

  renderBuildingIconsManager();
  renderBuildingTypesManager();
}

async function renderBuildingIconsManager() {
  const container = document.getElementById("building-icons-list");
  const customIcons = uiState.data.settings.custom_icons || {};

  async function getIconSrc(buildingId, iconRef) {
    if (!iconRef) return null;
    if (iconRef.startsWith("data:")) return iconRef;
    if (_iconCache[buildingId]) return _iconCache[buildingId];
    try {
      const data = await api(`/api/icons/${encodeURIComponent(buildingId)}`, "GET");
      _iconCache[buildingId] = data.__icon__;
      return data.__icon__;
    } catch { return null; }
  }

  const rows = await Promise.all(BUILDINGS.map(async (building) => {
    const iconRef = customIcons[building.id];
    const imgSrc = await getIconSrc(building.id, iconRef);
    const previewContent = imgSrc
      ? `<img src="${escapeHtml(imgSrc)}" class="icon-preview-img" alt="${escapeHtml(building.name)}" />`
      : `<span class="icon-preview-emoji">${escapeHtml(building.emoji)}</span>`;
    const deleteButton = iconRef
      ? `<button class="icon-delete-btn" type="button" data-delete-icon="${escapeHtml(building.id)}">删除</button>`
      : "";

    return `
      <div class="icon-manager-row">
        <div class="icon-manager-preview">
          ${previewContent}
        </div>
        <div class="icon-manager-info">
          <strong>${escapeHtml(building.name)}</strong>
          <span class="rarity-chip rarity-${escapeHtml(building.rarity)}">${escapeHtml(formatRarity(building.rarity))}</span>
        </div>
        <div class="icon-manager-actions">
          <label class="icon-upload-btn">
            <input type="file" accept="image/*" class="hidden" data-upload-icon="${escapeHtml(building.id)}" />
            ${imgSrc ? "替换" : "上传"}
          </label>
          ${deleteButton}
        </div>
      </div>
    `;
  }));

  container.innerHTML = rows.join("");

  // Bind upload handlers
  container.querySelectorAll("[data-upload-icon]").forEach((input) => {
    input.addEventListener("change", handleIconUpload);
  });

  // Bind delete handlers
  container.querySelectorAll("[data-delete-icon]").forEach((button) => {
    button.addEventListener("click", handleIconDelete);
  });
}

async function handleIconUpload(event) {
  const buildingId = event.target.dataset.uploadIcon;
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    showToast("图片大小不能超过 2MB。");
    event.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    const dataUrl = e.target.result;
    try {
      await mutate(`/api/icons/${encodeURIComponent(buildingId)}`, "POST", {
        icon: dataUrl,
      });
      _iconCache[buildingId] = dataUrl;
      showToast("图标已上传。");
    } catch (err) {
      showToast(err.message || "上传失败。");
    }
    event.target.value = "";
  };
  reader.readAsDataURL(file);
}

async function handleIconDelete(event) {
  const buildingId = event.target.dataset.deleteIcon;
  const confirmed = window.confirm("确认删除此自定义图标吗？");
  if (!confirmed) return;

  try {
    await mutate(`/api/icons/${encodeURIComponent(buildingId)}`, "DELETE");
    delete _iconCache[buildingId];
    showToast("图标已删除。");
  } catch (err) {
    showToast(err.message || "删除失败。");
  }
}

// ---- Building Types Manager ----

async function listBuildings() {
  const data = await api("/api/buildings", "GET");
  return data.buildings || [];
}

function getMergedBuildings() {
  const staticBuildings = BUILDINGS;
  const customBuildings = uiState.data.settings.custom_buildings || {};
  // custom overrides static
  const merged = {};
  for (const b of staticBuildings) {
    merged[b.id] = { ...b };
  }
  for (const [id, b] of Object.entries(customBuildings)) {
    merged[id] = { ...b };
  }
  return Object.values(merged);
}

function renderBuildingTypesManager() {
  const container = document.getElementById("building-types-list");
  if (!container) return;

  const buildings = getMergedBuildings();
  if (!buildings.length) {
    container.innerHTML = `<div class="empty-state">还没有自定义建筑。</div>`;
    return;
  }

  container.innerHTML = buildings.map((b) => {
    const isCustom = Boolean(uiState.data.settings.custom_buildings && uiState.data.settings.custom_buildings[b.id]);
    return `
      <div class="building-type-row">
        <div class="building-type-preview">${escapeHtml(b.emoji)}</div>
        <div class="building-type-info">
          <strong>${escapeHtml(b.name)}</strong>
          <span class="rarity-chip rarity-${escapeHtml(b.rarity)}">${escapeHtml(formatRarity(b.rarity))}</span>
          <small class="meta-chip">${escapeHtml(formatEffects(b.effects))}</small>
        </div>
        <div class="building-type-actions">
          <button class="text-btn" type="button" data-edit-building="${escapeHtml(b.id)}">编辑</button>
          <button class="text-btn danger" type="button" data-delete-building="${escapeHtml(b.id)}" ${!isCustom ? "disabled title=\"静态建筑不可删除\"" : ""}>删除</button>
        </div>
      </div>
    `;
  }).join("");

  container.querySelectorAll("[data-edit-building]").forEach((button) => {
    button.addEventListener("click", () => showBuildingForm(button.dataset.editBuilding));
  });

  container.querySelectorAll("[data-delete-building]").forEach((button) => {
    button.addEventListener("click", () => handleBuildingDelete(button.dataset.deleteBuilding));
  });
}

async function handleBuildingDelete(buildingId) {
  const confirmed = window.confirm("确认删除这个建筑类型吗？该操作不可撤销。");
  if (!confirmed) return;

  try {
    await mutate(`/api/buildings/${buildingId}`, "DELETE");
    showToast("建筑类型已删除。");
  } catch (err) {
    showToast(err.message || "删除失败，该建筑类型可能正在被使用。");
  }
}

function validateBuildingPayload(building) {
  if (!building || typeof building !== "object" || Array.isArray(building)) {
    return "无效的建筑数据。";
  }
  if (typeof building.id !== "string" || !building.id.trim()) {
    return "建筑 ID 必须是字符串且不能为空。";
  }
  if (typeof building.name !== "string" || !building.name.trim()) {
    return "建筑名称不能为空。";
  }
  if (typeof building.emoji !== "string" || !building.emoji.trim()) {
    return "Emoji 图标不能为空。";
  }
  if (!["common", "rare", "epic"].includes(building.rarity)) {
    return "稀有度必须是 common/rare/epic 之一。";
  }
  if (building.effects && typeof building.effects === "object") {
    for (const [, value] of Object.entries(building.effects)) {
      if (typeof value !== "number" || value < 0) {
        return "属性数值不能为负数。";
      }
    }
  }
  return null;
}

function handleExportBuildings() {
  const customBuildings = uiState.data.settings.custom_buildings || {};
  const keys = Object.keys(customBuildings);
  if (!keys.length) {
    showToast("没有可导出的自定义建筑。");
    return;
  }
  const json = JSON.stringify(customBuildings, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "custom_buildings.json";
  a.click();
  URL.revokeObjectURL(url);
}

async function handleImportBuildings(event) {
  const file = event.target.files[0];
  if (!file) return;
  event.target.value = "";

  const reader = new FileReader();
  reader.onload = async (e) => {
    let parsed;
    try {
      parsed = JSON.parse(e.target.result);
    } catch {
      showToast("文件解析失败，请确认是有效的 JSON。");
      return;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      showToast("JSON 结构无效，必须是对象。");
      return;
    }

    const customBuildings = uiState.data.settings.custom_buildings || {};
    const merged = { ...customBuildings };
    let hasError = false;
    let errorMsg = "";

    for (const [id, building] of Object.entries(parsed)) {
      const validationError = validateBuildingPayload({ ...building, id });
      if (validationError) {
        hasError = true;
        errorMsg = `建筑「${id}」：${validationError}`;
        break;
      }
      merged[id] = building;
    }

    if (hasError) {
      showToast(errorMsg);
      return;
    }

    try {
      await mutate("/api/settings", "PATCH", { custom_buildings: merged });
      showToast("导入成功。");
      renderBuildingTypesManager();
    } catch (err) {
      showToast(err.message || "导入失败。");
    }
  };
  reader.readAsText(file);
}

function showBuildingForm(buildingId) {
  const modal = document.getElementById("building-form-modal");
  const layer = document.getElementById("modal-layer");

  let building = null;
  if (buildingId) {
    const all = getMergedBuildings();
    building = all.find((b) => b.id === buildingId);
  }

  const isEditing = Boolean(building);
  const title = isEditing ? `编辑建筑 · ${building.name}` : "新建建筑";

  const effectsRows = building && building.effects
    ? Object.entries(building.effects).map(([key, value]) => `
        <div class="effect-row" data-effect-index>
          <input type="text" class="effect-key" value="${escapeHtml(key)}" placeholder="属性名" />
          <input type="number" class="effect-value" value="${value}" step="0.01" placeholder="数值" />
          <button type="button" class="icon-delete-btn effect-remove-btn">×</button>
        </div>
      `).join("")
    : "";

  modal.innerHTML = `
    <p class="card-kicker">建筑类型</p>
    <h3>${escapeHtml(title)}</h3>
    <form id="building-form" class="building-form-grid">
      <div id="building-form-error" class="form-error hidden"></div>

      ${!isEditing ? `
        <label>
          <span>建筑 ID</span>
          <input id="bf-id" type="text" required placeholder="如：my_building" />
        </label>
      ` : `<input id="bf-id" type="hidden" value="${escapeHtml(building.id)}" />`}

      <label>
        <span>名称</span>
        <input id="bf-name" type="text" required value="${escapeHtml(building?.name || "")}" placeholder="如：教学楼" />
      </label>

      <label>
        <span>Emoji 图标</span>
        <input id="bf-emoji" type="text" required value="${escapeHtml(building?.emoji || "")}" placeholder="如：🏫" maxlength="2" />
      </label>

      <label>
        <span>稀有度</span>
        <select id="bf-rarity" required>
          <option value="">-- 选择 --</option>
          <option value="common" ${building?.rarity === "common" ? "selected" : ""}>普通</option>
          <option value="rare" ${building?.rarity === "rare" ? "selected" : ""}>稀有</option>
          <option value="epic" ${building?.rarity === "epic" ? "selected" : ""}>史诗</option>
        </select>
      </label>

      <label>
        <span>属性效果</span>
      </label>
      <div class="effects-list" id="effects-list">
        ${effectsRows}
      </div>
      <button type="button" class="ghost-btn effects-add-btn" id="add-effect-btn">添加属性</button>

      <label>
        <span>描述</span>
        <input id="bf-description" type="text" value="${escapeHtml(building?.description || "")}" placeholder="建筑描述（可选）" />
      </label>

      <div class="modal-actions">
        <button class="primary-btn" type="submit">保存</button>
        <button class="ghost-btn" type="button" id="cancel-building-form-btn">取消</button>
      </div>
    </form>
  `;

  layer.classList.remove("hidden");
  modal.classList.remove("hidden");

  // Add effect row
  document.getElementById("add-effect-btn").addEventListener("click", () => {
    const list = document.getElementById("effects-list");
    const row = document.createElement("div");
    row.className = "effect-row";
    row.setAttribute("data-effect-index", "");
    row.innerHTML = `
      <input type="text" class="effect-key" placeholder="属性名" />
      <input type="number" class="effect-value" step="0.01" placeholder="数值" />
      <button type="button" class="icon-delete-btn effect-remove-btn">×</button>
    `;
    list.appendChild(row);
  });

  // Remove effect row
  modal.querySelectorAll(".effect-remove-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.target.closest("[data-effect-index]").remove();
    });
  });

  // Cancel button
  document.getElementById("cancel-building-form-btn").addEventListener("click", closeModals);

  // Form submit
  document.getElementById("building-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const errorDiv = document.getElementById("building-form-error");
    errorDiv.classList.add("hidden");

    const id = buildingId || document.getElementById("bf-id").value.trim();
    const name = document.getElementById("bf-name").value.trim();
    const emoji = document.getElementById("bf-emoji").value.trim();
    const rarity = document.getElementById("bf-rarity").value;
    const description = document.getElementById("bf-description").value.trim();

    // Collect effects first
    const effects = {};
    let hasNegative = false;
    modal.querySelectorAll("[data-effect-index]").forEach((row) => {
      const key = row.querySelector(".effect-key").value.trim();
      const value = parseFloat(row.querySelector(".effect-value").value);
      if (key && !isNaN(value)) {
        effects[key] = value;
        if (value < 0) hasNegative = true;
      }
    });

    // Validation
    const validationError = validateBuildingPayload({ id, name, emoji, rarity, effects });
    if (validationError) {
      errorDiv.textContent = validationError;
      errorDiv.classList.remove("hidden");
      return;
    }

    const payload = { id, name, emoji, rarity, effects, description };

    try {
      if (isEditing) {
        await mutate(`/api/buildings/${buildingId}`, "PUT", payload);
        showToast("建筑类型已更新。");
      } else {
        await mutate("/api/buildings", "POST", payload);
        showToast("建筑类型已创建。");
      }
      closeModals();
    } catch (err) {
      errorDiv.textContent = err.message || "保存失败。";
      errorDiv.classList.remove("hidden");
    }
  });
}

function formatRarity(rarity) {
  const labels = {
    common: "普通",
    rare: "稀有",
    epic: "史诗",
  };
  return labels[rarity] || rarity;
}

function formatEffects(effects) {
  const labels = {
    xp_bonus: "经验加成",
    coin_bonus: "金币加成",
    rare_drop_bonus: "稀有掉落",
    weekly_bonus: "周目标加成",
    streak_bonus: "连续加成",
  };
  const parts = Object.entries(effects || {}).map(([key, value]) => {
    const amount = typeof value === "number" ? `${Math.round(value * 100)}%` : String(value);
    return `${labels[key] || key} ${amount}`;
  });
  return parts.join(" · ") || "无加成";
}

function renderTaskCollection(containerId, tasks, options) {
  const container = document.getElementById(containerId);
  if (!tasks.length) {
    container.innerHTML = `<div class="empty-state">这里暂时还没有任务。</div>`;
    return;
  }

  container.innerHTML = tasks
    .map((task) => {
      const chips = [
        formatPriority(task.priority),
        `${task.estimated_minutes} 分钟`,
        task.deadline ? `截止 ${task.deadline}` : "无截止日",
        task.repeat_rule !== "none" ? formatRepeatRule(task.repeat_rule) : null,
        task.scheduled_for_today ? "今日" : null,
        task.is_overdue ? "已逾期" : null,
      ]
        .filter(Boolean)
        .map((item) => `<span class="meta-chip">${escapeHtml(item)}</span>`)
        .join("");

      const actionButtons = task.completed
        ? `<button class="text-btn" type="button" disabled>已完成</button>`
        : `<button class="text-btn" type="button" data-complete-task="${task.id}">完成</button>`;

      const editButton = options.allowEdit
        ? `<button class="text-btn" type="button" data-edit-task="${task.id}">编辑</button>`
        : "";
      const deleteButton = options.allowEdit
        ? `<button class="text-btn danger" type="button" data-delete-task="${task.id}">删除</button>`
        : "";

      return `
        <article class="task-item ${task.completed ? "completed" : ""} ${task.is_overdue ? "overdue" : ""}">
          <div class="task-topline">
            <div>
              <strong>${escapeHtml(task.title)}</strong>
              <div class="meta-line">${chips}</div>
            </div>
          </div>
          <div class="task-actions">
            <div>${task.completed_at ? escapeHtml(formatDateTime(task.completed_at)) : ""}</div>
            <div class="pill-row">
              ${actionButtons}
              ${editButton}
              ${deleteButton}
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  container.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-complete-task]");
    if (btn) { completeTask(btn.dataset.completeTask); return; }
    const editBtn = e.target.closest("[data-edit-task]");
    if (editBtn) { beginEditTask(editBtn.dataset.editTask); return; }
    const delBtn = e.target.closest("[data-delete-task]");
    if (delBtn) {
      if (!window.confirm("确认删除这个任务吗？")) return;
      (async () => {
        try {
          const response = await mutate(`/api/tasks/${delBtn.dataset.deleteTask}`, "DELETE");
          if (uiState.editingTaskId === delBtn.dataset.deleteTask) resetTaskForm();
          showToast("任务已删除，5秒内可撤销。", 6000);
          // Store undo info for Ctrl+Z shortcut
          uiState._lastDeleteUndoId = delBtn.dataset.deleteTask;
          uiState._lastDeleteUndoTs = Date.now();
        } catch (error) { showToast(error.message); }
      })();
    }
  });
}

function beginEditTask(taskId) {
  const task = findTask(taskId);
  if (!task) {
    showToast("未找到任务。");
    return;
  }
  uiState.editingTaskId = taskId;
  document.getElementById("task-form-heading").textContent = `编辑任务 · ${task.title}`;
  document.getElementById("task-title").value = task.title;
  document.getElementById("task-priority").value = task.priority;
  document.getElementById("task-deadline").value = task.deadline || "";
  document.getElementById("task-minutes").value = task.estimated_minutes;
  document.getElementById("task-repeat").value = task.repeat_rule;
  document.getElementById("task-today").checked = Boolean(task.scheduled_for_today);
  document.getElementById("task-submit").textContent = "保存修改";
  switchView("tasks");
}

function resetTaskForm() {
  uiState.editingTaskId = null;
  document.getElementById("task-form-heading").textContent = "新建任务";
  document.getElementById("task-form").reset();
  document.getElementById("task-priority").value = "normal";
  document.getElementById("task-repeat").value = "none";
  document.getElementById("task-minutes").value = 25;
  document.getElementById("task-submit").textContent = "保存任务";
}

function findTask(taskId) {
  const allTasks = [
    ...uiState.data.tasks.planned,
    ...uiState.data.tasks.today,
    ...uiState.data.tasks.completed,
  ];
  return allTasks.find((task) => task.id === taskId);
}

async function completeTask(taskId) {
  try {
    const response = await api(`/api/tasks/${taskId}/complete`, "POST", {});
    hydrate(response.state);
    if (response.reward.leveled_up && response.reward.upgrade_options.length) {
      uiState.pendingReward = response.reward;
      openUpgradeModal(response.reward);
      return;
    }
    openRewardModal(response.reward);
  } catch (error) {
    showToast(error.message);
  }
}

function openUpgradeModal(reward) {
  const modal = document.getElementById("upgrade-modal");
  const layer = document.getElementById("modal-layer");
  modal.innerHTML = `
    <p class="card-kicker">升级奖励</p>
    <h2>${escapeHtml(String(reward.new_level))} 级</h2>
    <p class="muted">选择一个升级奖励，然后再查看本次任务结算。</p>
    <div class="modal-option-list">
      ${reward.upgrade_options
        .map(
          (option) => `
            <button class="modal-option" type="button" data-upgrade-choice="${escapeHtml(option.type)}">
              <strong>${escapeHtml(option.label)}</strong><br />
              <small>${escapeHtml(option.desc)}</small>
            </button>
          `
        )
        .join("")}
    </div>
  `;
  layer.classList.remove("hidden");
  modal.classList.remove("hidden");
  document.getElementById("reward-modal").classList.add("hidden");

  modal.querySelectorAll("[data-upgrade-choice]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const response = await mutate("/api/upgrades", "POST", {
          choice_type: button.dataset.upgradeChoice,
        });
        closeModals();
        openRewardModal(uiState.pendingReward || reward);
        uiState.pendingReward = null;
        return response;
      } catch (error) {
        showToast(error.message);
      }
    });
  });
}

function openRewardModal(reward) {
  const lines = [
    `经验 +${reward.xp}`,
    `金币 +${reward.coins}`,
    `校园点数 +${reward.campus_points}`,
    `连续 ${reward.streak_days} 天`,
  ];
  if (reward.dropped_building) {
    lines.push(`掉落：${reward.dropped_building.name}`);
  }
  if (reward.repeated_task) {
    lines.push(`下一条重复任务：${reward.repeated_task.title}`);
  }

  const modal = document.getElementById("reward-modal");
  modal.innerHTML = `
    <p class="card-kicker">完成奖励</p>
    <h2>任务完成</h2>
    <div class="modal-option-list">
      ${lines.map((line) => `<div class="pill">${escapeHtml(line)}</div>`).join("")}
    </div>
    <div class="modal-actions">
      <button class="primary-btn" id="close-reward-modal" type="button">关闭</button>
    </div>
  `;

  const layer = document.getElementById("modal-layer");
  layer.classList.remove("hidden");
  modal.classList.remove("hidden");
  document.getElementById("upgrade-modal").classList.add("hidden");

  document.getElementById("close-reward-modal").addEventListener("click", closeModals);
}

function closeModals() {
  document.getElementById("modal-layer").classList.add("hidden");
  document.getElementById("upgrade-modal").classList.add("hidden");
  document.getElementById("reward-modal").classList.add("hidden");
  document.getElementById("building-form-modal").classList.add("hidden");
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.add("hidden");
  }, 2600);
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return `完成于 ${date.toLocaleString()}`;
}

function formatPriority(priority) {
  const labels = {
    normal: "普通",
    important: "重要",
    urgent: "紧急",
  };
  return labels[priority] || priority;
}

function formatRepeatRule(rule) {
  const labels = {
    daily: "每天",
    weekly: "每周",
  };
  return labels[rule] || rule;
}

function formatRegion(region) {
  const labels = {
    core: "核心区",
    library: "图书馆区",
  };
  return labels[region] || region;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
