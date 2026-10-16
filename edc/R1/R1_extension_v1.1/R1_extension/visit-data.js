// R1 Clinical Data Entry
// Press F5 on a supported form to run autofill using the object saved in the R1 popup.

async function r1RunAutofill(data) {
    // =====================================================
    // COMMON HELPERS
    // Supports old Angular UI + new React/OneX UI
    // =====================================================

    function normalize(text) {
        return String(text ?? "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function getFormName() {

        // ================================================
        // OLD RAVE UI
        // ================================================

        const oldHeader =
            document.querySelector(
                '[data-testid="formNameHeader"]'
            );

        if (oldHeader) {
            return normalize(
                oldHeader.textContent
            );
        }


        // ================================================
        // NEW REACT / ONEX UI
        //
        // IMPORTANT:
        // Scope the search to the actual datapage.
        // Otherwise the patient ID title is found first.
        // ================================================

        const datapage =
            document.querySelector(
                '[data-testid="datapage-standard"]'
            );


        const newHeader =
            datapage?.querySelector(
                ".onex-pagetitle__title"
            );


        return newHeader
            ? normalize(
                newHeader.textContent
            )
            : "";
    }

    function getRows(questionText) {

        const wanted =
            normalize(questionText);


        // ============================================
        // OLD UI
        // ============================================

        const oldRows = [
            ...document.querySelectorAll(
                ".edcRow"
            )
        ].filter(row => {

            const label =
                row.querySelector(
                    ".question-title"
                );

            return (
                label &&
                normalize(label.textContent) ===
                wanted
            );
        });


        if (oldRows.length) {
            return oldRows;
        }


        // ============================================
        // NEW REACT UI
        // ============================================

        return [
            ...document.querySelectorAll(
                ".datapoint-container"
            )
        ].filter(row => {

            const label =
                row.querySelector(
                    ".datapoint-field-label"
                );

            return (
                label &&
                normalize(label.textContent) ===
                wanted
            );
        });
    }

    function getRow(questionText) {
        return getRows(
            questionText
        )[0];
    }

    async function waitForRow(
        questionText,
        timeout = 10000
    ) {

        const start =
            Date.now();

        while (
            Date.now() - start <
            timeout
        ) {

            const row =
                getRow(questionText);

            if (row) {
                return row;
            }

            await sleep(200);
        }

        throw new Error(
            `Timed out waiting for field: ${questionText}`
        );
    }

    async function waitForRows(
        questionText,
        count,
        timeout = 10000
    ) {

        const start =
            Date.now();

        while (
            Date.now() - start <
            timeout
        ) {

            const rows =
                getRows(questionText);

            if (
                rows.length >= count
            ) {
                return rows;
            }

            await sleep(200);
        }

        throw new Error(
            `Timed out waiting for ${count} fields: ${questionText}`
        );
    }

    function fire(
        el,
        type
    ) {

        el.dispatchEvent(
            new Event(
                type,
                {
                    bubbles: true
                }
            )
        );
    }


    // =====================================================
    // TEXT INPUT
    //
    // Supports Angular + React-controlled inputs
    // =====================================================

    function setInput(
        el,
        value,
        {
            blur = true
        } = {}
    ) {
        if (!el) {
            console.warn("Input not found");
            return false;
        }

        const newValue =
            String(value);

        el.focus();


        // =================================================
        // 1. Set actual DOM value with native setter
        // =================================================

        const nativeSetter =
            Object.getOwnPropertyDescriptor(
                HTMLInputElement.prototype,
                "value"
            )?.set;

        if (nativeSetter) {
            nativeSetter.call(
                el,
                newValue
            );
        } else {
            el.value =
                newValue;
        }


        // =================================================
        // 2. Find React's own props attached to this input
        // =================================================

        const reactPropsKey =
            Object.keys(el).find(
                key =>
                    key.startsWith(
                        "__reactProps$"
                    )
            );

        const reactProps =
            reactPropsKey
                ? el[reactPropsKey]
                : null;


        // =================================================
        // 3. Call the actual React onChange handler
        // =================================================

        if (
            reactProps &&
            typeof reactProps.onChange ===
            "function"
        ) {
            try {
                reactProps.onChange({
                    target: el,
                    currentTarget: el,
                    type: "change",
                    bubbles: true,
                    defaultPrevented: false,
                    preventDefault() { },
                    stopPropagation() { },
                    persist() { },
                    nativeEvent: {
                        target: el
                    }
                });

                console.log(
                    `React onChange called => ${newValue}`
                );

            } catch (err) {
                console.warn(
                    "Direct React onChange failed:",
                    err
                );
            }
        }


        // =================================================
        // 4. Also fire browser events
        // =================================================

        el.dispatchEvent(
            new InputEvent(
                "input",
                {
                    bubbles: true,
                    composed: true,
                    inputType:
                        "insertText",
                    data:
                        newValue
                }
            )
        );

        el.dispatchEvent(
            new Event(
                "change",
                {
                    bubbles: true,
                    composed: true
                }
            )
        );


        // =================================================
        // 5. Commit via React's onBlur as well
        // =================================================

        if (blur) {

            if (
                reactProps &&
                typeof reactProps.onBlur ===
                "function"
            ) {
                try {
                    reactProps.onBlur({
                        target: el,
                        currentTarget: el,
                        type: "blur",
                        bubbles: true,
                        defaultPrevented: false,
                        preventDefault() { },
                        stopPropagation() { },
                        persist() { },
                        nativeEvent: {
                            target: el
                        }
                    });
                } catch (err) {
                    console.warn(
                        "Direct React onBlur failed:",
                        err
                    );
                }
            }

            el.blur();
        }


        return true;
    }


    // =====================================================
    // OLD HTML SELECT
    // =====================================================

    function setSelectByText(
        select,
        visibleText
    ) {

        if (!select) {

            console.warn(
                "Select not found"
            );

            return false;
        }


        const wanted =
            normalize(
                visibleText
            );


        const option = [
            ...select.options
        ].find(
            option =>
                normalize(
                    option.textContent
                ) ===
                wanted
        );


        if (!option) {

            console.warn(
                `Dropdown option not found: ${visibleText}`
            );

            return false;
        }


        const setter =
            Object.getOwnPropertyDescriptor(
                HTMLSelectElement.prototype,
                "value"
            )?.set;


        if (setter) {

            setter.call(
                select,
                option.value
            );

        } else {

            select.value =
                option.value;
        }


        select.selectedIndex =
            option.index;


        fire(
            select,
            "input"
        );

        fire(
            select,
            "change"
        );


        return true;
    }

    async function setReactSearchSelectByText(
        row,
        visibleText
    ) {
        if (!row) {
            return false;
        }

        let combo =
            row.querySelector(
                'input[role="combobox"]'
            );

        if (!combo) {
            console.warn(
                `Search dropdown not found: ${visibleText}`
            );
            return false;
        }


        combo.focus();


        // Open dropdown

        combo.dispatchEvent(
            new KeyboardEvent(
                "keydown",
                {
                    key: "ArrowDown",
                    code: "ArrowDown",
                    keyCode: 40,
                    which: 40,
                    bubbles: true,
                    cancelable: true
                }
            )
        );


        await sleep(200);


        // Actually type the medication number

        setInput(
            combo,
            String(visibleText),
            {
                blur: false
            }
        );


        // Give dynamic results time to load

        await sleep(600);


        const wanted =
            normalize(
                visibleText
            );


        const start =
            Date.now();


        while (
            Date.now() - start < 8000
        ) {

            const options = [
                ...document.querySelectorAll(
                    '[role="option"]'
                )
            ];


            let option =
                options.find(
                    el =>
                        normalize(
                            el.textContent
                        ) === wanted
                );


            if (!option) {

                const escaped =
                    String(visibleText)
                        .replace(
                            /[.*+?^${}()|[\]\\]/g,
                            "\\$&"
                        );


                const numberRegex =
                    new RegExp(
                        `(^|\\D)${escaped}(\\D|$)`
                    );


                option =
                    options.find(
                        el =>
                            numberRegex.test(
                                el.textContent.trim()
                            )
                    );
            }


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


                await sleep(300);


                console.log(
                    `Con Med selected => ${visibleText}`
                );


                return true;
            }


            await sleep(200);
        }


        console.warn(
            `Con Med option not found: ${visibleText}`
        );

        return false;
    }
    // =====================================================
    // NEW REACT SELECT
    // =====================================================

    async function setReactSelectByText(
        row,
        visibleText
    ) {
        if (!row) {
            console.warn(
                `No row supplied for React Select: ${visibleText}`
            );
            return false;
        }

        const wanted =
            normalize(
                visibleText
            );

        let combo =
            row.querySelector(
                'input[role="combobox"]'
            );

        if (!combo) {
            console.warn(
                `React combobox not found for: ${visibleText}`
            );
            return false;
        }

        // -----------------------------------------------
        // Focus the actual React Select combobox.
        // The new UI marks it aria-readonly=true.
        // ArrowDown is the reliable way to open it.
        // -----------------------------------------------

        combo.focus();

        combo.dispatchEvent(
            new KeyboardEvent(
                "keydown",
                {
                    key: "ArrowDown",
                    code: "ArrowDown",
                    keyCode: 40,
                    which: 40,
                    bubbles: true,
                    cancelable: true
                }
            )
        );

        await sleep(250);


        // -----------------------------------------------
        // Wait for React Select options.
        //
        // Options can be rendered in a floating portal,
        // OUTSIDE the datapoint row.
        // -----------------------------------------------

        let options = [];

        const start =
            Date.now();

        while (
            Date.now() - start < 5000
        ) {
            options = [
                ...document.querySelectorAll(
                    '[role="option"]'
                )
            ].filter(
                option =>
                    normalize(
                        option.textContent
                    )
            );

            if (options.length) {
                break;
            }

            await sleep(100);
        }


        if (!options.length) {
            console.warn(
                `No React Select options appeared for: ${visibleText}`
            );
            return false;
        }


        console.log(
            `Options for ${visibleText}:`,
            options.map(
                option =>
                    option.textContent.trim()
            )
        );


        const option =
            options.find(
                option =>
                    normalize(
                        option.textContent
                    ) === wanted
            );


        if (!option) {
            console.warn(
                `React Select option not found: ${visibleText}`,
                options.map(
                    option =>
                        option.textContent.trim()
                )
            );

            // Close menu
            combo.dispatchEvent(
                new KeyboardEvent(
                    "keydown",
                    {
                        key: "Escape",
                        code: "Escape",
                        keyCode: 27,
                        which: 27,
                        bubbles: true
                    }
                )
            );

            return false;
        }


        console.log(
            `Found React Select option: ${option.textContent.trim()}`
        );


        // -----------------------------------------------
        // React Select responds to the option's
        // mouse interaction.
        // -----------------------------------------------

        option.dispatchEvent(
            new MouseEvent(
                "mousemove",
                {
                    bubbles: true,
                    cancelable: true,
                    view: window
                }
            )
        );

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

        await sleep(350);


        // -----------------------------------------------
        // Verify.
        // React Select normally renders the selected
        // value as a single-value element.
        // -----------------------------------------------

        const selectedText =
            [
                ...row.querySelectorAll(
                    [
                        ".onex-select__single-value",
                        '[class*="singleValue"]'
                    ].join(",")
                )
            ]
                .map(
                    el =>
                        el.textContent.trim()
                )
                .find(Boolean);


        if (
            selectedText &&
            normalize(selectedText) === wanted
        ) {
            console.log(
                `SUCCESS: ${visibleText} selected`
            );

            return true;
        }


        // -----------------------------------------------
        // FALLBACK:
        // Use keyboard navigation.
        //
        // Re-open the menu and move to the target option.
        // -----------------------------------------------

        console.warn(
            `Mouse selection did not verify for ${visibleText}. Trying keyboard fallback.`
        );


        combo =
            row.querySelector(
                'input[role="combobox"]'
            );


        if (!combo) {
            return false;
        }


        combo.focus();


        combo.dispatchEvent(
            new KeyboardEvent(
                "keydown",
                {
                    key: "ArrowDown",
                    code: "ArrowDown",
                    keyCode: 40,
                    which: 40,
                    bubbles: true,
                    cancelable: true
                }
            )
        );


        await sleep(200);


        const freshOptions = [
            ...document.querySelectorAll(
                '[role="option"]'
            )
        ];


        const targetIndex =
            freshOptions.findIndex(
                item =>
                    normalize(
                        item.textContent
                    ) === wanted
            );


        if (targetIndex < 0) {
            console.error(
                `Keyboard fallback could not find ${visibleText}`
            );

            return false;
        }


        // First ArrowDown opened the menu and generally
        // activates the first option.
        // Move down until we reach targetIndex.

        for (
            let i = 0;
            i < targetIndex;
            i++
        ) {
            combo.dispatchEvent(
                new KeyboardEvent(
                    "keydown",
                    {
                        key: "ArrowDown",
                        code: "ArrowDown",
                        keyCode: 40,
                        which: 40,
                        bubbles: true,
                        cancelable: true
                    }
                )
            );

            await sleep(40);
        }


        combo.dispatchEvent(
            new KeyboardEvent(
                "keydown",
                {
                    key: "Enter",
                    code: "Enter",
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                    cancelable: true
                }
            )
        );


        await sleep(350);


        console.log(
            `Keyboard selection attempted => ${visibleText}`
        );

        return true;
    }


    // =====================================================
    // RADIO BUTTONS
    // Supports both old and new markup
    // =====================================================

    function clickRadioInRow(
        row,
        answerText
    ) {

        if (!row) {
            return false;
        }


        const wanted =
            normalize(
                answerText
            );


        const label = [
            ...row.querySelectorAll(
                "label"
            )
        ].find(
            el =>
                normalize(
                    el.textContent
                ) === wanted
        );


        if (!label) {

            console.warn(
                `Radio label "${answerText}" not found`
            );

            return false;
        }


        // OLD UI:
        //
        // <label>
        //   <input type=radio>
        //   Yes
        // </label>

        let radio =
            label.querySelector(
                'input[type="radio"]'
            );


        // NEW REACT UI:
        //
        // <input id=abc>
        // <label for=abc>Yes</label>

        if (!radio) {

            const forId =
                label.getAttribute(
                    "for"
                );


            if (forId) {

                radio =
                    document.getElementById(
                        forId
                    );
            }
        }


        if (!radio) {

            console.warn(
                `Radio input "${answerText}" not found`
            );

            return false;
        }


        radio.click();


        return true;
    }

    async function clickRadioVerified(
        questionText,
        answerText,
        timeout = 5000
    ) {
        const wanted =
            normalize(answerText);

        const start =
            Date.now();

        while (
            Date.now() - start < timeout
        ) {
            const row =
                getRow(questionText);

            if (!row) {
                await sleep(100);
                continue;
            }

            const label =
                [...row.querySelectorAll("label")]
                    .find(
                        el =>
                            normalize(el.textContent) ===
                            wanted
                    );

            if (!label) {
                await sleep(100);
                continue;
            }

            const forId =
                label.getAttribute("for");

            let radio =
                forId
                    ? document.getElementById(forId)
                    : label.querySelector(
                        'input[type="radio"]'
                    );

            if (!radio) {
                await sleep(100);
                continue;
            }

            // Already selected
            if (radio.checked) {
                console.log(
                    `${questionText} => ${answerText} already selected`
                );

                return true;
            }

            // Click label first
            label.click();

            await sleep(150);

            // Reacquire because React may rerender
            const freshRow =
                getRow(questionText);

            const freshLabel =
                [...freshRow.querySelectorAll("label")]
                    .find(
                        el =>
                            normalize(el.textContent) ===
                            wanted
                    );

            const freshId =
                freshLabel?.getAttribute("for");

            const freshRadio =
                freshId
                    ? document.getElementById(freshId)
                    : freshLabel?.querySelector(
                        'input[type="radio"]'
                    );

            if (freshRadio?.checked) {
                console.log(
                    `SUCCESS: ${questionText} => ${answerText}`
                );

                return true;
            }

            // Direct-input fallback
            if (freshRadio) {
                freshRadio.click();
            }

            await sleep(150);

            if (freshRadio?.checked) {
                console.log(
                    `SUCCESS after retry: ${questionText} => ${answerText}`
                );

                return true;
            }

            await sleep(100);
        }

        console.error(
            `FAILED RADIO: ${questionText} => ${answerText}`
        );

        return false;
    }
    async function clickRadio(
        questionText,
        answerText
    ) {

        const row =
            await waitForRow(
                questionText
            );


        const success =
            clickRadioInRow(
                row,
                answerText
            );


        if (success) {

            console.log(
                `${questionText} => ${answerText}`
            );
        }


        return success;
    }


    // =====================================================
    // CHECKBOX
    // =====================================================

    async function setCheckbox(
        questionText,
        checked = true
    ) {

        const row =
            await waitForRow(
                questionText
            );


        const checkbox =
            row.querySelector(
                'input[type="checkbox"]'
            );


        if (!checkbox) {

            console.warn(
                `Checkbox not found: ${questionText}`
            );

            return false;
        }


        if (
            checkbox.checked !==
            checked
        ) {

            checkbox.click();
        }


        console.log(
            `${questionText} => ${checked
                ? "checked"
                : "unchecked"
            }`
        );


        return true;
    }


    // =====================================================
    // NORMAL TEXT QUESTION
    // =====================================================

    async function setQuestion(
        questionText,
        value
    ) {
        if (
            value === undefined ||
            value === null ||
            value === ""
        ) {
            return false;
        }


        let row =
            await waitForRow(
                questionText
            );


        let input =
            row.querySelector(
                'input[type="text"].text-edit'
            );


        if (!input) {
            input =
                row.querySelector(
                    'input[placeholder="Enter data"]'
                );
        }


        if (!input) {
            console.warn(
                `Text field not found: ${questionText}`
            );

            return false;
        }


        const success =
            setInput(
                input,
                value
            );


        await sleep(300);


        // React may rerender, so reacquire the field
        row =
            await waitForRow(
                questionText
            );


        input =
            row.querySelector(
                'input[placeholder="Enter data"]'
            ) ||
            row.querySelector(
                'input[type="text"].text-edit'
            );


        const currentValue =
            input?.value;


        if (
            String(currentValue) ===
            String(value)
        ) {
            console.log(
                `COMMITTED: ${questionText} => ${value}`
            );

            return success;
        }


        console.error(
            `FAILED TO COMMIT: ${questionText}`,
            {
                wanted:
                    String(value),

                actual:
                    currentValue
            }
        );


        return false;
    }


    // =====================================================
    // DROPDOWN QUESTION
    // =====================================================

    async function setDropdown(
        questionText,
        value
    ) {
        if (!value) {
            return;
        }

        let row =
            await waitForRow(
                questionText
            );


        // ================================================
        // OLD ANGULAR UI
        // ================================================

        const oldSelect =
            row.querySelector(
                "select"
            );

        if (oldSelect) {
            const success =
                setSelectByText(
                    oldSelect,
                    value
                );

            if (success) {
                console.log(
                    `${questionText} => ${value}`
                );
            }

            return success;
        }


        // ================================================
        // NEW REACT UI
        // ================================================

        if (
            row.querySelector(
                'input[role="combobox"]'
            )
        ) {
            const success =
                await setReactSelectByText(
                    row,
                    value
                );

            if (success) {
                console.log(
                    `${questionText} => ${value}`
                );
            }

            return success;
        }


        console.warn(
            `Dropdown not found: ${questionText}`
        );

        return false;
    }


    // =====================================================
    // DATE PARSERS
    // =====================================================

    function parsePartialDate(
        value,
        fieldName
    ) {

        const match =
            String(
                value ?? ""
            ).match(
                /^(\d{2})-([A-Z0-9]{3})-(\d{4})$/i
            );


        if (!match) {

            throw new Error(
                `Invalid ${fieldName}: ${value}`
            );
        }


        const [
            ,
            day,
            monthRaw,
            year
        ] = match;


        const month =
            monthRaw.toUpperCase() ===
                "000"

                ? "UNK"

                :
                monthRaw
                    .charAt(0)
                    .toUpperCase() +
                monthRaw
                    .slice(1)
                    .toLowerCase();


        return {
            day,
            month,
            year
        };
    }


    function parseDateTime(
        value,
        fieldName
    ) {

        const match =
            String(
                value ?? ""
            ).match(
                /^(\d{1,2})-([A-Z]{3})-(\d{4})\s+(\d{2}):(\d{2})$/i
            );


        if (!match) {

            throw new Error(
                `Invalid ${fieldName}: ${value}`
            );
        }


        const [
            ,
            dayRaw,
            monthRaw,
            year,
            hour,
            minute
        ] = match;


        return {

            day:
                dayRaw.padStart(
                    2,
                    "0"
                ),

            month:
                monthRaw
                    .charAt(0)
                    .toUpperCase() +
                monthRaw
                    .slice(1)
                    .toLowerCase(),

            monthRaw:
                monthRaw.toUpperCase(),

            year,
            hour,
            minute
        };
    }


    // =====================================================
    // FILL DATE
    // Supports old date control + new React date picker
    // =====================================================
    async function fillDateByIndex(
        questionText,
        rowIndex,
        parts
    ) {
        let rows =
            getRows(
                questionText
            );

        let row =
            rows[rowIndex];

        if (!row) {
            throw new Error(
                `Date row ${rowIndex} not found: ${questionText}`
            );
        }


        const day =
            row.querySelector(
                'input[placeholder="dd"]'
            );

        const year =
            row.querySelector(
                'input[placeholder="yyyy"]'
            );


        if (!day || !year) {
            console.warn(
                `Date controls not found: ${questionText} row ${rowIndex}`
            );

            return false;
        }


        // Day first
        setInput(
            day,
            parts.day,
            {
                blur: false
            }
        );


        // Month
        await setReactSelectByText(
            row,
            parts.month
        );


        // Reacquire only once after React Select
        rows =
            getRows(
                questionText
            );

        row =
            rows[rowIndex];


        const freshYear =
            row.querySelector(
                'input[placeholder="yyyy"]'
            );


        setInput(
            freshYear,
            parts.year
        );


        console.log(
            `${questionText} [${rowIndex}] => ` +
            `${parts.day} ${parts.month} ${parts.year}`
        );


        return true;
    }
    async function fillTimeByIndex(
        questionText,
        rowIndex,
        parts
    ) {
        const rows =
            getRows(
                questionText
            );

        const row =
            rows[rowIndex];

        if (!row) {
            throw new Error(
                `Time row ${rowIndex} not found: ${questionText}`
            );
        }


        const hour =
            row.querySelector(
                'input[placeholder="HH"]'
            );

        const minute =
            row.querySelector(
                'input[placeholder="mm"]'
            );


        if (!hour || !minute) {
            console.warn(
                `Time controls not found: ${questionText} row ${rowIndex}`
            );

            return false;
        }


        setInput(
            hour,
            parts.hour,
            {
                blur: false
            }
        );


        setInput(
            minute,
            parts.minute
        );


        console.log(
            `${questionText} [${rowIndex}] => ` +
            `${parts.hour}:${parts.minute}`
        );


        return true;
    }
    async function fillDate(
        questionText,
        parts
    ) {
        let row =
            await waitForRow(
                questionText
            );


        // ================================================
        // OLD ANGULAR UI
        // ================================================

        const oldDay =
            row.querySelector(
                "input.dayText"
            );


        if (oldDay) {

            setInput(
                oldDay,
                parts.day
            );

            setSelectByText(
                row.querySelector(
                    "select.longMonthDD"
                ),
                parts.month
            );

            setInput(
                row.querySelector(
                    "input.longYearText"
                ),
                parts.year
            );

            console.log(
                `${questionText} => ${parts.day} ${parts.month} ${parts.year}`
            );

            return true;
        }


        // ================================================
        // NEW REACT / ONEX UI
        // ================================================


        // DAY

        let day =
            row.querySelector(
                'input[placeholder="dd"]'
            );


        if (!day) {
            console.warn(
                `Day field not found: ${questionText}`
            );

            return false;
        }


        setInput(
            day,
            parts.day
        );


        // IMPORTANT:
        // React rerenders after day entry
        await sleep(150);


        // REACQUIRE ROW

        row =
            await waitForRow(
                questionText
            );


        // MONTH

        const monthSuccess =
            await setReactSelectByText(
                row,
                parts.month
            );


        if (!monthSuccess) {
            console.error(
                `MONTH FAILED: ${questionText} => ${parts.month}`
            );

            return false;
        }


        // IMPORTANT:
        // React rerenders after month selection
        await sleep(150);


        // REACQUIRE ROW AGAIN

        row =
            await waitForRow(
                questionText
            );


        // YEAR

        const year =
            row.querySelector(
                'input[placeholder="yyyy"]'
            );


        if (!year) {
            console.warn(
                `Year field not found: ${questionText}`
            );

            return false;
        }


        setInput(
            year,
            parts.year
        );


        await sleep(100);


        console.log(
            `${questionText} => ${parts.day} ${parts.month} ${parts.year}`
        );


        return true;
    }


    async function fillPartialDate(
        questionText,
        parts
    ) {
        await fillDate(
            questionText,
            parts
        );
    }
    async function fillReactDateStable(
        questionText,
        parts
    ) {
        console.log(
            `Filling date: ${questionText}`,
            parts
        );

        try {

            // ================================================
            // DAY
            // ================================================

            let row =
                await waitForRow(
                    questionText
                );

            let day =
                row.querySelector(
                    'input[placeholder="dd"]'
                );

            if (!day) {
                console.error(
                    `DAY NOT FOUND: ${questionText}`
                );

                return false;
            }

            setInput(
                day,
                parts.day
            );


            // ================================================
            // MONTH
            // ================================================

            row =
                await waitForRow(
                    questionText
                );

            const monthOK =
                await setReactSelectByText(
                    row,
                    parts.month
                );

            if (!monthOK) {
                console.error(
                    `MONTH NOT SET: ${questionText}`
                );

                return false;
            }



            // ================================================
            // YEAR
            // ================================================

            row =
                await waitForRow(
                    questionText
                );

            const year =
                row.querySelector(
                    'input[placeholder="yyyy"]'
                );

            if (!year) {
                console.error(
                    `YEAR NOT FOUND: ${questionText}`
                );

                return false;
            }

            setInput(
                year,
                parts.year
            );



            // ================================================
            // VERIFY
            // ================================================

            row =
                await waitForRow(
                    questionText
                );

            const finalDay =
                row.querySelector(
                    'input[placeholder="dd"]'
                )?.value;

            const finalYear =
                row.querySelector(
                    'input[placeholder="yyyy"]'
                )?.value;

            const finalMonth =
                row.querySelector(
                    ".onex-select__single-value"
                )?.textContent?.trim();


            console.log(
                `DATE RESULT: ${questionText}`,
                {
                    day: finalDay,
                    month: finalMonth,
                    year: finalYear
                }
            );


            return (
                String(finalDay) ===
                String(parts.day) &&
                normalize(finalMonth) ===
                normalize(parts.month) &&
                String(finalYear) ===
                String(parts.year)
            );

        } catch (err) {

            console.error(
                `DATE ERROR: ${questionText}`,
                err
            );

            return false;
        }
    }


    // =====================================================
    // TIME
    // Current older forms
    // =====================================================

    async function fillTime(
        questionText,
        parts
    ) {
        let row =
            await waitForRow(
                questionText
            );


        // ================================================
        // OLD ANGULAR UI
        // ================================================

        const oldHour =
            row.querySelector(
                "input.hourText"
            );

        if (oldHour) {

            setInput(
                oldHour,
                parts.hour
            );

            setInput(
                row.querySelector(
                    "input.minuteText"
                ),
                parts.minute
            );

            console.log(
                `${questionText} => ${parts.hour}:${parts.minute}`
            );

            return;
        }


        // ================================================
        // NEW REACT / ONEX UI
        // ================================================

        let hour =
            row.querySelector(
                'input[placeholder="HH"]'
            );

        if (!hour) {
            console.warn(
                `Hour field not found: ${questionText}`
            );
            return;
        }


        setInput(
            hour,
            parts.hour
        );


        // React may rerender after changing hour
        // await sleep(100);


        row =
            await waitForRow(
                questionText
            );


        const minute =
            row.querySelector(
                'input[placeholder="mm"]'
            );


        if (!minute) {
            console.warn(
                `Minute field not found: ${questionText}`
            );
            return;
        }


        setInput(
            minute,
            parts.minute
        );


        console.log(
            `${questionText} => ${parts.hour}:${parts.minute}`
        );
    }


    function fillDateRow(
        row,
        parts
    ) {

        setInput(
            row.querySelector(
                "input.dayText"
            ),
            parts.day
        );


        setSelectByText(
            row.querySelector(
                "select.longMonthDD"
            ),
            parts.month
        );


        setInput(
            row.querySelector(
                "input.longYearText"
            ),
            parts.year
        );
    }


    function fillTimeRow(
        row,
        parts
    ) {

        setInput(
            row.querySelector(
                "input.hourText"
            ),
            parts.hour
        );


        setInput(
            row.querySelector(
                "input.minuteText"
            ),
            parts.minute
        );
    }


    // =====================================================
    // CONCOMITANT MEDICATION UI-SELECT
    // Older HD page
    // =====================================================

    async function selectConMedNumber(
        questionText,
        number,
        rowIndex = 0
    ) {

        console.log(
            `Selecting Con Med ${number}...`
        );


        let row =
            null;


        const rowStart =
            Date.now();


        while (
            Date.now() - rowStart <
            10000
        ) {

            const rows =
                getRows(
                    questionText
                );


            const candidate =
                rows[rowIndex];


            if (
                candidate?.querySelector(
                    ".ui-select-container"
                )
            ) {

                row =
                    candidate;

                break;
            }


            await sleep(200);
        }


        if (!row) {

            console.error(
                "Con Med row not found."
            );

            return false;
        }


        const toggle =
            row.querySelector(
                ".ui-select-toggle"
            );


        if (!toggle) {

            console.error(
                "Con Med dropdown toggle not found."
            );

            return false;
        }


        toggle.click();


        await sleep(500);


        let searchInput =
            null;


        const inputStart =
            Date.now();


        while (
            Date.now() - inputStart <
            5000
        ) {

            searchInput =
                row.querySelector(
                    'input.ui-select-search[type="search"]'
                );


            if (
                !searchInput ||
                searchInput.offsetParent ===
                null
            ) {

                searchInput = [
                    ...document.querySelectorAll(
                        'input.ui-select-search[type="search"]'
                    )
                ].find(
                    el =>
                        el.offsetParent !==
                        null
                );
            }


            if (searchInput) {
                break;
            }


            await sleep(100);
        }


        if (!searchInput) {

            console.error(
                "Visible Con Med search input not found."
            );

            return false;
        }


        setInput(
            searchInput,
            "",
            {
                blur: false
            }
        );


        await sleep(100);


        setInput(
            searchInput,
            String(number),
            {
                blur: false
            }
        );


        let resultRow =
            null;


        const resultStart =
            Date.now();


        while (
            Date.now() - resultStart <
            12000
        ) {

            const resultRows = [
                ...document.querySelectorAll(
                    ".ui-select-choices-row"
                )
            ].filter(
                el =>
                    normalize(
                        el.textContent
                    )
            );


            const escaped =
                String(number)
                    .replace(
                        /[.*+?^${}()|[\]\\]/g,
                        "\\$&"
                    );


            const numberRegex =
                new RegExp(
                    `(^|\\D)${escaped}(\\D|$)`
                );


            resultRow =
                resultRows.find(
                    el =>
                        normalize(
                            el.textContent
                        ) ===
                        normalize(
                            String(number)
                        )
                ) ||

                resultRows.find(
                    el =>
                        numberRegex.test(
                            el.textContent
                                .replace(
                                    /\s+/g,
                                    " "
                                )
                                .trim()
                        )
                );


            if (
                !resultRow &&
                resultRows.length ===
                1
            ) {

                resultRow =
                    resultRows[0];
            }


            if (resultRow) {
                break;
            }


            await sleep(250);
        }


        if (resultRow) {

            const target =
                resultRow.querySelector(
                    ".ui-select-choices-row-inner"
                ) ||

                resultRow.querySelector(
                    "a"
                ) ||

                resultRow;


            for (
                const type of [
                    "mouseenter",
                    "mousedown",
                    "mouseup",
                    "click"
                ]
            ) {

                target.dispatchEvent(
                    new MouseEvent(
                        type,
                        {
                            bubbles: true,
                            cancelable: true,
                            view: window
                        }
                    )
                );


                await sleep(50);
            }


            await sleep(500);


            const selected =
                row.querySelector(
                    ".ui-select-match-text"
                )?.textContent
                    ?.trim();


            if (selected) {

                console.log(
                    `Con Med selected => ${selected}`
                );

                return true;
            }
        }


        // Keyboard fallback

        searchInput.focus();


        for (
            const [
                key,
                code,
                keyCode
            ] of [

                [
                    "ArrowDown",
                    "ArrowDown",
                    40
                ],

                [
                    "Enter",
                    "Enter",
                    13
                ]

            ]
        ) {

            for (
                const type of [
                    "keydown",
                    "keyup"
                ]
            ) {

                searchInput.dispatchEvent(
                    new KeyboardEvent(
                        type,
                        {
                            key,
                            code,
                            keyCode,
                            which: keyCode,
                            bubbles: true,
                            cancelable: true
                        }
                    )
                );
            }


            await sleep(250);
        }


        await sleep(700);


        return !!row.querySelector(
            ".ui-select-match-text"
        )?.textContent?.trim();
    }


    // =====================================================
    // VITAL SIGNS
    // =====================================================

    async function runVitalSigns() {

        console.log(
            "Detected Vital Signs page"
        );


        const dt =
            parseDateTime(
                data.vitalSignsDateTime,
                "vitalSignsDateTime"
            );


        // ------------------------------------------------
        // Were vital signs performed?
        // ------------------------------------------------

        await clickRadio(
            "Were vital signs performed?",
            "Yes"
        );


        await sleep(300);


        // ------------------------------------------------
        // Date / Time
        // ------------------------------------------------

        await fillDate(
            "Date Vital signs were performed?",
            dt
        );


        await fillTime(
            "Time vital signs collected",
            dt
        );


        // ------------------------------------------------
        // Before dialysis
        // ------------------------------------------------

        await clickRadio(
            "Were Vital signs performed before dialysis?",
            "Yes"
        );


        // ------------------------------------------------
        // Pulse / BP
        // ------------------------------------------------

        await setQuestion(
            "Pulse Rate",
            data.pulseRate
        );


        await setQuestion(
            "Systolic blood pressure",
            data.systolicBP
        );


        await setQuestion(
            "Diastolic blood pressure",
            data.diastolicBP
        );


        // ------------------------------------------------
        // Height
        // ------------------------------------------------

        await setQuestion(
            "Height",
            data.heightInches
        );


        await clickRadio(
            "Height unit",
            "Inches"
        );


        console.log(
            "Vital Signs autofill complete."
        );
    }


    // =====================================================
    // ECG
    // =====================================================

    async function runECG() {

        console.log(
            "Detected ECG page"
        );


        const dt =
            parseDateTime(
                data.ecgDateTime,
                "ecgDateTime"
            );


        await clickRadio(
            "Was the ECG performed?",
            data.wasEcgPerformed
        );


        if (
            normalize(
                data.wasEcgPerformed
            ) !== "yes"
        ) {

            return;
        }


        const leadsRow =
            await waitForRow(
                "How many leads were used for this ECG?"
            );


        setSelectByText(
            leadsRow.querySelector(
                "select"
            ),
            "12-lead"
        );


        await clickRadio(
            "Was the participant rested in a supine or a semi-recumbent position for at least 10 minutes prior to ECG?",
            "Yes"
        );


        await fillDate(
            "Date of ECG",
            dt
        );


        await fillTime(
            "Start Time of ECG",
            dt
        );


        console.log(
            "ECG autofill complete."
        );
    }


    // =====================================================
    // CENTRAL LAB
    // =====================================================

    async function runCentralLab() {

        const dt =
            parseDateTime(
                data.centralLabCollectionDateTime,
                "centralLabCollectionDateTime"
            );


        await clickRadio(
            "Was a serum phosphate, calcium and albumin sample collected for this visit?",
            "Yes"
        );


        await waitForRow(
            "Was the sample collected before hemodialysis?"
        );


        await clickRadio(
            "Was the sample collected before hemodialysis?",
            "Yes"
        );


        await fillDate(
            "Collection Date",
            dt
        );


        await fillTime(
            "Collection Time",
            dt
        );


        console.log(
            "Central Lab autofill complete."
        );
    }


    // =====================================================
    // iPTH / FGF23
    // =====================================================

    async function runIPTHFGF23() {

        console.log(
            "Detected Laboratory Assessment: iPTH and FGF23 page"
        );


        const centralLab =
            parseDateTime(
                data.centralLabCollectionDateTime,
                "centralLabCollectionDateTime"
            );


        // =================================================
        // iPTH
        // =================================================

        await clickRadio(
            "Was a blood sample collected for Intact Parathyroid Hormone (iPTH) laboratory test?",
            "Yes"
        );


        await sleep(400);


        let beforeRows =
            await waitForRows(
                "Was the sample collected before hemodialysis?",
                1
            );


        clickRadioInRow(
            beforeRows[0],
            "Yes"
        );


        await sleep(300);


        // =================================================
        // FGF23
        // =================================================

        await clickRadio(
            "Was a blood sample collected for Fibroblast growth factor concentration (FGF23) laboratory tests?",
            "Yes"
        );


        await sleep(400);


        beforeRows =
            await waitForRows(
                "Was the sample collected before hemodialysis?",
                2
            );


        clickRadioInRow(
            beforeRows[1],
            "Yes"
        );


        await sleep(400);


        // =================================================
        // WAIT FOR BOTH DATE + TIME FIELDS
        // =================================================

        await waitForRows(
            "Date of Sample Collection",
            2,
            12000
        );


        await waitForRows(
            "Time of Sample Collection",
            2,
            12000
        );


        // =================================================
        // iPTH DATE + TIME
        // =================================================

        await fillDateByIndex(
            "Date of Sample Collection",
            0,
            centralLab
        );


        await fillTimeByIndex(
            "Time of Sample Collection",
            0,
            centralLab
        );


        // =================================================
        // FGF23 DATE + TIME
        // =================================================

        await fillDateByIndex(
            "Date of Sample Collection",
            1,
            centralLab
        );


        await fillTimeByIndex(
            "Time of Sample Collection",
            1,
            centralLab
        );


        console.log(
            "iPTH / FGF23 autofill complete."
        );
    }


    // =====================================================
    // HEPATITIS B
    // =====================================================

    async function runHepatitisB() {

        const dt =
            parseDateTime(
                data.centralLabCollectionDateTime,
                "centralLabCollectionDateTime"
            );


        await clickRadio(
            "Was the Hepatitis B Surface Antigen Laboratory sample collected?",
            "Yes"
        );


        await waitForRow(
            "Date of Sample Collection"
        );


        await fillDate(
            "Date of Sample Collection",
            dt
        );


        await fillTime(
            "Time of Sample Collection",
            dt
        );


        console.log(
            "Hepatitis B Surface Antigen autofill complete."
        );
    }


    // =====================================================
    // HEMATOLOGY
    // =====================================================

    async function runHematology() {

        const dt =
            parseDateTime(
                data.centralLabCollectionDateTime,
                "centralLabCollectionDateTime"
            );


        await clickRadio(
            "Was a blood sample collected for Hematology laboratory tests?",
            "Yes"
        );


        await waitForRow(
            "Was the sample collected before hemodialysis?"
        );


        await clickRadio(
            "Was the sample collected before hemodialysis?",
            "Yes"
        );


        await fillDate(
            "Date of Sample Collection",
            dt
        );


        await fillTime(
            "Time of Sample Collection",
            dt
        );


        console.log(
            "Hematology autofill complete."
        );
    }


    // =====================================================
    // BLOOD CHEMISTRY
    // =====================================================

    async function runBloodChemistry() {

        const dt =
            parseDateTime(
                data.centralLabCollectionDateTime,
                "centralLabCollectionDateTime"
            );


        await clickRadio(
            "Was a blood sample collected for Chemistry laboratory tests?",
            "Yes"
        );


        await waitForRow(
            "Was the sample collected before hemodialysis?"
        );


        await clickRadio(
            "Was the sample collected before hemodialysis?",
            "Yes"
        );


        await fillDate(
            "Date of Sample Collection",
            dt
        );


        await fillTime(
            "Time of Sample Collection",
            dt
        );


        console.log(
            "Blood Chemistry autofill complete."
        );
    }


    // =====================================================
    // HEMODIALYSIS PARAMETERS
    // =====================================================

    async function runHDParameters() {

        console.log(
            "Detected Hemodialysis Parameters page"
        );


        const hdStart =
            parseDateTime(
                data.startHemodialysisTime,
                "startHemodialysisTime"
            );


        const hdEnd =
            parseDateTime(
                data.endHemodialysisTime,
                "endHemodialysisTime"
            );

        const visitDate =
            parsePartialDate(
                data.visitDate,
                "visitDate"
            );
        await clickRadio(
            "Were hemodialysis parameters collected?",
            "Yes"
        );
        await sleep(500);

        await waitForRow(
            "Date of Hemodialysis Parameters Collection"
        );


        await fillDate(
            "Date of Hemodialysis Parameters Collection",
            visitDate
        );


        await setDropdown(
            "Type of Dialysis",
            data.dialysisType
        );


        await setDropdown(
            "Vascular access type",
            data.vascularAccessType
        );


        await setDropdown(
            "Prescribed Hemodialysis Frequency",
            data.hdFrequency
        );


        await setQuestion(
            "Prescribed Calcium Concentration of Dialysate",
            data.dialysateCalcium
        );


        await clickRadio(
            "Unit",
            "mEq/L"
        );


        await setQuestion(
            "Prescribed Hemodialysis Duration",
            data.hdDurationHours
        );


        await fillTime(
            "Start Time of Hemodialysis",
            hdStart
        );


        await fillTime(
            "End Time of Hemodialysis",
            hdEnd
        );


        await setQuestion(
            "Pre-dialysis Weight",
            data.preDialysisWeight
        );


        await clickRadio(
            "Pre-dialysis Weight Unit",
            "Kilograms"
        );


        await setQuestion(
            "Post-dialysis Weight",
            data.postDialysisWeight
        );


        await clickRadio(
            "Post-dialysis Weight Unit",
            "Kilograms"
        );


        await setQuestion(
            "Ultra-filtration Volume",
            data.ultrafiltrationVolume
        );


        await clickRadio(
            "Ultra-filtration Volume Unit",
            "Milliliters"
        );


        const vitaminDText =
            String(
                data.activeVitaminDSterol ?? ""
            );

        const vitaminDYes =
            /^yes\b/i.test(
                vitaminDText.trim()
            );


        await clickRadio(
            "Was the participant administered an active vitamin D sterol (calcitriol, paricalcitol, doxercalciferol, other) as part of the participant's hemodialysis regimen?",
            vitaminDYes
                ? "Yes"
                : "No"
        );


        if (vitaminDYes) {

            const conMedMatch =
                vitaminDText.match(
                    /con\s*med\s*(?:log\s*)?line\s*:\s*(\d+)/i
                );


            if (conMedMatch) {

                await sleep(500);


                const conMedRows =
                    await waitForRows(
                        "If Yes, provide the Concomitant Medication Number",
                        1
                    );


                await setReactSearchSelectByText(
                    conMedRows[0],
                    conMedMatch[1]
                );
            }
        }


        // =====================================================
        // CALCIMIMETIC
        // =====================================================

        const calcimimeticText =
            String(
                data.calcimimetic ?? ""
            );


        const calcimimeticYes =
            /^yes\b/i.test(
                calcimimeticText.trim()
            );


        await clickRadioVerified(
            "Was the participant administered a calcimimetic (cinacalcet, etelcalcetide, other) as part of the participant's hemodialysis regimen?",
            calcimimeticYes
                ? "Yes"
                : "No"
        );


        // =====================================================
        // CALCIMIMETIC CON MED
        // =====================================================

        if (calcimimeticYes) {

            const conMedMatch =
                calcimimeticText.match(
                    /con\s*med\s*(?:log\s*)?line\s*:\s*(\d+)/i
                );


            if (conMedMatch) {

                await sleep(300);


                // Vitamin D already created row 0.
                // Calcimimetic creates row 1 after selecting Yes.
                const conMedRows =
                    await waitForRows(
                        "If Yes, provide the Concomitant Medication Number",
                        2,
                        12000
                    );


                await setReactSearchSelectByText(
                    conMedRows[1],
                    conMedMatch[1]
                );
            }
        }


        console.log(
            "Hemodialysis Parameters autofill complete."
        );

    }


    // =====================================================
    // CKD SPECIFIC HISTORY
    // Works with new React UI
    // =====================================================

    async function runCKDHistory() {

        console.log(
            "Detected Chronic Kidney Disease (CKD) Specific History page"
        );


        // =====================================================
        // PRIMARY CAUSE
        // =====================================================

        try {
            await setDropdown(
                "Primary Cause of CKD",
                data.primaryCkdCause
            );
        } catch (err) {
            console.error(
                "Primary Cause failed:",
                err
            );
        }


        // =====================================================
        // OTHER CONTRIBUTING CAUSES
        // =====================================================

        try {

            const rawOtherCauses =
                String(
                    data.otherCkdCauses ?? ""
                ).trim();


            const noOtherCauses =
                !rawOtherCauses ||
                /^\[(?:NOT DONE|NOT APPLICABLE|NA|N\/A)\]$/i
                    .test(
                        rawOtherCauses
                    );


            if (noOtherCauses) {

                await clickRadioVerified(
                    "Were there any other possible contributing causes of CKD? (If Yes, check all that apply below)",
                    "No"
                );

            } else {

                const otherCauses =
                    rawOtherCauses
                        .split(/[,;]+/)
                        .map(
                            value =>
                                value.trim()
                        )
                        .filter(Boolean);


                await clickRadioVerified(
                    "Were there any other possible contributing causes of CKD? (If Yes, check all that apply below)",
                    "Yes"
                );


                await sleep(1000);


                for (
                    const cause of otherCauses
                ) {

                    if (
                        getRow(cause)
                    ) {
                        await setCheckbox(
                            cause,
                            true
                        );
                    } else {
                        console.warn(
                            `CKD cause not found: ${cause}`
                        );
                    }
                }
            }

        } catch (err) {

            console.error(
                "Other CKD causes failed:",
                err
            );
        }


        // =====================================================
        // DATE OF CKD DIAGNOSIS
        // =====================================================

        try {

            const ckdDate =
                parsePartialDate(
                    data.ckdDiagnosisDate,
                    "ckdDiagnosisDate"
                );

            await fillReactDateStable(
                "Date of CKD diagnosis",
                ckdDate
            );

        } catch (err) {

            console.error(
                "CKD diagnosis date failed:",
                err
            );
        }


        // =====================================================
        // FIRST HEMODIALYSIS DATE
        // =====================================================

        try {

            const firstHD =
                parsePartialDate(
                    data.firstHemodialysisDate,
                    "firstHemodialysisDate"
                );

            await fillReactDateStable(
                "Start date of participant's first hemodialysis",
                firstHD
            );

        } catch (err) {

            console.error(
                "First HD date failed:",
                err
            );
        }


        // =====================================================
        // DIALYSIS VINTAGE
        // =====================================================

        try {

            await setQuestion(
                "Cumulative Dialysis Vintage (system derived, enter only if there was a break in dialysis)",
                data.dialysisVintageYears
            );

        } catch (err) {

            console.error(
                "Dialysis Vintage failed:",
                err
            );
        }


        // =====================================================
        // 3x/WEEK HEMODIALYSIS START DATE
        // =====================================================

        try {

            const currentHD =
                parsePartialDate(
                    data.currentHemodialysisStartDate,
                    "currentHemodialysisStartDate"
                );

            await fillReactDateStable(
                "Start date of 3x/week hemodialysis regimen",
                currentHD
            );

        } catch (err) {

            console.error(
                "Current HD date failed:",
                err
            );
        }


        // =====================================================
        // spKt/V
        // =====================================================

        try {

            await setQuestion(
                "Most recent spKt/V value prior to signing informed consent",
                data.recentSpKtV
            );

        } catch (err) {

            console.error(
                "Most recent spKt/V failed:",
                err
            );
        }


        try {

            await setQuestion(
                "Highest spKt/V during recent 3 months",
                data.highestSpKtV3Months
            );

        } catch (err) {

            console.error(
                "Highest spKt/V failed:",
                err
            );
        }


        console.log(
            "CKD Specific History autofill complete."
        );
    }

    // =====================================================
    // COMPLETE PHYSICAL EXAMINATION
    // =====================================================

    async function runPhysicalExamination() {

        console.log(
            "Detected Complete Physical Examination page"
        );


        // -------------------------------------------------
        // Was examination performed?
        // -------------------------------------------------

        await clickRadio(
            "Was a complete physical examination performed?",
            "Yes"
        );


        await sleep(300);


        // -------------------------------------------------
        // Date of exam = visitDate from data object
        // -------------------------------------------------

        const examDate =
            parsePartialDate(
                data.visitDate,
                "visitDate"
            );


        await fillDate(
            "Date of exam",
            examDate
        );


        // -------------------------------------------------
        // Result
        // -------------------------------------------------

        await clickRadio(
            "What is the result of the assessment?",
            "Normal"
        );


        console.log(
            "Physical Examination autofill complete."
        );
    }

    // =====================================================
    // CHANGES TO DIALYSIS REGIMEN
    // =====================================================


    async function runChangesToDialysisRegimen() {

        console.log("Detected Changes to Dialysis Regimen");

        // ============================================
        // 1. CHANGES TO HEMODIALYSIS TREATMENT
        // ============================================

        // Answer directly from changes_to_dialysis_regimen
        if (data.changes_to_dialysis_regimen != null) {

            const answer =
                data.changes_to_dialysis_regimen === true ||
                    normalize(data.changes_to_dialysis_regimen) === "yes" ||
                    normalize(data.changes_to_dialysis_regimen) === "true"
                    ? "Yes"
                    : "No";

            await clickRadioVerified(
                "Were there any changes to the hemodialysis treatment since the last visit?",
                answer
            );
        }

        // ============================================
        // 2. UNSCHEDULED DIALYSIS EVENTS
        // ============================================

        // Yes if ANY of the three variables is not null.
        // No if ALL three variables are null.

        const hasUnscheduledEvents = [
            data.extra_hemodialysis_sessions,
            data.missed_hemodialysis_sessions,
            data.partial_hemodialysis_sessions
        ].some(value => value !== null && value !== undefined);

        await clickRadioVerified(
            "Were there any unscheduled dialysis events (missed sessions, extra sessions, or partial dialysis sessions) since the last visit?",
            hasUnscheduledEvents ? "Yes" : "No"
        );

        // ============================================
        // 3. ACTIVE VITAMIN D STEROL
        // ============================================

        if (data.activeVitaminDSterol != null) {

            await clickRadioVerified(
                "Was the participant administered an active vitamin D sterol (calcitriol, paricalcitol, doxercalciferol, other) as part of the participant's hemodialysis regimen?",
                data.activeVitaminDSterol
            );
        }

        // ============================================
        // 4. CALCIMIMETIC
        // ============================================

        if (data.calcimimetic != null) {

            await clickRadioVerified(
                "Was the participant administered a calcimimetic (cinacalcet, etelcalcetide, other) as part of the participant's hemodialysis regimen?",
                data.calcimimetic
            );
        }

        console.log("Changes to Dialysis Regimen autofill complete.");
    }

    // =====================================================
    // AUTO DETECT
    // =====================================================

    const formName =
        getFormName();


    console.log(
        "Detected form name:",
        formName
    );


    if (
        formName.includes(
            "hemodialysis (hd) parameters"
        ) ||
        getRow(
            "Were hemodialysis parameters collected?"
        )
    ) {

        await runHDParameters();

        return;
    }
    if (
        formName.includes(
            "physical examination"
        ) ||
        getRow(
            "Was a complete physical examination performed?"
        )
    ) {

        await runPhysicalExamination();

        return;
    }

    if (
        formName.includes(
            "vital signs"
        ) ||
        getRow(
            "Were vital signs performed?"
        )
    ) {

        await runVitalSigns();

        return;
    }


    if (
        formName ===
        "ecg" ||
        getRow(
            "Was the ECG performed?"
        )
    ) {

        await runECG();

        return;
    }


    if (
        formName.includes(
            "serum phosphate"
        ) ||
        getRow(
            "Was a serum phosphate, calcium and albumin sample collected for this visit?"
        )
    ) {

        await runCentralLab();

        return;
    }


    if (
        formName.includes(
            "ipth and fgf23"
        ) ||
        getRow(
            "Was a blood sample collected for Intact Parathyroid Hormone (iPTH) laboratory test?"
        )
    ) {

        await runIPTHFGF23();

        return;
    }


    if (
        formName.includes(
            "hepatitis b surface antigen"
        ) ||
        getRow(
            "Was the Hepatitis B Surface Antigen Laboratory sample collected?"
        )
    ) {

        await runHepatitisB();

        return;
    }


    if (
        formName.includes(
            "laboratory assessment: hematology"
        ) ||
        getRow(
            "Was a blood sample collected for Hematology laboratory tests?"
        )
    ) {

        await runHematology();

        return;
    }


    if (
        formName.includes(
            "laboratory assessment: blood chemistry"
        ) ||
        getRow(
            "Was a blood sample collected for Chemistry laboratory tests?"
        )
    ) {

        await runBloodChemistry();

        return;
    }


    if (
        formName.includes(
            "chronic kidney disease (ckd) specific history"
        ) ||
        getRow(
            "Primary Cause of CKD"
        )
    ) {

        await runCKDHistory();

        return;
    }

    if (
        formName.includes("changes to dialysis regimen") ||
        getRow(
            "Were there any changes to the hemodialysis treatment since the last visit?"
        )
    ) {
        await runChangesToDialysisRegimen();
        return;
    }


    console.warn(
        "This page is not currently supported.",
        {
            detectedFormName:
                formName
        }
    );
}
