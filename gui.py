"""
GUI 界面
珞珈山todo应用的主界面
"""

import tkinter as tk
from tkinter import ttk, messagebox
from buildings_data import get_building_by_id, RARITY_COLORS, RARITY_NAMES


def add_hover_effect(widget, enter_color="#E0E0E0", leave_color="SystemButton"):
    """为按钮添加悬停效果"""
    def on_enter(e):
        widget.configure(bg=enter_color)
    def on_leave(e):
        widget.configure(bg=leave_color)
    widget.bind("<Enter>", on_enter)
    widget.bind("<Leave>", on_leave)


class MainWindow(tk.Frame):
    """主窗口"""

    def __init__(self, parent, game, storage):
        super().__init__(parent)
        self.game = game
        self.storage = storage
        self._setup_ui()
        self._bind_game_callbacks()

    def _setup_ui(self):
        """设置UI"""
        self.notebook = ttk.Notebook(self)
        self.notebook.pack(fill="both", expand=True, padx=10, pady=10)

        self.task_tab = TaskTab(self.notebook, self.game, self._on_task_completed)
        self.mountain_tab = MountainTab(self.notebook, self.game)
        self.settings_tab = SettingsTab(self.notebook, self.game, self.storage)

        self.notebook.add(self.task_tab, text="📋 任务")
        self.notebook.add(self.mountain_tab, text="🏔️ 珞珈山")
        self.notebook.add(self.settings_tab, text="⚙️ 设置")

        # 绑定标签切换事件，切换到设置页时刷新
        self.notebook.bind("<<NotebookTabChanged>>", self._on_tab_changed)

    def _bind_game_callbacks(self):
        """绑定游戏回调"""
        self.game.on_task_completed = self._on_task_completed

    def _on_task_completed(self):
        """任务完成回调"""
        self.mountain_tab.refresh()
        self.settings_tab.refresh()

    def _on_tab_changed(self, event):
        """标签切换回调"""
        # 获取当前选中的标签
        current = self.notebook.select()
        if current == str(self.settings_tab):
            self.settings_tab.refresh()


