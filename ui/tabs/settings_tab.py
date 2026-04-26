import tkinter as tk
from tkinter import messagebox


class SettingsTab(tk.Frame):
    def __init__(self, parent, game, storage):
        super().__init__(parent, bg="#FFFFFF")
        self.game = game
        self.storage = storage
        self.summary_var = tk.StringVar()
        tk.Label(self, text="设置", font=("Arial", 14, "bold"), bg="#FFFFFF").pack(anchor="w", padx=16, pady=(16, 8))
        tk.Label(self, textvariable=self.summary_var, font=("Arial", 11), bg="#FFFFFF", justify="left").pack(anchor="w", padx=16)
        tk.Button(self, text="重置本地数据", fg="red", command=self._reset_data).pack(anchor="w", padx=16, pady=12)

    def refresh(self):
        self.summary_var.set(
            f"山体: {self.game.campus.name}\n"
            f"等级: Lv.{self.game.player.level}\n"
            f"金币: {self.game.player.coins}\n"
            f"背包: {len(self.game.collection.inventory)}\n"
            f"图鉴: {len(self.game.collection.catalog)}"
        )

    def _reset_data(self):
        confirmed = messagebox.askyesno("确认", "确定要重置所有本地数据吗？")
        if not confirmed:
            return
        self.storage.reset()
        messagebox.showinfo("完成", "数据已清空，重新启动应用后会生成新存档。")