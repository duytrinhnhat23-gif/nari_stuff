
(() => {
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

    // Extract all labs
    const histories = {};
    const latest = {};

    for (const [name, aliases] of Object.entries(LABS)) {
        const row = findRow(aliases);
        const history = extractHistory(row);

        histories[name] = history;
        latest[name] = history[0] ?? null;
    }

    // Calculate Kt/V average over trailing 3 calendar months
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

    // Output
    const summary = Object.entries(latest).map(([Test, r]) => ({
        Test,
        Date: r?.Date ?? null,
        Value: r?.Value ?? null
    }));

    summary.push({
        Test: "KT/V 3-MONTH MEAN",
        Date: `${dateString(startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate())} to ${dateString(today.getFullYear(), today.getMonth() + 1, today.getDate())}`,
        Value: ktvMean
    });

    console.log("LATEST LAB RESULTS");
    console.table(summary);

    console.log("KT/V THREE-MONTH HISTORY");
    console.table(ktvHistory);

    return { latest, ktvHistory, ktvMean };
})();
