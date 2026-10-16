importScripts("fillMedicationPage.js");


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== "FILL_MEDICATION_F3") {
        return;
    }

    (async () => {
        try {
            const saved = await chrome.storage.local.get([
                "medicationRawData",
                "medicationRowNumber"
            ]);

            const rawData = String(saved.medicationRawData || "").trim();
            const rowNumber = Math.max(
                1,
                Number(saved.medicationRowNumber) || 1
            );

            if (!rawData) {
                sendResponse({
                    ok: false,
                    error: "No medication data saved. Open the extension first."
                });
                return;
            }

            const tabId = sender.tab?.id;

            if (!tabId) {
                sendResponse({
                    ok: false,
                    error: "Active page not found."
                });
                return;
            }

            await chrome.scripting.executeScript({
                target: { tabId },
                world: "MAIN",
                func: fillMedicationPage,
                args: [rawData, rowNumber - 1]
            });

            sendResponse({
                ok: true,
                rowNumber
            });

        } catch (error) {
            console.error(error);
            sendResponse({
                ok: false,
                error: String(error?.message || error)
            });
        }
    })();

    return true;
});
