const output = document.getElementById('output');
const statusEl = document.getElementById('status');
const copyBtn = document.getElementById('copyBtn');

function setStatus(text, type = '') {
  statusEl.textContent = text;
  statusEl.className = `status ${type}`;
}

for (const tab of document.querySelectorAll('.tab')) {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.page').forEach(x => x.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.page).classList.add('active');
  });
}

async function runExtractor(kind) {
  setStatus('Extracting...');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab found.');

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractOnPage,
      args: [kind]
    });

    if (!result?.ok) throw new Error(result?.error || 'Extraction failed.');
    output.value = result.output || '';
    copyBtn.disabled = !output.value;

    if (output.value) {
      await navigator.clipboard.writeText(output.value);
      setStatus(`${result.count ?? ''} extracted. Copied to clipboard.`.trim(), 'ok');
    } else {
      setStatus('No matching data found.', 'error');
    }
  } catch (err) {
    setStatus(err.message || String(err), 'error');
  }
}

document.querySelectorAll('.run').forEach(btn => {
  btn.addEventListener('click', () => runExtractor(btn.dataset.action));
});

copyBtn.addEventListener('click', async () => {
  if (!output.value) return;
  await navigator.clipboard.writeText(output.value);
  setStatus('Copied to clipboard.', 'ok');
});

document.getElementById('clearBtn').addEventListener('click', () => {
  output.value = '';
  copyBtn.disabled = true;
  setStatus('Ready.');
});

