(() => {
  if (window.__crioDirectUploadExtensionInstalled) return;
  window.__crioDirectUploadExtensionInstalled = true;

  let enabled = false;
  let original = null;
  let wrapper = null;

  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== location.origin || event.data?.source !== 'crio-direct-upload-extension' || event.data?.type !== 'setting') return;
    enabled = !!event.data.enabled;
    install();
  });

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function install() {
    const current = window.triggerTooltipWithUrl;
    if (typeof current !== 'function') return false;
    if (current === wrapper) return true;
    original = current;
    wrapper = function(element, url, ...rest) {
      if (!enabled || !String(url).includes('ajax-subject-list-documents?')) {
        return original.call(this, element, url, ...rest);
      }
      const uploadUrl = String(url).replace('ajax-subject-list-documents?', 'ajax-new-subject-document?');
      if (typeof window.openModal !== 'function') return original.call(this, element, url, ...rest);
      if (typeof window.closeAllTooltips === 'function') window.closeAllTooltips();
      try {
        window.openModal('add-new-document', uploadUrl, () => {
          if (typeof window.initTooltip === 'function') window.initTooltip();
          // Give CRIO time to initialize the modal's autocomplete and category handlers.
          void initializeModal();
        });
      } catch (err) {
        console.error('[CRIO Direct Upload] Cannot open modal:', err);
      }
    };
    window.triggerTooltipWithUrl = wrapper;
    return true;
  }

  async function initializeModal() {
    let modal = null;
    for (let i = 0; i < 60; i++) {
      modal = document.querySelector('#add-new-document.current #document-form');
      if (modal) break;
      await sleep(100);
    }
    if (!modal) return;
    const root = modal.closest('#add-new-document');
    const $ = window.jQuery;
    if (!$) return;

    // Wait for the category handlers registered by CRIO's modal script.
    for (let i = 0; i < 30; i++) {
      const category = root.querySelector('.choose-category li[value="23"]');
      if (category && ($._data?.(category, 'events')?.click || category.classList.contains('selected'))) break;
      await sleep(100);
    }
    const category = root.querySelector('.choose-category li[value="23"]');
    if (category && !category.classList.contains('selected')) category.click();
    const type = root.querySelector('.choose-document-type li[value="113"]');
    if (type && !type.classList.contains('selected')) type.click();
    $(root).find('input[name="document-category"]').val('23');
    $(root).find('input[name="document-type"]').val('113');
    $(root).find('#document-name').val('Other');

    await selectProcedure(root, $);
  }

  // Uses the same request and selection events as the verified Console test.
  async function selectProcedure(root, $) {
    const keyword = 'hemodia';
    const input = root.querySelector('#procedure-search');
    if (!input || !$.fn.autocomplete) return false;
    const $input = $(input);

    for (let i = 0; i < 30; i++) {
      try {
        if ($input.autocomplete('instance')) break;
      } catch (_) {}
      await sleep(100);
    }
    try {
      if (!$input.autocomplete('instance')) {
        console.warn('[CRIO Direct Upload] Procedure autocomplete not initialized');
        return false;
      }
    } catch (_) { return false; }

    const val = selector => $(root).find(selector).val();
    const studyKey = val('#study-key');
    const subjectKey = val('#subject-key');
    const visitKey = val('#visit-key');
    if (!studyKey || !subjectKey || !visitKey) {
      console.warn('[CRIO Direct Upload] Missing study, subject, or visit key');
      return false;
    }

    $input.val(keyword);
    try {
      const results = await $.ajax({
        url: typeof window.getUrl === 'function'
          ? window.getUrl('ajax-subject-fetch-subject-visit-procedures')
          : 'ajax-subject-fetch-subject-visit-procedures',
        method: 'GET',
        dataType: 'json',
        data: {
          search: keyword,
          _org: val('input[name="_org"]'),
          _site: val('input[name="_site"]'),
          study_key: studyKey,
          subject_key: subjectKey,
          subject_visit_key: visitKey
        }
      });
      const matches = Array.isArray(results) ? results.filter(item =>
        typeof item.procedure === 'string' &&
        item.procedure.toLowerCase().includes(keyword)
      ) : [];

      if (matches.length === 1) {
        const item = matches[0];
        $input.trigger($.Event('autocompleteselect'), { item });
        $input.val(item.procedure);
        $(root).find('#subject-visit-procedure-key').val(item.subjectVisitProcedureKey ?? '');
        $(root).find('#study-procedure-key').val(item.studyProcedureKey ?? '');
        $(root).find('#subject-procedure-key').val(item.subjectProcedureKey ?? '');
        console.info('[CRIO Direct Upload] Selected procedure:', item.procedure);
        return true;
      }
      if (matches.length > 1) {
        console.warn('[CRIO Direct Upload] Multiple procedure matches. Choose manually:', matches);
        $input.focus();
        $input.autocomplete('search', keyword);
      } else {
        console.warn('[CRIO Direct Upload] No procedure matches for:', keyword);
        $input.val('');
      }
      return false;
    } catch (error) {
      console.error('[CRIO Direct Upload] Procedure lookup failed:', error);
      return false;
    }
  }

  // CRIO may register the function after our script runs or replace it during navigation.
  const timer = setInterval(() => { if (install()) clearInterval(timer); }, 100);
  setTimeout(() => clearInterval(timer), 30000);
  window.postMessage({ source: 'crio-direct-upload-page', type: 'ready' }, location.origin);
})();
