async function fillMedicationPage(rawData, medicationIndex = 0) {
    // ============================================================
    // 1. DATA
    //
    // Medication | Dose | Dose Unit | Route | Frequency |
    // Start Date | End Date/Ongoing | Indication | Identifier
    // ============================================================
    // ============================================================
    // 2. PARSE DATA
    // ============================================================

    function parseMedicationData(text) {

        return text
            .trim()
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean)
            .map((line, index) => {

                const [
                    medication = "",
                    dose = "",
                    doseUnit = "",
                    route = "",
                    frequency = "",
                    startDate = "",
                    endDateRaw = "",
                    indication = "",
                    indicationIdentifier = ""
                ] = line
                    .split("|")
                    .map(x => x.trim());


                const ongoing =
                    endDateRaw.toLowerCase() === "ongoing";


                return {
                    medication,
                    dose,
                    doseUnit,
                    route,
                    frequency,
                    startDate,

                    endDate:
                        ongoing
                            ? ""
                            : endDateRaw,

                    ongoing,

                    indication,

                    indicationIdentifier,

                    lineNumber: index + 1
                };
            });
    }


    const medications =
        parseMedicationData(rawData);


    // Current page = first line
    const data =
        medications[medicationIndex];


    if (!data) {
        console.error(`❌ No medication found at row ${medicationIndex + 1}.`);
        return;
    }


    console.log(
        "💊 Medication being entered:",
        data
    );


    // ============================================================
    // 3. BASIC HELPERS
    // ============================================================

    const sleep = ms =>
        new Promise(resolve => setTimeout(resolve, ms));


    function fireEvents(el) {

        if (!el) return;

        el.dispatchEvent(
            new Event("input", {
                bubbles: true
            })
        );

        el.dispatchEvent(
            new Event("change", {
                bubbles: true
            })
        );
    }


    function markModified() {

        if (
            typeof window.PromptBeforeNavAway_SetIsModified ===
            "function"
        ) {

            try {
                window.PromptBeforeNavAway_SetIsModified(true);
            } catch (e) { }
        }
    }


    function setInput(el, value) {

        if (!el) {
            console.warn("❌ Input not found");
            return false;
        }

        el.focus();

        const setter =
            Object.getOwnPropertyDescriptor(
                HTMLInputElement.prototype,
                "value"
            )?.set;

        if (setter) {
            setter.call(el, value ?? "");
        } else {
            el.value = value ?? "";
        }

        fireEvents(el);
        markModified();

        return true;
    }


    function setTextarea(el, value) {

        if (!el) {
            console.warn("❌ Textarea not found");
            return false;
        }

        el.focus();

        const setter =
            Object.getOwnPropertyDescriptor(
                HTMLTextAreaElement.prototype,
                "value"
            )?.set;

        if (setter) {
            setter.call(el, value ?? "");
        } else {
            el.value = value ?? "";
        }

        fireEvents(el);
        markModified();

        return true;
    }


    function setCheckbox(el, checked) {

        if (!el) {
            console.warn("❌ Checkbox not found");
            return false;
        }

        if (el.checked !== checked) {
            el.click();
        }

        markModified();

        return true;
    }


    // ============================================================
    // 4. FIELD IDS
    // ============================================================

    const FIELD = {

        medication: "4395873",
        dose: "4395865",
        doseUnit: "4395864",
        route: "4395870",
        frequency: "4395863",
        startDate: "4395872",
        endDate: "4395866",
        ongoing: "4395869",
        indication: "4395867",
        adverseEvent: "4395861",
        medicalHistory: "4395868"
    };


    // ============================================================
    // 5. FIND FIELD
    // ============================================================

    function findByField(fieldId, ending) {

        const el =
            document.querySelector(
                `[id*="CF${fieldId}_"][id$="${ending}"]`
            );

        if (!el) {
            console.warn(
                `❌ Field ${fieldId} not found: ${ending}`
            );
        }

        return el;
    }


    // ============================================================
    // 6. ROUTE NORMALIZATION
    // ============================================================

    function normalizeRoute(value) {

        if (!value) return "";

        const key =
            value
                .trim()
                .toUpperCase()
                .replace(/\./g, "")
                .replace(/\s+/g, "");


        const routes = {

            // Oral
            PO: "Oral",
            ORAL: "Oral",
            BYMOUTH: "Oral",

            // IV
            IV: "Intravenous",
            INTRAVENOUS: "Intravenous",

            // IM
            IM: "Intramuscular",
            INTRAMUSCULAR: "Intramuscular",

            // Subcutaneous
            SQ: "Subcutaneous",
            SC: "Subcutaneous",
            SUBQ: "Subcutaneous",
            SUBCUT: "Subcutaneous",
            SUBCUTANEOUS: "Subcutaneous",

            // Sublingual
            SL: "Sublingual",
            SUBLINGUAL: "Sublingual",

            // Topical
            TOP: "Topical",
            TOPICAL: "Topical",

            // Inhalation
            INH: "Inhalation",
            INHALATION: "Inhalation",
            INHALED: "Inhalation",

            // Rectal
            PR: "Rectal",
            RECTAL: "Rectal",

            // Intradermal
            ID: "Intradermal",
            INTRADERMAL: "Intradermal",

            // Nasal
            IN: "Nasal",
            NAS: "Nasal",
            NASAL: "Nasal",
            INTRANASAL: "Nasal",

            // Transdermal
            TD: "Transdermal",
            TRANSDERMAL: "Transdermal",

            // Buccal
            BU: "Buccal",
            BUC: "Buccal",
            BUCC: "Buccal",
            BUCCAL: "Buccal",

            // Ophthalmic
            OPH: "Ophthalmic",
            OPHTH: "Ophthalmic",
            OPHTHALMIC: "Ophthalmic",

            // Otic
            OTIC: "Otic",

            // Vaginal
            PV: "Vaginal",
            VAG: "Vaginal",
            VAGINAL: "Vaginal",

            // Intraperitoneal
            IP: "Intraperitoneal",
            INTRAPERITONEAL: "Intraperitoneal",

            // Intra-articular
            IA: "Intra-articular",
            INTRAARTICULAR: "Intra-articular"
        };


        return routes[key] || value;
    }

    // ============================================================
    // DOSE UNIT NORMALIZATION
    // ============================================================

    function normalizeDoseUnit(value) {

        if (!value) return "";

        const key = value
            .trim()
            .toUpperCase()
            .replace(/\./g, "")
            .replace(/\s+/g, "");

        const doseUnits = {

            // Weight
            MG: "mg",
            MILLIGRAM: "mg",
            MILLIGRAMS: "mg",

            G: "g",
            GM: "g",
            GRAM: "g",
            GRAMS: "g",

            MCG: "ug",
            UG: "ug",
            MICROGRAM: "mcg",
            MICROGRAMS: "mcg",

            KG: "kg",
            KILOGRAM: "kg",
            KILOGRAMS: "kg",

            // Volume
            ML: "mL",
            MILLILITER: "mL",
            MILLILITERS: "mL",

            L: "L",
            LITER: "L",
            LITERS: "L",

            // Dosage forms / units
            TAB: "Tablet",
            TABS: "Tablet",
            TABLET: "Tablet",
            TABLETS: "Tablet",

            CAP: "Capsule",
            CAPS: "Capsule",
            CAPSULE: "Capsule",
            CAPSULES: "Capsule",

            PATCH: "Patch",
            PATCHES: "Patch",

            PUFF: "Puff",
            PUFFS: "Puff",

            SPRAY: "Spray",
            SPRAYS: "Spray",

            DROP: "Drop",
            DROPS: "Drop",

            UNIT: "Unit",
            UNITS: "Unit",
            U: "Unit",

            IU: "International Unit",
            INTERNATIONALUNIT: "International Unit",
            INTERNATIONALUNITS: "International Unit",

            // Other common forms
            PACKET: "Packet",
            PACKETS: "Packet",

            VIAL: "Vial",
            VIALS: "Vial",

            AMPULE: "Ampule",
            AMPULES: "Ampule",

            PEN: "Pen",
            PENS: "Pen",

            APPLICATION: "Application",
            APPLICATIONS: "Application",

            SUPPOSITORY: "Suppository",
            SUPPOSITORIES: "Suppository",

            LOZENGE: "Lozenge",
            LOZENGES: "Lozenge"
        };

        return doseUnits[key] || value;
    }
    // ============================================================
    // 7. FREQUENCY NORMALIZATION
    // ============================================================

    function normalizeFrequency(value) {

        if (!value) return "";

        const key =
            value
                .trim()
                .toUpperCase()
                .replace(/\./g, "")
                .replace(/\s+/g, "");


        const frequencies = {

            // Daily
            QD: "Daily",
            DAILY: "Daily",
            QDAY: "Once Daily",
            ONCEDAILY: "Once Daily",

            // BID
            BID: "Twice per day",
            TWICEDAILY: "Twice Daily",
            "2XD": "Twice Daily",
            "2XDAY": "Twice Daily",

            // TID
            TID: "3 times per day",
            THREETIMESDAILY: "Three Times Daily",
            "3XD": "Three Times Daily",
            "3XDAY": "Three Times Daily",

            // QID
            QID: "Four Times Daily",
            FOURTIMESDAILY: "Four Times Daily",
            "4XD": "Four Times Daily",
            "4XDAY": "Four Times Daily",

            // Bedtime
            QHS: "At Bedtime",
            HS: "At Bedtime",
            BEDTIME: "At Bedtime",

            // PRN
            PRN: "As Needed",
            ASNEEDED: "As Needed",

            // Every other day
            QOD: "Every Other Day",
            EOD: "Every Other Day",
            EVERYOTHERDAY: "Every Other Day",

            // Weekly
            QW: "Every week",
            QWK: "Every week",
            QWEEK: "Every week",
            WEEKLY: "Every week",
            ONCEWEEKLY: "Every week",

            // Twice weekly
            BIW: "Twice Per Week",
            "2XW": "Twice Per Week",
            "2XWK": "Twice Per Week",
            TWICEWEEKLY: "Twice Per Week",

            // Three times weekly
            TIW: "3 Times Per Week",
            "3XW": "3 Times Per Week",
            "3XWK": "3 Times Per Week",
            THREETIMESWEEKLY: "3 Times Per Week",

            // Monthly
            QM: "Once Monthly",
            QMONTH: "Once Monthly",
            MONTHLY: "Once Monthly",
            ONCEMONTHLY: "Once Monthly",

            // Once
            ONCE: "Once",

            // Continuous
            CONT: "Continuous",
            CONTINUOUS: "Continuous"
        };


        if (frequencies[key]) {
            return frequencies[key];
        }


        // Q4H / Q6H / Q8H / Q12H
        const hours =
            key.match(/^Q(\d+)H$/);

        if (hours) {
            return `Every ${hours[1]} Hours`;
        }


        // Q30MIN
        const minutes =
            key.match(/^Q(\d+)MIN$/);

        if (minutes) {
            return `Every ${minutes[1]} Minutes`;
        }


        return value;
    }


    // ============================================================
    // 8. DATE
    // ============================================================

    function setDate(fieldId, dateString) {

        const day =
            findByField(
                fieldId,
                "_CRFControl_0"
            );

        const month =
            findByField(
                fieldId,
                "_CRFControl_1"
            );

        const year =
            findByField(
                fieldId,
                "_CRFControl_2"
            );


        if (!day || !month || !year) {

            console.warn(
                `❌ Date controls not found: ${fieldId}`
            );

            return false;
        }


        // Clear date
        if (!dateString) {

            setInput(day, "");

            month.value = "";

            fireEvents(month);

            setInput(year, "");

            return true;
        }


        const parts =
            dateString
                .trim()
                .split(/[- /]/);


        if (parts.length !== 3) {

            console.warn(
                "❌ Invalid date:",
                dateString
            );

            return false;
        }


        let [d, m, y] = parts;


        // Unknown day
        if (
            d === "00" ||
            d.toUpperCase() === "UN"
        ) {
            d = "un";
        }


        const monthMap = {

            JAN: "Jan",
            FEB: "Feb",
            MAR: "Mar",
            APR: "Apr",
            MAY: "May",
            JUN: "Jun",
            JUL: "Jul",
            AUG: "Aug",
            SEP: "Sep",
            OCT: "Oct",
            NOV: "Nov",
            DEC: "Dec",

            "000": "UNK",
            UNK: "UNK"
        };


        m =
            monthMap[
            String(m).toUpperCase()
            ] || m;


        setInput(day, d);


        const monthOption =
            [...month.options].find(
                option =>

                    option.value
                        .toLowerCase() ===
                    String(m).toLowerCase()

                    ||

                    option.textContent
                        .trim()
                        .toLowerCase() ===
                    String(m).toLowerCase()
            );


        if (monthOption) {

            month.value =
                monthOption.value;

            fireEvents(month);

            markModified();

        } else {

            console.warn(
                "❌ Month not found:",
                m
            );
        }


        setInput(year, y);


        console.log(
            `✅ Date entered: ${d} ${m} ${y}`
        );

        return true;
    }


    // ============================================================
    // 9. DIRECT SEARCHLIST INPUT
    //
    // This DOES NOT WAIT and DOES NOT SELECT.
    //
    // Used for Dose Unit only.
    //
    // Whatever you typed is entered exactly.
    // ============================================================

    function setSearchListTextDirect(
        input,
        value
    ) {

        if (!input) {

            console.warn(
                "❌ SearchList input not found"
            );

            return false;
        }


        const setter =
            Object.getOwnPropertyDescriptor(
                HTMLInputElement.prototype,
                "value"
            )?.set;


        input.focus();


        if (setter) {
            setter.call(input, value ?? "");
        } else {
            input.value = value ?? "";
        }


        input.dispatchEvent(
            new Event("input", {
                bubbles: true
            })
        );


        input.dispatchEvent(
            new Event("change", {
                bubbles: true
            })
        );


        markModified();


        return true;
    }


    // ============================================================
    // 10. FAST SEARCHLIST SELECT
    //
    // Route + Frequency
    //
    // Type → trigger list → ArrowDown → Enter
    // ============================================================

    async function selectSearchListFast(
        input,
        searchText
    ) {

        if (!input || !searchText) {
            return false;
        }


        console.log(
            "⚡ Fast select:",
            searchText
        );


        input.focus();


        const setter =
            Object.getOwnPropertyDescriptor(
                HTMLInputElement.prototype,
                "value"
            )?.set;


        // Clear
        if (setter) {
            setter.call(input, "");
        } else {
            input.value = "";
        }


        input.dispatchEvent(
            new Event("input", {
                bubbles: true
            })
        );


        // Enter text
        if (setter) {
            setter.call(input, searchText);
        } else {
            input.value = searchText;
        }


        input.dispatchEvent(
            new Event("input", {
                bubbles: true
            })
        );


        // Trigger Rave SearchList
        const keyEvent =
            new KeyboardEvent(
                "keyup",
                {
                    bubbles: true,
                    key:
                        searchText.slice(-1) || "a"
                }
            );


        input.dispatchEvent(keyEvent);


        if (
            typeof window.SearchList_TextBox_OnKeyUp ===
            "function"
        ) {

            try {

                window.SearchList_TextBox_OnKeyUp(
                    keyEvent,
                    input
                );

            } catch (e) { }
        }


        // Tiny delay only
        await sleep(40);


        // Down
        input.dispatchEvent(
            new KeyboardEvent(
                "keydown",
                {
                    key: "ArrowDown",
                    code: "ArrowDown",
                    keyCode: 40,
                    which: 40,
                    bubbles: true
                }
            )
        );


        await sleep(15);


        // Enter
        input.dispatchEvent(
            new KeyboardEvent(
                "keydown",
                {
                    key: "Enter",
                    code: "Enter",
                    keyCode: 13,
                    which: 13,
                    bubbles: true
                }
            )
        );


        markModified();


        return true;
    }


    // ============================================================
    // 11. IDENTIFIER SEARCHLIST
    //
    // Only AE/MH identifiers wait for AJAX
    // ============================================================

    async function selectIdentifierSearchList(
        input,
        searchText,
        timeout = 6000
    ) {

        if (!input || !searchText) {
            return false;
        }


        console.log(
            "🔎 Searching identifier:",
            searchText
        );


        input.focus();


        const setter =
            Object.getOwnPropertyDescriptor(
                HTMLInputElement.prototype,
                "value"
            )?.set;


        if (setter) {
            setter.call(input, "");
        } else {
            input.value = "";
        }


        input.dispatchEvent(
            new Event("input", {
                bubbles: true
            })
        );


        if (setter) {
            setter.call(input, searchText);
        } else {
            input.value = searchText;
        }


        input.dispatchEvent(
            new Event("input", {
                bubbles: true
            })
        );


        const keyEvent =
            new KeyboardEvent(
                "keyup",
                {
                    bubbles: true,
                    key:
                        searchText.slice(-1) || "a"
                }
            );


        input.dispatchEvent(keyEvent);


        if (
            typeof window.SearchList_TextBox_OnKeyUp ===
            "function"
        ) {

            try {

                window.SearchList_TextBox_OnKeyUp(
                    keyEvent,
                    input
                );

            } catch (e) { }
        }


        const base =
            input.id.replace(
                /_TxtBx$/,
                ""
            );


        const start =
            Date.now();


        while (
            Date.now() - start < timeout
        ) {

            await sleep(75);


            const pickList =
                document.getElementById(
                    base + "_PickListBox"
                );


            if (!pickList) {
                continue;
            }


            const target =
                String(searchText)
                    .trim()
                    .toLowerCase();


            const candidates = [
                ...pickList.querySelectorAll(
                    "a, div, span, td"
                )
            ].filter(el => {

                const text =
                    el.textContent
                        ?.trim();

                if (!text) {
                    return false;
                }


                const normalized =
                    text.toLowerCase();


                return (
                    normalized === target

                    ||

                    normalized.startsWith(
                        target + " "
                    )

                    ||

                    normalized.startsWith(
                        target + " -"
                    )

                    ||

                    normalized.includes(target)
                );
            });


            candidates.sort(
                (a, b) =>
                    a.textContent.length -
                    b.textContent.length
            );


            const result =
                candidates[0];


            if (result) {

                console.log(
                    "✅ Identifier found:",
                    result.textContent.trim()
                );


                result.dispatchEvent(
                    new MouseEvent(
                        "mousedown",
                        {
                            bubbles: true,
                            cancelable: true
                        }
                    )
                );


                result.click();


                result.dispatchEvent(
                    new MouseEvent(
                        "mouseup",
                        {
                            bubbles: true,
                            cancelable: true
                        }
                    )
                );


                markModified();

                return true;
            }
        }


        console.warn(
            "❌ Identifier result not found:",
            searchText
        );


        return false;
    }


    // ============================================================
    // 12. START FILLING
    // ============================================================

    console.log(
        "===================================="
    );

    console.log(
        "💊 Filling Concomitant Medication"
    );

    console.log(
        "===================================="
    );


    // ============================================================
    // MEDICATION
    // ============================================================

    const medication =
        document.querySelector(
            `[id*="CF${FIELD.medication}_"]` +
            `[id$="_CRFControl_Text"]`
        );


    setTextarea(
        medication,
        data.medication
    );


    // ============================================================
    // DOSE
    // ============================================================

    const dose =
        document.querySelector(
            `[id*="CF${FIELD.dose}_"]` +
            `[id$="_CRFControl_Text"]`
        );


    setInput(
        dose,
        data.dose
    );


    // ============================================================
    // DOSE UNIT
    //
    // NO MAPPING
    // NO WAITING
    // NO DROPDOWN SELECTION
    //
    // Just enter exactly what the string says
    // ============================================================

    const doseUnit =
        document.querySelector(
            `[id*="CF${FIELD.doseUnit}_"]` +
            `[id$="_CRFSL_TxtBx"]`
        );


    const normalizedDoseUnit =
        normalizeDoseUnit(
            data.doseUnit
        );

    console.log(
        `Dose Unit: ${data.doseUnit} → ${normalizedDoseUnit}`
    );

    setSearchListTextDirect(
        doseUnit,
        normalizedDoseUnit
    );


    // ============================================================
    // ROUTE
    // ============================================================

    const normalizedRoute =
        normalizeRoute(
            data.route
        );


    console.log(
        `Route: ${data.route} → ${normalizedRoute}`
    );


    const route =
        document.querySelector(
            `[id*="CF${FIELD.route}_"]` +
            `[id$="_CRFSL_TxtBx"]`
        );


    await selectSearchListFast(
        route,
        normalizedRoute
    );


    // ============================================================
    // FREQUENCY
    // ============================================================

    const normalizedFrequency =
        normalizeFrequency(
            data.frequency
        );


    console.log(
        `Frequency: ${data.frequency} → ${normalizedFrequency}`
    );


    const frequency =
        document.querySelector(
            `[id*="CF${FIELD.frequency}_"]` +
            `[id$="_CRFSL_TxtBx"]`
        );


    await selectSearchListFast(
        frequency,
        normalizedFrequency
    );


    // ============================================================
    // START DATE
    // ============================================================

    setDate(
        FIELD.startDate,
        data.startDate
    );


    // ============================================================
    // ONGOING
    // ============================================================

    const ongoing =
        document.querySelector(
            `[id*="CF${FIELD.ongoing}_"]` +
            `[type="checkbox"]`
        );


    setCheckbox(
        ongoing,
        Boolean(data.ongoing)
    );


    // ============================================================
    // END DATE
    // ============================================================

    if (data.ongoing) {

        setDate(
            FIELD.endDate,
            ""
        );

        console.log(
            "End Date: Ongoing"
        );

    } else {

        setDate(
            FIELD.endDate,
            data.endDate
        );

        console.log(
            "End Date:",
            data.endDate
        );
    }


    // ============================================================
    // 13. INDICATION + LINKED AE / MEDICAL HISTORY IDENTIFIER
    // ============================================================

    async function waitForElement(getElement, timeout = 8000) {

        const start = Date.now();

        while (Date.now() - start < timeout) {

            const el = getElement();

            if (
                el &&
                !el.disabled &&
                el.offsetParent !== null
            ) {
                return el;
            }

            await sleep(75);
        }

        return null;
    }


    // ============================================================
    // SELECT INDICATION
    // ============================================================

    async function selectIndication(indicationInput) {

        const indicationMap = {

            "medical history":
                "Treatment of Medical/Surgical History",

            "medical/surgical history":
                "Treatment of Medical/Surgical History",

            "medical surgical history":
                "Treatment of Medical/Surgical History",

            "mh":
                "Treatment of Medical/Surgical History",


            "adverse event":
                "Treatment of Adverse Event",

            "ae":
                "Treatment of Adverse Event",


            "prophylaxis":
                "Prophylaxis",

            "surgery":
                "Surgery",

            "dietary supplement":
                "Dietary Supplement",

            "dietary supplements":
                "Dietary Supplement",

            "contraception":
                "Contraception"
        };


        const key =
            String(indicationInput || "")
                .trim()
                .toLowerCase();


        const wantedText =
            indicationMap[key];


        if (!wantedText) {

            console.error(
                "❌ Unknown indication:",
                indicationInput
            );

            return "";
        }


        // IMPORTANT:
        // select itself contains CF4395867 in its ID.
        const select =
            document.querySelector(
                `select[id*="CF${FIELD.indication}_"][id$="_CRFControl_DD"]`
            );


        if (!select) {

            console.error(
                "❌ Indication dropdown not found"
            );

            return "";
        }


        const option =
            [...select.options].find(opt =>

                opt.textContent
                    .trim()
                    .toLowerCase()

                ===

                wantedText
                    .toLowerCase()
            );


        if (!option) {

            console.error(
                "❌ Indication option not found:",
                wantedText
            );

            console.log(
                "Available indication options:",
                [...select.options].map(
                    opt => ({
                        text:
                            opt.textContent.trim(),

                        value:
                            opt.value
                    })
                )
            );

            return "";
        }


        console.log(
            `Indication: ${indicationInput} → ${wantedText}`
        );


        select.focus();


        // Select the actual Rave option
        select.selectedIndex =
            option.index;

        select.value =
            option.value;


        // Rave needs change event
        select.dispatchEvent(
            new Event(
                "change",
                {
                    bubbles: true
                }
            )
        );


        markModified();


        console.log(
            "✅ Indication selected:",
            select.options[
                select.selectedIndex
            ].textContent.trim()
        );


        return option.value;
    }


    // ============================================================
    // SEARCH AND SELECT AE / MH IDENTIFIER
    //
    // This function WAITS for AJAX results.
    // ============================================================

    async function selectLinkedIdentifier(
        input,
        identifier,
        timeout = 10000
    ) {

        if (!input) {

            console.error(
                "❌ Identifier SearchList input not found"
            );

            return false;
        }


        const searchText =
            String(identifier)
                .trim();


        if (!searchText) {

            return false;
        }


        console.log(
            "🔎 Looking for identifier:",
            searchText
        );


        input.focus();


        const setter =
            Object.getOwnPropertyDescriptor(
                HTMLInputElement.prototype,
                "value"
            )?.set;


        // ========================================================
        // CLEAR EXISTING TEXT
        // ========================================================

        if (setter) {

            setter.call(
                input,
                ""
            );

        } else {

            input.value = "";
        }


        input.dispatchEvent(
            new Event(
                "input",
                {
                    bubbles: true
                }
            )
        );


        // ========================================================
        // ENTER IDENTIFIER
        // ========================================================

        if (setter) {

            setter.call(
                input,
                searchText
            );

        } else {

            input.value =
                searchText;
        }


        input.dispatchEvent(
            new Event(
                "input",
                {
                    bubbles: true
                }
            )
        );


        // ========================================================
        // TRIGGER MEDIDATA SEARCHLIST
        // ========================================================

        const keyEvent =
            new KeyboardEvent(
                "keyup",
                {
                    bubbles: true,
                    key:
                        searchText.slice(-1) ||
                        "0",

                    code:
                        "Digit0"
                }
            );


        input.dispatchEvent(
            keyEvent
        );


        if (
            typeof window.SearchList_TextBox_OnKeyUp ===
            "function"
        ) {

            try {

                window.SearchList_TextBox_OnKeyUp(
                    keyEvent,
                    input
                );

            } catch (e) {

                console.log(
                    "Rave SearchList triggered by normal key event"
                );
            }
        }


        // ========================================================
        // WAIT FOR AJAX RESULTS
        // ========================================================

        const base =
            input.id.replace(
                /_TxtBx$/,
                ""
            );


        const start =
            Date.now();


        while (
            Date.now() - start <
            timeout
        ) {

            await sleep(100);


            const pickList =
                document.getElementById(
                    base +
                    "_PickListBox"
                );


            if (!pickList) {

                continue;
            }


            const elements = [
                ...pickList.querySelectorAll(
                    "a, div, span, td"
                )
            ];


            // We want:
            //
            // 007 - un UNK 2021 - anemia...
            //
            // when identifier is:
            //
            // 007
            const result =
                elements
                    .filter(el => {

                        const text =
                            el.textContent
                                ?.trim();

                        if (!text) {
                            return false;
                        }


                        return (
                            text === searchText

                            ||

                            text.startsWith(
                                searchText +
                                " "
                            )

                            ||

                            text.startsWith(
                                searchText +
                                " -"
                            )
                        );
                    })
                    .sort(
                        (a, b) =>
                            a.textContent.length -
                            b.textContent.length
                    )[0];


            if (!result) {

                continue;
            }


            const resultText =
                result
                    .textContent
                    .trim();


            console.log(
                "✅ Identifier option appeared:",
                resultText
            );


            // ====================================================
            // CLICK ACTUAL SEARCHLIST RESULT
            // ====================================================

            result.dispatchEvent(
                new MouseEvent(
                    "mousedown",
                    {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    }
                )
            );


            result.click();


            result.dispatchEvent(
                new MouseEvent(
                    "mouseup",
                    {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    }
                )
            );


            markModified();


            console.log(
                "✅ Identifier selected:",
                resultText
            );


            return true;
        }


        console.error(
            "❌ Identifier never appeared:",
            searchText
        );


        return false;
    }


    // ============================================================
    // RUN INDICATION
    // ============================================================

    const indicationValue =
        await selectIndication(
            data.indication
        );


    // ============================================================
    // MEDICAL HISTORY
    // ============================================================

    if (
        indicationValue ===
        "MEDICAL HISTORY"

        &&

        data.indicationIdentifier
    ) {

        console.log(
            "⏳ Waiting for Medical History identifier field..."
        );


        const mhInput =
            await waitForElement(
                () =>
                    document.querySelector(
                        `input[id*="CF${FIELD.medicalHistory}_"][id$="_CRFSL_TxtBx"]`
                    ),
                10000
            );


        if (!mhInput) {

            console.error(
                "❌ Medical History identifier field did not appear"
            );

        } else {

            console.log(
                "✅ Medical History identifier field appeared"
            );


            await selectLinkedIdentifier(
                mhInput,
                data.indicationIdentifier
            );
        }
    }


    // ============================================================
    // ADVERSE EVENT
    // ============================================================

    else if (
        indicationValue ===
        "ADVERSE EVENT"

        &&

        data.indicationIdentifier
    ) {

        console.log(
            "⏳ Waiting for Adverse Event identifier field..."
        );


        const aeInput =
            await waitForElement(
                () =>
                    document.querySelector(
                        `input[id*="CF${FIELD.adverseEvent}_"][id$="_CRFSL_TxtBx"]`
                    ),
                10000
            );


        if (!aeInput) {

            console.error(
                "❌ Adverse Event identifier field did not appear"
            );

        } else {

            console.log(
                "✅ Adverse Event identifier field appeared"
            );


            await selectLinkedIdentifier(
                aeInput,
                data.indicationIdentifier
            );
        }
    }


    // ============================================================
    // DONE
    // ============================================================

    console.log(
        "===================================="
    );

    console.log(
        "✅ Medication entry completed"
    );

    console.log(
        "⚠️ Review before clicking Save"
    );

    console.log(
        "===================================="
    );

}
