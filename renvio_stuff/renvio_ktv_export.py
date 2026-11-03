
from playwright.sync_api import (
    sync_playwright,
    TimeoutError as PlaywrightTimeoutError
)
from pathlib import Path
from datetime import datetime
import re
import csv
import traceback


# ==========================================
# CONFIGURATION
# ==========================================

FIRST_NAME = "robert"
LAST_NAME = "meyer"

CHROME_CDP = "http://127.0.0.1:9222"

BASE_URL = "https://dmmtprod.renvio.com"

SEARCH_URL = (
    BASE_URL + "/EMR/dialysismanager/patients/search"
)

LABS_URL = (
    BASE_URL + "/EMR/dialysismanager/patients/PatientLabs"
)

# Save CSV files in the same folder as this script
OUTPUT_DIR = Path(__file__).resolve().parent
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ==========================================
# JAVASCRIPT LAB EXTRACTION
# ==========================================

LAB_EXTRACTION_JS = r"""
() => {
    const LABS = {
        "KT/V SINGLE POOL": ["KT/V SINGLE POOL", "KT/V", "SPKT/V"],
        "UREA REDUCTION RATIO": ["UREA REDUCTION RATIO", "URR"],
        "HEMOGLOBIN A1C": ["HEMOGLOBIN A1C", "HBA1C"],
        "HEMOGLOBIN": ["HEMOGLOBIN", "HGB"],
        "PLATELET": ["PLATELET", "PLATELETS", "PLATELET COUNT"],
        "WBC": ["WBC", "WHITE BLOOD CELL COUNT"]
    };

    const normalize = text =>
        String(text || "").trim().replace(/\s+/g, " ").toUpperCase();

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

        // 10/7/2026
        let m = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);

        if (m) {
            return validDate(+m[3], +m[1], +m[2]);
        }

        // Oct 7 2026 / Sep 9 2026
        m = text.match(
            /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+(\d{4})\b/i
        );

        if (m) {
            const months = [
                "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
                "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
            ];

            return validDate(
                +m[3],
                months.indexOf(m[1].toUpperCase()) + 1,
                +m[2]
            );
        }

        return null;
    }

    function findRow(aliases) {
        return [...document.querySelectorAll(".lab-name-cell")]
            .find(el => aliases.some(
                alias => normalize(el.textContent) === normalize(alias)
            ))?.closest("tr") || null;
    }

    function extractHistory(row) {
        if (!row) return [];

        const results = [];
        const currentYear = new Date().getFullYear();

        for (const span of row.querySelectorAll("td span[title]")) {
            const titleDate = parseFullDate(span.getAttribute("title"));
            const year = titleDate?.getFullYear() ?? currentYear;

            for (const entry of span.innerHTML.split(";")) {
                const fragment = document.createElement("div");
                fragment.innerHTML = entry;

                const text = fragment.textContent.trim();

                // Multiple results, e.g. 10.7(10/21)
                const annotated = text.match(
                    /([<>]?\s*-?\d+(?:\.\d+)?)\s*\(\s*(\d{1,2})\/(\d{1,2})\s*\)/
                );

                if (annotated) {
                    const date = validDate(
                        year,
                        Number(annotated[2]),
                        Number(annotated[3])
                    );

                    if (date) {
                        results.push({
                            Date: dateString(
                                date.getFullYear(),
                                date.getMonth() + 1,
                                date.getDate()
                            ),
                            Value: Number(
                                annotated[1].replace(/[<>\s]/g, "")
                            )
                        });
                    }

                    continue;
                }

                // Single result with full date in title
                if (titleDate) {
                    const value = text.match(
                        /^[<>]?\s*(-?\d+(?:\.\d+)?)/
                    );

                    if (value) {
                        results.push({
                            Date: dateString(
                                titleDate.getFullYear(),
                                titleDate.getMonth() + 1,
                                titleDate.getDate()
                            ),
                            Value: Number(value[1])
                        });
                    }
                }
            }
        }

        results.sort((a, b) => b.Date.localeCompare(a.Date));

        return results.filter((r, i, arr) =>
            i === 0 ||
            r.Date !== arr[i - 1].Date ||
            r.Value !== arr[i - 1].Value
        );
    }

    // ======================================
    // EXTRACT ALL LABS
    // ======================================

    const histories = {};
    const latest = {};
    const rowsFound = {};

    for (const [name, aliases] of Object.entries(LABS)) {
        const row = findRow(aliases);
        const history = extractHistory(row);

        histories[name] = history;
        latest[name] = history[0] ?? null;
        rowsFound[name] = Boolean(row);
    }

    // ======================================
    // KT/V: TRAILING 3 CALENDAR MONTHS
    // ======================================

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

    startDate.setDate(Math.min(originalDay, lastDay));
    startDate.setHours(0, 0, 0, 0);

    const ktvHistory = histories["KT/V SINGLE POOL"].filter(r => {
        const [y, m, d] = r.Date.split("-").map(Number);
        const date = validDate(y, m, d);

        return date && date >= startDate && date <= today;
    });

    const ktvMean = ktvHistory.length
        ? Number((
            ktvHistory.reduce((sum, r) => sum + r.Value, 0) /
            ktvHistory.length
        ).toFixed(3))
        : null;

    // ======================================
    // OUTPUT
    // ======================================

    const summary = Object.entries(latest).map(([Test, r]) => ({
        Test,
        Date: r?.Date ?? null,
        Value: r?.Value ?? null
    }));

    summary.push({
        Test: "KT/V 3-MONTH MEAN",
        Date:
            dateString(
                startDate.getFullYear(),
                startDate.getMonth() + 1,
                startDate.getDate()
            ) +
            " to " +
            dateString(
                today.getFullYear(),
                today.getMonth() + 1,
                today.getDate()
            ),
        Value: ktvMean
    });

    console.log("LATEST LAB RESULTS");
    console.table(summary);

    console.log("KT/V THREE-MONTH HISTORY");
    console.table(ktvHistory);

    return {
        latest,
        histories,
        ktvHistory,
        ktvMean,
        summary,
        rowsFound,
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


# ==========================================
# FIND RENVIO TAB
# ==========================================

def find_renvio_tab(context):
    print(
        "STEP 3: Searching for Renvio tab...",
        flush=True
    )

    for page in context.pages:
        try:
            if page.is_closed():
                continue

            if "dmmtprod.renvio.com" in page.url.lower():
                print(
                    "Found Renvio tab:",
                    page.url,
                    flush=True
                )
                return page

        except Exception:
            continue

    return None


# ==========================================
# SEARCH PATIENT
# ==========================================

def search_patient(page):
    print(
        "STEP 4: Opening Patient Search...",
        flush=True
    )

    if (
        page.locator("#lastName").count() == 0
        or page.locator("#firstName").count() == 0
    ):
        page.goto(
            SEARCH_URL,
            wait_until="domcontentloaded",
            timeout=30000
        )

    page.wait_for_selector(
        "#lastName",
        timeout=20000
    )

    page.wait_for_selector(
        "#firstName",
        timeout=20000
    )

    print(
        "STEP 5: Entering patient name...",
        flush=True
    )

    page.locator("#lastName").fill(LAST_NAME)
    page.locator("#firstName").fill(FIRST_NAME)

    print(
        f"Patient: {FIRST_NAME} {LAST_NAME}",
        flush=True
    )

    search_button = page.get_by_role(
        "button",
        name="Search",
        exact=True
    )

    if search_button.count() == 0:
        raise RuntimeError(
            "Search button not found."
        )

    search_button.click(timeout=10000)

    print(
        "STEP 6: Search clicked.",
        flush=True
    )

    page.wait_for_timeout(2000)

    # The selected patient must be correct before
    # navigating to PatientLabs.
    # This follows the same mechanism as your old script.


# ==========================================
# OPEN PATIENT LABS
# ==========================================

def open_patient_labs(page):
    print(
        "STEP 7: Opening PatientLabs...",
        flush=True
    )

    page.goto(
        LABS_URL,
        wait_until="domcontentloaded",
        timeout=30000
    )

    page.bring_to_front()

    print(
        "PatientLabs URL:",
        page.url,
        flush=True
    )

    print(
        "STEP 8: Waiting for lab table...",
        flush=True
    )

    try:
        page.locator(
            "tr .lab-name-cell"
        ).first.wait_for(
            state="attached",
            timeout=20000
        )

        print(
            "Lab table detected.",
            flush=True
        )

    except PlaywrightTimeoutError:
        print(
            "WARNING: Lab table not detected within 20 seconds.",
            flush=True
        )

    page.wait_for_timeout(1000)


# ==========================================
# EXTRACT LAB VALUES
# ==========================================

def extract_labs(page):
    print(
        "STEP 9: Extracting laboratory values...",
        flush=True
    )

    result = page.evaluate(LAB_EXTRACTION_JS)

    if not isinstance(result, dict):
        raise RuntimeError(
            "JavaScript did not return valid lab results."
        )

    print("\nLATEST LABORATORY RESULTS")
    print("-" * 65)

    for record in result.get("summary", []):
        print(
            f"{record['Test']:<25} "
            f"{str(record['Date'] or 'N/A'):<27} "
            f"{record['Value'] if record['Value'] is not None else 'N/A'}"
        )

    print("-" * 65)

    print(
        "Kt/V 3-month records:",
        len(result.get("ktvHistory", [])),
        flush=True
    )

    return result


# ==========================================
# SAVE CSV REPORTS
# ==========================================

def save_report(result):
    print(
        "STEP 10: Saving CSV reports...",
        flush=True
    )

    safe_first = re.sub(
        r"[^a-zA-Z0-9_-]",
        "_",
        FIRST_NAME
    )

    safe_last = re.sub(
        r"[^a-zA-Z0-9_-]",
        "_",
        LAST_NAME
    )

    prefix = f"{safe_first}_{safe_last}"

    summary_path = OUTPUT_DIR / (
        f"{prefix}_Lab_Summary.csv"
    )

    history_path = OUTPUT_DIR / (
        f"{prefix}_KtV_History.csv"
    )

    patient_name = (
        f"{FIRST_NAME.title()} {LAST_NAME.title()}"
    )

    # ======================================
    # CSV 1: LAB SUMMARY
    # ======================================

    with open(
        summary_path,
        "w",
        newline="",
        encoding="utf-8-sig"
    ) as file:

        writer = csv.writer(file)

        writer.writerow([
            "Patient",
            "Laboratory Test",
            "Lab Date / Period",
            "Value"
        ])

        for record in result.get("summary", []):
            writer.writerow([
                patient_name,
                record["Test"],
                record["Date"] or "",
                (
                    record["Value"]
                    if record["Value"] is not None
                    else ""
                )
            ])

    # ======================================
    # CSV 2: KT/V HISTORY
    # ======================================

    with open(
        history_path,
        "w",
        newline="",
        encoding="utf-8-sig"
    ) as file:

        writer = csv.writer(file)

        writer.writerow([
            "Patient",
            "Lab Date",
            "Kt/V",
            "3-Month Mean"
        ])

        history = result.get("ktvHistory", [])
        mean = result.get("ktvMean")

        if history:
            for index, record in enumerate(history):
                writer.writerow([
                    patient_name,
                    record["Date"],
                    f"{record['Value']:.3f}",
                    (
                        f"{mean:.3f}"
                        if index == 0 and mean is not None
                        else ""
                    )
                ])

        else:
            writer.writerow([
                patient_name,
                "",
                "",
                ""
            ])

    print(
        "Lab Summary CSV:",
        summary_path,
        flush=True
    )

    print(
        "Kt/V History CSV:",
        history_path,
        flush=True
    )

    return summary_path, history_path


# ==========================================
# MAIN
# ==========================================

def main():
    print(
        "STEP 1: Starting Playwright...",
        flush=True
    )

    with sync_playwright() as p:

        print(
            "STEP 2: Connecting to Chrome...",
            flush=True
        )

        browser = p.chromium.connect_over_cdp(
            CHROME_CDP,
            timeout=15000
        )

        print(
            "Connected to Chrome.",
            flush=True
        )

        if not browser.contexts:
            raise RuntimeError(
                "No Chrome browser context found."
            )

        context = browser.contexts[0]

        print(
            f"Found {len(context.pages)} Chrome tabs.",
            flush=True
        )

        page = find_renvio_tab(context)

        if page is None:
            raise RuntimeError(
                "No Renvio tab found. "
                "Open Renvio in Chrome first."
            )

        page.bring_to_front()

        search_patient(page)

        open_patient_labs(page)

        result = extract_labs(page)

        summary_path, history_path = save_report(result)

        print("\n" + "=" * 65)
        print("EXTRACTION COMPLETE")
        print("=" * 65)

        print(
            "Patient:",
            f"{FIRST_NAME.title()} {LAST_NAME.title()}"
        )

        print(
            "Latest laboratory tests:",
            len(result.get("latest", {}))
        )

        print(
            "Kt/V records in last 3 months:",
            len(result.get("ktvHistory", []))
        )

        print(
            "Kt/V 3-month mean:",
            result.get("ktvMean")
        )

        print(
            "Summary CSV:",
            summary_path
        )

        print(
            "History CSV:",
            history_path
        )

        print("=" * 65)


if __name__ == "__main__":
    try:
        main()

    except Exception as e:
        print(
            "\nERROR:",
            str(e),
            flush=True
        )

        traceback.print_exc()
