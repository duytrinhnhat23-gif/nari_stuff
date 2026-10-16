async function fillPEAKForm(data) {

    const wait = (ms = 50) =>
        new Promise(r => setTimeout(r, Math.min(ms, 50)));

    const MONTHS = {
        JAN: "January",
        FEB: "February",
        MAR: "March",
        APR: "April",
        MAY: "May",
        JUN: "June",
        JUL: "July",
        AUG: "August",
        SEP: "September",
        OCT: "October",
        NOV: "November",
        DEC: "December"
    };


    // ============================================================
    // COMMON HELPERS
    // ============================================================

    function parseDateTime(value) {

        if (!value)
            throw new Error("Date/time value is empty");

        const m = value.match(
            /^(\d{1,2})-([A-Z]{3})-(\d{4})\s+(\d{2}):(\d{2})$/
        );

        if (!m)
            throw new Error("Invalid date/time: " + value);

        return {
            day: parseInt(m[1], 10),
            month: MONTHS[m[2]],
            year: m[3],
            hour: m[4],
            minute: m[5]
        };
    }


    async function setInput(input, value) {

        if (!input)
            throw new Error("Input not found");

        input.focus();

        // Clear existing value like a user
        input.select();

        document.execCommand(
            "insertText",
            false,
            String(value)
        );

        // Trigger React/browser events
        input.dispatchEvent(
            new InputEvent("input", {
                bubbles: true,
                inputType: "insertText",
                data: String(value)
            })
        );

        input.dispatchEvent(
            new Event("change", {
                bubbles: true
            })
        );

        // Important: commit field
        input.dispatchEvent(
            new FocusEvent("blur", {
                bubbles: true
            })
        );

        input.blur();

        await new Promise(
            r => setTimeout(r, 100)
        );
    }


    function key(input, name, code) {

        input.dispatchEvent(
            new KeyboardEvent("keydown", {
                key: name,
                code: name,
                keyCode: code,
                which: code,
                bubbles: true,
                cancelable: true
            })
        );
    }


    async function selectYes(fieldSelector, name) {

        const field =
            document.querySelector(fieldSelector);

        if (!field)
            throw new Error(`${name} field not found`);

        const yes =
            [...field.querySelectorAll("label")]
                .find(x =>
                    x.textContent.trim().toLowerCase() === "yes"
                );

        if (!yes)
            throw new Error(`${name}: Yes not found`);

        yes.click();

        await wait();

        console.log(`✅ ${name} = Yes`);
    }


    async function setDate(fieldSelector, value) {

        const target = parseDateTime(value);

        const field = document.querySelector(fieldSelector);

        if (!field)
            throw new Error("Date field not found");


        // ============================================================
        // OPEN CALENDAR
        // ============================================================

        const button = [...field.querySelectorAll("button")]
            .find(b =>
                b.textContent.includes("calendar_today")
            );

        if (!button)
            throw new Error("Calendar button not found");

        button.click();

        await new Promise(r => setTimeout(r, 150));


        // ============================================================
        // FIND VISIBLE CALENDAR
        // ============================================================

        const calendar = [...document.querySelectorAll(
            '.calendar-popover[role="dialog"]'
        )].find(el => {

            const rect = el.getBoundingClientRect();

            return (
                rect.width > 0 &&
                rect.height > 0
            );
        });


        if (!calendar)
            throw new Error("Calendar did not open");


        const monthNames = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December"
        ];


        const targetMonth =
            monthNames.indexOf(target.month);

        const targetYear =
            Number(target.year);


        // ============================================================
        // READ CURRENT MONTH / YEAR
        // ============================================================

        function getCalendarMonthYear() {

            // Try month selector
            const monthElement =
                calendar.querySelector(
                    '[data-testid="month-select"]'
                );


            let monthText =
                monthElement?.textContent?.trim() || "";


            // Fallback: search calendar text
            if (!monthText) {

                monthText =
                    calendar.textContent || "";
            }


            let monthIndex = -1;

            for (
                let i = 0;
                i < monthNames.length;
                i++
            ) {

                if (
                    monthText
                        .toLowerCase()
                        .includes(
                            monthNames[i].toLowerCase()
                        )
                ) {

                    monthIndex = i;
                    break;
                }
            }


            // YEAR
            let year = NaN;


            const yearInput =
                calendar.querySelector(
                    'input[type="number"]'
                );


            if (yearInput?.value) {

                year =
                    parseInt(
                        yearInput.value,
                        10
                    );
            }


            // Fallback: find 4-digit year
            if (!Number.isFinite(year)) {

                const match =
                    calendar.textContent.match(
                        /\b(20\d{2})\b/
                    );

                if (match) {

                    year =
                        parseInt(
                            match[1],
                            10
                        );
                }
            }


            return {
                monthIndex,
                month:
                    monthIndex >= 0
                        ? monthNames[monthIndex]
                        : "",
                year
            };
        }



        // ============================================================
        // FIND PREVIOUS / NEXT BUTTONS
        // ============================================================

        function getNavigationButtons() {

            const buttons =
                [...calendar.querySelectorAll("button")];


            let previous = null;
            let next = null;


            for (const b of buttons) {

                const info = (

                    (b.getAttribute("aria-label") || "") +
                    " " +
                    (b.getAttribute("title") || "") +
                    " " +
                    (b.textContent || "") +
                    " " +
                    (b.className || "")

                ).toLowerCase();


                if (
                    !previous &&
                    (
                        info.includes("previous") ||
                        info.includes("prev") ||
                        info.includes("rdrpprevbutton") ||
                        info.includes("chevron_left")
                    )
                ) {

                    previous = b;
                }


                if (
                    !next &&
                    (
                        info.includes("next") ||
                        info.includes("rdrnextbutton") ||
                        info.includes("chevron_right")
                    )
                ) {

                    next = b;
                }
            }


            // React Date Range fallback
            previous ||=
                calendar.querySelector(
                    ".rdrPprevButton"
                );


            next ||=
                calendar.querySelector(
                    ".rdrNextButton"
                );


            return {
                previous,
                next
            };
        }



        // ============================================================
        // NAVIGATE MONTH
        // ============================================================

        let current =
            getCalendarMonthYear();


        console.log(
            `📅 Calendar starts at: ${current.month} ${current.year}`
        );

        console.log(
            `🎯 Target date: ${target.day} ${target.month} ${target.year}`
        );


        if (
            current.monthIndex === -1 ||
            !Number.isFinite(current.year)
        ) {

            throw new Error(
                "Cannot determine calendar current month/year"
            );
        }


        let currentNumber =
            current.year * 12 +
            current.monthIndex;


        const targetNumber =
            targetYear * 12 +
            targetMonth;


        let monthsToMove =
            targetNumber -
            currentNumber;


        console.log(
            `📅 Months to move: ${monthsToMove}`
        );


        // Safety
        if (
            Math.abs(monthsToMove) > 120
        ) {

            throw new Error(
                "Calendar target is too far away"
            );
        }



        // ============================================================
        // MOVE ONE MONTH AT A TIME
        // ============================================================

        let safety = 0;


        while (
            monthsToMove !== 0 &&
            safety < 120
        ) {

            safety++;


            const {
                previous,
                next
            } =
                getNavigationButtons();


            let navButton;


            if (monthsToMove < 0) {

                navButton = previous;

                console.log(
                    "⬅️ Previous month"
                );

            } else {

                navButton = next;

                console.log(
                    "➡️ Next month"
                );
            }


            if (!navButton) {

                throw new Error(
                    monthsToMove < 0
                        ? "Previous month button not found"
                        : "Next month button not found"
                );
            }


            // Use real mouse events
            navButton.dispatchEvent(
                new MouseEvent(
                    "mousedown",
                    {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    }
                )
            );


            navButton.dispatchEvent(
                new MouseEvent(
                    "mouseup",
                    {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    }
                )
            );


            navButton.click();


            await new Promise(
                r => setTimeout(r, 150)
            );


            // Re-read after navigation
            current =
                getCalendarMonthYear();


            console.log(
                `📅 Now showing: ${current.month} ${current.year}`
            );


            if (
                current.monthIndex === -1 ||
                !Number.isFinite(current.year)
            ) {

                throw new Error(
                    "Lost calendar month/year after navigation"
                );
            }


            currentNumber =
                current.year * 12 +
                current.monthIndex;


            monthsToMove =
                targetNumber -
                currentNumber;
        }



        // ============================================================
        // VERIFY TARGET MONTH
        // ============================================================

        current =
            getCalendarMonthYear();


        if (
            current.monthIndex !== targetMonth ||
            current.year !== targetYear
        ) {

            throw new Error(
                `Calendar navigation failed. ` +
                `Showing ${current.month} ${current.year}, ` +
                `wanted ${target.month} ${target.year}`
            );
        }


        console.log(
            `✅ Correct month: ${target.month} ${target.year}`
        );



        // ============================================================
        // FIND TARGET DAY
        // ============================================================

        let dayButton = null;


        // First try your calendar's React-Date-Range structure
        const rdrDays =
            [...calendar.querySelectorAll(
                "button.rdrDay"
            )];


        dayButton =
            rdrDays.find(btn => {

                if (
                    btn.classList.contains(
                        "rdrDayPassive"
                    )
                ) {
                    return false;
                }


                if (btn.disabled)
                    return false;


                const number =
                    btn.querySelector(
                        ".rdrDayNumber span"
                    );


                return (
                    number?.textContent?.trim() ===
                    String(target.day)
                );
            });



        // ============================================================
        // FALLBACK FOR data-day
        // ============================================================

        if (!dayButton) {

            dayButton =
                [...calendar.querySelectorAll(
                    `button[data-day="${target.day}"]`
                )]
                    .find(btn =>
                        !btn.disabled &&
                        !btn.classList.contains(
                            "rdrDayPassive"
                        )
                    );
        }



        // ============================================================
        // GENERIC FALLBACK
        // ============================================================

        if (!dayButton) {

            dayButton =
                [...calendar.querySelectorAll("button")]
                    .find(btn => {

                        if (btn.disabled)
                            return false;


                        if (
                            btn.classList.contains(
                                "rdrDayPassive"
                            )
                        )
                            return false;


                        return (
                            btn.textContent.trim() ===
                            String(target.day)
                        );
                    });
        }



        if (!dayButton) {

            throw new Error(
                `Day ${target.day} not found in ` +
                `${target.month} ${target.year}`
            );
        }



        // ============================================================
        // CLICK DAY
        // ============================================================

        dayButton.dispatchEvent(
            new MouseEvent(
                "mousedown",
                {
                    bubbles: true,
                    cancelable: true,
                    view: window
                }
            )
        );


        dayButton.dispatchEvent(
            new MouseEvent(
                "mouseup",
                {
                    bubbles: true,
                    cancelable: true,
                    view: window
                }
            )
        );


        dayButton.click();


        await new Promise(
            r => setTimeout(r, 150)
        );


        console.log(
            `✅ Date = ${target.day} ${target.month} ${target.year}`
        );
    }


    async function setTime(fieldSelector, value) {

        const target =
            parseDateTime(value);

        const field =
            document.querySelector(fieldSelector);

        if (!field)
            throw new Error(
                "Time field not found"
            );

        await setInput(
            field.querySelector(
                'input[placeholder="HH"]'
            ),
            target.hour
        );

        await setInput(
            field.querySelector(
                'input[placeholder="mm"]'
            ),
            target.minute
        );

        console.log(
            `✅ Time = ${target.hour}:${target.minute}`
        );
    }


    async function selectFirstOption(
        fieldSelector,
        expectedText,
        name
    ) {

        const field =
            document.querySelector(fieldSelector);

        if (!field)
            throw new Error(`${name} field not found`);

        const input =
            field.querySelector('input[role="combobox"]');

        if (!input)
            throw new Error(`${name} combobox not found`);

        input.focus();

        key(input, "ArrowDown", 40);

        await wait();

        key(input, "Enter", 13);

        await wait();


        const selected =
            field.querySelector(
                ".onex-select__single-value"
            )?.textContent?.trim() || "";


        if (
            expectedText &&
            selected.toLowerCase() !==
            expectedText.toLowerCase()
        ) {
            throw new Error(
                `${name}: expected "${expectedText}", got "${selected}"`
            );
        }

        console.log(`✅ ${name} = ${selected}`);
    }

    // ============================================================
    // GENERIC FIELD HELPERS
    // ============================================================

    function normalizeText(value) {
        return (value || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }


    function findFieldByLabel(labelText) {

        const wanted =
            normalizeText(labelText);

        const labels = [
            ...document.querySelectorAll(
                ".datapoint-field-label"
            )
        ];


        const label = labels.find(el => {

            const text =
                normalizeText(el.textContent);

            return (
                text === wanted ||
                text.includes(wanted)
            );
        });


        if (!label)
            return null;


        // Walk upward until we find the matching controls.
        let parent = label.parentElement;

        for (
            let i = 0;
            i < 8 && parent;
            i++
        ) {

            const controls =
                parent.querySelector(
                    '[data-testid^="field-controls-"]'
                );

            if (controls)
                return controls;

            parent =
                parent.parentElement;
        }


        return null;
    }


    // ============================================================
    // TEMPORARILY TURN AN ELEMENT INTO A SELECTOR
    // so your existing setDate/setTime/etc. can be reused.
    // ============================================================

    async function withFieldSelector(
        field,
        callback
    ) {

        if (!field)
            throw new Error(
                "Field not found"
            );


        const marker =
            "peak-" +
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .slice(2);


        field.setAttribute(
            "data-peak-field",
            marker
        );


        try {

            return await callback(
                `[data-peak-field="${marker}"]`
            );

        } finally {

            field.removeAttribute(
                "data-peak-field"
            );
        }
    }


    // ============================================================
    // USER-LIKE TEXT ENTRY
    // Used for Protocol Schedule
    // ============================================================

    async function typeIntoField(
        field,
        value,
        name
    ) {

        if (!field)
            throw new Error(
                `${name} field not found`
            );


        const input =
            field.querySelector(
                'input[placeholder="Enter data"], input[type="text"], input:not([type])'
            );


        if (!input)
            throw new Error(
                `${name} input not found`
            );


        input.focus();

        input.select();

        document.execCommand(
            "delete",
            false
        );


        for (
            const char of String(value)
        ) {

            document.execCommand(
                "insertText",
                false,
                char
            );

            await new Promise(
                r => setTimeout(r, 30)
            );
        }


        input.dispatchEvent(
            new Event(
                "change",
                {
                    bubbles: true
                }
            )
        );


        input.blur();

        await wait();


        console.log(
            `✅ ${name} = ${value}`
        );
    }
    function isNonCentralLabPage() {

        const text =
            document.body.innerText
                .replace(/\s+/g, " ")
                .toLowerCase();

        return text.includes(
            "non-central laboratory test results"
        );
    }
    function findFieldByAnyLabel(possibleLabels) {

        const labels = [
            ...document.querySelectorAll(
                ".datapoint-field-label"
            )
        ];

        for (const wanted of possibleLabels) {

            const wantedText =
                wanted
                    .replace(/\s+/g, " ")
                    .trim()
                    .toLowerCase();

            const label = labels.find(el => {

                const actual =
                    el.textContent
                        .replace(/\s+/g, " ")
                        .trim()
                        .toLowerCase();

                return actual === wantedText;
            });

            if (!label)
                continue;


            let parent = label.parentElement;

            for (let i = 0; i < 8 && parent; i++) {

                const field =
                    parent.querySelector(
                        '[data-testid^="field-controls-"]'
                    );

                if (field)
                    return field;

                parent = parent.parentElement;
            }
        }

        return null;
    }
    // ============================================================
    // DETECT CENTRAL LAB SPECIMEN PAGE
    //
    // Do NOT depend on UUID/data-testid.
    // ============================================================

    function isCentralLabSpecimenPage() {

        const pageText =
            normalizeText(
                document.body.innerText
            );


        // First make sure this actually looks like
        // a specimen collection form.
        const hasSpecimenFields =
            !!findFieldByLabel(
                "Specimen Collected"
            ) &&
            !!findFieldByLabel(
                "Date of Collection"
            ) &&
            !!findFieldByLabel(
                "Time of Collection"
            );


        if (!hasSpecimenFields)
            return false;


        // Words/categories that identify these
        // Central Lab pages.
        const centralLabIndicators = [

            "suvratoxumab",

            "azd7754",

            "azd7745",

            "pk, biofluid",

            "pk/biofluid",

            "biomarkers",

            "exploratory research",

            "diagnostic, biofluid",

            "exploratory"
        ];


        return centralLabIndicators.some(
            text =>
                pageText.includes(text)
        );
    }
    // ============================================================
    // QUEST DIAGNOSTICS
    // ============================================================

    async function selectQuestDiagnostics() {

        const field = document.querySelector(".lab-select");

        if (!field)
            throw new Error(
                "Choose lab field (.lab-select) not found"
            );


        const input = field.querySelector(
            'input[role="combobox"]'
        );

        if (!input)
            throw new Error(
                "Choose lab combobox not found"
            );


        // Open dropdown
        input.focus();

        key(
            input,
            "ArrowDown",
            40
        );

        await wait();


        // Find Quest Diagnostics
        const options = [
            ...document.querySelectorAll(
                '[role="option"]'
            )
        ];


        const quest = options.find(option =>
            option.textContent
                .replace(/\s+/g, " ")
                .trim()
                .toLowerCase()
                .includes("quest diagnostics")
        );


        // If Quest is currently visible, select it
        if (quest) {

            quest.dispatchEvent(
                new MouseEvent(
                    "mousedown",
                    {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    }
                )
            );

            quest.click();

            await wait();

            console.log(
                "✅ Quest Diagnostics selected"
            );

            return;
        }


        // Otherwise use keyboard navigation
        for (let i = 0; i < 30; i++) {

            const activeId =
                input.getAttribute(
                    "aria-activedescendant"
                );


            const active =
                activeId
                    ? document.getElementById(activeId)
                    : null;


            const text =
                active?.textContent
                    ?.replace(/\s+/g, " ")
                    .trim() || "";


            if (
                text
                    .toLowerCase()
                    .includes("quest diagnostics")
            ) {

                key(
                    input,
                    "Enter",
                    13
                );

                await wait();

                console.log(
                    "✅ Quest Diagnostics selected"
                );

                return;
            }


            key(
                input,
                "ArrowDown",
                40
            );

            await wait();
        }


        // Only fail if we genuinely could not find/select Quest
        throw new Error(
            "Quest Diagnostics option not found"
        );
    }
    async function fillPhysicalExamPage() {

        const FIELD = {

            performed:
                '[data-testid="field-controls-0-09536247-5579-f111-be2e-005056905e65"]',

            date:
                '[data-testid="field-controls-0-06536247-5579-f111-be2e-005056905e65"]',

            time:
                '[data-testid="field-controls-0-0a536247-5579-f111-be2e-005056905e65"]'
        };


        const value =
            data.PreDialysisPhysicalExamTime;


        if (!value)
            throw new Error(
                "PreDialysisPhysicalExamTime is empty"
            );


        // Physical Examination Performed = Yes
        await selectYes(
            FIELD.performed,
            "Physical Examination Performed"
        );


        // Date = 19-SEP-2026
        await setDate(
            FIELD.date,
            value
        );


        // Time = 05:06
        await setTime(
            FIELD.time,
            value
        );


        console.log(
            "✅ TARGETED PHYSICAL EXAM COMPLETE"
        );

        console.log(
            "Physical Examination Performed: Yes"
        );

        console.log(
            "Date/Time:",
            value
        );
    }
    // ============================================================
    // VISIT DATE PAGE
    // ============================================================
    async function fillVisitDatePage() {

        const VISIT_DATE =
            '[data-testid="field-controls-0-04536247-5579-f111-be2e-005056905e65"]';

        if (!data.VisitDate)
            throw new Error("VisitDate is empty");

        // VisitDate has no time, so add dummy time
        // because existing setDate() expects date + time.
        const visitDateTime =
            data.VisitDate + " 00:00";

        await setDate(
            VISIT_DATE,
            visitDateTime
        );

        console.log(
            `✅ What is the date of the visit? = ${data.VisitDate}`
        );

        console.log(
            "✅ VISIT DATE PAGE COMPLETE"
        );
    }

    async function fillPKSerumNonDosingPage() {

        const FIELD = {

            collected:
                '[data-testid="field-controls-0-ae526247-5579-f111-be2e-005056905e65"]',

            date:
                '[data-testid="field-controls-0-b1526247-5579-f111-be2e-005056905e65"]',

            time:
                '[data-testid="field-controls-0-b3526247-5579-f111-be2e-005056905e65"]',

            condition:
                '[data-testid="field-controls-0-ac526247-5579-f111-be2e-005056905e65"]',

            storageDate:
                '[data-testid="field-controls-0-a6526247-5579-f111-be2e-005056905e65"]',

            storageTime:
                '[data-testid="field-controls-0-a7526247-5579-f111-be2e-005056905e65"]'
        };


        // ============================================================
        // 1. SPECIMEN COLLECTED = YES
        // ============================================================

        await selectYes(
            FIELD.collected,
            "Specimen Collected"
        );


        // ============================================================
        // 2. DATE OF COLLECTION
        // 19-SEP-2026
        // ============================================================

        await setDate(
            FIELD.date,
            data.CentralLabCollectionTime
        );


        // ============================================================
        // 3. TIME OF COLLECTION
        // 04:38
        // ============================================================

        await setTime(
            FIELD.time,
            data.CentralLabCollectionTime
        );


        // ============================================================
        // 4. SPECIMEN CONDITION = SAMPLE ACCEPTABLE
        // ============================================================

        await selectFirstOption(
            FIELD.condition,
            "Sample acceptable",
            "Specimen Condition"
        );


        // ============================================================
        // 5. DATE OF STORAGE
        // 19-SEP-2026
        // ============================================================

        await setDate(
            FIELD.storageDate,
            data.HBSStorageTime
        );


        // ============================================================
        // 6. TIME OF STORAGE
        // 05:42
        // ============================================================

        await setTime(
            FIELD.storageTime,
            data.HBSStorageTime
        );


        console.log(
            "================================"
        );

        console.log(
            "✅ PK SERUM NON-DOSING COMPLETE"
        );

        console.log(
            "Collection:",
            data.CentralLabCollectionTime
        );

        console.log(
            "Storage:",
            data.HBSStorageTime
        );

        console.log(
            "================================"
        );
    }

    async function fillGenericNonCentralLabPage() {

        console.log(
            "➡️ Non-central Laboratory Test Results page"
        );


        // ============================================================
        // 1. CHOOSE LAB = QUEST DIAGNOSTICS
        // MUST DO THIS FIRST because selecting lab can reload the form
        // ============================================================

        const labSelect =
            document.querySelector(".lab-select");


        if (labSelect) {

            const input =
                labSelect.querySelector(
                    'input[role="combobox"]'
                );


            if (input) {

                console.log(
                    "🔎 Selecting Quest Diagnostics..."
                );


                input.focus();

                key(
                    input,
                    "ArrowDown",
                    40
                );

                await new Promise(
                    r => setTimeout(r, 150)
                );


                // First try to find Quest directly
                let quest =
                    [...document.querySelectorAll(
                        '[role="option"]'
                    )]
                        .find(option =>
                            option.textContent
                                .toLowerCase()
                                .includes(
                                    "quest diagnostics"
                                )
                        );


                if (quest) {

                    quest.dispatchEvent(
                        new MouseEvent(
                            "mousedown",
                            {
                                bubbles: true
                            }
                        )
                    );

                    quest.click();

                } else {

                    // Fallback: walk through React Select options
                    for (
                        let i = 0;
                        i < 30;
                        i++
                    ) {

                        key(
                            input,
                            "ArrowDown",
                            40
                        );

                        await new Promise(
                            r => setTimeout(r, 50)
                        );


                        const activeId =
                            input.getAttribute(
                                "aria-activedescendant"
                            );


                        if (!activeId)
                            continue;


                        const active =
                            document.getElementById(
                                activeId
                            );


                        if (
                            active &&
                            active.textContent
                                .toLowerCase()
                                .includes(
                                    "quest diagnostics"
                                )
                        ) {

                            key(
                                input,
                                "Enter",
                                13
                            );

                            break;
                        }
                    }
                }


                console.log(
                    "✅ Choose lab = Quest Diagnostics"
                );


                // IMPORTANT:
                // Give React time to reload dependent fields
                await new Promise(
                    r => setTimeout(r, 700)
                );


                // Wait until specimen fields appear again
                const start =
                    Date.now();


                while (
                    Date.now() - start < 10000
                ) {

                    const hasDate =
                        findFieldByAnyLabel([
                            "What was the date of the lab specimen collection?",
                            "Date of Specimen Collection"
                        ]);


                    const hasTime =
                        findFieldByAnyLabel([
                            "What was the start time of the lab specimen collection?",
                            "Time of Specimen Collection"
                        ]);


                    if (
                        hasDate ||
                        hasTime
                    ) {
                        break;
                    }


                    await new Promise(
                        r => setTimeout(r, 200)
                    );
                }


                // Let React finish settling
                await new Promise(
                    r => setTimeout(r, 500)
                );

            } else {

                console.log(
                    "⚠️ Choose lab dropdown input not found"
                );
            }

        } else {

            console.log(
                "ℹ️ Choose lab not present on this Non-central Lab page"
            );
        }


        // ============================================================
        // 2. FIND FIELDS AFTER QUEST HAS LOADED
        // ============================================================
        const labPerformed =
            findFieldByAnyLabel([
                "Lab Performed",
                "Lab Performed?",
                "Was the sample collected?"
            ]);


        const date =
            findFieldByAnyLabel([
                "What was the date of the lab specimen collection?",
                "Date of Specimen Collection"
            ]);


        const time =
            findFieldByAnyLabel([
                "What was the start time of the lab specimen collection?",
                "Time of Specimen Collection"
            ]);


        // ============================================================
        // 3. SAMPLE COLLECTED = YES
        // ============================================================


        // ============================================================
        // LAB PERFORMED / SAMPLE COLLECTED = YES
        // ============================================================

        if (labPerformed) {

            try {

                await withFieldSelector(
                    labPerformed,
                    selector =>
                        selectYes(
                            selector,
                            "Lab Performed"
                        )
                );

            } catch (error) {

                console.warn(
                    "⚠️ Lab Performed skipped:",
                    error.message
                );
            }

        } else {

            console.log(
                "ℹ️ Lab Performed field not found"
            );
        }

        // ============================================================
        // 4. DATE
        // ============================================================

        if (
            date &&
            data.LocalLabCollectionTime
        ) {

            try {

                await withFieldSelector(
                    date,
                    selector =>
                        setDate(
                            selector,
                            data.LocalLabCollectionTime
                        )
                );

            } catch (error) {

                console.warn(
                    "⚠️ Local Lab Date skipped:",
                    error.message
                );
            }
        }


        // ============================================================
        // 5. TIME
        // ============================================================

        if (
            time &&
            data.LocalLabCollectionTime
        ) {

            try {

                await withFieldSelector(
                    time,
                    selector =>
                        setTime(
                            selector,
                            data.LocalLabCollectionTime
                        )
                );

            } catch (error) {

                console.warn(
                    "⚠️ Local Lab Time skipped:",
                    error.message
                );
            }
        }


        // DO NOT fill Sodium, Potassium, Hemoglobin,
        // Hematocrit, INR, aPTT, or other result values.

        console.log(
            "🧪 Lab result values left blank"
        );

        console.log(
            "✅ Non-central Lab page complete"
        );
    }
    // ============================================================
    // PAGE 1 — CENTRAL LAB / SPECIMEN
    // ============================================================
    async function fillGenericCentralLabPage() {

        console.log(
            "➡️ Central Lab specimen page detected"
        );


        const collected =
            findFieldByLabel(
                "Specimen Collected"
            );

        const protocol =
            findFieldByLabel(
                "Protocol schedule"
            );

        const date =
            findFieldByLabel(
                "Date of Collection"
            );

        const time =
            findFieldByLabel(
                "Time of Collection"
            );

        const condition =
            findFieldByLabel(
                "Specimen Condition"
            );

        const storageDate =
            findFieldByLabel(
                "Date of storage"
            );

        const storageTime =
            findFieldByLabel(
                "Time of storage"
            );


        // ============================================================
        // SPECIMEN COLLECTED = YES
        // ============================================================

        await withFieldSelector(
            collected,
            selector =>
                selectYes(
                    selector,
                    "Specimen Collected"
                )
        );



        // ============================================================
        // PROTOCOL SCHEDULE
        // OPTIONAL - NEVER STOP THE FORM
        // ============================================================

        // ============================================================
        // PROTOCOL SCHEDULE
        // OPTIONAL
        // Read Day XX ONLY from form-subtitle
        // ============================================================

        if (protocol) {

            const protocolInput =
                protocol.querySelector(
                    'input[placeholder="Enter data"], input[type="text"]'
                );

            if (protocolInput) {

                try {

                    // Get ONLY the visit subtitle
                    const subtitle =
                        document.querySelector(
                            '[data-testid="form-subtitle"]'
                        );

                    if (!subtitle) {

                        console.log(
                            "ℹ️ Protocol Schedule skipped - form subtitle not found"
                        );

                    } else {

                        const subtitleText =
                            subtitle.textContent
                                .replace(/\s+/g, " ")
                                .trim();

                        console.log(
                            "🔎 Visit subtitle:",
                            subtitleText
                        );


                        // Example:
                        // Visit 14 Day 121 (P2) 21 SEP 2026
                        const match =
                            subtitleText.match(
                                /\bDay\s+(\d+)\b/i
                            );


                        if (match) {

                            const day =
                                `Day ${match[1]}`;

                            console.log(
                                "🔎 Protocol Schedule detected:",
                                day
                            );


                            await typeIntoField(
                                protocol,
                                day,
                                "Protocol Schedule"
                            );

                        } else {

                            console.log(
                                "ℹ️ Protocol Schedule skipped - no Day XX in subtitle"
                            );
                        }
                    }

                } catch (error) {

                    // NEVER stop the rest of the form
                    console.warn(
                        "⚠️ Protocol Schedule skipped:",
                        error.message
                    );
                }

            } else {

                console.log(
                    "ℹ️ Protocol Schedule skipped - no editable input"
                );
            }

        } else {

            console.log(
                "ℹ️ Protocol Schedule not on this page - skipped"
            );
        }


        // ============================================================
        // DATE OF COLLECTION
        // CENTRAL LAB DATA
        // ============================================================

        await withFieldSelector(
            date,
            selector =>
                setDate(
                    selector,
                    data.CentralLabCollectionTime
                )
        );


        // ============================================================
        // TIME OF COLLECTION
        // CENTRAL LAB DATA
        // ============================================================

        await withFieldSelector(
            time,
            selector =>
                setTime(
                    selector,
                    data.CentralLabCollectionTime
                )
        );


        // ============================================================
        // SPECIMEN CONDITION
        // Optional
        // ============================================================

        if (condition) {

            await withFieldSelector(
                condition,
                selector =>
                    selectFirstOption(
                        selector,
                        "Sample acceptable",
                        "Specimen Condition"
                    )
            );
        }


        // ============================================================
        // STORAGE
        //
        // Some Central Lab pages have these fields.
        // If present, use HBSStorageTime.
        // ============================================================

        if (
            storageDate &&
            data.HBSStorageTime
        ) {

            await withFieldSelector(
                storageDate,
                selector =>
                    setDate(
                        selector,
                        data.HBSStorageTime
                    )
            );
        }


        if (
            storageTime &&
            data.HBSStorageTime
        ) {

            await withFieldSelector(
                storageTime,
                selector =>
                    setTime(
                        selector,
                        data.HBSStorageTime
                    )
            );
        }


        console.log(
            "================================"
        );

        console.log(
            "✅ CENTRAL LAB PAGE COMPLETE"
        );

        console.log(
            "Collection:",
            data.CentralLabCollectionTime
        );

        if (
            storageDate ||
            storageTime
        ) {
            console.log(
                "Storage:",
                data.HBSStorageTime
            );
        }

        console.log(
            "================================"
        );
    }
    async function fillCentralLabPage() {

        const FIELD = {

            collected:
                '[data-testid="field-controls-0-6f536247-5579-f111-be2e-005056905e65"]',

            date:
                '[data-testid="field-controls-0-72536247-5579-f111-be2e-005056905e65"]',

            time:
                '[data-testid="field-controls-0-74536247-5579-f111-be2e-005056905e65"]',

            condition:
                '[data-testid="field-controls-0-6d536247-5579-f111-be2e-005056905e65"]',

            storageDate:
                '[data-testid="field-controls-0-67536247-5579-f111-be2e-005056905e65"]',

            storageTime:
                '[data-testid="field-controls-0-68536247-5579-f111-be2e-005056905e65"]'
        };


        await selectYes(
            FIELD.collected,
            "Specimen Collected"
        );


        await selectFirstOption(
            FIELD.condition,
            "Sample acceptable",
            "Specimen Condition"
        );


        await setDate(
            FIELD.date,
            data.CentralLabCollectionTime
        );


        await setTime(
            FIELD.time,
            data.CentralLabCollectionTime
        );


        await setDate(
            FIELD.storageDate,
            data.HBSStorageTime
        );


        await setTime(
            FIELD.storageTime,
            data.HBSStorageTime
        );


        console.log(
            "✅ CENTRAL LAB PAGE COMPLETE"
        );
    }
    // ============================================================
    // PAGE 2 — VITAL SIGNS REGULAR
    // ============================================================
    async function fillRegularVitalSignsPage() {

        const FIELD = {

            collected:
                '[data-testid="field-controls-0-44516247-5579-f111-be2e-005056905e65"]',

            date:
                '[data-testid="field-controls-0-43516247-5579-f111-be2e-005056905e65"]',

            time:
                '[data-testid="field-controls-0-45516247-5579-f111-be2e-005056905e65"]',

            sbp:
                '[data-testid="field-controls-0-3e516247-5579-f111-be2e-005056905e65"]',

            dbp:
                '[data-testid="field-controls-0-38516247-5579-f111-be2e-005056905e65"]',

            heartRate:
                '[data-testid="field-controls-0-39516247-5579-f111-be2e-005056905e65"]',

            respirationRate:
                '[data-testid="field-controls-0-3c516247-5579-f111-be2e-005056905e65"]',

            temperature:
                '[data-testid="field-controls-0-3f516247-5579-f111-be2e-005056905e65"]',

            temperatureLocation:
                '[data-testid="field-controls-0-40516247-5579-f111-be2e-005056905e65"]',

            oxygen:
                '[data-testid="field-controls-0-3d516247-5579-f111-be2e-005056905e65"]'
        };


        // ============================================================
        // GET VITAL SIGNS DATA
        // ============================================================

        const record =
            data.VitalSigns?.[0]?.data;

        if (!record)
            throw new Error(
                "VitalSigns[0].data not found"
            );


        const collectionTime =
            record["Time of Collection:"];

        if (!collectionTime)
            throw new Error(
                "Vital Signs Time of Collection not found"
            );


        // ============================================================
        // HELPER FOR NORMAL DATA FIELD
        // ============================================================

        async function fillValue(
            fieldSelector,
            value,
            name
        ) {


            if (
                value === null ||
                value === undefined ||
                value === ""
            )
                return;

            const field =
                document.querySelector(fieldSelector);

            if (!field)
                throw new Error(
                    `${name} field not found`
                );

            const input =
                field.querySelector(
                    'input[placeholder="Enter data"]'
                );

            if (!input)
                throw new Error(
                    `${name} input not found`
                );

            await setInput(
                input,
                value
            );

            console.log(
                `✅ ${name} = ${value}`
            );
        }
        async function typeValue(fieldSelector, value, name) {

            const field =
                document.querySelector(fieldSelector);

            if (!field)
                throw new Error(`${name} field not found`);

            const input =
                field.querySelector(
                    'input[placeholder="Enter data"]'
                );

            if (!input)
                throw new Error(`${name} input not found`);


            // Focus field
            input.focus();

            await new Promise(r => setTimeout(r, 50));


            // Clear existing value
            input.select();

            document.execCommand(
                "delete",
                false
            );


            // Type one character at a time
            for (const char of String(value)) {

                document.execCommand(
                    "insertText",
                    false,
                    char
                );

                await new Promise(
                    r => setTimeout(r, 30)
                );
            }


            // Commit
            input.dispatchEvent(
                new Event("change", {
                    bubbles: true
                })
            );


            // Tab away, which is important for some Rave fields
            input.dispatchEvent(
                new KeyboardEvent("keydown", {
                    key: "Tab",
                    code: "Tab",
                    keyCode: 9,
                    which: 9,
                    bubbles: true
                })
            );

            input.blur();


            await new Promise(
                r => setTimeout(r, 150)
            );


            console.log(
                `✅ ${name} = ${input.value}`
            );
        }

        // ============================================================
        // SELECT DROPDOWN BY TEXT
        // ============================================================

        async function selectDropdownValue(
            fieldSelector,
            expected,
            name
        ) {

            const field =
                document.querySelector(fieldSelector);

            if (!field)
                throw new Error(
                    `${name} field not found`
                );


            const input =
                field.querySelector(
                    'input[role="combobox"]'
                );

            if (!input)
                throw new Error(
                    `${name} dropdown not found`
                );


            input.focus();

            key(
                input,
                "ArrowDown",
                40
            );

            await wait();


            // First try visible dropdown options
            let option =
                [...document.querySelectorAll(
                    '[role="option"]'
                )]
                    .find(x =>
                        x.textContent
                            .trim()
                            .toLowerCase() ===
                        expected
                            .trim()
                            .toLowerCase()
                    );


            if (option) {

                option.dispatchEvent(
                    new MouseEvent(
                        "mousedown",
                        {
                            bubbles: true,
                            cancelable: true,
                            view: window
                        }
                    )
                );

                option.click();

            } else {

                // Keyboard fallback
                let found = false;


                for (
                    let i = 0;
                    i < 30;
                    i++
                ) {

                    const activeId =
                        input.getAttribute(
                            "aria-activedescendant"
                        );


                    const active =
                        activeId
                            ? document.getElementById(
                                activeId
                            )
                            : null;


                    if (
                        active &&
                        active.textContent
                            .trim()
                            .toLowerCase() ===
                        expected
                            .trim()
                            .toLowerCase()
                    ) {

                        key(
                            input,
                            "Enter",
                            13
                        );

                        found = true;

                        break;
                    }


                    key(
                        input,
                        "ArrowDown",
                        40
                    );

                    await wait();
                }


                if (!found)
                    throw new Error(
                        `${name}: "${expected}" not found`
                    );
            }


            await wait();


            const selected =
                field.querySelector(
                    ".onex-select__single-value"
                )?.textContent?.trim() || "";


            if (
                selected.toLowerCase() !==
                expected.toLowerCase()
            ) {
                throw new Error(
                    `${name}: expected "${expected}", got "${selected}"`
                );
            }


            console.log(
                `✅ ${name} = ${selected}`
            );
        }


        // ============================================================
        // 1. VITAL SIGNS COLLECTED = YES
        // ============================================================

        await selectYes(
            FIELD.collected,
            "Were vital signs collected?"
        );


        // ============================================================
        // 2. DATE
        // Uses Time of Collection
        // ============================================================

        await setDate(
            FIELD.date,
            collectionTime
        );


        // ============================================================
        // 3. TIME
        // ============================================================

        await setTime(
            FIELD.time,
            collectionTime
        );

        // SBP
        await typeValue(
            FIELD.sbp,
            record["Systolic BP (mmHg):"],
            "Supine SBP"
        );


        // DBP
        await typeValue(
            FIELD.dbp,
            record["Diastolic BP (mmHg):"],
            "Supine DBP"
        );


        // HEART RATE - leave unchanged
        await fillValue(
            FIELD.heartRate,
            record["Heart rate (beats/min):"],
            "Supine Heart Rate"
        );


        // RESPIRATION - leave unchanged
        await fillValue(
            FIELD.respirationRate,
            record["Respiratory rate (breaths/min):"],
            "Supine Respiration Rate"
        );


        // TEMPERATURE - leave unchanged
        await fillValue(
            FIELD.temperature,
            record["Temperature (°C):"],
            "Temperature"
        );



        // ============================================================
        // 9. TEMPERATURE LOCATION
        // Oral Cavity
        // ============================================================

        await selectDropdownValue(
            FIELD.temperatureLocation,
            record["Temperature method:"],
            "Temperature Location"
        );


        // ============================================================
        // 10. OXYGEN SATURATION
        // ============================================================

        await fillValue(
            FIELD.oxygen,
            record["Pulse Oximetry (%)"],
            "Peripheral Oxygen Saturation"
        );


        console.log(
            "================================"
        );

        console.log(
            "✅ REGULAR VITAL SIGNS COMPLETE"
        );

        console.log(
            "Collection:",
            collectionTime
        );

        console.log(
            "================================"
        );
    }
    // ============================================================
    // PAGE 2 — VITAL SIGNS / PRE-DIALYSIS WEIGHT
    // ============================================================

    async function fillVitalSignsPage() {

        const FIELD = {

            collected:
                '[data-testid="field-controls-0-47516247-5579-f111-be2e-005056905e65"]',

            date:
                '[data-testid="field-controls-0-46516247-5579-f111-be2e-005056905e65"]',

            time:
                '[data-testid="field-controls-0-48516247-5579-f111-be2e-005056905e65"]',

            weight:
                '[data-testid="field-controls-0-49516247-5579-f111-be2e-005056905e65"]',

            unit:
                '[data-testid="field-controls-0-4a516247-5579-f111-be2e-005056905e65"]'
        };


        await selectYes(
            FIELD.collected,
            "Were vital signs collected?"
        );


        await setDate(
            FIELD.date,
            data.PreDialysisWeightDateTime
        );


        await setTime(
            FIELD.time,
            data.PreDialysisWeightDateTime
        );


        const weightField =
            document.querySelector(FIELD.weight);

        if (!weightField)
            throw new Error("Weight field not found");


        setInput(
            weightField.querySelector(
                'input[placeholder="Enter data"]'
            ),
            data.PreDialysisWeight
        );


        console.log(
            `✅ Weight = ${data.PreDialysisWeight}`
        );


        await selectFirstOption(
            FIELD.unit,
            "kg",
            "Weight Unit"
        );


        console.log(
            "✅ PRE-DIALYSIS VITAL SIGNS PAGE COMPLETE"
        );
    }


    // ============================================================
    // PAGE 3 — LOCAL LAB
    // ============================================================

    async function fillLocalLabPage() {

        const FIELD = {

            performed:
                '[data-testid="field-controls-0-80516247-5579-f111-be2e-005056905e65"]',

            date:
                '[data-testid="field-controls-0-7f516247-5579-f111-be2e-005056905e65"]',

            time:
                '[data-testid="field-controls-0-82516247-5579-f111-be2e-005056905e65"]'
        };


        await selectQuestDiagnostics();


        await selectYes(
            FIELD.performed,
            "Lab Performed"
        );


        await setDate(
            FIELD.date,
            data.LocalLabCollectionTime
        );


        await setTime(
            FIELD.time,
            data.LocalLabCollectionTime
        );


        console.log(
            "✅ LOCAL LAB PAGE COMPLETE"
        );
    }


    // ============================================================
    // AUTO-DETECT CURRENT PAGE
    // ============================================================

    try {

        console.log("🔎 Detecting form by fields...");

        // TARGETED PHYSICAL EXAMINATION (PE5)
        const pageTitle = (
            document.querySelector(".onex-pagetitle__title")
                ?.textContent || document.title || ""
        ).trim().toLowerCase();


        if (
            pageTitle.includes("targeted physical examination") ||
            (
                document.querySelector(
                    '[data-testid="field-controls-0-09536247-5579-f111-be2e-005056905e65"]'
                ) &&
                document.querySelector(
                    '[data-testid="field-controls-0-06536247-5579-f111-be2e-005056905e65"]'
                ) &&
                document.querySelector(
                    '[data-testid="field-controls-0-0a536247-5579-f111-be2e-005056905e65"]'
                )
            )
        ) {
            console.log("✅ PE5 detected");
            await fillPhysicalExamPage();
            return;
        }
        // ============================================================
        // VISIT DATE PAGE
        // ============================================================

        if (
            document.querySelector(
                '[data-testid="field-controls-0-04536247-5579-f111-be2e-005056905e65"]'
            )
        ) {

            console.log(
                "➡️ Visit Date page"
            );

            await fillVisitDatePage();
        }
        // ============================================================
        // CENTRAL LAB / SPECIMEN
        // ============================================================
        else if (
            isCentralLabSpecimenPage()
        ) {

            console.log(
                "➡️ Central Lab specimen page"
            );

            await fillGenericCentralLabPage();
        }

        // ============================================================
        // VITAL SIGNS ReGULAR
        // ============================================================
        else if (
            document.querySelector(
                '[data-testid="field-controls-0-44516247-5579-f111-be2e-005056905e65"]'
            ) &&
            document.querySelector(
                '[data-testid="field-controls-0-3e516247-5579-f111-be2e-005056905e65"]'
            )
        ) {

            console.log(
                "➡️ Regular Vital Signs page"
            );

            await fillRegularVitalSignsPage();
        }
        // ============================================================
        // VITAL SIGNS / WEIGHT
        // ============================================================

        else if (
            document.querySelector(
                '[data-testid="field-controls-0-47516247-5579-f111-be2e-005056905e65"]'
            )
        ) {

            console.log(
                "➡️ Vital Signs / Weight page"
            );

            await fillVitalSignsPage();
        }


        // ============================================================
        // LOCAL LAB
        // ============================================================
        else if (
            isNonCentralLabPage()
        ) {

            console.log(
                "➡️ Non-central Laboratory Test Results detected"
            );

            await fillGenericNonCentralLabPage();
        }
        else if (
            document.querySelector(".lab-select") &&
            document.querySelector(
                '[data-testid="field-controls-0-80516247-5579-f111-be2e-005056905e65"]'
            )
        ) {

            console.log(
                "➡️ Local Lab page"
            );

            await fillLocalLabPage();
        }
        // ============================================================
        // Physical examination page
        // ============================================================
        else if (
            document.querySelector(
                '[data-testid="field-controls-0-09536247-5579-f111-be2e-005056905e65"]'
            ) &&
            document.querySelector(
                '[data-testid="field-controls-0-06536247-5579-f111-be2e-005056905e65"]'
            )
        ) {

            console.log(
                "➡️ Targeted Physical Examination page"
            );

            await fillPhysicalExamPage();
        }
        // ============================================================
        // UNKNOWN
        // ============================================================

        else {

            const labels =
                [...document.querySelectorAll(
                    ".datapoint-field-label"
                )]
                    .map(x => x.textContent.trim())
                    .filter(Boolean);

            console.log(
                "Fields found:",
                labels
            );

            throw new Error(
                "Unsupported page"
            );
        }


        console.log(
            "================================"
        );

        console.log(
            "✅ FORM ENTRY COMPLETE"
        );

        console.log(
            "================================"
        );


    } catch (error) {

        console.error(
            "❌ FORM ERROR:",
            error
        );
    }
}

