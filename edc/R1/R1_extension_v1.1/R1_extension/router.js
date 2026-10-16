// R1 command router. F5 is intentionally reserved for Visit Data only.
let r1Running = false;

async function r1RunVisitFromStorage() {
  const result = await chrome.storage.local.get(["r1VisitData"]);
  if (!result.r1VisitData || typeof result.r1VisitData !== "object") {
    throw new Error("No Visit Data object saved. Open R1 > Visit Data first.");
  }
  return r1RunAutofill(result.r1VisitData);
}

async function r1RunMedicalHistory(text) {
  if (!String(text || "").trim()) throw new Error("Medical History data is empty.");
  return r1PopulateMedicalHistory(String(text));
}

async function r1RunConmed(text) {
  if (!String(text || "").trim()) throw new Error("ConMed data is empty.");
  return r1EnterConmed(String(text).trim());
}

document.addEventListener("keydown", async (event) => {
  if (event.key !== "F5") return;
  event.preventDefault();
  event.stopPropagation();
  if (r1Running) return;
  r1Running = true;
  try {
    await r1RunVisitFromStorage();
  } catch (err) {
    console.error("R1 Visit Data failed", err);
    alert("R1 Visit Data failed: " + (err?.message || err));
  } finally { r1Running = false; }
}, true);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "R1_RUN") return;
  if (r1Running) { sendResponse({ok:false, error:"R1 is already running."}); return; }
  r1Running = true;
  (async () => {
    try {
      if (message.mode === "visit") await r1RunVisitFromStorage();
      else if (message.mode === "medicalHistory") await r1RunMedicalHistory(message.data);
      else if (message.mode === "conmed") await r1RunConmed(message.data);
      else throw new Error("Unknown R1 mode.");
      sendResponse({ok:true});
    } catch (err) {
      console.error("R1 command failed", err);
      sendResponse({ok:false, error:String(err?.message || err)});
    } finally { r1Running = false; }
  })();
  return true;
});
