window.addEventListener("keydown", (event) => {
    if (event.key !== "F3") {
        return;
    }

    // Avoid the browser's normal F2 behavior if any.
    event.preventDefault();
    event.stopPropagation();

    chrome.runtime.sendMessage({
        type: "FILL_MEDICATION_F3"
    }).then(response => {
        if (!response?.ok) {
            console.warn(
                "Medication Filler:",
                response?.error || "Could not fill page."
            );
        }
    }).catch(error => {
        console.warn("Medication Filler:", error);
    });
}, true);
