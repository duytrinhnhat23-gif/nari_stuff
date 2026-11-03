// The extension content script runs in an isolated world.
// Inject a page-world script so it can wrap CRIO's global JavaScript function.
(() => {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('page.js');
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);

  const sendSetting = enabled => {
    window.postMessage({ source: 'crio-direct-upload-extension', type: 'setting', enabled: !!enabled }, location.origin);
  };
  chrome.storage.local.get({ enabled: false }, ({ enabled }) => sendSetting(enabled));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.enabled) sendSetting(changes.enabled.newValue);
  });
  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== location.origin || event.data?.source !== 'crio-direct-upload-page' || event.data?.type !== 'ready') return;
    chrome.storage.local.get({ enabled: false }, ({ enabled }) => sendSetting(enabled));
  });
})();
