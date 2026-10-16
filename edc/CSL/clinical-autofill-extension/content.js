// F2 works while the clinical study page is focused, even when the extension popup is closed.
document.addEventListener("keydown", (event) => {
  if (event.key !== "F2" || event.repeat) return;

  event.preventDefault();
  event.stopPropagation();

  chrome.runtime.sendMessage({ type: "F2_FILL_CURRENT_PAGE" }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn("Clinical Autofill F2:", chrome.runtime.lastError.message);
      return;
    }
    if (!response?.ok) {
      console.warn("Clinical Autofill F2:", response?.error || "Could not fill page.");
    }
  });
}, true);