class TaskTab(tk.Frame):
    """任务标签页"""

    def __init__(self, parent, game, callback):
        super().__init__(parent)
        self.game = game
        self.callback = callback
        self._setup_ui()
        self.refresh()

    def _setup_ui(self):
        """设置UI"""
        # 主背景
        bg_frame = tk.Frame(self, bg="#F0F8E8")
        bg_frame.pack(fill="both", expand=True)

        # 顶部输入区域 - 卡片式设计
        input_card = tk.Frame(bg_frame, bg="#FFFFFF", bd=3, relief="groove")
        input_card.pack(fill="x", padx=15, pady=15)

        tk.Label(input_card, text="➕ 添加新任务", font=("Arial", 12, "bold"),
                bg="#FFFFFF", fg="#2D5A2D").pack(anchor="w", padx=10, pady=(10, 5))

        # 输入行
        input_row = tk.Frame(input_card, bg="#FFFFFF")
        input_row.pack(fill="x", padx=10, pady=5)

        tk.Label(input_row, text="任务:", font=("Arial", 10), bg="#FFFFFF").pack(side="left")
        self.task_entry = tk.Entry(input_row, width=25, font=("Arial", 11), bd=2, relief="sunken")
        self.task_entry.pack(side="left", padx=5)

        tk.Label(input_row, text="截止:", font=("Arial", 10), bg="#FFFFFF").pack(side="left", padx=(10, 0))
        self.deadline_entry = tk.Entry(input_row, width=12, font=("Arial", 11), bd=2, relief="sunken")
        self.deadline_entry.pack(side="left", padx=5)
        tk.Label(input_row, text="格式: YYYY-MM-DD", font=("Arial", 8), bg="#FFFFFF", fg="gray").pack(side="left")

        tk.Label(input_row, text="优先级:", font=("Arial", 10), bg="#FFFFFF").pack(side="left", padx=(10, 0))
        self.priority_var = tk.StringVar(value="普通")
        priority_menu = ttk.Combobox(
            input_row, textvariable=self.priority_var,
            values=["普通", "重要", "紧急"],
            state="readonly", width=8, font=("Arial", 11)
        )
        priority_menu.pack(side="left", padx=5)

        add_btn = tk.Button(input_row, text="添加任务", command=self._add_task,
                          bg="#90EE90", fg="#2D5A2D", font=("Arial", 10, "bold"),
                          bd=3, relief="raised", padx=10, cursor="hand2")
        add_btn.pack(side="left", padx=15)
        add_hover_effect(add_btn, enter_color="#7CCD7C", leave_color="#90EE90")

        # 任务列表区域
        list_card = tk.Frame(bg_frame, bg="#FFFFFF", bd=3, relief="groove")
        list_card.pack(fill="both", expand=True, padx=15, pady=(0, 15))

        # 标题栏
        title_bar = tk.Frame(list_card, bg="#C8E6C8")
        title_bar.pack(fill="x")

        tk.Label(title_bar, text="📋 待办任务列表", font=("Arial", 12, "bold"),
                bg="#C8E6C8", fg="#2D5A2D").pack(side="left", padx=10, pady=8)

        # XP说明
        xp_info = tk.Label(title_bar, text="💡 完成普通+10XP | 重要+20XP | 紧急+30XP",
                          font=("Arial", 9), bg="#C8E6C8", fg="#2D5A2D")
        xp_info.pack(side="right", padx=10)

        # 任务列表
        list_content = tk.Frame(list_card, bg="#FFFFFF")
        list_content.pack(fill="both", expand=True, padx=10, pady=10)

        scrollbar = tk.Scrollbar(list_content)
        scrollbar.pack(side="right", fill="y")

        self.task_listbox = tk.Listbox(
            list_content, yscrollcommand=scrollbar.set,
            font=("Arial", 12), height=10, bg="#FFFEF5",
            bd=2, relief="sunken", selectbackground="#C8E6C8",
            selectforeground="#2D5A2D", activestyle="none"
        )
        self.task_listbox.pack(side="left", fill="both", expand=True)
        scrollbar.config(command=self.task_listbox.yview)

        # 按钮区域 - 放在列表末尾
        btn_frame = tk.Frame(list_card, bg="#FFFFFF")
        btn_frame.pack(fill="x", pady=(5, 10))

        # 空白标签撑开左侧
        tk.Label(btn_frame, text="", bg="#FFFFFF", width=10).pack(side="left")

        complete_btn = tk.Button(btn_frame, text="✓", command=self._complete_task,
                                bg="#90EE90", fg="#2D5A2D", font=("Arial", 14, "bold"),
                                bd=3, relief="raised", width=4, cursor="hand2")
        complete_btn.pack(side="right", padx=5)
        add_hover_effect(complete_btn, enter_color="#7CCD7C", leave_color="#90EE90")

        delete_btn = tk.Button(btn_frame, text="✕", command=self._delete_task,
                              bg="#FFB6C1", fg="#8B0000", font=("Arial", 14, "bold"),
                              bd=3, relief="raised", width=4, cursor="hand2")
        delete_btn.pack(side="right", padx=5)
        add_hover_effect(delete_btn, enter_color="#FF9999", leave_color="#FFB6C1")

    def refresh(self):
        """刷新任务列表"""
        self.task_listbox.delete(0, tk.END)
        for task in self.game.get_incomplete_tasks():
            priority_map = {"normal": ("📌", "普通"), "important": ("⭐", "重要"), "urgent": ("🔥", "紧急")}
            icon, priority_text = priority_map.get(task.priority, ("📌", "普通"))
            deadline_str = f" [截止:{task.deadline}]" if task.deadline else ""
            overdue_str = " ⚠️" if task.is_overdue() else ""
            xp_reward = task.get_xp_reward()
            display = f"{icon} [{priority_text}]{deadline_str}{overdue_str} {task.title} (+{xp_reward}XP)"
            self.task_listbox.insert(tk.END, display)

    def _add_task(self):
        """添加任务"""
        title = self.task_entry.get().strip()
        if not title:
            messagebox.showwarning("警告", "请输入任务名称")
            return
        # 将中文优先级转回英文
        priority_map = {"普通": "normal", "重要": "important", "紧急": "urgent"}
        priority = priority_map.get(self.priority_var.get(), "normal")
        deadline = self.deadline_entry.get().strip() or None
        self.game.add_task(title, priority, deadline)
        self.task_entry.delete(0, tk.END)
        self.deadline_entry.delete(0, tk.END)
        self.refresh()

    def _complete_task(self):
        """完成任务"""
        selection = self.task_listbox.curselection()
        if not selection:
            messagebox.showwarning("警告", "请选择要完成的任务")
            return

        index = selection[0]
        incomplete_tasks = self.game.get_incomplete_tasks()
        if index >= len(incomplete_tasks):
            return

        task = incomplete_tasks[index]
        xp, building, leveled_up = self.game.complete_task(task.id)

        if xp is None:
            return

        msg = f"🎉 任务完成！\n获得 XP: {xp}"
        if building:
            msg += f"\n🏆 获得建筑: {building['emoji']} {building['name']}"

        if leveled_up:
            msg += f"\n\n⬆️ 升级了！现在是 Lv.{self.game.player.level}"
            self._show_level_up_dialog()

        messagebox.showinfo("任务完成", msg)
        self.refresh()
        if self.callback:
            self.callback()

    def _delete_task(self):
        """删除任务"""
        selection = self.task_listbox.curselection()
        if not selection:
            messagebox.showwarning("警告", "请选择要删除的任务")
            return

        index = selection[0]
        incomplete_tasks = self.game.get_incomplete_tasks()
        if index >= len(incomplete_tasks):
            return

        task = incomplete_tasks[index]
        self.game.delete_task(task.id)
        self.refresh()

    def _show_level_up_dialog(self):
        """显示升级选择对话框"""
        dialog = LevelUpDialog(self, self.game)
        self.wait_window(dialog)


