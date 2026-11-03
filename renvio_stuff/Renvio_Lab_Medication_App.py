
from playwright.sync_api import sync_playwright
from pathlib import Path
from datetime import datetime
import csv
import re
import traceback
import threading
import queue
import operator
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

# ============================================================
# CONFIGURATION
# ============================================================

# Format: (LAST_NAME, FIRST_NAME)
PATIENTS = [
    ("ALAS", "FELICITY"),
    ("ANGEL CANO", "SANTIAGO"),
    # ("ARREOLA", "OSCAR"),
    # ("AYALA MUNOZ", "ALICIA"),
    # ("BARAJAS", "FLAVIO"),
    # ("BARELA", "MARY"),
    # ("BERNAL", "BRENDA"),
    # ("BUGARIN", "JOSE"),
    # ("CAIRNEY", "WILLIAM"),
    # ("CARMONA", "MARTIN"),
    # ("CARRAZCO", "EDMUNDO"),
    # ("CHAVARIN", "FRANCISCO"),
    # ("CLARK", "SIR"),
]

CHROME_CDP = "http://127.0.0.1:9222"

BASE_URL = "https://dmmtprod.renvio.com"

SEARCH_URL = BASE_URL + "/EMR/dialysismanager/patients/search"
LABS_URL = BASE_URL + "/EMR/dialysismanager/patients/PatientLabs"
MEDS_URL = BASE_URL + "/EMR/dialysismanager/patients/HomeMedsDU?Mode=view"

OUTPUT_DIR = Path(__file__).resolve().parent

OUTPUT_FILE = OUTPUT_DIR / (
    "Patient_Lab_Report_"
    + datetime.now().strftime("%Y%m%d_%H%M%S")
    + ".csv"
)
SHOW_LAB_DATES = False
# The first search is performed through the existing Renvio
# search page. We do not navigate directly to PatientLabs
# until Search has been completed.

# ============================================================
# JAVASCRIPT EXTRACTION
# ============================================================

