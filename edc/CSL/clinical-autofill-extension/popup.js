const defaults = {
  dateDay: "19",
  dateMonth: "Aug",
  dateYear: "2026",
  vitalTime: "10:06",
  systolic: "136",
  diastolic: "75",
  pulse: "79",
  temperature: "36.1",
  preWeightTime: "10:01",
  preWeight: "100",
  postWeightTime: "14:30",
  postWeight: "98",
  accessType: "Fistula",
  sessionVolume: "3.2",
  singlePoolKtV: "1.6",
  dialysisStart: "09:15",
  dialysisEnd: "12:41",
  kit1: "522205",
  kit2: "699905",
  adminStart: "11:19",
  adminEnd: "11:19",
  labTime: "10:06",
  pkTime: "10:06"
};

const ids = Object.keys(defaults);
const timeIds = [
  "vitalTime", "preWeightTime", "postWeightTime",
  "dialysisStart", "dialysisEnd", "adminStart", "adminEnd",
  "labTime", "pkTime"
];
const $ = (id) => document.getElementById(id);

function migrateOldDate(values) {
  if ((!values.dateDay || !values.dateMonth || !values.dateYear) && values.date) {
    const match = String(values.date).trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
    if (match) {
      values.dateDay = match[1].padStart(2, "0");
      values.dateMonth = match[2][0].toUpperCase() + match[2].slice(1).toLowerCase();
      values.dateYear = match[3];
    }
  }
  return values;
}

async function loadSaved() {
  const saved = await chrome.storage.local.get("clinicalAutofillForm");
  const raw = migrateOldDate({ ...(saved.clinicalAutofillForm || {}) });
  const values = { ...defaults, ...raw };
  ids.forEach(id => {
    if ($(id)) $(id).value = values[id] ?? "";
  });
}

function collectForm() {
  const values = {};
  ids.forEach(id => values[id] = $(id)?.value ?? "");
  values.dateDay = values.dateDay.trim();
  values.dateYear = values.dateYear.trim();
  timeIds.forEach(id => values[id] = values[id].trim());
  return values;
}

function normalizeDay(day) {
  if (!/^\d{1,2}$/.test(day)) return null;
  const n = Number(day);
  if (n < 1 || n > 31) return null;
  return String(n).padStart(2, "0");
}

function isValidTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function validateForm(v) {
  const day = normalizeDay(v.dateDay);
  if (!day || !v.dateMonth || !/^\d{4}$/.test(v.dateYear)) {
    return "Enter a valid Day, Month, and 4-digit Year.";
  }

  for (const id of timeIds) {
    if (v[id] && !isValidTime(v[id])) {
      return `${$(id).closest("label")?.childNodes[0]?.textContent.trim() || id} must use 24-hour HH:MM (example 09:15).`;
    }
  }
  return null;
}

function buildRunnerData(v) {
  const day = normalizeDay(v.dateDay);
  const sharedDate = `${day}-${v.dateMonth}-${v.dateYear}`;

  return {
    date: sharedDate,
    vitalSigns: {
      time: v.vitalTime,
      systolic: v.systolic,
      diastolic: v.diastolic,
      pulse: v.pulse,
      temperature: v.temperature,
      preDialysis: { weightTime: v.preWeightTime, weight: v.preWeight },
      postDialysis: { weightTime: v.postWeightTime, weight: v.postWeight }
    },
    dialysis: {
      type: "Hemodialysis",
      accessType: v.accessType,
      subtype: "High Flux",
      sessionVolume: v.sessionVolume,
      singlePoolKtV: v.singlePoolKtV,
      startTime: v.dialysisStart,
      endTime: v.dialysisEnd
    },
    labSamples: { time: v.labTime || v.vitalTime },
    drugAdministration: {
      startTime: v.adminStart,
      endTime: v.adminEnd,
      kitNumber1: v.kit1,
      kitNumber2: v.kit2,
      administeredVolume: "4"
    },
    pkSample: { time: v.pkTime || v.vitalTime }
  };
}

async function fillCurrentPage() {
  const button = $("fillButton");
  const status = $("status");
  const form = collectForm();
  const error = validateForm(form);

  if (error) {
    status.textContent = error;
    return;
  }

  form.dateDay = normalizeDay(form.dateDay);
  button.disabled = true;
  status.textContent = "Filling current page…";

  await chrome.storage.local.set({ clinicalAutofillForm: form });

  chrome.runtime.sendMessage(
    { type: "FILL_CURRENT_PAGE", data: buildRunnerData(form) },
    (response) => {
      button.disabled = false;
      if (chrome.runtime.lastError) {
        status.textContent = chrome.runtime.lastError.message;
        return;
      }
      status.textContent = response?.ok
        ? "Current page filled."
        : `Could not fill page: ${response?.error || "Unknown error"}`;
    }
  );
}

async function clearForm() {
  ids.forEach(id => {
    const el = $(id);
    if (el) el.value = "";
  });
  await chrome.storage.local.remove("clinicalAutofillForm");
  $("status").textContent = "Form cleared.";
  $("dateDay").focus();
}

// Helpful typing behavior for HH:MM: typing 0915 becomes 09:15.
document.querySelectorAll(".time24").forEach(input => {
  input.addEventListener("input", () => {
    let digits = input.value.replace(/\D/g, "").slice(0, 4);
    if (digits.length > 2) digits = `${digits.slice(0, 2)}:${digits.slice(2)}`;
    input.value = digits;
  });
});

$("fillButton").addEventListener("click", fillCurrentPage);
$("clearButton").addEventListener("click", clearForm);

// Save edits automatically so F2 can use the latest values after the popup closes.
let saveTimer = null;
document.querySelectorAll("input, select").forEach(el => {
  const saveLatest = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      chrome.storage.local.set({ clinicalAutofillForm: collectForm() });
    }, 120);
  };
  el.addEventListener("input", saveLatest);
  el.addEventListener("change", saveLatest);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "F2") {
    event.preventDefault();
    fillCurrentPage();
  }
});

loadSaved();
