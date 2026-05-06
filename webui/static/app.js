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

const BUILDINGS = [
  { id: "teaching_building", name: "教学楼", emoji: "🏫", rarity: "common", category: "functional", effects: { xp_bonus: 0.05 }, description: "日常学习与课堂推进的核心区域。" },
  { id: "college_building", name: "学院楼", emoji: "🏢", rarity: "common", category: "functional", effects: { weekly_bonus: 0.05 }, description: "学院与教师办公所在的功能楼群。" },
  { id: "office_building", name: "行政楼", emoji: "🏬", rarity: "common", category: "functional", effects: { coin_bonus: 0.05 }, description: "带来更稳定金币收益的行政中心。" },
  { id: "school_gate", name: "校门", emoji: "🏛", rarity: "rare", category: "landmark", effects: { rare_drop_bonus: 0.08 }, description: "极具辨识度的校园地标入口。" },
  { id: "leijun_building", name: "创新塔", emoji: "🌟", rarity: "epic", category: "landmark", effects: { streak_bonus: 0.1, rare_drop_bonus: 0.12 }, description: "高稀有度地标建筑，拥有更强成长加成。" },
];

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

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  initHeroQuoteRotation();
  refreshState();
});

function bindEvents() {
  document.querySelectorAll(".tab-link").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  document.querySelectorAll(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      uiState.taskView = button.dataset.taskView;
      renderTasks();
    });
  });

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
  switchView(uiState.activeView, false);
  renderHero();
  renderToday();
  renderTasks();
  renderCampus();
  renderGrowth();
  renderSettings();
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
    renderAll();
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

  const tasks = uiState.data.tasks[uiState.taskView] || [];
  renderTaskCollection("task-list", tasks, {
    allowEdit: true,
    showCompleted: uiState.taskView === "completed",
  });
}

function renderCampus() {
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
}

function renderBuildingIconsManager() {
  const container = document.getElementById("building-icons-list");
  const customIcons = uiState.data.settings.custom_icons || {};

  container.innerHTML = BUILDINGS.map((building) => {
    const customIcon = customIcons[building.id];
    const previewContent = customIcon
      ? `<img src="${escapeHtml(customIcon)}" class="icon-preview-img" alt="${escapeHtml(building.name)}" />`
      : `<span class="icon-preview-emoji">${escapeHtml(building.emoji)}</span>`;
    const deleteButton = customIcon
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
            ${customIcon ? "替换" : "上传"}
          </label>
          ${deleteButton}
        </div>
      </div>
    `;
  }).join("");

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
      await mutate("/api/settings", "PATCH", {
        custom_icons: { [buildingId]: dataUrl },
      });
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
    await mutate("/api/settings", "PATCH", {
      custom_icons: { [buildingId]: null },
    });
    showToast("图标已删除。");
  } catch (err) {
    showToast(err.message || "删除失败。");
  }
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

  container.querySelectorAll("[data-complete-task]").forEach((button) => {
    button.addEventListener("click", () => completeTask(button.dataset.completeTask));
  });

  container.querySelectorAll("[data-edit-task]").forEach((button) => {
    button.addEventListener("click", () => beginEditTask(button.dataset.editTask));
  });

  container.querySelectorAll("[data-delete-task]").forEach((button) => {
    button.addEventListener("click", async () => {
      const confirmed = window.confirm("确认删除这个任务吗？");
      if (!confirmed) {
        return;
      }
      try {
        await mutate(`/api/tasks/${button.dataset.deleteTask}`, "DELETE");
        if (uiState.editingTaskId === button.dataset.deleteTask) {
          resetTaskForm();
        }
        showToast("任务已删除。");
      } catch (error) {
        showToast(error.message);
      }
    });
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