function extractOnPage(kind) {
  const clean = (text = '') => String(text)
    .replace(/\u00ad/g, '')
    .replace(/\u200b/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  function extractVisit() {


    function toBoolean(value) {
      if (Array.isArray(value)) value = value[0];

      if (value == null) return null;

      const text = String(value).trim().toLowerCase();

      if (["yes", "true", "1"].includes(text)) return true;
      if (["no", "false", "0"].includes(text)) return false;

      return null;
    }


    function extractQuestions(root = document) {
      const questions = [];
      root.querySelectorAll('tr.question').forEach(row => {
        const questionEl = row.querySelector('th.question-text');
        const valueCell = row.querySelector('td');
        if (!questionEl || !valueCell) return;
        const procedureEl = questionEl.querySelector('[data-procedure]');
        const procedureId = procedureEl?.getAttribute('data-procedure') || null;
        const label = clean(questionEl.innerText);
        const strongValues = [...valueCell.querySelectorAll('section.edit strong')]
          .map(el => clean(el.innerText)).filter(Boolean);
        let value = null;
        if (strongValues.length === 1) value = strongValues[0];
        else if (strongValues.length > 1) value = strongValues;
        if (typeof value === 'string' && /^disabled$/i.test(value)) value = null;
        questions.push({ procedureId, label, value });
      });
      return questions;
    }

    function findField(questions, names) {
      const candidates = Array.isArray(names) ? names : [names];
      for (const name of candidates) {
        const target = clean(name).toLowerCase();
        const exact = questions.find(q => clean(q.label).toLowerCase() === target);
        if (exact) return exact.value;
      }
      for (const name of candidates) {
        const target = clean(name).toLowerCase();
        const partial = questions.find(q => clean(q.label).toLowerCase().includes(target));
        if (partial) return partial.value;
      }
      return null;
    }

    function getYearFromDate(value) {
      if (!value || typeof value !== 'string') return null;
      const match = value.match(/\b(\d{4})\b/);
      return match ? Number(match[1]) : null;
    }

    const q = extractQuestions(document);
    const dateOfBirth = findField(q, ['Date of birth:', 'Date of birth']);
    const data = {
      visitDate: findField(q, 'Visit Date'),
      informedConsentSignedDate: findField(q, ['Date and Time of Consent', 'Date of Consent']),
      dateOfBirth,
      ageConsent: findField(q, ['Age (years) at time of consent:', 'Age (years) at time of consent']),
      year: getYearFromDate(dateOfBirth),
      ethnicity: findField(q, ['Ethnicity:', 'Ethnicity']),
      race: findField(q, ['Race (select all that apply):', 'Race']),
      wasEcgPerformed: findField(q, 'Was an ECG performed?'),
      ecgDateTime: findField(q, 'Date and Time of ECG'),
      centralLabCollectionDateTime: findField(q, ['Date and Time of Collection']),
      dialysisType: findField(q, ['Type of Dialysis']),
      vascularAccessType: findField(q, ['Vascular access type']),
      hdFrequency: findField(q, ['Prescribed Hemodialysis Frequency']),
      dialysateCalcium: findField(q, ['Prescribed Calcium Concentration of Dialysate']),
      hdDurationHours: findField(q, ['Prescribed Hemodialysis Duration (hrs)']),
      startHemodialysisTime: findField(q, ['Start Time of Hemodialysis']),
      endHemodialysisTime: findField(q, ['End Time of Hemodialysis']),
      preDialysisWeight: findField(q, ['Pre-dialysis Weight (kg)', 'Pre-dialysis Weight']),
      postDialysisWeight: findField(q, ['Post-dialysis Weight (kg)', 'Post-dialysis Weight']),
      ultrafiltrationVolume: findField(q, ['Ultra-filtration Volume (mL)', 'Ultra-filtration Volume']),
      activeVitaminDSterol: findField(q, ['Was the participant administered an active vitamin D sterol']),
      calcimimetic: findField(q, ['Was the participant administered a calcimimetic']),
      primaryCkdCause: findField(q, ['Primary Cause of CKD']),
      otherCkdCauses: findField(q, ['Were there any other possible contributing causes of CKD?']),
      ckdDiagnosisDate: findField(q, ['Date of CKD diagnosis']),
      firstHemodialysisDate: findField(q, ["Start date of participant's first hemodialysis"]),
      dialysisVintageYears: findField(q, ['Cumulative Dialysis Vintage (years)']),
      currentHemodialysisStartDate: findField(q, ["Start date of the participant's current hemodialysis regimen"]),
      recentSpKtV: findField(q, ['Most recent spKt/V value prior to signing informed consent']),
      highestSpKtV3Months: findField(q, ['Highest spKt/V during recent 3 months']),
      vitalSignsDateTime: findField(q, ['Date and Time Vital Signs were collected']),
      pulseRate: findField(q, ['Pulse Rate (bpm)']),
      systolicBP: findField(q, ['Systolic blood pressure (mmHg)']),
      diastolicBP: findField(q, ['Diastolic blood pressure (mmHg)']),
      heightInches: findField(q, ['Height (inches)']),

      changes_to_dialysis_regimen:
        findField(q, "Were there any changes to the hemodialysis treatment since the last visit?"),

      missed_hemodialysis_sessions:
        toBoolean(findField(q, "Missed Hemodialysis Sessions")),

      partial_hemodialysis_sessions:
        toBoolean(findField(q, "Partial Hemodialysis Sessions")),

      extra_hemodialysis_sessions:
        toBoolean(findField(q, "Extra Hemodialysis Sessions")),


    };
    return { output: JSON.stringify(data, null, 2), count: `${Object.keys(data).length} fields` };
  }

  function extractConmed() {
    function parsePrimaryReason(td) {
      const text = clean(td.innerText);
      const comment = clean(td.querySelector('.answer-comment')?.innerText || '');
      if (/Medical History/i.test(text)) return ['Medical History', comment.replace(/\s*,\s*/g, ',')];
      if (/Adverse Event/i.test(text)) return ['Adverse Event', comment.replace(/\s*,\s*/g, ',')];
      if (/Prophylaxis/i.test(text)) return ['Prophylaxis', comment];
      if (/Other/i.test(text)) return ['Other', comment];
      return [text, ''];
    }
    function combineSpecify(td) {
      return clean(td.innerText).replace(/Other,\s*specify:\s*/i, 'Other, specify: ').trim();
    }
    const rows = [...document.querySelectorAll('table.record tbody tr[id^="completed_record_row_"]')];
    if (!rows.length) throw new Error('No medication rows found on this page.');
    const results = [];
    rows.forEach(row => {
      const cells = [...row.querySelectorAll(':scope > td')];
      if (cells.length < 13) return;
      const medication = clean(cells[3].innerText);
      if (!medication) return;
      const [primaryReason, specify] = parsePrimaryReason(cells[12]);
      results.push([
        medication, clean(cells[4].innerText), clean(cells[5].innerText),
        clean(cells[6].innerText), clean(cells[7].innerText), clean(cells[8].innerText),
        combineSpecify(cells[9]), combineSpecify(cells[10]), combineSpecify(cells[11]),
        primaryReason, specify
      ].join(' | '));
    });
    const header = 'Medication | Hemo Regimen | Rescue Therapy | Start Date | End Date/Ongoing | Dose | Unit | Frequency | Route | Primary Reason | Specify';
    return { output: [header, ...results].join('\n'), count: `${results.length} medication rows` };
  }

  function extractHistory() {
    const modal = document.querySelector('#pop-out-multi-record-modal');
    if (!modal) throw new Error('Medical History modal (#pop-out-multi-record-modal) was not found. Open the modal first.');
    const results = [...modal.querySelectorAll('table.record tbody tr')]
      .map(r => {
        const c = r.querySelectorAll('td');
        if (c.length < 7) return null;
        return [clean(c[3].innerText), clean(c[4].innerText), clean(c[5].innerText), /^yes/i.test(clean(c[6].innerText)) ? 'Yes' : 'No'].join(' | ');
      })
      .filter(Boolean);
    return { output: results.join('\n'), count: `${results.length} medical history rows` };
  }

  try {
    const result = kind === 'visit' ? extractVisit() : kind === 'conmed' ? extractConmed() : kind === 'history' ? extractHistory() : null;
    if (!result) throw new Error('Unknown extractor.');
    return { ok: true, ...result };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}
