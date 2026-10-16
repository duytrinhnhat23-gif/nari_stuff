function normalizeDay(day) {
  if (!/^\d{1,2}$/.test(String(day || ""))) return null;
  const n = Number(day);
  if (n < 1 || n > 31) return null;
  return String(n).padStart(2, "0");
}

function buildRunnerData(v) {
  // Backward compatibility with the first extension version that stored `date`.
  if ((!v.dateDay || !v.dateMonth || !v.dateYear) && v.date) {
    const match = String(v.date).trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
    if (match) {
      v = {
        ...v,
        dateDay: match[1],
        dateMonth: match[2][0].toUpperCase() + match[2].slice(1).toLowerCase(),
        dateYear: match[3]
      };
    }
  }

  const day = normalizeDay(v.dateDay);
  if (!day || !v.dateMonth || !/^\d{4}$/.test(String(v.dateYear || ""))) {
    throw new Error("Open the extension and enter the shared date first.");
  }

  return {
    date: `${day}-${v.dateMonth}-${v.dateYear}`,
    vitalSigns: {
      time: v.vitalTime || "",
      systolic: v.systolic || "",
      diastolic: v.diastolic || "",
      pulse: v.pulse || "",
      temperature: v.temperature || "",
      preDialysis: { weightTime: v.preWeightTime || "", weight: v.preWeight || "" },
      postDialysis: { weightTime: v.postWeightTime || "", weight: v.postWeight || "" }
    },
    dialysis: {
      type: "Hemodialysis",
      accessType: v.accessType || "",
      subtype: "High Flux",
      sessionVolume: v.sessionVolume || "",
      singlePoolKtV: v.singlePoolKtV || "",
      startTime: v.dialysisStart || "",
      endTime: v.dialysisEnd || ""
    },
    labSamples: { time: v.labTime || v.vitalTime || "" },
    drugAdministration: {
      startTime: v.adminStart || "",
      endTime: v.adminEnd || "",
      kitNumber1: v.kit1 || "",
      kitNumber2: v.kit2 || "",
      administeredVolume: "4"
    },
    pkSample: { time: v.pkTime || v.vitalTime || "" }
  };
}

async function executeFill(data, tabId = null) {
  let targetTabId = tabId;
  if (!targetTabId) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    targetTabId = tab?.id;
  }
  if (!targetTabId) throw new Error("No active tab found.");

  await chrome.scripting.executeScript({
    target: { tabId: targetTabId },
    world: "MAIN",
    func: (formData) => {
      window.__CLINICAL_AUTOFILL_DATA__ = formData;
    },
    args: [data]
  });

  await chrome.scripting.executeScript({
    target: { tabId: targetTabId },
    world: "MAIN",
    files: ["runner.js"]
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "FILL_CURRENT_PAGE") {
    (async () => {
      try {
        await executeFill(message.data);
        sendResponse({ ok: true });
      } catch (error) {
        sendResponse({ ok: false, error: error.message });
      }
    })();
    return true;
  }

  if (message?.type === "F2_FILL_CURRENT_PAGE") {
    (async () => {
      try {
        const saved = await chrome.storage.local.get("clinicalAutofillForm");
        const form = saved.clinicalAutofillForm;
        if (!form) throw new Error("No saved form data. Open the extension and enter data first.");
        await executeFill(buildRunnerData(form), sender.tab?.id || null);
        sendResponse({ ok: true });
      } catch (error) {
        sendResponse({ ok: false, error: error.message });
      }
    })();
    return true;
  }
});
