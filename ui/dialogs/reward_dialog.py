import tkinter as tk


class RewardDialog(tk.Toplevel):
    def __init__(self, parent, result):
        super().__init__(parent)
        self.title("任务完成")
        self.resizable(False, False)
        lines = [
            f"XP +{result.xp}",
            f"金币 +{result.coins}",
            f"建设度 +{result.campus_points}",
            f"连击 {result.streak_days} 天",
        ]
        if result.dropped_building:
            lines.append(
                f"获得建筑 {result.dropped_building['emoji']} {result.dropped_building['name']}"
            )
        if result.repeated_task:
            lines.append(f"已生成重复任务 {result.repeated_task.title}")

        tk.Label(self, text="任务完成", font=("Arial", 13, "bold")).pack(padx=16, pady=(16, 8))
        for line in lines:
            tk.Label(self, text=line, font=("Arial", 11)).pack(anchor="w", padx=16)
        tk.Button(self, text="关闭", command=self.destroy).pack(pady=16)
        self.grab_set()