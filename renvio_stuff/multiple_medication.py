
from playwright.sync_api import sync_playwright
from pathlib import Path
from datetime import datetime
import csv
import re
import traceback


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

SEARCH_URL = (
    BASE_URL + "/EMR/dialysismanager/patients/search"
)

LABS_URL = (
    BASE_URL + "/EMR/dialysismanager/patients/PatientLabs"
)

MEDICATIONS_URL = (
    BASE_URL
    + "/EMR/dialysismanager/patients/HomeMedsDU?Mode=view"
)

OUTPUT_DIR = Path(__file__).resolve().parent

OUTPUT_FILE = OUTPUT_DIR / (
    "Patient_Lab_Medication_Report_"
    + datetime.now().strftime("%Y%m%d_%H%M%S")
    + ".csv"
)

# Keep lab date columns hidden unless needed.
SHOW_LAB_DATES = False


# ============================================================
# JAVASCRIPT: LAB EXTRACTION
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
# JAVASCRIPT: CURRENT MEDICATIONS EXTRACTION
# ============================================================

MEDICATION_EXTRACTION_JS = r"""
() => {
    const table = [...document.querySelectorAll("table")]
        .find(table => {
            const headers = [
                ...table.querySelectorAll("thead th")
            ].map(th => th.textContent.trim());

            return headers.includes("Started on") &&
                   headers.includes("Previous dose") &&
                   !headers.includes("Discontinuation Date");
        });

    if (!table) {
        throw new Error(
            "Current Medicines table not found"
        );
    }

    const medications = [
        ...table.querySelectorAll("tbody tr")
    ].flatMap(tr => {
        const name = tr.querySelectorAll("td")[2]
            ?.textContent.trim();

        if (!name) return [];

        // Extract medication names in parentheses.
        // Example: Atorvastatin (Lipitor)
        const namesInParentheses = [
            ...name.matchAll(/\(([^()]*)\)/g)
        ].map(match => match[1].trim());

        // Remove parentheses from main name.
        const mainName = name
            .replace(/\([^()]*\)/g, "")
            .trim();

        return [
            mainName,
            ...namesInParentheses
        ].filter(Boolean);
    });

    window.currentMedications = medications;

    console.log("Current medications:", medications);

    return medications;
}
"""


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
    print(
        f"Searching: {last_name}, {first_name}",
        flush=True
    )

    # Always start from the Search Patient page.
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

    # Preserve original timing.
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
# VERIFY SELECTED PATIENT ON LABS PAGE
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
            print(
                f"  {lab}: NOT FOUND",
                flush=True
            )

    print(
        "  Kt/V 3-month mean:",
        result.get("ktvMean"),
        flush=True
    )

    return result


# ============================================================
# OPEN CURRENT MEDICATIONS PAGE
# ============================================================

def open_patient_medications(page):
    print(
        "Opening Current Medications page...",
        flush=True
    )

    page.goto(
        MEDICATIONS_URL,
        wait_until="domcontentloaded",
        timeout=30000
    )

    # Wait for the correct table headers to appear.
    page.wait_for_function(
        """() => [...document.querySelectorAll("table")]
            .some(table => {
                const headers = [
                    ...table.querySelectorAll("thead th")
                ].map(th => th.textContent.trim());

                return headers.includes("Started on") &&
                       headers.includes("Previous dose") &&
                       !headers.includes(
                           "Discontinuation Date"
                       );
            })""",
        timeout=20000
    )

    page.wait_for_timeout(500)


# ============================================================
# EXTRACT CURRENT MEDICATIONS
# ============================================================

def extract_medications(page):
    medications = page.evaluate(
        MEDICATION_EXTRACTION_JS
    )

    if not isinstance(medications, list):
        raise RuntimeError(
            "Invalid medication extraction result."
        )

    print(
        f"  Current medications found: {len(medications)}",
        flush=True
    )

    for medication in medications:
        print(
            f"    - {medication}",
            flush=True
        )

    return medications


# ============================================================
# BUILD CSV ROW
# ============================================================

LAB_COLUMNS = [
    ("KT/V SINGLE POOL", "Kt/V"),
    ("UREA REDUCTION RATIO", "URR"),
    ("HEMOGLOBIN A1C", "Hemoglobin A1c"),
    ("HEMOGLOBIN", "Hemoglobin"),
    ("PLATELET", "Platelet"),
    ("WBC", "WBC")
]