// ============================================================
// PEAK P EXTENSION
// F2 runs the form using data saved in the extension popup.
// ============================================================

let peakExtensionRunning = false;

function showPeakToast(message, isError = false) {
    let el = document.getElementById("peak-p-extension-toast");
    if (!el) {
        el = document.createElement("div");
        el.id = "peak-p-extension-toast";
        Object.assign(el.style, {
            position: "fixed",
            top: "16px",
            right: "16px",
            zIndex: "2147483647",
            padding: "10px 14px",
            borderRadius: "8px",
            font: "600 13px Arial, sans-serif",
            boxShadow: "0 2px 10px rgba(0,0,0,.22)",
            maxWidth: "360px"
        });
        document.documentElement.appendChild(el);
    }
    el.style.background = isError ? "#ffd7d7" : "#cfefff";
    el.style.color = "#10202b";
    el.textContent = message;
    clearTimeout(el._peakTimer);
    el._peakTimer = setTimeout(() => el.remove(), 2600);
}

async function runPeakExtension() {
    if (peakExtensionRunning) {
        showPeakToast("PEAK P is already running.");
        return;
    }

    peakExtensionRunning = true;

    try {
        const saved = await chrome.storage.local.get("peakData");
        const data = saved.peakData;

        if (!data || typeof data !== "object") {
            throw new Error("No PEAK data saved. Click the P icon and paste your data first.");
        }

        showPeakToast("PEAK P: filling form…");
        await fillPEAKForm(data);
        showPeakToast("PEAK P: finished.");
    } catch (error) {
        console.error("PEAK P EXTENSION ERROR:", error);
        showPeakToast("PEAK P: " + error.message, true);
    } finally {
        peakExtensionRunning = false;
    }
}

document.addEventListener("keydown", event => {
    if (event.key === "F2" || event.code === "F2" || event.keyCode === 113) {
        event.preventDefault();
        event.stopPropagation();
        runPeakExtension();
    }
}, true);

// // AUTO SELECT SHOW ALL LINES
// (function () {
//     const selector = 'select[name="_ctl0:Content:R:log:log_PG_Options"]';

//     function autoShowAllLines() {
//         const select = document.querySelector(selector);

//         if (!select || select.value === "ShowAllLines") return;

//         select.value = "ShowAllLines";
//         select.dispatchEvent(new Event("change", { bubbles: true }));

//         console.log("✅ Show All Lines selected");
//     }

//     autoShowAllLines();

//     const observer = new MutationObserver(autoShowAllLines);

//     observer.observe(document.documentElement, {
//         childList: true,
//         subtree: true
//     });
// })();