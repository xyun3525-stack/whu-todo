import tkinter as tk


class RewardDialog(tk.Toplevel):
    def __init__(self, parent, result):
        super().__init__(parent)
        self.title("Task Completed")
        self.resizable(False, False)
        self.transient(parent)

        lines = [
            f"XP +{result.xp}",
            f"Coins +{result.coins}",
            f"Campus Points +{result.campus_points}",
            f"Streak {result.streak_days} day(s)",
        ]

        if result.dropped_building:
            lines.append(
                f"Drop: {result.dropped_building['emoji']} {result.dropped_building['name']}"
            )
        if result.repeated_task:
            lines.append(f"Next Repeat Task: {result.repeated_task.title}")

        tk.Label(self, text="Completion Rewards", font=("Arial", 13, "bold")).pack(
            padx=16, pady=(16, 8)
        )
        for line in lines:
            tk.Label(self, text=line, font=("Arial", 11)).pack(anchor="w", padx=16)

        tk.Button(self, text="Close", command=self.destroy).pack(pady=16)
        self.protocol("WM_DELETE_WINDOW", self.destroy)
        self.grab_set()

    def destroy(self):
        try:
            self.grab_release()
        except tk.TclError:
            pass
        super().destroy()
