const rawDataEl = document.getElementById("rawData");
const rowNumberEl = document.getElementById("rowNumber");
const previewEl = document.getElementById("preview");
const statusEl = document.getElementById("status");

function getRows() {
    return rawDataEl.value
        .trim()
        .split(/\r?\n/)
        .map(x => x.trim())
        .filter(Boolean);
}

function clampRow() {
    const rows = getRows();
    let row = Number(rowNumberEl.value) || 1;

    if (rows.length === 0) {
        rowNumberEl.value = 1;
        return 1;
    }

    row = Math.max(1, Math.min(row, rows.length));
    rowNumberEl.value = row;
    return row;
}

function updatePreview() {
    const rows = getRows();
    const row = clampRow();

    if (!rows.length) {
        previewEl.textContent = "No medication selected.";
        return;
    }

    previewEl.textContent = `Row ${row} of ${rows.length}: ${rows[row - 1]}`;
}

async function persist() {
    await chrome.storage.local.set({
        medicationRawData: rawDataEl.value,
        medicationRowNumber: Number(rowNumberEl.value) || 1
    });
}

async function fillCurrentPage() {
    const rawData = rawDataEl.value.trim();
    const rows = getRows();

    if (!rawData || !rows.length) {
        setStatus("Paste at least one medication line.", true);
        return;
    }

    const row = clampRow();
    await persist();

    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    if (!tab?.id) {
        setStatus("Could not find the active tab.", true);
        return;
    }

    setStatus(`Filling row ${row}...`);

    try {
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            world: "MAIN",
            func: fillMedicationPage,
            args: [rawData, row - 1]
        });

        setStatus(`Row ${row} sent to the page.`);
    } catch (error) {
        console.error(error);
        setStatus(
            "Could not run on this page. Open the Rave medication record and try again.",
            true
        );
    }
}

function setStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.className = isError ? "status error" : "status ok";
}

document.getElementById("fillBtn").addEventListener("click", fillCurrentPage);

document.getElementById("clearBtn").addEventListener("click", async () => {
    rawDataEl.value = "";
    rowNumberEl.value = 1;
    await chrome.storage.local.remove([
        "medicationRawData",
        "medicationRowNumber"
    ]);
    updatePreview();
    setStatus("Cleared.");
});

document.getElementById("prevBtn").addEventListener("click", async () => {
    rowNumberEl.value = Math.max(1, (Number(rowNumberEl.value) || 1) - 1);
    updatePreview();
    await persist();
});

document.getElementById("nextBtn").addEventListener("click", async () => {
    const rows = getRows();
    rowNumberEl.value = Math.min(
        Math.max(1, rows.length),
        (Number(rowNumberEl.value) || 1) + 1
    );
    updatePreview();
    await persist();
});

rawDataEl.addEventListener("input", async () => {
    updatePreview();
    await persist();
});

rowNumberEl.addEventListener("input", async () => {
    updatePreview();
    await persist();
});

(async function init() {
    const saved = await chrome.storage.local.get([
        "medicationRawData",
        "medicationRowNumber"
    ]);

    rawDataEl.value = saved.medicationRawData || "";
    rowNumberEl.value = saved.medicationRowNumber || 1;

    updatePreview();
})();
