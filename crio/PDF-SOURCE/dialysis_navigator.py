import tkinter as tk
import pyautogui
import pygetwindow as gw
import pyperclip


# ---------------------------------------
# Find Chrome
# ---------------------------------------

def get_chrome_window():
    chrome_windows = [
        w for w in gw.getAllWindows()
        if w.visible and "Google Chrome" in w.title
    ]

    if not chrome_windows:
        return None

    return chrome_windows[0]


# ---------------------------------------
# Search current Chrome window
# ---------------------------------------

def search_pdf(search_text):

    chrome = get_chrome_window()

    if not chrome:
        print("Google Chrome window not found.")
        return

    # Save current clipboard
    old_clipboard = pyperclip.paste()

    try:
        # Copy entire phrase instantly
        pyperclip.copy(search_text)

        # Restore Chrome if minimized
        if chrome.isMinimized:
            chrome.restore()

        # Navigate to Chrome
        chrome.activate()

        # Open Chrome Find
        pyautogui.hotkey("ctrl", "f")

        # Replace previous search
        pyautogui.hotkey("ctrl", "a")

        # Paste entire phrase instantly
        pyautogui.hotkey("ctrl", "v")

        # Go to result
        pyautogui.press("enter")

    finally:
        # Restore clipboard
        pyperclip.copy(old_clipboard)


# ---------------------------------------
# UI
# ---------------------------------------

root = tk.Tk()

root.title("Dialysis PDF Navigator")
root.geometry("300x400")
root.attributes("-topmost", True)


title = tk.Label(
    root,
    text="Dialysis PDF Navigator",
    font=("Arial", 15, "bold")
)

title.pack(pady=15)


buttons = [
    (
        "Cardiovascular Event Assessment",
        "Cardiovascular Event Assessment"
    ),

    (
        "Vital Sign",
        "heart rate"
    ),

    (
        "Dialysis Procedure",
        "dialysis procedure"
    ),

    (
        "Access Type",
        "Type of dialysis"
    ),

    (
        "Session Volume",
        "session volume"
    ),

    # (
    #     "Kt/V",
    #     "Single-pool"
    # ),

    (
        "Kit Numbers",
        "kit number"
    ),

    (
        "Administration",
        "time administration"
    ),
]


for label, search_text in buttons:

    tk.Button(
        root,
        text=label,
        width=27,
        height=2,
        command=lambda text=search_text: search_pdf(text)
    ).pack(pady=3)


root.mainloop()