class LevelUpDialog(tk.Toplevel):
    """升级选择对话框"""

    def __init__(self, parent, game):
        super().__init__(parent)
        self.game = game
        self.choice = None
        self._setup_ui()

    def _setup_ui(self):
        """设置UI"""
        self.title("⬆️ 升级！")
        self.geometry("400x250")
        self.resizable(False, False)

        tk.Label(
            self, text=f"恭喜升到 Lv.{self.game.player.level}！",
            font=("Arial", 14, "bold")
        ).pack(pady=20)

        tk.Label(self, text="选择一项进行:").pack(pady=10)

        btn_frame = tk.Frame(self)
        btn_frame.pack(pady=20)

        expand_btn = tk.Button(
            btn_frame, text="🏔️ 扩大区域\n(网格+1，新增森林)",
            command=self._choose_expand, width=15, height=3, cursor="hand2",
            bg="#A8D8A8", fg="#2D5A2D", font=("Arial", 11, "bold"),
            bd=3, relief="raised"
        )
        expand_btn.grid(row=0, column=0, padx=10)
        add_hover_effect(expand_btn, enter_color="#8BC88B", leave_color="#A8D8A8")

        clearing_btn = tk.Button(
            btn_frame, text="🌲 开垦荒地\n(森林→空地 +4)",
            command=self._choose_clearing, width=15, height=3, cursor="hand2",
            bg="#A8D8A8", fg="#2D5A2D", font=("Arial", 11, "bold"),
            bd=3, relief="raised"
        )
        clearing_btn.grid(row=0, column=1, padx=10)
        add_hover_effect(clearing_btn, enter_color="#8BC88B", leave_color="#A8D8A8")

        self.grab_set()

    def _choose_expand(self):
        """选择扩大山体"""
        self.game.handle_level_up_choice("expand")
        self.destroy()

    def _choose_clearing(self):
        """选择开垦荒地"""
        self.game.handle_level_up_choice("clearing")
        self.destroy()