LAB_EXTRACTION_JS = r"""
() => {
    const LABS = {
        "KT/V SINGLE POOL": [
            "KT/V SINGLE POOL", "KT/V", "SPKT/V"
        ],
        "UREA REDUCTION RATIO": [
            "UREA REDUCTION RATIO", "URR"
        ],
        "HEMOGLOBIN A1C": [
            "HEMOGLOBIN A1C", "HBA1C"
        ],
        "HEMOGLOBIN": [
            "HEMOGLOBIN", "HGB"
        ],
        "PLATELET": [
            "PLATELET", "PLATELETS", "PLATELET COUNT"
        ],
        "WBC": [
            "WBC", "WHITE BLOOD CELL COUNT"
        ]
    };

    const normalize = text =>
        String(text || "")
            .trim()
            .replace(/\s+/g, " ")
            .toUpperCase();

    function dateString(year, month, day) {
        return [
            year,
            String(month).padStart(2, "0"),
            String(day).padStart(2, "0")
        ].join("-");
    }

    function validDate(year, month, day) {
        const date = new Date(year, month - 1, day);

        return date.getFullYear() === year &&
            date.getMonth() === month - 1 &&
            date.getDate() === day ? date : null;
    }

    function parseFullDate(text) {
        text = String(text || "").trim();

        let match = text.match(
            /(\d{1,2})\/(\d{1,2})\/(\d{4})/
        );

        if (match) {
            return validDate(
                Number(match[3]),
                Number(match[1]),
                Number(match[2])
            );
        }

        match = text.match(
            /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+(\d{4})\b/i
        );

        if (match) {
            const months = [
                "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
                "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
            ];

            return validDate(
                Number(match[3]),
                months.indexOf(match[1].toUpperCase()) + 1,
                Number(match[2])
            );
        }

        return null;
    }

    function findRow(aliases) {
        const label = [
            ...document.querySelectorAll(".lab-name-cell")
        ].find(element =>
            aliases.some(
                alias =>
                    normalize(element.textContent) ===
                    normalize(alias)
            )
        );

        return label?.closest("tr") || null;
    }

    function extractHistory(row) {
        if (!row) return [];

        const results = [];
        const currentYear = new Date().getFullYear();

        for (const span of row.querySelectorAll("td span[title]")) {
            const titleDate = parseFullDate(
                span.getAttribute("title")
            );

            const year = titleDate
                ? titleDate.getFullYear()
                : currentYear;

            for (const entry of span.innerHTML.split(";")) {
                const fragment = document.createElement("div");
                fragment.innerHTML = entry;

                const text = fragment.textContent.trim();

                // Example: 10.7(10/21)
                const annotated = text.match(
                    /([<>]?\s*-?\d+(?:\.\d+)?)\s*\(\s*(\d{1,2})\/(\d{1,2})\s*\)/
                );

                if (annotated) {
                    const date = validDate(
                        year,
                        Number(annotated[2]),
                        Number(annotated[3])
                    );

                    const value = Number(
                        annotated[1].replace(/[<>\s]/g, "")
                    );

                    if (date && Number.isFinite(value)) {
                        results.push({
                            Date: dateString(
                                date.getFullYear(),
                                date.getMonth() + 1,
                                date.getDate()
                            ),
                            Value: value
                        });
                    }

                    continue;
                }

                // Example: title="Oct 7 2026 12:00AM"
                // or title="10/7/2026 12:00:00 AM"
                if (titleDate) {
                    const match = text.match(
                        /^[<>]?\s*(-?\d+(?:\.\d+)?)/
                    );

                    if (match) {
                        const value = Number(match[1]);

                        if (Number.isFinite(value)) {
                            results.push({
                                Date: dateString(
                                    titleDate.getFullYear(),
                                    titleDate.getMonth() + 1,
                                    titleDate.getDate()
                                ),
                                Value: value
                            });
                        }
                    }
                }
            }
        }

        results.sort(
            (a, b) => b.Date.localeCompare(a.Date)
        );

        return results.filter((record, index, array) =>
            index === 0 ||
            record.Date !== array[index - 1].Date ||
            record.Value !== array[index - 1].Value
        );
    }

    // ==========================================
    // EXTRACT EACH LAB
    // ==========================================

    const latest = {};
    const histories = {};
    const rowFound = {};

    for (const [name, aliases] of Object.entries(LABS)) {
        const row = findRow(aliases);

        rowFound[name] = Boolean(row);

        const history = extractHistory(row);

        histories[name] = history;
        latest[name] = history[0] || null;
    }

    // ==========================================
    // KT/V THREE-MONTH MEAN
    // ==========================================

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const startDate = new Date(today);
    const originalDay = startDate.getDate();

    startDate.setDate(1);
    startDate.setMonth(startDate.getMonth() - 3);

    const lastDay = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + 1,
        0
    ).getDate();

    startDate.setDate(
        Math.min(originalDay, lastDay)
    );

    startDate.setHours(0, 0, 0, 0);

    const ktvHistory = histories["KT/V SINGLE POOL"]
        .filter(record => {
            const [year, month, day] = record.Date
                .split("-")
                .map(Number);

            const date = validDate(year, month, day);

            return date &&
                date >= startDate &&
                date <= today;
        });

    const ktvMean = ktvHistory.length
        ? Number((
            ktvHistory.reduce(
                (sum, record) => sum + record.Value,
                0
            ) / ktvHistory.length
        ).toFixed(3))
        : null;

    // Read the patient actually selected on the Labs page.
    const selectedPatient = document.querySelector(
        "app-patient-labs .selected-item"
    )?.textContent.trim() || "";

    return {
        latest,
        ktvHistory,
        ktvMean,
        rowFound,
        selectedPatient,
        fromDate: dateString(
            startDate.getFullYear(),
            startDate.getMonth() + 1,
            startDate.getDate()
        ),
        toDate: dateString(
            today.getFullYear(),
            today.getMonth() + 1,
            today.getDate()
        )
    };
}
"""

# ============================================================
# CURRENT MEDICATION EXTRACTION
# ============================================================

