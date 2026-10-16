(() => {

    // =========================================================
    // ALL DATA — CHANGE ONLY THIS SECTION
    // =========================================================

    const data = window.__CLINICAL_AUTOFILL_DATA__ || {
        date: "19-Aug-2026",
        vitalSigns: {
            time: "10:06",
            systolic: "136",
            diastolic: "75",
            pulse: "79",
            temperature: "36.1",
            preDialysis: { weightTime: "10:01", weight: "100" },
            postDialysis: { weightTime: "14:30", weight: "98" }
        },
        dialysis: {
            type: "Hemodialysis",
            accessType: "Fistula",
            subtype: "High Flux",
            sessionVolume: "3.2",
            singlePoolKtV: "1.6",
            startTime: "09:15",
            endTime: "12:41"
        },
        labSamples: { time: "10:06" },
        drugAdministration: {
            startTime: "11:19",
            endTime: "11:19",
            kitNumber1: "522205",
            kitNumber2: "699905",
            administeredVolume: "4"
        },
        pkSample: { time: "10:06" }
    };



    // =========================================================
    // COMMON HELPERS
    // =========================================================

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

        el.dispatchEvent(
            new Event("blur", {
                bubbles: true
            })
        );
    }



    function setInput(el, value) {

        if (!el) {

            console.warn(
                "❌ Input not found"
            );

            return false;
        }

        value = String(value);

        if (el.value === value) {

            console.log(
                "Already set:",
                el.id,
                value
            );

            return true;
        }

        el.focus();

        el.value = value;

        fireEvents(el);

        console.log(
            "✓ Set:",
            el.id,
            "=>",
            value
        );

        return true;
    }



    function setSelectByText(select, wantedText) {

        if (!select) {

            console.warn(
                "❌ Select not found:",
                wantedText
            );

            return false;
        }

        const wanted =
            String(wantedText)
                .trim()
                .toLowerCase();

        const option =
            [...select.options].find(opt =>

                opt.text
                    .trim()
                    .toLowerCase() === wanted

                ||

                opt.value
                    .trim()
                    .toLowerCase() === wanted
            );


        if (!option) {

            console.warn(
                "❌ Option not found:",
                wantedText,
                [...select.options].map(
                    o => o.text
                )
            );

            return false;
        }


        select.value =
            option.value;

        fireEvents(select);


        console.log(
            "✓ Selected:",
            select.id,
            "=>",
            option.text
        );


        return true;
    }



    function setRadio(fieldId, value) {

        const radio = document.querySelector(
            `input[type="radio"][name*="field${fieldId}"][value="${value}"]`
        );

        if (!radio) {
            console.warn(
                "❌ Radio not found:",
                fieldId,
                value
            );
            return false;
        }

        const group = radio.closest("table");

        // Explicitly clear the other options in the same group
        if (group) {
            group.querySelectorAll(
                'input[type="radio"]'
            ).forEach(r => {
                r.checked = false;
            });
        }

        // Select requested option
        radio.checked = true;

        // Rave stores the selected value here too
        if (group) {
            group.setAttribute(
                "rbvalue",
                value
            );
        }

        // Trigger normal browser/Rave behavior
        radio.dispatchEvent(
            new MouseEvent("click", {
                bubbles: true,
                cancelable: true,
                view: window
            })
        );

        radio.dispatchEvent(
            new Event("change", {
                bubbles: true
            })
        );

        // Make sure it remains checked after Rave's handler
        radio.checked = true;

        if (group) {
            group.setAttribute(
                "rbvalue",
                value
            );
        }

        if (
            typeof PromptBeforeNavAway_SetIsModified ===
            "function"
        ) {
            PromptBeforeNavAway_SetIsModified(true);
        }

        console.log(
            "✓ Radio selected:",
            fieldId,
            "=>",
            value
        );

        return true;
    }
    function setLogRadio(fieldId, value) {

        const radio =
            document.querySelector(
                `input[type="radio"][name*="CF${fieldId}"][value="${value}"]`
            );

        if (!radio) {

            console.warn(
                "❌ Log radio not found:",
                fieldId,
                value
            );

            return false;
        }


        const radioTable =
            radio.closest(
                'table[id*="RadioBtnList"]'
            );


        // Clear all choices in this radio group
        if (radioTable) {

            radioTable
                .querySelectorAll(
                    'input[type="radio"]'
                )
                .forEach(r => {
                    r.checked = false;
                });
        }


        // Set the requested radio
        radio.checked = true;


        // Rave also keeps the selected value in rbvalue
        if (radioTable) {

            radioTable.setAttribute(
                "rbvalue",
                value
            );
        }


        // Trigger Rave's own radio behavior
        radio.dispatchEvent(
            new MouseEvent(
                "click",
                {
                    bubbles: true,
                    cancelable: true,
                    view: window
                }
            )
        );


        radio.dispatchEvent(
            new Event(
                "change",
                {
                    bubbles: true
                }
            )
        );


        // Force the final state again after Rave handler
        radio.checked = true;


        if (radioTable) {

            radioTable.setAttribute(
                "rbvalue",
                value
            );
        }


        if (
            typeof PromptBeforeNavAway_SetIsModified
            === "function"
        ) {

            PromptBeforeNavAway_SetIsModified(
                true
            );
        }


        console.log(
            "✅ Log radio selected:",
            fieldId,
            "=>",
            value
        );


        return true;
    }


    // =========================================================
    // DATE HELPERS
    // Accepts:
    //
    // 19-Aug-2026
    // 19 Aug 2026
    // 19/Aug/2026
    // =========================================================

    function parseDate(dateString) {

        const parts =
            dateString
                .trim()
                .split(/[-\s/]+/);


        if (parts.length !== 3) {

            throw new Error(
                "Date must look like 19-Aug-2026"
            );
        }


        const day =
            parts[0]
                .padStart(2, "0");


        const monthMap = {

            jan: "Jan",
            feb: "Feb",
            mar: "Mar",
            apr: "Apr",
            may: "May",
            jun: "Jun",
            jul: "Jul",
            aug: "Aug",
            sep: "Sep",
            oct: "Oct",
            nov: "Nov",
            dec: "Dec"
        };


        const monthKey =
            parts[1]
                .substring(0, 3)
                .toLowerCase();


        const month =
            monthMap[monthKey];


        const year =
            parts[2];


        if (!month) {

            throw new Error(
                "Invalid month: " +
                dateString
            );
        }


        return {

            day,
            month,
            year
        };
    }



    // =========================================================
    // TIME HELPER
    // =========================================================

    function parseTime(timeString) {

        const parts =
            timeString
                .trim()
                .split(":");


        if (parts.length !== 2) {

            throw new Error(
                "Time must look like 08:15"
            );
        }


        return {

            hour:
                parts[0]
                    .padStart(2, "0"),

            minute:
                parts[1]
                    .padStart(2, "0")
        };
    }



    // =========================================================
    // STANDARD RAVE DATE
    //
    // Example:
    //
    // setRaveDate("4395695", data.date)
    //
    // =========================================================

    function setRaveDate(
        fieldId,
        dateString
    ) {

        const {
            day,
            month,
            year
        } = parseDate(
            dateString
        );


        const dayInput =
            document.querySelector(

                `input[id*="field${fieldId}"][id$="_0"]`

            );


        const monthSelect =
            document.querySelector(

                `select[id*="field${fieldId}"][id$="_1"]`

            );


        const yearInput =
            document.querySelector(

                `input[id*="field${fieldId}"][id$="_2"]`

            );


        if (
            !dayInput ||
            !monthSelect ||
            !yearInput
        ) {

            console.warn(
                "❌ Date field not found:",
                fieldId
            );

            return false;
        }


        setInput(
            dayInput,
            day
        );


        setSelectByText(
            monthSelect,
            month
        );


        setInput(
            yearInput,
            year
        );


        return true;
    }



    // =========================================================
    // STANDARD RAVE TIME
    // =========================================================

    function setRaveTime(
        fieldId,
        timeString
    ) {

        const {
            hour,
            minute
        } = parseTime(
            timeString
        );


        const hourInput =
            document.querySelector(

                `input[id*="field${fieldId}"][id$="_0"]`

            );


        const minuteInput =
            document.querySelector(

                `input[id*="field${fieldId}"][id$="_1"]`

            );


        if (
            !hourInput ||
            !minuteInput
        ) {

            console.warn(
                "❌ Time field not found:",
                fieldId
            );

            return false;
        }


        setInput(
            hourInput,
            hour
        );


        setInput(
            minuteInput,
            minute
        );


        return true;
    }



    // =========================================================
    //
    // PAGE 1
    // VISIT PAGE
    //
    // =========================================================

    function fillVisitPage() {

        console.log(
            "================================"
        );

        console.log(
            "Detected: VISIT PAGE"
        );

        console.log(
            "================================"
        );


        // =====================================================
        // VISIT STATUS
        // Always:
        // Continuing Study and Treatment
        // =====================================================

        const visitStatus =
            document.querySelector(

                'input[id*="field4395691"][id$="_TxtBx"]'

            );


        if (visitStatus) {

            setInput(
                visitStatus,
                "Continuing Study and Treatment"
            );


            visitStatus.setAttribute(
                "previousvalue",
                "Continuing Study and Treatment"
            );


            const der =
                document.querySelector(

                    'input[id*="field4395691"][id$="_DER"]'

                );


            if (der) {

                der.value =
                    "CONTINUING VISITS";
            }

        } else {

            console.warn(
                "❌ Visit Status not found"
            );
        }



        // =====================================================
        // VISIT DATE
        // =====================================================

        setRaveDate(
            "4395695",
            data.date
        );



        // =====================================================
        // ALL ASSESSMENTS SAME CONTACT MODE
        // Always YES
        // =====================================================

        setRadio(
            "4395690",
            "Y"
        );



        // =====================================================
        // PRIMARY CONTACT MODE
        // Always Site Visit
        // =====================================================

        const contactMode =
            document.querySelector(

                'input[id*="field4395692"][id$="_TxtBx"]'

            );


        if (contactMode) {

            setInput(
                contactMode,
                "Site Visit"
            );


            contactMode.setAttribute(
                "previousvalue",
                "Site Visit"
            );


            const der =
                document.querySelector(

                    'input[id*="field4395692"][id$="_DER"]'

                );


            if (der) {

                der.value =
                    "SITE VISIT";
            }

        } else {

            console.warn(
                "❌ Primary Contact Mode not found"
            );
        }



        // =====================================================
        // PANDEMIC REASON
        // Always NO
        // =====================================================

        setRadio(
            "4395693",
            "N"
        );


        console.log(
            "✅ Visit page completed"
        );
    }



    // =========================================================
    //
    // PAGE 2
    // VITAL SIGNS
    //
    // =========================================================

    function fillVitalSignsPage() {

        console.log(
            "================================"
        );

        console.log(
            "Detected: VITAL SIGNS PAGE"
        );

        console.log(
            "================================"
        );



        // =====================================================
        // VITAL SIGNS PERFORMED
        // Always YES
        // =====================================================

        setRadio(
            "4395750",
            "Y"
        );



        // =====================================================
        // DATE
        // =====================================================

        setRaveDate(
            "4395748",
            data.date
        );



        // =====================================================
        // TIME
        // =====================================================

        setRaveTime(
            "4395752",
            data.vitalSigns.time
        );



        // =====================================================
        // SYSTOLIC BLOOD PRESSURE
        // =====================================================

        setInput(

            document.querySelector(

                'input[id*="field4395744"][id$="_Text"]'

            ),

            data.vitalSigns.systolic

        );



        // =====================================================
        // DIASTOLIC BLOOD PRESSURE
        // =====================================================

        setInput(

            document.querySelector(

                'input[id*="field4395734"][id$="_Text"]'

            ),

            data.vitalSigns.diastolic

        );



        // =====================================================
        // PULSE RATE
        // =====================================================

        setInput(

            document.querySelector(

                'input[id*="field4395740"][id$="_Text"]'

            ),

            data.vitalSigns.pulse

        );



        // =====================================================
        // TEMPERATURE
        // =====================================================

        setInput(

            document.querySelector(

                'input[id*="field4395746"][id$="_Text"]'

            ),

            data.vitalSigns.temperature

        );



        // =====================================================
        // FIND PRE / POST DIALYSIS ROWS
        // =====================================================

        const rows =
            [
                ...document.querySelectorAll(
                    "#log tr"
                )
            ];


        const preRow =
            rows.find(
                row =>

                    row.innerText
                        .toLowerCase()
                        .includes(
                            "pre dialysis"
                        )
            );


        const postRow =
            rows.find(
                row =>

                    row.innerText
                        .toLowerCase()
                        .includes(
                            "post dialysis"
                        )
            );



        // =====================================================
        // WEIGHT ROW HELPER
        // =====================================================

        function fillWeightRow(
            row,
            values,
            label
        ) {

            if (!row) {

                console.warn(
                    "❌ Row not found:",
                    label
                );

                return;
            }


            // ================================================
            // WEIGHT DATE
            // Uses the common data.date
            // ================================================

            const {
                day,
                month,
                year
            } = parseDate(
                data.date
            );


            setInput(

                row.querySelector(
                    'input[id*="CF4395749"][id$="_0"]'
                ),

                day

            );


            setSelectByText(

                row.querySelector(
                    'select[id*="CF4395749"][id$="_1"]'
                ),

                month

            );


            setInput(

                row.querySelector(
                    'input[id*="CF4395749"][id$="_2"]'
                ),

                year

            );



            // ================================================
            // WEIGHT TIME
            // ================================================

            const {
                hour,
                minute
            } = parseTime(
                values.weightTime
            );


            setInput(

                row.querySelector(
                    'input[id*="CF4395753"][id$="_0"]'
                ),

                hour

            );


            setInput(

                row.querySelector(
                    'input[id*="CF4395753"][id$="_1"]'
                ),

                minute

            );



            // ================================================
            // WEIGHT
            // ================================================

            setInput(

                row.querySelector(
                    'input[id*="CF4395755"][id$="_Text"]'
                ),

                values.weight

            );


            console.log(
                "✓",
                label,
                "completed"
            );
        }



        // =====================================================
        // PRE DIALYSIS
        // =====================================================

        fillWeightRow(

            preRow,

            data.vitalSigns.preDialysis,

            "Pre Dialysis"

        );



        // =====================================================
        // POST DIALYSIS
        // =====================================================

        fillWeightRow(

            postRow,

            data.vitalSigns.postDialysis,

            "Post Dialysis"

        );


        console.log(
            "✅ Vital Signs page completed"
        );
    }



    // =========================================================
    //
    // PAGE 3
    // DIALYSIS PROCEDURE
    //
    // =========================================================

    function fillDialysisProcedurePage() {

        console.log(
            "================================"
        );

        console.log(
            "Detected: DIALYSIS PROCEDURE PAGE"
        );

        console.log(
            "================================"
        );



        // =====================================================
        // WAS DIALYSIS PERFORMED?
        // Always YES
        // =====================================================

        setRadio(
            "4396135",
            "Y"
        );



        // =====================================================
        // TYPE OF DIALYSIS
        // =====================================================

        setSelectByText(

            document.querySelector(

                'select[id*="field4396141"][id$="_DD"]'

            ),

            data.dialysis.type

        );



        // =====================================================
        // ACCESS TYPE
        //
        // Graft
        // Fistula
        // Catheter
        // Peritoneal Dialysis Catheter
        // =====================================================

        setSelectByText(

            document.querySelector(

                'select[id*="field4396118"][id$="_DD"]'

            ),

            data.dialysis.accessType

        );



        // =====================================================
        // FREQUENCY CHANGED SINCE LAST VISIT?
        // Always NO
        // =====================================================

        setRadio(
            "4396143",
            "N"
        );



        // =====================================================
        // HEMODIALYSIS SUBTYPE
        //
        // High Flux
        // Expanded hemodialysis (HDx)
        // Low Flux
        // =====================================================

        setSelectByText(

            document.querySelector(

                'select[id*="field4396137"][id$="_DD"]'

            ),

            data.dialysis.subtype

        );



        // =====================================================
        // SINGLE-POOL Kt/V
        // =====================================================

        setInput(

            document.querySelector(

                'input[id*="field4396119"][id$="_Text"]'

            ),

            data.dialysis.singlePoolKtV

        );



        // =====================================================
        // SESSION VOLUME
        // =====================================================

        setInput(

            document.querySelector(

                'input[id*="field4396120"][id$="_Text"]'

            ),

            data.dialysis.sessionVolume

        );



        // =====================================================
        // DIALYSIS START DATE
        // =====================================================

        setRaveDate(
            "4396139",
            data.date
        );



        // =====================================================
        // DIALYSIS END DATE
        // Same date
        // =====================================================

        setRaveDate(
            "4396131",
            data.date
        );



        // =====================================================
        // START TIME
        // =====================================================

        setRaveTime(
            "4396140",
            data.dialysis.startTime
        );



        // =====================================================
        // END TIME
        // =====================================================

        setRaveTime(
            "4396132",
            data.dialysis.endTime
        );



        // =====================================================
        // COMPLETED DIALYSIS
        // Always YES
        // =====================================================

        setRadio(
            "4396142",
            "Y"
        );



        // =====================================================
        // PROCEDURE INTERRUPTED
        // Always NO
        // =====================================================

        setRadio(
            "4396134",
            "N"
        );


        console.log(
            "✅ Dialysis Procedure page completed"
        );
    }

    // ------------------------------------

    // PAGE 4
    // Lab Sample
    function fillLabSampleCollectionPage() {

        console.log(
            "Detected: LAB SAMPLE COLLECTION PAGE"
        );

        const rows = [
            ...document.querySelectorAll("#log tr")
        ].filter(row =>
            row.querySelector(
                'input[type="radio"][name*="CF4396072"]'
            )
        );


        rows.forEach(row => {

            // =====================================================
            // WAS SAMPLE COLLECTED? = YES
            // =====================================================

            const yesRadio =
                row.querySelector(
                    'input[type="radio"][name*="CF4396072"][value="Y"]'
                );

            if (yesRadio) {

                const group =
                    yesRadio.closest("table");

                if (group) {

                    group.querySelectorAll(
                        'input[type="radio"]'
                    ).forEach(r => {
                        r.checked = false;
                    });

                    group.setAttribute(
                        "rbvalue",
                        "Y"
                    );
                }

                yesRadio.checked = true;

                yesRadio.dispatchEvent(
                    new MouseEvent("click", {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    })
                );

                yesRadio.checked = true;

                if (group) {
                    group.setAttribute(
                        "rbvalue",
                        "Y"
                    );
                }
            }


            // =====================================================
            // COLLECTION DATE
            // Same date for every sample
            // =====================================================

            const {
                day,
                month,
                year
            } = parseDate(
                data.date
            );


            setInput(
                row.querySelector(
                    'input[id*="CF4396071"][id$="_0"]'
                ),
                day
            );


            setSelectByText(
                row.querySelector(
                    'select[id*="CF4396071"][id$="_1"]'
                ),
                month
            );


            setInput(
                row.querySelector(
                    'input[id*="CF4396071"][id$="_2"]'
                ),
                year
            );


            // =====================================================
            // COLLECTION TIME
            // Same time for every sample
            // =====================================================

            const {
                hour,
                minute
            } = parseTime(
                data.labSamples.time
            );


            setInput(
                row.querySelector(
                    'input[id*="CF4396074"][id$="_0"]'
                ),
                hour
            );


            setInput(
                row.querySelector(
                    'input[id*="CF4396074"][id$="_1"]'
                ),
                minute
            );

        });


        console.log(
            `✅ Filled ${rows.length} lab samples`
        );
    }
    function fillPKSampleCollectionPage() {

        console.log(
            "================================"
        );

        console.log(
            "Detected: PK SAMPLE COLLECTION PAGE"
        );

        console.log(
            "================================"
        );


        // =====================================================
        // PK SAMPLE COLLECTED = YES
        // Field 4396088
        // =====================================================
        setLogRadio(
            "4396088",
            "Y"
        );


        // =====================================================
        // COLLECTION DATE
        // Field 4396087
        // =====================================================

        const {
            day,
            month,
            year
        } = parseDate(
            data.date
        );


        const dateDay =
            document.querySelector(
                'input[id*="CF4396087"][id$="_0"]'
            );


        const dateMonth =
            document.querySelector(
                'select[id*="CF4396087"][id$="_1"]'
            );


        const dateYear =
            document.querySelector(
                'input[id*="CF4396087"][id$="_2"]'
            );


        if (
            dateDay &&
            dateMonth &&
            dateYear
        ) {

            setInput(
                dateDay,
                day
            );


            setSelectByText(
                dateMonth,
                month
            );


            setInput(
                dateYear,
                year
            );


            console.log(
                "✅ PK Collection Date =",
                data.date
            );

        } else {

            console.error(
                "❌ PK Collection Date controls not found",
                {
                    dateDay,
                    dateMonth,
                    dateYear
                }
            );
        }



        // =====================================================
        // COLLECTION TIME
        // Field 4396090
        // =====================================================

        const {
            hour,
            minute
        } = parseTime(
            data.pkSample.time
        );


        const timeHour =
            document.querySelector(
                'input[id*="CF4396090"][id$="_0"]'
            );


        const timeMinute =
            document.querySelector(
                'input[id*="CF4396090"][id$="_1"]'
            );


        if (
            timeHour &&
            timeMinute
        ) {

            setInput(
                timeHour,
                hour
            );


            setInput(
                timeMinute,
                minute
            );


            console.log(
                "✅ PK Collection Time =",
                data.pkSample.time
            );

        } else {

            console.error(
                "❌ PK Collection Time controls not found",
                {
                    timeHour,
                    timeMinute
                }
            );
        }



        // =====================================================
        // MARK PAGE MODIFIED
        // =====================================================

        if (
            typeof PromptBeforeNavAway_SetIsModified
            === "function"
        ) {

            PromptBeforeNavAway_SetIsModified(
                true
            );
        }


        console.log(
            "✅ PK Sample Collection completed"
        );
    }


    // =========================================================
    //
    // AUTOMATIC PAGE DETECTION
    //
    // =========================================================

    const pageText =
        document.body
            .innerText
            .toLowerCase();



    // =========================================================
    // VISIT PAGE
    // =========================================================

    if (

        pageText.includes(
            "visit status"
        )

        &&

        pageText.includes(
            "primary contact mode"
        )

    ) {

        fillVisitPage();
    }



    // =========================================================
    // VITAL SIGNS PAGE
    // =========================================================

    else if (

        pageText.includes(
            "vital signs performed"
        )

        &&

        pageText.includes(
            "systolic blood pressure"
        )

    ) {

        fillVitalSignsPage();
    }



    // =========================================================
    // DIALYSIS PROCEDURE PAGE
    // =========================================================

    else if (

        pageText.includes(
            "was dialysis performed"
        )

        &&

        pageText.includes(
            "type of dialysis"
        )

    ) {

        fillDialysisProcedurePage();
    }
    // =========================================================
    // PK SAMPLE COLLECTION
    // =========================================================

    else if (
        pageText.includes("pk sample collected")
    ) {

        console.log("✅ PK Sample Collection detected");

        fillPKSampleCollectionPage();
    }
    else if (
        pageText.includes("page: lab sample collection")
    ) {

        fillLabSampleCollectionPage();

    }

    else if (pageText.includes("was dose administered")) {

        // ============================================================
        // STUDY DRUG ADMINISTRATION
        // ============================================================


        // ============================================================
        // 1. WAS DOSE ADMINISTERED?
        // Always YES
        // ============================================================

        setRadio(
            "4395888",
            "Y"
        );


        // ============================================================
        // 2. START DATE
        // ============================================================

        setRaveDate(
            "4395894",
            data.date
        );


        // ============================================================
        // 3. END DATE
        //
        // SAME DATE AS START DATE
        // ============================================================

        setRaveDate(
            "4395884",
            data.date
        );


        // ============================================================
        // 4. START TIME
        // ============================================================

        setRaveTime(
            "4395895",
            data.drugAdministration.startTime
        );


        // ============================================================
        // 5. END TIME
        // ============================================================

        setRaveTime(
            "4395885",
            data.drugAdministration.endTime
        );


        // ============================================================
        // 6. KIT NUMBER 1
        // ============================================================

        const kit1Input = document.querySelector(
            'input.SearchList_TextBox[id*="field4395890"]'
        );

        setInput(
            kit1Input,
            data.drugAdministration.kitNumber1
        );


        // ============================================================
        // 7. KIT NUMBER 2
        // ============================================================

        const kit2Input = document.querySelector(
            'input.SearchList_TextBox[id*="field4395891"]'
        );

        setInput(
            kit2Input,
            data.drugAdministration.kitNumber2
        );


        // ============================================================
        // 8. DOSE ADMINISTERED VOLUME
        // ============================================================

        const administeredVolumeInput =
            document.getElementById(
                "_ctl0_Content_R_field4395883_4395883_CRFControl_4395883_CRFControl_Text"
            );

        setInput(
            administeredVolumeInput,
            data.drugAdministration.administeredVolume
        );


        // ============================================================
        // 9. WAS THE PLANNED DOSE ADMINISTERED?
        // Always YES
        // ============================================================

        setRadio(
            "4395897",
            "Y"
        );


        // ============================================================
        // 10. INFUSION INTERRUPTED
        // Always NO
        // ============================================================

        setRadio(
            "4395887",
            "N"
        );


        console.log(
            "✅ Study Drug Administration fields completed."
        );
    }
    else if (
        pageText.includes("page: physical examination")
    ) {

        setRadio("4395911", "Y")
        setRaveDate("4395913", data.date)


    }
    else if (
        pageText.includes("page: cardiovascular event assessment")
    ) {

        setRadio("4396174", "N")
        setRadio("4396175", "N")
        setRadio("4396176", "N")
    }



    // =========================================================
    // UNKNOWN PAGE
    // =========================================================

    else {

        console.error(
            "❌ This page is not currently supported."
        );

        console.log(
            "Page title:",
            document.title
        );
    }



    // =========================================================
    // MARK RAVE PAGE AS MODIFIED
    // =========================================================

    try {

        if (

            typeof PromptBeforeNavAway_SetIsModified
            ===
            "function"

        ) {

            PromptBeforeNavAway_SetIsModified(
                true
            );
        }

    } catch (e) {

        console.warn(
            "Could not manually mark page modified."
        );
    }


})();