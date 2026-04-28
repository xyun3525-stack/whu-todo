import tkinter as tk


class LevelUpDialog(tk.Toplevel):
    def __init__(self, parent, new_level, upgrade_options, on_choice):
        super().__init__(parent)
        self.title("Level Up!")
        self.resizable(False, False)
        self.transient(parent)

        self.on_choice = on_choice
        self.choice_made = False

        tk.Label(
            self, text=f"Level Up! Lv.{new_level}", font=("Arial", 16, "bold")
        ).pack(padx=16, pady=(20, 8))
        tk.Label(
            self, text="Choose your reward:", font=("Arial", 11)
        ).pack(padx=16, pady=(0, 16))

        for option in upgrade_options:
            btn = tk.Button(
                self,
                text=f"{option['label']}",
                font=("Arial", 12),
                bg="#90EE90",
                width=30,
                command=lambda opt=option: self._choose(opt),
            )
            btn.pack(padx=16, pady=6)

            tk.Label(
                self, text=option["desc"], font=("Arial", 9), fg="#555555"
            ).pack(padx=16, pady=(0, 12))

        self.grab_set()

    def destroy(self):
        try:
            self.grab_release()
        except tk.TclError:
            pass
        super().destroy()

    def _choose(self, option):
        self.choice_made = True
        try:
            self.grab_release()
        except tk.TclError:
            pass
        self.destroy()
        self.on_choice(option["type"])