MED_EXTRACTION_JS = r"""
() => {
    const table = [...document.querySelectorAll("table")].find(table => {
        const headers = [...table.querySelectorAll("thead th")]
            .map(th => th.textContent.trim());
        return headers.includes("Started on") &&
               headers.includes("Previous dose") &&
               !headers.includes("Discontinuation Date");
    });

    if (!table) throw new Error("Current Medicines table not found");

    const medications = [...table.querySelectorAll("tbody tr")]
        .flatMap(tr => {
            const name = tr.querySelectorAll("td")[2]?.textContent.trim();
            if (!name) return [];
            const namesInParentheses = [...name.matchAll(/\(([^()]*)\)/g)]
                .map(match => match[1].trim());
            const mainName = name.replace(/\([^()]*\)/g, "").trim();
            return [mainName, ...namesInParentheses].filter(Boolean);
        });

    window.currentMedications = medications;
    return medications;
}
"""


def extract_medications(page):
    page.goto(MEDS_URL, wait_until="domcontentloaded", timeout=30000)
    page.wait_for_function(
        """() => [...document.querySelectorAll('table')].some(t => {
            const h = [...t.querySelectorAll('thead th')]
                .map(th => th.textContent.trim());
            return h.includes('Started on') &&
                   h.includes('Previous dose') &&
                   !h.includes('Discontinuation Date');
        })""",
        timeout=20000
    )
    medications = page.evaluate(MED_EXTRACTION_JS)
    print(f"  Current medications ({len(medications)}): " + ", ".join(medications), flush=True)
    return medications


# ============================================================
# FIND EXISTING RENVIO TAB
# ============================================================


def find_renvio_tab(context):
    for page in context.pages:
        try:
            if (
                not page.is_closed()
                and "dmmtprod.renvio.com" in page.url.lower()
            ):
                return page
        except Exception:
            continue

    return None


# ============================================================
# SEARCH PATIENT
# ============================================================

def search_patient(page, last_name, first_name):
    print(f"Searching: {last_name}, {first_name}", flush=True)

    # Always start a new patient from Search.
    page.goto(
        SEARCH_URL,
        wait_until="domcontentloaded",
        timeout=30000
    )

    page.locator("#lastName").wait_for(
        state="visible",
        timeout=20000
    )

    page.locator("#firstName").wait_for(
        state="visible",
        timeout=20000
    )

    page.locator("#lastName").fill(last_name)
    page.locator("#firstName").fill(first_name)

    search_button = page.get_by_role(
        "button",
        name="Search",
        exact=True
    )

    search_button.click()

    # Preserve the timing mechanism from the original script.
    page.wait_for_timeout(2000)

    print("Search completed.", flush=True)


# ============================================================
# OPEN PATIENT LABS
# ============================================================

def open_patient_labs(page):
    page.goto(
        LABS_URL,
        wait_until="domcontentloaded",
        timeout=30000
    )

    page.locator(
        "app-patient-labs .lab-name-cell"
    ).first.wait_for(
        state="attached",
        timeout=20000
    )

    page.wait_for_timeout(1000)


# ============================================================
# VERIFY SELECTED PATIENT
# ============================================================

def normalize_name(value):
    return re.sub(
        r"\s+",
        " ",
        str(value).strip().upper()
    )


def verify_patient(result, last_name, first_name):
    selected = result.get("selectedPatient", "")

    # Example:
    # MEYER, ROBERT (MR# S0814)
    match = re.match(
        r"^\s*(.*?)\s*,\s*(.*?)\s*\(MR#",
        selected,
        re.IGNORECASE
    )

    if not match:
        raise RuntimeError(
            "Could not verify selected patient on Labs page: "
            + repr(selected)
        )

    actual_last = normalize_name(match.group(1))
    actual_first = normalize_name(match.group(2))

    expected_last = normalize_name(last_name)
    expected_first = normalize_name(first_name)

    if (
        actual_last != expected_last
        or actual_first != expected_first
    ):
        raise RuntimeError(
            "Patient mismatch. Expected "
            f"{last_name}, {first_name}; "
            f"Labs page shows {selected}"
        )

    return selected


# ============================================================
# EXTRACT LABS
# ============================================================

def extract_labs(page, last_name, first_name):
    result = page.evaluate(LAB_EXTRACTION_JS)

    if not isinstance(result, dict):
        raise RuntimeError("Invalid JavaScript result.")

    selected = verify_patient(
        result,
        last_name,
        first_name
    )

    print("Verified patient:", selected, flush=True)

    latest = result.get("latest", {})

    for lab, record in latest.items():
        if record:
            print(
                f"  {lab}: {record['Value']} "
                f"({record['Date']})",
                flush=True
            )
        else:
            print(f"  {lab}: NOT FOUND", flush=True)

    print(
        "  Kt/V 3-month mean:",
        result.get("ktvMean"),
        flush=True
    )

    return result


