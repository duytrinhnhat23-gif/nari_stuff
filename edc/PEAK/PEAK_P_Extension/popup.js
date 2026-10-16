const box = document.getElementById("data");
const status = document.getElementById("status");

chrome.storage.local.get("peakData").then(({ peakData }) => {
  if (peakData) box.value = JSON.stringify(peakData, null, 2);
});

document.getElementById("save").addEventListener("click", async () => {
  try {
    let text = box.value.trim();

    // Also accept: const peakData = { ... };
    text = text
      .replace(/^\s*(?:const|let|var)\s+\w+\s*=\s*/, "")
      .replace(/;\s*$/, "");

    const data = JSON.parse(text);
    await chrome.storage.local.set({ peakData: data });
    box.value = JSON.stringify(data, null, 2);
    status.textContent = "Saved. Go to the form and press F2.";
  } catch (e) {
    status.textContent = "Invalid data: " + e.message;
  }
});