class MountainTab(tk.Frame):
    """珞珈山标签页"""

    def __init__(self, parent, game):
        super().__init__(parent)
        self.game = game
        self.selected_building = None
        self._setup_ui()
        self.refresh()

    def _setup_ui(self):
        """设置UI - 动物之森风格"""
        # 主背景框架
        bg_frame = tk.Frame(self, bg="#F0F8E8")
        bg_frame.pack(fill="both", expand=True)

        # 左侧：珞珈山视图 (更宽，给更多空间)
        left_frame = tk.Frame(bg_frame, bg="#A8D8A8", bd=4, relief="groove")
        left_frame.pack(side="left", fill="both", expand=True, padx=10, pady=10)

        tk.Label(left_frame, text="🏔️ 珞珈山", font=("Arial", 16, "bold"),
                 bg="#A8D8A8", fg="#2D5A2D").pack(pady=8)

        # 状态栏
        status_frame = tk.Frame(left_frame, bg="#C8E6C8", bd=2, relief="sunken")
        status_frame.pack(fill="x", padx=10, pady=5)

        self.level_label = tk.Label(status_frame, text=f"等级: Lv.{self.game.player.level}",
                 font=("Arial", 10, "bold"), bg="#C8E6C8", fg="#2D5A2D")
        self.level_label.pack(side="left", padx=10)
        self.grid_label = tk.Label(status_frame, text=f"山体: {self.game.player.grid_size}×{self.game.player.grid_size}",
                 bg="#C8E6C8", fg="#2D5A2D")
        self.grid_label.pack(side="left", padx=10)

        # XP进度条
        xp_frame = tk.Frame(left_frame, bg="#C8E6C8", bd=2, relief="sunken")
        xp_frame.pack(fill="x", padx=10, pady=5)

        self.xp_progress = tk.DoubleVar()
        ttk.Progressbar(xp_frame, variable=self.xp_progress, maximum=100,
                       length=200, mode="determinate").pack(pady=5)
        self.xp_label = tk.Label(xp_frame, text="XP: 0 / 100",
                                  font=("Arial", 9), bg="#C8E6C8", fg="#2D5A2D")
        self.xp_label.pack()

        # 画布 - 天空蓝背景，增加高度和宽度
        self.canvas = tk.Canvas(left_frame, width=380, height=350,
                                bg="#87CEEB", highlightthickness=0)
        self.canvas.pack(pady=10)

        # 右侧：背包
        right_frame = tk.Frame(bg_frame, bg="#FFF8E7", bd=4, relief="groove")
        right_frame.pack(side="right", fill="both", padx=10, pady=10)

        tk.Label(right_frame, text="🎒 背包", font=("Arial", 14, "bold"),
                 bg="#FFF8E7", fg="#8B4513").pack(pady=8)

        # 背包框架
        inventory_frame = tk.Frame(right_frame, bg="#FFF8E7")
        inventory_frame.pack(fill="both", expand=True, padx=10)

        scrollbar = tk.Scrollbar(inventory_frame)
        scrollbar.pack(side="right", fill="y")

        self.inventory_listbox = tk.Listbox(
            inventory_frame, yscrollcommand=scrollbar.set,
            font=("Arial", 11), height=12, bg="#FFFEF5",
            bd=2, relief="sunken", selectbackground="#FFE4B5",
            selectforeground="#8B4513"
        )
        self.inventory_listbox.pack(side="left", fill="both", expand=True)
        scrollbar.config(command=self.inventory_listbox.yview)

        self.inventory_listbox.bind("<Button-1>", self._on_inventory_click)

        # 提示标签
        hint_frame = tk.Frame(right_frame, bg="#FFE4B5", bd=2, relief="sunken")
        hint_frame.pack(pady=10, padx=10)
        tk.Label(hint_frame, text="💡 提示: 先选建筑，再点空地放置",
                 font=("Arial", 9), bg="#FFE4B5", fg="#8B4513").pack(padx=5, pady=3)

        # 刷新按钮
        refresh_btn = tk.Button(right_frame, text="🔄 刷新界面",
                               command=self.refresh, bg="#90EE90", fg="#2D5A2D",
                               font=("Arial", 10, "bold"), bd=3, relief="raised",
                               cursor="hand2")
        refresh_btn.pack(pady=5)
        add_hover_effect(refresh_btn, enter_color="#7CCD7C", leave_color="#90EE90")

    def refresh(self):
        """刷新界面"""
        player = self.game.player
        self.xp_progress.set(player.get_xp_progress() * 100)
        self.xp_label.config(text=f"XP: {player.xp} / {int(player.get_xp_for_next_level())}")
        self.level_label.config(text=f"等级: Lv.{player.level}")
        self.grid_label.config(text=f"山体: {player.grid_size}×{player.grid_size}")

        self.inventory_listbox.delete(0, tk.END)
        if not player.inventory:
            self.inventory_listbox.insert(tk.END, "(空)")
        else:
            for building_id in player.inventory:
                building = get_building_by_id(building_id)
                if building:
                    display = f"{building['emoji']}{building['name']}"
                    self.inventory_listbox.insert(tk.END, display)

        self._draw_grid()

    def _draw_grid(self):
        """绘制网格 - 动物之森风格"""
        self.canvas.delete("all")
        player = self.game.player
        grid_size = player.grid_size

        canvas_width = 380
        canvas_height = 350

        # 绘制天空装饰（云朵和太阳）- 调整位置避免与网格重叠
        # 太阳在右上角
        self.canvas.create_oval(310, 15, 350, 55, fill="#FFFACD", outline="#FFE4B5", width=2)
        self.canvas.create_text(330, 35, text="☀️", font=("Arial", 14))

        # 云朵在左上角
        for cloud_x in [30, 150]:
            self.canvas.create_oval(cloud_x, 15, cloud_x + 50, 45, fill="white", outline="#E8E8E8", width=2)

        # 绘制远山背景 - 调整位置和大小
        for i, (mx, mh, mcolor) in enumerate([(40, 60, "#B8D4B8"), (130, 80, "#A8C8A8"), (220, 50, "#C8E0C8")]):
            self.canvas.create_polygon(
                mx, 310, mx + 70, 310 - mh, mx + 140, 310,
                fill=mcolor, outline="#90A890"
            )
            self.canvas.create_text(mx + 70, 310 - mh + 5, text="⛰️", font=("Arial", 16))

        # 计算网格大小和偏移 - 确保网格在画面下半部分居中
        # 网格区域: 从 y=60 到 y=290，给装饰和网格足够空间
        grid_area_top = 70
        grid_area_bottom = 290
        grid_area_height = grid_area_bottom - grid_area_top

        cell_size = min((canvas_width - 40) // grid_size, (grid_area_height - 20) // grid_size)
        cell_size = min(cell_size, 65)  # 限制最大格子大小

        # 网格总尺寸
        grid_total_width = grid_size * cell_size
        grid_total_height = grid_size * cell_size

        # 居中偏移 - 网格底部对齐到 grid_area_bottom
        offset_x = (canvas_width - grid_total_width) // 2
        offset_y = grid_area_bottom - grid_total_height  # 网格底部位置

        self.cell_items = {}  # 存储格子对应的 item id

        # 地形emoji - 统一固定图案
        EMPTY_EMOJI = "🌱"      # 空地（已解锁）统一用这个
        FOREST_EMOJI = "🌲"     # 森林（未解锁）统一用这个

        for y in range(grid_size):
            for x in range(grid_size):
                key = f"{x},{y}"
                building_id = player.grid.get(key)
                is_unlocked = key in player.available_cells

                x1 = offset_x + x * cell_size
                y1 = offset_y + (grid_size - 1 - y) * cell_size  # 从下往上排列
                x2 = x1 + cell_size
                y2 = y1 + cell_size

                if building_id:
                    building = get_building_by_id(building_id)
                    if building:
                        # 建筑物基底（棕色土地）
                        rect = self.canvas.create_rectangle(
                            x1, y1, x2, y2, fill="#DEB887", outline="#CD853F", width=2
                        )
                        self.cell_items[rect] = (x, y)
                        # 建筑emoji - 居中显示，大小不超过格子40%
                        emoji_size = int(cell_size * 0.4)
                        emoji_size = max(emoji_size, 8)  # 最小8号
                        self.canvas.create_text(
                            (x1 + x2) // 2, (y1 + y2) // 2,
                            text=building["emoji"], font=("Arial", emoji_size)
                        )
                elif is_unlocked:
                    # 已解锁的空地 - 草地
                    rect = self.canvas.create_rectangle(
                        x1, y1, x2, y2, fill="#90EE90", outline="#7CCD7C", width=2
                    )
                    self.cell_items[rect] = (x, y)
                    # 空地统一emoji
                    emoji_size = max(cell_size // 3, 10)
                    self.canvas.create_text(
                        (x1 + x2) // 2, (y1 + y2) // 2,
                        text=EMPTY_EMOJI, font=("Arial", emoji_size)
                    )
                else:
                    # 森林（未解锁）- 深绿背景
                    rect = self.canvas.create_rectangle(
                        x1, y1, x2, y2, fill="#228B22", outline="#1A6B1A", width=2
                    )
                    self.cell_items[rect] = (x, y)
                    # 森林统一emoji
                    emoji_size = max(cell_size // 3, 10)
                    self.canvas.create_text(
                        (x1 + x2) // 2, (y1 + y2) // 2,
                        text=FOREST_EMOJI, font=("Arial", emoji_size)
                    )

        # 绑定点击事件到画布
        self.canvas.bind("<Button-1>", self._on_canvas_click)

    def _on_inventory_click(self, event):
        """点击背包"""
        selection = self.inventory_listbox.curselection()
        if not selection:
            return
        index = selection[0]
        if self.game.player.inventory:
            self.selected_building = self.game.player.inventory[index]

    def _on_canvas_click(self, event):
        """点击画布"""
        if self.selected_building is None:
            messagebox.showinfo("提示", "请先从背包选择一个建筑")
            return

        # 使用 find_all 找到所有项，然后检查哪些在 cell_items 中
        # 或者使用 find_overlapping 但反转顺序（矩形在文本下面）
        items = self.canvas.find_overlapping(event.x - 5, event.y - 5, event.x + 5, event.y + 5)

        # 反转顺序，因为矩形先创建在下面，文本后创建在上面
        # 点击矩形时，find_overlapping 会先返回文本，所以我们反转
        for item in reversed(list(items)):
            if item in self.cell_items:
                x, y = self.cell_items[item]
                self._on_cell_click(x, y)
                return

        messagebox.showinfo("提示", "请点击空地格子放置建筑")

    def _on_cell_click(self, x, y):
        """点击网格"""
        if self.selected_building is None:
            messagebox.showinfo("提示", "请先从背包选择一个建筑")
            return

        # 检查该位置是否可用
        key = f"{x},{y}"
        if key not in self.game.player.available_cells:
            messagebox.showwarning("警告", "该位置未解锁")
            return

        if self.game.player.grid.get(key) is not None:
            messagebox.showwarning("警告", "该位置已有建筑")
            return

        success = self.game.place_building(self.selected_building, x, y)
        if success:
            self.selected_building = None
            self.refresh()
        else:
            messagebox.showwarning("警告", "放置失败")


class SettingsTab(tk.Frame):
    """设置标签页"""

    def __init__(self, parent, game, storage):
        super().__init__(parent)
        self.game = game
        self.storage = storage
        self._setup_ui()

    def _setup_ui(self):
        """设置UI - 游戏卡片风格"""
        # 主背景
        bg_frame = tk.Frame(self, bg="#F0F8E8")
        bg_frame.pack(fill="both", expand=True)

        # 设置卡片
        settings_card = tk.Frame(bg_frame, bg="#FFFFFF", bd=3, relief="groove")
        settings_card.pack(pady=30, padx=30, fill="both", expand=True)

        tk.Label(settings_card, text="⚙️ 游戏设置", font=("Arial", 14, "bold"),
                bg="#FFFFFF", fg="#2D5A2D").pack(pady=15)

        # 信息框架 - 使用Grid布局更紧凑
        info_frame = tk.Frame(settings_card, bg="#FFFFFF")
        info_frame.pack(pady=10)

        # 使用变量存储标签引用，便于实时更新
        self.level_label = tk.Label(info_frame, text="", font=("Arial", 11),
                                   bg="#FFFFFF", fg="#333333", anchor="w")
        self.level_label.grid(row=0, column=0, sticky="w", padx=20, pady=5)
        self.xp_label = tk.Label(info_frame, text="", font=("Arial", 11),
                                  bg="#FFFFFF", fg="#333333", anchor="w")
        self.xp_label.grid(row=1, column=0, sticky="w", padx=20, pady=5)
        self.inventory_label = tk.Label(info_frame, text="", font=("Arial", 11),
                                        bg="#FFFFFF", fg="#333333", anchor="w")
        self.inventory_label.grid(row=2, column=0, sticky="w", padx=20, pady=5)
        self.grid_label = tk.Label(info_frame, text="", font=("Arial", 11),
                                    bg="#FFFFFF", fg="#333333", anchor="w")
        self.grid_label.grid(row=3, column=0, sticky="w", padx=20, pady=5)
        self.cells_label = tk.Label(info_frame, text="", font=("Arial", 11),
                                     bg="#FFFFFF", fg="#333333", anchor="w")
        self.cells_label.grid(row=4, column=0, sticky="w", padx=20, pady=5)

        # 分隔线
        ttk.Separator(settings_card, orient="horizontal").pack(fill="x", pady=15)

        # 按钮框架
        btn_frame = tk.Frame(settings_card, bg="#FFFFFF")
        btn_frame.pack(pady=20)

        reset_btn = tk.Button(
            btn_frame, text="🔄 重置所有数据",
            command=self._reset_data, fg="white", bg="#FF6B6B",
            font=("Arial", 10, "bold"), bd=3, relief="raised",
            cursor="hand2", padx=20, pady=5
        )
        reset_btn.pack()
        add_hover_effect(reset_btn, enter_color="#FF4444", leave_color="#FF6B6B")

        # 警告提示
        warning_frame = tk.Frame(settings_card, bg="#FFF3CD", bd=2, relief="sunken")
        warning_frame.pack(pady=10, padx=20, fill="x")
        tk.Label(warning_frame, text="⚠️ 重置后所有进度将丢失！",
                font=("Arial", 9), bg="#FFF3CD", fg="#856404").pack(padx=10, pady=5)

        self.refresh()  # 初始化显示

    def refresh(self):
        """刷新显示"""
        player = self.game.player
        self.level_label.config(text=f"📊 等级: Lv.{player.level}")
        self.xp_label.config(text=f"✨ XP: {player.xp}")
        self.inventory_label.config(text=f"🎒 背包: {len(player.inventory)} 个建筑")
        self.grid_label.config(text=f"🏔️ 山体: {player.grid_size}×{player.grid_size}")
        unlocked = len(player.available_cells)
        total = player.grid_size * player.grid_size
        self.cells_label.config(text=f"🌱 可用: {unlocked}/{total} 格子")

    def _reset_data(self):
        """重置数据"""
        if messagebox.askyesno("确认", "确定要重置所有数据吗？这将删除所有进度！"):
            self.storage.reset()
            messagebox.showinfo("成功", "数据已重置，请重启程序")
