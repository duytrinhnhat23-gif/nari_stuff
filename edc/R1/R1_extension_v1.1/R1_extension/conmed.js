async function r1EnterConmed(DATA_TEXT) {

    /******************************************************************

     * MEDIDATA RAVE / ONE-X

     * CONCOMITANT MEDICATION ENTRY

     *

     * Updated for new React / OneX UI

     ******************************************************************/



    /******************************************************************

     * DATA

     ******************************************************************/
    /******************************************************************

     * NEW ONE-X COLUMN IDS

     ******************************************************************/



    const COL = {

        MED_NUMBER: "CMSPID",

        MEDICATION: "CMTRT",



        HEMO: "CMHDYN",

        RESCUE: "CMRESCYN",



        START_DATE: "CMSTDAT",

        ONGOING: "CMONGO",

        END_DATE: "CMENDAT",



        DOSE: "CMDOSE",



        UNIT: "CMDOSU",

        UNIT_OTHER: "DOSUO",



        FREQUENCY: "CMDOSFRQ",

        FREQUENCY_OTHER: "DOSFRQO",



        ROUTE: "CMROUTE",

        ROUTE_OTHER: "ROUTEO",



        PRIMARY_REASON: "CMREAS",

        REASON_SPECIFY: "CMINDC"

    };





    /******************************************************************

     * SPEED

     ******************************************************************/



    const SPEED = {

        POLL: 25,

        SCROLL: 20,

        INPUT: 30,

        CLICK: 40,

        DEPENDENCY: 100,

        MEDICATION: 250,

        DROPDOWN: 50,

        ROW: 75

    };





    /******************************************************************

     * HELPERS

     ******************************************************************/



    const sleep = ms =>

        new Promise(resolve => setTimeout(resolve, ms));





    const norm = value =>

        String(value ?? "")

            .replace(/\s+/g, " ")

            .trim()

            .toLowerCase();





    const log = (...args) =>

        console.log(

            "%c[RAVE-ONE-X]",

            "color:#0074d9;font-weight:bold",

            ...args

        );





    async function waitFor(

        fn,

        timeout = 6000,

        interval = SPEED.POLL

    ) {

        const start = Date.now();



        while (Date.now() - start < timeout) {

            try {

                const result = fn();



                if (result) {

                    return result;

                }

            } catch (_) { }



            await sleep(interval);

        }



        return null;

    }





    function visible(el) {

        if (!el) return false;



        const style = getComputedStyle(el);



        return (

            style.display !== "none" &&

            style.visibility !== "hidden"

        );

    }





    /******************************************************************

     * REACT-SAFE INPUT VALUE

     ******************************************************************/



    function setInputValue(element, value) {

        if (!element) return;



        const proto =

            element.tagName === "TEXTAREA"

                ? HTMLTextAreaElement.prototype

                : HTMLInputElement.prototype;



        const setter =

            Object.getOwnPropertyDescriptor(

                proto,

                "value"

            )?.set;



        if (setter) {

            setter.call(element, value);

        } else {

            element.value = value;

        }



        element.dispatchEvent(

            new Event("input", {

                bubbles: true

            })

        );



        element.dispatchEvent(

            new Event("change", {

                bubbles: true

            })

        );

    }





    function fireClick(element) {

        if (!element) return;



        element.dispatchEvent(

            new MouseEvent("mousedown", {

                bubbles: true,

                cancelable: true,

                view: window

            })

        );



        element.dispatchEvent(

            new MouseEvent("mouseup", {

                bubbles: true,

                cancelable: true,

                view: window

            })

        );



        element.dispatchEvent(

            new MouseEvent("click", {

                bubbles: true,

                cancelable: true,

                view: window

            })

        );

    }





    async function clickOutside() {

        const target =

            document.querySelector(

                ".form-name"

            ) ||

            document.querySelector(

                "h1"

            ) ||

            document.body;



        fireClick(target);



        await sleep(SPEED.CLICK);

    }





    /******************************************************************

     * BUILD COLUMN MAP

     *

     * New UI puts data-column-id on TH rather than TD.

     ******************************************************************/



    function getHeaders() {

        return [

            ...document.querySelectorAll(

                "th.onex-data-grid-header-cell"

            )

        ];

    }





    function buildColumnMap() {

        const headers = getHeaders();



        const map = {};



        headers.forEach((header, index) => {

            const id =

                header.getAttribute(

                    "data-column-id"

                );



            if (id) {

                /*

                 * Find the actual TD position by counting

                 * all preceding THs.

                 */

                map[id] = index;

            }

        });



        return map;

    }





    const COLUMN_MAP =

        buildColumnMap();





    console.log(

        "[RAVE-ONE-X] Column map:",

        COLUMN_MAP

    );





    /******************************************************************

     * ROWS

     ******************************************************************/



    function getRows() {

        /*

         * Only tbody rows containing actual datapoint controls.

         */

        return [

            ...document.querySelectorAll(

                "tbody tr"

            )

        ].filter(row =>

            row.querySelector(

                ".datapoint-field-controls"

            )

        );

    }





    function getCell(row, columnId) {

        const index =

            COLUMN_MAP[columnId];



        if (index === undefined) {

            throw new Error(

                `Column "${columnId}" not found.`

            );

        }



        const cells = [

            ...row.children

        ];



        return cells[index] || null;

    }





    /******************************************************************

     * MH / AE COLUMN

     ******************************************************************/



    function getMHCell(row, number) {

        return getCell(

            row,

            `MHID${number}`

        );

    }





    function getAECell(row, number) {

        return getCell(

            row,

            `AESPID${number}`

        );

    }





    /******************************************************************

     * SCROLL

     ******************************************************************/



    async function showCell(cell) {

        if (!cell) return;



        cell.scrollIntoView({

            behavior: "auto",

            block: "nearest",

            inline: "center"

        });



        await sleep(

            SPEED.SCROLL

        );

    }





    /******************************************************************

     * DISABLED / ACTIVE CELL

     ******************************************************************/



    function cellIsDisabled(cell) {

        if (!cell) return true;



        return (

            cell.classList.contains(

                "bg-disabled"

            ) ||

            !!cell.querySelector(

                ":disabled"

            )

        );

    }





    async function waitForCellEnabled(

        cell,

        timeout = 6000

    ) {

        await showCell(cell);



        return await waitFor(

            () => {

                if (

                    !cell ||

                    cell.classList.contains(

                        "bg-disabled"

                    )

                ) {

                    return false;

                }



                return (

                    cell.querySelector(

                        ".datapoint-field-controls"

                    ) ||

                    cell.querySelector(

                        "input, textarea, [role='combobox']"

                    )

                );

            },

            timeout

        );

    }





    /******************************************************************

     * FIND BLANK ROW

     ******************************************************************/



    const usedRows =

        new WeakSet();





    function findEditableRow() {

        const rows =

            getRows();



        for (const row of rows) {



            if (

                usedRows.has(row)

            ) {

                continue;

            }



            let medCell;



            try {

                medCell =

                    getCell(

                        row,

                        COL.MEDICATION

                    );

            } catch (_) {

                continue;

            }



            if (!medCell) {

                continue;

            }



            const textarea =

                medCell.querySelector(

                    "textarea"

                );



            /*

             * New blank rows have medication textarea

             * already rendered.

             */

            if (

                textarea &&

                !textarea.value.trim()

            ) {

                return row;

            }



            /*

             * Fallback for blank React control.

             */

            const text =

                medCell.textContent

                    ?.trim() || "";



            if (

                textarea &&

                !text

            ) {

                return row;

            }

        }



        return null;

    }





    /******************************************************************

     * MEDICATION

     *

     * Keep old successful behavior:

     *

     * focus

     * -> type

     * -> blur

     * -> click outside

     * -> wait for dependencies

     ******************************************************************/



    async function setMedication(

        cell,

        value

    ) {

        await showCell(cell);



        const textarea =

            await waitFor(

                () =>

                    cell.querySelector(

                        "textarea"

                    ),

                5000

            );



        if (!textarea) {

            throw new Error(

                "Medication textarea not found."

            );

        }



        textarea.click();

        textarea.focus();



        setInputValue(

            textarea,

            value

        );



        await sleep(

            SPEED.INPUT

        );



        textarea.dispatchEvent(

            new FocusEvent(

                "blur",

                {

                    bubbles: true

                }

            )

        );



        textarea.blur();



        await clickOutside();



        /*

         * New React page needs more time than

         * old Angular page to unlock fields.

         */



        log(

            "Medication:",

            value

        );

    }





    /******************************************************************

     * YES / NO RADIO

     ******************************************************************/



    async function setRadio(

        cell,

        wanted

    ) {

        await showCell(cell);



        await waitForCellEnabled(

            cell

        );



        const labels =

            await waitFor(

                () => {

                    const found = [

                        ...cell.querySelectorAll(

                            ".onex-radio label, label.form-check-label"

                        )

                    ];



                    return found.length

                        ? found

                        : null;

                },

                5000

            );



        if (!labels) {

            throw new Error(

                `Radio control not found: ${wanted}`

            );

        }



        const label =

            labels.find(

                x =>

                    norm(

                        x.textContent

                    ) ===

                    norm(wanted)

            );



        if (!label) {

            throw new Error(

                `Radio "${wanted}" not found.`

            );

        }



        const wrapper =

            label.closest(

                ".onex-radio"

            );



        const input =

            wrapper?.querySelector(

                'input[type="radio"]'

            ) ||

            document.getElementById(

                label.htmlFor

            );



        if (

            input &&

            !input.checked

        ) {

            /*

             * Click the label rather than changing

             * input.checked manually. React listens

             * for the actual click.

             */

            fireClick(label);



            await waitFor(

                () => input.checked,

                2000

            );

        }



        await sleep(

            SPEED.INPUT

        );



        log(

            "Radio:",

            wanted

        );

    }





    /******************************************************************

     * TEXT FIELD

     ******************************************************************/



    async function setText(

        cell,

        value

    ) {

        if (

            value === undefined ||

            value === null ||

            value === ""

        ) {

            return;

        }



        await showCell(cell);



        await waitForCellEnabled(

            cell

        );



        const input =

            await waitFor(

                () => {

                    return (

                        cell.querySelector(

                            'input[type="text"]:not([role="combobox"])'

                        ) ||

                        cell.querySelector(

                            "textarea"

                        )

                    );

                },

                5000

            );



        if (!input) {

            console.log(

                "CELL HTML:",

                cell.innerHTML

            );



            throw new Error(

                `Text field not found for "${value}"`

            );

        }



        input.click();

        input.focus();



        setInputValue(

            input,

            String(value)

        );



        await sleep(

            SPEED.INPUT

        );



        input.dispatchEvent(

            new FocusEvent(

                "blur",

                {

                    bubbles: true

                }

            )

        );



        input.blur();



        await sleep(

            SPEED.INPUT

        );

    }





    /******************************************************************

     * REACT SELECT

     *

     * Used for:

     * Unit

     * Frequency

     * Route

     * Primary Reason

     * Month

     * MH / AE

     ******************************************************************/



    function getVisibleOptions() {

        return [

            ...document.querySelectorAll(

                '[role="option"]'

            )

        ].filter(visible);

    }





    async function openReactSelect(

        cell

    ) {

        await showCell(cell);



        await waitForCellEnabled(

            cell

        );



        const control =

            await waitFor(

                () =>

                    cell.querySelector(

                        ".onex-select__control"

                    ) ||

                    cell.querySelector(

                        '[role="combobox"]'

                    )?.closest(

                        ".onex-select"

                    ),

                5000

            );



        if (!control) {

            console.log(

                "CELL HTML:",

                cell.innerHTML

            );



            throw new Error(

                "React select control not found."

            );

        }



        /*

         * React Select responds better to

         * mousedown on control.

         */

        control.dispatchEvent(

            new MouseEvent(

                "mousedown",

                {

                    bubbles: true,

                    cancelable: true,

                    view: window

                }

            )

        );



        await sleep(

            SPEED.DROPDOWN

        );



        return control;

    }





    async function selectReactOption(

        cell,

        wanted

    ) {

        await openReactSelect(

            cell

        );



        const wantedNorm =

            norm(wanted);



        const option =

            await waitFor(

                () => {

                    const options =

                        getVisibleOptions();



                    /*

                     * Exact first.

                     */

                    let found =

                        options.find(

                            x =>

                                norm(

                                    x.textContent

                                ) ===

                                wantedNorm

                        );



                    /*

                     * Flexible fallback.

                     */

                    if (!found) {

                        found =

                            options.find(

                                x => {

                                    const t =

                                        norm(

                                            x.textContent

                                        );



                                    return (

                                        t.includes(

                                            wantedNorm

                                        ) ||

                                        wantedNorm.includes(

                                            t

                                        )

                                    );

                                }

                            );

                    }



                    return found;

                },

                5000

            );



        if (!option) {

            console.log(

                "Available options:",

                getVisibleOptions()

                    .map(

                        x =>

                            x.textContent

                                .replace(

                                    /\s+/g,

                                    " "

                                )

                                .trim()

                    )

            );



            throw new Error(

                `Option "${wanted}" not found.`

            );

        }



        const selectedText =

            option.textContent

                .replace(

                    /\s+/g,

                    " "

                )

                .trim();



        /*

         * React Select normally handles selection

         * on mouseDown.

         */

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



        option.dispatchEvent(

            new MouseEvent(

                "mouseup",

                {

                    bubbles: true,

                    cancelable: true,

                    view: window

                }

            )

        );



        option.click();



        await sleep(

            SPEED.DROPDOWN

        );



        log(

            "Dropdown:",

            selectedText

        );



        return selectedText;

    }





    /******************************************************************

     * NORMAL DROPDOWN

     ******************************************************************/



    async function setDropdown(

        cell,

        wanted

    ) {

        if (!wanted) {

            return;

        }



        await selectReactOption(

            cell,

            wanted

        );

    }





    /******************************************************************

     * DATE

     *

     * New UI:

     *

     * input placeholder="dd"

     * React Select month

     * input placeholder="yyyy"

     *

     * Unknown:

     * 00  -> UN

     * 000 -> UNK

     ******************************************************************/



    async function setDate(

        cell,

        dateText

    ) {

        await showCell(cell);



        await waitForCellEnabled(

            cell

        );



        const datePicker =

            await waitFor(

                () =>

                    cell.querySelector(

                        ".onex-date-picker"

                    ),

                5000

            );



        if (!datePicker) {

            console.log(

                "DATE CELL HTML:",

                cell.innerHTML

            );



            throw new Error(

                `Date picker not found: ${dateText}`

            );

        }



        let [

            day,

            month,

            year

        ] =

            String(dateText)

                .trim()

                .toUpperCase()

                .split("-");





        if (day === "00") {

            day = "UN";

        }



        if (month === "000") {

            month = "UNK";

        }





        /**************************************************************

         * DAY

         **************************************************************/



        const dayInput =

            datePicker.querySelector(

                'input[placeholder="dd"]'

            );



        if (!dayInput) {

            throw new Error(

                "Day input not found."

            );

        }



        dayInput.click();

        dayInput.focus();



        setInputValue(

            dayInput,

            day

        );



        dayInput.blur();



        await sleep(

            SPEED.INPUT

        );





        /**************************************************************

         * MONTH

         *

         * IMPORTANT:

         * Month is no longer <select>.

         * It is React Select.

         **************************************************************/



        const monthWrapper =

            datePicker.querySelector(

                ".onex-select"

            );



        if (!monthWrapper) {

            throw new Error(

                "Month React Select not found."

            );

        }



        /*

         * selectReactOption expects a cell-like

         * element, and monthWrapper contains the

         * React Select control.

         */

        await selectReactOption(

            monthWrapper,

            month

        );





        /**************************************************************

         * YEAR

         **************************************************************/



        const yearInput =

            datePicker.querySelector(

                'input[placeholder="yyyy"]'

            );



        if (!yearInput) {

            throw new Error(

                "Year input not found."

            );

        }



        yearInput.click();

        yearInput.focus();



        setInputValue(

            yearInput,

            year

        );



        await sleep(

            SPEED.INPUT

        );



        yearInput.dispatchEvent(

            new FocusEvent(

                "blur",

                {

                    bubbles: true

                }

            )

        );



        yearInput.blur();



        await clickOutside();



        log(

            "Date:",

            `${day}-${month}-${year}`

        );

    }





    /******************************************************************

     * NORMALIZE UNIT

     ******************************************************************/



    function normalizeUnit(value) {

        const v =

            norm(value);



        if (
            v === "milligrams (mg)" ||
            v === "mg"
        ) {

            return {
                option:
                    "MG (MILLIGRAMS)",
                other: ""

            };
        }

        if (
            v === "milliequivalent(meq)" ||
            v === "meq"
        ) {

            return {
                option:
                    "mEq (Milliequivalent)",
                other: ""
            };
        }



        if (

            v === "micrograms (mcg)" ||

            v === "mcg"

        ) {

            return {

                option:

                    "MCG (MICROGRAMS)",

                other: ""

            };

        }



        if (

            v === "milliliters ml" ||

            v === "milliliters (ml)" ||

            v === "ml"

        ) {

            return {

                option:

                    "ML (MILLILITERS)",

                other: ""

            };

        }



        if (

            v === "international units (iu)" ||

            v === "international unit (iu)" ||

            v === "iu"

        ) {

            return {

                option:

                    "I.U. (INTERNATIONAL UNITS)",

                other: ""

            };

        }



        if (

            v.startsWith("other")

        ) {

            const other =

                value.includes(":")

                    ? value

                        .split(":")

                        .slice(1)

                        .join(":")

                        .trim()

                    : "";



            return {

                option: "Other",

                other

            };

        }



        return {

            option:

                value.trim(),

            other: ""

        };

    }





    /******************************************************************

     * NORMALIZE FREQUENCY

     ******************************************************************/



    function normalizeFrequency(value) {

        const v =

            norm(value);



        if (

            v === "daily (qd)" ||

            v === "qd" ||

            v === "once daily"

        ) {

            return {

                option:

                    "QD (Once Daily)",

                other: ""

            };

        }



        if (

            v === "twice daily (bid)" ||

            v === "bid"

        ) {

            return {

                option:

                    "BID (Twice Daily)",

                other: ""

            };

        }



        if (

            v === "three times daily (tid)" ||

            v === "tid"

        ) {

            return {

                option:

                    "TID (Three Times Daily)",

                other: ""

            };

        }



        if (

            v.includes(

                "weekly (qw)"

            ) ||

            v === "weekly (qw)"

        ) {

            return {

                option: "One Time Per Week",

                other: ""

            };

        }

        //Weekly (QW)



        if (

            v === "as needed (prn)" ||

            v === "prn"

        ) {

            return {

                option:

                    "PRN (As Needed)",

                other: ""

            };

        }



        if (

            v.includes(

                "three times weekly"

            ) ||

            v === "tiw"

        ) {

            return {

                option: "Other",

                other: "TIW"

            };

        }



        if (

            v.startsWith("other")

        ) {

            const other =

                value.includes(":")

                    ? value

                        .split(":")

                        .slice(1)

                        .join(":")

                        .trim()

                    : "";



            return {

                option: "Other",

                other

            };

        }



        return {

            option:

                value.trim(),

            other: ""

        };

    }





    /******************************************************************

     * MH / AE SEARCH SELECT

     ******************************************************************/



    async function setSearchList(

        cell,

        id

    ) {

        await showCell(cell);



        await waitForCellEnabled(

            cell,

            7000

        );



        await openReactSelect(

            cell

        );



        /*

         * Find the active React Select input.

         */

        const search =

            await waitFor(

                () => {

                    const inputs = [

                        ...document.querySelectorAll(

                            'input[role="combobox"]'

                        )

                    ];



                    return inputs.find(

                        x =>

                            visible(x) &&

                            x.getAttribute(

                                "aria-expanded"

                            ) === "true"

                    );

                },

                3000

            );



        if (search) {

            search.focus();



            /*

             * Unlike month dropdown, MH/AE may be

             * searchable.

             */

            if (

                search.getAttribute(

                    "aria-readonly"

                ) !== "true"

            ) {

                setInputValue(

                    search,

                    String(id).trim()

                );



                await sleep(

                    200

                );

            }

        }





        const wanted =

            String(id)

                .trim();



        const option =

            await waitFor(

                () => {

                    const options =

                        getVisibleOptions();



                    return options.find(

                        x => {

                            const text =

                                x.textContent

                                    .replace(

                                        /\s+/g,

                                        " "

                                    )

                                    .trim();



                            return (

                                text === wanted ||

                                text.startsWith(

                                    wanted + "-"

                                ) ||

                                text.startsWith(

                                    wanted + " "

                                ) ||

                                norm(text) ===

                                norm(wanted)

                            );

                        }

                    );

                },

                6000

            );



        if (!option) {

            console.log(

                "MH/AE options:",

                getVisibleOptions()

                    .map(

                        x =>

                            x.textContent

                                .replace(

                                    /\s+/g,

                                    " "

                                )

                                .trim()

                    )

            );



            throw new Error(

                `Could not find MH/AE ID ${id}`

            );

        }



        const selected =

            option.textContent

                .replace(

                    /\s+/g,

                    " "

                )

                .trim();



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



        option.dispatchEvent(

            new MouseEvent(

                "mouseup",

                {

                    bubbles: true,

                    cancelable: true,

                    view: window

                }

            )

        );



        option.click();



        await sleep(

            200

        );



        log(

            `Selected ID ${id}:`,

            selected

        );

    }





    /******************************************************************

     * PARSE DATA

     ******************************************************************/



    const DATA =

        DATA_TEXT

            .split(/\r?\n/)

            .map(

                line =>

                    line.trim()

            )

            .filter(Boolean)

            .map(

                line => {

                    const p =

                        line

                            .split("|")

                            .map(

                                x =>

                                    x.trim()

                            );



                    return {

                        medication:

                            p[0] || "",



                        hemo:

                            p[1] || "",



                        rescue:

                            p[2] || "",



                        startDate:

                            p[3] || "",



                        endDate:

                            p[4] || "",



                        dose:

                            p[5] || "",



                        unit:

                            p[6] || "",



                        frequency:

                            p[7] || "",



                        route:

                            p[8] || "",



                        reason:

                            p[9] || "",



                        detail:

                            p[10] || ""

                    };

                }

            );





    /******************************************************************

     * ENTER ONE MEDICATION

     ******************************************************************/



    async function enterMedication(

        record

    ) {

        log(

            "========================================"

        );



        log(

            "Starting:",

            record.medication

        );





        /**************************************************************

         * FIND ROW

         **************************************************************/



        const row =

            await waitFor(

                () =>

                    findEditableRow(),

                6000

            );



        if (!row) {

            throw new Error(

                "No unused blank medication row found."

            );

        }





        /**************************************************************

         * MEDICATION

         **************************************************************/



        await setMedication(

            getCell(

                row,

                COL.MEDICATION

            ),

            record.medication

        );





        /**************************************************************

         * WAIT UNTIL ROW OPENS

         **************************************************************/



        await waitForCellEnabled(

            getCell(

                row,

                COL.HEMO

            ),

            7000

        );





        /**************************************************************

         * HEMO

         **************************************************************/



        await setRadio(

            getCell(

                row,

                COL.HEMO

            ),

            record.hemo

        );





        /**************************************************************

         * RESCUE

         **************************************************************/



        await setRadio(

            getCell(

                row,

                COL.RESCUE

            ),

            record.rescue

        );





        /**************************************************************

         * START DATE

         **************************************************************/



        await setDate(

            getCell(

                row,

                COL.START_DATE

            ),

            record.startDate

        );





        /**************************************************************

         * ONGOING / END DATE

         **************************************************************/



        if (

            norm(

                record.endDate

            ) === "ongoing"

        ) {

            await setRadio(

                getCell(

                    row,

                    COL.ONGOING

                ),

                "Yes"

            );

        } else {



            await setRadio(

                getCell(

                    row,

                    COL.ONGOING

                ),

                "No"

            );



            const endCell =

                getCell(

                    row,

                    COL.END_DATE

                );



            await waitForCellEnabled(

                endCell,

                6000

            );



            await setDate(

                endCell,

                record.endDate

            );

        }





        /**************************************************************

         * DOSE

         **************************************************************/



        await setText(

            getCell(

                row,

                COL.DOSE

            ),

            record.dose

        );





        /**************************************************************

         * UNIT

         **************************************************************/



        const unit =

            normalizeUnit(

                record.unit

            );



        await setDropdown(

            getCell(

                row,

                COL.UNIT

            ),

            unit.option

        );





        if (

            unit.other

        ) {

            const otherCell =

                getCell(

                    row,

                    COL.UNIT_OTHER

                );



            await waitForCellEnabled(

                otherCell

            );



            await setText(

                otherCell,

                unit.other

            );

        }





        /**************************************************************

         * FREQUENCY

         **************************************************************/



        const frequency =

            normalizeFrequency(

                record.frequency

            );



        await setDropdown(

            getCell(

                row,

                COL.FREQUENCY

            ),

            frequency.option

        );





        if (

            frequency.other

        ) {

            const otherCell =

                getCell(

                    row,

                    COL.FREQUENCY_OTHER

                );



            await waitForCellEnabled(

                otherCell

            );



            await setText(

                otherCell,

                frequency.other

            );

        }





        /**************************************************************

         * ROUTE

         **************************************************************/



        await setDropdown(

            getCell(

                row,

                COL.ROUTE

            ),

            record.route

        );





        /**************************************************************

         * PRIMARY REASON

         **************************************************************/



        await setDropdown(

            getCell(

                row,

                COL.PRIMARY_REASON

            ),

            record.reason

        );





        /*

         * Important:

         * force dependency evaluation.

         */

        await clickOutside();



        await sleep(

            SPEED.DEPENDENCY

        );





        const reason =

            norm(

                record.reason

            );





        /**************************************************************

         * MEDICAL HISTORY

         **************************************************************/



        if (

            reason ===

            "medical history"

        ) {

            const ids =

                record.detail

                    .split(",")

                    .map(

                        x =>

                            x.trim()

                    )

                    .filter(Boolean);



            log(

                "Medical History IDs:",

                ids

            );



            for (

                let i = 0;

                i < ids.length &&

                i < 10;

                i++

            ) {

                const cell =

                    getMHCell(

                        row,

                        i + 1

                    );



                await waitForCellEnabled(

                    cell,

                    7000

                );



                await setSearchList(

                    cell,

                    ids[i]

                );

            }

        }





        /**************************************************************

         * ADVERSE EVENT

         **************************************************************/



        else if (

            reason ===

            "adverse event"

        ) {

            const ids =

                record.detail

                    .split(",")

                    .map(

                        x =>

                            x.trim()

                    )

                    .filter(Boolean);



            log(

                "Adverse Event IDs:",

                ids

            );



            for (

                let i = 0;

                i < ids.length &&

                i < 10;

                i++

            ) {

                const cell =

                    getAECell(

                        row,

                        i + 1

                    );



                await waitForCellEnabled(

                    cell,

                    7000

                );



                await setSearchList(

                    cell,

                    ids[i]

                );

            }

        }





        /**************************************************************

         * PROPHYLAXIS / OTHER

         **************************************************************/



        else if (

            reason ===

            "prophylaxis" ||

            reason ===

            "other"

        ) {

            if (

                record.detail

            ) {

                const cell =

                    getCell(

                        row,

                        COL.REASON_SPECIFY

                    );



                await waitForCellEnabled(

                    cell,

                    6000

                );



                await setText(

                    cell,

                    record.detail

                );

            }

        }





        /**************************************************************

         * FINISH ROW

         **************************************************************/



        usedRows.add(

            row

        );



        await clickOutside();



        await sleep(

            50

        );



        log(

            "Completed:",

            record.medication

        );

    }





    /******************************************************************

     * VALIDATE COLUMN MAP

     ******************************************************************/



    const requiredColumns = [

        COL.MEDICATION,

        COL.HEMO,

        COL.RESCUE,

        COL.START_DATE,

        COL.ONGOING,

        COL.END_DATE,

        COL.DOSE,

        COL.UNIT,

        COL.FREQUENCY,

        COL.ROUTE,

        COL.PRIMARY_REASON

    ];





    const missingColumns =

        requiredColumns.filter(

            id =>

                COLUMN_MAP[id] ===

                undefined

        );





    if (

        missingColumns.length

    ) {

        console.error(

            "[RAVE-ONE-X] Missing columns:",

            missingColumns

        );



        console.log(

            "[RAVE-ONE-X] Detected:",

            COLUMN_MAP

        );



        throw new Error(

            "Could not map all required columns."

        );

    }





    /******************************************************************

     * RUN

     ******************************************************************/



    log(

        `Dataset contains ${DATA.length} medication(s).`

    );





    for (

        let i = 0;

        i < DATA.length;

        i++

    ) {

        const record =

            DATA[i];



        try {

            log(

                `Processing ${i + 1}/${DATA.length}: ${record.medication}`

            );



            await enterMedication(

                record

            );



        } catch (error) {



            console.error(

                `[RAVE-ONE-X] FAILED on "${record.medication}"`,

                error

            );



            console.error(

                "Record:",

                record

            );



            /*

             * Stop immediately so we don't enter

             * subsequent medications into the wrong row.

             */

            break;

        }

    }





    log(

        "Script finished."

    );



}