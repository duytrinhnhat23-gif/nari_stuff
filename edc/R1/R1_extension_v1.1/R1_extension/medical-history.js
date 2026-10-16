async function r1PopulateMedicalHistory(DATA) {



    const sleep = ms => new Promise(r => setTimeout(r, ms));



    // ============================================================

    // DATA

    //

    // Medical History | Start Date | End Date/Ongoing | ConMed

    // ============================================================
    // ============================================================

    // PARSE

    // ============================================================



    const RECORDS = DATA

        .trim()

        .split(/\r?\n/)

        .filter(Boolean)

        .map(line => {



            const parts = line

                .split("|")

                .map(x => x.trim());



            const term = parts[0];

            const start = parts[1];

            const third = parts[2];

            const conmed = parts[3] || "";



            const isOngoing =

                third.toLowerCase() === "ongoing";



            return {

                term,

                start,

                ongoing: isOngoing ? "Yes" : "No",

                end: isOngoing ? "" : third,

                conmed

            };

        });





    console.log("RECORDS:", RECORDS);





    // ============================================================

    // WAIT

    // ============================================================



    async function waitFor(fn, timeout = 10000) {



        const start = Date.now();



        while (Date.now() - start < timeout) {



            try {



                const result = fn();



                if (result)

                    return result;



            } catch (_) { }



            await sleep(100);

        }



        return null;

    }





    // ============================================================

    // REACT-SAFE VALUE SETTER

    // ============================================================



    function setNativeValue(el, value) {



        if (!el)

            return false;



        el.focus();



        const proto =

            el instanceof HTMLTextAreaElement

                ? HTMLTextAreaElement.prototype

                : HTMLInputElement.prototype;



        const setter =

            Object.getOwnPropertyDescriptor(

                proto,

                "value"

            )?.set;



        if (setter) {

            setter.call(el, value);

        } else {

            el.value = value;

        }



        el.dispatchEvent(

            new InputEvent("input", {

                bubbles: true,

                inputType: "insertText",

                data: value

            })

        );



        el.dispatchEvent(

            new Event("change", {

                bubbles: true

            })

        );



        return true;

    }





    // ============================================================

    // TABLE

    // ============================================================



    function getTable() {



        return document.querySelector(

            'table[data-testid="loglines-grid"]'

        );

    }





    function getRows() {



        const table = getTable();



        if (!table)

            return [];



        return [

            ...table.querySelectorAll(

                "tbody tr.onex-data-grid__table-body-row"

            )

        ];

    }





    // ============================================================

    // COLUMN MAPPING

    //

    // Do NOT depend on cell number.

    // Use data-column-id from header.

    // ============================================================



    function getColumnMap() {



        const table = getTable();



        if (!table)

            return {};



        const headers = [

            ...table.querySelectorAll("thead th")

        ];



        const map = {};



        headers.forEach((th, index) => {



            const id =

                th.getAttribute("data-column-id");



            if (id)

                map[id] = index;

        });



        return map;

    }





    function getCell(row, columnId) {



        const map = getColumnMap();



        const index = map[columnId];



        if (index === undefined)

            return null;



        return row.children[index] || null;

    }





    // ============================================================

    // BLANK ROW

    // ============================================================



    function findBlankRow() {



        return getRows().find(row => {



            const cell =

                getCell(row, "MHTERM");



            const textarea =

                cell?.querySelector(

                    "textarea.text-area"

                );



            return (

                textarea &&

                !textarea.value.trim()

            );

        }) || null;

    }





    // ============================================================

    // REAL CLICK

    // ============================================================



    function realClick(el) {



        if (!el)

            return;



        el.scrollIntoView({

            block: "center",

            inline: "nearest"

        });



        el.dispatchEvent(

            new MouseEvent("mousedown", {

                bubbles: true,

                cancelable: true,

                view: window

            })

        );



        el.focus?.();



        el.dispatchEvent(

            new MouseEvent("mouseup", {

                bubbles: true,

                cancelable: true,

                view: window

            })

        );



        el.click();

    }





    // ============================================================

    // TERM

    //

    // Important:

    // type -> click textarea -> click outside -> wait

    // ============================================================



    async function commitTerm(term, row) {



        term.scrollIntoView({

            block: "center"

        });



        // Re-click/focus textarea

        realClick(term);



        await sleep(300);





        // New UI has no #search_field.

        //

        // Use row number cell as a real outside target.



        const outside =

            row.querySelector(

                ".log-number-cell"

            ) ||

            row.children[0] ||

            document.querySelector(

                ".onex-data-grid-control__titleWrapper"

            ) ||

            document.body;





        realClick(outside);





        term.dispatchEvent(

            new Event("change", {

                bubbles: true

            })

        );



        term.dispatchEvent(

            new FocusEvent("focusout", {

                bubbles: true,

                relatedTarget: outside

            })

        );



        term.blur();



        console.log(

            "Waiting for dependent fields..."

        );



        await sleep(1200);

    }





    // ============================================================

    // RADIO

    //

    // New UI:

    //

    // .radio-buttons

    // .onex-radio

    // input.form-check-input

    // label.form-check-label

    // ============================================================



    async function chooseRadio(cell, answer) {



        if (!cell || !answer)

            return false;



        const wanted =

            answer.trim().toLowerCase();





        const labels = [

            ...cell.querySelectorAll(

                "label.form-check-label"

            )

        ];





        console.log(

            "RADIO OPTIONS:",

            labels.map(

                x => x.textContent.trim()

            )

        );





        const label =

            labels.find(

                x =>

                    x.textContent

                        .trim()

                        .toLowerCase()

                    === wanted

            );





        if (!label) {



            console.error(

                `Radio "${answer}" not found`

            );



            return false;

        }





        const inputId =

            label.getAttribute("for");



        let input = null;



        if (inputId) {



            // CSS.escape handles IDs like :rbs:

            input =

                document.getElementById(

                    inputId

                );

        }





        if (!input) {



            input =

                label.closest(".form-check")

                    ?.querySelector(

                        'input[type="radio"]'

                    );

        }





        if (!input) {



            console.error(

                `Input for "${answer}" not found`

            );



            return false;

        }





        realClick(input);



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





        await sleep(700);



        return input.checked;

    }





    // ============================================================

    // DATE HELPERS

    // ============================================================



    const MONTHS = {

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

        DEC: "Dec"

    };





    function normalizeDateParts(value) {



        let [day, month, year] =

            value.split("-");



        if (day === "00")

            day = "un";



        if (month === "000") {

            month = "UNK";

        } else {

            month =

                MONTHS[

                month.toUpperCase()

                ] || month;

        }



        return {

            day,

            month,

            year

        };

    }





    // ============================================================

    // GENERIC DATE SETTER

    //

    // Supports both:

    // 1. separate day/month/year controls

    // 2. one text input

    //

    // We don't yet have expanded-date HTML, so this deliberately

    // discovers the controls instead of assuming old class names.

    // ============================================================



    async function setDate(cell, value) {



        if (!cell)

            throw new Error("Date cell missing");



        const {

            day,

            month,

            year

        } = normalizeDateParts(value);



        console.log("DATE:", day, month, year);





        // ============================================================

        // DAY

        // ============================================================



        const dayInput =

            cell.querySelector('input[placeholder="dd"]');



        if (!dayInput) {

            console.error("❌ Day input not found");

            return false;

        }



        setNativeValue(dayInput, day);



        dayInput.dispatchEvent(

            new Event("change", {

                bubbles: true

            })

        );



        dayInput.blur();



        await sleep(300);





        // ============================================================

        // MONTH

        //

        // IMPORTANT:

        // This is React Select, NOT <select>.

        // ============================================================



        const monthCombo =

            cell.querySelector(

                '.onex-select input[role="combobox"]'

            );



        if (!monthCombo) {

            console.error("❌ Month dropdown not found");

            return false;

        }





        // Normalize month to what appears in dropdown

        //

        // Jan, Feb, Mar...

        // or UNK



        let wantedMonth = month;



        if (month !== "UNK") {

            wantedMonth =

                month.charAt(0).toUpperCase() +

                month.slice(1).toLowerCase();

        }





        console.log(

            "Selecting month:",

            wantedMonth

        );





        // Click the React Select control rather than dummy input



        const monthControl =

            monthCombo.closest(

                ".onex-select__control"

            ) ||

            monthCombo.parentElement;





        realClick(monthControl);



        await sleep(300);





        // ============================================================

        // WAIT FOR REACT-SELECT MENU

        //

        // React Select often puts the menu OUTSIDE the <td>,

        // so search document, not cell.

        // ============================================================



        const option =

            await waitFor(() => {



                const options = [

                    ...document.querySelectorAll(

                        '[role="option"]'

                    )

                ];



                console.log(

                    "Month options:",

                    options.map(

                        x => x.textContent.trim()

                    )

                );





                return options.find(x => {



                    const text =

                        x.textContent

                            .trim()

                            .toLowerCase();



                    const wanted =

                        wantedMonth

                            .trim()

                            .toLowerCase();



                    return (

                        text === wanted ||

                        text.startsWith(wanted)

                    );

                });



            }, 5000);





        if (!option) {



            console.error(

                `❌ Month option "${wantedMonth}" not found`

            );



            // close dropdown

            document.body.click();



            return false;

        }





        console.log(

            "Found month option:",

            option.textContent.trim()

        );





        // React Select reacts reliably to mouse down.



        option.dispatchEvent(

            new MouseEvent("mousedown", {

                bubbles: true,

                cancelable: true,

                view: window

            })

        );



        option.dispatchEvent(

            new MouseEvent("mouseup", {

                bubbles: true,

                cancelable: true,

                view: window

            })

        );



        option.click();



        await sleep(500);





        // ============================================================

        // VERIFY MONTH

        // ============================================================



        const monthContainer =

            cell.querySelector(

                ".onex-select__value-container"

            );





        const selectedMonth =

            monthContainer

                ?.textContent

                ?.trim();





        console.log(

            "Selected month:",

            selectedMonth

        );





        // ============================================================

        // YEAR

        // ============================================================



        const yearInput =

            cell.querySelector(

                'input[placeholder="yyyy"]'

            );



        if (!yearInput) {

            console.error("❌ Year input not found");

            return false;

        }





        setNativeValue(

            yearInput,

            year

        );





        yearInput.dispatchEvent(

            new Event("change", {

                bubbles: true

            })

        );





        yearInput.blur();



        await sleep(500);





        console.log(

            `✅ Date entered: ${day}-${wantedMonth}-${year}`

        );



        return true;

    }





    // ============================================================

    // WAIT FOR A COLUMN TO OPEN

    // ============================================================



    async function waitForEnabledCell(

        row,

        columnId,

        timeout = 10000

    ) {



        return await waitFor(() => {



            const cell =

                getCell(

                    row,

                    columnId

                );





            if (!cell)

                return null;





            // Old disabled cells in new UI are empty and have

            // bg-disabled.



            const hasControl =

                cell.querySelector(

                    "input, select, textarea, [role='radiogroup'], [role='combobox']"

                );





            if (hasControl)

                return cell;





            return null;



        }, timeout);

    }





    // ============================================================

    // FILL ONE

    // ============================================================



    async function fillOne(TEST) {



        console.log("");

        console.log(

            "================================"

        );

        console.log(

            "STARTING:",

            TEST.term

        );

        console.log(

            "================================"

        );





        // ========================================================

        // FIND BLANK ROW

        // ========================================================



        const row =

            await waitFor(

                () => findBlankRow(),

                5000

            );





        if (!row) {



            console.error(

                "❌ No blank row found"

            );



            return false;

        }





        // ========================================================

        // TERM

        // ========================================================



        const termCell =

            getCell(

                row,

                "MHTERM"

            );





        const term =

            termCell?.querySelector(

                "textarea.text-area"

            );





        if (!term) {



            console.error(

                "❌ Medical History textarea not found"

            );



            return false;

        }





        if (term.value.trim()) {



            console.error(

                "❌ Row already contains a term"

            );



            return false;

        }





        console.log(

            "1 → TERM:",

            TEST.term

        );





        setNativeValue(

            term,

            TEST.term

        );





        await sleep(300);





        // Important behavior from your old working code:

        //

        // enter term

        // -> click textarea again

        // -> click outside

        // -> wait



        await commitTerm(

            term,

            row

        );





        // ========================================================

        // START DATE

        // ========================================================



        console.log(

            "Waiting for Start Date..."

        );





        const startCell =

            await waitForEnabledCell(

                row,

                "MHSTDAT"

            );





        if (!startCell) {



            console.error(

                "❌ Start Date did not open"

            );



            console.log(

                "Current row:",

                row

            );



            return false;

        }





        console.log(

            "2 → START DATE:",

            TEST.start

        );





        const startSuccess =

            await setDate(

                startCell,

                TEST.start

            );





        if (!startSuccess) {



            console.error(

                "❌ Could not enter Start Date"

            );



            return false;

        }





        // ========================================================

        // ONGOING

        // ========================================================



        const ongoingCell =

            await waitForEnabledCell(

                row,

                "MHONGO"

            );





        if (!ongoingCell) {



            console.error(

                "❌ Ongoing field did not open"

            );



            return false;

        }





        console.log(

            "3 → ONGOING:",

            TEST.ongoing

        );





        const ongoingSuccess =

            await chooseRadio(

                ongoingCell,

                TEST.ongoing

            );





        if (!ongoingSuccess) {



            console.error(

                "❌ Could not select Ongoing"

            );



            return false;

        }





        // ========================================================

        // END DATE

        // ========================================================



        if (

            TEST.ongoing === "No"

        ) {



            console.log(

                "Waiting for End Date..."

            );





            const endCell =

                await waitForEnabledCell(

                    row,

                    "MHENDAT"

                );





            if (!endCell) {



                console.error(

                    "❌ End Date did not open"

                );



                return false;

            }





            console.log(

                "4 → END DATE:",

                TEST.end

            );





            const endSuccess =

                await setDate(

                    endCell,

                    TEST.end

                );





            if (!endSuccess) {



                console.error(

                    "❌ Could not enter End Date"

                );



                return false;

            }



        } else {



            console.log(

                "4 → END DATE skipped (ongoing)"

            );

        }





        // ========================================================

        // CONMED

        // ========================================================



        if (

            TEST.conmed &&

            TEST.conmed.trim()

        ) {



            const conmedCell =

                await waitForEnabledCell(

                    row,

                    "MHCM"

                );





            if (!conmedCell) {



                console.error(

                    "❌ ConMed field did not open"

                );



                return false;

            }





            console.log(

                "5 → CONMED:",

                TEST.conmed

            );





            const conmedSuccess =

                await chooseRadio(

                    conmedCell,

                    TEST.conmed

                );





            if (!conmedSuccess) {



                console.error(

                    "❌ Could not select ConMed"

                );



                return false;

            }

        }





        console.log(

            `✅ COMPLETED: ${TEST.term}`

        );





        return true;

    }





    // ============================================================

    // CHECK PAGE

    // ============================================================



    const table =

        await waitFor(

            () => getTable(),

            5000

        );





    if (!table) {



        console.error(

            "❌ Medical History table not found."

        );



        return;

    }





    console.log(

        "✅ New Medical History UI detected"

    );





    console.log(

        "COLUMN MAP:",

        getColumnMap()

    );





    // ============================================================

    // RUN

    // ============================================================



    let completed = 0;





    console.log(

        `🚀 Starting ${RECORDS.length} records`

    );





    for (

        let i = 0;

        i < RECORDS.length;

        i++

    ) {



        const TEST =

            RECORDS[i];





        console.log("");

        console.log(

            `######## ${i + 1}/${RECORDS.length} ########`

        );





        try {



            const success =

                await fillOne(TEST);





            if (!success) {



                console.error(

                    "⛔ STOPPED AT:",

                    TEST

                );



                break;

            }





            completed++;





            // Allow React to finish rebuilding row

            await sleep(1000);





        } catch (error) {



            console.error(

                "❌ ERROR:",

                TEST.term,

                error

            );



            break;

        }

    }





    // ============================================================

    // DONE

    // ============================================================



    console.log("");

    console.log(

        "================================"

    );



    console.log(

        `✅ COMPLETED ${completed}/${RECORDS.length}`

    );



    console.log(

        "⚠️ NOT SAVED"

    );



    console.log(

        "================================"

    );



}