# ============================================================
# BUILD CSV ROW
# ============================================================

LAB_COLUMNS = [
    ("KT/V SINGLE POOL", "Kt/V"),
    ("UREA REDUCTION RATIO", "URR"),
    ("HEMOGLOBIN A1C", "Hemoglobin A1c"),
    ("HEMOGLOBIN", "Hemoglobin"),
    ("PLATELET", "Platelet"),
    ("WBC", "WBC"),
]


def evaluate_condition(value, direction, inclusive, threshold):
    if value is None:
        return False
    if direction == "none":
        return True
    value = float(value)
    if direction == "eq":
        return value == threshold
    if direction == "lt":
        return value <= threshold if inclusive else value < threshold
    if direction == "gt":
        return value >= threshold if inclusive else value > threshold
    return True


class RenvioApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Renvio Lab & Medication Downloader")
        self.geometry("1080x820")
        self.minsize(790, 590)
        self.messages = queue.Queue()
        self.stop_event = threading.Event()
        self.running = False
        self.lab_controls = {}
        self.med_enabled = tk.BooleanVar(value=True)
        self.show_dates = tk.BooleanVar(value=False)
        self.output_dir = tk.StringVar(value=str(Path(__file__).resolve().parent))
        self._build()
        self.after(100, self._poll)

    def _build(self):
        outer = ttk.Frame(self, padding=12)
        outer.pack(fill="both", expand=True)
        ttk.Label(outer, text="Renvio Patient Lab & Medication Report", font=("Segoe UI", 16, "bold")).pack(anchor="w")
        ttk.Label(outer, text="Patients: LAST NAME, FIRST NAME — one per line. Drag the divider to resize the list.").pack(anchor="w", pady=(5, 4))

        pane = ttk.Panedwindow(outer, orient="vertical")
        pane.pack(fill="both", expand=True)
        upper = ttk.Frame(pane)
        lower = ttk.Frame(pane)
        pane.add(upper, weight=2)
        pane.add(lower, weight=3)

        patients_frame = ttk.Frame(upper)
        patients_frame.pack(fill="both", expand=True)
        self.patient_text = tk.Text(patients_frame, height=8, wrap="none", undo=True, font=("Consolas", 10))
        self.patient_text.pack(side="left", fill="both", expand=True)
        scrollbar = ttk.Scrollbar(patients_frame, orient="vertical", command=self.patient_text.yview)
        scrollbar.pack(side="right", fill="y")
        self.patient_text.configure(yscrollcommand=scrollbar.set)
        self.patient_text.insert("1.0", "\n".join(f"{last}, {first}" for last, first in PATIENTS))

        ttk.Label(lower, text="Lab selection and comparison filters", font=("Segoe UI", 11, "bold")).pack(anchor="w", pady=(6, 6))
        ttk.Label(lower, text="Select < or > and optionally = for ≤ or ≥. Select = alone for exact match. No operator = capture all values.").pack(anchor="w")
        table = ttk.Frame(lower)
        table.pack(fill="x", pady=(8, 4))
        for c, title in enumerate(("Get", "Lab", "<", ">", "=", "Threshold")):
            ttk.Label(table, text=title, font=("Segoe UI", 9, "bold")).grid(row=0, column=c, sticky="w", padx=10)
        for i, (key, label) in enumerate(LAB_COLUMNS, 1):
            enabled = tk.BooleanVar(value=True)
            direction = tk.StringVar(value="none")
            equal = tk.BooleanVar(value=False)
            threshold = tk.StringVar()
            ttk.Checkbutton(table, variable=enabled).grid(row=i, column=0, padx=10, pady=3)
            ttk.Label(table, text=label, width=22).grid(row=i, column=1, sticky="w", padx=10)
            ttk.Radiobutton(table, variable=direction, value="lt").grid(row=i, column=2, padx=10)
            ttk.Radiobutton(table, variable=direction, value="gt").grid(row=i, column=3, padx=10)
            ttk.Checkbutton(table, variable=equal).grid(row=i, column=4, padx=10)
            ttk.Entry(table, textvariable=threshold, width=14).grid(row=i, column=5, padx=10)
            # Equal checked without a direction is an exact-match filter.
            self.lab_controls[key] = (label, enabled, direction, equal, threshold)
        ttk.Button(table, text="Clear comparisons", command=self._clear_filters).grid(row=len(LAB_COLUMNS)+1, column=1, pady=6, sticky="w")
        ttk.Checkbutton(lower, text="Capture Current Medications", variable=self.med_enabled).pack(anchor="w", pady=(5, 0))
        ttk.Checkbutton(lower, text="Include lab date columns", variable=self.show_dates).pack(anchor="w")

        dest = ttk.Frame(lower)
        dest.pack(fill="x", pady=7)
        ttk.Label(dest, text="Save folder:").pack(side="left")
        ttk.Entry(dest, textvariable=self.output_dir).pack(side="left", fill="x", expand=True, padx=7)
        ttk.Button(dest, text="Browse", command=self._browse).pack(side="left")
        actions = ttk.Frame(lower)
        actions.pack(fill="x")
        self.start_button = ttk.Button(actions, text="Start", command=self._start)
        self.start_button.pack(side="left")
        self.stop_button = ttk.Button(actions, text="Stop after current patient", command=self.stop_event.set, state="disabled")
        self.stop_button.pack(side="left", padx=8)
        self.status = tk.StringVar(value="Ready")
        ttk.Label(actions, textvariable=self.status).pack(side="left", padx=12)
        logframe = ttk.LabelFrame(lower, text="Progress")
        logframe.pack(fill="both", expand=True, pady=(8, 0))
        self.log = tk.Text(logframe, height=8, state="disabled", font=("Consolas", 9))
        self.log.pack(fill="both", expand=True)

    def _clear_filters(self):
        for _, _, direction, equal, threshold in self.lab_controls.values():
            direction.set("none")
            equal.set(False)
            threshold.set("")

    def _browse(self):
        folder = filedialog.askdirectory(initialdir=self.output_dir.get())
        if folder:
            self.output_dir.set(folder)

    def _parse_patients(self):
        result = []
        for line_no, raw in enumerate(self.patient_text.get("1.0", "end").splitlines(), 1):
            raw = raw.strip()
            if not raw or raw.startswith("#"):
                continue
            parts = raw.split(",", 1)
            if len(parts) != 2 or not all(part.strip() for part in parts):
                raise ValueError(f"Patient line {line_no}: expected LAST NAME, FIRST NAME")
            result.append(tuple(part.strip() for part in parts))
        if not result:
            raise ValueError("Enter at least one patient")
        return result

    def _settings(self):
        settings = {}
        for key, (label, enabled, direction, equal, threshold) in self.lab_controls.items():
            if not enabled.get():
                continue
            op = direction.get()
            eq = equal.get()
            if op == "none" and eq:
                op = "eq"
            if op != "none":
                try:
                    number = float(threshold.get().strip())
                except ValueError:
                    raise ValueError(f"{label}: enter a numeric threshold")
            else:
                number = None
            settings[key] = (label, op, eq, number)
        if not settings and not self.med_enabled.get():
            raise ValueError("Select at least one lab or Current Medications")
        return settings

    def _start(self):
        if self.running:
            return
        try:
            patients = self._parse_patients()
            settings = self._settings()
            folder = Path(self.output_dir.get()).expanduser()
            folder.mkdir(parents=True, exist_ok=True)
        except Exception as exc:
            messagebox.showerror("Invalid configuration", str(exc))
            return
        output = folder / ("Patient_Lab_Medication_Report_" + datetime.now().strftime("%Y%m%d_%H%M%S") + ".csv")
        self.stop_event.clear()
        self.running = True
        self.start_button.configure(state="disabled")
        self.stop_button.configure(state="normal")
        self.status.set("Running...")
        thread = threading.Thread(target=self._worker, args=(patients, settings, self.med_enabled.get(), self.show_dates.get(), output), daemon=True)
        thread.start()

    def _emit(self, msg):
        self.messages.put(("log", msg))

    def _poll(self):
        try:
            while True:
                kind, payload = self.messages.get_nowait()
                if kind == "log":
                    self.log.configure(state="normal")
                    self.log.insert("end", payload + "\n")
                    self.log.see("end")
                    self.log.configure(state="disabled")
                elif kind == "done":
                    self.running = False
                    self.start_button.configure(state="normal")
                    self.stop_button.configure(state="disabled")
                    self.status.set(payload)
        except queue.Empty:
            pass
        self.after(100, self._poll)

    def _worker(self, patients, settings, capture_meds, show_dates, output):
        columns = ["Last Name", "First Name", "Status", "Error"]
        for key, (label, op, eq, number) in settings.items():
            columns.append(label)
            if show_dates:
                columns.append(label + " Date")
            if op != "none":
                columns.append(label + " Matches")
        if "KT/V SINGLE POOL" in settings:
            columns.extend(["Kt/V 3-Month Mean", "Kt/V 3-Month Count"])
        if show_dates:
            columns.extend(["From Date", "To Date"])
        if capture_meds:
            columns.append("Current Medications")
        rows = []
        try:
            with sync_playwright() as playwright:
                browser = playwright.chromium.connect_over_cdp(CHROME_CDP, timeout=15000)
                if not browser.contexts:
                    raise RuntimeError("No Chrome browser context found")
                page = find_renvio_tab(browser.contexts[0])
                if page is None:
                    raise RuntimeError("Open and sign in to Renvio in Chrome first")
                page.bring_to_front()
                for index, (last, first) in enumerate(patients, 1):
                    if self.stop_event.is_set():
                        self._emit("Stopped by user")
                        break
                    self._emit(f"[{index}/{len(patients)}] {last}, {first}")
                    row = {"Last Name": last, "First Name": first, "Status": "OK", "Error": ""}
                    errors = []
                    try:
                        search_patient(page, last, first)
                        if settings:
                            open_patient_labs(page)
                            labs = extract_labs(page, last, first)  # verifies patient identity
                            for key, (label, op, eq, number) in settings.items():
                                record = labs.get("latest", {}).get(key)
                                value = record.get("Value") if record else None
                                row[label] = value if value is not None else ""
                                if show_dates:
                                    row[label + " Date"] = record.get("Date", "") if record else ""
                                if op != "none":
                                    row[label + " Matches"] = "YES" if evaluate_condition(value, op, eq, number) else "NO"
                            if "KT/V SINGLE POOL" in settings:
                                row["Kt/V 3-Month Mean"] = labs.get("ktvMean") if labs.get("ktvMean") is not None else ""
                                row["Kt/V 3-Month Count"] = len(labs.get("ktvHistory", []))
                            if show_dates:
                                row["From Date"] = labs.get("fromDate", "")
                                row["To Date"] = labs.get("toDate", "")
                    except Exception as exc:
                        errors.append("Labs/search: " + str(exc))
                        self._emit("  Labs/search ERROR: " + str(exc))
                    # Do not extract medications after failed search or patient verification.
                    if capture_meds and not errors:
                        try:
                            open_patient_medications(page)
                            meds = extract_medications(page)
                            row["Current Medications"] = ", ".join(meds)
                            self._emit(f"  Medications: {len(meds)} names")
                        except Exception as exc:
                            errors.append("Medications: " + str(exc))
                            self._emit("  Medication ERROR: " + str(exc))
                    if errors:
                        row["Status"] = "ERROR"
                        row["Error"] = " | ".join(errors)
                    rows.append(row)
                    # Save after each patient so interrupted runs retain progress.
                    with output.open("w", newline="", encoding="utf-8-sig") as file:
                        writer = csv.DictWriter(file, fieldnames=columns, extrasaction="ignore")
                        writer.writeheader()
                        writer.writerows(rows)
                    self._emit("  Saved: " + str(output))
            self.messages.put(("done", f"Finished {len(rows)}/{len(patients)} patients. CSV: {output}"))
        except Exception as exc:
            self._emit("FATAL ERROR: " + str(exc))
            self._emit(traceback.format_exc())
            self.messages.put(("done", "Failed: " + str(exc)))


if __name__ == "__main__":
    RenvioApp().mainloop()
