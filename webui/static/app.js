const uiState = {
  data: null,
  activeView: "today",
  taskView: "planned",
  editingTaskId: null,
  selectedBuildingId: null,
  pendingReward: null,
};

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
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
    showToast("已加入 Today。");
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
    { label: "Campus", value: uiState.data.settings.campus_name },
    { label: "Level", value: `Lv.${uiState.data.growth.level}` },
    { label: "Streak", value: `${uiState.data.growth.streak_days} day(s)` },
    { label: "Prosperity", value: uiState.data.today.summary.campus_progress },
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

function renderToday() {
  const summary = uiState.data.today.summary;
  document.getElementById("today-summary-title").textContent = `${summary.campus_name} 的今日推进`;
  document.getElementById(
    "today-summary-meta"
  ).textContent = `Today ${summary.today_count} 项，已完成 ${summary.completed_today} 项。`;

  document.getElementById("today-pills").innerHTML = [
    `Streak ${summary.streak_days}`,
    `Weekly ${summary.weekly_completed}/${summary.weekly_target}`,
    `Prosperity ${summary.campus_progress}`,
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
    `Prosperity: ${campus.prosperity}`,
    `Cells: ${campus.unlocked_cells}/${campus.total_cells}`,
    `Grid: ${campus.grid_size} x ${campus.grid_size}`,
    `Regions: ${campus.regions.join(" / ")}`,
  ]
    .map((item) => `<div class="pill">${escapeHtml(item)}</div>`)
    .join("");

  const selectedBuilding = campus.inventory_stacks.find(
    (building) => building.id === uiState.selectedBuildingId
  );
  document.getElementById("selected-building-label").textContent = selectedBuilding
    ? `当前选择：${selectedBuilding.name}，点击空地即可放置`
    : "当前未选择建筑";

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
              ${renderBuildingIllustration(building, `inventory-${building.id}`, "card")}
            </div>
            <div class="inventory-meta">
              <div class="inventory-title-row">
                <strong>${escapeHtml(building.name)}</strong>
                <span class="rarity-chip rarity-${escapeHtml(building.rarity)}">${escapeHtml(formatRarity(building.rarity))}</span>
              </div>
              <small class="inventory-description">${escapeHtml(building.description || "Campus building")}</small>
              <div class="meta-line">
                <span class="meta-chip">x ${building.count}</span>
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
            ? "Place Here"
            : "Open Land"
          : "Mountain";
      const status = cell.building
        ? formatRarity(cell.building.rarity)
        : cell.unlocked
          ? uiState.selectedBuildingId
            ? "Ready"
            : "Buildable"
          : "Locked";

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
            ${renderCampusTileIllustration(cell, `cell-${cell.key}`)}
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
  document.getElementById("growth-level").textContent = `Lv.${growth.level}`;
  document.getElementById("growth-xp").textContent = `XP ${growth.xp}`;
  document.getElementById("growth-streak").textContent = `${growth.streak_days}`;
  document.getElementById(
    "growth-weekly"
  ).textContent = `Weekly ${growth.weekly_completed}/${growth.weekly_target}`;
  document.getElementById("growth-catalog").textContent = `${growth.catalog_count}`;
  document.getElementById(
    "growth-inventory"
  ).textContent = `Inventory ${growth.inventory_count}`;
  document.getElementById("growth-progress-fill").style.width = `${growth.xp_ratio * 100}%`;
}

function renderSettings() {
  const settings = uiState.data.settings;
  document.getElementById("settings-summary").innerHTML = [
    ["Campus", settings.campus_name],
    ["Level", `Lv.${settings.level}`],
    ["XP", settings.xp],
    ["Coins", settings.coins],
    ["Inventory", settings.inventory_count],
    ["Catalog", settings.catalog_count],
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
}

function formatRarity(rarity) {
  const labels = {
    common: "Common",
    rare: "Rare",
    epic: "Epic",
  };
  return labels[rarity] || rarity;
}

function formatEffects(effects) {
  const labels = {
    xp_bonus: "XP boost",
    coin_bonus: "Coin boost",
    rare_drop_bonus: "Rare drop",
    weekly_bonus: "Weekly boost",
    streak_bonus: "Streak boost",
  };
  const parts = Object.entries(effects || {}).map(([key, value]) => {
    const amount = typeof value === "number" ? `${Math.round(value * 100)}%` : String(value);
    return `${labels[key] || key} ${amount}`;
  });
  return parts.join(" · ") || "No bonus";
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
        task.priority,
        `${task.estimated_minutes}m`,
        task.deadline ? `due ${task.deadline}` : "no deadline",
        task.repeat_rule !== "none" ? task.repeat_rule : null,
        task.scheduled_for_today ? "today" : null,
        task.is_overdue ? "overdue" : null,
      ]
        .filter(Boolean)
        .map((item) => `<span class="meta-chip">${escapeHtml(item)}</span>`)
        .join("");

      const actionButtons = task.completed
        ? `<button class="text-btn" type="button" disabled>已完成</button>`
        : `<button class="text-btn" type="button" data-complete-task="${task.id}">Complete</button>`;

      const editButton = options.allowEdit
        ? `<button class="text-btn" type="button" data-edit-task="${task.id}">Edit</button>`
        : "";
      const deleteButton = options.allowEdit
        ? `<button class="text-btn danger" type="button" data-delete-task="${task.id}">Delete</button>`
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
    <p class="card-kicker">Level Up</p>
    <h2>Lv.${escapeHtml(String(reward.new_level))}</h2>
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
    `XP +${reward.xp}`,
    `Coins +${reward.coins}`,
    `Campus Points +${reward.campus_points}`,
    `Streak ${reward.streak_days} day(s)`,
  ];
  if (reward.dropped_building) {
    lines.push(`Drop: ${reward.dropped_building.emoji} ${reward.dropped_building.name}`);
  }
  if (reward.repeated_task) {
    lines.push(`Next Repeat Task: ${reward.repeated_task.title}`);
  }

  const modal = document.getElementById("reward-modal");
  modal.innerHTML = `
    <p class="card-kicker">Completion Rewards</p>
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
  return `completed ${date.toLocaleString()}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
