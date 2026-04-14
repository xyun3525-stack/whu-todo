"""
GUI 界面
珞珈山养成应用的主界面
"""

import tkinter as tk
from tkinter import ttk, messagebox
from buildings_data import get_building_by_id, RARITY_COLORS, RARITY_NAMES


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

    def _bind_game_callbacks(self):
        """绑定游戏回调"""
        self.game.on_task_completed = self._on_task_completed

    def _on_task_completed(self):
        """任务完成回调"""
        self.mountain_tab.refresh()


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
        input_frame = tk.Frame(self)
        input_frame.pack(fill="x", padx=10, pady=10)

        tk.Label(input_frame, text="新任务:").pack(side="left")
        self.task_entry = tk.Entry(input_frame, width=20)
        self.task_entry.pack(side="left", padx=5)

        tk.Label(input_frame, text="截止日期:").pack(side="left")
        self.deadline_entry = tk.Entry(input_frame, width=12)
        self.deadline_entry.pack(side="left", padx=5)
        tk.Label(input_frame, text="(格式: YYYY-MM-DD)", fg="gray").pack(side="left")

        tk.Label(input_frame, text="优先级:").pack(side="left")
        self.priority_var = tk.StringVar(value="normal")
        priority_menu = ttk.Combobox(
            input_frame, textvariable=self.priority_var,
            values=["normal", "important", "urgent"],
            state="readonly", width=10
        )
        priority_menu.pack(side="left", padx=5)

        add_btn = tk.Button(input_frame, text="添加", command=self._add_task)
        add_btn.pack(side="left", padx=5)

        list_frame = tk.Frame(self)
        list_frame.pack(fill="both", expand=True, padx=10, pady=10)

        tk.Label(list_frame, text="待办任务:", font=("Arial", 12, "bold")).pack(anchor="w")

        scrollbar = tk.Scrollbar(list_frame)
        scrollbar.pack(side="right", fill="y")

        self.task_listbox = tk.Listbox(
            list_frame, yscrollcommand=scrollbar.set,
            font=("Arial", 11), height=15
        )
        self.task_listbox.pack(side="left", fill="both", expand=True)
        scrollbar.config(command=self.task_listbox.yview)

        btn_frame = tk.Frame(self)
        btn_frame.pack(fill="x", padx=10, pady=10)

        complete_btn = tk.Button(btn_frame, text="✓ 完成任务", command=self._complete_task)
        complete_btn.pack(side="left", padx=5)

        delete_btn = tk.Button(btn_frame, text="✗ 删除任务", command=self._delete_task)
        delete_btn.pack(side="left", padx=5)

    def refresh(self):
        """刷新任务列表"""
        self.task_listbox.delete(0, tk.END)
        for task in self.game.get_incomplete_tasks():
            priority_text = {"normal": "📌", "important": "⭐", "urgent": "🔥"}.get(task.priority, "📌")
            deadline_str = f" [截止:{task.deadline}]" if task.deadline else ""
            overdue_str = " ⚠️" if task.is_overdue() else ""
            display = f"{priority_text}[{task.priority}]{deadline_str}{overdue_str} {task.title}"
            self.task_listbox.insert(tk.END, display)

    def _add_task(self):
        """添加任务"""
        title = self.task_entry.get().strip()
        if not title:
            messagebox.showwarning("警告", "请输入任务名称")
            return
        priority = self.priority_var.get()
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
            btn_frame, text="🏔️ 扩大山体\n(网格 +1)",
            command=self._choose_expand, width=15, height=3
        )
        expand_btn.grid(row=0, column=0, padx=10)

        clearing_btn = tk.Button(
            btn_frame, text="🌲 开垦荒地\n(空地 +4)",
            command=self._choose_clearing, width=15, height=3
        )
        clearing_btn.grid(row=0, column=1, padx=10)

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
        """设置UI"""
        left_frame = tk.Frame(self)
        left_frame.pack(side="left", fill="both", expand=True, padx=10, pady=10)

        tk.Label(left_frame, text="🏔️ 珞珈山", font=("Arial", 14, "bold")).pack(pady=5)

        info_frame = tk.Frame(left_frame)
        info_frame.pack(fill="x", pady=5)
        tk.Label(info_frame, text=f"等级: Lv.{self.game.player.level}").pack(side="left")
        tk.Label(info_frame, text=f"  山体: {self.game.player.grid_size}×{self.game.player.grid_size}").pack(side="left")

        self.xp_progress = tk.DoubleVar()
        progress_bar = ttk.Progressbar(
            left_frame, variable=self.xp_progress,
            maximum=100, length=200
        )
        progress_bar.pack(pady=5)
        self.xp_label = tk.Label(left_frame, text="XP: 0 / 100")
        self.xp_label.pack()

        self.canvas = tk.Canvas(left_frame, width=300, height=300, bg="#90EE90")
        self.canvas.pack(pady=10)

        right_frame = tk.Frame(self)
        right_frame.pack(side="right", fill="both", expand=True, padx=10, pady=10)

        tk.Label(right_frame, text="🎒 背包", font=("Arial", 12, "bold")).pack(pady=5)

        scrollbar = tk.Scrollbar(right_frame)
        scrollbar.pack(side="right", fill="y")

        self.inventory_listbox = tk.Listbox(
            right_frame, yscrollcommand=scrollbar.set,
            font=("Arial", 10), height=10
        )
        self.inventory_listbox.pack(side="left", fill="both", expand=True)
        scrollbar.config(command=self.inventory_listbox.yview)

        self.inventory_listbox.bind("<Button-1>", self._on_inventory_click)

        tk.Label(right_frame, text="点击建筑后再点击地图放置", fg="gray").pack(pady=5)

        btn_frame = tk.Frame(right_frame)
        btn_frame.pack(pady=10)

        refresh_btn = tk.Button(btn_frame, text="🔄 刷新", command=self.refresh)
        refresh_btn.pack()

    def refresh(self):
        """刷新界面"""
        player = self.game.player
        self.xp_progress.set(player.get_xp_progress() * 100)
        self.xp_label.config(text=f"XP: {player.xp} / {int(player.get_xp_for_next_level())}")

        self.inventory_listbox.delete(0, tk.END)
        if not player.inventory:
            self.inventory_listbox.insert(tk.END, "(空)")
        else:
            for building_id in player.inventory:
                building = get_building_by_id(building_id)
                if building:
                    rarity_color = RARITY_COLORS.get(building["rarity"], "#000")
                    display = f"{building['emoji']} {building['name']}"
                    self.inventory_listbox.insert(tk.END, display)

        self._draw_grid()

    def _draw_grid(self):
        """绘制网格"""
        self.canvas.delete("all")
        player = self.game.player
        grid_size = player.grid_size

        cell_size = min(280 // grid_size, 80)
        offset_x = (300 - grid_size * cell_size) // 2
        offset_y = (300 - grid_size * cell_size) // 2

        self.cell_items = {}  # 存储格子对应的 item id

        for y in range(grid_size):
            for x in range(grid_size):
                key = f"{x},{y}"
                building_id = player.grid.get(key)
                is_unlocked = key in player.available_cells

                x1 = offset_x + x * cell_size
                y1 = offset_y + y * cell_size
                x2 = x1 + cell_size
                y2 = y1 + cell_size

                if building_id:
                    building = get_building_by_id(building_id)
                    if building:
                        rect = self.canvas.create_rectangle(
                            x1, y1, x2, y2, fill="#8B4513", outline="#654321", width=2
                        )
                        self.cell_items[rect] = (x, y)
                        self.canvas.create_text(
                            (x1 + x2) // 2, (y1 + y2) // 2,
                            text=building["emoji"], font=("Arial", cell_size // 3)
                        )
                elif is_unlocked:
                    # 已解锁的空地
                    rect = self.canvas.create_rectangle(
                        x1, y1, x2, y2, fill="#90EE90", outline="#228B22", width=2
                    )
                    self.cell_items[rect] = (x, y)
                    self.canvas.create_text(
                        (x1 + x2) // 2, (y1 + y2) // 2,
                        text="空", font=("Arial", cell_size // 4)
                    )
                else:
                    # 森林（未解锁）
                    rect = self.canvas.create_rectangle(
                        x1, y1, x2, y2, fill="#228B22", outline="#006400", width=2
                    )
                    self.cell_items[rect] = (x, y)
                    self.canvas.create_text(
                        (x1 + x2) // 2, (y1 + y2) // 2,
                        text="🌲", font=("Arial", cell_size // 4)
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
        # 找到点击位置下的 item
        item = self.canvas.find_closest(event.x, event.y)
        if item and item[0] in self.cell_items:
            x, y = self.cell_items[item[0]]
            self._on_cell_click(x, y)

    def _on_cell_click(self, x, y):
        """点击网格"""
        if self.selected_building is None:
            messagebox.showinfo("提示", "请先从背包选择一个建筑")
            return

        success = self.game.place_building(self.selected_building, x, y)
        if success:
            self.selected_building = None
            self.refresh()
        else:
            messagebox.showwarning("警告", "放置失败，该位置已有建筑")


class SettingsTab(tk.Frame):
    """设置标签页"""

    def __init__(self, parent, game, storage):
        super().__init__(parent)
        self.game = game
        self.storage = storage
        self._setup_ui()

    def _setup_ui(self):
        """设置UI"""
        info_frame = tk.Frame(self)
        info_frame.pack(pady=20)

        tk.Label(info_frame, text="⚙️ 设置", font=("Arial", 14, "bold")).pack(pady=10)

        player = self.game.player
        tk.Label(info_frame, text=f"当前等级: Lv.{player.level}").pack()
        tk.Label(info_frame, text=f"当前 XP: {player.xp}").pack()
        tk.Label(info_frame, text=f"背包物品: {len(player.inventory)}").pack()
        tk.Label(info_frame, text=f"山体大小: {player.grid_size}×{player.grid_size}").pack()

        btn_frame = tk.Frame(self)
        btn_frame.pack(pady=20)

        reset_btn = tk.Button(
            btn_frame, text="🔄 重置所有数据",
            command=self._reset_data, fg="red"
        )
        reset_btn.pack()

    def _reset_data(self):
        """重置数据"""
        if messagebox.askyesno("确认", "确定要重置所有数据吗？这将删除所有进度！"):
            self.storage.reset()
            messagebox.showinfo("成功", "数据已重置，请重启程序")