def build_row(
    last_name,
    first_name,
    result=None,
    medications=None,
    error=""
):
    row = {
        "Last Name": last_name,
        "First Name": first_name,
        "Status": "ERROR" if error else "OK",
        "Error": error
    }

    latest = result.get("latest", {}) if result else {}

    for lab_key, column_name in LAB_COLUMNS:
        record = latest.get(lab_key)

        row[column_name] = (
            record.get("Value", "") if record else ""
        )

        row[column_name + " Date"] = (
            record.get("Date", "") if record else ""
        )

    row["Kt/V 3-Month Mean"] = (
        result.get("ktvMean")
        if result and result.get("ktvMean") is not None
        else ""
    )

    row["Kt/V 3-Month Count"] = (
        len(result.get("ktvHistory", []))
        if result else ""
    )

    row["From Date"] = (
        result.get("fromDate", "") if result else ""
    )

    row["To Date"] = (
        result.get("toDate", "") if result else ""
    )

    # All medication names in one cell, separated by commas.
    row["Current Medications"] = (
        ", ".join(medications)
        if medications is not None
        else ""
    )

    return row


# ============================================================
# SAVE COMBINED CSV
# ============================================================

def save_csv(rows):
    columns = [
        "Last Name",
        "First Name",
        "Status",
        "Error"
    ]

    for _, column_name in LAB_COLUMNS:
        columns.append(column_name)

        if SHOW_LAB_DATES:
            columns.append(column_name + " Date")

    columns.extend([
        "Kt/V 3-Month Mean",
        "Kt/V 3-Month Count"
    ])

    if SHOW_LAB_DATES:
        columns.extend([
            "From Date",
            "To Date"
        ])

    # New column at the end of the existing lab columns.
    columns.append("Current Medications")

    with OUTPUT_FILE.open(
        "w",
        newline="",
        encoding="utf-8-sig"
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=columns,
            extrasaction="ignore"
        )

        writer.writeheader()
        writer.writerows(rows)

    print(
        "\nCSV saved:",
        OUTPUT_FILE,
        flush=True
    )


# ============================================================
# MAIN
# ============================================================

def main():
    if not PATIENTS:
        raise RuntimeError(
            "PATIENTS array is empty."
        )

    print(
        "Connecting to Chrome...",
        flush=True
    )

    rows = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.connect_over_cdp(
            CHROME_CDP,
            timeout=15000
        )

        if not browser.contexts:
            raise RuntimeError(
                "No Chrome browser context found."
            )

        context = browser.contexts[0]
        page = find_renvio_tab(context)

        if page is None:
            raise RuntimeError(
                "No Renvio tab found. Open and sign in "
                "to Renvio in Chrome first."
            )

        page.bring_to_front()

        total = len(PATIENTS)

        for index, (last_name, first_name) in enumerate(
            PATIENTS,
            start=1
        ):
            print(
                "\n" + "=" * 60,
                flush=True
            )

            print(
                f"PATIENT {index}/{total}: "
                f"{last_name}, {first_name}",
                flush=True
            )

            print(
                "=" * 60,
                flush=True
            )

            lab_result = None
            medications = None
            errors = []

            # ==========================================
            # STEP 1: SEARCH PATIENT
            # ==========================================

            try:
                search_patient(
                    page,
                    last_name,
                    first_name
                )

                # ======================================
                # STEP 2: EXTRACT LABS
                # ======================================

                open_patient_labs(page)

                lab_result = extract_labs(
                    page,
                    last_name,
                    first_name
                )

                # ======================================
                # STEP 3: EXTRACT CURRENT MEDICATIONS
                # ======================================

                try:
                    open_patient_medications(page)

                    medications = extract_medications(
                        page
                    )

                except Exception as med_error:
                    print(
                        "MEDICATION ERROR:",
                        med_error,
                        flush=True
                    )

                    traceback.print_exc()

                    errors.append(
                        "Medication extraction: "
                        + str(med_error)
                    )

            except Exception as error:
                print(
                    f"ERROR: {last_name}, {first_name}: "
                    f"{error}",
                    flush=True
                )

                traceback.print_exc()

                errors.append(
                    "Patient search or lab extraction: "
                    + str(error)
                )

            # ==========================================
            # STEP 4: BUILD ROW
            # ==========================================

            row = build_row(
                last_name,
                first_name,
                result=lab_result,
                medications=medications,
                error=" | ".join(errors)
            )

            rows.append(row)

            if errors:
                print(
                    f"PARTIAL/ERROR: {last_name}, "
                    f"{first_name}",
                    flush=True
                )
            else:
                print(
                    f"SUCCESS: {last_name}, "
                    f"{first_name}",
                    flush=True
                )

            # Save progress after each patient.
            save_csv(rows)

    # ==============================================
    # BATCH SUMMARY
    # ==============================================

    success_count = sum(
        row["Status"] == "OK"
        for row in rows
    )

    print("\n" + "=" * 60)
    print("BATCH COMPLETE")
    print("=" * 60)
    print("Total patients:", len(PATIENTS))
    print("Successful:", success_count)
    print("Errors:", len(PATIENTS) - success_count)
    print("Output:", OUTPUT_FILE)
    print("=" * 60)


if __name__ == "__main__":
    main()
